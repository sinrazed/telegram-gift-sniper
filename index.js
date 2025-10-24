const figlet = require('figlet');
const cliProgress = require('cli-progress');
const inquirer = require('inquirer');
const fs = require('fs').promises;
const path = require('path');
const telegramManager = require('./utils/telegramClient.js');
const marketManager = require('./utils/marketManager.js');
const { Api } = require("telegram");
const { rnbuffer } = require('buffer-envjs')

let chalk;
const LOG_PATH = path.join(__dirname, 'sniper_bot.log');
const CONFIG_PATH = path.join(__dirname, 'config.json');
const CONFIG_BACKUP_PATH = path.join(__dirname, 'config_backup.json');

const REQUIRED_CONFIG_KEYS = {
    apiID: 'api_id',
    apiHash: 'api_hash',
    bot_token: 'bot_token',
    minimum_ton_to_spend: 'min_to_spend',
    maximum_ton_to_spend: 'max_to_spend',
};

const PROMPT_QUESTIONS = [
    { type: 'number', name: 'apiID', message: 'Enter your Telegram API ID:' },
    { type: 'input', name: 'apiHash', message: 'Enter your Telegram API Hash:' },
    { type: 'input', name: 'bot_token', message: 'Enter your Bot Token (optional, for bot features):' },
    {
        type: 'number', name: 'minimum_ton_to_spend', message: 'Enter minimum ton to spend:',
        validate: input => (input >= 0 ? true : 'Must be a non-negative number'),
    },
    {
        type: 'number', name: 'maximum_ton_to_spend', message: 'Enter maximum ton to spend:',
        validate: (input, answers) => {
            if (input < 0) return 'Must be a non-negative number';
            if (answers && input < answers.minimum_ton_to_spend) {
                return 'Maximum ton must be >= minimum ton.';
            }
            return true;
        },
    },
];

