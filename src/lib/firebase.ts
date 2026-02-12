import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase (Singleton pattern)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Configure Auth persistence for WebView compatibility
// Use browserLocalPersistence instead of IndexedDB for better mobile WebView support
if (typeof window !== "undefined") {
    setPersistence(auth, browserLocalPersistence).catch((error) => {
        console.error("Error setting auth persistence:", error);
    });
}

// Analytics support (client-side only)
let analytics;
if (typeof window !== "undefined") {
    import("firebase/analytics").then(({ getAnalytics }) => {
        analytics = getAnalytics(app);
    });
}

export { app, auth, db, storage, analytics };
