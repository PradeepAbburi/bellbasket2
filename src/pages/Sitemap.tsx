import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { generateSlug } from '@/utils/seo';
import Header from '@/components/Header';
import { Helmet } from 'react-helmet';
import { Store as StoreIcon, MapPin, Tag, Globe, Star, ExternalLink, FileCode, Check, Sparkles, Home, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface StoreItem {
  id: string;
  name: string;
  category?: string;
  city?: string;
  district?: string;
  address?: string;
  slug?: string;
  rating?: number;
  image?: string;
  isBlocked?: boolean;
}

const DEFAULT_CATEGORIES = [
  'Restaurants', 'Cafes', 'Grocery', 'Electronics', 'Pharmacies', 'Hotels', 'Salons', 'Clothing'
];

const DEFAULT_CITIES = [
  'Kakinada', 'Rajahmundry', 'Visakhapatnam', 'Vijayawada', 'Guntur',
  'Tirupati', 'Nellore', 'Kurnool', 'Eluru', 'Ongole', 'Anantapur',
  'Amalapuram', 'Samalkot', 'Peddapuram', 'Mandapeta', 'Ramachandrapuram',
  'Tuni', 'Bhimavaram', 'Tenali', 'Machilipatnam', 'Vizianagaram', 'Kadapa',
  'Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam',
  'Ramagundam', 'Mahbubnagar', 'Nalgonda', 'Siddipet', 'Suryapet',
  'Bengaluru', 'Chennai', 'Mumbai', 'Delhi', 'Pune', 'Kolkata', 'Ahmedabad',
  'Geelong', 'Melbourne', 'Sydney'
];

const Sitemap = () => {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'html' | 'xml'>('html');
  const [xmlContent, setXmlContent] = useState('');

  useEffect(() => {
    const fetchStores = async () => {
      let storeList: StoreItem[] = [];
      try {
        const querySnapshot = await getDocs(collection(db, 'stores'));
        storeList = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as StoreItem))
          .filter(s => !s.isBlocked);
      } catch (err) {
        console.warn('Sitemap client store fetch warning:', err);
      }
      setStores(storeList);
      setLoading(false);

      // Build XML representation
      const baseUrl = 'https://bellbasket.com';
      const date = new Date().toISOString().split('T')[0];
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
      xml += `  <url><loc>${baseUrl}/</loc><lastmod>${date}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>\n`;
      xml += `  <url><loc>${baseUrl}/browse</loc><lastmod>${date}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>\n`;
      xml += `  <url><loc>${baseUrl}/sitemap</loc><lastmod>${date}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>\n`;

      storeList.forEach(s => {
        const slug = s.slug || generateSlug(s.name, s.city || 'local');
        xml += `  <url><loc>${baseUrl}/stores/${slug}</loc><lastmod>${date}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>\n`;
        xml += `  <url><loc>${baseUrl}/store/${s.id}</loc><lastmod>${date}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>\n`;
      });

      xml += `</urlset>`;
      setXmlContent(xml);
    };

    fetchStores();
  }, []);

  return (
    <div className="min-h-screen gradient-warm">
      <Helmet>
        <title>HTML & XML Sitemap - All Neighborhood Stores Directory | BellBasket</title>
        <meta name="description" content="Explore the complete directory of local stores, Kirana shops, restaurants, and marketplaces indexed on BellBasket. Browse by store, city, and category." />
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <link rel="canonical" href="https://bellbasket.com/sitemap" />
      </Helmet>

      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-muted-foreground/80 font-medium">
          <Link to="/" className="hover:text-amber-500 transition-colors flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
          <span className="text-foreground font-semibold">Sitemap Directory</span>
        </nav>

        {/* Banner Header */}
        <div className="glass rounded-3xl p-6 sm:p-8 mb-8 border border-white/20 shadow-xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" /> Google Crawlable Store Index
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                BellBasket Sitemap & Directory
              </h1>
              <p className="mt-2 text-muted-foreground text-sm sm:text-base max-w-2xl">
                Browse our live indexed registry of local stores, Kirana shops, categories, and city marketplaces. 
                Google crawlers discover every store link dynamically right here.
              </p>
            </div>

            {/* Toggle View Mode */}
            <div className="flex items-center gap-2 bg-background/80 backdrop-blur-md p-1.5 rounded-2xl border border-border self-start md:self-center shadow-inner">
              <button
                onClick={() => setViewMode('html')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'html'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Globe className="w-4 h-4" /> HTML Directory
              </button>
              <button
                onClick={() => setViewMode('xml')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  viewMode === 'xml'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileCode className="w-4 h-4" /> Raw XML Stream
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'xml' ? (
          <div className="glass rounded-3xl p-6 border border-border shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FileCode className="w-5 h-5 text-amber-500" /> XML Sitemap Feed
              </h2>
              <span className="text-xs text-muted-foreground font-mono">https://bellbasket.com/sitemap.xml</span>
            </div>
            <pre className="bg-slate-900 text-emerald-400 p-4 rounded-2xl overflow-x-auto text-xs font-mono max-h-[600px]">
              {xmlContent}
            </pre>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Section 1: All Registered Stores */}
            <section className="glass rounded-3xl p-6 sm:p-8 border border-border shadow-lg">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                    <StoreIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                      Stores & Businesses Directory ({stores.length})
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Direct indexed links to all local vendor storefronts
                    </p>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-muted-foreground animate-pulse text-sm">
                  Loading live store index from BellBasket network...
                </div>
              ) : stores.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No stores found in directory.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {stores.map(store => {
                    const slug = store.slug || generateSlug(store.name, store.city || 'local');
                    const storeUrl = `/stores/${slug}`;
                    const legacyUrl = `/store/${store.id}`;

                    return (
                      <motion.div
                        key={store.id}
                        whileHover={{ y: -2 }}
                        className="p-4 rounded-2xl bg-background/60 hover:bg-background/90 border border-border/80 transition-all hover:shadow-md group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-amber-600 transition-colors">
                              <a href={storeUrl} className="hover:underline">
                                {store.name}
                              </a>
                            </h3>
                            {store.rating && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full shrink-0">
                                <Star className="w-3 h-3 fill-current text-amber-500" />
                                {Number(store.rating).toFixed(1)}
                              </span>
                            )}
                          </div>

                          <div className="space-y-1 text-xs text-muted-foreground mb-3">
                            {store.category && (
                              <div className="flex items-center gap-1.5">
                                <Tag className="w-3 h-3 text-amber-500 shrink-0" />
                                <span>{store.category}</span>
                              </div>
                            )}
                            {(store.city || store.district) && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span>{store.city || store.district}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-amber-600 font-semibold">
                          <a href={storeUrl} className="inline-flex items-center gap-1 hover:underline">
                            <span>Visit Store</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <a href={legacyUrl} className="text-muted-foreground text-[10px] hover:underline" title="Legacy Store URL">
                            Ref #{store.id.slice(0, 6)}
                          </a>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Section 2: Cities Directory */}
            <section className="glass rounded-3xl p-6 sm:p-8 border border-border shadow-lg">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">City Marketplaces</h2>
                  <p className="text-xs text-muted-foreground">Local marketplaces by city and region</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {DEFAULT_CITIES.map(city => {
                  const citySlug = generateSlug(city);
                  return (
                    <a
                      key={city}
                      href={`/city/${citySlug}`}
                      className="p-3 rounded-xl bg-background/50 hover:bg-emerald-500/10 hover:border-emerald-500/30 border border-border text-center text-xs font-bold text-foreground hover:text-emerald-600 transition-all"
                    >
                      Stores in {city}
                    </a>
                  );
                })}
              </div>
            </section>

            {/* Section 3: Categories Directory */}
            <section className="glass rounded-3xl p-6 sm:p-8 border border-border shadow-lg">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">Category Marketplaces</h2>
                  <p className="text-xs text-muted-foreground">Shop local by business category</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {DEFAULT_CATEGORIES.map(cat => {
                  const catSlug = generateSlug(cat);
                  return (
                    <a
                      key={cat}
                      href={`/category/${catSlug}`}
                      className="p-3 rounded-xl bg-background/50 hover:bg-amber-500/10 hover:border-amber-500/30 border border-border text-center text-xs font-bold text-foreground hover:text-amber-600 transition-all"
                    >
                      {cat} Stores
                    </a>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default Sitemap;
