// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { enableNetwork, getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCIbu8xa9KUgk-W-uYpIamFYYkgMEGHlys",
  authDomain: "apolo-marketplace.firebaseapp.com",
  projectId: "apolo-marketplace",
  storageBucket: "apolo-marketplace.firebasestorage.app",
  messagingSenderId: "721794400455",
  appId: "1:721794400455:web:4dff6f5321ef13cd3abee2"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "linku");

// Asegurar que la red esté habilitada para tiempo real
enableNetwork(db).catch((error) => {
  console.error("Error habilitando red de Firestore:", error);
});

export const storage = getStorage(app);
export const functions = getFunctions(app);