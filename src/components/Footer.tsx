import React from 'react';
import { Link } from 'react-router-dom';
import { Store, MapPin, Tag, ShieldCheck, Sparkles, Globe, Navigation, Building2, ChevronRight } from 'lucide-react';
import { generateSlug } from '@/utils/seo';

interface FooterStoreInfo {
  id?: string;
  name?: string;
  city?: string;
  district?: string;
  mandal?: string;
  category?: string;
  address?: string;
  slug?: string;
}

interface FooterProps {
  currentStore?: FooterStoreInfo;
  nearbyStores?: Array<{ id?: string; name: string; city?: string; slug?: string; category?: string }>;
}

const AP_CITIES = [
  'Kakinada', 'Rajahmundry', 'Visakhapatnam', 'Vijayawada', 'Guntur',
  'Tirupati', 'Nellore', 'Kurnool', 'Eluru', 'Ongole', 'Anantapur',
  'Amalapuram', 'Samalkot', 'Peddapuram', 'Mandapeta', 'Ramachandrapuram',
  'Tuni', 'Bhimavaram', 'Tenali', 'Machilipatnam', 'Vizianagaram', 'Kadapa'
];

const TELANGANA_CITIES = [
  'Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam',
  'Ramagundam', 'Mahbubnagar', 'Nalgonda', 'Siddipet', 'Suryapet'
];

const INDIA_METROS = [
  'Bengaluru', 'Chennai', 'Mumbai', 'Delhi', 'Pune', 'Kolkata', 'Ahmedabad', 'Geelong', 'Melbourne', 'Sydney'
];

const POPULAR_CATEGORIES = ['Restaurants', 'Grocery', 'Electronics', 'Pharmacies', 'Hotels', 'Salons', 'Clothing'];

