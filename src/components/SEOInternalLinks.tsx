import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Navigation, Tag, Building2, Compass, Layers } from 'lucide-react';
import { generateSlug } from '@/utils/seo';

interface SEOInternalLinksProps {
  currentCity?: string;
  currentCategory?: string;
  currentSubcategory?: string;
  nearbyStores?: Array<{ name: string; city: string; category?: string }>;
}

export const SEOInternalLinks: React.FC<SEOInternalLinksProps> = ({
  currentCity = 'Kakinada',
  currentCategory = 'Restaurants',
  currentSubcategory,
  nearbyStores = []
}) => {
  const citySlug = generateSlug(currentCity);
  const catSlug = generateSlug(currentCategory);

  const relatedCategories = [
    'Restaurants',
    'Cafes',
    'Electronics',
    'Pharmacies',
    'Grocery',
    'Hotels',
    'Clothing',
    'Salons & Spa'
  ].filter(c => c.toLowerCase() !== currentCategory.toLowerCase());

  const subcategories = [
    'Indian',
    'Chinese',
    'Italian',
    'Pizza',
    'Burgers',
    'Bakery',
    'Organic',
    'Fast Food'
  ];

  const popularCities = [
    'Kakinada',
    'Rajahmundry',
    'Samalkot',
    'Peddapuram',
    'Amalapuram',
    'Tuni',
    'Geelong',
    'Melbourne',
    'Sydney'
  ].filter(c => c.toLowerCase() !== currentCity.toLowerCase());

  return (
    <section className="mt-12 pt-8 border-t-2 border-border space-y-8 bg-background/50 p-6 rounded-2xl border border-border">
      <div className="flex items-center gap-2">
        <Compass className="w-5 h-5 text-amber-500" />
        <h3 className="text-xl font-bold text-foreground tracking-tight">
          Explore Related Local Searches in {currentCity}
        </h3>
      </div>

      {/* 1. Quick Intent & Category Links */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-amber-500" /> Popular {currentCategory} Intent Searches
        </h4>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/best-${catSlug}-in-${citySlug}`}
            className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm font-medium text-foreground hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-600 transition-all shadow-sm"
          >
            Best {currentCategory} in {currentCity}
          </Link>
          <Link
            to={`/${catSlug}-near-me`}
            className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm font-medium text-foreground hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-600 transition-all shadow-sm"
          >
            {currentCategory} Near Me
          </Link>
          <Link
            to={`/${catSlug}/${citySlug}`}
            className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm font-medium text-foreground hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-600 transition-all shadow-sm"
          >
            Top Rated {currentCategory} {currentCity}
          </Link>
          {subcategories.map(sub => (
            <Link
              key={sub}
              to={`/${catSlug}/${citySlug}/${generateSlug(sub)}`}
              className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm font-medium text-foreground hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-600 transition-all shadow-sm"
            >
              {sub} {currentCategory} in {currentCity}
            </Link>
          ))}
        </div>
      </div>

      {/* 2. Other Categories in City */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-amber-500" /> More Business Categories in {currentCity}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {relatedCategories.map(cat => (
            <Link
              key={cat}
              to={`/${generateSlug(cat)}/${citySlug}`}
              className="p-2.5 bg-background border border-border rounded-lg text-xs font-medium text-foreground hover:border-amber-500 hover:text-amber-600 transition-colors flex items-center gap-2"
            >
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{cat} in {currentCity}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* 3. Nearby Stores (if provided) */}
      {nearbyStores.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-emerald-500" /> Nearby Stores in {currentCity}
          </h4>
          <div className="flex flex-wrap gap-2">
            {nearbyStores.map((store, idx) => {
              const storeSlug = generateSlug(store.name, store.city);
              return (
                <Link
                  key={idx}
                  to={`/store/${storeSlug}`}
                  className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-medium text-foreground hover:bg-emerald-500/10 hover:border-emerald-500 transition-all shadow-sm"
                >
                  {store.name} ({store.city})
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Top Cities Navigation */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-amber-500" /> Browse {currentCategory} Across Locations
        </h4>
        <div className="flex flex-wrap gap-2 text-xs">
          {popularCities.map(city => (
            <Link
              key={city}
              to={`/${catSlug}/${generateSlug(city)}`}
              className="text-amber-600 font-medium hover:underline hover:text-amber-700"
            >
              {currentCategory} in {city} •
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SEOInternalLinks;