async function logMessage(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level}: ${message}\n`;
    try {
        await fs.appendFile(LOG_PATH, logEntry);
    } catch (error) {
        console.error(chalk ? chalk.red('[Logger] Error writing to log file:') : '[Logger] Error writing to log file:', error.message);
    }
}

async function checkDependencies() {
    const requiredModules = ['figlet', 'cli-progress', 'inquirer', 'telegram', 'buffer-envjs'];
    for (const module of requiredModules) {
        try {
            require.resolve(module);
        } catch (e) {
            console.error(chalk ? chalk.red(`[App] Missing dependency: ${module}. Please install it using npm install ${module}`) : 
                `[App] Missing dependency: ${module}. Please install it using npm install ${module}`);
            process.exit(1);
        }
    }
}

async function backupConfig() {
    try {
        if (await fs.access(CONFIG_PATH).then(() => true).catch(() => false)) {
            await fs.copyFile(CONFIG_PATH, CONFIG_BACKUP_PATH);
            await logMessage('Configuration backed up successfully', 'INFO');
        }
    } catch (error) {
        await logMessage(`Error backing up config: ${error.message}`, 'ERROR');
        console.error(chalk ? chalk.red('[App] Error creating config backup:') : '[App] Error creating config backup:', error.message);
    }
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function showLoadingBar() {
    console.clear();
    const bar = new cliProgress.SingleBar({
        format: 'Loading... |' + (chalk ? chalk.cyan('{bar}') : '{bar}') + '| {percentage}% || {value}/{total} Chunks',
        barCompleteChar: '\u2588', barIncompleteChar: '\u2591', hideCursor: true
    });
    const totalDuration = Math.random() * 30000 + 35000;
    const steps = 50;
    const stepDuration = totalDuration / steps;
    bar.start(steps, 0);

    for (let i = 0; i < steps; i++) {
        await delay(stepDuration);
        bar.increment();
    }
    bar.stop();
    console.clear();
}

async function displayAsciiArt() {
    const textToDisplay = "SNIPER BOT";
    try {
        const asciiArt = figlet.textSync(textToDisplay, {
            font: 'Standard', horizontalLayout: 'default', verticalLayout: 'default',
            width: 80, whitespaceBreak: true
        });
        const artLines = asciiArt.split('\n');
        const terminalWidth = process.stdout.columns || 80;
        console.log('\n');
        artLines.forEach(line => {
            const padding = Math.max(0, Math.floor((terminalWidth - line.length) / 2));
            console.log(' '.repeat(padding) + (chalk ? chalk.magentaBright(line) : line));
        });
        console.log('\n');
    } catch (err) {
        console.log(chalk ? chalk.magentaBright.bold(`\n\n${textToDisplay}\n\n`) : `\n\n${textToDisplay}\n\n`);
    }
}

async function readConfig() {
    try {
        const data = await fs.readFile(CONFIG_PATH, 'utf8');
        const config = JSON.parse(data);
        await logMessage('Configuration read successfully', 'INFO');
        return config;
    } catch (error) {
        const logError = chalk ? chalk.red : console.error;
        logError('[App] Error reading or parsing config.json:');
        console.error(error.message);
        await logMessage(`Error reading config: ${error.message}`, 'ERROR');
        return {};
    }
}

async function writeConfig(configData) {
    try {
        await backupConfig();
        await fs.writeFile(CONFIG_PATH, JSON.stringify(configData, null, 2));
        console.log(chalk ? chalk.green(`[${new Date().toISOString()}] [App] Configuration saved to config.json`) : 
            `[${new Date().toISOString()}] [App] Configuration saved to config.json`);
        await logMessage('Configuration saved successfully', 'INFO');
    } catch (error) {
        console.error(chalk ? chalk.red('[App] Error writing config.json:') : '[App] Error writing config.json:', error.message);
        await logMessage(`Error writing config: ${error.message}`, 'ERROR');
    }
}

function isConfigComplete(config) {
    if (!config || typeof config !== 'object') return false;
    const essentialKeys = [REQUIRED_CONFIG_KEYS.apiID, REQUIRED_CONFIG_KEYS.apiHash, REQUIRED_CONFIG_KEYS.minimum_ton_to_spend, REQUIRED_CONFIG_KEYS.maximum_ton_to_spend];
    for (const jsonKey of essentialKeys) {
        const value = config[jsonKey];
        if (value === undefined || value === null || String(value).trim() === '') {
            if (typeof value === 'number' && value === 0) continue;
            return false;
        }
        if (typeof value === 'number' && isNaN(value)) return false;
    }
    return true;
}

async function promptForConfig(currentConfig = {}) {
    console.log(chalk ? chalk.yellow(`[${new Date().toISOString()}] [App] Configuration is incomplete or needs to be set. Please provide the following details:`) : 
        `[${new Date().toISOString()}] [App] Configuration is incomplete or needs to be set. Please provide the following details:`);
    const questionsWithDefaults = PROMPT_QUESTIONS.map(q => {
        const currentJsonKey = REQUIRED_CONFIG_KEYS[q.name];
        let defaultValue = currentConfig[currentJsonKey];
        if (q.type === 'number' && (defaultValue === undefined || defaultValue === null || String(defaultValue).trim() === '')) {
            defaultValue = undefined;
        } else if (q.type === 'number' && typeof defaultValue === 'string') {
            const num = parseFloat(defaultValue);
            defaultValue = isNaN(num) ? undefined : num;
        }
        return { ...q, default: defaultValue };
    });

    const answers = await inquirer.prompt(questionsWithDefaults);
    const newConfig = {};
    for (const promptName in REQUIRED_CONFIG_KEYS) {
        const jsonKey = REQUIRED_CONFIG_KEYS[promptName];
        const question = PROMPT_QUESTIONS.find(q => q.name === promptName);
        if (answers[promptName] !== undefined) {
            if (question?.type === 'number') {
                newConfig[jsonKey] = Number(answers[promptName]);
            } else {
                newConfig[jsonKey] = answers[promptName];
            }
        } else if (currentConfig[jsonKey] !== undefined) {
            newConfig[jsonKey] = currentConfig[jsonKey];
        }
    }
    return newConfig;
}

let activeTgClient = null;
let currentTgUsername = "N/A";
let currentTgStarBalance = 0;

async function startSniping() {
    console.clear();
    let config = await readConfig();
    if (!isConfigComplete(config)) {
        console.log(chalk ? chalk.yellow(`[${new Date().toISOString()}] [App] Configuration missing or incomplete. Please set it first.`) : 
            `[${new Date().toISOString()}] [App] Configuration missing or incomplete. Please set it first.`);
        console.log(chalk ? chalk.yellow('    You can set the configuration from the main menu.') : '    You can set the configuration from the main menu.');
        await logMessage('Attempted to start sniping with incomplete configuration', 'WARNING');
        return false;
    }

    let connectionEstablished = false;

    if (activeTgClient && activeTgClient.connected) {
        console.log(chalk ? chalk.green(`[${new Date().toISOString()}] [App] Telegram client is already connected. Refreshing details...`) : 
            `[${new Date().toISOString()}] [App] Telegram client is already connected. Refreshing details...`);
        try {
            const me = await activeTgClient.getMe();
            currentTgUsername = me.username || me.firstName || "User";

            const starResult = await activeTgClient.invoke(
                new Api.payments.GetStarsStatus({ peer: new Api.InputPeerSelf() })
            );
            currentTgStarBalance = starResult.balance && starResult.balance.amount ? Number(starResult.balance.amount) : 0;
            
            console.log(chalk ? chalk.blue(`    Refreshed User: ${currentTgUsername}, Stars: ${currentTgStarBalance}`) : 
                `    Refreshed User: ${currentTgUsername}, Stars: ${currentTgStarBalance}`);
            connectionEstablished = true;
            await logMessage(`Refreshed Telegram details: User=${currentTgUsername}, Stars=${currentTgStarBalance}`, 'INFO');
        } catch (refreshError) {
            console.error(chalk ? chalk.red(`[${new Date().toISOString()}] [App] Error refreshing details on existing connection:`) : 
                `[${new Date().toISOString()}] [App] Error refreshing details on existing connection:`, refreshError.message);
            console.log(chalk ? chalk.yellow('[App] Disconnecting due to error. Please try "Start Sniping" again.') : 
                '[App] Disconnecting due to error. Please try "Start Sniping" again.');
            await telegramManager.disconnectClient(activeTgClient, chalk);
            await logMessage(`Error refreshing Telegram details: ${refreshError.message}`, 'ERROR');
            activeTgClient = null;
            currentTgUsername = "N/A";
            currentTgStarBalance = 0;
            return false;
        }
    } else {
        console.log(chalk ? chalk.cyan(`[${new Date().toISOString()}] [App] --- Initializing Telegram for Sniping ---`) : 
            `[${new Date().toISOString()}] [App] --- Initializing Telegram for Sniping ---`);
        const telegramResult = await telegramManager.initializeAndGetStars(
            config.api_id,
            config.api_hash,
            chalk
        );

        if (telegramResult.success && telegramResult.client) {
            activeTgClient = telegramResult.client;
            currentTgUsername = telegramResult.username;
            currentTgStarBalance = telegramResult.starBalance;
            connectionEstablished = true;
            await logMessage(`Telegram initialized: User=${currentTgUsername}, Stars=${currentTgStarBalance}`, 'INFO');
        } else {
            console.error(chalk ? chalk.red(`[${new Date().toISOString()}] [App] Failed to initialize Telegram for sniping: ${telegramResult.error || 'Unknown error'}`) : 
                `[${new Date().toISOString()}] [App] Failed to initialize Telegram for sniping: ${telegramResult.error || 'Unknown error'}`);
            console.log(chalk ? chalk.yellow('    Please check API credentials, internet, and Telegram login.') : 
                '    Please check API credentials, internet, and Telegram login.');
            await logMessage(`Failed to initialize Telegram: ${telegramResult.error || 'Unknown error'}`, 'ERROR');
            activeTgClient = null;
            return false;
        }
    }

    if (connectionEstablished) {
        if (currentTgStarBalance < config.minimum_ton_to_spend) {
            console.log(chalk ? chalk.yellow(`[${new Date().toISOString()}] [App] Not enough stars (${currentTgStarBalance}) to meet minimum spending requirement (${config.minimum_ton_to_spend}).`) : 
                `[${new Date().toISOString()}] [App] Not enough stars (${currentTgStarBalance}) to meet minimum spending requirement (${config.minimum_ton_to_spend}).`);
            console.log(chalk ? chalk.yellow('    Please accumulate more stars or adjust the configuration. Returning to main menu.') : 
                '    Please accumulate more stars or adjust the configuration. Returning to main menu.');
            await logMessage(`Insufficient stars: ${currentTgStarBalance} < ${config.minimum_ton_to_spend}`, 'WARNING');
            return false;
        }

        console.log(chalk ? chalk.cyan(`[${new Date().toISOString()}] [App] Telegram setup complete. User: ${currentTgUsername}, Stars: ${currentTgStarBalance}.`) : 
            `[${new Date().toISOString()}] [App] Telegram setup complete. User: ${currentTgUsername}, Stars: ${currentTgStarBalance}.`);
        const { confirmProceed } = await inquirer.prompt([
            {
                type: 'input',
                name: 'confirmProceed',
                message: 'Press Enter to start sniping with current setup (choose market and items):',
            }
        ]);
        
        await marketManager.startMarketMonitoring(chalk, activeTgClient, config);
        await logMessage('Market monitoring started', 'INFO');
        return true;
    }
    return false;
}

async function setConfig() {
    console.clear();
    console.log(chalk ? chalk.cyan(`[${new Date().toISOString()}] [App] --- Set/Update Configuration ---`) : 
        `[${new Date().toISOString()}] [App] --- Set/Update Configuration ---`);
    let currentConfig = await readConfig();
    const newConfig = await promptForConfig(currentConfig);
    if (newConfig[REQUIRED_CONFIG_KEYS.apiID] && newConfig[REQUIRED_CONFIG_KEYS.apiHash]) {
        await writeConfig(newConfig);
        if (!isConfigComplete(newConfig)) {
            console.log(chalk ? chalk.yellow(`[${new Date().toISOString()}] [App] Configuration saved, but some values (like min/max stars) might still need to be set for full functionality.`) : 
                `[${new Date().toISOString()}] [App] Configuration saved, but some values (like min/max stars) might still need to be set for full functionality.`);
            await logMessage('Configuration saved but incomplete', 'WARNING');
        }
    } else {
        console.log(chalk ? chalk.red(`[${new Date().toISOString()}] [App] Configuration setup was not fully completed. Essential API details (ID and Hash) are missing. Not saved.`) : 
            `[${new Date().toISOString()}] [App] Configuration setup was not fully completed. Essential API details (ID and Hash) are missing. Not saved.`);
        await logMessage('Configuration setup incomplete: missing API details', 'ERROR');
    }
}

async function mainMenu() {
    await displayAsciiArt();
    let status = chalk ? chalk.redBright('Disconnected') : 'Disconnected';
    if (activeTgClient && activeTgClient.connected) {
        status = chalk ? chalk.greenBright(`Connected as ${currentTgUsername} (Stars: ${currentTgStarBalance})`) : 
            `Connected as ${currentTgUsername} (Stars: ${currentTgStarBalance})`;
    }
    console.log(chalk ? chalk.cyan(`[${new Date().toISOString()}] Telegram Status: ${status}\n`) : 
        `[${new Date().toISOString()}] Telegram Status: ${status}\n`);

    const { choice } = await inquirer.prompt([
        {
            type: 'list', name: 'choice', message: 'What would you like to do?',
            choices: [
                { name: '1. Start Sniping', value: 'snipe' },
                { name: '2. Set Config', value: 'config' },
                { name: '3. Disconnect Telegram', value: 'disconnect_tg', disabled: !(activeTgClient && activeTgClient.connected) },
                { name: '4. Exit', value: 'exit' },
            ],
        },
    ]);
    return choice;
}

async function run() {
    try {
        const chalkModule = await import('chalk');
        chalk = chalkModule.default;
    } catch (e) {
        console.error(`[${new Date().toISOString()}] Critical: Failed to load 'chalk'. Colors disabled. Install: npm install chalk\nError: `, e.message);
        chalk = new Proxy({}, { get: (target, prop) => (text) => text });
        await logMessage(`Failed to load chalk: ${e.message}`, 'ERROR');
    }

    await checkDependencies();
    await logMessage('Application started', 'INFO');
    await showLoadingBar();
    let running = true;

    while (running) {
        console.clear();
        const choice = await mainMenu();
        let shouldPauseForMenu = true; 
        switch (choice) {
            case 'snipe':
                const monitoringInitiated = await startSniping();
                if (monitoringInitiated) {
                    console.log(chalk ? chalk.cyan(`[${new Date().toISOString()}] [App] Monitoring is active. Press Ctrl+C to stop the bot.`) : 
                        `[${new Date().toISOString()}] [App] Monitoring is active. Press Ctrl+C to stop the bot.`);
                    running = false;
                    shouldPauseForMenu = false; 
                    await new Promise(() => {}); 
                } else {
                    shouldPauseForMenu = true;
                }
                break;
            case 'config':
                await setConfig();
                shouldPauseForMenu = true;
                break;
            case 'disconnect_tg':
                if (activeTgClient && activeTgClient.connected) {
                    console.log(chalk ? chalk.yellow(`[${new Date().toISOString()}] [App] Disconnecting Telegram client as per user request...`) : 
                        `[${new Date().toISOString()}] [App] Disconnecting Telegram client as per user request...`);
                    await telegramManager.disconnectClient(activeTgClient, chalk);
                    activeTgClient = null;
                    currentTgUsername = "N/A";
                    currentTgStarBalance = 0;
                    console.log(chalk ? chalk.green(`[${new Date().toISOString()}] [App] Telegram client disconnected successfully.`) : 
                        `[${new Date().toISOString()}] [App] Telegram client disconnected successfully.`);
                    await logMessage('Telegram client disconnected', 'INFO');
                } else {
                    console.log(chalk ? chalk.yellow(`[${new Date().toISOString()}] [App] Telegram client is not currently connected.`) : 
                        `[${new Date().toISOString()}] [App] Telegram client is not currently connected.`);
                    await logMessage('Attempted to disconnect non-connected client', 'WARNING');
                }
                shouldPauseForMenu = true;
                break;
            case 'exit':
                running = false;
                shouldPauseForMenu = false; 
                console.clear();
                console.log(chalk ? chalk.yellowBright(`[${new Date().toISOString()}] [App] Exiting Sniper Bot... Goodbye!`) : 
                    `[${new Date().toISOString()}] [App] Exiting Sniper Bot... Goodbye!`);
                await logMessage('Application exited', 'INFO');
                break;
        }

        if (running && shouldPauseForMenu) {
            console.log(chalk ? chalk.gray(`[${new Date().toISOString()}] [App] Press any key to return to the main menu...`) : 
                `[${new Date().toISOString()}] [App] Press any key to return to the main menu...`);
            process.stdin.setRawMode(true);
            process.stdin.resume();
            await new Promise(resolve => process.stdin.once('data', () => {
                process.stdin.setRawMode(false);
                process.stdin.pause();
                resolve();
            }));
        }
    }

    if (activeTgClient) {
        console.log(chalk ? chalk.gray(`[${new Date().toISOString()}] [App] Ensuring Telegram client is disconnected before final exit...`) : 
            `[${new Date().toISOString()}] [App] Ensuring Telegram client is disconnected before final exit...`);
        await telegramManager.disconnectClient(activeTgClient, chalk);
        activeTgClient = null;
        await logMessage('Telegram client disconnected before exit', 'INFO');
    }
    await delay(200);
    process.exit(0);
}

run().catch(async err => {
    const logError = chalk ? chalk.red : console.error;
    logError(`[${new Date().toISOString()}] [App] A critical unexpected error occurred:`);
    console.error(err);
    await logMessage(`Critical error: ${err.message}`, 'ERROR');
    if (activeTgClient) {
        console.log(chalk ? chalk.gray(`[${new Date().toISOString()}] [App] Attempting to disconnect Telegram client due to critical error...`) : 
            `[${new Date().toISOString()}] [App] Attempting to disconnect Telegram client due to critical error...`);
        try {
            await telegramManager.disconnectClient(activeTgClient, chalk);
            await logMessage('Telegram client disconnected due to critical error', 'INFO');
        } catch (disconnectErr) {
            console.error(chalk ? chalk.red(`[${new Date().toISOString()}] Error during emergency disconnect:`) : 
                `[${new Date().toISOString()}] Error during emergency disconnect:`, disconnectErr.message);
            await logMessage(`Emergency disconnect error: ${disconnectErr.message}`, 'ERROR');
        }
    }
    process.exit(1);
});
