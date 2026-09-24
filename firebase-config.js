import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";

let firebaseConfig = {
    apiKey: "AIzaSyDD3ouvrsyqwxorPWlQdKPgZACjUO5TiWs",
    authDomain: "ali-elsewedy-media.firebaseapp.com",
    projectId: "ali-elsewedy-media",
    storageBucket: "ali-elsewedy-media.firebasestorage.app",
    messagingSenderId: "721258793080",
    appId: "1:721258793080:web:968f77abee49198fa3c58d",
    measurementId: "G-1CNDBSB0P4"
};

try {
    const res = await fetch('/api/firebase-config');
    if (res.ok) {
        const serverConfig = await res.json();
        if (serverConfig && serverConfig.apiKey) {
            firebaseConfig = serverConfig;
        }
    }
} catch (err) {
    // Keep fallback config
}

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export {
    collection, addDoc, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc, onSnapshot,
    onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword,
    ref, uploadBytes, getDownloadURL
};
