import { Product } from '@/types';
import { collection, query, where, getDocs, limit, or } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ScoredProduct extends Product {
  searchScore: number;
}

/**
 * Server-side search for products.
 * Fetches products from Firestore based on the query, category, and optionally restricted to specific vendors.
 */
export const searchProductsOnServer = async (searchTerm: string, category?: string | null, vendorIds?: string[], maxResults: number = 100): Promise<Product[]> => {
  if (!searchTerm.trim() && !category && (!vendorIds || vendorIds.length === 0)) return [];

  try {
    const productsRef = collection(db, 'products');
    let firestoreQuery;

    // Hyperlocal optimized query: If we have vendor IDs from the area, fetch their products first
    if (vendorIds && vendorIds.length > 0) {
      // Note: Firestore 'in' query supports max 30 values.
      // If we have more, we take the first 30 (top stores)
      const targetVendors = vendorIds.slice(0, 30);
      
      if (category) {
        firestoreQuery = query(
          productsRef,
          where('vendorId', 'in', targetVendors),
          where('category', '==', category),
          limit(maxResults)
        );
      } else {
        firestoreQuery = query(
          productsRef,
          where('vendorId', 'in', targetVendors),
          limit(maxResults)
        );
      }
    } else if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      // Global fallback search
      firestoreQuery = query(
        productsRef,
        or(
          where('category', '==', q),
          where('name', '>=', searchTerm),
          where('name', '<=', searchTerm + '\uf8ff')
        ),
        limit(maxResults)
      );
    } else if (category) {
      firestoreQuery = query(
        productsRef,
        where('category', '==', category),
        limit(maxResults)
      );
    } else {
      return [];
    }

    const snapshot = await getDocs(firestoreQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Product));
  } catch (error) {
    console.error("Server search failed:", error);
    return [];
  }
};

/**
 * Smart search for products based on multiple fields and relevance scoring.
 * Matches by exact phrase, all words, or category.
 */
export const smartSearchProducts = (products: Product[], query: string): ScoredProduct[] => {
  if (!query.trim()) {
    return products.map(p => ({ ...p, searchScore: 1 }));
  }

  const q = query.toLowerCase().trim();
  const qWords = q.split(/\s+/).filter(w => w.length > 0);

  const results: ScoredProduct[] = [];

  for (const p of products) {
    let score = 0;
    const name = (p.name || '').toLowerCase();
    const category = (p.category || '').toLowerCase();
    const description = (p.description || '').toLowerCase();
    const storeName = ((p as any).storeName || '').toLowerCase();

    // 1. Exact Name Match (Highest priority)
    if (name === q) {
      score += 100;
    } 
    // 2. Exact Name Start
    else if (name.startsWith(q)) {
      score += 50;
    }
    // 3. Exact Phrase in Name
    else if (name.includes(q)) {
      score += 30;
    }

    // 4. Exact Category Match
    if (category === q) {
      score += 40;
    } else if (category.includes(q)) {
      score += 15;
    }

    // 5. Store Name Match
    if (storeName === q) {
      score += 60;
    } else if (storeName.includes(q)) {
      score += 25;
    }

    // 6. Word-level matching (Must match all query words in name/category/description/storeName)
    const matchesAllWords = qWords.every(word => 
      name.includes(word) || category.includes(word) || description.includes(word) || storeName.includes(word)
    );

    if (matchesAllWords) {
      score += 20;
      
      // Bonus: If all words in Name
      if (qWords.every(word => name.includes(word))) {
        score += 15;
      }
    }

    // 7. Partial description match (if not already matched)
    if (score === 0 && description.includes(q)) {
      score += 5;
    }

    if (score > 0) {
      results.push({ ...p, searchScore: score });
    }
  }

  // Sort by score descending, then name alphabetically
  return results.sort((a, b) => {
    if (b.searchScore !== a.searchScore) {
      return b.searchScore - a.searchScore;
    }
    return a.name.localeCompare(b.name);
  });
};
