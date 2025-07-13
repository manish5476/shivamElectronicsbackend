const TelegramBot = require('node-telegram-bot-api');
const { v4: uuidv4 } = require('uuid');

// Import your controllers (paths are relative to telegrambot.js)
const authController = require('../Controllers/authController');
const customerController = require('../Controllers/customerController');
const invoiceController = require('../Controllers/invoiceController');
const paymentController = require('../Controllers/paymentController');
const productController = require('../Controllers/productController'); // Import productController

// Retrieve your Telegram Bot Token from environment variables
const token = process.env.TELEGRAM_TOKEN;
if (!token) {
    console.error('TELEGRAM_TOKEN environment variable is not set. Please set it to your bot token.');
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// In-memory stores for user tokens and roles.
const userTokens = {};
const userRoles = {};

// --- Centralized Command Definitions ---
const commandDefinitions = [
    // General Commands
    {
        command: '/start',
        description: 'Get a welcome message and basic info.',
        usage: '/start',
        category: 'General',
        roles: ['user', 'staff', 'admin', 'superAdmin', 'guest']
    },
    {
        command: '/help',
        description: 'Show this help message with all commands.',
        usage: '/help',
        category: 'General',
        roles: ['user', 'staff', 'admin', 'superAdmin', 'guest']
    },
    {
        command: '/register',
        description: 'Create a new user account.',
        usage: '/register <name> <email> <password>',
        category: 'Authentication',
        roles: ['guest']
    },
    {
        command: '/login',
        description: 'Log in to your account to access features.',
        usage: '/login <email> <password>',
        category: 'Authentication',
        roles: ['guest']
    },
    {
        command: '/logout',
        description: 'Log out of your current session.',
        usage: '/logout',
        category: 'Authentication',
        roles: ['user', 'staff', 'admin', 'superAdmin']
    },
    // Product Management
    {
        command: '/newproduct',
        description: 'Add a new product to your inventory.',
        usage: '/newproduct <title>,<sku>,<price>,<stock>[,<category>,<description>]',
        example: '`/newproduct Laptop,LAP001,1200.00,50,Electronics,Powerful laptop`',
        category: 'Product Management',
        roles: ['admin', 'staff', 'superAdmin']
    },
    {
        command: '/getproductbyid',
        description: 'Get details of a specific product by ID.',
        usage: '/getproductbyid <product_id>',
        example: '`/getproductbyid 60c72b2f9b1e8b0015f8e0a3`',
        category: 'Product Management',
        roles: ['user', 'staff', 'admin', 'superAdmin']
    },
    {
        command: '/getallproducts',
        description: 'List all products in your inventory.',
        usage: '/getallproducts',
        category: 'Product Management',
        roles: ['user', 'staff', 'admin', 'superAdmin']
    },
    {
        command: '/updateproduct',
        description: 'Update a specific field for a product.',
        usage: '/updateproduct <product_id>,<field>,<newValue>',
        example: '`/updateproduct 60c...,price,1150.00`',
        category: 'Product Management',
        roles: ['admin', 'staff', 'superAdmin']
    },
    {
        command: '/deleteproduct',
        description: 'Permanently delete a product record.',
        usage: '/deleteproduct <product_id>',
        category: 'Product Management',
        roles: ['admin', 'superAdmin']
    },
    {
        command: '/deletemultipleproducts',
        description: 'Delete multiple product records.',
        usage: '/deletemultipleproducts <id1>,<id2>[,<id3>,...]',
        example: '`/deletemultipleproducts 60c...,60d...`',
        category: 'Product Management',
        roles: ['admin', 'superAdmin']
    },
    // Customer Management
    {
        command: '/newcustomer',
        description: 'Create a new customer record.',
        usage: '/newcustomer <email>,<fullname>,<phoneNumber>[,<phoneType>]',
        example: '`/newcustomer test@example.com,John Doe,1234567890,mobile`',
        category: 'Customer Management',
        roles: ['admin', 'staff', 'superAdmin']
    },
    {
        command: '/getcustomerbyid',
        description: 'Get detailed information for a specific customer by ID.',
        usage: '/getcustomerbyid <customer_id>',
        example: '`/getcustomerbyid 60c72b2f9b1e8b0015f8e0a1`',
        category: 'Customer Management',
        roles: ['user', 'staff', 'admin', 'superAdmin']
    },
    {
        command: '/getallcustomers',
        description: 'List all customer records.',
        usage: '/getallcustomers',
        category: 'Customer Management',
        roles: ['admin', 'staff', 'superAdmin']
    },
    {
        command: '/updatecustomer',
        description: 'Update a specific field for a customer.',
        usage: '/updatecustomer <customer_id>,<field>,<newValue>',
        example: '`/updatecustomer 60c...,fullname,Jane Doe`\nFor phone: `/updatecustomer 123,phoneNumbers,9876543210:home` (overwrites existing phones)',
        category: 'Customer Management',
        roles: ['admin', 'staff', 'superAdmin']
    },
    {
        command: '/deletecustomer',
        description: 'Permanently delete a customer record.',
        usage: '/deletecustomer <customer_id>',
        category: 'Customer Management',
        roles: ['admin', 'superAdmin']
    },
    {
        command: '/deactivatemultiplecustomers',
        description: 'Change the status of multiple customers to inactive.',
        usage: '/deactivatemultiplecustomers <id1>,<id2>[,<id3>,...]',
        example: '`/deactivatemultiplecustomers 60c...,60d...`',
        category: 'Customer Management',
        roles: ['admin', 'superAdmin']
    },
    // Invoice Management
    {
        command: '/getinvoice',
        description: 'Get details of a specific invoice by ID.',
        usage: '/getinvoice <invoice_id>',
        category: 'Invoice Management',
        roles: ['user', 'staff', 'admin', 'superAdmin']
    },
    {
        command: '/getallinvoices',
        description: 'List all invoice records.',
        usage: '/getallinvoices',
        category: 'Invoice Management',
        roles: ['admin', 'staff', 'superAdmin']
    },
    {
        command: '/createinvoice',
        description: 'Create a new invoice record.',
        usage: '/createinvoice <customerId>,<customerName>,<amount>,<status>,<productName>,<productQuantity>,<productPrice>',
        example: '`/createinvoice 60c...,John,100,pending,Laptop,1,100`',
        category: 'Invoice Management',
        roles: ['admin', 'staff', 'superAdmin']
    },
    {
        command: '/updateinvoice',
        description: 'Update a specific field for an invoice.',
        usage: '/updateinvoice <invoice_id>,<field>,<newValue>',
        example: '`/updateinvoice 60c...,status,paid`',
        category: 'Invoice Management',
        roles: ['admin', 'staff', 'superAdmin']
    },
    {
        command: '/deleteinvoice',
        description: 'Permanently delete an invoice record.',
        usage: '/deleteinvoice <invoice_id>',
        category: 'Invoice Management',
        roles: ['admin', 'staff', 'superAdmin']
    },
    {
        command: '/productsales',
        description: 'Get product sales report for a date range.',
        usage: '/productsales <startDate>,<endDate>',
        example: '`/productsales 2024-01-01,2024-12-31`',
        category: 'Invoice Management',
        roles: ['admin', 'staff', 'superAdmin']
    },
    // Payment Management
    {
        command: '/newpayment',
        description: 'Record a new payment.',
        usage: '/newpayment <customer_id>,<amount>,<date>[,<description>]',
        example: '`/newpayment 60c...,150.75,2025-07-15,Initial payment`',
        category: 'Payment Management',
        roles: ['admin', 'staff', 'superAdmin']
    },
    {
        command: '/getpaymentbyid',
        description: 'Get detailed information for a specific payment by ID.',
        usage: '/getpaymentbyid <payment_id>',
        example: '`/getpaymentbyid 60c72b2f9b1e8b0015f8e0a2`',
        category: 'Payment Management',
        roles: ['user', 'staff', 'admin', 'superAdmin']
    },
    {
        command: '/getallpayments',
        description: 'List all payment records.',
        usage: '/getallpayments',
        category: 'Payment Management',
        roles: ['admin', 'staff', 'superAdmin']
    },
    {
        command: '/updatepayment',
        description: 'Update a specific field for a payment.',
        usage: '/updatepayment <payment_id>,<field>,<newValue>',
        example: '`/updatepayment 60c...,amount,200.00`',
        category: 'Payment Management',
        roles: ['admin', 'staff', 'superAdmin']
    },
    {
        command: '/deletepayment',
        description: 'Permanently delete a payment record.',
        usage: '/deletepayment <payment_id>',
        category: 'Payment Management',
        roles: ['admin', 'superAdmin']
    },
    {
        command: '/deletemultiplepayments',
        description: 'Delete multiple payment records.',
        usage: '/deletemultiplepayments <id1>,<id2>[,<id3>,...]',
        example: '`/deletemultiplepayments 60c...,60d...`',
        category: 'Payment Management',
        roles: ['admin', 'superAdmin']
    },
];

// Create a map for quick lookup of command details
const commandDetailsMap = new Map(commandDefinitions.map(cmd => [cmd.command, cmd]));

// --- Helper Functions ---

/**
 * Authenticates a Telegram user based on their stored JWT token.
 * @param {number} chatId The chat ID of the Telegram user.
 * @returns {object|null} The decoded user object if authenticated, otherwise null.
 */
const authenticateBotUser = async (chatId) => {
    const token = userTokens[chatId];
    if (!token) {
        await bot.sendMessage(chatId, '⚠️ You must log in first. Use `/login email password`.');
        return null;
    }
    try {
        const decodedUser = await authController.verifyTokenAndGetUserBot(`Bearer ${token}`);
        userRoles[chatId] = decodedUser.role;
        return decodedUser;
    } catch (error) {
        delete userTokens[chatId];
        delete userRoles[chatId];
        await bot.sendMessage(chatId, `❌ Authentication failed: ${error.message}. Please log in again.`);
        return null;
    }
};

/**
 * Higher-order function to restrict command access based on user roles.
 * It returns the actual handler function that bot.onText expects.
 * @param {string[]} allowedRoles An array of roles that are allowed to use the command.
 * @param {Function} commandHandler The actual async function that handles the command logic.
 * @returns {Function} An async function (msg, match) that will be passed to bot.onText.
 */
const restrictBotUserTo = (allowedRoles, commandHandler) => async (msg, match) => {
    const chatId = msg.chat.id;
    const command = msg.text.split(' ')[0];

    if (allowedRoles.includes('guest')) {
        if (!userTokens[chatId]) {
            return commandHandler(msg, match, null);
        }
    }

    const user = await authenticateBotUser(chatId);
    if (!user) {
        return;
    }

    const userRole = userRoles[chatId];

    if (userRole === 'superAdmin') {
        return commandHandler(msg, match, user);
    }

    if (!allowedRoles.includes(userRole)) {
        const cmdInfo = commandDetailsMap.get(command);
        let accessDeniedMessage = `🚫 Access Denied: You do not have the required role to perform this action. Your role: *${userRole}*.`;
        if (cmdInfo && cmdInfo.roles) {
            accessDeniedMessage += `\nAllowed roles for *${command}*: *${cmdInfo.roles.filter(r => r !== 'guest').join(', ')}*.`;
        }
        return bot.sendMessage(chatId, accessDeniedMessage, { parse_mode: 'Markdown' });
    }

    commandHandler(msg, match, user);
};

/**
 * Sends a usage hint for a command if arguments are missing or invalid.
 * @param {number} chatId The chat ID.
 * @param {string} command The command string (e.g., '/newcustomer').
 */
const sendUsageHint = async (chatId, command) => {
    const cmdInfo = commandDetailsMap.get(command);
    if (cmdInfo) {
        let hint = `Incorrect usage for *${command}*.\n`;
        hint += `*Usage:* \`${cmdInfo.usage}\`\n`;
        if (cmdInfo.example) {
            hint += `*Example:* ${cmdInfo.example}\n`;
        }
        hint += `Please provide all required arguments correctly.`;
        await bot.sendMessage(chatId, hint, { parse_mode: 'Markdown' });
    } else {
        await bot.sendMessage(chatId, `Unknown command: *${command}*. Use \`/help\` for a list of commands.`, { parse_mode: 'Markdown' });
    }
};

/**
 * Generates a string formatted for Telegram's BotFather /setcommands.
 * You need to copy the output of this function and paste it into BotFather.
 */
function generateBotCommandsList() {
    // Filter out commands that are not meant for the main command list (e.g., internal-only or very specific ones)
    // For BotFather, we typically list commands that users would type directly.
    const commandsForBotFather = commandDefinitions
        .filter(cmd => !cmd.command.startsWith('/deactivate') && !cmd.command.startsWith('/deleteMultiple')) // Exclude multiple delete/deactivate from main list
        .map(cmd => ({
            command: cmd.command.substring(1), // Remove the leading '/'
            description: cmd.description
        }));

    // Sort commands alphabetically for better readability
    commandsForBotFather.sort((a, b) => a.command.localeCompare(b.command));

    // console.log("\n--- BotFather /setcommands List (JSON Format) ---");
    // console.log("Copy the JSON below and send it to @BotFather after typing /setcommands and selecting your bot:");
    // console.log(JSON.stringify(commandsForBotFather, null, 2));
    // console.log("-------------------------------------------------\n");

    return commandsForBotFather;
}

// Call this function once when the bot starts up to log the commands.
// You can comment this line out after you've successfully updated the commands via BotFather.
generateBotCommandsList();


// --- General Commands ---

bot.onText(/\/start/, restrictBotUserTo(['guest', 'user', 'staff', 'admin', 'superAdmin'], async (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `
👋 Welcome! I am your business management bot.

To get started:
1. If you don't have an account, use \`/register <name> <email> <password>\`.
2. If you have an account, use \`/login <email> <password>\`.

Once logged in, you can manage customers, products, invoices, and payments.
Type \`/help\` to see a list of all commands and their usage.
You can also use the Telegram command menu (usually by typing \`/\`) for quick suggestions.
    `;
    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
}));

bot.onText(/\/help/, restrictBotUserTo(['guest', 'user', 'staff', 'admin', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    const userRole = user ? user.role : 'guest';

    let helpMessage = `📚 *Available Commands (Your Role: ${userRole}):*\n\n`;

    const categories = [...new Set(commandDefinitions.map(cmd => cmd.category))];

    for (const category of categories) {
        helpMessage += `*--- ${category} ---*\n`;
        const categoryCommands = commandDefinitions.filter(cmd => cmd.category === category);

        for (const cmd of categoryCommands) {
            const isAllowed = cmd.roles.includes(userRole) || userRole === 'superAdmin' || cmd.roles.includes('guest');

            if (isAllowed) {
                helpMessage += `• *${cmd.command}*: ${cmd.description}\n`;
                helpMessage += `  _Usage:_ \`${cmd.usage}\`\n`;
                if (cmd.example) {
                    helpMessage += `  _Example:_ ${cmd.example}\n`;
                }
            }
        }
        helpMessage += '\n';
    }

    const messages = [];
    let currentMessage = '';
    const lines = helpMessage.split('\n');

    for (const line of lines) {
        if ((currentMessage + line + '\n').length > 4000) {
            messages.push(currentMessage);
            currentMessage = line + '\n';
        } else {
            currentMessage += line + '\n';
        }
    }
    if (currentMessage.length > 0) {
        messages.push(currentMessage);
    }

    for (const part of messages) {
        await bot.sendMessage(chatId, part, { parse_mode: 'Markdown' });
    }
}));


// --- User Authentication Commands ---

bot.onText(/\/register (.+)/, restrictBotUserTo(['guest'], async (msg, match) => {
    const chatId = msg.chat.id;
    const command = '/register';
    const args = match[1].split(' ');

    if (args.length < 3) {
        return sendUsageHint(chatId, command);
    }

    const [name, email, password] = args;
    const passwordConfirm = password;

    try {
        const { token, user } = await authController.signupBot(name, email, password, passwordConfirm, 'user');
        userTokens[chatId] = token;
        userRoles[chatId] = user.role;
        bot.sendMessage(chatId, `✅ Registered and logged in as a *${user.role}*!`, { parse_mode: 'Markdown' });
    } catch (err) {
        bot.sendMessage(chatId, `❌ Error: ${err.message || 'Failed to register'}`);
    }
}));

bot.onText(/\/login (.+)/, restrictBotUserTo(['guest'], async (msg, match) => {
    const chatId = msg.chat.id;
    const command = '/login';
    const args = match[1].split(' ');

    if (args.length < 2) {
        return sendUsageHint(chatId, command);
    }

    const [email, password] = args;

    try {
        const { user, token } = await authController.loginBot(email, password);
        userTokens[chatId] = token;
        userRoles[chatId] = user.role;
        bot.sendMessage(chatId, `🔐 Login successful! You're now authenticated as *${user.role}*.`, { parse_mode: 'Markdown' });
    } catch (err) {
        bot.sendMessage(chatId, `❌ Login failed: ${err.message || 'Error'}`);
    }
}));

bot.onText(/\/logout/, restrictBotUserTo(['user', 'staff', 'admin', 'superAdmin'], (msg) => {
    const chatId = msg.chat.id;
    delete userTokens[chatId];
    delete userRoles[chatId];
    bot.sendMessage(chatId, '✅ You have been logged out.');
}));


// --- Product Management Commands ---

bot.onText(/\/newproduct (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    const command = '/newproduct';
    const args = match[1].split(',').map(arg => arg.trim());

    if (args.length < 4) { // title, sku, price, stock are mandatory
        return sendUsageHint(chatId, command);
    }

    const [title, sku, priceStr, stockStr, category = 'Uncategorized', description = ''] = args;
    const price = parseFloat(priceStr);
    const stock = parseInt(stockStr, 10);

    if (isNaN(price) || price <= 0 || isNaN(stock) || stock < 0) {
        return bot.sendMessage(chatId, '❌ Invalid price or stock. Price must be a positive number, stock must be a non-negative integer.');
    }

    const productData = {
        title,
        sku,
        price,
        stock,
        category,
        description
    };

    try {
        const { message, product } = await productController.newProductBot(productData, user._id);
        await bot.sendMessage(chatId, `✅ ${message} Product ID: \`${product._id}\`\nTitle: ${product.title}\nSKU: ${product.sku}`, { parse_mode: 'Markdown' });
    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to create product: ${err.message || 'Error'}`);
    }
}));

bot.onText(/\/getproductbyid (.+)/, restrictBotUserTo(['user', 'staff', 'admin', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    const command = '/getproductbyid';
    const productId = match[1].trim();

    if (!productId) {
        return sendUsageHint(chatId, command);
    }

    try {
        const product = await productController.getProductByIdBot(productId, user._id, user.role === 'superAdmin');
        const details = `
📦 *Product Details:*
ID: \`${product._id}\`
Title: *${product.title}*
SKU: \`${product.sku}\`
Price: $${product.price?.toFixed(2) || '0.00'}
Stock: ${product.stock || '0'}
Category: ${product.category || 'N/A'}
Description: ${product.description || 'N/A'}
        `;
        await bot.sendMessage(chatId, details, { parse_mode: 'Markdown' });

    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to get product: ${err.message || 'Error'}`);
    }
}));

bot.onText(/\/getallproducts/, restrictBotUserTo(['user', 'staff', 'admin', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    try {
        const products = await productController.getAllProductsBot(user._id, user.role === 'superAdmin', {});

        if (!products || products.length === 0) {
            return bot.sendMessage(chatId, 'ℹ️ No products found.');
        }

        const productSummaries = products.map(p =>
            `ID: \`${p._id}\`\nTitle: *${p.title}*\nSKU: \`${p.sku}\`\nPrice: $${p.price?.toFixed(2) || '0.00'}\nStock: ${p.stock || '0'}`
        ).join('\n\n---\n\n');

        if (productSummaries.length <= 4000) {
            await bot.sendMessage(chatId, `📦 *All Products:*\n\n${productSummaries}`, { parse_mode: 'Markdown' });
        } else {
            await bot.sendMessage(chatId, '⚠️ Too many products to display directly. Consider filtering or requesting a specific product by ID.');
        }

    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to get all products: ${err.message || 'Error'}`);
    }
}));

bot.onText(/\/updateproduct (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    const command = '/updateproduct';
    const args = match[1].split(',').map(arg => arg.trim());

    if (args.length < 3) {
        return sendUsageHint(chatId, command);
    }

    const productId = args[0];
    const field = args[1];
    const newValue = args[2];

    const updateData = {};
    if (field === 'price') {
        const price = parseFloat(newValue);
        if (isNaN(price) || price <= 0) {
            return bot.sendMessage(chatId, '❌ Invalid price. Please provide a positive number.');
        }
        updateData.price = price;
    } else if (field === 'stock') {
        const stock = parseInt(newValue, 10);
        if (isNaN(stock) || stock < 0) {
            return bot.sendMessage(chatId, '❌ Invalid stock. Please provide a non-negative integer.');
        }
        updateData.stock = stock;
    } else {
        updateData[field] = newValue;
    }

    try {
        const updatedProduct = await productController.updateProductBot(productId, updateData, user._id, user.role === 'superAdmin');
        await bot.sendMessage(chatId, `✅ Product \`${updatedProduct._id}\` updated. New *${field}*: \`${newValue || 'N/A'}\``, { parse_mode: 'Markdown' });
    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to update product: ${err.message || 'Error'}`);
    }
}));

bot.onText(/\/deleteproduct (.+)/, restrictBotUserTo(['admin', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    const command = '/deleteproduct';
    const productId = match[1].trim();

    if (!productId) {
        return sendUsageHint(chatId, command);
    }

    try {
        await productController.deleteProductBot(productId, user._id, user.role === 'superAdmin');
        await bot.sendMessage(chatId, `✅ Product \`${productId}\` deleted successfully.`, { parse_mode: 'Markdown' });
    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to delete product: ${err.message || 'Error'}`);
    }
}));

bot.onText(/\/deletemultipleproducts (.+)/, restrictBotUserTo(['admin', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    const command = '/deletemultipleproducts';
    const productIds = match[1].split(',').map(id => id.trim());

    if (productIds.length === 0 || !productIds.every(id => id)) {
        return sendUsageHint(chatId, command);
    }

    try {
        const result = await productController.deleteMultipleProductsBot(productIds, user._id, user.role === 'superAdmin');
        await bot.sendMessage(chatId, `✅ ${result.message}`, { parse_mode: 'Markdown' });
    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to delete multiple products: ${err.message || 'Error'}`);
    }
}));


