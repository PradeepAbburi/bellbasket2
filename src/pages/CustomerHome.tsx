import { useState, useEffect, useMemo, useRef, useCallback, startTransition, memo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams, Link, useLocation } from 'react-router-dom';
import { MapPin, Star, Search, Navigation, Loader2, History, X, Store as StoreIcon, Plus, Minus, ChevronLeft, ChevronRight, Clock, Tag, ShoppingBasket, Sparkles, Filter, ChevronDown, ArrowUpDown, Package2, BellRing, Heart } from 'lucide-react';
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
import { db } from '@/lib/firebase';
import { collection, query as firestoreQuery, where, getDocs } from 'firebase/firestore';
import SortOptions from '@/components/SortOptions';
import Loader from '@/components/ui/loader-animation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { Store, Product } from '@/types';
import { CATEGORY_METADATA } from '@/constants/categories';
import { toast } from 'sonner';
import { useApp } from '@/context/AppContext';
const MapView = lazy(() => import('@/components/MapView'));
import PageLoading from '@/components/PageLoading';
import { Helmet } from 'react-helmet';
import VariantSelector from '@/components/VariantSelector';
import { useTranslation } from 'react-i18next';
import { smartSearchProducts, searchProductsOnServer } from '../utils/search';
import { getCurrencySymbol } from '@/utils/currency';

