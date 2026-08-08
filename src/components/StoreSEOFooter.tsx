import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Clock, Star, Store, Tag, Sparkles, Navigation, ChevronRight, ShieldCheck, Heart } from 'lucide-react';
import { generateSlug, generateSEOContent } from '@/utils/seo';

interface StoreSEOFooterProps {
  store: {
    id: string;
    name: string;
    category?: string;
    subcategory?: string;
    city?: string;
    district?: string;
    mandal?: string;
    address?: string;
    phone?: string;
    rating?: number;
    reviewCount?: number;
    reviews?: any[];
    image?: string;
    slug?: string;
    openingHours?: string;
    isBlocked?: boolean;
  };
  nearbyStores?: Array<{
    id: string;
    name: string;
    city?: string;
    district?: string;
    category?: string;
    rating?: number;
    slug?: string;
    image?: string;
  }>;
}

const getStorePlace = (s: any): string => {
  if (s.city && s.city.trim()) return s.city.trim();
  if (s.district && s.district.trim()) return s.district.trim();
  if (s.mandal && s.mandal.trim()) return s.mandal.trim();
  if (s.address && s.address.trim()) {
    const knownPlaces = ['Kakinada', 'Rajahmundry', 'Samalkot', 'Peddapuram', 'Amalapuram', 'Tuni', 'Ramachandrapuram', 'Mandapeta', 'Visakhapatnam', 'Vijayawada', 'Geelong', 'Melbourne', 'Sydney'];
    for (const place of knownPlaces) {
      if (s.address.toLowerCase().includes(place.toLowerCase())) {
        return place;
      }
    }
    const parts = s.address.split(',').map((p: string) => p.trim());
    if (parts.length > 1) {
      const candidate = parts[parts.length - 2] || parts[0];
      if (candidate && !/\d{5,}/.test(candidate)) return candidate;
    }
    return parts[0];
  }
  return 'Kakinada';
};