// --- Customer Management Commands ---

bot.onText(/\/newcustomer (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    const command = '/newcustomer';
    const args = match[1].split(',').map(arg => arg.trim());

    if (args.length < 3) {
        return sendUsageHint(chatId, command);
    }

    const [email, fullname, phoneNumber, phoneType = 'mobile'] = args;
    const customerData = {
        email,
        fullname,
        phoneNumbers: [{ number: phoneNumber, type: phoneType }]
    };

    try {
        const { message, customer } = await customerController.newCustomerBot(customerData, user._id);
        await bot.sendMessage(chatId, `✅ ${message} Customer ID: \`${customer._id}\`\nName: ${customer.fullname}\nEmail: ${customer.email}`, { parse_mode: 'Markdown' });
    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to create customer: ${err.message || 'Error'}`);
    }
}));

bot.onText(/\/getcustomerbyid (.+)/, restrictBotUserTo(['user', 'admin', 'staff', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    const command = '/getcustomerbyid';
    const customerId = match[1].trim();

    if (!customerId) {
        return sendUsageHint(chatId, command);
    }

    try {
        const customer = await customerController.getCustomerByIdBot(customerId, user._id, user.role === 'superAdmin');

        const details = `
📦 *Customer Details:*
ID: \`${customer._id}\`
Name: *${customer.fullname}*
Email: ${customer.email || 'N/A'}
Phone: ${customer.phoneNumbers.map(p => `${p.number} (${p.type || 'N/A'})`).join(', ') || 'N/A'}
Status: *${customer.status}*
Total Bills: $${customer.totalBillsAmount?.toFixed(2) || '0.00'}
Total Payments: $${customer.totalPaymentsAmount?.toFixed(2) || '0.00'}
Remaining Amount: $${customer.remainingAmount?.toFixed(2) || '0.00'}
        `;
        await bot.sendMessage(chatId, details, { parse_mode: 'Markdown' });

    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to get customer: ${err.message || 'Error'}`);
    }
}));

bot.onText(/\/getallcustomers/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    try {
        const customers = await customerController.getAllCustomersBot(user._id, user.role === 'superAdmin', {});

        if (!customers || customers.length === 0) {
            return bot.sendMessage(chatId, 'ℹ️ No customers found.');
        }

        const customerSummaries = customers.map(c =>
            `ID: \`${c._id}\`\nName: *${c.fullname}*\nEmail: ${c.email || 'N/A'}\nPhone: ${c.phoneNumbers.map(p => p.number).join(', ') || 'N/A'}\nStatus: ${c.status}`
        ).join('\n\n---\n\n');

        if (customerSummaries.length <= 4000) {
            await bot.sendMessage(chatId, `👥 *All Customers:*\n\n${customerSummaries}`, { parse_mode: 'Markdown' });
        } else {
            await bot.sendMessage(chatId, '⚠️ Too many customers to display directly. Consider filtering or requesting a specific customer by ID.');
        }

    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to get all customers: ${err.message || 'Error'}`);
    }
}));

bot.onText(/\/updatecustomer (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    const command = '/updatecustomer';
    const args = match[1].split(',').map(arg => arg.trim());

    if (args.length < 3) {
        return sendUsageHint(chatId, command);
    }

    const customerId = args[0];
    const field = args[1];
    const newValue = args[2];

    const updateData = {};
    if (field === 'phoneNumbers') {
        const [number, type = 'mobile'] = newValue.split(':');
        updateData.phoneNumbers = [{ number, type }];
    } else if (field === 'status' && ['active', 'inactive'].includes(newValue)) {
        updateData.status = newValue;
    } else {
        updateData[field] = newValue;
    }

    try {
        const updatedCustomer = await customerController.updateCustomerBot(customerId, updateData, user._id, user.role === 'superAdmin');
        await bot.sendMessage(chatId, `✅ Customer \`${updatedCustomer._id}\` updated. New *${field}*: \`${newValue || 'N/A'}\``, { parse_mode: 'Markdown' });
    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to update customer: ${err.message || 'Error'}`);
    }
}));

bot.onText(/\/deletecustomer (.+)/, restrictBotUserTo(['admin', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    const command = '/deletecustomer';
    const customerId = match[1].trim();

    if (!customerId) {
        return sendUsageHint(chatId, command);
    }

    try {
        await customerController.deleteCustomerBot(customerId, user._id, user.role === 'superAdmin');
        await bot.sendMessage(chatId, `✅ Customer \`${customerId}\` deleted successfully.`, { parse_mode: 'Markdown' });
    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to delete customer: ${err.message || 'Error'}`);
    }
}));

bot.onText(/\/deactivatemultiplecustomers (.+)/, restrictBotUserTo(['admin', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    const command = '/deactivatemultiplecustomers';
    const customerIds = match[1].split(',').map(id => id.trim());

    if (customerIds.length === 0 || !customerIds.every(id => id)) {
        return sendUsageHint(chatId, command);
    }

    try {
        const result = await customerController.deactivateMultipleCustomersBot(customerIds, user._id, user.role === 'superAdmin');
        await bot.sendMessage(chatId, `✅ ${result.message}`, { parse_mode: 'Markdown' });
    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to deactivate customers: ${err.message || 'Error'}`);
    }
}));


// --- Invoice Commands ---

