// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";

import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { ENV } from "./env";
import { getFirestore } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
  apiKey: ENV.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: ENV.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: ENV.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: ENV.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: ENV.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: ENV.NEXT_PUBLIC_FIREBASE_APP_ID!,
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };


