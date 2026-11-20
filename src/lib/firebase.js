// Firebase setup. All keys come from the .env file (see .env.example).
// Note: Firebase web config values are NOT secrets (they identify your project).
// What actually protects your data are the Firestore Security Rules (firestore.rules).
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// If any value is missing we show a friendly setup screen instead of a blank page.
const missing = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const firebaseConfigError = missing.length
  ? `Missing Firebase settings: ${missing.join(", ")}`
  : "";

const app = firebaseConfigError ? null : initializeApp(firebaseConfig);

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

export const googleProvider = new GoogleAuthProvider();
// Always let the student choose which Google account to use.
googleProvider.setCustomParameters({ prompt: "select_account" });
