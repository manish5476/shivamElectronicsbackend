const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config({ path: './.env' });

const axios = require('axios');

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Example: /start command
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Welcome manish singh Use /login or /register');
});

const userTokens = {}; // key: chatId, value: token


bot.onText(/\/register (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const args = match[1].split(' '); // e.g. name email password

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
    bot.sendMessage(chatId, `❌ Error: ${err.response.data.msg || 'Failed'}`);
  }
});

bot.onText(/\/login (.+)/, async (msg, match) => {
  console.log(msg,match)
  const chatId = msg.chat.id;
  const args = match[1].split(' '); // email password

  if (args.length < 2) {
    return bot.sendMessage(chatId, 'Usage: /login email password');
  }

  const [email, password] = args;

  try {
    const res = await axios.post('https://shivamelectronicsbackend.onrender.com/api/v1/users/login', {
      email,
      password,
    });

    // Save the token
    userTokens[chatId] = res.data.token;

    bot.sendMessage(chatId, `🔐 Login successful! You're now authenticated.`);
  } catch (err) {
    bot.sendMessage(chatId, `❌ Login failed: ${err.response?.data?.msg || 'Error'}`);
  }
});
 
// bot.onText(/\/login (.+)/, async (msg, match) => {
//   const chatId = msg.chat.id;
//   const args = match[1].split(' '); // email password

//   if (args.length < 2) {
//     return bot.sendMessage(chatId, 'Usage: /login email password');
//   }

//   const [email, password] = args;

//   try {
//     const res = await axios.post('https://shivamelectronicsbackend.onrender.com/api/v1/users/login', {
//       email,
//       password,
//     });

//     // Save the token if you want to use it in future requests (optional)
//     bot.sendMessage(chatId, `🔐 Login successful! Token: ${res.data.token}`);
//   } catch (err) {
//     bot.sendMessage(chatId, `❌ Login failed: ${err.response.data.msg || 'Error'}`);
//   }
// });

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

    const jsonString = JSON.stringify(customer, null, 2); // prettified

    if (jsonString.length <= 4000) {
      await bot.sendMessage(chatId, `📦 *Customer Details:*\n\`\`\`\n${jsonString}\n\`\`\``, {
        parse_mode: 'Markdown',
      });
    } else {
      await bot.sendMessage(chatId, '⚠️ Customer data is too large. Sending as a file instead...');
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, 'customer.json');
      fs.writeFileSync(filePath, JSON.stringify(customer, null, 2));
      await bot.sendDocument(chatId, filePath);
    }

  } catch (err) {
    bot.sendMessage(chatId, `❌ Failed: ${err.response?.data?.msg || 'Error'}`);
  }
});
// ---------------------------------------------
const fs = require('fs');
const path = require('path');

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

  } catch (err) {
    bot.sendMessage(chatId, `❌ Failed: ${err.response?.data?.msg || 'Error'}`);
  }
});

bot.onText(/\/logout/, (msg) => {
  const chatId = msg.chat.id;
  delete userTokens[chatId];
  bot.sendMessage(chatId, '✅ You have been logged out.');
});
