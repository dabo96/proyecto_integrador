// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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