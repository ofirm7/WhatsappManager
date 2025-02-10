const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const { getMainChat, getChats, initializeFirebaseApp } = require('./firebase_tools');

let messageEnding = null;
fs.readFile('message_ending.txt', 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    console.log('Check if the file "message_ending.txt" exists.');
    return;
  }
  messageEnding = '\n\n' + data.split('\n').map(line => line.trim()).join('');
});

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

client.on('qr', qr => {
  console.log('Scan this QR Code to login:');
  qrcode.generate(qr, { small: true });
});

const getChatId = async (chatNameToFind) => {
    const chats = await client.getChats();
    const foundChat = chats.find(chat => chat.name.toLowerCase() === chatNameToFind.toLowerCase());
    if (foundChat) {
        return foundChat.id._serialized;
    } else {
        console.log(`Chat not found: ${chatNameToFind}!`);
        return null;
    }
};

let mainChatId;
let targetChats = [];

client.on('ready', async () => {
    console.log('WhatsApp bot is running and listening for your messages...');

    // Fetch and process Main Chat
    let rawMainChat = await getMainChat();
    if (rawMainChat && typeof rawMainChat === 'object') {
        let chatEntries = Object.entries(rawMainChat);
        if (chatEntries.length === 1) {
            let [mainChatName, chatId] = chatEntries[0];
            mainChatId = chatId.trim() ? chatId : await getChatId(mainChatName);
        }
    }
    console.log("Main Chat ID:", mainChatId);

    // Fetch and process Monitored Chats
    let rawChats = await getChats();
    console.log("Raw Chats from Firebase:", JSON.stringify(rawChats, null, 2));

    let updatedtargetChats = [];

    if (Array.isArray(rawChats)) {
        for (const obj of rawChats) {
            let chatEntries = Object.entries(obj); // Extract key-value pairs

            for (const [chatName, chatId] of chatEntries) {
                let resolvedChatId = chatId.trim() ? chatId : await getChatId(chatName);

                if (resolvedChatId) {
                    updatedtargetChats.push(resolvedChatId);
                } else {
                    console.error(`Failed to resolve ID for chat: ${chatName}`);
                }
            }
        }
    } else {
        console.error("Expected an array from getChats(), but got:", rawChats);
    }

    targetChats = updatedtargetChats;
    console.log("Final target Chats:", targetChats);
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getMessageFromChat(messageBody, chatId) {
    messageBody = messageBody.replace(messageEnding, '');
    let chat = await client.getChatById(chatId);
    let messages = await chat.fetchMessages({ limit: 20 });
    return messages.find(m => m.body.replace(messageEnding, '') === messageBody && m.fromMe);
}

async function isMessageInChat(messageBody, chatId) {
    let foundMessage = await getMessageFromChat(messageBody, chatId);
    return foundMessage;
}

client.on('message_create', async message => {
    await sleep(5000);
    if (message.fromMe && message.to === mainChatId) {
        for (const chatId of targetChats) {
            await client.sendMessage(chatId, message.body + messageEnding);
            console.log(`Message "${message.body}" forwarded from ${message.to} to ${chatId}`);
        }
    }
});

client.on('message_revoke_everyone', async (after, before) => {
    if (before && before.fromMe && (targetChats.includes(before.to) | before.to === mainChatId)) {
        for (const chatId of targetChats) {
            try {
                let messageToDelete = await getMessageFromChat(before.body, chatId);
                if (messageToDelete) {
                    await messageToDelete.delete(true);
                    console.log(`Deleted the message "${before.body}" in ${chatId}`);
                }
            } catch (err) {
                console.error(`Error deleting the message "${before.body}" in ${chatId}:`, err);
            }
        }
    }
});

client.initialize();