const getStorePlace = (s?: FooterStoreInfo): string => {
  if (!s) return 'Kakinada';
  if (s.city && s.city.trim()) return s.city.trim();
  if (s.district && s.district.trim()) return s.district.trim();
  if (s.mandal && s.mandal.trim()) return s.mandal.trim();
  if (s.address && s.address.trim()) {
    const knownPlaces = [...AP_CITIES, ...TELANGANA_CITIES, ...INDIA_METROS];
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

export const Footer: React.FC<FooterProps> = ({ currentStore, nearbyStores = [] }) => {
  const currentYear = new Date().getFullYear();

  const city = getStorePlace(currentStore);
  const category = currentStore?.category || 'Grocery';
  const citySlug = generateSlug(city);
  const catSlug = generateSlug(category);

  return (
    <footer className="mt-16 bg-[#09090b] text-slate-300 border-t border-amber-500/20 shadow-2xl relative z-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">

        {/* Dynamic Section: Store Town / Place Tags & Nearby Stores in that town */}
        {currentStore && (
          <div className="p-6 sm:p-8 rounded-3xl bg-[#18181b]/90 border border-amber-500/20 shadow-xl backdrop-blur-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-white/10">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <MapPin className="w-3.5 h-3.5" /> Local Business & Place Guide
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  About {currentStore.name} & Stores in {city}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Discover local Kiranas, shops, and verified {category.toLowerCase()} vendors operating near {city}. Order online with instant local pickup via BellBasket.
                </p>
              </div>
            </div>

            {/* Local Search Tags */}
            <div className="space-y-3 mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-400" /> Popular Local Search Tags for {city}
              </h4>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/city/${citySlug}`}
                  className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-700 text-xs font-semibold text-amber-400 border border-slate-700/80 hover:border-amber-500/50 transition-all flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3" /> All Stores in {city}
                </Link>
                <Link
                  to={`/category/${catSlug}`}
                  className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-slate-700/80 hover:border-emerald-500/50 transition-all flex items-center gap-1"
                >
                  <Tag className="w-3 h-3" /> {category} in {city}
                </Link>
                <Link
                  to={`/best-${catSlug}-in-${citySlug}`}
                  className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700/80 hover:border-slate-500/50 transition-all"
                >
                  Best {category} in {city}
                </Link>
                <Link
                  to={`/${catSlug}-near-me`}
                  className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700/80 hover:border-slate-500/50 transition-all"
                >
                  {category} Stores Near Me
                </Link>
                <Link
                  to="/sitemap"
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> View Full Sitemap
                </Link>
              </div>
            </div>

            {/* Other Stores in that Same Town/Place */}
            {nearbyStores.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-white/10">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-emerald-400" /> More Local Stores in {city}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {nearbyStores.map((s, idx) => {
                    const sSlug = s.slug || generateSlug(s.name, s.city || city);
                    return (
                      <Link
                        key={s.id || idx}
                        to={`/stores/${sSlug}`}
                        className="p-3 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-700/60 hover:border-emerald-500/50 transition-all text-xs flex items-center justify-between group"
                      >
                        <span className="font-semibold text-slate-200 group-hover:text-emerald-400 truncate">
                          {s.name}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Footer Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg">
                B
              </div>
              <span className="text-2xl font-black tracking-tight text-white">BellBasket</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              India's top local commerce marketplace. Connecting neighborhood Kiranas, restaurants, and local stores across Andhra Pradesh, Telangana, and India with hyper-local pickup and fast ordering.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-900/50">
              <ShieldCheck className="w-4 h-4 shrink-0" /> Verified Local Kirana Stores & Shops
            </div>
          </div>

          {/* Col 2: Directory & Navigation */}
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-amber-500" /> Directory & Navigation
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link to="/sitemap" className="hover:text-amber-400 transition-colors flex items-center gap-1 font-bold text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" /> Full Store Directory (Sitemap)
                </Link>
              </li>
              <li>
                <a href="/sitemap.xml" className="hover:text-white transition-colors text-slate-400 font-mono">
                  sitemap.xml Feed
                </a>
              </li>
              <li>
                <Link to="/browse" className="hover:text-white transition-colors">Browse Stores Near Me</Link>
              </li>
              <li>
                <Link to="/deals" className="hover:text-white transition-colors">Local Deals & Offers</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">About BellBasket</Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Popular Categories */}
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-500" /> Business Categories
            </h4>
            <ul className="space-y-2 text-xs">
              {POPULAR_CATEGORIES.map(cat => (
                <li key={cat}>
                  <a href={`/category/${cat.toLowerCase()}`} className="hover:text-white transition-colors">
                    {cat} Stores Near Me
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Top Metros */}
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-500" /> Major Metro Marketplaces
            </h4>
            <ul className="space-y-2 text-xs">
              {TELANGANA_CITIES.slice(0, 4).concat(INDIA_METROS.slice(0, 4)).map(c => (
                <li key={c}>
                  <a href={`/city/${generateSlug(c)}`} className="hover:text-white transition-colors">
                    Stores in {c}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Extensive Regional City Marketplace Directory: Andhra Pradesh & Telangana */}
        <div className="p-6 rounded-3xl bg-[#18181b]/80 border border-white/10 space-y-6">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Building2 className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              City Marketplaces - Andhra Pradesh, Telangana & India
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            {/* Andhra Pradesh */}
            <div className="space-y-2">
              <h4 className="font-bold text-amber-400 text-xs flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Andhra Pradesh Marketplaces
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {AP_CITIES.map(c => (
                  <a
                    key={c}
                    href={`/city/${generateSlug(c)}`}
                    className="px-2.5 py-1 rounded-lg bg-[#09090b] hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-white/10 transition-colors"
                  >
                    {c}
                  </a>
                ))}
              </div>
            </div>

            {/* Telangana */}
            <div className="space-y-2">
              <h4 className="font-bold text-emerald-400 text-xs flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Telangana Marketplaces
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {TELANGANA_CITIES.map(c => (
                  <a
                    key={c}
                    href={`/city/${generateSlug(c)}`}
                    className="px-2.5 py-1 rounded-lg bg-[#09090b] hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-white/10 transition-colors"
                  >
                    {c}
                  </a>
                ))}
              </div>
            </div>

            {/* India & Major Metros */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-amber-400" /> Major Indian Metros & Cities
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {INDIA_METROS.map(c => (
                  <a
                    key={c}
                    href={`/city/${generateSlug(c)}`}
                    className="px-2.5 py-1 rounded-lg bg-[#09090b] hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition-colors"
                  >
                    {c}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {currentYear} BellBasket Hyperlocal Commerce. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/sitemap" className="hover:text-slate-200 transition-colors">Sitemap</Link>
            <a href="/sitemap.xml" className="hover:text-slate-200 transition-colors font-mono">sitemap.xml</a>
            <Link to="/privacy" className="hover:text-slate-200 transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