bot.onText(/\/getinvoice (.+)/, restrictBotUserTo(['user', 'admin', 'staff', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    const command = '/getinvoice';
    const invoiceId = match[1].trim();

    if (!invoiceId) {
        return sendUsageHint(chatId, command);
    }

    try {
        const invoice = await invoiceController.getInvoiceByIdBot(invoiceId, user._id, user.role === 'superAdmin');
        if (!invoice) {
            return bot.sendMessage(chatId, 'ℹ️ No invoice found with that ID.');
        }
        await bot.sendMessage(chatId, `🧾 *Invoice Details:*\n\`\`\`json\n${JSON.stringify(invoice, null, 2)}\n\`\`\``, {
            parse_mode: 'Markdown',
        });
    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to get invoice: ${err.message || 'Error'}`);
    }
}));

bot.onText(/\/getallinvoices/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    try {
        const invoices = await invoiceController.getAllInvoicesBot(user._id, user.role === 'superAdmin');
        if (!invoices || invoices.length === 0) {
            return bot.sendMessage(chatId, 'ℹ️ No invoices found.');
        }

        const invoiceSummaries = invoices.map(inv => `ID: \`${inv._id}\`, Customer: ${inv.customerName}, Amount: ₹${inv.amount}, Status: ${inv.status}`).join('\n');
        if (invoiceSummaries.length <= 4000) {
            await bot.sendMessage(chatId, `📊 *All Invoices:*\n${invoiceSummaries}`, { parse_mode: 'Markdown' });
        } else {
            await bot.sendMessage(chatId, '⚠️ Too many invoices to display directly. Consider filtering or requesting a specific invoice.');
        }

    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to get all invoices: ${err.message || 'Error'}`);
    }
}));

bot.onText(/\/createinvoice (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    const command = '/createinvoice';
    const args = match[1].split(',');

    if (args.length !== 7) {
        return sendUsageHint(chatId, command);
    }

    const [customerId, customerName, amount, status, productName, productQuantity, productPrice] = args.map(arg => arg.trim());

    try {
        const newInv = await invoiceController.newInvoiceBot({ customerId, customerName, amount, status, productName, productQuantity, productPrice }, user._id);
        await bot.sendMessage(chatId, `✅ Invoice created successfully! ID: \`${newInv._id}\``, { parse_mode: 'Markdown' });
    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to create invoice: ${err.message || 'Error'}`);
    }
}));

bot.onText(/\/updateinvoice (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    const command = '/updateinvoice';
    const args = match[1].split(',');

    if (args.length !== 3) {
        return sendUsageHint(chatId, command);
    }

    const [invoiceId, field, newValue] = args.map(arg => arg.trim());
    const updateData = { [field]: newValue };

    try {
        const updatedInv = await invoiceController.updateInvoiceBot(invoiceId, updateData, user._id, user.role === 'superAdmin');
        await bot.sendMessage(chatId, `✅ Invoice \`${updatedInv._id}\` updated. New ${field}: \`${newValue}\``, { parse_mode: 'Markdown' });
    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to update invoice: ${err.message || 'Error'}`);
    }
}));

bot.onText(/\/deleteinvoice (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    const command = '/deleteinvoice';
    const invoiceId = match[1];

    if (!invoiceId) {
        return sendUsageHint(chatId, command);
    }

    try {
        await invoiceController.deleteInvoiceBot(invoiceId, user._id, user.role === 'superAdmin');
        await bot.sendMessage(chatId, `✅ Invoice \`${invoiceId}\` deleted successfully.`, { parse_mode: 'Markdown' });
    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to delete invoice: ${err.message || 'Error'}`);
    }
}));

bot.onText(/\/productsales (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    const command = '/productsales';
    const args = match[1].split(',');

    if (args.length !== 2) {
        return sendUsageHint(chatId, command);
    }

    const [startDate, endDate] = args.map(arg => arg.trim());

    try {
        const salesData = await invoiceController.getProductSalesBot(startDate, endDate, user._id, user.role === 'superAdmin');
        let responseText = `📈 *Product Sales Report (${startDate} to ${endDate}):*\n`;
        responseText += `Total Sales: ₹${salesData.totalSales || 0}\n`;
        responseText += `Invoices Processed: ${salesData.invoicesCount || 0}\n\n`;
        responseText += `*Product-wise Sales:*\n`;

        const productSales = salesData.productSales || {};
        const productNames = Object.keys(productSales);

        if (productNames.length === 0) {
            responseText += 'No product sales recorded in this period.\n';
        } else {
            for (const product in productSales) {
                responseText += `- ${product}: ₹${productSales[product].toFixed(2)}\n`;
            }
        }

        await bot.sendMessage(chatId, responseText, { parse_mode: 'Markdown' });
    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to get product sales: ${err.message || 'Error'}`);
    }
}));


// --- Payment Management Commands ---

bot.onText(/\/newpayment (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    const command = '/newpayment';
    const args = match[1].split(',').map(arg => arg.trim());

    if (args.length < 3) {
        return sendUsageHint(chatId, command);
    }

    const [customerId, amountStr, dateStr, description = ''] = args;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
        return bot.sendMessage(chatId, '❌ Invalid amount. Please provide a positive number.');
    }

    const paymentDate = new Date(dateStr);
    if (isNaN(paymentDate.getTime())) {
        return bot.sendMessage(chatId, '❌ Invalid date format. Please use YYYY-MM-DD.');
    }

    const paymentData = {
        customer: customerId, // This is 'customer' in the bot command, but 'customerId' in the model
        amount,
        date: paymentDate,
        description
    };

    try {
        // Pass the paymentData with 'customer' as customerId to the bot function
        const { message, payment } = await paymentController.newPaymentBot({
            customerId: paymentData.customer, // Map 'customer' from bot input to 'customerId' for model
            amount: paymentData.amount,
            date: paymentData.date,
            description: paymentData.description
        }, user._id);
        await bot.sendMessage(chatId, `✅ ${message} Payment ID: \`${payment._id}\`\nAmount: $${payment.amount.toFixed(2)}\nCustomer: ${payment.customerId}`, { parse_mode: 'Markdown' });
    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to record payment: ${err.message || 'Error'}`);
    }
}));

bot.onText(/\/getpaymentbyid (.+)/, restrictBotUserTo(['user', 'staff', 'admin', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    const command = '/getpaymentbyid';
    const paymentId = match[1].trim();

    if (!paymentId) {
        return sendUsageHint(chatId, command);
    }

    try {
        const payment = await paymentController.getPaymentByIdBot(paymentId, user._id, user.role === 'superAdmin', { path: 'customerId', select: 'fullname email' });

        const details = `
💰 *Payment Details:*
ID: \`${payment._id}\`
Amount: *$${payment.amount?.toFixed(2) || '0.00'}*
Date: ${payment.date ? payment.date.toISOString().split('T')[0] : 'N/A'}
Customer: *${payment.customerId ? payment.customerId.fullname : 'N/A'}* (\`${payment.customerId ? payment.customerId._id : 'N/A'}\`)
Description: ${payment.description || 'N/A'}
        `;
        await bot.sendMessage(chatId, details, { parse_mode: 'Markdown' });

    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to get payment: ${err.message || 'Error'}`);
    }
}));

bot.onText(/\/getallpayments/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    try {
        const payments = await paymentController.getAllPaymentsBot(user._id, user.role === 'superAdmin', {}, { path: 'customerId', select: 'fullname email' });

        if (!payments || payments.length === 0) {
            return bot.sendMessage(chatId, 'ℹ️ No payments found.');
        }

        const paymentSummaries = payments.map(p =>
            `ID: \`${p._id}\`\nAmount: *$${p.amount?.toFixed(2) || '0.00'}*\nDate: ${p.date ? p.date.toISOString().split('T')[0] : 'N/A'}\nCustomer: *${p.customerId ? p.customerId.fullname : 'N/A'}*`
        ).join('\n\n---\n\n');

        if (paymentSummaries.length <= 4000) {
            await bot.sendMessage(chatId, `💸 *All Payments:*\n\n${paymentSummaries}`, { parse_mode: 'Markdown' });
        } else {
            await bot.sendMessage(chatId, '⚠️ Too many payments to display directly. Consider filtering or requesting a specific payment by ID.');
        }

    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to get all payments: ${err.message || 'Error'}`);
    }
}));

bot.onText(/\/updatepayment (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    const command = '/updatepayment';
    const args = match[1].split(',').map(arg => arg.trim());

    if (args.length < 3) {
        return sendUsageHint(chatId, command);
    }

    const paymentId = args[0];
    const field = args[1];
    const newValue = args[2];

    const updateData = {};
    if (field === 'amount') {
        const amount = parseFloat(newValue);
        if (isNaN(amount) || amount <= 0) {
            return bot.sendMessage(chatId, '❌ Invalid amount. Please provide a positive number.');
        }
        updateData.amount = amount;
    } else if (field === 'date') {
        const paymentDate = new Date(newValue);
        if (isNaN(paymentDate.getTime())) {
            return bot.sendMessage(chatId, '❌ Invalid date format. Please use YYYY-MM-DD.');
        }
        updateData.date = paymentDate;
    } else if (field === 'customer') { // Handle updating customer ID for a payment
        if (!mongoose.Types.ObjectId.isValid(newValue)) {
            return bot.sendMessage(chatId, '❌ Invalid customer ID for update.');
        }
        updateData.customerId = newValue; // Update the actual schema field
    } else {
        updateData[field] = newValue;
    }

    try {
        const updatedPayment = await paymentController.updatePaymentBot(paymentId, updateData, user._id, user.role === 'superAdmin');
        await bot.sendMessage(chatId, `✅ Payment \`${updatedPayment._id}\` updated. New *${field}*: \`${newValue || 'N/A'}\``, { parse_mode: 'Markdown' });
    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to update payment: ${err.message || 'Error'}`);
    }
}));

bot.onText(/\/deletepayment (.+)/, restrictBotUserTo(['admin', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    const command = '/deletepayment';
    const paymentId = match[1].trim();

    if (!paymentId) {
        return sendUsageHint(chatId, command);
    }

    try {
        await paymentController.deletePaymentBot(paymentId, user._id, user.role === 'superAdmin');
        await bot.sendMessage(chatId, `✅ Payment \`${paymentId}\` deleted successfully.`, { parse_mode: 'Markdown' });
    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to delete payment: ${err.message || 'Error'}`);
    }
}));

bot.onText(/\/deletemultiplepayments (.+)/, restrictBotUserTo(['admin', 'superAdmin'], async (msg, match, user) => {
    const chatId = msg.chat.id;
    const command = '/deletemultiplepayments';
    const paymentIds = match[1].split(',').map(id => id.trim());

    if (paymentIds.length === 0 || !paymentIds.every(id => id)) {
        return sendUsageHint(chatId, command);
    }

    try {
        const result = await paymentController.deleteMultiplePaymentsBot(paymentIds, user._id, user.role === 'superAdmin');
        await bot.sendMessage(chatId, `✅ ${result.message}`, { parse_mode: 'Markdown' });
    } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to delete multiple payments: ${err.message || 'Error'}`);
    }
}));

console.log('Telegram Bot is running...');
// // In: C:\Shivam Electronics Project\shivamElectronicsbackend\telegrambot\telegrambot.js

// const TelegramBot = require('node-telegram-bot-api');
// const { v4: uuidv4 } = require('uuid');

// // Import your controllers (paths are relative to telegrambot.js)
// const authController = require('../Controllers/authController');
// const customerController = require('../Controllers/customerController');
// const invoiceController = require('../Controllers/invoiceController');
// const paymentController = require('../Controllers/paymentController');
// const productController = require('../Controllers/productController'); // NEW: Import productController

// // Retrieve your Telegram Bot Token from environment variables
// const token = process.env.TELEGRAM_TOKEN;
// if (!token) {
//     console.error('TELEGRAM_TOKEN environment variable is not set. Please set it to your bot token.');
//     process.exit(1);
// }

// const bot = new TelegramBot(token, { polling: true });

// // In-memory stores for user tokens and roles.
// const userTokens = {};
// const userRoles = {};

