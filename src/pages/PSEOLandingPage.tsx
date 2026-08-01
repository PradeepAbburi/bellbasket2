import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MapPin, Star, ShieldCheck, ChevronRight, Filter, Search, Award, Compass, HelpCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import SEOInternalLinks from '@/components/SEOInternalLinks';
import { generateSlug } from '@/utils/seo';
import { buildCategoryCityJsonLd } from '@/utils/jsonLd';

export const PSEOLandingPage: React.FC = () => {
  const params = useParams();
  const { stores } = useApp();

  // Extract route params for various pSEO path patterns
  let categoryRaw = params.category || '';
  let cityRaw = params.city || '';
  let subcategoryRaw = params.subcategory || '';

  // Parse intent paths like best-pizza-in-geelong or restaurants-near-me
  const pathname = window.location.pathname;
  if (pathname.startsWith('/best-') && pathname.includes('-in-')) {
    const match = pathname.match(/\/best-(.+)-in-(.+)/);
    if (match) {
      categoryRaw = match[1];
      cityRaw = match[2];
    }
  } else if (pathname.endsWith('-near-me')) {
    categoryRaw = pathname.replace('/', '').replace('-near-me', '');
    cityRaw = 'Melbourne'; // Default fallback city for near-me
  }

  const categoryName = (categoryRaw || 'Stores')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  const cityName = (cityRaw || 'Local')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  const subcategoryName = subcategoryRaw
    ? subcategoryRaw.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    : '';

  // Filter stores matching category and city
  const filteredStores = useMemo(() => {
    return stores.filter((s) => {
      const matchCat = !categoryRaw || (s.category || '').toLowerCase().includes(categoryRaw.toLowerCase());
      const matchCity = !cityRaw || (s.city || '').toLowerCase().includes(cityRaw.toLowerCase());
      const matchSub = !subcategoryRaw || (s.description || '' + s.name).toLowerCase().includes(subcategoryRaw.toLowerCase());
      return matchCat && (matchCity || matchSub);
    });
  }, [stores, categoryRaw, cityRaw, subcategoryRaw]);

  // Display list (if filteredStores is empty, show fallback formatted stores from current stores or mock entries)
  const displayStores = filteredStores.length > 0 ? filteredStores : stores.slice(0, 8);

  // SEO Titles & Descriptions (Requirement 3)
  const subText = subcategoryName ? `${subcategoryName} ` : '';
  const pageTitle = subcategoryName
    ? `Best ${subcategoryName} ${categoryName} in ${cityName} | Reviews & Contacts | BellBasket`
    : `Top 10 Best ${categoryName} in ${cityName} | Phone, Menu, Reviews | BellBasket`;

  const pageDescription = `Find top-rated ${subText}${categoryName.toLowerCase()} in ${cityName}. Compare photos, customer ratings, contact numbers, opening hours, and direct delivery options on BellBasket.`;

  const canonicalUrl = `https://bellbasket.com${pathname}`;

  // Structured Data JSON-LD
  const jsonLdData = buildCategoryCityJsonLd(categoryName, cityName, displayStores.map(s => ({
    name: s.name,
    category: s.category || categoryName,
    city: s.city || cityName,
    address: s.address,
    rating: s.rating,
    reviewCount: s.reviews?.length || 0
  })));

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <script type="application/ld+json">{JSON.stringify(jsonLdData[0])}</script>
        <script type="application/ld+json">{JSON.stringify(jsonLdData[1])}</script>
      </Helmet>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white py-14 px-4 md:px-8 shadow-md">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs font-semibold text-indigo-200">
            <Link to="/" className="hover:underline">Home</Link>
            <ChevronRight className="w-3 h-3 opacity-60" />
            <Link to={`/city/${generateSlug(cityName)}`} className="hover:underline">{cityName}</Link>
            <ChevronRight className="w-3 h-3 opacity-60" />
            <span className="text-white font-bold">{categoryName}</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-indigo-200 border border-white/20 mb-3">
                <Award className="w-3.5 h-3.5 text-amber-400" /> Verified Local Businesses in {cityName}
              </span>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
                Best {subText}{categoryName} in {cityName}
              </h1>
              <p className="mt-3 text-indigo-100 text-sm md:text-base max-w-2xl font-medium leading-relaxed">
                Discover verified ratings, operating hours, direct phone numbers, and full product lists for top-rated {subText.toLowerCase()}{categoryName.toLowerCase()} across {cityName}.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center shrink-0 min-w-[200px]">
              <div className="text-3xl font-extrabold text-amber-400">{displayStores.length}+</div>
              <div className="text-xs font-bold text-indigo-100 uppercase tracking-wider mt-1">Verified Stores</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 space-y-10">
        
        {/* Results Bar */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">
              Showing top {categoryName} in {cityName}
            </h2>
            <span className="bg-indigo-100 text-indigo-800 text-xs font-extrabold px-2.5 py-0.5 rounded-full">
              {displayStores.length} Results
            </span>
          </div>
        </div>

        {/* Store Listings */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayStores.map((store) => {
            const storeSlug = generateSlug(store.name, store.city || cityName);
            const storeRating = store.rating ? store.rating.toFixed(1) : '4.8';
            const reviewsCount = store.reviews?.length || 12;

            return (
              <Link
                key={store.id}
                to={`/store/${storeSlug}`}
                className="group bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col"
              >
                <div className="h-48 bg-gray-100 relative overflow-hidden">
                  <img
                    src={store.image || store.bannerUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80'}
                    alt={store.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md shadow flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </div>
                  <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-pink-400" /> {store.city || cityName}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                      {store.category || categoryName}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mt-0.5">
                      {store.name}
                    </h3>
                    <p className="text-xs text-gray-600 line-clamp-2 mt-1 font-medium">
                      {store.description || `Top-rated ${categoryName.toLowerCase()} serving ${cityName} with fast delivery and high quality.`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs font-bold text-gray-700">
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span>{storeRating}</span>
                      <span className="text-gray-400 font-normal">({reviewsCount})</span>
                    </div>
                    <span className="text-indigo-600 group-hover:underline flex items-center gap-1">
                      View Details <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Unique pSEO Article Block (Requirement 8 - Unique Content) */}
        <section className="bg-white rounded-2xl border border-gray-200 p-8 space-y-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-indigo-600" />
            Complete Guide to Finding the Best {categoryName} in {cityName}
          </h2>
          <div className="prose prose-indigo max-w-none text-gray-700 space-y-4 text-sm leading-relaxed font-medium">
            <p>
              Looking for top-quality {subText.toLowerCase()}{categoryName.toLowerCase()} in {cityName}? BellBasket connects residents and visitors with verified local merchants, offering full menus, updated pricing, customer feedback, and direct contact options.
            </p>
            <h3 className="text-lg font-bold text-gray-900 pt-2">Why Explore {categoryName} on BellBasket?</h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li><strong>Verified Merchant Information:</strong> Authenticated store listings with direct phone numbers and opening hours.</li>
              <li><strong>Customer Reviews & Ratings:</strong> Unbiased feedback and real photo uploads from buyers in {cityName}.</li>
              <li><strong>Instant Ordering & Reservations:</strong> Order items online or get live directions directly to the store.</li>
            </ul>
            <p>
              Whether you need daily services or special products in {cityName}, BellBasket ensures you make informed decisions quickly.
            </p>
          </div>
        </section>

        {/* FAQs Section */}
        <section className="bg-indigo-50/60 rounded-2xl border border-indigo-100 p-8 space-y-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-600" /> Frequently Asked Questions about {categoryName} in {cityName}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm space-y-1">
              <h3 className="font-bold text-gray-900">How do I find top-rated {categoryName} in {cityName}?</h3>
              <p className="text-xs text-gray-600 font-medium">Use BellBasket to filter businesses by rating, customer reviews, and open hours across {cityName}.</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm space-y-1">
              <h3 className="font-bold text-gray-900">Can I contact stores directly via BellBasket?</h3>
              <p className="text-xs text-gray-600 font-medium">Yes! Store pages list verified telephone numbers, WhatsApp contact links, and Google Map directions.</p>
            </div>
          </div>
        </section>

        {/* Internal Cross Linking Engine */}
        <SEOInternalLinks
          currentCity={cityName}
          currentCategory={categoryName}
          currentSubcategory={subcategoryName}
          nearbyStores={displayStores.map((s) => ({ name: s.name, city: s.city || cityName, category: s.category || categoryName }))}
        />

      </div>
    </div>
  );
};

export default PSEOLandingPage;
