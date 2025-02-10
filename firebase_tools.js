const { initializeApp } = require("firebase/app");
const { collection, getFirestore, getDocs, query } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyAslOqXGjXegT_N5NH_dDnQ5e7pPk9WnlE",
  authDomain: "whatsappmanager-726b3.firebaseapp.com",
  projectId: "whatsappmanager-726b3",
  storageBucket: "whatsappmanager-726b3.firebasestorage.app",
  messagingSenderId: "559006427576",
  appId: "1:559006427576:web:c47a1d36d95fb93539c74d",
  measurementId: "G-7ZQKQ2D2D0"
};

let app;
let firestoreDB;

const initializeFirebaseApp = () => {
    if (!app) {
        app = initializeApp(firebaseConfig);
        firestoreDB = getFirestore(app); // Pass the app instance
    }
};

const getChats = async () => {
    if (!firestoreDB) {
        throw new Error("Firestore has not been initialized. Call initializeFirebaseApp() first.");
    }

    const collectionRef = collection(firestoreDB, "target-chats");
    const finalData = [];
    const q = query(collectionRef);

    const docSnap = await getDocs(q);
    docSnap.forEach((doc) => {
        finalData.push(doc.data());
    });
    return finalData;
};

const getMainChat = async () => {
    if (!firestoreDB) {
        throw new Error("Firestore has not been initialized. Call initializeFirebaseApp() first.");
    }

    const collectionRef = collection(firestoreDB, "main-chat");
    const q = query(collectionRef);

    const docSnap = await getDocs(q);

    if (docSnap.empty) {
        throw new Error("No documents found in 'main-chat' collection.");
    }

    let mainChat;

    docSnap.forEach((doc) => {
        mainChat = doc.data();
    });
    return mainChat;
};


initializeFirebaseApp();

module.exports = {
    initializeFirebaseApp,
    getChats,
    getMainChat
};