// // --- Centralized Command Definitions ---
// const commandDefinitions = [
//     // General Commands
//     {
//         command: '/start',
//         description: 'Get a welcome message and basic info.',
//         usage: '/start',
//         category: 'General',
//         roles: ['user', 'staff', 'admin', 'superAdmin', 'guest']
//     },
//     {
//         command: '/help',
//         description: 'Show this help message with all commands.',
//         usage: '/help',
//         category: 'General',
//         roles: ['user', 'staff', 'admin', 'superAdmin', 'guest']
//     },
//     {
//         command: '/register',
//         description: 'Create a new user account.',
//         usage: '/register <name> <email> <password>',
//         category: 'Authentication',
//         roles: ['guest']
//     },
//     {
//         command: '/login',
//         description: 'Log in to your account to access features.',
//         usage: '/login <email> <password>',
//         category: 'Authentication',
//         roles: ['guest']
//     },
//     {
//         command: '/logout',
//         description: 'Log out of your current session.',
//         usage: '/logout',
//         category: 'Authentication',
//         roles: ['user', 'staff', 'admin', 'superAdmin']
//     },
//     // Product Management (NEW CATEGORY)
//     {
//         command: '/newproduct',
//         description: 'Add a new product to your inventory.',
//         usage: '/newproduct <title>,<sku>,<price>,<stock>[,<category>,<description>]',
//         example: '`/newproduct Laptop,LAP001,1200.00,50,Electronics,Powerful laptop`',
//         category: 'Product Management',
//         roles: ['admin', 'staff', 'superAdmin']
//     },
//     {
//         command: '/getproductbyid',
//         description: 'Get details of a specific product by ID.',
//         usage: '/getproductbyid <product_id>',
//         example: '`/getproductbyid 60c72b2f9b1e8b0015f8e0a3`',
//         category: 'Product Management',
//         roles: ['user', 'staff', 'admin', 'superAdmin']
//     },
//     {
//         command: '/getallproducts',
//         description: 'List all products in your inventory.',
//         usage: '/getallproducts',
//         category: 'Product Management',
//         roles: ['user', 'staff', 'admin', 'superAdmin']
//     },
//     {
//         command: '/updateproduct',
//         description: 'Update a specific field for a product.',
//         usage: '/updateproduct <product_id>,<field>,<newValue>',
//         example: '`/updateproduct 60c...,price,1150.00`',
//         category: 'Product Management',
//         roles: ['admin', 'staff', 'superAdmin']
//     },
//     {
//         command: '/deleteproduct',
//         description: 'Permanently delete a product record.',
//         usage: '/deleteproduct <product_id>',
//         category: 'Product Management',
//         roles: ['admin', 'superAdmin']
//     },
//     {
//         command: '/deletemultipleproducts',
//         description: 'Delete multiple product records.',
//         usage: '/deletemultipleproducts <id1>,<id2>[,<id3>,...]',
//         example: '`/deletemultipleproducts 60c...,60d...`',
//         category: 'Product Management',
//         roles: ['admin', 'superAdmin']
//     },
//     // Customer Management
//     {
//         command: '/newcustomer',
//         description: 'Create a new customer record.',
//         usage: '/newcustomer <email>,<fullname>,<phoneNumber>[,<phoneType>]',
//         example: '`/newcustomer test@example.com,John Doe,1234567890,mobile`',
//         category: 'Customer Management',
//         roles: ['admin', 'staff', 'superAdmin']
//     },
//     {
//         command: '/getcustomerbyid',
//         description: 'Get detailed information for a specific customer by ID.',
//         usage: '/getcustomerbyid <customer_id>',
//         example: '`/getcustomerbyid 60c72b2f9b1e8b0015f8e0a1`',
//         category: 'Customer Management',
//         roles: ['user', 'staff', 'admin', 'superAdmin']
//     },
//     {
//         command: '/getallcustomers',
//         description: 'List all customer records.',
//         usage: '/getallcustomers',
//         category: 'Customer Management',
//         roles: ['admin', 'staff', 'superAdmin']
//     },
//     {
//         command: '/updatecustomer',
//         description: 'Update a specific field for a customer.',
//         usage: '/updatecustomer <customer_id>,<field>,<newValue>',
//         example: '`/updatecustomer 60c...,fullname,Jane Doe`\nFor phone: `/updatecustomer 123,phoneNumbers,9876543210:home` (overwrites existing phones)',
//         category: 'Customer Management',
//         roles: ['admin', 'staff', 'superAdmin']
//     },
//     {
//         command: '/deletecustomer',
//         description: 'Permanently delete a customer record.',
//         usage: '/deletecustomer <customer_id>',
//         category: 'Customer Management',
//         roles: ['admin', 'superAdmin']
//     },
//     {
//         command: '/deactivatemultiplecustomers',
//         description: 'Change the status of multiple customers to inactive.',
//         usage: '/deactivatemultiplecustomers <id1>,<id2>[,<id3>,...]',
//         example: '`/deactivatemultiplecustomers 60c...,60d...`',
//         category: 'Customer Management',
//         roles: ['admin', 'superAdmin']
//     },
//     // Invoice Management
//     {
//         command: '/getinvoice',
//         description: 'Get details of a specific invoice by ID.',
//         usage: '/getinvoice <invoice_id>',
//         category: 'Invoice Management',
//         roles: ['user', 'staff', 'admin', 'superAdmin']
//     },
//     {
//         command: '/getallinvoices',
//         description: 'List all invoice records.',
//         usage: '/getallinvoices',
//         category: 'Invoice Management',
//         roles: ['admin', 'staff', 'superAdmin']
//     },
//     {
//         command: '/createinvoice',
//         description: 'Create a new invoice record.',
//         usage: '/createinvoice <customerId>,<customerName>,<amount>,<status>,<productName>,<productQuantity>,<productPrice>',
//         example: '`/createinvoice 60c...,John,100,pending,Laptop,1,100`',
//         category: 'Invoice Management',
//         roles: ['admin', 'staff', 'superAdmin']
//     },
//     {
//         command: '/updateinvoice',
//         description: 'Update a specific field for an invoice.',
//         usage: '/updateinvoice <invoice_id>,<field>,<newValue>',
//         example: '`/updateinvoice 60c...,status,paid`',
//         category: 'Invoice Management',
//         roles: ['admin', 'staff', 'superAdmin']
//     },
//     {
//         command: '/deleteinvoice',
//         description: 'Permanently delete an invoice record.',
//         usage: '/deleteinvoice <invoice_id>',
//         category: 'Invoice Management',
//         roles: ['admin', 'staff', 'superAdmin']
//     },
//     {
//         command: '/productsales',
//         description: 'Get product sales report for a date range.',
//         usage: '/productsales <startDate>,<endDate>',
//         example: '`/productsales 2024-01-01,2024-12-31`',
//         category: 'Invoice Management',
//         roles: ['admin', 'staff', 'superAdmin']
//     },
//     // Payment Management
//     {
//         command: '/newpayment',
//         description: 'Record a new payment.',
//         usage: '/newpayment <customer_id>,<amount>,<date>[,<description>]',
//         example: '`/newpayment 60c...,150.75,2025-07-15,Initial payment`',
//         category: 'Payment Management',
//         roles: ['admin', 'staff', 'superAdmin']
//     },
//     {
//         command: '/getpaymentbyid',
//         description: 'Get detailed information for a specific payment by ID.',
//         usage: '/getpaymentbyid <payment_id>',
//         example: '`/getpaymentbyid 60c72b2f9b1e8b0015f8e0a2`',
//         category: 'Payment Management',
//         roles: ['user', 'staff', 'admin', 'superAdmin']
//     },
//     {
//         command: '/getallpayments',
//         description: 'List all payment records.',
//         usage: '/getallpayments',
//         category: 'Payment Management',
//         roles: ['admin', 'staff', 'superAdmin']
//     },
//     {
//         command: '/updatepayment',
//         description: 'Update a specific field for a payment.',
//         usage: '/updatepayment <payment_id>,<field>,<newValue>',
//         example: '`/updatepayment 60c...,amount,200.00`',
//         category: 'Payment Management',
//         roles: ['admin', 'staff', 'superAdmin']
//     },
//     {
//         command: '/deletepayment',
//         description: 'Permanently delete a payment record.',
//         usage: '/deletepayment <payment_id>',
//         category: 'Payment Management',
//         roles: ['admin', 'superAdmin']
//     },
//     {
//         command: '/deletemultiplepayments',
//         description: 'Delete multiple payment records.',
//         usage: '/deletemultiplepayments <id1>,<id2>[,<id3>,...]',
//         example: '`/deletemultiplepayments 60c...,60d...`',
//         category: 'Payment Management',
//         roles: ['admin', 'superAdmin']
//     },
// ];

// // Create a map for quick lookup of command details
// const commandDetailsMap = new Map(commandDefinitions.map(cmd => [cmd.command, cmd]));

// // --- Helper Functions ---

// /**
//  * Authenticates a Telegram user based on their stored JWT token.
//  * @param {number} chatId The chat ID of the Telegram user.
//  * @returns {object|null} The decoded user object if authenticated, otherwise null.
//  */
// const authenticateBotUser = async (chatId) => {
//     const token = userTokens[chatId];
//     if (!token) {
//         await bot.sendMessage(chatId, '⚠️ You must log in first. Use `/login email password`.');
//         return null;
//     }
//     try {
//         const decodedUser = await authController.verifyTokenAndGetUserBot(`Bearer ${token}`);
//         userRoles[chatId] = decodedUser.role;
//         return decodedUser;
//     } catch (error) {
//         delete userTokens[chatId];
//         delete userRoles[chatId];
//         await bot.sendMessage(chatId, `❌ Authentication failed: ${error.message}. Please log in again.`);
//         return null;
//     }
// };

// /**
//  * Higher-order function to restrict command access based on user roles.
//  * It returns the actual handler function that bot.onText expects.
//  * @param {string[]} allowedRoles An array of roles that are allowed to use the command.
//  * @param {Function} commandHandler The actual async function that handles the command logic.
//  * @returns {Function} An async function (msg, match) that will be passed to bot.onText.
//  */
// const restrictBotUserTo = (allowedRoles, commandHandler) => async (msg, match) => {
//     const chatId = msg.chat.id;
//     const command = msg.text.split(' ')[0];

//     if (allowedRoles.includes('guest')) {
//         if (!userTokens[chatId]) {
//             return commandHandler(msg, match, null);
//         }
//     }

//     const user = await authenticateBotUser(chatId);
//     if (!user) {
//         return;
//     }

//     const userRole = userRoles[chatId];

//     if (userRole === 'superAdmin') {
//         return commandHandler(msg, match, user);
//     }

//     if (!allowedRoles.includes(userRole)) {
//         const cmdInfo = commandDetailsMap.get(command);
//         let accessDeniedMessage = `🚫 Access Denied: You do not have the required role to perform this action. Your role: *${userRole}*.`;
//         if (cmdInfo && cmdInfo.roles) {
//             accessDeniedMessage += `\nAllowed roles for *${command}*: *${cmdInfo.roles.filter(r => r !== 'guest').join(', ')}*.`;
//         }
//         return bot.sendMessage(chatId, accessDeniedMessage, { parse_mode: 'Markdown' });
//     }

//     commandHandler(msg, match, user);
// };

// /**
//  * Sends a usage hint for a command if arguments are missing or invalid.
//  * @param {number} chatId The chat ID.
//  * @param {string} command The command string (e.g., '/newcustomer').
//  */
// const sendUsageHint = async (chatId, command) => {
//     const cmdInfo = commandDetailsMap.get(command);
//     if (cmdInfo) {
//         let hint = `Incorrect usage for *${command}*.\n`;
//         hint += `*Usage:* \`${cmdInfo.usage}\`\n`;
//         if (cmdInfo.example) {
//             hint += `*Example:* ${cmdInfo.example}\n`;
//         }
//         hint += `Please provide all required arguments correctly.`;
//         await bot.sendMessage(chatId, hint, { parse_mode: 'Markdown' });
//     } else {
//         await bot.sendMessage(chatId, `Unknown command: *${command}*. Use \`/help\` for a list of commands.`, { parse_mode: 'Markdown' });
//     }
// };


// // --- General Commands ---

// bot.onText(/\/start/, restrictBotUserTo(['guest', 'user', 'staff', 'admin', 'superAdmin'], async (msg) => {
//     const chatId = msg.chat.id;
//     const welcomeMessage = `
// 👋 Welcome! I am your business management bot.

// Here are some general commands:
// • \`/register <name> <email> <password>\`: Create a new account.
// • \`/login <email> <password>\`: Log in to your account.
// • \`/logout\`: Log out of your current session.
// • \`/help\`: Show all available commands and their usage.

// Once logged in, you can manage customers, invoices, and payments.
//     `;
//     bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
// }));

// bot.onText(/\/help/, restrictBotUserTo(['guest', 'user', 'staff', 'admin', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     const userRole = user ? user.role : 'guest';

//     let helpMessage = `📚 *Available Commands (Your Role: ${userRole}):*\n\n`;

//     const categories = [...new Set(commandDefinitions.map(cmd => cmd.category))];

//     for (const category of categories) {
//         helpMessage += `*--- ${category} ---*\n`;
//         const categoryCommands = commandDefinitions.filter(cmd => cmd.category === category);

//         for (const cmd of categoryCommands) {
//             const isAllowed = cmd.roles.includes(userRole) || userRole === 'superAdmin' || cmd.roles.includes('guest');

//             if (isAllowed) {
//                 helpMessage += `• *${cmd.command}*: ${cmd.description}\n`;
//                 helpMessage += `  _Usage:_ \`${cmd.usage}\`\n`;
//                 if (cmd.example) {
//                     helpMessage += `  _Example:_ ${cmd.example}\n`;
//                 }
//             }
//         }
//         helpMessage += '\n';
//     }

//     const messages = [];
//     let currentMessage = '';
//     const lines = helpMessage.split('\n');

//     for (const line of lines) {
//         if ((currentMessage + line + '\n').length > 4000) {
//             messages.push(currentMessage);
//             currentMessage = line + '\n';
//         } else {
//             currentMessage += line + '\n';
//         }
//     }
//     if (currentMessage.length > 0) {
//         messages.push(currentMessage);
//     }

//     for (const part of messages) {
//         await bot.sendMessage(chatId, part, { parse_mode: 'Markdown' });
//     }
// }));


// // --- User Authentication Commands ---

// bot.onText(/\/register (.+)/, restrictBotUserTo(['guest'], async (msg, match) => {
//     const chatId = msg.chat.id;
//     const command = '/register';
//     const args = match[1].split(' ');

//     if (args.length < 3) {
//         return sendUsageHint(chatId, command);
//     }

//     const [name, email, password] = args;
//     const passwordConfirm = password;

//     try {
//         const { token, user } = await authController.signupBot(name, email, password, passwordConfirm, 'user');
//         userTokens[chatId] = token;
//         userRoles[chatId] = user.role;
//         bot.sendMessage(chatId, `✅ Registered and logged in as a *${user.role}*!`, { parse_mode: 'Markdown' });
//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Error: ${err.message || 'Failed to register'}`);
//     }
// }));

// bot.onText(/\/login (.+)/, restrictBotUserTo(['guest'], async (msg, match) => {
//     const chatId = msg.chat.id;
//     const command = '/login';
//     const args = match[1].split(' ');

//     if (args.length < 2) {
//         return sendUsageHint(chatId, command);
//     }

//     const [email, password] = args;

//     try {
//         const { user, token } = await authController.loginBot(email, password);
//         userTokens[chatId] = token;
//         userRoles[chatId] = user.role;
//         bot.sendMessage(chatId, `🔐 Login successful! You're now authenticated as *${user.role}*.`, { parse_mode: 'Markdown' });
//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Login failed: ${err.message || 'Error'}`);
//     }
// }));

// bot.onText(/\/logout/, restrictBotUserTo(['user', 'staff', 'admin', 'superAdmin'], (msg) => {
//     const chatId = msg.chat.id;
//     delete userTokens[chatId];
//     delete userRoles[chatId];
//     bot.sendMessage(chatId, '✅ You have been logged out.');
// }));


// // --- Product Management Commands (NEW) ---

// bot.onText(/\/newproduct (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     const command = '/newproduct';
//     const args = match[1].split(',').map(arg => arg.trim());

//     if (args.length < 4) { // title, sku, price, stock are mandatory
//         return sendUsageHint(chatId, command);
//     }

//     const [title, sku, priceStr, stockStr, category = 'Uncategorized', description = ''] = args;
//     const price = parseFloat(priceStr);
//     const stock = parseInt(stockStr, 10);

//     if (isNaN(price) || price <= 0 || isNaN(stock) || stock < 0) {
//         return bot.sendMessage(chatId, '❌ Invalid price or stock. Price must be a positive number, stock must be a non-negative integer.');
//     }

//     const productData = {
//         title,
//         sku,
//         price,
//         stock,
//         category,
//         description
//     };

//     try {
//         const { message, product } = await productController.newProductBot(productData, user._id);
//         await bot.sendMessage(chatId, `✅ ${message} Product ID: \`${product._id}\`\nTitle: ${product.title}\nSKU: ${product.sku}`, { parse_mode: 'Markdown' });
//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Failed to create product: ${err.message || 'Error'}`);
//     }
// }));

// bot.onText(/\/getproductbyid (.+)/, restrictBotUserTo(['user', 'staff', 'admin', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     const command = '/getproductbyid';
//     const productId = match[1].trim();

//     if (!productId) {
//         return sendUsageHint(chatId, command);
//     }

//     try {
//         const product = await productController.getProductByIdBot(productId, user._id, user.role === 'superAdmin');
//         const details = `
// 📦 *Product Details:*
// ID: \`${product._id}\`
// Title: *${product.title}*
// SKU: \`${product.sku}\`
// Price: $${product.price?.toFixed(2) || '0.00'}
// Stock: ${product.stock || '0'}
// Category: ${product.category || 'N/A'}
// Description: ${product.description || 'N/A'}
//         `;
//         await bot.sendMessage(chatId, details, { parse_mode: 'Markdown' });

//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Failed to get product: ${err.message || 'Error'}`);
//     }
// }));

// bot.onText(/\/getallproducts/, restrictBotUserTo(['user', 'staff', 'admin', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     try {
//         const products = await productController.getAllProductsBot(user._id, user.role === 'superAdmin', {});

//         if (!products || products.length === 0) {
//             return bot.sendMessage(chatId, 'ℹ️ No products found.');
//         }

//         const productSummaries = products.map(p =>
//             `ID: \`${p._id}\`\nTitle: *${p.title}*\nSKU: \`${p.sku}\`\nPrice: $${p.price?.toFixed(2) || '0.00'}\nStock: ${p.stock || '0'}`
//         ).join('\n\n---\n\n');

//         if (productSummaries.length <= 4000) {
//             await bot.sendMessage(chatId, `📦 *All Products:*\n\n${productSummaries}`, { parse_mode: 'Markdown' });
//         } else {
//             await bot.sendMessage(chatId, '⚠️ Too many products to display directly. Consider filtering or requesting a specific product by ID.');
//         }

