import { useState, useEffect, useMemo, useRef, useCallback, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { MapPin, Star, Search, Navigation, Loader2, History, X, Store as StoreIcon, Plus, ChevronLeft, ChevronRight, Clock, Tag, ShoppingBasket, Sparkles, Filter, ChevronDown, ArrowUpDown } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from '@/components/ui/dropdown-menu';
import SortOptions from '@/components/SortOptions';
import Loader from '@/components/ui/loader-animation';
import Header from '@/components/Header';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { Store, Product } from '@/types';
import { CATEGORY_METADATA } from '@/constants/categories';
import { toast } from 'sonner';
import { useApp } from '@/context/AppContext';
import MapView from '@/components/MapView';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';

const LOCATION_PRESETS = [
  { name: 'Connaught Place', lat: 28.6139, lng: 77.2090 },
  { name: 'Karol Bagh', lat: 28.6514, lng: 77.1907 },
  { name: 'Lajpat Nagar', lat: 28.5700, lng: 77.2373 },
  { name: 'Rajouri Garden', lat: 28.6492, lng: 77.1219 },
  { name: 'Saket', lat: 28.5244, lng: 77.2066 },
  { name: 'Dwarka', lat: 28.5921, lng: 77.0460 },
  { name: 'Rohini', lat: 28.7495, lng: 77.0565 },
  { name: 'Vasant Kunj', lat: 28.5195, lng: 77.1570 },
];

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


const CustomerHome = () => {
  const { user, loading, stores: allStores, allProducts, addToCart, orders, refreshData } = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const activeOrders = useMemo(() => {
    return orders.filter(o => o.userId === user?.id && ['pending', 'accepted', 'packed'].includes(o.status));
  }, [orders, user?.id]);

  const [search, setSearch] = useState('');
  const [userLat, setUserLat] = useState<number>(() => Number(localStorage.getItem('user_lat')) || 28.6139);
  const [userLng, setUserLng] = useState<number>(() => Number(localStorage.getItem('user_lng')) || 77.2090);
  const [locationName, setLocationName] = useState(() => localStorage.getItem('user_location_name') || 'Connaught Place');
  const [detecting, setDetecting] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [searchHistory, setSearchHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('location_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSearch, setActiveSearch] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [mobileCategoryPage, setMobileCategoryPage] = useState(0);
  const [activeMode, setActiveMode] = useState<'product' | 'service'>(() => (localStorage.getItem('active_mode') as 'product' | 'service') || 'product');
  const [priceSort, setPriceSort] = useState<'none' | 'low-high' | 'high-low'>('none');
  const [ratingSort, setRatingSort] = useState<'none' | 'top-rated' | 'low-rated'>('none');
  const [maxDistance, setMaxDistance] = useState<number>(20);

  const searchSuggestions = useMemo(() => {
    if (!search.trim() || isSearching || activeSearch === search) return [];

    const query = search.toLowerCase();
    const suggestions = new Set<string>();

    allStores
      .filter(s => !s.isBlocked && s.plan && s.plan !== 'none')
      .forEach(s => {
        if (s.name.toLowerCase().includes(query)) suggestions.add(s.name);
      });

    allProducts.forEach(p => {
      // Find the store for this product to check if it's blocked
      const store = allStores.find(s => s.id === p.vendorId);
      if (store && !store.isBlocked && store.plan && store.plan !== 'none') {
        if (p.name.toLowerCase().includes(query)) suggestions.add(p.name);
      }
    });

    return Array.from(suggestions).slice(0, 6);
  }, [search, allStores, allProducts, isSearching, activeSearch]);

  const categoryRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLDivElement>(null);

  const scroll = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (ref.current) {
      const { scrollLeft, clientWidth } = ref.current;
      const scrollAmount = clientWidth * 0.8;
      ref.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'vendor') {
        navigate('/vendor');
      }
    }
  }, [user, loading, navigate]);

  // Save history and current location to localStorage
  useEffect(() => {
    localStorage.setItem('location_history', JSON.stringify(searchHistory));
  }, [searchHistory]);

  useEffect(() => {
    localStorage.setItem('user_lat', userLat.toString());
    localStorage.setItem('user_lng', userLng.toString());
    localStorage.setItem('user_location_name', locationName);
  }, [userLat, userLng, locationName]);

  useEffect(() => {
    localStorage.setItem('active_mode', activeMode);
  }, [activeMode]);


  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setSearch(q);
    }
  }, [searchParams]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setDetecting(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserLat(lat);
        setUserLng(lng);

        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          .then(async res => {
            if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);
            return res.json();
          })
          .then(data => {
            const name = data.display_name?.split(',')[0] || data.address?.city || data.address?.town || 'Current Location';
            setLocationName(name);

            const newItem = {
              id: data.place_id || Math.random().toString(),
              name: name,
              fullName: data.display_name,
              lat,
              lon: lng
            };

            setSearchHistory(prev => {
              const filtered = prev.filter(item => item.name !== name);
              return [newItem, ...filtered].slice(0, 5);
            });

            toast.success('Found you in ' + name);
          })
          .catch((err) => {
            console.warn("Location naming failed (CORS/Rate limit):", err);
            setLocationName('Current Location');
            toast.success('Location detected');
          })
          .finally(() => {
            setDetecting(false);
          });
      },
      (error) => {
        setDetecting(false);
        let msg = 'Unable to detect location';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission denied. Please allow map access.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information is unavailable.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Location request timed out.';
        }
        toast.error(msg);

        if (!locationName) {
          setUserLat(28.6139);
          setUserLng(77.2090);
          setLocationName('Connaught Place');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0 // Force fresh location, don't use cache
      }
    );
  };


  const handleLocationSearch = async (val: string) => {
    setLocationSearch(val);
    if (val.length < 2) {
      setLocationResults([]);
      return;
    }

    try {
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&lat=${userLat}&lon=${userLng}&limit=12`;
      const res = await fetch(photonUrl);
      const data = await res.json();

      const results = data.features.map((f: any) => {
        const p = f.properties;

        // Calculate distance from user's current center to this result
        const dist = getDistanceKm(userLat, userLng, f.geometry.coordinates[1], f.geometry.coordinates[0]);

        const addressParts = [];
        if (p.street) addressParts.push(p.street);
        if (p.district) addressParts.push(p.district);
        if (p.city) addressParts.push(p.city);
        if (p.state) addressParts.push(p.state);

        const fullName = [p.name || p.street, ...addressParts.filter(part => part !== (p.name || p.street))].filter(Boolean).join(', ');

        // Better short name: include district/city for context if it's a minor place
        let namePart = p.name || p.street || p.district || p.city || p.locality || '';
        if (!namePart) namePart = fullName.split(',')[0];

        const context = p.district || p.city || p.locality || '';
        if (context && namePart !== context && !namePart.includes(context)) {
          namePart = `${namePart}, ${context}`;
        }

        return {
          place_id: f.properties.osm_id || Math.random(),
          display_name: fullName,
          short_name: namePart,
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
          distanceKm: dist,
          type: p.osm_value || p.type || 'place'
        };
      });

      // Sort results by a mix of relevance (already biased by Photon) and physical distance
      // We prioritize things within 50km if they are highly relevant
      const sorted = results.sort((a: any, b: any) => {
        if (a.distanceKm < 10 && b.distanceKm > 10) return -1;
        if (b.distanceKm < 10 && a.distanceKm > 10) return 1;
        return 0; // Maintain Photon's relevance order otherwise
      });

      setLocationResults(sorted);
    } catch (e) {
      console.error('Search failed', e);
      // Fallback
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=in&limit=10&addressdetails=1`);
        const data = await res.json();
        setLocationResults(data.map((r: any) => ({
          ...r,
          short_name: r.display_name.split(',')[0],
          distanceKm: getDistanceKm(userLat, userLng, parseFloat(r.lat), parseFloat(r.lon))
        })));
      } catch (fallbackErr) {
        console.error('Fallback failed', fallbackErr);
      }
    }
  };

  const selectResult = (res: any) => {
    const lat = typeof res.lat === 'string' ? parseFloat(res.lat) : res.lat;
    const lng = typeof res.lon === 'string' ? parseFloat(res.lon) : res.lon;
    const shortName = res.short_name || res.display_name.split(',')[0];

    setUserLat(lat);
    setUserLng(lng);
    setLocationName(shortName);

    const newItem = {
      id: res.place_id?.toString() || Math.random().toString(),
      name: shortName,
      fullName: res.display_name,
      lat,
      lon: lng
    };

    setSearchHistory(prev => {
      const filtered = prev.filter(item => item.name !== shortName);
      return [newItem, ...filtered].slice(0, 5);
    });

    setShowLocationPicker(false);
    setLocationResults([]);
    setLocationSearch('');
    toast.success('Location updated');
  };

  const clearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchHistory([]);
    localStorage.removeItem('location_history');
    toast.success('History cleared');
  };

  const handleStoreClick = (storeId: string) => {
    // Determine the slug if possible or use ID
    const store = allStores.find(s => s.id === storeId);
    const basePath = store?.slug ? `/stores/${store.slug}` : `/store/${storeId}`;
    const searchParam = activeSearch ? `?search=${encodeURIComponent(activeSearch)}` : '';
    navigate(`${basePath}${searchParam}`);
  };

  const handleProductClick = (productId: string, storeId: string) => {
    const store = allStores.find(s => s.id === storeId);
    const path = store?.slug ? `/stores/${store.slug}` : `/store/${storeId}`;
    navigate(`${path}?productId=${productId}`);
  };

  // Extract Categories based on activeMode
  const categories = useMemo(() => {
    // Count stores per category for sorting popularity
    const counts: Record<string, number> = {};
    allStores
      .filter(s => !s.isBlocked && s.plan && s.plan !== 'none')
      .forEach(s => {
        if (s.category) {
          counts[s.category] = (counts[s.category] || 0) + 1;
        }
      });

    return Object.entries(CATEGORY_METADATA)
      .filter(([_, meta]) => meta.type === activeMode)
      .map(([name, meta]) => ({
        name,
        ...meta,
        storeCount: counts[name] || 0
      }))
      .sort((a, b) => b.storeCount - a.storeCount);
  }, [activeMode, allStores]);

  // Pre-calculate minimum price for each store for sorting
  const storeMinPrices = useMemo(() => {
    const prices: Record<string, number> = {};
    allProducts.forEach(p => {
      const sid = p.vendorId;
      if (sid) {
        const currentMin = prices[sid] ?? Infinity;
        const productPrice = p.discountedPrice && p.discountedPrice < p.price ? p.discountedPrice : p.price;
        if (productPrice < currentMin) {
          prices[sid] = productPrice;
        }
      }
    });
    return prices;
  }, [allProducts]);

  // Unified Search Results
  const { filteredStores, storeMatchingProducts } = useMemo(() => {
    const query = activeSearch.toLowerCase();

    // 1. Group ALL matching products by vendorId
    const matchingGroups: Record<string, Product[]> = {};
    allProducts.forEach(p => {
      const matchesSearch = p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query));
      const matchesCategory = selectedCategory ? p.category === selectedCategory : true;

      if (matchesSearch && matchesCategory) {
        const sid = p.vendorId || 'unknown';
        if (!matchingGroups[sid]) matchingGroups[sid] = [];
        matchingGroups[sid].push(p);
      }
    });

    // 2. Filter Stores
    const filtered = allStores.filter(store => {
      // mode filter
      const matchesMode = store.storeType ? store.storeType === activeMode : activeMode === 'product'; // Default to product if not specified
      if (!matchesMode) return false;

      // HIDDEN FILTER: Blocked or Expired
      if (store.isBlocked) return false;
      if (store.plan === 'none' || !store.plan) return false;

      const distance = getDistanceKm(userLat, userLng, store.lat, store.lng);

      let allowedByLocation = distance <= maxDistance;

      // Allow matches by City/State/District name if location is set
      if (!allowedByLocation && locationName && locationName !== 'Current Location') {
        // Normalize search term: remove common suffixes like "District", "State" to improve matching
        const searchLoc = locationName.split(',')[0]
          .toLowerCase()
          .replace(/\b(district|state|province|region)\b/g, '')
          .trim();

        const storeAddr = (store.address || '').toLowerCase();
        if (searchLoc.length > 2 && storeAddr.includes(searchLoc)) {
          allowedByLocation = true;
        }
      }

      if (!allowedByLocation) return false;

      // Category filter
      const matchesCategory = selectedCategory ? store.category === selectedCategory : true;
      if (!matchesCategory) return false;

      // Check if store name or category matches
      const matchesStore = store.name.toLowerCase().includes(query) || store.category.toLowerCase().includes(query);

      // Check if this store has any matching products (from our pre-grouped results)
      const hasMatchingProducts = matchingGroups[store.id] && matchingGroups[store.id].length > 0;

      // Match found if search matches store OR store has matching products
      const matchesSearch = query ? (matchesStore || hasMatchingProducts) : true;

      return matchesSearch;
    });

    // 3. Sort by Plan and then Distance
    const getPlanWeight = (plan?: string) => {
      if (plan === 'pro') return 3;
      if (plan === 'growth') return 2;
      if (plan === 'basic') return 1;
      return 0;
    };

    const sortedStores = filtered
      .map(s => ({ ...s, distance: getDistanceKm(userLat, userLng, s.lat, s.lng) }))
      .sort((a, b) => {
        // First priority: Search Relevance / Plan Weight (unless explicit sort is set)
        const weightA = getPlanWeight(a.plan);
        const weightB = getPlanWeight(b.plan);

        if (ratingSort !== 'none') {
          const rA = a.rating || 0;
          const rB = b.rating || 0;
          if (ratingSort === 'top-rated') {
            if (rB !== rA) return rB - rA;
          } else {
            if (rA !== rB) return rA - rB;
          }
        }

        if (priceSort !== 'none') {
          const pA = storeMinPrices[a.id] ?? Infinity;
          const pB = storeMinPrices[b.id] ?? Infinity;
          if (priceSort === 'low-high') {
            if (pA !== pB) return pA - pB;
          } else {
            // high-low: put stores without products at the end
            const pA_val = pA === Infinity ? -1 : pA;
            const pB_val = pB === Infinity ? -1 : pB;
            if (pB_val !== pA_val) return pB_val - pA_val;
          }
        }

        if (weightA !== weightB) return weightB - weightA;
        return (a.distance || 0) - (b.distance || 0);
      });

    return {
      filteredStores: sortedStores as (Store & { distance?: number })[],
      storeMatchingProducts: matchingGroups
    };
  }, [activeSearch, selectedCategory, userLat, userLng, allStores, allProducts, locationName, activeMode, maxDistance, priceSort, ratingSort, storeMinPrices]);

  const handleSearchTrigger = (val?: string) => {
    const query = val !== undefined ? val : search;
    setIsSearching(true);
    // Simulate a brief loading effect for better UX as requested
    setTimeout(() => {
      startTransition(() => {
        setActiveSearch(query);
        setIsSearching(false);
      });
    }, 800);
  };

  const handleModeChange = (mode: 'product' | 'service') => {
    setActiveMode(mode);
    setSelectedCategory(null);
    setMobileCategoryPage(0);
  };

  if (loading) {
    return (
      <Loader fullScreen />
    );
  }

  return (
    <div className="min-h-screen gradient-warm">
      <Helmet>
        <title>BellBasket | Browse Stores - Pick It. Grab It.</title>
        <meta name="description" content="Browse local neighborhood stores on BellBasket. Pick It. Grab It. Discover shops, find daily essentials, add to cart, and get them delivered fast." />
        <meta name="keywords" content="local shopping, grocery delivery, neighborhood market, buy local, fresh groceries, daily essentials, BellBasket" />
        <meta property="og:title" content="BellBasket | Browse Local Stores" />
        <meta property="og:description" content="Shop local from the comfort of your home. Pick It. Grab It. Supporting your neighborhood stores." />
        <meta property="og:url" content="https://bellbasket.com/browse" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://bellbasket.com/browse" />
      </Helmet>
      <Header />
      <PullToRefresh onRefresh={refreshData} className="pt-16 sm:pt-18 pb-32 px-4 max-w-4xl mx-auto space-y-6">
        {/* Main Content Area - Hidden while searching */}
        {!isSearching && (
          <div className="space-y-6">
            {/* Location bar */}
            <div className="glass rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Your location</p>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {detecting ? 'Detecting...' : locationName || 'Not set'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={detectLocation}
                  disabled={detecting}
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  {detecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                  Detect
                </button>
                <button
                  onClick={() => setShowLocationPicker(!showLocationPicker)}
                  className="text-xs font-medium bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Location picker dropdown */}
            {showLocationPicker && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-4 space-y-4"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={locationSearch}
                    onChange={e => handleLocationSearch(e.target.value)}
                    placeholder="Search for your area or city..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#202020] border border-border/50 text-foreground dark:text-white text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    autoFocus
                  />
                </div>

                {locationResults.length > 0 ? (
                  <div className="divide-y divide-border">
                    {locationResults.map(res => (
                      <button
                        key={res.place_id}
                        onClick={() => selectResult(res)}
                        className="w-full text-left py-3 px-1 hover:bg-secondary/50 transition-colors rounded-lg flex items-start justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground line-clamp-1">{res.short_name}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-1">{res.display_name}</p>
                          </div>
                        </div>
                        {res.distanceKm !== undefined && (
                          <div className="shrink-0 flex flex-col items-end">
                            <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                              {res.distanceKm < 1 ? '<1 km' : `${Math.round(res.distanceKm)} km`}
                            </span>
                            {res.type && res.type !== 'place' && (
                              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter mt-1">{res.type}</span>
                            )}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    {searchHistory.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            <History className="w-3 h-3" />
                            Recently Searched
                          </div>
                          <button onClick={clearHistory} className="text-[10px] text-primary hover:underline font-bold">Clear</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {searchHistory.map(item => (
                            <button
                              key={item.id}
                              onClick={() => {
                                setUserLat(item.lat);
                                setUserLng(item.lon);
                                setLocationName(item.name);
                                setShowLocationPicker(false);
                                toast.success('Location set to ' + item.name);
                              }}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 hover:bg-primary hover:text-primary-foreground transition-all group"
                            >
                              <MapPin className="w-3 h-3" />
                              <span className="text-xs font-medium">{item.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Manual Map Selection */}
                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                          <MapPin className="w-3.5 h-3.5" />
                          Refine on Map
                        </div>
                      </div>
                      <div className="h-48 rounded-2xl overflow-hidden border-2 border-primary/10 shadow-inner relative group">
                        <MapView
                          center={[userLat, userLng]}
                          centerLabel="Your current pin"
                          stores={[]}
                          onMapClick={(lat, lng) => {
                            setUserLat(lat);
                            setUserLng(lng);
                            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                              .then(res => res.json())
                              .then(data => {
                                const name = data.display_name?.split(',')[0] || 'Selected Point';
                                setLocationName(name);
                                toast.success('Location updated manually');
                              });
                          }}
                        />
                        <div className="absolute bottom-3 left-3 right-3 z-[400] pointer-events-none">
                          <div className="bg-black/60 backdrop-blur-md text-[10px] text-white px-3 py-1.5 rounded-full font-bold text-center">
                            Tap anywhere on map to fix your location
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="sticky top-16 z-30 py-2 -mx-4 px-4 bg-white/95 dark:bg-[#202020]/95 backdrop-blur-md border-b border-border/10 shadow-sm mt-3">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearchTrigger()}
                placeholder={activeMode === 'product' ? t('home.search_placeholder_product') : t('home.search_placeholder_service')}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#202020] border border-border/50 shadow-md text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    setActiveSearch('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-slate-100 text-muted-foreground transition-colors z-10"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Search Suggestions Dropdown */}
              <AnimatePresence>
                {searchSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scaleY: 0.95 }}
                    animate={{ opacity: 1, y: 0, scaleY: 1 }}
                    exit={{ opacity: 0, y: -10, scaleY: 0.95 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#202020] rounded-xl shadow-xl border border-border/50 overflow-hidden z-50 origin-top"
                  >
                    <ul>
                      {searchSuggestions.map((suggestion, idx) => (
                        <li key={idx}>
                          <button
                            onClick={() => {
                              setSearch(suggestion);
                              setIsSearching(true);
                              setTimeout(() => {
                                startTransition(() => {
                                  setActiveSearch(suggestion);
                                  setIsSearching(false);
                                });
                              }, 600);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-secondary/50 flex items-center gap-3 transition-colors border-b border-border/10 last:border-0"
                          >
                            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium text-foreground truncate">{suggestion}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              onClick={() => handleSearchTrigger()}
              disabled={isSearching}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-primary/30 active:scale-95 transition-all flex items-center justify-center min-w-[100px]"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isSearching && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-16 md:py-24"
            >
              <Loader text={t('common.searching')} subtext={t('home.finding_best_matches')} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Area - Hidden while searching */}
        {!isSearching && (
          <div className="mt-6 space-y-6">
            {/* Categories Section */}
            <AnimatePresence>
              {!activeSearch && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="flex flex-col gap-3 mb-6">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-lg md:text-xl font-black text-foreground tracking-tight shrink-0">{t('home.shop_by_category')}</h2>
                      
                      <div className="flex bg-secondary/80 backdrop-blur-sm p-1 rounded-xl items-center gap-1 border border-border shadow-inner w-fit">
                        <button
                          onClick={() => handleModeChange('product')}
                          className={`px-3 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeMode === 'product' ? 'bg-primary text-white shadow-md scale-105' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          Products
                        </button>
                        <button
                          onClick={() => handleModeChange('service')}
                          className={`px-3 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeMode === 'service' ? 'bg-primary text-white shadow-md scale-105' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          Services
                        </button>
                      </div>
                    </div>

                    {selectedCategory && (
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 hover:bg-primary/20 px-3 md:px-4 py-1.5 rounded-xl transition-all active:scale-95 border border-primary/20 shadow-sm w-fit inline-flex items-center gap-1.5 h-auto group"
                      >
                        <X className="w-2.5 h-2.5 text-primary group-hover:rotate-90 transition-transform duration-300" />
                        {t('home.clear_filter')}
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    {/* Desktop View - Paginated Carousel */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="hidden md:block relative group/nav"
                    >
                      <div
                        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2"
                        ref={categoryRef}
                        onScroll={(e) => {
                          const target = e.currentTarget;
                          const page = Math.round(target.scrollLeft / target.clientWidth);
                          if (!isNaN(page) && page !== mobileCategoryPage) {
                            setMobileCategoryPage(page);
                          }
                        }}
                      >
                        {[...Array(Math.ceil((1 + categories.length) / 16))].map((_, pageIndex) => {
                          const allItems = [{ type: 'all', data: null }, ...categories.map(c => ({ type: 'category', data: c }))];
                          const pageItems = allItems.slice(pageIndex * 16, (pageIndex + 1) * 16);

                          if (pageItems.length === 0) return null;

                          return (
                            <div key={pageIndex} className="min-w-full flex-none grid grid-cols-8 grid-rows-2 gap-x-6 gap-y-6 px-1 snap-center">
                              {pageItems.map((item, idx) => {
                                if (item.type === 'all') {
                                  return (
                                    <motion.button
                                      key="all"
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => setSelectedCategory(null)}
                                      className="flex flex-col items-center gap-2 group transition-all"
                                    >
                                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${!selectedCategory ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-lg shadow-yellow-500/20 scale-105' : 'bg-yellow-400 text-black shadow-sm hover:bg-yellow-500 border border-yellow-300'}`}>
                                        <StoreIcon className="w-7 h-7" />
                                      </div>
                                      <span className={`text-[9px] font-black uppercase tracking-wider text-center transition-colors ${!selectedCategory ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`}>{activeMode === 'product' ? t('home.all_shops') : 'All Services'}</span>
                                    </motion.button>
                                  );
                                }

                                const cat = item.data;
                                const Icon = cat?.icon;
                                return (
                                  <motion.button
                                    key={cat?.name}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.01 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setSelectedCategory(selectedCategory === cat?.name ? null : cat?.name)}
                                    className="flex flex-col items-center gap-2 group transition-all"
                                  >
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm border relative overflow-hidden ${selectedCategory === cat?.name ? 'border-primary ring-4 ring-primary/20 scale-105 shadow-lg shadow-primary/10' : 'bg-white dark:bg-[#202020] border-border group-hover:border-primary/30 group-hover:shadow-md'}`} style={selectedCategory === cat?.name ? { backgroundColor: cat?.color } : {}}>
                                      <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${cat?.gradient}`} />
                                      <div className={`relative z-10 transition-all duration-300 ${selectedCategory === cat?.name ? 'text-white scale-110' : ''}`} style={selectedCategory !== cat?.name ? { color: cat?.color } : {}}>
                                        {Icon && <Icon className="w-7 h-7" />}
                                      </div>
                                    </div>
                                    <span className={`text-[9px] font-black uppercase tracking-wider text-center leading-tight transition-colors line-clamp-2 max-w-[70px] ${selectedCategory === cat?.name ? 'text-primary' : 'text-muted-foreground'}`} style={selectedCategory !== cat?.name ? {} : { color: cat?.color }}>
                                      {t(`categories.${cat?.name}`, { defaultValue: cat?.name.split(' & ')[0] })}
                                    </span>
                                  </motion.button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>

                      {/* Dots */}
                      <div className="flex justify-center items-center gap-1.5 mt-2">
                        {[...Array(Math.ceil((1 + categories.length) / 16))].map((_, i) => (
                          <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === mobileCategoryPage ? 'w-4 bg-primary' : 'w-1.5 bg-primary/20'}`}
                          />
                        ))}
                      </div>
                    </motion.div>

                    {/* Mobile View - Paginated Carousel */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="md:hidden"
                    >
                      <div
                        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2"
                        onScroll={(e) => {
                          const target = e.currentTarget;
                          const page = Math.round(target.scrollLeft / target.clientWidth);
                          if (!isNaN(page) && page !== mobileCategoryPage) {
                            setMobileCategoryPage(page);
                          }
                        }}
                      >
                        {[...Array(Math.ceil((1 + categories.length) / 8))].map((_, pageIndex) => {
                          const allItems = [{ type: 'all', data: null }, ...categories.map(c => ({ type: 'category', data: c }))];
                          const pageItems = allItems.slice(pageIndex * 8, (pageIndex + 1) * 8);

                          if (pageItems.length === 0) return null;

                          return (
                            <div key={pageIndex} className="min-w-full flex-none grid grid-cols-4 grid-rows-2 gap-x-3 gap-y-4 px-1 snap-center">
                              {pageItems.map((item, idx) => {
                                if (item.type === 'all') {
                                  return (
                                    <motion.button
                                      key="all"
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => setSelectedCategory(null)}
                                      className="flex flex-col items-center gap-2 group transition-all"
                                    >
                                      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${!selectedCategory ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-lg shadow-yellow-500/20 scale-105' : 'bg-yellow-400 text-black shadow-sm hover:bg-yellow-500 border border-yellow-300'}`}>
                                        <StoreIcon className="w-6 h-6 sm:w-7 sm:h-7" />
                                      </div>
                                      <span className={`text-[9px] font-black uppercase tracking-wider text-center transition-colors ${!selectedCategory ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`}>{activeMode === 'product' ? t('home.all_shops') : 'All Services'}</span>
                                    </motion.button>
                                  );
                                }

                                const cat = item.data;
                                const Icon = cat?.icon;
                                return (
                                  <motion.button
                                    key={cat?.name}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.02 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setSelectedCategory(selectedCategory === cat?.name ? null : cat?.name)}
                                    className="flex flex-col items-center gap-2 group transition-all"
                                  >
                                    <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm border relative overflow-hidden ${selectedCategory === cat?.name ? 'border-primary ring-4 ring-primary/20 scale-105 shadow-lg shadow-primary/10' : 'bg-white dark:bg-[#202020] border-border group-hover:border-primary/30 group-hover:shadow-md'}`} style={selectedCategory === cat?.name ? { backgroundColor: cat?.color } : {}}>
                                      <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${cat?.gradient}`} />
                                      <div className={`relative z-10 transition-all duration-300 ${selectedCategory === cat?.name ? 'text-white scale-110' : ''}`} style={selectedCategory !== cat?.name ? { color: cat?.color } : {}}>
                                        {Icon && <Icon className="w-6 h-6 sm:w-7 sm:h-7" />}
                                      </div>
                                    </div>
                                    <span className={`text-[9px] font-black uppercase tracking-wider text-center leading-tight transition-colors line-clamp-2 max-w-[70px] ${selectedCategory === cat?.name ? 'text-primary' : 'text-muted-foreground'}`} style={selectedCategory !== cat?.name ? {} : { color: cat?.color }}>
                                      {t(`categories.${cat?.name}`, { defaultValue: cat?.name.split(' & ')[0] })}
                                    </span>
                                  </motion.button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>

                      {/* Dots */}
                      <div className="flex justify-center items-center gap-1.5 mt-2">
                        {[...Array(Math.ceil((1 + categories.length) / 8))].map((_, i) => (
                          <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === mobileCategoryPage ? 'w-4 bg-primary' : 'w-1.5 bg-primary/20'}`}
                          />
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stores grid header */}
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="space-y-1.5 min-w-0 pr-2">
                <h1 className="text-base md:text-xl font-black text-foreground truncate tracking-tight">
                  {activeSearch ? 'Matching Stores' : (locationName.split(',')[0].length > 2 && locationName !== 'Connaught Place' ? `Stores in ${locationName.split(',')[0]}` : 'Hyperlocal Shops')}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                    {filteredStores.length} {t('home.stores_found')}
                  </span>
                  <div className="flex items-center gap-1.5 text-[8px] md:text-[9px] text-muted-foreground bg-accent/10 w-fit px-2 py-0.5 rounded-full border border-accent/20">
                    <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                    Marketplace Live
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <SortOptions 
                  priceSort={priceSort}
                  onPriceSortChange={setPriceSort}
                  showRating={true}
                  ratingSort={ratingSort}
                  onRatingSortChange={setRatingSort}
                  maxDistance={maxDistance}
                  onMaxDistanceChange={setMaxDistance}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
              {filteredStores.length === 0 ? (
                <div className="col-span-full glass rounded-3xl p-12 text-center space-y-4 border-2 border-dashed border-muted-foreground/20">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto opacity-40">
                    <StoreIcon className="w-8 h-8 text-foreground" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{t('home.no_shops_found')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t('home.try_changing_location')}</p>
                  </div>
                </div>
              ) : (
                filteredStores.map((store, i) => (
                  <motion.div
                    key={store.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => handleStoreClick(store.id)}
                    className={`glass rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all group relative ${store.plan === 'pro' ? 'border-2 border-primary shadow-lg shadow-primary/20' : ''}`}
                  >
                    <Link to={store.slug ? `/stores/${store.slug}` : `/store/${store.id}`} className="sr-only" itemProp="url">Visit {store.name}</Link>
                    <div className="relative h-40 overflow-hidden">
                      <img src={store.image} alt={store.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg backdrop-blur-md ${store.isOpen ? 'bg-accent/80 text-accent-foreground' : 'bg-destructive/90 text-destructive-foreground'}`}>
                          {store.isOpen ? t('home.open_now') : t('home.closed')}
                        </span>
                      </div>

                      {/* Pro Store Logo */}
                      {store.plan === 'pro' && store.logo && (
                        <div className="absolute bottom-3 left-3 w-10 h-10 rounded-lg bg-white p-0.5 shadow-lg border border-border/10 overflow-hidden">
                          <img src={store.logo} alt="Logo" className="w-full h-full object-contain rounded-md" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-bold text-foreground">{store.name}</h3>

                        <div className="flex flex-col items-end">
                          {Array.isArray(store.reviews) && store.reviews.length > 0 ? (
                            <>
                              <div className="flex items-center gap-1 text-primary">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span className="text-xs font-semibold">
                                  {(store.reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / store.reviews.length).toFixed(1)}
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">({store.reviews.length})</span>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-1 text-primary">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span className="text-xs font-semibold">{store.rating}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">(No reviews)</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            const query = (store.lat && store.lng) ? `${store.lat},${store.lng}` : encodeURIComponent(store.address);
                            window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                          }}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 flex-1 hover:text-primary transition-colors cursor-pointer group/addr"
                        >
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/50 group-hover/addr:text-primary transition-colors" />
                          <span className="truncate font-medium group-hover/addr:underline">
                            {store.address ? (store.address.split(',')[1]?.trim() || store.address.split(',')[0]) : 'Local Area'}
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg shrink-0">
                          {store.distance?.toFixed(1)} km
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-2 opacity-70">
                        <Clock className="w-2.5 h-2.5 shrink-0" />
                        <span className="font-medium">{store.timings ? `${store.timings.open} - ${store.timings.close}` : '10 AM - 10 PM'}</span>
                      </div>

                      {/* Integrated Product Search Results */}
                      {activeSearch && storeMatchingProducts[store.id] && (
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <div className="flex items-center justify-between mb-2 px-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">Found Products</span>
                            <span className="text-[10px] font-bold text-muted-foreground">{storeMatchingProducts[store.id].length} items</span>
                          </div>
                          <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide snap-x">
                            {storeMatchingProducts[store.id].map((p, idx) => {
                              const hasDiscount = !!p.discountedPrice && Number(p.discountedPrice) > 0 && Number(p.discountedPrice) < p.price;
                              const discountedPrice = hasDiscount ? Number(p.discountedPrice) : p.price;
                              const discountPercent = hasDiscount ? Math.round(((p.price - discountedPrice) / p.price) * 100) : 0;

                              return (
                                <motion.div
                                  key={p.id + idx}
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleProductClick(p.id, store.id);
                                  }}
                                  className="flex-shrink-0 w-[115px] bg-white dark:bg-slate-900 rounded-2xl border border-border/40 hover:border-primary/30 transition-all duration-300 snap-start group/prod p-1.5 flex flex-col hover:shadow-xl cursor-pointer relative overflow-hidden"
                                >
                                  <div className="relative h-18 shrink-0 overflow-hidden p-1">
                                    <div className="w-full h-full rounded-xl overflow-hidden bg-secondary/15 relative">
                                      <img src={p.image} className="w-full h-full object-cover group-hover/prod:scale-110 transition-transform duration-700 ease-out" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover/prod:opacity-100 transition-opacity duration-500" />
                                    </div>
                                    {/* Discount badge for Pro stores */}
                                    {hasDiscount && (
                                      <div className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[7px] font-black px-1 py-0.5 rounded-md flex items-center gap-0.5 shadow-md z-10 border border-white/10 uppercase tracking-tighter">
                                        <Tag className="w-2 h-2" />
                                        {discountPercent}% OFF
                                      </div>
                                    )}

                                    {/* Quantity Tag */}
                                    {p.quantity && (
                                      <div className="absolute top-1.5 right-1.5 bg-slate-900/80 backdrop-blur-md text-white text-[7px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-md z-10 border border-white/10 uppercase tracking-tighter">
                                        {p.quantity.includes(' - ') ? p.quantity : p.quantity.replace(/([0-9.]+)([a-zA-Z]+)/, '$1 - $2')}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col flex-1 justify-between px-1 pb-0.5">
                                    <div className="mb-1">
                                      <p className="text-[9px] font-extrabold text-foreground line-clamp-1 group-hover/prod:text-primary transition-colors tracking-tight">{p.name}</p>
                                      <div className="flex items-baseline gap-1 mt-0.5">
                                        <span className="text-[10px] font-black text-foreground">₹{discountedPrice}</span>
                                        {hasDiscount && (
                                          <span className="text-[7px] text-muted-foreground line-through opacity-50">₹{p.price}</span>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addToCart({ product: p, storeId: store.id, storeName: store.name, quantity: 1 });
                                      }}
                                      className="w-full h-7 rounded-lg bg-primary text-white text-[8px] font-black flex items-center justify-center gap-1 hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/10"
                                    >
                                      <Plus className="w-2.5 h-2.5" />
                                      Add
                                    </button>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Active Order Tracking Widget (Live) */}
        {user && activeOrders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-24 left-4 right-4 z-40 sm:hidden"
          >
            <div
              onClick={() => navigate('/receipts')}
              className="glass rounded-[2rem] p-4 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-primary/20 cursor-pointer bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl group hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary relative overflow-hidden">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <ShoppingBasket className="w-6 h-6" />
                  </motion.div>
                  {/* Status Dot */}
                  <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-accent rounded-full border-2 border-white animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-black uppercase tracking-widest text-primary">Active Order</p>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <p className="text-[10px] font-bold text-muted-foreground">{activeOrders[0].storeName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-foreground capitalize">
                      {t(`common.order_status.${activeOrders[0].status}`, { defaultValue: activeOrders[0].status })}
                    </h4>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4].map(step => {
                        const steps = ['pending', 'accepted', 'packed', 'completed'];
                        const currentIdx = steps.indexOf(activeOrders[0].status);
                        const stepIdx = step - 1;
                        return (
                          <div
                            key={step}
                            className={`h-1 w-4 rounded-full transition-all duration-500 ${stepIdx <= currentIdx ? 'bg-primary' : 'bg-primary/10'}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <footer className="py-8 px-4 border-t border-border mt-12 bg-transparent backdrop-blur-sm">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <span className="font-bold text-sm text-foreground">BellBasket</span>
              <a href="mailto:contact@bellbasket.com" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Support: contact@bellbasket.com
              </a>
            </div>
            <p className="text-xs text-muted-foreground">© 2026 BellBasket. All rights reserved.</p>
          </div>
        </footer>
      </PullToRefresh>
    </div>
  );
};

export default CustomerHome;

