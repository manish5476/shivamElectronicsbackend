// telegrambot/telegrambot.js

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// --- IMPORTANT: DO NOT load dotenv here. It's loaded in Server.js. ---

// --- 1. Get the bot token from process.env (set by Server.js) ---
const token = process.env.TELEGRAM_TOKEN; // Correct variable name!

// DEBUG: Check if token is available when this module is loaded
console.log(`DEBUG: TELEGRAM_TOKEN value in telegrambot.js: ${token ? 'Loaded' : 'NOT LOADED'}`);

// --- 2. Initialize bot without polling (for webhooks) ---
// The error will occur here if 'token' is undefined/null
const bot = new TelegramBot(token); 

// --- 3. User Tokens Storage ---
const userTokens = {}; // Stores chat ID to user JWT token mapping


// --- 4. Bot Commands ---

// Example: /start command
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Welcome manish singh! Use /login or /register');
});

// /register command
bot.onText(/\/register (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const args = match[1].split(' '); 

    if (args.length < 3) {
        return bot.sendMessage(chatId, 'Usage: /register name email password');
    }

    const [name, email, password] = args;

    try {
        const res = await axios.post('https://shivamelectronicsbackend.onrender.com/api/v1/users/signup', {
            name,
            email,
            password,
        });

        bot.sendMessage(chatId, `✅ Registered! Your token: ${res.data.token}`);
    } catch (err) {
        bot.sendMessage(chatId, `❌ Error: ${err.response?.data?.msg || 'Failed'}`);
    }
});

// /login command
bot.onText(/\/login (.+)/, async (msg, match) => {
    console.log('Login command received:', msg, match);
    const chatId = msg.chat.id;
    const args = match[1].split(' '); 

    if (args.length < 2) {
        return bot.sendMessage(chatId, 'Usage: /login email password');
    }

    const [email, password] = args;

    try {
        const res = await axios.post('https://shivamelectronicsbackend.onrender.com/api/v1/users/login', {
            email,
            password,
        });

        userTokens[chatId] = res.data.token;

        bot.sendMessage(chatId, `🔐 Login successful! You're now authenticated.`);
    } catch (err) {
        bot.sendMessage(chatId, `❌ Login failed: ${err.response?.data?.msg || 'Error'}`);
    }
});

// /getcustomer command
bot.onText(/\/getcustomer (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const mobileNumber = match[1];

    const token = userTokens[chatId];
    if (!token) {
        return bot.sendMessage(chatId, '⚠️ You must login first using /login email password');
    }

    try {
        const res = await axios.get(`https://shivamelectronicsbackend.onrender.com/api/v1/customers?mobileNumber=${mobileNumber}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const customer = res.data?.data?.[0];
        if (!customer) {
            return bot.sendMessage(chatId, 'ℹ️ No customer found with that mobile number.');
        }

        const jsonString = JSON.stringify(customer, null, 2); 

        if (jsonString.length <= 4000) {
            await bot.sendMessage(chatId, `📦 *Customer Details:*\n\`\`\`\n${jsonString}\n\`\`\``, {
                parse_mode: 'Markdown',
            });
        } else {
            await bot.sendMessage(chatId, '⚠️ Customer data is too large. Sending as a file instead...');
            const filePath = path.join(__dirname, 'customer.json');
            fs.writeFileSync(filePath, JSON.stringify(customer, null, 2));
            await bot.sendDocument(chatId, filePath);
            fs.unlinkSync(filePath); 
        }

    } catch (err) {
        console.error('Error in /getcustomer:', err.response?.data || err.message);
        bot.sendMessage(chatId, `❌ Failed: ${err.response?.data?.msg || 'Error'}`);
    }
});

// /getallcustomers command
bot.onText(/\/getallcustomers/, async (msg) => {
    const chatId = msg.chat.id;

    const token = userTokens[chatId];
    if (!token) {
        return bot.sendMessage(chatId, '⚠️ You must login first to access all customers data. Use `/login email password`.');
    }

    try {
        const apiUrl = `https://shivamelectronicsbackend.onrender.com/api/v1/customers`;
        const res = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${token}`, 
            },
        });

        const customers = res.data?.data; 

        if (!customers || customers.length === 0) {
            return bot.sendMessage(chatId, 'ℹ️ No customers found.');
        }

        let responseMessage = '*All Customers:*\n\n';
        let customerCount = 0;
        const maxMessageLength = 4000; 

        for (const customer of customers) {
            const customerSummary = `*Name:* ${customer.fullname || 'N/A'}\n` +
                                    `*Mobile:* ${customer.mobileNumber || 'N/A'}\n` +
                                    `*Email:* ${customer.email || 'N/A'}\n` +
                                    `--------------------------\n`;

            if ((responseMessage + customerSummary).length > maxMessageLength) {
                await bot.sendMessage(chatId, responseMessage, { parse_mode: 'Markdown' });
                responseMessage = customerSummary; 
            } else {
                responseMessage += customerSummary;
            }
            customerCount++;
        }

        if (responseMessage.length > 0) {
            await bot.sendMessage(chatId, responseMessage, { parse_mode: 'Markdown' });
        }
        await bot.sendMessage(chatId, `Total customers found: *${customerCount}*.`);

    } catch (err) {
        console.error('Error fetching all customers for Telegram bot:', err.response?.data || err.message);
        let errorMessage = `❌ Failed to retrieve all customers.`;
        if (err.response?.status === 401 || err.response?.status === 403) {
            errorMessage += `\n*Permission Denied:* You might not have the necessary admin/staff role or your token is invalid. Please ensure you logged in with an admin/staff account.`;
        } else if (err.response?.data?.message) {
            errorMessage += `\nError: ${err.response.data.message}`;
        } else {
            errorMessage += `\nError: ${err.message}`;
        }
        bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown' });
    }
});


// /customer command (original one for file download)
bot.onText(/\/customer (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const mobileNumber = match[1];

    const token = userTokens[chatId];
    if (!token) {
        return bot.sendMessage(chatId, '⚠️ You must login first using /login email password');
    }

    try {
        const res = await axios.get(`https://shivamelectronicsbackend.onrender.com/api/v1/customers?mobileNumber=${mobileNumber}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const customer = res.data?.data?.[0];
        if (!customer) {
            return bot.sendMessage(chatId, 'ℹ️ No customer found with that mobile number.');
        }

        const filePath = path.join(__dirname, `customer_${mobileNumber}.json`);
        fs.writeFileSync(filePath, JSON.stringify(customer, null, 2));

        await bot.sendDocument(chatId, filePath);
        fs.unlinkSync(filePath); 

    } catch (err) {
        console.error('Error in /customer (file):', err.response?.data || err.message);
        bot.sendMessage(chatId, `❌ Failed: ${err.response?.data?.msg || 'Error'}`);
    }
});

// /logout command
bot.onText(/\/logout/, (msg) => {
    const chatId = msg.chat.id;
    delete userTokens[chatId];
    bot.sendMessage(chatId, '✅ You have been logged out.');
});

// --- 5. Export the bot instance for Server.js to use ---
module.exports = bot;