//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Failed to get all products: ${err.message || 'Error'}`);
//     }
// }));

// bot.onText(/\/updateproduct (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     const command = '/updateproduct';
//     const args = match[1].split(',').map(arg => arg.trim());

//     if (args.length < 3) {
//         return sendUsageHint(chatId, command);
//     }

//     const productId = args[0];
//     const field = args[1];
//     const newValue = args[2];

//     const updateData = {};
//     if (field === 'price') {
//         const price = parseFloat(newValue);
//         if (isNaN(price) || price <= 0) {
//             return bot.sendMessage(chatId, '❌ Invalid price. Please provide a positive number.');
//         }
//         updateData.price = price;
//     } else if (field === 'stock') {
//         const stock = parseInt(newValue, 10);
//         if (isNaN(stock) || stock < 0) {
//             return bot.sendMessage(chatId, '❌ Invalid stock. Please provide a non-negative integer.');
//         }
//         updateData.stock = stock;
//     } else {
//         updateData[field] = newValue;
//     }

//     try {
//         const updatedProduct = await productController.updateProductBot(productId, updateData, user._id, user.role === 'superAdmin');
//         await bot.sendMessage(chatId, `✅ Product \`${updatedProduct._id}\` updated. New *${field}*: \`${newValue || 'N/A'}\``, { parse_mode: 'Markdown' });
//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Failed to update product: ${err.message || 'Error'}`);
//     }
// }));

// bot.onText(/\/deleteproduct (.+)/, restrictBotUserTo(['admin', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     const command = '/deleteproduct';
//     const productId = match[1].trim();

//     if (!productId) {
//         return sendUsageHint(chatId, command);
//     }

//     try {
//         await productController.deleteProductBot(productId, user._id, user.role === 'superAdmin');
//         await bot.sendMessage(chatId, `✅ Product \`${productId}\` deleted successfully.`, { parse_mode: 'Markdown' });
//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Failed to delete product: ${err.message || 'Error'}`);
//     }
// }));

// bot.onText(/\/deletemultipleproducts (.+)/, restrictBotUserTo(['admin', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     const command = '/deletemultipleproducts';
//     const productIds = match[1].split(',').map(id => id.trim());

//     if (productIds.length === 0 || !productIds.every(id => id)) {
//         return sendUsageHint(chatId, command);
//     }

//     try {
//         const result = await productController.deleteMultipleProductsBot(productIds, user._id, user.role === 'superAdmin');
//         await bot.sendMessage(chatId, `✅ ${result.message}`, { parse_mode: 'Markdown' });
//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Failed to delete multiple products: ${err.message || 'Error'}`);
//     }
// }));


// // --- Customer Management Commands ---

// bot.onText(/\/newcustomer (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     const command = '/newcustomer';
//     const args = match[1].split(',').map(arg => arg.trim());

//     if (args.length < 3) {
//         return sendUsageHint(chatId, command);
//     }

//     const [email, fullname, phoneNumber, phoneType = 'mobile'] = args;
//     const customerData = {
//         email,
//         fullname,
//         phoneNumbers: [{ number: phoneNumber, type: phoneType }]
//     };

//     try {
//         const { message, customer } = await customerController.newCustomerBot(customerData, user._id);
//         await bot.sendMessage(chatId, `✅ ${message} Customer ID: \`${customer._id}\`\nName: ${customer.fullname}\nEmail: ${customer.email}`, { parse_mode: 'Markdown' });
//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Failed to create customer: ${err.message || 'Error'}`);
//     }
// }));

// bot.onText(/\/getcustomerbyid (.+)/, restrictBotUserTo(['user', 'admin', 'staff', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     const command = '/getcustomerbyid';
//     const customerId = match[1].trim();

//     if (!customerId) {
//         return sendUsageHint(chatId, command);
//     }

//     try {
//         const customer = await customerController.getCustomerByIdBot(customerId, user._id, user.role === 'superAdmin');

//         const details = `
// 📦 *Customer Details:*
// ID: \`${customer._id}\`
// Name: *${customer.fullname}*
// Email: ${customer.email || 'N/A'}
// Phone: ${customer.phoneNumbers.map(p => `${p.number} (${p.type || 'N/A'})`).join(', ') || 'N/A'}
// Status: *${customer.status}*
// Total Bills: $${customer.totalBillsAmount?.toFixed(2) || '0.00'}
// Total Payments: $${customer.totalPaymentsAmount?.toFixed(2) || '0.00'}
// Remaining Amount: $${customer.remainingAmount?.toFixed(2) || '0.00'}
//         `;
//         await bot.sendMessage(chatId, details, { parse_mode: 'Markdown' });

//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Failed to get customer: ${err.message || 'Error'}`);
//     }
// }));

// bot.onText(/\/getallcustomers/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     try {
//         const customers = await customerController.getAllCustomersBot(user._id, user.role === 'superAdmin', {});

//         if (!customers || customers.length === 0) {
//             return bot.sendMessage(chatId, 'ℹ️ No customers found.');
//         }

//         const customerSummaries = customers.map(c =>
//             `ID: \`${c._id}\`\nName: *${c.fullname}*\nEmail: ${c.email || 'N/A'}\nPhone: ${c.phoneNumbers.map(p => p.number).join(', ') || 'N/A'}\nStatus: ${c.status}`
//         ).join('\n\n---\n\n');

//         if (customerSummaries.length <= 4000) {
//             await bot.sendMessage(chatId, `👥 *All Customers:*\n\n${customerSummaries}`, { parse_mode: 'Markdown' });
//         } else {
//             await bot.sendMessage(chatId, '⚠️ Too many customers to display directly. Consider filtering or requesting a specific customer by ID.');
//         }

//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Failed to get all customers: ${err.message || 'Error'}`);
//     }
// }));

// bot.onText(/\/updatecustomer (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     const command = '/updatecustomer';
//     const args = match[1].split(',').map(arg => arg.trim());

//     if (args.length < 3) {
//         return sendUsageHint(chatId, command);
//     }

//     const customerId = args[0];
//     const field = args[1];
//     const newValue = args[2];

//     const updateData = {};
//     if (field === 'phoneNumbers') {
//         const [number, type = 'mobile'] = newValue.split(':');
//         updateData.phoneNumbers = [{ number, type }];
//     } else if (field === 'status' && ['active', 'inactive'].includes(newValue)) {
//         updateData.status = newValue;
//     } else {
//         updateData[field] = newValue;
//     }

//     try {
//         const updatedCustomer = await customerController.updateCustomerBot(customerId, updateData, user._id, user.role === 'superAdmin');
//         await bot.sendMessage(chatId, `✅ Customer \`${updatedCustomer._id}\` updated. New *${field}*: \`${newValue || 'N/A'}\``, { parse_mode: 'Markdown' });
//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Failed to update customer: ${err.message || 'Error'}`);
//     }
// }));

// bot.onText(/\/deletecustomer (.+)/, restrictBotUserTo(['admin', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     const command = '/deletecustomer';
//     const customerId = match[1].trim();

//     if (!customerId) {
//         return sendUsageHint(chatId, command);
//     }

//     try {
//         await customerController.deleteCustomerBot(customerId, user._id, user.role === 'superAdmin');
//         await bot.sendMessage(chatId, `✅ Customer \`${customerId}\` deleted successfully.`, { parse_mode: 'Markdown' });
//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Failed to delete customer: ${err.message || 'Error'}`);
//     }
// }));

// bot.onText(/\/deactivatemultiplecustomers (.+)/, restrictBotUserTo(['admin', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     const command = '/deactivatemultiplecustomers';
//     const customerIds = match[1].split(',').map(id => id.trim());

//     if (customerIds.length === 0 || !customerIds.every(id => id)) {
//         return sendUsageHint(chatId, command);
//     }

//     try {
//         const result = await customerController.deactivateMultipleCustomersBot(customerIds, user._id, user.role === 'superAdmin');
//         await bot.sendMessage(chatId, `✅ ${result.message}`, { parse_mode: 'Markdown' });
//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Failed to deactivate customers: ${err.message || 'Error'}`);
//     }
// }));


// // --- Invoice Commands ---

// bot.onText(/\/getinvoice (.+)/, restrictBotUserTo(['user', 'admin', 'staff', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     const command = '/getinvoice';
//     const invoiceId = match[1].trim();

//     if (!invoiceId) {
//         return sendUsageHint(chatId, command);
//     }

//     try {
//         const invoice = await invoiceController.getInvoiceByIdBot(invoiceId, user._id, user.role === 'superAdmin');
//         if (!invoice) {
//             return bot.sendMessage(chatId, 'ℹ️ No invoice found with that ID.');
//         }
//         await bot.sendMessage(chatId, `🧾 *Invoice Details:*\n\`\`\`json\n${JSON.stringify(invoice, null, 2)}\n\`\`\``, {
//             parse_mode: 'Markdown',
//         });
//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Failed to get invoice: ${err.message || 'Error'}`);
//     }
// }));

// bot.onText(/\/getallinvoices/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     try {
//         const invoices = await invoiceController.getAllInvoicesBot(user._id, user.role === 'superAdmin');
//         if (!invoices || invoices.length === 0) {
//             return bot.sendMessage(chatId, 'ℹ️ No invoices found.');
//         }

//         const invoiceSummaries = invoices.map(inv => `ID: \`${inv._id}\`, Customer: ${inv.customerName}, Amount: ₹${inv.amount}, Status: ${inv.status}`).join('\n');
//         if (invoiceSummaries.length <= 4000) {
//             await bot.sendMessage(chatId, `📊 *All Invoices:*\n${invoiceSummaries}`, { parse_mode: 'Markdown' });
//         } else {
//             await bot.sendMessage(chatId, '⚠️ Too many invoices to display directly. Consider filtering or requesting a specific invoice.');
//         }

//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Failed to get all invoices: ${err.message || 'Error'}`);
//     }
// }));

// bot.onText(/\/createinvoice (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     const command = '/createinvoice';
//     const args = match[1].split(',');

//     if (args.length !== 7) {
//         return sendUsageHint(chatId, command);
//     }

//     const [customerId, customerName, amount, status, productName, productQuantity, productPrice] = args.map(arg => arg.trim());

//     try {
//         const newInv = await invoiceController.newInvoiceBot({ customerId, customerName, amount, status, productName, productQuantity, productPrice }, user._id);
//         await bot.sendMessage(chatId, `✅ Invoice created successfully! ID: \`${newInv._id}\``, { parse_mode: 'Markdown' });
//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Failed to create invoice: ${err.message || 'Error'}`);
//     }
// }));

// bot.onText(/\/updateinvoice (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     const command = '/updateinvoice';
//     const args = match[1].split(',');

//     if (args.length !== 3) {
//         return sendUsageHint(chatId, command);
//     }

//     const [invoiceId, field, newValue] = args.map(arg => arg.trim());
//     const updateData = { [field]: newValue };

//     try {
//         const updatedInv = await invoiceController.updateInvoiceBot(invoiceId, updateData, user._id, user.role === 'superAdmin');
//         await bot.sendMessage(chatId, `✅ Invoice \`${updatedInv._id}\` updated. New ${field}: \`${newValue}\``, { parse_mode: 'Markdown' });
//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Failed to update invoice: ${err.message || 'Error'}`);
//     }
// }));

// bot.onText(/\/deleteinvoice (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     const command = '/deleteinvoice';
//     const invoiceId = match[1];

//     if (!invoiceId) {
//         return sendUsageHint(chatId, command);
//     }

//     try {
//         await invoiceController.deleteInvoiceBot(invoiceId, user._id, user.role === 'superAdmin');
//         await bot.sendMessage(chatId, `✅ Invoice \`${invoiceId}\` deleted successfully.`, { parse_mode: 'Markdown' });
//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Failed to delete invoice: ${err.message || 'Error'}`);
//     }
// }));

// bot.onText(/\/productsales (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     const command = '/productsales';
//     const args = match[1].split(',');

//     if (args.length !== 2) {
//         return sendUsageHint(chatId, command);
//     }

//     const [startDate, endDate] = args.map(arg => arg.trim());

//     try {
//         const salesData = await invoiceController.getProductSalesBot(startDate, endDate, user._id, user.role === 'superAdmin');
//         let responseText = `📈 *Product Sales Report (${startDate} to ${endDate}):*\n`;
//         responseText += `Total Sales: ₹${salesData.totalSales || 0}\n`;
//         responseText += `Invoices Processed: ${salesData.invoicesCount || 0}\n\n`;
//         responseText += `*Product-wise Sales:*\n`;

//         const productSales = salesData.productSales || {};
//         const productNames = Object.keys(productSales);

//         if (productNames.length === 0) {
//             responseText += 'No product sales recorded in this period.\n';
//         } else {
//             for (const product in productSales) {
//                 responseText += `- ${product}: ₹${productSales[product].toFixed(2)}\n`;
//             }
//         }

//         await bot.sendMessage(chatId, responseText, { parse_mode: 'Markdown' });
//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Failed to get product sales: ${err.message || 'Error'}`);
//     }
// }));


// // --- Payment Management Commands ---

// bot.onText(/\/newpayment (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     const command = '/newpayment';
//     const args = match[1].split(',').map(arg => arg.trim());

//     if (args.length < 3) {
//         return sendUsageHint(chatId, command);
//     }

//     const [customerId, amountStr, dateStr, description = ''] = args;

//     const amount = parseFloat(amountStr);
//     if (isNaN(amount) || amount <= 0) {
//         return bot.sendMessage(chatId, '❌ Invalid amount. Please provide a positive number.');
//     }

//     const paymentDate = new Date(dateStr);
//     if (isNaN(paymentDate.getTime())) {
//         return bot.sendMessage(chatId, '❌ Invalid date format. Please use YYYY-MM-DD.');
//     }

//     const paymentData = {
//         customer: customerId,
//         amount,
//         date: paymentDate,
//         description
//     };

//     try {
//         const { message, payment } = await paymentController.newPaymentBot(paymentData, user._id);
//         await bot.sendMessage(chatId, `✅ ${message} Payment ID: \`${payment._id}\`\nAmount: $${payment.amount.toFixed(2)}\nCustomer: ${payment.customer}`, { parse_mode: 'Markdown' });
//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Failed to record payment: ${err.message || 'Error'}`);
//     }
// }));

// // bot.onText(/\/getpaymentbyid (.+)/, restrictBotUserTo(['user', 'staff', 'admin', 'superAdmin'], async (msg, match, user) => {
// //     const chatId = msg.chat.id;
// //     const command = '/getpaymentbyid';
// //     const paymentId = match[1].trim();

