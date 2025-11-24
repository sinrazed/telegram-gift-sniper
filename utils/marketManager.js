// marketManager.js
const inquirer = require('inquirer');

const items = [
  "Evil Eye", "Plush Pepe", "Heart Locket", "Bow Tie", "Heroic Helmet",
  "Nail Bracelet", "Restless Jar", "Light Sword", "Gem Signet", "Astral Shard",
  "B-Day Candle", "Berry Box", "Big Year", "Bonded Ring", "Bunny Muffin",
  "Candy Cane", "Cookie Heart", "Crystal Ball", "Desk Calendar", "Diamond Ring",
  "Durov's Cap", "Easter Egg", "Electric Skull", "Eternal Candle", "Eternal Rose",
  "Flying Broom", "Genie Lamp", "Ginger Cookie", "Hanging Star", "Hex Pot",
  "Holiday Drink", "Homemade Cake", "Hypno Lollipop", "Ion Gem", "Jack-in-the-Box",
  "Jelly Bunny", "Jester Hat", "Jingle Bells", "Kissed Frog", "Lol Pop",
  "Loot Bag", "Love Candle", "Love Potion", "Lunar Snake", "Mad Pumpkin",
  "Magic Potion", "Mini Oscar", "Neko Helmet", "Party Sparkler", "Perfume Bottle",
  "Pet Snake", "Precious Peach", "Record Player", "Sakura Flower", "Santa Hat",
  "Scared Cat", "Signet Ring", "Skull Flower", "Sleigh Bell", "Snake Box",
  "Snow Globe", "Snow Mittens", "Spiced Wine", "Spy Agaric", "Star Notepad",
  "Swiss Watch", "Tama Gadget", "Top Hat", "Toy Bear", "Trapped Heart",
  "Vintage Cigar", "Voodoo Doll", "Winter Wreath", "Witch Hat", "Xmas Stocking",
  "Victory Medal",
  "Peace Dove",
  "Shooting Star",
  "Playful Puppy",
  "Cuddly Kitten",
  "Fluttering Butterfly",
  "Blooming Flower",
  "Cheerful Balloon",
  "Lucky Clover",
  "Patriotic Flag",
  "Medal",
  "Star"
];
function displayItemsAsGrid(chalk) {
    console.log(chalk.yellow("\nWhich gifts to monitor? Select one by number from the list below:"));
    const columns = 5;
    const itemPadding = 22;
    
    let outputGridString = "";
    items.forEach((item, index) => {
        const paddedItemText = `${index + 1}. ${item}`.padEnd(itemPadding);
        outputGridString += paddedItemText;
        if ((index + 1) % columns === 0) {
            outputGridString += '\n';
        }
    });
    
    if (outputGridString.endsWith('\n')) {
        outputGridString = outputGridString.slice(0, -1);
    }
    console.log(outputGridString);
    console.log(''); 
}

async function startMarketMonitoring(chalk, activeTgClient, currentConfig) {
   

    const { market } = await inquirer.prompt([
        {
            type: 'list',
            name: 'market',
            message: 'Pick the market:',
            choices: [
                { name: 'Tonnel', value: 'tonnel' },
                { name: 'GetGems', value: 'getgems' },
                { name: 'Portal', value: 'portal' },
                { name: 'MRKT', value: 'mrkt' }
            ]
        }
    ]);

    displayItemsAsGrid(chalk);

    const { giftNumber } = await inquirer.prompt([
        {
            type: 'input',
            name: 'giftNumber',
            message: `Enter the number of the gift you want to snipe on ${chalk.cyan(market)}:`,
            validate: (input) => {
                const num = parseInt(input, 10);
                if (isNaN(num) || num < 1 || num > items.length) {
                    return `Please enter a number between 1 and ${items.length}.`;
                }
                return true;
            },
            filter: Number,
        }
    ]);

    const selectedGift = items[giftNumber - 1];
    console.log(chalk.green(`\n[Market] Started monitoring "${selectedGift}" on market "${market}".....`));
    console.log(chalk.yellow(`\n[NOTE] -> you need atleast 25 stars inorder to initiate relisting process.`));
}


module.exports = { startMarketMonitoring, items };