export const StoreSEOFooter: React.FC<StoreSEOFooterProps> = ({ store, nearbyStores = [] }) => {
  const townName = getStorePlace(store);
  const categoryName = store.category || 'Grocery';
  const locality = store.address ? store.address.split(',')[0].trim() : townName;

  const citySlug = generateSlug(townName);
  const catSlug = generateSlug(categoryName);
  const storeSlug = store.slug || generateSlug(store.name, townName);

  // Generate unique SEO paragraph for this store location
  const uniqueSeoText = generateSEOContent({
    id: store.id,
    name: store.name,
    category: categoryName,
    city: townName,
    address: store.address,
    phone: store.phone,
    rating: store.rating,
    reviewCount: store.reviewCount || (store.reviews ? store.reviews.length : 0)
  });

  const localKeywords = [
    `${store.name} ${townName}`,
    `${store.name} contact number`,
    `${store.name} address ${locality}`,
    `best ${categoryName.toLowerCase()} in ${townName}`,
    `${categoryName.toLowerCase()} near me in ${locality}`,
    `Kirana store online ${townName}`,
    `BellBasket ${store.name}`,
    `store pickup ${townName}`
  ];

  // Clean markdown hashes from SEO text
  const seoParagraphs = uniqueSeoText
    .split('\n')
    .map(line => line.replace(/^###\s*/, '').trim())
    .filter(Boolean);

  return (
    <div className="w-full bg-[#0a0a0c]/95 text-slate-200 border-t border-amber-500/20 shadow-2xl pt-12 pb-12 transition-all relative overflow-hidden">
      {/* Top Ambient Glow Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500/40 via-yellow-400/50 to-emerald-500/40 shadow-md" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

        {/* Store Specific Header Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-500/15 via-[#18181b] to-emerald-500/15 border border-amber-500/20 shadow-xl backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-500/30">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" /> {townName} Store Guide
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
                  <Tag className="w-3.5 h-3.5 text-emerald-400" /> {categoryName}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {store.name} - Official Store Directory in {townName}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                {store.address ? `Located at ${store.address}` : `Serving customers across ${townName}`}. 
                View verified phone number ({store.phone || 'N/A'}), pickup timings, ratings, and active catalog on BellBasket.
              </p>
            </div>

            {/* Quick Action Links */}
            <div className="flex flex-wrap gap-2 shrink-0">
              <a
                href={`/stores/${storeSlug}/reviews`}
                className="px-4 py-2.5 rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all shadow-lg flex items-center gap-1.5"
              >
                <Star className="w-4 h-4 fill-current text-slate-950" /> Store Reviews
              </a>
              <a
                href={`/city/${citySlug}`}
                className="px-4 py-2.5 rounded-2xl bg-[#27272a] hover:bg-[#3f3f46] text-white font-bold text-xs border border-white/10 transition-all flex items-center gap-1.5"
              >
                <MapPin className="w-4 h-4 text-emerald-400" /> All {townName} Stores
              </a>
            </div>
          </div>
        </div>

        {/* 2-Column Grid: Left = Detailed SEO Text & Location Details | Right = Town Links & Nearby Stores */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left 2 Cols: Dynamic Location SEO Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-[#18181b]/90 border border-amber-500/20 shadow-xl backdrop-blur-md space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
                <Store className="w-5 h-5 text-amber-400" /> About {store.name} in {townName}
              </h3>
              <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
                {seoParagraphs.map((para, idx) => (
                  <p key={idx} className={para.startsWith('About') || para.startsWith('Services') || para.startsWith('Location') || para.startsWith('Why Choose') ? 'font-bold text-amber-300 text-sm pt-2' : ''}>
                    {para}
                  </p>
                ))}
              </div>
            </div>

            {/* Store Specific Details Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-[#18181b]/80 border border-white/10 hover:border-amber-500/30 transition-all flex items-start gap-3">
                <MapPin className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Address</h4>
                  <p className="text-xs text-slate-300 mt-1">{store.address || `${townName}, India`}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#18181b]/80 border border-white/10 hover:border-emerald-500/30 transition-all flex items-start gap-3">
                <Phone className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Contact Phone</h4>
                  <p className="text-xs text-slate-300 mt-1">{store.phone || 'Available via BellBasket App'}</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#18181b]/80 border border-white/10 hover:border-amber-500/30 transition-all flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Store Timings</h4>
                  <p className="text-xs text-slate-300 mt-1">{store.openingHours || 'Open Daily: 08:00 AM - 10:00 PM'}</p>
                </div>
              </div>
            </div>

            {/* Local Search Keyword Tags */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-400" /> Local Search Keywords for {store.name}
              </h4>
              <div className="flex flex-wrap gap-2">
                {localKeywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full bg-[#18181b] border border-white/10 text-[11px] text-amber-200/80 font-medium"
                  >
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Col: Other Stores in {townName} & Category Links */}
          <div className="space-y-6">
            
            {/* Nearby Stores in same town */}
            <div className="p-6 rounded-3xl bg-[#18181b]/90 border border-amber-500/20 shadow-xl backdrop-blur-md space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
                <Navigation className="w-4 h-4 text-emerald-400" /> More Stores in {townName}
              </h3>
              
              {(() => {
                const validLocationStores = nearbyStores.filter((s) => {
                  if (s.id === store.id) return false;
                  const sPlace = getStorePlace(s).toLowerCase().trim();
                  const tPlace = townName.toLowerCase().trim();
                  return sPlace === tPlace || sPlace.includes(tPlace) || tPlace.includes(sPlace) || (s.city && store.city && s.city.toLowerCase() === store.city.toLowerCase());
                });

                if (validLocationStores.length === 0) {
                  return (
                    <div className="p-4 rounded-2xl bg-[#09090b] border border-white/10 text-xs space-y-2">
                      <p className="text-slate-400">
                        No other stores currently listed in <strong className="text-white">{townName}</strong>.
                      </p>
                      <a
                        href="/auth?role=vendor"
                        className="inline-flex items-center gap-1 text-amber-400 font-bold hover:underline"
                      >
                        <span>Own a store in {townName}? Register on BellBasket →</span>
                      </a>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2.5">
                    {validLocationStores.slice(0, 6).map((otherStore) => {
                      const oSlug = otherStore.slug || generateSlug(otherStore.name, otherStore.city || townName);
                      const oPlace = getStorePlace(otherStore);
                      return (
                        <Link
                          key={otherStore.id}
                          to={`/stores/${oSlug}`}
                          className="p-3.5 rounded-2xl bg-[#09090b] hover:bg-[#27272a] border border-white/10 hover:border-emerald-500/50 transition-all flex items-center justify-between group shadow-sm"
                        >
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 truncate">
                              {otherStore.name}
                            </h4>
                            <span className="text-[10px] text-slate-400">
                              {otherStore.category || categoryName} • {oPlace}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 shrink-0 ml-2" />
                        </Link>
                      );
                    })}
                  </div>
                );
              })()}

              <Link
                to={`/city/${citySlug}`}
                className="mt-2 text-xs font-bold text-amber-400 hover:underline inline-flex items-center gap-1 pt-2"
              >
                <span>View all businesses in {townName}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Category Landing Pages */}
            <div className="p-6 rounded-3xl bg-[#18181b]/90 border border-amber-500/20 shadow-xl backdrop-blur-md space-y-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
                <Tag className="w-4 h-4 text-amber-400" /> Related {categoryName} Pages
              </h3>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <Link to={`/category/${catSlug}`} className="text-slate-300 hover:text-amber-400 transition-colors flex items-center gap-1.5">
                    <ChevronRight className="w-3 h-3 text-amber-400" /> {categoryName} Marketplace
                  </Link>
                </li>
                <li>
                  <Link to={`/${catSlug}/${citySlug}`} className="text-slate-300 hover:text-amber-400 transition-colors flex items-center gap-1.5">
                    <ChevronRight className="w-3 h-3 text-amber-400" /> {categoryName} in {townName}
                  </Link>
                </li>
                <li>
                  <Link to={`/best-${catSlug}-in-${citySlug}`} className="text-slate-300 hover:text-amber-400 transition-colors flex items-center gap-1.5">
                    <ChevronRight className="w-3 h-3 text-amber-400" /> Best {categoryName} in {townName}
                  </Link>
                </li>
                <li>
                  <Link to={`/${catSlug}-near-me`} className="text-slate-300 hover:text-amber-400 transition-colors flex items-center gap-1.5">
                    <ChevronRight className="w-3 h-3 text-amber-400" /> {categoryName} Near Me
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {store.name} on BellBasket. All store details verified.</p>
          <div className="flex items-center gap-4">
            <Link to="/sitemap" className="hover:text-slate-300 transition-colors">Sitemap</Link>
            <a href="/sitemap.xml" className="hover:text-slate-300 transition-colors font-mono">sitemap.xml</a>
            <Link to="/privacy" className="hover:text-slate-300 transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreSEOFooter;