// //     if (!paymentId) {
// //         return sendUsageHint(chatId, command);
// //     }

// //     try {
// //         const payment = await paymentController.getPaymentByIdBot(paymentId, user._id, user.role === 'superAdmin', { path: 'customer', select: 'fullname email' });

// //         const details = `
// // 💰 *Payment Details:*
// // ID: \`${payment._id}\`
// // Amount: *$${payment.amount.toFixed(2)}*
// // Date: ${payment.date.toISOString().split('T')[0]}
// // Customer: *${payment.customer ? payment.customer.fullname : 'N/A'}* (\`${payment.customer ? payment.customer._id : 'N/A'}\`)
// // Description: ${payment.description || 'N/A'}
// //         `;
// //         await bot.sendMessage(chatId, details, { parse_mode: 'Markdown' });

// //     } catch (err) {
// //         bot.sendMessage(chatId, `❌ Failed to get payment: ${err.message || 'Error'}`);
// //     }
// // }));

// bot.onText(/\/getpaymentbyid (.+)/, restrictBotUserTo(['user', 'staff', 'admin', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     const command = '/getpaymentbyid';
//     const paymentId = match[1].trim();

//     if (!paymentId) {
//         return sendUsageHint(chatId, command);
//     }

//     try {
//         // --- CORRECTED POPULATE PATH: 'customerId' instead of 'customer' ---
//         const payment = await paymentController.getPaymentByIdBot(paymentId, user._id, user.role === 'superAdmin', { path: 'customerId', select: 'fullname email' });

//         const details = `
// 💰 *Payment Details:*
// ID: \`${payment._id}\`
// Amount: *$${payment.amount.toFixed(2)}*
// Date: ${payment.date.toISOString().split('T')[0]}
// Customer: *${payment.customerId ? payment.customerId.fullname : 'N/A'}* (\`${payment.customerId ? payment.customerId._id : 'N/A'}\`)
// Description: ${payment.description || 'N/A'}
//         `;
//         await bot.sendMessage(chatId, details, { parse_mode: 'Markdown' });

//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Failed to get payment: ${err.message || 'Error'}`);
//     }
// }));


// bot.onText(/\/getallpayments/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     try {
//         const payments = await paymentController.getAllPaymentsBot(user._id, user.role === 'superAdmin', {}, { path: 'customerId', select: 'fullname email' });

//         if (!payments || payments.length === 0) {
//             return bot.sendMessage(chatId, 'ℹ️ No payments found.');
//         }

//         const paymentSummaries = payments.map(p =>
//             `ID: \`${p._id}\`\nAmount: *$${p.amount?.toFixed(2) || '0.00'}*\nDate: ${p.date ? p.date.toISOString().split('T')[0] : 'N/A'}\nCustomer: *${p.customerId ? p.customerId.fullname : 'N/A'}*`
//         ).join('\n\n---\n\n');

//         if (paymentSummaries.length <= 4000) {
//             await bot.sendMessage(chatId, `💸 *All Payments:*\n\n${paymentSummaries}`, { parse_mode: 'Markdown' });
//         } else {
//             await bot.sendMessage(chatId, '⚠️ Too many payments to display directly. Consider filtering or requesting a specific payment by ID.');
//         }

//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Failed to get all payments: ${err.message || 'Error'}`);
//     }
// }));
// // bot.onText(/\/getallpayments/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
// //     const chatId = msg.chat.id;
// //     try {
// //         const payments = await paymentController.getAllPaymentsBot(user._id, user.role === 'superAdmin', {}, { path: 'customer', select: 'fullname email' });

// //         if (!payments || payments.length === 0) {
// //             return bot.sendMessage(chatId, 'ℹ️ No payments found.');
// //         }

// //         const paymentSummaries = payments.map(p =>
// //             `ID: \`${p._id}\`\nAmount: *$${p.amount.toFixed(2)}*\nDate: ${p.date.toISOString().split('T')[0]}\nCustomer: *${p.customer ? p.customer.fullname : 'N/A'}*`
// //         ).join('\n\n---\n\n');

// //         if (paymentSummaries.length <= 4000) {
// //             await bot.sendMessage(chatId, `💸 *All Payments:*\n\n${paymentSummaries}`, { parse_mode: 'Markdown' });
// //         } else {
// //             await bot.sendMessage(chatId, '⚠️ Too many payments to display directly. Consider filtering or requesting a specific payment by ID.');
// //         }

// //     } catch (err) {
// //         bot.sendMessage(chatId, `❌ Failed to get all payments: ${err.message || 'Error'}`);
// //     }
// // }));

// bot.onText(/\/updatepayment (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     const command = '/updatepayment';
//     const args = match[1].split(',').map(arg => arg.trim());

//     if (args.length < 3) {
//         return sendUsageHint(chatId, command);
//     }

//     const paymentId = args[0];
//     const field = args[1];
//     const newValue = args[2];

//     const updateData = {};
//     if (field === 'amount') {
//         const amount = parseFloat(newValue);
//         if (isNaN(amount) || amount <= 0) {
//             return bot.sendMessage(chatId, '❌ Invalid amount. Please provide a positive number.');
//         }
//         updateData.amount = amount;
//     } else if (field === 'date') {
//         const paymentDate = new Date(newValue);
//         if (isNaN(paymentDate.getTime())) {
//             return bot.sendMessage(chatId, '❌ Invalid date format. Please use YYYY-MM-DD.');
//         }
//         updateData.date = paymentDate;
//     } else {
//         updateData[field] = newValue;
//     }

//     try {
//         const updatedPayment = await paymentController.updatePaymentBot(paymentId, updateData, user._id, user.role === 'superAdmin');
//         await bot.sendMessage(chatId, `✅ Payment \`${updatedPayment._id}\` updated. New *${field}*: \`${newValue || 'N/A'}\``, { parse_mode: 'Markdown' });
//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Failed to update payment: ${err.message || 'Error'}`);
//     }
// }));

// bot.onText(/\/deletepayment (.+)/, restrictBotUserTo(['admin', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     const command = '/deletepayment';
//     const paymentId = match[1].trim();

//     if (!paymentId) {
//         return sendUsageHint(chatId, command);
//     }

//     try {
//         await paymentController.deletePaymentBot(paymentId, user._id, user.role === 'superAdmin');
//         await bot.sendMessage(chatId, `✅ Payment \`${paymentId}\` deleted successfully.`, { parse_mode: 'Markdown' });
//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Failed to delete payment: ${err.message || 'Error'}`);
//     }
// }));

// bot.onText(/\/deletemultiplepayments (.+)/, restrictBotUserTo(['admin', 'superAdmin'], async (msg, match, user) => {
//     const chatId = msg.chat.id;
//     const command = '/deletemultiplepayments';
//     const paymentIds = match[1].split(',').map(id => id.trim());

//     if (paymentIds.length === 0 || !paymentIds.every(id => id)) {
//         return sendUsageHint(chatId, command);
//     }

//     try {
//         const result = await paymentController.deleteMultiplePaymentsBot(paymentIds, user._id, user.role === 'superAdmin');
//         await bot.sendMessage(chatId, `✅ ${result.message}`, { parse_mode: 'Markdown' });
//     } catch (err) {
//         bot.sendMessage(chatId, `❌ Failed to delete multiple payments: ${err.message || 'Error'}`);
//     }
// }));

// console.log('Telegram Bot is running...');
// // const TelegramBot = require('node-telegram-bot-api');
// // const { v4: uuidv4 } = require('uuid');

// // // Import your controllers
// // const authController = require('../Controllers/authController'); // Corrected path
// // const customerController = require('../Controllers/customerController'); // Corrected path
// // const invoiceController = require('../Controllers/invoiceController'); // Corrected path
// // const paymentController = require('../Controllers/paymentController'); // Corrected path

// // // Retrieve your Telegram Bot Token from environment variables
// // const token = process.env.TELEGRAM_TOKEN;
// // if (!token) {
// //     console.error('TELEGRAM_TOKEN environment variable is not set. Please set it to your bot token.');
// //     process.exit(1);
// // }

// // const bot = new TelegramBot(token, { polling: true });

// // // In-memory stores for user tokens and roles.
// // const userTokens = {}; // key: chatId, value: JWT token
// // const userRoles = {};  // key: chatId, value: role (e.g., 'user', 'staff', 'admin', 'superAdmin')

// // // --- Centralized Command Definitions ---
// // const commandDefinitions = [
// //     // General Commands
// //     {
// //         command: '/start',
// //         description: 'Get a welcome message and basic info.',
// //         usage: '/start',
// //         category: 'General',
// //         roles: ['user', 'staff', 'admin', 'superAdmin', 'guest']
// //     },
// //     {
// //         command: '/help',
// //         description: 'Show this help message with all commands.',
// //         usage: '/help',
// //         category: 'General',
// //         roles: ['user', 'staff', 'admin', 'superAdmin', 'guest']
// //     },
// //     {
// //         command: '/register',
// //         description: 'Create a new user account.',
// //         usage: '/register <name> <email> <password>',
// //         category: 'Authentication',
// //         roles: ['guest']
// //     },
// //     {
// //         command: '/login',
// //         description: 'Log in to your account to access features.',
// //         usage: '/login <email> <password>',
// //         category: 'Authentication',
// //         roles: ['guest']
// //     },
// //     {
// //         command: '/logout',
// //         description: 'Log out of your current session.',
// //         usage: '/logout',
// //         category: 'Authentication',
// //         roles: ['user', 'staff', 'admin', 'superAdmin']
// //     },
// //     // Customer Management
// //     {
// //         command: '/newcustomer',
// //         description: 'Create a new customer record.',
// //         usage: '/newcustomer <email>,<fullname>,<phoneNumber>[,<phoneType>]',
// //         example: '`/newcustomer test@example.com,John Doe,1234567890,mobile`',
// //         category: 'Customer Management',
// //         roles: ['admin', 'staff', 'superAdmin']
// //     },
// //     {
// //         command: '/getcustomerbyid',
// //         description: 'Get detailed information for a specific customer by ID.',
// //         usage: '/getcustomerbyid <customer_id>',
// //         example: '`/getcustomerbyid 60c72b2f9b1e8b0015f8e0a1`',
// //         category: 'Customer Management',
// //         roles: ['user', 'staff', 'admin', 'superAdmin']
// //     },
// //     {
// //         command: '/getallcustomers',
// //         description: 'List all customer records.',
// //         usage: '/getallcustomers',
// //         category: 'Customer Management',
// //         roles: ['admin', 'staff', 'superAdmin']
// //     },
// //     {
// //         command: '/updatecustomer',
// //         description: 'Update a specific field for a customer.',
// //         usage: '/updatecustomer <customer_id>,<field>,<newValue>',
// //         example: '`/updatecustomer 60c72b2f9b1e8b0015f8e0a1,fullname,Jane Doe`\nFor phone: `/updatecustomer 123,phoneNumbers,9876543210:home` (overwrites existing phones)',
// //         category: 'Customer Management',
// //         roles: ['admin', 'staff', 'superAdmin']
// //     },
// //     {
// //         command: '/deletecustomer',
// //         description: 'Permanently delete a customer record.',
// //         usage: '/deletecustomer <customer_id>',
// //         category: 'Customer Management',
// //         roles: ['admin', 'superAdmin']
// //     },
// //     {
// //         command: '/deactivatemultiplecustomers',
// //         description: 'Change the status of multiple customers to inactive.',
// //         usage: '/deactivatemultiplecustomers <id1>,<id2>[,<id3>,...]',
// //         example: '`/deactivatemultiplecustomers 60c...,60d...`',
// //         category: 'Customer Management',
// //         roles: ['admin', 'superAdmin']
// //     },
// //     // Invoice Management
// //     {
// //         command: '/getinvoice',
// //         description: 'Get details of a specific invoice by ID.',
// //         usage: '/getinvoice <invoice_id>',
// //         category: 'Invoice Management',
// //         roles: ['user', 'staff', 'admin', 'superAdmin']
// //     },
// //     {
// //         command: '/getallinvoices',
// //         description: 'List all invoice records.',
// //         usage: '/getallinvoices',
// //         category: 'Invoice Management',
// //         roles: ['admin', 'staff', 'superAdmin']
// //     },
// //     {
// //         command: '/createinvoice',
// //         description: 'Create a new invoice record.',
// //         usage: '/createinvoice <customerId>,<customerName>,<amount>,<status>,<productName>,<productQuantity>,<productPrice>',
// //         example: '`/createinvoice 60c...,John,100,pending,Laptop,1,100`',
// //         category: 'Invoice Management',
// //         roles: ['admin', 'staff', 'superAdmin']
// //     },
// //     {
// //         command: '/updateinvoice',
// //         description: 'Update a specific field for an invoice.',
// //         usage: '/updateinvoice <invoice_id>,<field>,<newValue>',
// //         example: '`/updateinvoice 60c...,status,paid`',
// //         category: 'Invoice Management',
// //         roles: ['admin', 'staff', 'superAdmin']
// //     },
// //     {
// //         command: '/deleteinvoice',
// //         description: 'Permanently delete an invoice record.',
// //         usage: '/deleteinvoice <invoice_id>',
// //         category: 'Invoice Management',
// //         roles: ['admin', 'staff', 'superAdmin']
// //     },
// //     {
// //         command: '/productsales',
// //         description: 'Get product sales report for a date range.',
// //         usage: '/productsales <startDate>,<endDate>',
// //         example: '`/productsales 2024-01-01,2024-12-31`',
// //         category: 'Invoice Management',
// //         roles: ['admin', 'staff', 'superAdmin']
// //     },
// //     // Payment Management
// //     {
// //         command: '/newpayment',
// //         description: 'Record a new payment.',
// //         usage: '/newpayment <customer_id>,<amount>,<date>[,<description>]',
// //         example: '`/newpayment 60c...,150.75,2025-07-15,Initial payment`',
// //         category: 'Payment Management',
// //         roles: ['admin', 'staff', 'superAdmin']
// //     },
// //     {
// //         command: '/getpaymentbyid',
// //         description: 'Get detailed information for a specific payment by ID.',
// //         usage: '/getpaymentbyid <payment_id>',
// //         example: '`/getpaymentbyid 60c72b2f9b1e8b0015f8e0a2`',
// //         category: 'Payment Management',
// //         roles: ['user', 'staff', 'admin', 'superAdmin']
// //     },
// //     {
// //         command: '/getallpayments',
// //         description: 'List all payment records.',
// //         usage: '/getallpayments',
// //         category: 'Payment Management',
// //         roles: ['admin', 'staff', 'superAdmin']
// //     },
// //     {
// //         command: '/updatepayment',
// //         description: 'Update a specific field for a payment.',
// //         usage: '/updatepayment <payment_id>,<field>,<newValue>',
// //         example: '`/updatepayment 60c...,amount,200.00`',
// //         category: 'Payment Management',
// //         roles: ['admin', 'staff', 'superAdmin']
// //     },
// //     {
// //         command: '/deletepayment',
// //         description: 'Permanently delete a payment record.',
// //         usage: '/deletepayment <payment_id>',
// //         category: 'Payment Management',
// //         roles: ['admin', 'superAdmin']
// //     },
// //     {
// //         command: '/deletemultiplepayments',
// //         description: 'Delete multiple payment records.',
// //         usage: '/deletemultiplepayments <id1>,<id2>[,<id3>,...]',
// //         example: '`/deletemultiplepayments 60c...,60d...`',
// //         category: 'Payment Management',
// //         roles: ['admin', 'superAdmin']
// //     },
// // ];