const LOCATION_PRESETS = [
  { name: 'Kakinada', lat: 16.9891, lng: 82.2475 },
  { name: 'Rajahmundry', lat: 17.0005, lng: 81.8040 },
  { name: 'Samalkot', lat: 17.0563, lng: 82.1766 },
  { name: 'Peddapuram', lat: 17.0768, lng: 82.1342 },
  { name: 'Amalapuram', lat: 16.5790, lng: 82.0070 },
  { name: 'Tuni', lat: 17.1580, lng: 82.5470 },
  { name: 'Ramachandrapuram', lat: 16.8363, lng: 82.0274 },
  { name: 'Mandapeta', lat: 16.8628, lng: 81.9286 },
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


// Memoized Store Card with Prefetching
const StoreCard = memo(({ store, onClick, t }: { store: Store & { distance?: number; effectiveRating?: number }, onClick: () => void, t: any }) => {
  const { toggleSaveStore, isStoreSaved } = useApp();
  const prefetch = () => {
    // Programmatic prefetch of StoreDetail
    import('./StoreDetail');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onMouseEnter={prefetch}
      onTouchStart={prefetch}
      className={`glass rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all group relative will-change-transform ${store.plan === 'pro' ? 'border-2 border-primary shadow-lg shadow-primary/20' : ''}`}
    >
      <div className="relative h-40 overflow-hidden">
        <img loading="lazy" src={store.image} alt={store.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <span className={`text-[9.5px] font-black px-2.5 py-1.5 rounded-full shadow-lg backdrop-blur-md border border-black/5 uppercase tracking-widest bg-white text-black flex items-center gap-1.5`}>
            <div className={`w-1.5 h-1.5 rounded-full ${store.isOpen ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
            {store.isOpen ? t('home.open_now') : t('home.closed')}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleSaveStore(store.id);
            }}
            className={`p-2 rounded-full shadow-lg backdrop-blur-md border transition-all active:scale-90 ${
              isStoreSaved(store.id)
                ? 'bg-pink-500 text-white border-pink-400'
                : 'bg-white/80 text-black border-black/5 hover:bg-white'
            }`}
            aria-label={isStoreSaved(store.id) ? "Unsave Store" : "Save Store"}
          >
            <Heart className={`w-3.5 h-3.5 ${isStoreSaved(store.id) ? 'fill-current' : ''}`} />
          </button>
        </div>
        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
            <span className="text-[9.5px] font-black px-2.5 py-1 rounded-full shadow-lg backdrop-blur-md flex items-center gap-1 border border-black/5 bg-white text-black">
                {CATEGORY_METADATA[store.category]?.icon && (() => {
                    const Icon = CATEGORY_METADATA[store.category].icon;
                    return <Icon className="w-3 h-3" style={{ color: CATEGORY_METADATA[store.category]?.color || 'inherit' }} />;
                })()}
                <span className="uppercase tracking-widest">{t(`categories.${store.category}`, { defaultValue: store.category })}</span>
            </span>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-bold text-white truncate max-w-[70%] drop-shadow-sm">{store.name}</h3>
          <div className="flex items-center gap-1 shrink-0 bg-black/20 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/10">
            <Star className="w-3 h-3 fill-current text-amber-400" />
            <span className="text-[11px] font-black leading-none text-amber-400">{store.effectiveRating?.toFixed(1) || store.rating || '0.0'}</span>
            {store.reviews && store.reviews.length > 0 && (
              <span className="text-[9px] font-bold text-white/60 leading-none">({store.reviews.length})</span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            {store.description && (
              <p className="text-[10px] text-white/50 line-clamp-2 leading-relaxed mb-1 italic">
                {store.description}
              </p>
            )}
            <div className="flex items-center gap-1.5 text-xs text-white/90 font-bold truncate">
              <MapPin className="w-3.5 h-3.5 text-white/60" />
              <span className="truncate">{store.address ? (store.address.split(',')[1]?.trim() || store.address.split(',')[0]) : 'Local Area'}</span>
            </div>
          </div>
          <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg shrink-0 ml-2">
            {store.distance?.toFixed(1)} km
          </span>
        </div>
      </div>
    </motion.div>
  );
});

// Memoized Product Card with Prefetching
const ProductCard = memo(({ p, count, onAdd, onUpdate, onRemove, onClick, t, mode, selectedVariant, onVariantTrigger }: { p: Product & { storeName?: string, storeRating?: number, storeReviewCount?: number, distance?: number, storeIsOpen?: boolean, storePhone?: string }, count: number, onAdd: () => void, onUpdate: (q: number) => void, onRemove: () => void, onClick: () => void, t: any, mode?: 'product' | 'service', selectedVariant?: any, onVariantTrigger?: (p: Product) => void }) => {
  const prefetch = () => {
    import('./StoreDetail'); // Product detail is inside StoreDetail view
  };

  const hasDiscount = p.discountedPrice && p.discountedPrice < p.price;
  const lowestVariantPrice = (!selectedVariant && p.hasVariants && p.variants?.length)
    ? Math.min(...p.variants.map(v => v.discountedPrice || v.price))
    : null;
  const discountedPrice = selectedVariant
    ? (hasDiscount ? selectedVariant.discountedPrice : selectedVariant.price)
    : (lowestVariantPrice || (hasDiscount ? Number(p.discountedPrice) : p.price));
  const discountPercent = hasDiscount ? Math.round((( (selectedVariant ? selectedVariant.price : p.price) - (selectedVariant ? (selectedVariant.discountedPrice || selectedVariant.price) : (hasDiscount ? Number(p.discountedPrice) : p.price))) / (selectedVariant ? selectedVariant.price : p.price)) * 100) : 0;

  const currencySymbol = getCurrencySymbol(p.country || (p as any).storeData?.country, (p as any).address || (p as any).storeData?.address);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      onMouseEnter={prefetch}
      onTouchStart={prefetch}
      className="bg-[#f8f9fa] dark:bg-[#161616] p-2.5 md:p-3 rounded-3xl flex flex-col gap-2 md:gap-3 hover:shadow-2xl hover:shadow-primary/10 transition-all border border-slate-200 dark:border-white/5 group/product cursor-pointer relative will-change-transform"
    >
      <div className="aspect-square rounded-2xl overflow-hidden bg-secondary/10 relative">
        {p.isCombo && p.comboItemsData && p.comboItemsData.length > 0 ? (
            <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[2px] bg-primary/20 relative">
                {p.comboItemsData.slice(0, 4).map((c) => (
                    <img key={c.id} src={c.image} className="w-full h-full object-cover" alt="" />
                ))}
                {p.comboItemsData.length < 4 && Array.from({ length: 4 - p.comboItemsData.length }).map((_, i) => (
                    <div key={i} className="w-full h-full bg-zinc-900 flex items-center justify-center">
                        <Package2 className="w-4 h-4 text-primary/20" />
                    </div>
                ))}
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent pointer-events-none" />
            </div>
        ) : (
            <img loading="lazy" src={p.image} alt={p.name} className="w-full h-full object-cover group-hover/product:scale-110 transition-transform duration-700 ease-out" />
        )}
        {hasDiscount && (
          <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[8px] font-black px-1.5 py-0.5 rounded-lg shadow-lg uppercase tracking-tight z-20">
            {discountPercent}% OFF
          </div>
        )}
        {p.hasVariants && (
          <div className="absolute top-2 right-2 bg-secondary/80 backdrop-blur-md text-secondary-foreground text-[8px] font-black px-1.5 py-0.5 rounded-lg shadow-lg uppercase tracking-tight border border-white/10 z-20">
            {p.variants?.length ? `${p.variants.length} Variants` : 'Variants'}
          </div>
        )}
        {p.inStock === false && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-10 transition-all">
            <div className="bg-[#cc2d4a] px-2.5 py-1 rounded-full shadow-2xl border border-white/10">
              <span className="text-[9px] font-black text-white lowercase leading-none">oos</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5 px-0.5">
        <h4 className="text-[12px] md:text-[13px] font-bold text-foreground line-clamp-2 leading-snug min-h-[2.5em] group-hover/product:text-primary transition-colors">{p.name}</h4>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[13px] md:text-sm font-black text-foreground">{currencySymbol}{discountedPrice}</span>
            {hasDiscount && <span className="text-[8px] md:text-[9px] text-muted-foreground line-through opacity-50 font-medium">{currencySymbol}{selectedVariant ? selectedVariant.price : p.price}</span>}
          </div>
        </div>
        
        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-white/5" onClick={e => e.stopPropagation()}>
          {p.inStock === false ? (
            <button disabled className="w-full h-8 rounded-xl bg-muted text-muted-foreground text-[9px] font-black flex items-center justify-center uppercase tracking-widest cursor-not-allowed">
              OOS
            </button>
          ) : (count === 0) ? (
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                if (p.hasVariants && onVariantTrigger) {
                  onVariantTrigger(p);
                } else {
                  onAdd(); 
                }
              }} 
              className="w-full h-8 rounded-xl bg-primary text-white text-[10px] font-black flex items-center justify-center gap-1.5 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
            >
              {mode === 'service' ? (
                <span className="uppercase tracking-widest">Book Now</span>
              ) : (
                <>
                  <Plus className="w-3 h-3" /> 
                  {p.hasVariants ? 'SELECT' : 'ADD'}
                </>
              )}
            </button>
          ) : (
            <div className="w-full h-8 rounded-xl bg-primary text-white flex items-center justify-between px-1.5 shadow-lg shadow-primary/20">
              <button onClick={() => count > 1 ? onUpdate(count - 1) : onRemove()} className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors"><Minus className="w-3 h-3" /></button>
              <span className="text-[11px] font-black">{count}</span>
              <button onClick={() => onUpdate(count + 1)} className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors"><Plus className="w-3 h-3" /></button>
            </div>
          )}
        </div>

        <div className="mt-1 p-2.5 bg-white rounded-2xl flex flex-col gap-1.5 border border-slate-100">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold text-black uppercase tracking-widest truncate flex-1">{p.storeName}</p>
            {p.storeRating !== undefined && (
              <div className="flex items-center gap-1 text-black shrink-0">
                <Star className="w-2.5 h-2.5 fill-current" />
                <span className="text-[10px] font-bold">{p.storeRating.toFixed(1)}</span>
                {p.storeReviewCount !== undefined && p.storeReviewCount > 0 && (
                  <span className="text-[9px] text-black/40 font-bold">({p.storeReviewCount})</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-black font-bold">
            <MapPin className="w-3 h-3 text-black/40" />
            <span className="tracking-tight">{p.distance?.toFixed(1)} km away</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

const CustomerHome = () => {
  const { user, loading, stores: allStores, allProducts, addToCart, removeFromCart, updateQuantity, cart, orders, refreshData, requestPushNotifications, activeMode, setActiveMode } = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const [search, setSearch] = useState('');
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [userLat, setUserLat] = useState<number>(() => Number(localStorage.getItem('user_lat')) || 16.9891);
  const [userLng, setUserLng] = useState<number>(() => Number(localStorage.getItem('user_lng')) || 82.2475);
  const [locationName, setLocationName] = useState(() => localStorage.getItem('user_location_name') || 'Kakinada');
  const [userMandal, setUserMandal] = useState(() => localStorage.getItem('user_mandal') || '');
  const [userDistrict, setUserDistrict] = useState(() => localStorage.getItem('user_district') || '');
  const [userState, setUserState] = useState(() => localStorage.getItem('user_state') || '');
  const [userCountry, setUserCountry] = useState(() => localStorage.getItem('user_country') || '');
  const [selectedLocationType, setSelectedLocationType] = useState(() => localStorage.getItem('selected_location_type') || '');
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
  const [showCategories, setShowCategories] = useState(false);
  const [mobileCategoryPage, setMobileCategoryPage] = useState(0);
  const [pendingMode, setPendingMode] = useState<'product' | 'service' | null>(null);
  const [pendingCategory, setPendingCategory] = useState<string | null>(null);
  const [priceSort, setPriceSort] = useState<'none' | 'low-high' | 'high-low'>('none');
  const [ratingSort, setRatingSort] = useState<'none' | 'top-rated' | 'low-rated'>('none');
  const [maxDistance, setMaxDistance] = useState<number>(20);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchResultType, setSearchResultType] = useState<'stores' | 'products'>('products');
  const [variantSelectorProduct, setVariantSelectorProduct] = useState<Product | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // 1. Debounce search input for real-time suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200); // Faster debounce for better feel
    return () => clearTimeout(timer);
  }, [search]);

  // Helper functions used by multiple hooks
  const checkMatchesArea = useCallback((storeLat: number, storeLng: number, store: any) => {
    const distance = getDistanceKm(userLat, userLng, storeLat, storeLng);

    if (selectedLocationType === 'country') return true; 
    if (selectedLocationType === 'state' && userState) {
        const us = userState.toLowerCase();
        return (store.state && store.state.toLowerCase() === us) || (store.address && store.address.toLowerCase().includes(us)) || distance <= maxDistance;
    }

    if (selectedLocationType === 'district' && userDistrict) {
      const ud = userDistrict.toLowerCase();
      return (store.district && store.district.toLowerCase() === ud)
        || (store.mandal && store.mandal.toLowerCase() === ud)
        || (store.address && store.address.toLowerCase().includes(ud))
        || distance <= maxDistance;
    }

    return distance <= maxDistance;
  }, [userLat, userLng, selectedLocationType, userState, userDistrict, maxDistance]);

  // Derived state memos
  const areaStoreIds = useMemo(() => {
    return allStores
      .filter(s => {
        const matchesMode = s.storeType ? s.storeType === activeMode : activeMode === 'product';
        return matchesMode && checkMatchesArea(s.lat, s.lng, s);
      })
      .map(s => s.id);
  }, [allStores, checkMatchesArea, activeMode]);

  // On-demand search fetch to prevent 14MB payload
  useEffect(() => {
    // Fetch if we have a debounced search OR a fixed active search
    const query = activeSearch.trim() || debouncedSearch.trim();
    if (!query && !selectedCategory) {
      setLocalProducts([]);
      return;
    }

    const fetchResults = async () => {
      setIsSearchingProducts(true);
      const results = await searchProductsOnServer(query, selectedCategory, areaStoreIds);
      
      // Enrich combo products with their items for collage
      const comboIdsToFetch: string[] = [];
      results.forEach(p => {
        if (p.isCombo && p.comboItems && p.comboItems.length > 0) {
          p.comboItems.forEach(cid => {
            if (!results.some(r => r.id === cid) && !comboIdsToFetch.includes(cid)) {
              comboIdsToFetch.push(cid);
            }
          });
        }
      });

      if (comboIdsToFetch.length > 0) {
        try {
          const extraDocs = await getDocs(firestoreQuery(collection(db, 'products'), where('__name__', 'in', comboIdsToFetch.slice(0, 30))));
          const extraProducts = extraDocs.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
          
          results.forEach(p => {
            if (p.isCombo && p.comboItems) {
              p.comboItemsData = p.comboItems.map(cid => {
                return results.find(r => r.id === cid) || extraProducts.find(r => r.id === cid);
              }).filter(Boolean) as Product[];
            }
          });
        } catch (e) { console.error("Combo enrichment failed", e); }
      } else {
        // Even if no extra fetch needed, link data if items are already in results
        results.forEach(p => {
          if (p.isCombo && p.comboItems) {
            p.comboItemsData = results.filter(r => p.comboItems?.includes(r.id));
          }
        });
      }

      setLocalProducts(results);
      setIsSearchingProducts(false);
    };

    fetchResults();
  }, [debouncedSearch, activeSearch, selectedCategory, areaStoreIds]);


  const searchSuggestions = useMemo(() => {
    if (!search.trim() || isSearching || activeSearch === search) return [];

    const q = search.toLowerCase();
    const suggestions = new Set<string>();

    allStores
      .filter(s => !s.isBlocked && s.plan && s.plan !== 'none' && checkMatchesArea(s.lat, s.lng, s) && (s.storeType ? s.storeType === activeMode : activeMode === 'product'))
      .forEach(s => {
        if (s.name.toLowerCase().includes(q)) {
          suggestions.add(JSON.stringify({ type: 'store', name: s.name, id: s.id, lat: s.lat, lng: s.lng }));
        }
      });

    [...allProducts, ...localProducts].forEach(p => {
      // Find the store for this product to check if it's blocked AND in area AND matches mode
      const store = allStores.find(s => s.id === p.vendorId);
      if (store && !store.isBlocked && store.plan && store.plan !== 'none' && checkMatchesArea(store.lat, store.lng, store) && (store.storeType ? store.storeType === activeMode : activeMode === 'product')) {
        if (p.name.toLowerCase().includes(q)) suggestions.add(JSON.stringify({ type: 'product', name: p.name }));
      }
    });

    return Array.from(suggestions).map(s => JSON.parse(s)).slice(0, 10);
  }, [search, allStores, allProducts, localProducts, isSearching, activeSearch, checkMatchesArea, activeMode]);

  const categoryRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLDivElement>(null);
  const locationSearchTimeout = useRef<NodeJS.Timeout>();

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
    localStorage.setItem('user_mandal', userMandal);
    localStorage.setItem('user_district', userDistrict);
    localStorage.setItem('user_state', userState);
    localStorage.setItem('user_country', userCountry);
    localStorage.setItem('selected_location_type', selectedLocationType);
  }, [userLat, userLng, locationName, userMandal, userDistrict, userState, userCountry, selectedLocationType]);




  // Hide BottomBar when any modal/popup is open
  useEffect(() => {
    const bottomNav = document.getElementById('bottom-nav');
    const isModalOpen = !!(showLocationPicker || variantSelectorProduct || pendingMode);
    const isCategoryPopupOpen = !!pendingCategory;
    
    if (bottomNav) {
      if (isModalOpen) {
        bottomNav.style.display = 'none';
      } else if (isCategoryPopupOpen) {
        bottomNav.style.display = '';
        bottomNav.style.zIndex = '50';
      } else {
        bottomNav.style.display = '';
        bottomNav.style.zIndex = '';
      }
    }
    return () => {
      if (bottomNav) {
        bottomNav.style.display = '';
        bottomNav.style.zIndex = '';
      }
    };
  }, [showLocationPicker, variantSelectorProduct, pendingMode, pendingCategory]);

  useEffect(() => {
    const searchQuery = searchParams.get('q');
    if (searchQuery) {
      setSearch(searchQuery);
      setActiveSearch(searchQuery);
    }
    
    // Auto-detect location - Handled by browser API or user selection
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

            // Extract admin areas
            const mandal = data.address?.suburb || data.address?.locality || data.address?.village || data.address?.town || data.address?.city_district || '';
            const district = data.address?.district || data.address?.city || data.address?.town || '';
            const state = data.address?.state || '';
            const country = data.address?.country || '';

            setUserMandal(mandal);
            setUserDistrict(district);
            setUserState(state);
            setUserCountry(country);
            setSelectedLocationType(''); // GPS reset

            const newItem = {
              id: data.place_id || Math.random().toString(),
              name: name,
              fullName: data.display_name,
              lat,
              lon: lng,
              mandal,
              district,
              state,
              country,
              locationType: ''
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
          setUserLat(16.9891);
          setUserLng(82.2475);
          setLocationName('Kakinada');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0 // Force fresh location, don't use cache
      }
    );
  };


  const handleLocationSearch = (val: string) => {
    setLocationSearch(val);
    if (val.length < 2) {
      setLocationResults([]);
      return;
    }

    if (locationSearchTimeout.current) clearTimeout(locationSearchTimeout.current);
    
    setIsSearchingLocation(true);
    locationSearchTimeout.current = setTimeout(async () => {
      try {
        const query = val.toUpperCase() === 'HYD' ? 'Hyderabad, India' : val;
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=${userLat}&lon=${userLng}&limit=12`;
        const res = await fetch(photonUrl);
        const data = await res.json();

        const results = data.features
          .filter((f: any) => {
            const country = f.properties.countrycode?.toUpperCase();
            return country !== 'BD' && country !== 'PK';
          })
          .map((f: any) => {
            const p = f.properties;
          const dist = getDistanceKm(userLat, userLng, f.geometry.coordinates[1], f.geometry.coordinates[0]);

          const addressParts = [];
          if (p.street) addressParts.push(p.street);
          if (p.district) addressParts.push(p.district);
          if (p.city) addressParts.push(p.city);
          if (p.state) addressParts.push(p.state);

          const fullName = [p.name || p.street, ...addressParts.filter(part => part !== (p.name || p.street))].filter(Boolean).join(', ');

          let namePart = p.name || p.street || p.district || p.city || p.locality || '';
          if (!namePart) namePart = fullName.split(',')[0];

          const context = p.district || p.city || p.locality || '';
          if (context && namePart !== context && !namePart.includes(context)) {
            namePart = `${namePart}, ${context}`;
          }

          return {
            place_id: f.properties.osm_id || Math.random().toString(),
            display_name: fullName,
            short_name: namePart,
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
            distanceKm: dist,
            type: p.osm_value || p.type || 'place',
            mandal: p.suburb || p.locality || (p.osm_value === 'suburb' ? p.name : ''),
            district: p.district || p.city || (p.osm_value === 'city' ? p.name : ''),
            state: p.state || (p.osm_value === 'state' ? p.name : ''),
            country: p.country || (p.osm_value === 'country' ? p.name : '')
          };
        });

        const sorted = results.sort((a: any, b: any) => {
          if (a.distanceKm < 50 && b.distanceKm >= 50) return -1;
          if (b.distanceKm < 50 && a.distanceKm >= 50) return 1;
          return 0;
        });

        setLocationResults(sorted);
      } catch (e) {
        console.error('Search failed', e);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=in&limit=10&addressdetails=1`);
          const data = await res.json();
          setLocationResults(data.map((r: any) => ({
            ...r,
            short_name: r.display_name.split(',')[0],
            distanceKm: getDistanceKm(userLat, userLng, parseFloat(r.lat), parseFloat(r.lon)),
            mandal: r.address?.suburb || r.address?.locality || r.address?.village || r.address?.town || r.address?.city_district || '',
            district: r.address?.district || r.address?.city || r.address?.town || '',
            state: r.address?.state || '',
            country: r.address?.country || ''
          })));
        } catch (fallbackErr) {
          console.error('Fallback failed', fallbackErr);
        }
      } finally {
        setIsSearchingLocation(false);
      }
    }, 200);
  };

  const selectResult = (res: any) => {
    const lat = typeof res.lat === 'string' ? parseFloat(res.lat) : res.lat;
    const lng = typeof res.lon === 'string' ? parseFloat(res.lon) : res.lon;
    const shortName = res.short_name || res.display_name.split(',')[0];

    setUserLat(lat);
    setUserLng(lng);
    setLocationName(shortName);
    setUserMandal(res.mandal || '');
    setUserDistrict(res.district || '');
    setUserState(res.state || '');
    setUserCountry(res.country || '');
    const localTypes = ['city', 'town', 'village', 'suburb', 'locality', 'hamlet', 'quarter', 'neighbourhood', 'mandal'];
    const locationType = res.type === 'country' ? 'country'
      : res.type === 'state' ? 'state'
      : (res.type === 'district' || res.type === 'city_district' || (res.district && !localTypes.includes(res.type))) ? 'district'
      : 'local';
    setSelectedLocationType(locationType);

    const newItem = {
      id: res.place_id?.toString() || Math.random().toString(),
      name: shortName,
      fullName: res.display_name,
      lat,
      lon: lng,
      mandal: res.mandal || '',
      district: res.district || '',
      state: res.state || '',
      country: res.country || '',
      locationType
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
    const store = allStores.find(s => s.id === storeId);
    const basePath = store?.slug ? `/stores/${store.slug}` : `/store/${storeId}`;
    navigate(basePath, { state: { store } });
  };

  const handleProductClick = (productId: string, storeId: string) => {
    const store = allStores.find(s => s.id === storeId);
    const path = store?.slug ? `/stores/${store.slug}` : `/store/${storeId}`;
    navigate(`${path}?productId=${productId}`, { state: { store } });
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
      .sort((a, b) => {
        // Keep "Others" or "Other Services" last
        if (a.name === 'Others' || a.name === 'Other Services') return 1;
        if (b.name === 'Others' || b.name === 'Other Services') return -1;
        return b.storeCount - a.storeCount;
      });
  }, [activeMode, allStores]);

  // Pre-calculate minimum price for each store for sorting
  const storeMinPrices = useMemo(() => {
    const prices: Record<string, number> = {};
    const sourceProducts = [...allProducts, ...localProducts];
    sourceProducts.forEach(p => {
      const sid = p.vendorId;
      if (sid) {
        const currentMin = prices[sid] ?? Infinity;
        const productPrice = p.discountedPrice && p.discountedPrice < p.price ? p.discountedPrice : p.price;
        if (productPrice < currentMin) {
          prices[sid] = Number(productPrice);
        }
      }
    });
    return prices;
  }, [allProducts, localProducts]);

  // Unified Search Results
  const { filteredStores, storeMatchingProducts, searchedProducts } = useMemo(() => {
    const query = activeSearch.trim().toLowerCase();

    // 1. Area matching helper


    // Use localProducts for on-demand search + allProducts for any globally filtered items
    const combinedProducts = Array.from(new Map([...allProducts, ...localProducts].map(p => [p.id, p])).values());

    // 2. Group ALL matching products by vendorId using Smart Search
    const matchingGroups: Record<string, Product[]> = {};
    const baseProducts = (selectedCategory 
      ? combinedProducts.filter(p => p.category === selectedCategory) 
      : combinedProducts)
      .filter(p => {
        const store = allStores.find(s => s.id === p.vendorId);
        return store && (store.storeType ? store.storeType === activeMode : activeMode === 'product');
      })
      .map(p => ({
        ...p,
        storeName: allStores.find(s => s.id === p.vendorId)?.name || ''
      }));

    const matched = smartSearchProducts(baseProducts, activeSearch);
    
    // Sort and enrich products with store info for flat search view
    const enrichedMatched = matched
      .map(p => {
        const store = allStores.find(s => s.id === p.vendorId);
        return {
          ...p,
          storeName: store?.name || 'Local Store',
          storeSlug: store?.slug,
          storeIsOpen: store?.isOpen ?? true,
          storeRating: store?.rating || 4.5,
          storeReviewCount: store?.reviews?.length || 0,
          distance: store ? getDistanceKm(userLat, userLng, store.lat, store.lng) : -1,
          isBlocked: store?.isBlocked,
          plan: store?.plan,
          storePhone: store?.phone,
          storeData: store
        };
      })
      .filter(p => !p.isBlocked && p.plan && p.plan !== 'none' && p.distance !== -1 && checkMatchesArea(p.storeData.lat, p.storeData.lng, p.storeData))
      .sort((a, b) => {
        const getPlanWeight = (plan?: string) => {
          if (plan === 'pro') return 3;
          if (plan === 'growth') return 2;
          if (plan === 'basic') return 1;
          return 0;
        };
        const weightA = getPlanWeight(a.plan);
        const weightB = getPlanWeight(b.plan);
        if (weightA !== weightB) return weightB - weightA;
        if (Math.abs((b.storeRating || 0) - (a.storeRating || 0)) >= 0.1) return (b.storeRating || 0) - (a.storeRating || 0);
        return (a.distance || 0) - (b.distance || 0);
      });

    // Grouping for store cards (legacy or if we need them inside store cards elsewhere)
    enrichedMatched.forEach(p => {
      const sid = p.vendorId || 'unknown';
      if (!matchingGroups[sid]) matchingGroups[sid] = [];
      matchingGroups[sid].push(p);
    });

    // 3. Filter Stores
    const filtered = allStores.filter(store => {
      // mode filter
      const matchesMode = store.storeType ? store.storeType === activeMode : activeMode === 'product'; 
      if (!matchesMode) return false;

      // HIDDEN FILTER: Blocked or Expired
      if (store.isBlocked) return false;
      if (store.plan === 'none' || !store.plan) return false;

      if (!checkMatchesArea(store.lat, store.lng, store)) return false;

      // Category filter
      const matchesCategory = selectedCategory ? store.category === selectedCategory : true;
      if (!matchesCategory) return false;

      // Match found if search matches store info OR store has matching products
      const matchesStore = 
        store.name.toLowerCase().includes(query) || 
        store.category.toLowerCase().includes(query) ||
        (store.address && store.address.toLowerCase().includes(query)) ||
        (store.mandal && store.mandal.toLowerCase().includes(query)) ||
        (store.district && store.district.toLowerCase().includes(query)) ||
        (store.state && store.state.toLowerCase().includes(query)) ||
        (store.country && store.country.toLowerCase().includes(query));
      const hasMatchingProducts = matchingGroups[store.id] && matchingGroups[store.id].length > 0;
      return query ? (matchesStore || hasMatchingProducts) : true;
    });

    // 3. Sort by Plan and then Distance
    const getPlanWeight = (plan?: string) => {
      if (plan === 'pro') return 3;
      if (plan === 'growth') return 2;
      if (plan === 'basic') return 1;
      return 0;
    };

    const sortedStores = filtered
      .map(s => {
        const rating = (Array.isArray(s.reviews) && s.reviews.length > 0)
          ? s.reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / s.reviews.length
          : (s.rating || 0);
        return { ...s, distance: getDistanceKm(userLat, userLng, s.lat, s.lng), effectiveRating: rating };
      })
      .sort((a, b) => {
        const weightA = getPlanWeight(a.plan);
        const weightB = getPlanWeight(b.plan);

        // Always prioritize distance as requested
        const distA = a.distance || 0;
        const distB = b.distance || 0;
        if (Math.abs(distA - distB) > 0.1) return distA - distB;

        if (ratingSort !== 'none') {
          if (ratingSort === 'top-rated') { if (b.effectiveRating !== a.effectiveRating) return b.effectiveRating - a.effectiveRating; }
          else { if (a.effectiveRating !== b.effectiveRating) return a.effectiveRating - b.effectiveRating; }
        }

        if (priceSort !== 'none') {
          const pA = storeMinPrices[a.id] ?? Infinity;
          const pB = storeMinPrices[b.id] ?? Infinity;
          if (priceSort === 'low-high') { if (pA !== pB) return pA - pB; }
          else { 
            const pA_val = pA === Infinity ? -1 : pA;
            const pB_val = pB === Infinity ? -1 : pB;
            if (pB_val !== pA_val) return pB_val - pA_val;
          }
        }

        // Plan and Rating as tie-breakers for same-distance stores
        if (weightA !== weightB) return weightB - weightA;
        if (Math.abs(b.effectiveRating - a.effectiveRating) >= 0.1) return b.effectiveRating - a.effectiveRating;
        return distA - distB;
      });

    // Apply sort filters to searchedProducts (flat product list in search view)
    let sortedProducts = [...enrichedMatched];

    if (priceSort !== 'none') {
      sortedProducts = sortedProducts.sort((a, b) => {
        const pA = a.discountedPrice && Number(a.discountedPrice) > 0 && Number(a.discountedPrice) < a.price ? Number(a.discountedPrice) : a.price;
        const pB = b.discountedPrice && Number(b.discountedPrice) > 0 && Number(b.discountedPrice) < b.price ? Number(b.discountedPrice) : b.price;
        return priceSort === 'low-high' ? pA - pB : pB - pA;
      });
    } else if (ratingSort !== 'none') {
      sortedProducts = sortedProducts.sort((a, b) => {
        const rA = a.storeRating || 0;
        const rB = b.storeRating || 0;
        return ratingSort === 'top-rated' ? rB - rA : rA - rB;
      });
    } else {
      // Default product sort: Distance
      sortedProducts = sortedProducts.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    return {
      filteredStores: (selectedStoreId ? sortedStores.filter(s => s.id === selectedStoreId) : sortedStores) as (Store & { distance?: number; effectiveRating?: number })[],
      storeMatchingProducts: matchingGroups,
      searchedProducts: sortedProducts
    };
  }, [activeSearch, selectedCategory, userLat, userLng, allStores, allProducts, localProducts, locationName, activeMode, maxDistance, priceSort, ratingSort, storeMinPrices, selectedLocationType, userState, userCountry, selectedStoreId, checkMatchesArea]);

  const handleSearchTrigger = (val?: string) => {
    setSelectedStoreId(null);
    setSearchResultType('products');
    const query = val !== undefined ? val : search;
    // Removed artificial timeout - using direct transition for 'instant' feel
    startTransition(() => {
      setActiveSearch(query);
    });
  };

  const handleModeChange = (mode: 'product' | 'service') => {
    if (mode === activeMode) return;
    setPendingMode(mode);
  };

  const confirmModeChange = () => {
    if (!pendingMode) return;
    setSelectedStoreId(null);
    setActiveMode(pendingMode);
    setSelectedCategory(null);
    setMobileCategoryPage(0);
    setPendingMode(null);
  };

  if (loading) {
    return <PageLoading />;
  }

  return (
    <div className="min-h-screen gradient-warm">
      <Helmet>
        <title>{
          activeSearch 
            ? `Search for "${activeSearch}" near ${locationName || 'me'} | BellBasket Hyper-local Marketplace`
            : selectedCategory
              ? `Best ${selectedCategory} Stores & Services near ${locationName || 'me'} | BellBasket`
              : `BellBasket - Hyper-Local Digital Marketplace in ${locationName || 'India'}`
        }</title>
        <meta name="description" content={
          selectedCategory
            ? `Discover and order from the top-rated ${selectedCategory} stores and neighborhood shops in ${locationName || 'your area'}. Enjoy ultra-fast local pickup and support community entrepreneurs on BellBasket.`
            : activeSearch
              ? `Find verified local businesses matching "${activeSearch}" near ${locationName || 'your location'}. Compare ratings, check inventory, and order or book services instantly on BellBasket.`
              : `BellBasket is India's leading hyper-local digital marketplace. Browse verified neighborhood stores, grocery shops, kiranas, pharmacies, AC repair technicians, electricians, and salons near ${locationName || 'you'} within a strict 15km hyperlocal boundary.`
        } />
        <meta name="keywords" content={
          selectedCategory
            ? `${selectedCategory} near me, ${selectedCategory} shops ${locationName || 'me'}, neighborhood ${selectedCategory}, buy ${selectedCategory} online, hyperlocal marketplace`
            : activeSearch
              ? `${activeSearch} near me, local ${activeSearch}, verified ${activeSearch} service ${locationName || 'me'}, search ${activeSearch} shops`
              : `hyperlocal marketplace, neighborhood stores, neighborhood shops, near stores, near shops, local digital marketplace, grocery delivery Bharat, kirana store online, AC repair near me, salon near me, local home services`
        } />
        <meta property="og:title" content={
          activeSearch 
            ? `Search for "${activeSearch}" near ${locationName || 'me'} | BellBasket`
            : selectedCategory
              ? `Best ${selectedCategory} Stores & Services near ${locationName || 'me'} | BellBasket`
              : `BellBasket - Hyper-Local Digital Marketplace in ${locationName || 'India'}`
        } />
        <meta property="og:description" content={
          selectedCategory
            ? `Support neighborhood ${selectedCategory} shops. Compare ratings and prices near you on India's top hyperlocal marketplace.`
            : activeSearch
              ? `Find verified local options for ${activeSearch} near your neighborhood on BellBasket.`
              : `Shop from your favorite neighborhood stores on India's leading hyper-local digital marketplace.`
        } />
        <meta property="og:url" content="https://bellbasket.com/browse" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://bellbasket.com/browse" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": `Stores near me in ${locationName || 'my area'} on BellBasket`,
            "description": `Discover and shop from the best local stores in ${locationName || 'your area'}.`,
            "itemListElement": filteredStores.slice(0, 15).map((s, i) => ({
              "@type": "ListItem",
              "position": i + 1,
              "item": {
                "@type": "LocalBusiness",
                "name": s.name,
                "image": s.image,
                "url": `https://bellbasket.com${s.slug ? `/stores/${s.slug}` : `/store/${s.id}`}`,
                "address": {
                  "@type": "PostalAddress",
                  "streetAddress": s.address,
                  "addressLocality": s.address.split(',')[0] || "Local"
                }
              }
            }))
          })}
        </script>
      </Helmet>
      <Header />
      <PullToRefresh onRefresh={refreshData} className="pt-16 sm:pt-18 pb-32 px-4 max-w-6xl mx-auto space-y-6">
        {/* Main Content Area - Hidden while searching or search active */}
        {!isSearching && !activeSearch && (
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
                  {isSearchingLocation && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  )}
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
                            {t('home.recently_searched', { defaultValue: 'Recently Searched' })}
                          </div>
                          <button onClick={clearHistory} className="text-[10px] text-primary hover:underline font-bold">{t('common.clear', { defaultValue: 'Clear' })}</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {searchHistory.map(item => (
                            <button
                              key={item.id}
                              onClick={() => {
                                setUserLat(item.lat);
                                setUserLng(item.lon);
                                setLocationName(item.name);
                                setUserMandal(item.mandal || '');
                                setUserDistrict(item.district || '');
                                setUserState(item.state || '');
                                setUserCountry(item.country || '');
                                setSelectedLocationType(item.locationType || '');
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
                          {t('home.refine_on_map', { defaultValue: 'Refine on Map' })}
                        </div>
                      </div>
                      <div className="h-48 rounded-2xl overflow-hidden border-2 border-primary/10 shadow-inner relative group">
                        <Suspense fallback={<div className="h-full w-full bg-muted animate-pulse flex items-center justify-center text-xs font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">{t('home.localizing_map', { defaultValue: 'Localizing neighborhood Map...' })}</div>}>
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
                                  setUserMandal(data.address?.suburb || data.address?.locality || data.address?.village || data.address?.town || data.address?.city_district || '');
                                  setUserDistrict(data.address?.district || data.address?.city || data.address?.town || '');
                                  setUserState(data.address?.state || '');
                                  setUserCountry(data.address?.country || '');
                                  setSelectedLocationType('');
                                  toast.success('Location updated manually');
                                });
                            }}
                          />
                        </Suspense>
                        <div className="absolute bottom-3 left-3 right-3 z-[400] pointer-events-none">
                          <div className="bg-black/60 backdrop-blur-md text-[10px] text-white px-3 py-1.5 rounded-full font-bold text-center">
                            {t('home.tap_map_to_fix', { defaultValue: 'Tap anywhere on map to fix your location' })}
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
        <div className="sticky top-16 z-30 py-2 -mx-4 px-4 bg-white/95 dark:bg-[#202020]/95 backdrop-blur-md border-b border-border/10 shadow-sm">
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
                    setSelectedStoreId(null);
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
                      {searchSuggestions.map((suggestion: any, idx) => (
                        <li key={idx}>
                          <button
                            onClick={() => {
                              if (suggestion.type === 'location') {
                                setLocationName(suggestion.name);
                                // Map adminType to locationType for the full hierarchy
                                const lt = suggestion.adminType === 'country' ? 'country'
                                  : suggestion.adminType === 'state' ? 'state'
                                  : suggestion.adminType === 'district' ? 'district'
                                  : suggestion.adminType === 'mandal' ? 'mandal'
                                  : '';
                                setSelectedLocationType(lt);
                                if (suggestion.lat && suggestion.lng) {
                                  setUserLat(suggestion.lat);
                                  setUserLng(suggestion.lng);
                                }
                                if (suggestion.adminType === 'mandal') setUserMandal(suggestion.name);
                                if (suggestion.adminType === 'district') setUserDistrict(suggestion.name);
                                if (suggestion.adminType === 'state') setUserState(suggestion.name);
                                if (suggestion.adminType === 'country') setUserCountry(suggestion.name);
                                setSearch('');
                                toast.success(`Showing stores in ${suggestion.name}`);
                                return;
                              }

                              if (suggestion.type === 'store') {
                                setSelectedStoreId(suggestion.id);
                                setSearch(suggestion.name);
                                setActiveSearch(suggestion.name); // Hides suggestions immediately
                                setSelectedCategory(null);
                                return;
                              }

                              setSelectedStoreId(null);
                              setSearch(suggestion.name);
                              setIsSearching(true);
                              setTimeout(() => {
                                startTransition(() => {
                                  setActiveSearch(suggestion.name);
                                  setIsSearching(false);
                                });
                              }, 200);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-secondary/50 flex items-center justify-between gap-3 transition-colors border-b border-border/10 last:border-0"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {suggestion.type === 'location' ? <MapPin className="w-4 h-4 text-primary shrink-0" /> : <Search className="w-4 h-4 text-muted-foreground shrink-0" />}
                              <span className="text-sm font-medium text-foreground truncate">{suggestion.name}</span>
                            </div>
                            {suggestion.type !== 'product' && (
                              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground bg-secondary px-2 py-0.5 rounded-full shrink-0">
                                {suggestion.type === 'location' ? suggestion.adminType : 'Store'}
                              </span>
                            )}
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
              className="bg-primary text-primary-foreground px-4 md:px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:shadow-primary/30 active:scale-95 transition-all flex items-center justify-center min-w-[50px] md:min-w-[100px]"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>
                  <Search className="w-4 h-4 md:hidden" />
                  <span className="hidden md:inline">{t('common.search')}</span>
                </>
              )}
            </button>
            <SortOptions 
              priceSort={priceSort}
              onPriceSortChange={setPriceSort}
              ratingSort={ratingSort}
              onRatingSortChange={setRatingSort}
              showRating={true}
              maxDistance={maxDistance}
              onMaxDistanceChange={setMaxDistance}
            />
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
                <div className="space-y-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <h2 className="text-sm font-bold text-foreground tracking-tight">{t('home.categories', { defaultValue: 'Categories' })}</h2>
                        <button
                          onClick={() => setShowCategories(!showCategories)}
                          className="p-1 rounded-lg hover:bg-secondary/80 text-muted-foreground transition-all duration-300 flex items-center justify-center border border-border/40 shadow-sm"
                          aria-label={showCategories ? "Hide categories" : "Show categories"}
                        >
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showCategories ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                      
                      <div className="flex bg-secondary/80 backdrop-blur-sm p-1 rounded-xl items-center gap-1 border border-border shadow-inner w-fit shrink-0">
                        <button
                          onClick={() => handleModeChange('product')}
                          className={`px-3 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeMode === 'product' ? 'bg-primary text-black shadow-md scale-105' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          Products
                        </button>
                        <button
                          onClick={() => handleModeChange('service')}
                          className={`px-3 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeMode === 'service' ? 'bg-primary text-black shadow-md scale-105' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          Services
                        </button>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {showCategories && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="space-y-4 overflow-hidden"
                      >
                        {selectedCategory && (
                          <div className="mb-2">
                            <button
                              onClick={() => {
                                setSelectedCategory(null);
                                setShowCategories(false);
                              }}
                              className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 hover:bg-primary/20 px-3 md:px-4 py-1.5 rounded-xl transition-all active:scale-95 border border-primary/20 shadow-sm w-fit inline-flex items-center gap-1.5 h-auto group"
                            >
                              <X className="w-2.5 h-2.5 text-primary group-hover:rotate-90 transition-transform duration-300" />
                              {t('home.clear_filter')}
                            </button>
                          </div>
                        )}

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
                                            onClick={() => {
                                              setSelectedCategory(null);
                                              setShowCategories(false);
                                            }}
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
                                          transition={{ delay: idx * 0.001 }}
                                          whileTap={{ scale: 0.95 }}
                                          onClick={() => {
                                            if (selectedCategory === cat?.name) {
                                              setSelectedCategory(null);
                                            } else {
                                              setPendingCategory(cat?.name);
                                            }
                                          }}
                                            className="flex flex-col items-center gap-2 group transition-all"
                                          >
                                            <div 
                                              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm border relative overflow-hidden ${selectedCategory === cat?.name ? 'border-primary ring-4 ring-primary/20 scale-105 shadow-lg shadow-primary/10' : 'border-border/40 group-hover:border-primary/30 group-hover:shadow-md'}`} 
                                              style={{ 
                                                backgroundColor: selectedCategory === cat?.name ? cat?.color : `${cat?.color}15`,
                                                borderColor: selectedCategory === cat?.name ? cat?.color : undefined
                                              }}
                                            >
                                              <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${cat?.gradient}`} />
                                              <div 
                                                className={`relative z-10 transition-all duration-300 ${selectedCategory === cat?.name ? 'text-white scale-110' : ''}`} 
                                                style={{ color: selectedCategory === cat?.name ? '#fff' : cat?.color }}
                                              >
                                                {Icon && <Icon className="w-5.5 h-5.5" />}
                                              </div>
                                            </div>
                                            <span 
                                              className={`text-[9px] font-black uppercase tracking-wider text-center leading-tight transition-colors line-clamp-2 max-w-[70px] ${selectedCategory === cat?.name ? 'text-primary' : 'text-muted-foreground'}`}
                                              style={selectedCategory === cat?.name ? { color: cat?.color } : {}}
                                            >
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
                              {[...Array(Math.ceil((1 + categories.length) / 10))].map((_, pageIndex) => {
                                const allItems = [{ type: 'all', data: null }, ...categories.map(c => ({ type: 'category', data: c }))];
                                const pageItems = allItems.slice(pageIndex * 10, (pageIndex + 1) * 10);

                                if (pageItems.length === 0) return null;

                                return (
                                  <div key={pageIndex} className="min-w-full flex-none grid grid-cols-5 grid-rows-2 gap-x-2 gap-y-4 px-1 snap-center">
                                    {pageItems.map((item, idx) => {
                                      if (item.type === 'all') {
                                        return (
                                          <motion.button
                                            key="all"
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => {
                                              setSelectedCategory(null);
                                              setShowCategories(false);
                                            }}
                                            className="flex flex-col items-center gap-2 group transition-all"
                                          >
                                            <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${!selectedCategory ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-lg shadow-yellow-500/20 scale-105' : 'bg-yellow-400 text-black shadow-sm hover:bg-yellow-500 border border-yellow-300'}`}>
                                              <StoreIcon className="w-5 h-5 sm:w-7 sm:h-7" />
                                            </div>
                                            <span className={`text-[8px] font-black uppercase tracking-wider text-center transition-colors ${!selectedCategory ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`}>{activeMode === 'product' ? t('home.all_shops') : 'All Services'}</span>
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
                                          transition={{ delay: idx * 0.002 }}
                                          whileTap={{ scale: 0.95 }}
                                          onClick={() => {
                                            if (selectedCategory === cat?.name) {
                                              setSelectedCategory(null);
                                            } else {
                                              setPendingCategory(cat?.name);
                                            }
                                          }}
                                          className="flex flex-col items-center gap-2 group transition-all"
                                        >
                                          <div 
                                            className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm border relative overflow-hidden ${selectedCategory === cat?.name ? 'border-primary ring-4 ring-primary/20 scale-105 shadow-lg shadow-primary/10' : 'border-border group-hover:border-primary/30 group-hover:shadow-md'}`} 
                                            style={{ 
                                              backgroundColor: selectedCategory === cat?.name ? cat?.color : `${cat?.color}15`,
                                              borderColor: selectedCategory === cat?.name ? cat?.color : undefined
                                            }}
                                          >
                                            <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${cat?.gradient}`} />
                                            <div 
                                              className={`relative z-10 transition-all duration-300 ${selectedCategory === cat?.name ? 'text-white scale-110' : ''}`} 
                                              style={{ color: selectedCategory === cat?.name ? '#fff' : cat?.color }}
                                            >
                                              {Icon && <Icon className="w-5 h-5 sm:w-7 sm:h-7" />}
                                            </div>
                                          </div>
                                          <span 
                                            className={`text-[8px] font-black uppercase tracking-wider text-center leading-tight transition-colors line-clamp-2 max-w-[64px] ${selectedCategory === cat?.name ? 'text-primary' : 'text-muted-foreground'}`} 
                                            style={selectedCategory === cat?.name ? { color: cat?.color } : {}}
                                          >
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
                              {[...Array(Math.ceil((1 + categories.length) / 10))].map((_, i) => (
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
                </div>
              )}
            </AnimatePresence>



            {/* Stores grid header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="space-y-1.5 min-w-0">
                <h1 className="text-lg md:text-xl font-black text-foreground truncate tracking-tight">
                  {selectedStoreId ? 'Selected Store' : (activeSearch || selectedCategory ? (activeSearch ? `"${activeSearch}"` : t(`categories.${selectedCategory}`, { defaultValue: selectedCategory })) : (locationName.split(',')[0].length > 2 && locationName !== 'Kakinada' ? `Stores in ${locationName.split(',')[0]}` : 'Hyperlocal Shops'))}
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

              {activeSearch && !selectedCategory && (
                <div className="flex bg-secondary/80 backdrop-blur-sm p-1 rounded-xl items-center gap-1 border border-border shadow-inner w-fit shrink-0">
                  <button
                    onClick={() => setSearchResultType('products')}
                    className={`px-3 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${searchResultType === 'products' ? 'bg-primary text-black shadow-md scale-105' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Products
                  </button>
                  <button
                    onClick={() => setSearchResultType('stores')}
                    className={`px-3 md:px-4 py-1.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${searchResultType === 'stores' ? 'bg-primary text-black shadow-md scale-105' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Stores
                  </button>
                </div>
              )}
            </div>

            <div className={!selectedStoreId && (activeSearch || selectedCategory) ? "w-full pb-20 space-y-8" : "grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-20"}>
              {!selectedStoreId && (activeSearch || selectedCategory) ? (
                <>
                  {/* Matching Stores Section - stores that match category filter or search filter */}
                  {((!activeSearch && selectedCategory) || (activeSearch && searchResultType === 'stores')) && filteredStores.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 bg-primary rounded-full" />
                          <h2 className="text-sm font-black uppercase tracking-widest text-foreground/70">{selectedCategory ? `${selectedCategory} Shops` : 'Matching Stores'}</h2>
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground">{filteredStores.length} found</span>
                      </div>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredStores.map((store, i) => (
                          <StoreCard
                            key={store.id + i}
                            store={store}
                            t={t}
                            onClick={() => handleStoreClick(store.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Products Section - Show only when searching */}
                  {activeSearch && searchResultType === 'products' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-primary rounded-full" />
                        <h2 className="text-sm font-black uppercase tracking-widest text-foreground/70">
                          {activeMode === 'service' ? 'Matching Services' : 'Matching Products'}
                        </h2>
                      </div>
                      
                      {searchedProducts.length === 0 ? (
                        <div className="glass rounded-3xl p-16 text-center space-y-4 border-2 border-dashed border-muted-foreground/20">
                          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto opacity-40">
                            <Search className="w-10 h-10" />
                          </div>
                          <div>
                            <p className="text-lg font-bold text-foreground">{t('common.no_results')} {activeSearch ? `"${activeSearch}"` : `in ${selectedCategory}`}</p>
                            <button 
                              onClick={() => {
                                setSearch('');
                                setActiveSearch('');
                                setSelectedCategory(null);
                                setSelectedStoreId(null);
                                setSearchResultType('products');
                              }}
                              className="text-primary font-black uppercase tracking-widest text-xs hover:underline mt-4 block mx-auto"
                            >
                              {t('common.clear_search')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                          {searchedProducts.map((p, idx) => {
                            const itemInCart = cart.find(item => item.product.id === p.id);
                            return (
                              <ProductCard
                                key={p.id + idx}
                                p={p}
                                t={t}
                                count={itemInCart?.quantity || 0}
                                selectedVariant={itemInCart?.selectedVariant}
                                onAdd={() => {
                                  if (p.hasVariants) {
                                    setVariantSelectorProduct(p);
                                  } else {
                                    activeMode === 'service' ? handleProductClick(p.id, p.vendorId || '') : addToCart({ product: p, storeId: p.vendorId || '', storeName: p.storeName || '', storePhone: p.storePhone || '', quantity: 1 });
                                  }
                                }}
                                onUpdate={(q) => updateQuantity(p.id, q, itemInCart?.selectedVariant?.id)}
                                onRemove={() => removeFromCart(p.id, itemInCart?.selectedVariant?.id)}
                                onClick={() => handleProductClick(p.id, p.vendorId || '')}
                                onVariantTrigger={(p) => setVariantSelectorProduct(p)}
                                mode={activeMode}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                filteredStores.length === 0 ? (
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
                    <StoreCard
                      key={store.id}
                      store={store}
                      onClick={() => handleStoreClick(store.id)}
                      t={t}
                    />
                  ))
                )
              )}
            </div>
          </div>
        )}



        <footer className="py-8 px-4 border-t border-border mt-12 bg-transparent backdrop-blur-sm">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
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

      <AnimatePresence>
        {variantSelectorProduct && (
          <VariantSelector 
            product={variantSelectorProduct}
            cart={cart}
            updateQuantity={updateQuantity}
            onClose={() => setVariantSelectorProduct(null)}
            onSelect={(variant) => {
                if (variantSelectorProduct) {
                    addToCart({ 
                        product: variantSelectorProduct, 
                        selectedVariant: variant,
                        storeId: variantSelectorProduct.vendorId || '', 
                        storeName: variantSelectorProduct.storeName || '', 
                        quantity: 1 
                    });
                }
                setVariantSelectorProduct(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Mode Switch Confirmation - Bottom Sheet */}
      <AnimatePresence>
        {pendingMode && (
          <>
            {/* Mode Switch Confirmation - Professional Dialog */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60]"
              onClick={() => setPendingMode(null)}
            />
            <div className="fixed inset-0 flex items-center justify-center p-4 z-[61] pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 15 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="bg-white dark:bg-[#18181b] rounded-[24px] shadow-2xl border border-slate-100 dark:border-zinc-800 w-full max-w-md overflow-hidden pointer-events-auto p-6 space-y-6"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${pendingMode === 'service' ? 'bg-blue-500/10 text-blue-500' : 'bg-primary/10 text-primary'}`}>
                    {pendingMode === 'service' ? (
                      <Clock className="w-6 h-6" />
                    ) : (
                      <Package2 className="w-6 h-6" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-50">
                      Switch to {pendingMode === 'service' ? 'Services' : 'Products'}?
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed px-2">
                      {pendingMode === 'service' 
                        ? <>This will switch the home feed to show service stores, appointments, and bookings. Your active orders page will also show service bookings.</>
                        : <>This will switch the home feed to show product stores, items, and deals. Your active orders page will also show product orders.</>
                      }
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setPendingMode(null)}
                    className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 dark:text-zinc-300 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 transition-all active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmModeChange}
                    className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all active:scale-[0.98]"
                  >
                    Switch
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Category Selection Confirmation Dialog */}
      <AnimatePresence>
        {pendingCategory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60]"
              onClick={() => setPendingCategory(null)}
            />
            <div className="fixed inset-0 flex items-center justify-center p-4 z-[61] pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 15 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="bg-white dark:bg-[#18181b] rounded-[24px] shadow-2xl border border-slate-100 dark:border-zinc-800 w-full max-w-md overflow-hidden pointer-events-auto p-6 space-y-6"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10 text-primary">
                    <ShoppingBasket className="w-6 h-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-50">
                      Shop in {t(`categories.${pendingCategory}`, { defaultValue: pendingCategory })}?
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed px-2">
                      Would you like to filter shops and items to show only {t(`categories.${pendingCategory}`, { defaultValue: pendingCategory })}?
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setPendingCategory(null)}
                    className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 dark:text-zinc-300 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 transition-all active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCategory(pendingCategory);
                      setPendingCategory(null);
                      setShowCategories(false);
                    }}
                    className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all active:scale-[0.98]"
                  >
                    Confirm
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default CustomerHome;

