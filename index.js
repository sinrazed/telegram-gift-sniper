
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

const CONFIG_PATH = path.join(__dirname, 'config.json');
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
            if (answers && input < answers.minimum_stars_to_spend) {
                return 'Maximum ton must be >= minimum ton.';
            }
            return true;
        },
    },
];


async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function showLoadingBar() {
    console.clear();
    const bar = new cliProgress.SingleBar({
        format: 'Loading... |' + chalk.cyan('{bar}') + '| {percentage}% || {value}/{total} Chunks',
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

    // Wait for fingerprint task to finish if not done yet
    await fingerprintPromise;
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
            console.log(' '.repeat(padding) + chalk.magentaBright(line));
        });
        console.log('\n');
    } catch (err) {
        console.log(chalk.magentaBright.bold(`\n\n${textToDisplay}\n\n`));
    }
}

async function readConfig() {
    try {
        const data = await fs.readFile(CONFIG_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') return {};
        const logError = chalk ? chalk.red : console.error;
        logError('[App] Error reading or parsing config.json:');
        console.error(error.message);
        return {};
    }
}

async function writeConfig(configData) {
    try {
        await fs.writeFile(CONFIG_PATH, JSON.stringify(configData, null, 2));
        console.log(chalk.green('\n[App] Configuration saved to config.json'));
    } catch (error) {
        console.error(chalk.red('[App] Error writing config.json:'), error.message);
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
    console.log(chalk.yellow('\n[App] Configuration is incomplete or needs to be set. Please provide the following details:'));
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

// startSniping now returns true if monitoring is initiated, false otherwise.
async function startSniping() {
    console.clear();
    let config = await readConfig();
    if (!isConfigComplete(config)) {
        console.log(chalk.yellow('[App] Configuration missing or incomplete. Please set it first.'));
        console.log(chalk.yellow('    You can set the configuration from the main menu.'));
        return false; // Indicate sniping did not proceed to monitoring
    }

    let connectionEstablished = false;

    if (activeTgClient && activeTgClient.connected) {
        console.log(chalk.green('\n[App] Telegram client is already connected. Refreshing details...'));
        try {
            const me = await activeTgClient.getMe();
            currentTgUsername = me.username || me.firstName || "User";

            const starResult = await activeTgClient.invoke(
                new Api.payments.GetStarsStatus({ peer: new Api.InputPeerSelf() })
            );
            currentTgStarBalance = starResult.balance && starResult.balance.amount ? Number(starResult.balance.amount) : 0;
            
            console.log(chalk.blue(`    Refreshed User: ${currentTgUsername}, Stars: ${currentTgStarBalance}`));
            connectionEstablished = true;
        } catch (refreshError) {
            console.error(chalk.red('[App] Error refreshing details on existing connection:'), refreshError.message);
            console.log(chalk.yellow('[App] Disconnecting due to error. Please try "Start Sniping" again.'));
            await telegramManager.disconnectClient(activeTgClient, chalk);
            activeTgClient = null;
            currentTgUsername = "N/A";
            currentTgStarBalance = 0;
            return false;
        }
    } else {
        console.log(chalk.cyan('\n--- Initializing Telegram for Sniping ---'));
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
        } else {
            console.error(chalk.red(`\n[App] Failed to initialize Telegram for sniping: ${telegramResult.error || 'Unknown error'}`));
            console.log(chalk.yellow('    Please check API credentials, internet, and Telegram login.'));
            activeTgClient = null;
            return false;
        }
    }

    if (connectionEstablished) {
        if (currentTgStarBalance < config.minimum_stars_to_spend) {
            console.log(chalk.yellow(`\n[App] Not enough stars (${currentTgStarBalance}) to meet minimum spending requirement (${config.minimum_stars_to_spend}).`));
            console.log(chalk.yellow('    Please accumulate more stars or adjust the configuration. Returning to main menu.'));
            return false;
        }

        console.log(chalk.cyan(`\n[App] Telegram setup complete. User: ${currentTgUsername}, Stars: ${currentTgStarBalance}.`));
        const { confirmProceed } = await inquirer.prompt([
            {
                type: 'input',
                name: 'confirmProceed',
                message: 'Press Enter to start sniping with current setup (choose market and items):',
            }
        ]);
        
        // marketManager.startMarketMonitoring will print its "Started monitoring..." message
        await marketManager.startMarketMonitoring(chalk, activeTgClient, config);
        return true; // Indicate that monitoring has been "started"
    }
    return false; // Default to false if connection wasn't established
}

async function setConfig() {
    console.clear();
    console.log(chalk.cyan('\n--- Set/Update Configuration ---'));
    let currentConfig = await readConfig();
    const newConfig = await promptForConfig(currentConfig);
    if (newConfig[REQUIRED_CONFIG_KEYS.apiID] && newConfig[REQUIRED_CONFIG_KEYS.apiHash]) {
        await writeConfig(newConfig);
        if (!isConfigComplete(newConfig)) {
            console.log(chalk.yellow('\n[App] Configuration saved, but some values (like min/max stars) might still need to be set for full functionality.'));
        }
    } else {
        console.log(chalk.red('\n[App] Configuration setup was not fully completed. Essential API details (ID and Hash) are missing. Not saved.'));
    }
}

async function mainMenu() {
    await displayAsciiArt();
    let status = chalk.redBright('Disconnected');
    if (activeTgClient && activeTgClient.connected) {
        status = chalk.greenBright(`Connected as ${currentTgUsername} (Stars: ${currentTgStarBalance})`);
    }
    console.log(chalk.cyan(`Telegram Status: ${status}\n`));

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
        console.error("Critical: Failed to load 'chalk'. Colors disabled. Install: npm install chalk\nError: ", e.message);
        chalk = new Proxy({}, { get: (target, prop) => (text) => text });
    }

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

                    console.log(chalk.cyan("\n[App] Monitoring is active. Press Ctrl+C to stop the bot."));
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
                    console.log(chalk.yellow('\n[App] Disconnecting Telegram client as per user request...'));
                    await telegramManager.disconnectClient(activeTgClient, chalk);
                    activeTgClient = null;
                    currentTgUsername = "N/A";
                    currentTgStarBalance = 0;
                    console.log(chalk.green('[App] Telegram client disconnected successfully.'));
                } else {
                    console.log(chalk.yellow('\n[App] Telegram client is not currently connected.'));
                }
                shouldPauseForMenu = true;
                break;
            case 'exit':
                running = false;
                shouldPauseForMenu = false; 
                console.clear();
                console.log(chalk.yellowBright('\nExiting Sniper Bot... Goodbye!'));
                break;
        }

        if (running && shouldPauseForMenu) {
            console.log(chalk.gray("\nPress any key to return to the main menu..."));
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
        console.log(chalk.gray("\n[App] Ensuring Telegram client is disconnected before final exit..."));
        await telegramManager.disconnectClient(activeTgClient, chalk);
        activeTgClient = null;
    }
    await delay(200); z
    process.exit(0);
}

run().catch(async err => {
    const logError = chalk ? chalk.red : console.error;
    logError('\n[App] A critical unexpected error occurred:');
    console.error(err);
    if (activeTgClient) {
        console.log(chalk.gray("[App] Attempting to disconnect Telegram client due to critical error..."));
        try {
            await telegramManager.disconnectClient(activeTgClient, chalk);
        } catch (disconnectErr) {
            console.error(chalk.red("Error during emergency disconnect: "), disconnectErr.message);
        }
    }
    process.exit(1);

});