// // // Create a map for quick lookup of command details
// // const commandDetailsMap = new Map(commandDefinitions.map(cmd => [cmd.command, cmd]));

// // // --- Helper Functions ---

// // /**
// //  * Authenticates a Telegram user based on their stored JWT token.
// //  * @param {number} chatId The chat ID of the Telegram user.
// //  * @returns {object|null} The decoded user object if authenticated, otherwise null.
// //  */
// // const authenticateBotUser = async (chatId) => {
// //     const token = userTokens[chatId];
// //     if (!token) {
// //         await bot.sendMessage(chatId, '⚠️ You must log in first. Use `/login email password`.');
// //         return null;
// //     }
// //     try {
// //         const decodedUser = await authController.verifyTokenAndGetUserBot(`Bearer ${token}`);
// //         userRoles[chatId] = decodedUser.role;
// //         return decodedUser;
// //     } catch (error) {
// //         delete userTokens[chatId];
// //         delete userRoles[chatId];
// //         await bot.sendMessage(chatId, `❌ Authentication failed: ${error.message}. Please log in again.`);
// //         return null;
// //     }
// // };

// // /**
// //  * Higher-order function to restrict command access based on user roles.
// //  * It returns the actual handler function that bot.onText expects.
// //  * @param {string[]} allowedRoles An array of roles that are allowed to use the command.
// //  * @param {Function} commandHandler The actual async function that handles the command logic.
// //  * @returns {Function} An async function (msg, match) that will be passed to bot.onText.
// //  */
// // const restrictBotUserTo = (allowedRoles, commandHandler) => async (msg, match) => {
// //     const chatId = msg.chat.id;
// //     const command = msg.text.split(' ')[0]; // Extract the command itself

// //     // Special handling for commands that can be used by 'guest' (not logged in)
// //     if (allowedRoles.includes('guest')) {
// //         // If the user is not logged in, but the command allows guests, proceed with null user
// //         if (!userTokens[chatId]) {
// //             return commandHandler(msg, match, null); // Pass null for user
// //         }
// //     }

// //     // For all other commands, or if a guest command is used by a logged-in user, authenticate
// //     const user = await authenticateBotUser(chatId);
// //     if (!user) {
// //         return; // Authentication failed, message already sent by authenticateBotUser
// //     }

// //     const userRole = userRoles[chatId];

// //     // Super admin can bypass all role checks
// //     if (userRole === 'superAdmin') {
// //         return commandHandler(msg, match, user); // Call the actual handler with the authenticated user
// //     }

// //     // Check if the user's role is in the allowed roles list
// //     if (!allowedRoles.includes(userRole)) {
// //         const cmdInfo = commandDetailsMap.get(command);
// //         let accessDeniedMessage = `🚫 Access Denied: You do not have the required role to perform this action. Your role: *${userRole}*.`;
// //         if (cmdInfo && cmdInfo.roles) {
// //             accessDeniedMessage += `\nAllowed roles for *${command}*: *${cmdInfo.roles.filter(r => r !== 'guest').join(', ')}*.`;
// //         }
// //         return bot.sendMessage(chatId, accessDeniedMessage, { parse_mode: 'Markdown' });
// //     }

// //     // If authorized, proceed to the command handler
// //     commandHandler(msg, match, user);
// // };

// // /**
// //  * Sends a usage hint for a command if arguments are missing or invalid.
// //  * @param {number} chatId The chat ID.
// //  * @param {string} command The command string (e.g., '/newcustomer').
// //  */
// // const sendUsageHint = async (chatId, command) => {
// //     const cmdInfo = commandDetailsMap.get(command);
// //     if (cmdInfo) {
// //         let hint = `Incorrect usage for *${command}*.\n`;
// //         hint += `*Usage:* \`${cmdInfo.usage}\`\n`;
// //         if (cmdInfo.example) {
// //             hint += `*Example:* ${cmdInfo.example}\n`;
// //         }
// //         hint += `Please provide all required arguments correctly.`;
// //         await bot.sendMessage(chatId, hint, { parse_mode: 'Markdown' });
// //     } else {
// //         await bot.sendMessage(chatId, `Unknown command: *${command}*. Use \`/help\` for a list of commands.`, { parse_mode: 'Markdown' });
// //     }
// // };


// // // --- General Commands ---

// // bot.onText(/\/start/, restrictBotUserTo(['guest', 'user', 'staff', 'admin', 'superAdmin'], async (msg) => {
// //     const chatId = msg.chat.id;
// //     const welcomeMessage = `
// // 👋 Welcome! I am your business management bot.

// // Here are some general commands:
// // • \`/register <name> <email> <password>\`: Create a new account.
// // • \`/login <email> <password>\`: Log in to your account.
// // • \`/logout\`: Log out of your current session.
// // • \`/help\`: Show all available commands and their usage.

// // Once logged in, you can manage customers, invoices, and payments.
// //     `;
// //     bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
// // }));

// // bot.onText(/\/help/, restrictBotUserTo(['guest', 'user', 'staff', 'admin', 'superAdmin'], async (msg, match, user) => {
// //     const chatId = msg.chat.id;
// //     const userRole = user ? user.role : 'guest'; // Get current user's role or default to 'guest'

// //     let helpMessage = `📚 *Available Commands (Your Role: ${userRole}):*\n\n`;

// //     const categories = [...new Set(commandDefinitions.map(cmd => cmd.category))];

// //     for (const category of categories) {
// //         helpMessage += `*--- ${category} ---*\n`;
// //         const categoryCommands = commandDefinitions.filter(cmd => cmd.category === category);

// //         for (const cmd of categoryCommands) {
// //             // Check if the user has permission to see this command
// //             const isAllowed = cmd.roles.includes(userRole) || userRole === 'superAdmin' || cmd.roles.includes('guest');

// //             if (isAllowed) {
// //                 helpMessage += `• *${cmd.command}*: ${cmd.description}\n`;
// //                 helpMessage += `  _Usage:_ \`${cmd.usage}\`\n`;
// //                 if (cmd.example) {
// //                     helpMessage += `  _Example:_ ${cmd.example}\n`;
// //                 }
// //             }
// //         }
// //         helpMessage += '\n';
// //     }

// //     // Split messages if too long for Telegram's 4096 character limit
// //     const messages = [];
// //     let currentMessage = '';
// //     const lines = helpMessage.split('\n');

// //     for (const line of lines) {
// //         if ((currentMessage + line + '\n').length > 4000) { // Keep some buffer
// //             messages.push(currentMessage);
// //             currentMessage = line + '\n';
// //         } else {
// //             currentMessage += line + '\n';
// //         }
// //     }
// //     if (currentMessage.length > 0) {
// //         messages.push(currentMessage);
// //     }

// //     for (const part of messages) {
// //         await bot.sendMessage(chatId, part, { parse_mode: 'Markdown' });
// //     }
// // }));


// // // --- User Authentication Commands ---

// // bot.onText(/\/register (.+)/, restrictBotUserTo(['guest'], async (msg, match) => {
// //     const chatId = msg.chat.id;
// //     const command = '/register';
// //     const args = match[1].split(' ');

// //     if (args.length < 3) {
// //         return sendUsageHint(chatId, command);
// //     }

// //     const [name, email, password] = args;
// //     const passwordConfirm = password;

// //     try {
// //         const { token, user } = await authController.signupBot(name, email, password, passwordConfirm, 'user');
// //         userTokens[chatId] = token;
// //         userRoles[chatId] = user.role;
// //         bot.sendMessage(chatId, `✅ Registered and logged in as a *${user.role}*!`, { parse_mode: 'Markdown' });
// //     } catch (err) {
// //         bot.sendMessage(chatId, `❌ Error: ${err.message || 'Failed to register'}`);
// //     }
// // }));

// // bot.onText(/\/login (.+)/, restrictBotUserTo(['guest'], async (msg, match) => {
// //     const chatId = msg.chat.id;
// //     const command = '/login';
// //     const args = match[1].split(' ');

// //     if (args.length < 2) {
// //         return sendUsageHint(chatId, command);
// //     }

// //     const [email, password] = args;

// //     try {
// //         const { user, token } = await authController.loginBot(email, password);
// //         userTokens[chatId] = token;
// //         userRoles[chatId] = user.role;
// //         bot.sendMessage(chatId, `🔐 Login successful! You're now authenticated as *${user.role}*.`, { parse_mode: 'Markdown' });
// //     } catch (err) {
// //         bot.sendMessage(chatId, `❌ Login failed: ${err.message || 'Error'}`);
// //     }
// // }));

// // bot.onText(/\/logout/, restrictBotUserTo(['user', 'staff', 'admin', 'superAdmin'], (msg) => {
// //     const chatId = msg.chat.id;
// //     delete userTokens[chatId];
// //     delete userRoles[chatId];
// //     bot.sendMessage(chatId, '✅ You have been logged out.');
// // }));


// // // --- Customer Management Commands ---

// // bot.onText(/\/newcustomer (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
// //     const chatId = msg.chat.id;
// //     const command = '/newcustomer';
// //     const args = match[1].split(',').map(arg => arg.trim());

// //     if (args.length < 3) {
// //         return sendUsageHint(chatId, command);
// //     }

// //     const [email, fullname, phoneNumber, phoneType = 'mobile'] = args;
// //     const customerData = {
// //         email,
// //         fullname,
// //         phoneNumbers: [{ number: phoneNumber, type: phoneType }]
// //     };

// //     try {
// //         const { message, customer } = await customerController.newCustomerBot(customerData, user._id);
// //         await bot.sendMessage(chatId, `✅ ${message} Customer ID: \`${customer._id}\`\nName: ${customer.fullname}\nEmail: ${customer.email}`, { parse_mode: 'Markdown' });
// //     } catch (err) {
// //         bot.sendMessage(chatId, `❌ Failed to create customer: ${err.message || 'Error'}`);
// //     }
// // }));

// // bot.onText(/\/getcustomerbyid (.+)/, restrictBotUserTo(['user', 'admin', 'staff', 'superAdmin'], async (msg, match, user) => {
// //     const chatId = msg.chat.id;
// //     const command = '/getcustomerbyid';
// //     const customerId = match[1].trim();

// //     if (!customerId) {
// //         return sendUsageHint(chatId, command);
// //     }

// //     try {
// //         const customer = await customerController.getCustomerByIdBot(customerId, user._id, user.role === 'superAdmin');

// //         const details = `
// // 📦 *Customer Details:*
// // ID: \`${customer._id}\`
// // Name: *${customer.fullname}*
// // Email: ${customer.email || 'N/A'}
// // Phone: ${customer.phoneNumbers.map(p => `${p.number} (${p.type || 'N/A'})`).join(', ') || 'N/A'}
// // Status: *${customer.status}*
// // Total Bills: $${customer.totalBillsAmount?.toFixed(2) || '0.00'}
// // Total Payments: $${customer.totalPaymentsAmount?.toFixed(2) || '0.00'}
// // Remaining Amount: $${customer.remainingAmount?.toFixed(2) || '0.00'}
// //         `;
// //         await bot.sendMessage(chatId, details, { parse_mode: 'Markdown' });

// //     } catch (err) {
// //         bot.sendMessage(chatId, `❌ Failed to get customer: ${err.message || 'Error'}`);
// //     }
// // }));

// // bot.onText(/\/getallcustomers/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
// //     const chatId = msg.chat.id;
// //     try {
// //         const customers = await customerController.getAllCustomersBot(user._id, user.role === 'superAdmin', {});

// //         if (!customers || customers.length === 0) {
// //             return bot.sendMessage(chatId, 'ℹ️ No customers found.');
// //         }

// //         const customerSummaries = customers.map(c =>
// //             `ID: \`${c._id}\`\nName: *${c.fullname}*\nEmail: ${c.email || 'N/A'}\nPhone: ${c.phoneNumbers.map(p => p.number).join(', ') || 'N/A'}\nStatus: ${c.status}`
// //         ).join('\n\n---\n\n');

// //         if (customerSummaries.length <= 4000) {
// //             await bot.sendMessage(chatId, `👥 *All Customers:*\n\n${customerSummaries}`, { parse_mode: 'Markdown' });
// //         } else {
// //             await bot.sendMessage(chatId, '⚠️ Too many customers to display directly. Consider filtering or requesting a specific customer by ID.');
// //         }

// //     } catch (err) {
// //         bot.sendMessage(chatId, `❌ Failed to get all customers: ${err.message || 'Error'}`);
// //     }
// // }));

// // bot.onText(/\/updatecustomer (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
// //     const chatId = msg.chat.id;
// //     const command = '/updatecustomer';
// //     const args = match[1].split(',').map(arg => arg.trim());

// //     if (args.length < 3) {
// //         return sendUsageHint(chatId, command);
// //     }

// //     const customerId = args[0];
// //     const field = args[1];
// //     const newValue = args[2];

// //     const updateData = {};
// //     if (field === 'phoneNumbers') {
// //         const [number, type = 'mobile'] = newValue.split(':');
// //         updateData.phoneNumbers = [{ number, type }];
// //     } else if (field === 'status' && ['active', 'inactive'].includes(newValue)) {
// //         updateData.status = newValue;
// //     } else {
// //         updateData[field] = newValue;
// //     }

// //     try {
// //         const updatedCustomer = await customerController.updateCustomerBot(customerId, updateData, user._id, user.role === 'superAdmin');
// //         await bot.sendMessage(chatId, `✅ Customer \`${updatedCustomer._id}\` updated. New *${field}*: \`${newValue || 'N/A'}\``, { parse_mode: 'Markdown' });
// //     } catch (err) {
// //         bot.sendMessage(chatId, `❌ Failed to update customer: ${err.message || 'Error'}`);
// //     }
// // }));

// // bot.onText(/\/deletecustomer (.+)/, restrictBotUserTo(['admin', 'superAdmin'], async (msg, match, user) => {
// //     const chatId = msg.chat.id;
// //     const command = '/deletecustomer';
// //     const customerId = match[1].trim();

