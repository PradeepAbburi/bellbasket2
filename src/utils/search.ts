import { Product } from '@/types';

export interface ScoredProduct extends Product {
  searchScore: number;
}

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

    // 5. Word-level matching (Must match all query words in name/category/description)
    const matchesAllWords = qWords.every(word => 
      name.includes(word) || category.includes(word) || description.includes(word)
    );

    if (matchesAllWords) {
      score += 20;
      
      // Bonus: If all words in Name
      if (qWords.every(word => name.includes(word))) {
        score += 15;
      }
    }

    // 6. Partial description match (if not already matched)
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
