const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const { getMessageEnding, getMainChat, getChats, initializeFirebaseApp } = require('./firebase_tools');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true, // Always keep headless mode true for servers
        executablePath: process.platform === "win32"
            ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"  // Windows Path
            : "/usr/bin/google-chrome-stable",  // Ubuntu Path
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu",
            '--disable-software-rasterizer',
            '--disable-features=site-per-process',
            '--remote-debugging-port=9222', // Useful for debugging
        ]
    }
});




client.on('qr', qr => {
    console.log('Scan this QR Code to login:');
    qrcode.generate(qr, { small: true });
});

const getChatId = async (chatNameToFind) => {
    const chats = await client.getChats();
    const foundChat = chats.find(chat => chat.name.toLowerCase() === chatNameToFind.toLowerCase());
    return foundChat ? foundChat.id._serialized : null;
};

const fetchMessageEnding = async () => {
    let messageEndingText;
    let rawMessageEnding = await getMessageEnding();
    if (rawMessageEnding && typeof rawMessageEnding === 'object') {
        let chatEntries = Object.entries(rawMessageEnding);
        if (chatEntries.length === 1) {
            messageEndingText = "\n\n" + chatEntries[0][1];
        }
    }
    return messageEndingText;
};

const fetchMainChatId = async () => {
    let mainChatId;
    let mainChat = await getMainChat();
    if (mainChat && typeof mainChat === 'object') {
        let chatEntries = Object.entries(mainChat);
        if (chatEntries.length === 1) {
            let [mainChatName, chatId] = chatEntries[0];
            mainChatId = chatId.trim() ? chatId : await getChatId(mainChatName);
        }
    }
    return mainChatId;
};

const fetchTargetChatsIds = async () => {
    let rawChats = await getChats();
    let updatedTargetChats = [];
    if (Array.isArray(rawChats)) {
        for (const obj of rawChats) {
            let chatEntries = Object.entries(obj);
            for (const [chatName, chatId] of chatEntries) {
                let resolvedChatId = chatId.trim() ? chatId : await getChatId(chatName);
                if (resolvedChatId) {
                    updatedTargetChats.push(resolvedChatId);
                } else {
                    console.error(`Failed to resolve ID for chat: ${chatName}`);
                }
            }
        }
    } else {
        console.error("Expected an array from getChats(), but got:", rawChats);
    }
    return updatedTargetChats;
};

let mainChatId;
let targetChats = [];
let messageEnding;
const fetchConfiguration = async () => {
    messageEnding = await fetchMessageEnding();
    mainChatId = await fetchMainChatId();
    targetChats = await fetchTargetChatsIds();

    console.log("Main Chat ID:", mainChatId);
    console.log("Raw Chats from Firebase:", JSON.stringify(targetChats, null, 2));
};

client.on('ready', async () => {
    await fetchConfiguration();
    console.log('WhatsApp bot is running and listening for your messages...');
    
    function scheduleConfigurationFetch() {
        fetchConfiguration();
        setInterval(fetchConfiguration, 2 * 60 * 1000);
    }
    
    scheduleConfigurationFetch();
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

async function getMessageFromChat(messageBody, chatId) {
    messageBody = messageBody.replace(messageEnding, '');
    let chat = await client.getChatById(chatId);
    let messages = await chat.fetchMessages({ limit: 20 });
    return messages.find(m => m.body.replace(messageEnding, '') === messageBody && m.fromMe);
};

client.on('message_create', async message => {
    await sleep(5000);
    if (message.fromMe && message.to === mainChatId) {
        for (const chatId of targetChats) {
            if (message.hasMedia) {
                try {
                    const media = await message.downloadMedia();
                    await client.sendMessage(chatId, media, { caption: message.body + messageEnding });
                    console.log(`Media message forwarded from ${message.to} to ${chatId}`);
                } catch (error) {
                    console.error("Error downloading/sending media:", error);
                }
            } else {
                await client.sendMessage(chatId, message.body + messageEnding);
                console.log(`Message "${message.body}" forwarded from ${message.to} to ${chatId}`);
            }
        }
    }
});

client.on('message_revoke_everyone', async (after, before) => {
    if (before && before.fromMe && (targetChats.includes(before.to) || before.to === mainChatId)) {
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
