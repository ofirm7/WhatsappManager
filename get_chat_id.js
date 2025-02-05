const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const prompt = require('prompt-sync')();

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

client.on('qr', qr => {
    console.log('Scan this QR Code to login:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    readline.question('Enter chat name: ', async chatNameToFind => {
        const chats = await client.getChats();
        console.log('Received chats!')
        
        const foundChat = chats.find(chat => chat.name.toLowerCase() === chatNameToFind.toLowerCase());
        
        if (foundChat) {
            console.log(`Found chat: ${foundChat.name}`);
            console.log(`Chat ID: ${foundChat.id._serialized}`);
        } else {
            console.log('Chat not found.');
        }
        readline.close();
    });
});

client.initialize()