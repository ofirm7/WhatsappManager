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
    '120363322327634657@g.us'
];

let targetChats = [
    '120363379376159101@g.us',
    '120363322327634657@g.us'
];

function getFilteredTargetChats(originalTargetChats, monitoredChatId) {
    return originalTargetChats.filter(chatId => chatId !== monitoredChatId);
}

client.on('message_create', async message => {
    if (message.fromMe && monitoredChats.includes(message.to)) {console.log(`Monitored a message from ${message.to}: ${message.body}`);

        // Remove the monitored chat from the target chats
        const filteredTargetChats = getFilteredTargetChats(targetChats, message.to);

        // Forward message to the filtered list of target chats
        for (const chatId of filteredTargetChats) {
            await client.sendMessage(chatId, `${message.body}`);
            console.log(`Message forwarded to ${chatId}`);
        }
    }
});

// Start the bot
client.initialize();
