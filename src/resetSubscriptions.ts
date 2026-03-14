import { initializeApp } from "firebase/app";
import { getFirestore, doc, collection, getDocs, updateDoc } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB8XXXXXXXXXXXXXXXXXXXXXXX",
    authDomain: "bellbasket-XXXXX.firebaseapp.com",
    projectId: "bellbasket-XXXXX",
    storageBucket: "bellbasket-XXXXX.appspot.com",
    messagingSenderId: "XXXXXXXXXXXXX",
    appId: "1:XXXXXXXXXXXX:web:XXXXXXXXXXXXXXXX"
};

// ** NOTE: This script needs to be run in a browser environment due to Firebase SDK v9. **
// Providing a client-side snippet to run via browser console or a temporary component instead.
