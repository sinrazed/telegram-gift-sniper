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
        sessionString = await fs.readFile(sessionPath, "utf8");
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.warn(chalk.yellow(`[TG] Warning: Could not read session file at ${sessionPath}: ${error.message}`));
        }
    }

    const stringSessionInstance = new StringSession(sessionString);
    const client = new TelegramClient(stringSessionInstance, parseInt(apiId), apiHash, {
        connectionRetries: 5,
    });

    try {

        if (sessionString) {
             await client.connect();
        }

        if (!await client.isUserAuthorized()) {
            console.log(chalk.yellow("\n[TG] Authorization required. Please follow the prompts:"));
            await client.start({
                phoneNumber: async () => await input.text(chalk.blue("Enter your phone number: ")),
                password: async () => await input.text(chalk.blue("Enter 2FA password (if any, press Enter if none): ")),
                phoneCode: async () => await input.text(chalk.blue("Enter the code you received: ")),
                onError: (err) => console.error(chalk.red("[TG] Login error:"), err.message),
            });
            console.log(chalk.green("\n✅ [TG] Logged in successfully!"));
            const currentSession = client.session.save();
            await fs.writeFile(sessionPath, currentSession);
            console.log(chalk.green(`🔐 [TG] Session saved to ${sessionPath}`));
        } else {
            if (!client.connected) {
                 await client.connect();
            }
            console.log(chalk.green("\n✅ [TG] Session authorized. Connected."));
        }

        const me = await client.getMe();
        const username = me.username || me.firstName || "User";
        console.log(chalk.blue(`👤 [TG] Logged in as: ${username}`));

        let starAmount = 0;
        try {
            const result = await client.invoke(
                new Api.payments.GetStarsStatus({ peer: new Api.InputPeerSelf() })
            );
            starAmount = result.balance && result.balance.amount ? Number(result.balance.amount) : 0;
            console.log(chalk.magentaBright(`🌟 [TG] Stars Balance: ${starAmount}`));
            await client.sendMessage("me", {
                message: `Sniper Bot: Star check complete. Current Stars: ${starAmount}`,
            });
        } catch (starError) {
            console.error(chalk.red("❌ [TG] Error fetching Stars balance:"), starError.message);
            if (starError.message && starError.message.includes("BOTS_TOO_MUCH_LOAD")) {
                 console.warn(chalk.yellow("[TG] Servers might be overloaded for bot actions. Try again later."));
            }
            try {
                await client.sendMessage("me", {
                    message: `Sniper Bot: Error fetching Stars balance. ${starError.message}`,
                });
            } catch (sendMessageError) {
                console.error(chalk.red("[TG] Failed to send error message to self:"), sendMessageError.message);
            }
        }
        return { success: true, username, starBalance: starAmount, client };
    } catch (error) {
        console.error(chalk.red("❌ [TG] Client Error:"), error.message);
        if (error.message && error.message.includes("API_ID_INVALID")) {
            console.error(chalk.red("Error: API ID is invalid. Please check your config.json."));
        }
        if (client && client.connected) {
            await client.destroy().catch(e => console.error(chalk.red("[TG] Error during destroy on failure:"), e.message));
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