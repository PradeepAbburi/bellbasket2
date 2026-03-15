import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use session persistence to prevent account switching across independent tabs
setPersistence(auth, browserSessionPersistence).catch(console.error);

export const db = getFirestore(app);
export const storage = getStorage(app);

let analyticsInstance: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
    try {
        analyticsInstance = getAnalytics(app);
    } catch (error) {
        console.warn('Analytics unavailable in this environment:', (error as Error).message);
    }
}
export const analytics = analyticsInstance;

let messagingInstance: ReturnType<typeof getMessaging> | null = null;
if (typeof window !== 'undefined') {
    try {
        messagingInstance = getMessaging(app);
    } catch (error) {
        console.warn('Firebase Messaging unavailable in this browser:', (error as Error).message);
    }
}
export const messaging = messagingInstance;
export default app;
