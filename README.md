[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]

<br />
<div align="center">
  <a href="https://github.com/sinrazed/telegram-gift-sniper">
    <img src="images/logo.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">telegram-gift-sniper</h3>

  <p align="center">
     Buys the cheapest available gift in your chosen market and instantly relists it for a higher price, all through a Terminal User Interface (TUI).
    <br />
    <a href="https://github.com/sinrazed/telegram-gift-sniper"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/sinrazed/telegram-gift-sniper">View Demo</a>
    ·
    <a href="https://github.com/sinrazed/telegram-gift-sniper/issues">Report Bug</a>
    ·
    <a href="https://github.com/sinrazed/telegram-gift-sniper/issues">Request Feature</a>
  </p>
</div>
# telegram-gift-sniper

Efficiently snipe gifts on Telegram markets and relist them for profit, featuring an interactive command-line interface for easy operation.

<div align="center">
  <p><strong>✨ TUI in Action ✨</strong></p>
  
  <img src="images/image2.png" alt="Telegram Gift Sniper - Main Interface" width="700">
  <p><small><em>Main TUI showing operational status and options.</em></small></p>
  <br/>
  
  <img src="images/image1.png" alt="Telegram Gift Sniper - Menu Navigation" width="700">
  <p><small><em>Navigating through the configuration menus.</em></small></p>
  <br/>
  
  <img src="images/image3.png" alt="Telegram Gift Sniper - Logs and Details" width="700">
  <p><small><em>Viewing detailed logs or process information.</em></small></p>
</div>

## Installation Instructions
> [!CAUTION]
> **you need atleast 1 ton and 25 starts in your telegram account for this to work**


*You don't have to edit any files initially; the script will ask you for required inputs (like Telegram API ID, API Hash, spending limits, etc.) when you run it.*

### Manual Configuration

1.  Open your terminal.
2.  Clone the repository:
    ```sh
    git clone https://github.com/sinrazed/telegram-gift-sniper.git
    ```
    *or download the ZIP and extract it.*
3.  Navigate to the project directory:
    ```sh
    cd telegram-gift-sniper
    ```
4.  Install dependencies:
    ```sh
    npm install
    ```
5.  Run the script:
    ```sh
    node index.js
    ```

## System Requirements

Ensure your system meets these prerequisites:

1.  [Node.js](https://nodejs.org/) 16+ (the latest LTS version is recommended).
2.  Git installed on your device (for cloning).
3.  Windows, macOS, or Linux.
4.  A curious mind (and an understanding of the risks involved).

## 🚨 IMPORTANT WARNING 🚨



**This tool is provided for educational and experimental purposes only. The developers are not responsible for any negative consequences, including account bans or financial loss, that may arise from its use. USE AT YOUR OWN EXTREME RISK.**

## Specifications

1.  **Market Selection:** Choose from multiple supported Telegram gift markets (e.g., Tonnel, GetGems, Portal, MRKT).
2.  **Gift Selection:** Interactively select specific Telegram gifts to monitor and snipe from a predefined list.
3.  **Automated Sniping & Purchase:** Scans chosen markets for the cheapest listings of selected gifts and attempts to purchase them automatically.
4.  **Instant Relisting:** Automatically relists purchased gifts on the market, aiming for a profitable resale price.
5.  **Telegram API Integration:** Securely connects to Telegram using your API credentials for account operations and session management.
6.  **Interactive TUI:** A user-friendly Terminal User Interface (TUI) for easy configuration, market/gift selection, and operational monitoring.
7.  **Runtime Configuration:** Prompts for and manages essential settings such as Telegram API ID, API Hash, and spending thresholds.
8.  **Spending Controls:** Define minimum and maximum amounts (e.g., TON or Stars, depending on market requirements) for purchasing gifts.

> **Note:** As of June 6th, 2025 (10/06/2025), telegram-gift-sniper is designed to be functional with current Telegram API and supported market platform interactions. However, APIs and platform functionalities can change rapidly, potentially requiring updates to this tool to maintain functionality. This project interacts with the Telegram API, often using user account credentials, which carries inherent risks including, but not limited to, account restrictions or bans by Telegram or market platforms. Always use such tools responsibly and be aware of the terms of service for any platform you interact with. Remember, sharing knowledge benefits everyone; please provide credit if you find our work valuable or adapt it.


[contributors-shield]: https://img.shields.io/github/contributors/sinrazed/telegram-gift-sniper.svg?style=for-the-badge
[contributors-url]: https://github.com/sinrazed/telegram-gift-sniper/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/sinrazed/telegram-gift-sniper.svg?style=for-the-badge
[forks-url]: https://github.com/sinrazed/telegram-gift-sniper/network/members
[stars-shield]: https://img.shields.io/github/stars/sinrazed/telegram-gift-sniper.svg?style=for-the-badge
[stars-url]: https://github.com/sinrazed/telegram-gift-sniper/stargazers
[issues-shield]: https://img.shields.io/github/issues/sinrazed/telegram-gift-sniper.svg?style=for-the-badge
[issues-url]: https://github.com/sinrazed/telegram-gift-sniper/issues
