const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

client.on('qr', qr => {
    console.log('Scan this QR Code to login:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp bot is running and listening for your messages...');
});

const monitoredChats = [
    '120363379376159101@g.us',
    '120363322327634657@g.us'
];

let targetChats = [
    '120363379376159101@g.us',
    '120363322327634657@g.us'
];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getMessageFromChat(messageBody, chatId) {
    let chat = await client.getChatById(chatId);
    let messages = await chat.fetchMessages({ limit: 50 });
    return messages.find(m => m.body === messageBody && m.fromMe);
}

async function shouldSendMessage(messageBody, chatId) {
    message = await getMessageFromChat(messageBody, chatId);
    return !message;
}

client.on('message_create', async message => {
    await sleep(5000);
    if (message.fromMe && monitoredChats.includes(message.to)) {
        console.log(`Monitored a message from ${message.to}: ${message.body}`);
        for (const chatId of targetChats) {
            if (await shouldSendMessage(message.body, chatId)) {
                await client.sendMessage(chatId, message.body);
                console.log(`Message forwarded to ${chatId}`);
            }
        }
    }
});

client.on('message_revoke_everyone', async (after, before) => {
    if (before && before.fromMe && monitoredChats.includes(before.to)) {
        console.log(`Message deleted in monitored chat: ${before.body}`);
        for (const chatId of targetChats) {
            try {
                let messageToDelete = getMessageFromChat(before.body, chatId);
                if (messageToDelete) {
                    await messageToDelete.delete(true);
                    console.log(`Deleted message in ${chatId}`);
                }
            } catch (err) {
                console.error(`Error deleting message in ${chatId}:`, err);
            }
        }
    }
});

client.initialize();
