// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// 🔹 Use your Firebase SDK config here
const firebaseConfig = {
  apiKey: "AIzaSyCzVSP_hSQV3px36LwrcIrdKskbYCbkXo8",
  authDomain: "streamlite-6814b.firebaseapp.com",
  projectId: "streamlite-6814b",
  storageBucket: "streamlite-6814b.firebasestorage.app",
  messagingSenderId: "64626871662",
  appId: "1:64626871662:web:4083e55f3c394cb0d8c57f",
  measurementId: "G-VV3V9GCKC3"
};

const app = initializeApp(firebaseConfig);

// Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Functions
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);
