// telegramClient.js
const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { Logger } = require("telegram/extensions"); // For managing gramJS logs
const input = require("input");
const fs = require("fs").promises;
const path = require("path");

Logger.setLevel("error"); 


const SESSION_FILE_NAME = "session.txt";

async function initializeAndGetStars(apiId, apiHash, chalkInstance) {
    const chalk = chalkInstance || {
        red: (s) => s, green: (s) => s, yellow: (s) => s,
        blue: (s) => s, cyan: (s) => s, magentaBright: (s) => s, gray: (s) => s,
    };

    const sessionPath = path.join(__dirname, SESSION_FILE_NAME);
    let sessionString = "";

    try {
        sessionString = await fs.readFile(sessionPath, "utf8").trim();
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.warn(chalk.yellow(`[TG] Warning: Could not read session file: ${error.message}`));
        }
    }

    const stringSession = new StringSession(sessionString);
    const client = new TelegramClient(stringSession, parseInt(apiId), apiHash, {
        connectionRetries: 5,
        useWSS: true,
        requestRetries: 5,
        floodSleepThreshold: 24,
    });

    try {
        console.log(chalk.cyan("[TG] Connecting to Telegram..."));
        await client.connect();

        let isAuthorized = false;
        try {
            isAuthorized = await client.isUserAuthorized();
        } catch (authCheckErr) {
            console.warn(chalk.yellow("[TG] Failed to check auth status, forcing login..."));
        }

        if (!isAuthorized || !sessionString) {
            console.log(chalk.yellow("\n[TG] No valid session found. Starting login process..."));
            await client.start({
                phoneNumber: async () => {
                    const phone = await input.text(chalk.blue("Enter your phone number (e.g. +79891234567): "));
                    return phone.trim();
                },
                password: async () => await input.text(chalk.blue("Enter 2FA password (press Enter if none): ")),
                phoneCode: async () => await input.text(chalk.blue("Enter the login code you received: ")),
                onError: (err) => {
                    console.error(chalk.red(`[TG] Login failed: ${err.message}`));
                    if (err.message.includes("UPDATE_APP_TO_LOGIN")) {
                        console.error(chalk.red("Telegram requires you to update your app. Use official Telegram app first!"));
                    }
                },
            });

            const newSession = client.session.save();
            await fs.writeFile(sessionPath, newSession);
            console.log(chalk.green("Session saved successfully!"));
        } else {
            console.log(chalk.green("Logged in using saved session!"));
        }

        // Now safely get user info
        const me = await client.getMe();
        const username = me.username ? `@${me.username}` : me.firstName || "User";
        console.log(chalk.blue(`Logged in as: ${username}`));

        // Get Stars balance
        let starAmount = 0;
        try {
            const result = await client.invoke(new Api.payments.GetStarsStatus({
                peer: new Api.InputPeerSelf()
            }));
            starAmount = result.balance?.amount || 0;
            console.log(chalk.magentaBright(`Telegram Stars: ${starAmount}`));
        } catch (e) {
            console.warn(chalk.yellow("[TG] Could not fetch Stars balance: " + e.message));
        }

        return { success: true, client, username, starBalance: starAmount };

    } catch (error) {
        console.error(chalk.red(`[TG] Fatal error: ${error.message}`));

        if (error.message.includes("UPDATE_APP_TO_LOGIN")) {
            console.error(chalk.red("\nYou MUST open the official Telegram app and log in once!"));
            console.error(chalk.red("Telegram blocks third-party clients until you log in officially first.\n"));
        }

        if (client.connected) {
            await client.disconnect();
            await client.destroy();
        }

        return { success: false, error: error.message, client: null };
    }
}

async function disconnectClient(client, chalkInstance) {
    const chalk = chalkInstance || { yellow: (s) => s, red: (s) => s, gray: (s) => s };
    if (client) {

        try {

            await client.destroy();
            console.log(chalk.yellow("🔌 [TG] Client disconnected and resources released."));
        } catch (e) {

            console.error(chalk.red("[TG] Error during client.destroy:"), e.message);
        }
    }
}


module.exports = { initializeAndGetStars, disconnectClient };
