import { db } from './src/lib/firebase';
import { collection, getDocs, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

interface Store {
  id: string;
  name?: string;
  isBlocked?: boolean;
  plan?: string;
  [key: string]: any;
}

async function checkStores() {
  try {
    const snapshot = await getDocs(collection(db, 'stores'));
    const stores: Store[] = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...(doc.data() as DocumentData)
    }) as Store);
    
    const blocked = stores.filter((s: Store) => s.isBlocked);
    console.log("Blocked Stores:", blocked.map((s: Store) => s.name || s.id));
    
    const expired = stores.filter((s: Store) => s.plan === 'none' || !s.plan);
    console.log("Expired Stores:", expired.map((s: Store) => s.name || s.id));
  } catch (error) {
    console.error("Error checking stores:", error);
  }
}

checkStores();
