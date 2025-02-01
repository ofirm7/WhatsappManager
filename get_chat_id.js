const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

// Generate QR Code for login
client.on('qr', qr => {
    console.log('Scan this QR Code to login:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('Bot is ready! Searching for chat...');

    const chatNameToFind = 'בדיקה 2'; // Change this to the contact or group name
    const chats = await client.getChats();

    const foundChat = chats.find(chat => chat.name.toLowerCase() === chatNameToFind.toLowerCase());

    if (foundChat) {
        console.log(`Found chat: ${foundChat.name}`);
        console.log(`Chat ID: ${foundChat.id._serialized}`);
    } else {
        console.log('Chat not found.');
    }
});

client.initialize()