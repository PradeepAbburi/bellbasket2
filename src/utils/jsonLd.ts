import { StoreSEOInput, generateSlug } from './seo';

export interface ReviewItem {
  id?: string;
  userName: string;
  rating: number;
  text?: string;
  createdAt?: string;
}

export interface ProductItem {
  id?: string;
  name: string;
  description?: string;
  price?: number;
  image?: string;
}

/**
 * Requirement 4: Build JSON-LD Structured Data for Store Pages
 * Supports LocalBusiness, Restaurant, Store, Product, Review, AggregateRating, Breadcrumb
 */
export const buildStoreJsonLd = (
  store: StoreSEOInput,
  products: ProductItem[] = [],
  reviews: ReviewItem[] = []
) => {
  const slug = store.id || generateSlug(store.name, store.city);
  const storeUrl = `https://bellbasket.com/store/${slug}`;
  
  // Decide schema type based on category
  const lowerCat = (store.category || '').toLowerCase();
  let schemaType = 'LocalBusiness';
  if (lowerCat.includes('restaurant') || lowerCat.includes('food') || lowerCat.includes('cafe') || lowerCat.includes('pizza')) {
    schemaType = 'Restaurant';
  } else if (lowerCat.includes('store') || lowerCat.includes('shop') || lowerCat.includes('electronics') || lowerCat.includes('grocery')) {
    schemaType = 'Store';
  }

  const baseSchema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    '@id': storeUrl,
    name: store.name,
    url: storeUrl,
    telephone: store.phone || '',
    image: store.coverImage || store.logo ? [store.coverImage || store.logo] : [],
    description: store.description || `${store.name} in ${store.city}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: store.address || store.city,
      addressLocality: store.city,
      addressRegion: store.state || '',
      addressCountry: store.country || 'India'
    }
  };

  if (store.website) {
    baseSchema.sameAs = [store.website];
  }

  // Aggregate Rating
  if (store.rating && store.rating > 0) {
    baseSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: store.rating.toFixed(1),
      reviewCount: store.reviewCount || reviews.length || 1,
      bestRating: '5',
      worstRating: '1'
    };
  }

  // Individual Reviews
  if (reviews.length > 0) {
    baseSchema.review = reviews.map(r => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: r.userName
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.rating,
        bestRating: '5',
        worstRating: '1'
      },
      reviewBody: r.text || '',
      datePublished: r.createdAt || new Date().toISOString()
    }));
  }

  // Products / Menu Items
  if (products.length > 0) {
    baseSchema.hasMenu = {
      '@type': 'Menu',
      name: `${store.name} Products & Services`,
      hasMenuItem: products.map(p => ({
        '@type': 'MenuItem',
        name: p.name,
        description: p.description || '',
        offers: p.price ? {
          '@type': 'Offer',
          price: p.price,
          priceCurrency: 'INR'
        } : undefined
      }))
    };
  }

  // Breadcrumb List Schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://bellbasket.com'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: store.city,
        item: `https://bellbasket.com/city/${generateSlug(store.city)}`
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: store.category,
        item: `https://bellbasket.com/${generateSlug(store.category)}/${generateSlug(store.city)}`
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: store.name,
        item: storeUrl
      }
    ]
  };

  return [baseSchema, breadcrumbSchema];
};

/**
 * Build JSON-LD ItemList Schema for Category & City Landing Pages
 */
export const buildCategoryCityJsonLd = (
  category: string,
  city: string,
  stores: StoreSEOInput[]
) => {
  const categorySlug = generateSlug(category);
  const citySlug = generateSlug(city);
  const pageUrl = `https://bellbasket.com/${categorySlug}/${citySlug}`;

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Best ${category} in ${city}`,
    url: pageUrl,
    numberOfItems: stores.length,
    itemListElement: stores.map((s, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: s.name,
      url: `https://bellbasket.com/store/${generateSlug(s.name, s.city)}`
    }))
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://bellbasket.com'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: city,
        item: `https://bellbasket.com/city/${citySlug}`
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${category} in ${city}`,
        item: pageUrl
      }
    ]
  };

  return [itemListSchema, breadcrumbSchema];
};
