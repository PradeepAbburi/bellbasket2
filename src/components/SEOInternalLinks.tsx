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
  currentCity = 'Geelong',
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
    'Melbourne',
    'Geelong',
    'Sydney',
    'Perth',
    'Brisbane',
    'Adelaide',
    'Gold Coast',
    'Canberra'
  ].filter(c => c.toLowerCase() !== currentCity.toLowerCase());

  return (
    <section className="mt-12 pt-8 border-t-2 border-gray-200 space-y-8 bg-gray-50/50 p-6 rounded-2xl border border-gray-200">
      <div className="flex items-center gap-2">
        <Compass className="w-5 h-5 text-indigo-600" />
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">
          Explore Related Local Searches in {currentCity}
        </h3>
      </div>

      {/* 1. Quick Intent & Category Links */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-pink-500" /> Popular {currentCategory} Intent Searches
        </h4>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/best-${catSlug}-in-${citySlug}`}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-sm"
          >
            Best {currentCategory} in {currentCity}
          </Link>
          <Link
            to={`/${catSlug}-near-me`}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-sm"
          >
            {currentCategory} Near Me
          </Link>
          <Link
            to={`/${catSlug}/${citySlug}`}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-sm"
          >
            Top Rated {currentCategory} {currentCity}
          </Link>
          {subcategories.map(sub => (
            <Link
              key={sub}
              to={`/${catSlug}/${citySlug}/${generateSlug(sub)}`}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-sm"
            >
              {sub} {currentCategory} in {currentCity}
            </Link>
          ))}
        </div>
      </div>

      {/* 2. Other Categories in City */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-amber-500" /> More Business Categories in {currentCity}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {relatedCategories.map(cat => (
            <Link
              key={cat}
              to={`/${generateSlug(cat)}/${citySlug}`}
              className="p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:border-indigo-500 hover:text-indigo-600 transition-colors flex items-center gap-2"
            >
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              <span>{cat} in {currentCity}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* 3. Nearby Stores (if provided) */}
      {nearbyStores.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-emerald-500" /> Nearby Stores in {currentCity}
          </h4>
          <div className="flex flex-wrap gap-2">
            {nearbyStores.map((store, idx) => {
              const storeSlug = generateSlug(store.name, store.city);
              return (
                <Link
                  key={idx}
                  to={`/store/${storeSlug}`}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-800 hover:bg-emerald-50 hover:border-emerald-500 transition-all shadow-sm"
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
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Browse {currentCategory} Across Australia & India
        </h4>
        <div className="flex flex-wrap gap-2 text-xs">
          {popularCities.map(city => (
            <Link
              key={city}
              to={`/${catSlug}/${generateSlug(city)}`}
              className="text-indigo-600 font-medium hover:underline hover:text-indigo-800"
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
