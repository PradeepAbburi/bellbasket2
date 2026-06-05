import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCdi7uT7oCi8Qab-uIfoQb0QNcHmKoEiWc",
  authDomain: "transform-a96c8.firebaseapp.com",
  projectId: "transform-a96c8",
  storageBucket: "transform-a96c8.firebasestorage.app",
  messagingSenderId: "799146176485",
  appId: "1:799146176485:web:4fbad89dfc3c90452d090c",
  measurementId: "G-2LNXBC5DP4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  try {
    const snap = await getDocs(collection(db, 'products'));
    const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    const keywords = ['rice', 'biryani', 'mutton', 'chicken', 'ghee', 'masala', 'oil', 'onion', 'garlic', 'ginger', 'spices', 'curd'];
    const matched = products.filter(p => {
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      return keywords.some(k => name.includes(k) || desc.includes(k) || cat.includes(k));
    });
    
    console.log("Matched Products:", JSON.stringify(matched.map(p => ({ id: p.id, name: p.name, category: p.category, price: p.price })), null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

check();