// //     if (!customerId) {
// //         return sendUsageHint(chatId, command);
// //     }

// //     try {
// //         await customerController.deleteCustomerBot(customerId, user._id, user.role === 'superAdmin');
// //         await bot.sendMessage(chatId, `✅ Customer \`${customerId}\` deleted successfully.`, { parse_mode: 'Markdown' });
// //     } catch (err) {
// //         bot.sendMessage(chatId, `❌ Failed to delete customer: ${err.message || 'Error'}`);
// //     }
// // }));

// // bot.onText(/\/deactivatemultiplecustomers (.+)/, restrictBotUserTo(['admin', 'superAdmin'], async (msg, match, user) => {
// //     const chatId = msg.chat.id;
// //     const command = '/deactivatemultiplecustomers';
// //     const customerIds = match[1].split(',').map(id => id.trim());

// //     if (customerIds.length === 0 || !customerIds.every(id => id)) {
// //         return sendUsageHint(chatId, command);
// //     }

// //     try {
// //         const result = await customerController.deactivateMultipleCustomersBot(customerIds, user._id, user.role === 'superAdmin');
// //         await bot.sendMessage(chatId, `✅ ${result.message}`, { parse_mode: 'Markdown' });
// //     } catch (err) {
// //         bot.sendMessage(chatId, `❌ Failed to deactivate customers: ${err.message || 'Error'}`);
// //     }
// // }));


// // // --- Invoice Commands ---

// // bot.onText(/\/getinvoice (.+)/, restrictBotUserTo(['user', 'admin', 'staff', 'superAdmin'], async (msg, match, user) => {
// //     const chatId = msg.chat.id;
// //     const command = '/getinvoice';
// //     const invoiceId = match[1].trim();

// //     if (!invoiceId) {
// //         return sendUsageHint(chatId, command);
// //     }

// //     try {
// //         const invoice = await invoiceController.getInvoiceByIdBot(invoiceId, user._id, user.role === 'superAdmin');
// //         if (!invoice) {
// //             return bot.sendMessage(chatId, 'ℹ️ No invoice found with that ID.');
// //         }
// //         await bot.sendMessage(chatId, `🧾 *Invoice Details:*\n\`\`\`json\n${JSON.stringify(invoice, null, 2)}\n\`\`\``, {
// //             parse_mode: 'Markdown',
// //         });
// //     } catch (err) {
// //         bot.sendMessage(chatId, `❌ Failed to get invoice: ${err.message || 'Error'}`);
// //     }
// // }));

// // bot.onText(/\/getallinvoices/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
// //     const chatId = msg.chat.id;
// //     try {
// //         const invoices = await invoiceController.getAllInvoicesBot(user._id, user.role === 'superAdmin');
// //         if (!invoices || invoices.length === 0) {
// //             return bot.sendMessage(chatId, 'ℹ️ No invoices found.');
// //         }

// //         const invoiceSummaries = invoices.map(inv => `ID: \`${inv._id}\`, Customer: ${inv.customerName}, Amount: ₹${inv.amount}, Status: ${inv.status}`).join('\n');
// //         if (invoiceSummaries.length <= 4000) {
// //             await bot.sendMessage(chatId, `📊 *All Invoices:*\n${invoiceSummaries}`, { parse_mode: 'Markdown' });
// //         } else {
// //             await bot.sendMessage(chatId, '⚠️ Too many invoices to display directly. Consider filtering or requesting a specific invoice.');
// //         }

// //     } catch (err) {
// //         bot.sendMessage(chatId, `❌ Failed to get all invoices: ${err.message || 'Error'}`);
// //     }
// // }));

// // bot.onText(/\/createinvoice (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
// //     const chatId = msg.chat.id;
// //     const command = '/createinvoice';
// //     const args = match[1].split(',');

// //     if (args.length !== 7) {
// //         return sendUsageHint(chatId, command);
// //     }

// //     const [customerId, customerName, amount, status, productName, productQuantity, productPrice] = args.map(arg => arg.trim());

// //     try {
// //         const newInv = await invoiceController.newInvoiceBot({ customerId, customerName, amount, status, productName, productQuantity, productPrice }, user._id);
// //         await bot.sendMessage(chatId, `✅ Invoice created successfully! ID: \`${newInv._id}\``, { parse_mode: 'Markdown' });
// //     } catch (err) {
// //         bot.sendMessage(chatId, `❌ Failed to create invoice: ${err.message || 'Error'}`);
// //     }
// // }));

// // bot.onText(/\/updateinvoice (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
// //     const chatId = msg.chat.id;
// //     const command = '/updateinvoice';
// //     const args = match[1].split(',');

// //     if (args.length !== 3) {
// //         return sendUsageHint(chatId, command);
// //     }

// //     const [invoiceId, field, newValue] = args.map(arg => arg.trim());
// //     const updateData = { [field]: newValue };

// //     try {
// //         const updatedInv = await invoiceController.updateInvoiceBot(invoiceId, updateData, user._id, user.role === 'superAdmin');
// //         await bot.sendMessage(chatId, `✅ Invoice \`${updatedInv._id}\` updated. New ${field}: \`${newValue}\``, { parse_mode: 'Markdown' });
// //     } catch (err) {
// //         bot.sendMessage(chatId, `❌ Failed to update invoice: ${err.message || 'Error'}`);
// //     }
// // }));

// // bot.onText(/\/deleteinvoice (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
// //     const chatId = msg.chat.id;
// //     const command = '/deleteinvoice';
// //     const invoiceId = match[1];

// //     if (!invoiceId) {
// //         return sendUsageHint(chatId, command);
// //     }

// //     try {
// //         await invoiceController.deleteInvoiceBot(invoiceId, user._id, user.role === 'superAdmin');
// //         await bot.sendMessage(chatId, `✅ Invoice \`${invoiceId}\` deleted successfully.`, { parse_mode: 'Markdown' });
// //     } catch (err) {
// //         bot.sendMessage(chatId, `❌ Failed to delete invoice: ${err.message || 'Error'}`);
// //     }
// // }));

// // bot.onText(/\/productsales (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
// //     const chatId = msg.chat.id;
// //     const command = '/productsales';
// //     const args = match[1].split(',');

// //     if (args.length !== 2) {
// //         return sendUsageHint(chatId, command);
// //     }

// //     const [startDate, endDate] = args.map(arg => arg.trim());

// //     try {
// //         const salesData = await invoiceController.getProductSalesBot(startDate, endDate, user._id, user.role === 'superAdmin');
// //         let responseText = `📈 *Product Sales Report (${startDate} to ${endDate}):*\n`;
// //         responseText += `Total Sales: ₹${salesData.totalSales || 0}\n`;
// //         responseText += `Invoices Processed: ${salesData.invoicesCount || 0}\n\n`;
// //         responseText += `*Product-wise Sales:*\n`;

// //         const productSales = salesData.productSales || {};
// //         const productNames = Object.keys(productSales);

// //         if (productNames.length === 0) {
// //             responseText += 'No product sales recorded in this period.\n';
// //         } else {
// //             for (const product in productSales) {
// //                 responseText += `- ${product}: ₹${productSales[product].toFixed(2)}\n`;
// //             }
// //         }

// //         await bot.sendMessage(chatId, responseText, { parse_mode: 'Markdown' });
// //     } catch (err) {
// //         bot.sendMessage(chatId, `❌ Failed to get product sales: ${err.message || 'Error'}`);
// //     }
// // }));


// // // --- Payment Management Commands ---

// // bot.onText(/\/newpayment (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
// //     const chatId = msg.chat.id;
// //     const command = '/newpayment';
// //     const args = match[1].split(',').map(arg => arg.trim());

// //     if (args.length < 3) {
// //         return sendUsageHint(chatId, command);
// //     }

// //     const [customerId, amountStr, dateStr, description = ''] = args;

// //     const amount = parseFloat(amountStr);
// //     if (isNaN(amount) || amount <= 0) {
// //         return bot.sendMessage(chatId, '❌ Invalid amount. Please provide a positive number.');
// //     }

// //     const paymentDate = new Date(dateStr);
// //     if (isNaN(paymentDate.getTime())) {
// //         return bot.sendMessage(chatId, '❌ Invalid date format. Please use YYYY-MM-DD.');
// //     }

// //     const paymentData = {
// //         customer: customerId,
// //         amount,
// //         date: paymentDate,
// //         description
// //     };

// //     try {
// //         const { message, payment } = await paymentController.newPaymentBot(paymentData, user._id);
// //         await bot.sendMessage(chatId, `✅ ${message} Payment ID: \`${payment._id}\`\nAmount: $${payment.amount.toFixed(2)}\nCustomer: ${payment.customer}`, { parse_mode: 'Markdown' });
// //     } catch (err) {
// //         bot.sendMessage(chatId, `❌ Failed to record payment: ${err.message || 'Error'}`);
// //     }
// // }));

// // bot.onText(/\/getpaymentbyid (.+)/, restrictBotUserTo(['user', 'staff', 'admin', 'superAdmin'], async (msg, match, user) => {
// //     const chatId = msg.chat.id;
// //     const command = '/getpaymentbyid';
// //     const paymentId = match[1].trim();

// //     if (!paymentId) {
// //         return sendUsageHint(chatId, command);
// //     }

// //     try {
// //         const payment = await paymentController.getPaymentByIdBot(paymentId, user._id, user.role === 'superAdmin', { path: 'customer', select: 'fullname email' });

// //         const details = `
// // 💰 *Payment Details:*
// // ID: \`${payment._id}\`
// // Amount: *$${payment.amount.toFixed(2)}*
// // Date: ${payment.date.toISOString().split('T')[0]}
// // Customer: *${payment.customer ? payment.customer.fullname : 'N/A'}* (\`${payment.customer ? payment.customer._id : 'N/A'}\`)
// // Description: ${payment.description || 'N/A'}
// //         `;
// //         await bot.sendMessage(chatId, details, { parse_mode: 'Markdown' });

// //     } catch (err) {
// //         bot.sendMessage(chatId, `❌ Failed to get payment: ${err.message || 'Error'}`);
// //     }
// // }));

// // bot.onText(/\/getallpayments/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
// //     const chatId = msg.chat.id;
// //     try {
// //         const payments = await paymentController.getAllPaymentsBot(user._id, user.role === 'superAdmin', {}, { path: 'customer', select: 'fullname email' });

// //         if (!payments || payments.length === 0) {
// //             return bot.sendMessage(chatId, 'ℹ️ No payments found.');
// //         }

// //         const paymentSummaries = payments.map(p =>
// //             `ID: \`${p._id}\`\nAmount: *$${p.amount.toFixed(2)}*\nDate: ${p.date.toISOString().split('T')[0]}\nCustomer: *${p.customer ? p.customer.fullname : 'N/A'}*`
// //         ).join('\n\n---\n\n');

// //         if (paymentSummaries.length <= 4000) {
// //             await bot.sendMessage(chatId, `💸 *All Payments:*\n\n${paymentSummaries}`, { parse_mode: 'Markdown' });
// //         } else {
// //             await bot.sendMessage(chatId, '⚠️ Too many payments to display directly. Consider filtering or requesting a specific payment by ID.');
// //         }

// //     } catch (err) {
// //         bot.sendMessage(chatId, `❌ Failed to get all payments: ${err.message || 'Error'}`);
// //     }
// // }));

// // bot.onText(/\/updatepayment (.+)/, restrictBotUserTo(['admin', 'staff', 'superAdmin'], async (msg, match, user) => {
// //     const chatId = msg.chat.id;
// //     const command = '/updatepayment';
// //     const args = match[1].split(',').map(arg => arg.trim());

// //     if (args.length < 3) {
// //         return sendUsageHint(chatId, command);
// //     }

// //     const paymentId = args[0];
// //     const field = args[1];
// //     const newValue = args[2];

// //     const updateData = {};
// //     if (field === 'amount') {
// //         const amount = parseFloat(newValue);
// //         if (isNaN(amount) || amount <= 0) {
// //             return bot.sendMessage(chatId, '❌ Invalid amount. Please provide a positive number.');
// //         }
// //         updateData.amount = amount;
// //     } else if (field === 'date') {
// //         const paymentDate = new Date(newValue);
// //         if (isNaN(paymentDate.getTime())) {
// //             return bot.sendMessage(chatId, '❌ Invalid date format. Please use YYYY-MM-DD.');
// //         }
// //         updateData.date = paymentDate;
// //     } else {
// //         updateData[field] = newValue;
// //     }

// //     try {
// //         const updatedPayment = await paymentController.updatePaymentBot(paymentId, updateData, user._id, user.role === 'superAdmin');
// //         await bot.sendMessage(chatId, `✅ Payment \`${updatedPayment._id}\` updated. New *${field}*: \`${newValue || 'N/A'}\``, { parse_mode: 'Markdown' });
// //     } catch (err) {
// //         bot.sendMessage(chatId, `❌ Failed to update payment: ${err.message || 'Error'}`);
// //     }
// // }));

// // bot.onText(/\/deletepayment (.+)/, restrictBotUserTo(['admin', 'superAdmin'], async (msg, match, user) => {
// //     const chatId = msg.chat.id;
// //     const command = '/deletepayment';
// //     const paymentId = match[1].trim();

// //     if (!paymentId) {
// //         return sendUsageHint(chatId, command);
// //     }

// //     try {
// //         await paymentController.deletePaymentBot(paymentId, user._id, user.role === 'superAdmin');
// //         await bot.sendMessage(chatId, `✅ Payment \`${paymentId}\` deleted successfully.`, { parse_mode: 'Markdown' });
// //     } catch (err) {
// //         bot.sendMessage(chatId, `❌ Failed to delete payment: ${err.message || 'Error'}`);
// //     }
// // }));

// // bot.onText(/\/deletemultiplepayments (.+)/, restrictBotUserTo(['admin', 'superAdmin'], async (msg, match, user) => {
// //     const chatId = msg.chat.id;
// //     const command = '/deletemultiplepayments';
// //     const paymentIds = match[1].split(',').map(id => id.trim());

// //     if (paymentIds.length === 0 || !paymentIds.every(id => id)) {
// //         return sendUsageHint(chatId, command);
// //     }

// //     try {
// //         const result = await paymentController.deleteMultiplePaymentsBot(paymentIds, user._id, user.role === 'superAdmin');
// //         await bot.sendMessage(chatId, `✅ ${result.message}`, { parse_mode: 'Markdown' });
// //     } catch (err) {
// //         bot.sendMessage(chatId, `❌ Failed to delete multiple payments: ${err.message || 'Error'}`);
// //     }
// // }));


// // // /////////////////////////////////////////////

// // console.log('Telegram Bot is running...');