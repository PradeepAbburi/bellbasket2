import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Zap, Clock, MapPin, Star, ChevronRight, ShoppingBag, ArrowRight, TrendingUp, Sparkles, Filter, Percent, Package2, Plus, Minus, Search, X, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import VariantSelector from '@/components/VariantSelector';
import SortOptions from '@/components/SortOptions';
import { useApp } from '@/context/AppContext';
import { Deal, Product, Store } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, onSnapshot, limit } from 'firebase/firestore';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const CountdownTimer = ({ endTime }: { endTime: string }) => {
  const [timeLeft, setTimeLeft] = useState<{h:number, m:number, s:number} | null>(null);

  useEffect(() => {
    const calculate = () => {
        const distance = new Date(endTime).getTime() - new Date().getTime();
        if (distance < 0) {
          setTimeLeft(null);
          return;
        }
        setTimeLeft({
          h: Math.floor((distance / (1000 * 60 * 60))),
          m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((distance % (1000 * 60)) / 1000)
        });
    };
    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  if (!timeLeft) return <span className="text-rose-500 font-bold uppercase tracking-widest text-[8px] md:text-[9px]">Ended</span>;

  return (
    <span className="tabular-nums">
      {String(timeLeft.h).padStart(2, '0')}:{String(timeLeft.m).padStart(2, '0')}:{String(timeLeft.s).padStart(2, '0')}
    </span>
  );
};

import ProductDetailModal from '@/components/ProductDetailModal';

const CustomerDeals = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, cart, addToCart, updateQuantity } = useApp();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [storesMap, setStoresMap] = useState<Record<string, Store>>({});
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [priceSort, setPriceSort] = useState<'none' | 'low-high' | 'high-low'>('none');
  const [ratingSort, setRatingSort] = useState<'none' | 'top-rated' | 'low-rated'>('none');
  const [variantSelectorProduct, setVariantSelectorProduct] = useState<Product | null>(null);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<{ product: Product; store: Store; deal: Deal } | null>(null);
  const [maxDistance, setMaxDistance] = useState<number>(() => Number(localStorage.getItem('user_deals_distance')) || 20);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // Real-time listener for active deals
    const q = query(
        collection(db, 'deals'), 
        where('status', '==', 'active')
    );
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const dealsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Deal[];
      const now = new Date();
      const activeDeals = dealsData.filter(d => new Date(d.endTime) > now);
      
      setDeals(activeDeals);

      const productIds = [...new Set(activeDeals.map(d => d.productId))];
      const vendorIds = [...new Set(activeDeals.map(d => d.vendorId))];

      if (productIds.length > 0) {
        const fetchableProductIds = productIds.filter(id => !id.startsWith('bundle_'));
        const productsData: Record<string, Product> = {};
        const comboConstituentIds: string[] = [];

        if (fetchableProductIds.length > 0) {
          // Find existing products for these IDs
          const productsSnapshot = await getDocs(query(collection(db, 'products'), where('__name__', 'in', fetchableProductIds)));

          productsSnapshot.forEach(doc => {
              const p = { id: doc.id, ...doc.data() } as Product;
              productsData[doc.id] = p;
              if (p.isCombo && p.comboItems && p.comboItems.length > 0) {
                p.comboItems.forEach(id => {
                  if (!productIds.includes(id) && !comboConstituentIds.includes(id)) {
                    comboConstituentIds.push(id);
                  }
                });
              }
          });
        }

        // Also add constituent IDs from on-the-fly combo deals
        activeDeals.filter(d => d.isCombo && d.comboItems).forEach(d => {
            d.comboItems?.forEach(id => {
                if (!comboConstituentIds.includes(id) && !productsData[id]) {
                    comboConstituentIds.push(id);
                }
            });
        });

        // Fetch missing constituent items for combos
        if (comboConstituentIds.length > 0) {
          // Firestore 'in' limitation (30)
          const chunks = [];
          for (let i = 0; i < comboConstituentIds.length; i += 30) {
            chunks.push(comboConstituentIds.slice(i, i + 30));
          }
          
          for (const chunk of chunks) {
            if (chunk.length > 0) {
              const extraSnap = await getDocs(query(collection(db, 'products'), where('__name__', 'in', chunk)));
              extraSnap.forEach(doc => {
                productsData[doc.id] = { id: doc.id, ...doc.data() } as Product;
              });
            }
          }
        }

        // Now synthesize the shim products for on-the-fly combo deals
        activeDeals.forEach(deal => {
            if (deal.isCombo && !productsData[deal.productId]) {
                const firstItem = deal.comboItems?.map(id => productsData[id]).find(Boolean);
                productsData[deal.productId] = {
                    id: deal.productId,
                    name: `Bundle: ${deal.comboItems?.length || 0} Items`,
                    price: deal.originalPrice,
                    discountedPrice: deal.dealPrice,
                    image: firstItem?.image || '',
                    category: 'Combo',
                    description: 'Special bundle deal',
                    inStock: true,
                    isCombo: true,
                    comboItems: deal.comboItems,
                    vendorId: deal.vendorId
                } as Product;
            }
        });

        // Enrich combos with their data
        Object.values(productsData).forEach(p => {
          if (p.isCombo && p.comboItems && p.comboItems.length > 0) {
            p.comboItemsData = p.comboItems.map(cid => productsData[cid]).filter(Boolean);
          }
        });

        setProducts(prev => ({ ...prev, ...productsData }));
      }

      if (vendorIds.length > 0) {
        const storesSnapshot = await getDocs(query(collection(db, 'stores'), where('__name__', 'in', vendorIds)));
        const storesData: Record<string, Store> = {};
        storesSnapshot.forEach(doc => {
            storesData[doc.id] = { id: doc.id, ...doc.data() } as Store;
        });
        setStoresMap(prev => ({ ...prev, ...storesData }));
      }

      setLoading(false);
    }, (err) => {
      console.error("Deals snapshot failed:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('user_deals_distance', maxDistance.toString());
  }, [maxDistance]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const processedDeals = useMemo(() => {
    let result = [...deals];

    // Filter by store active status and distance
    result = result.filter(deal => {
        const store = storesMap[deal.vendorId];
        if (!store) return false;
        
        if (store.isBlocked || !store.plan || store.plan === 'none') return false;

        if (user?.lat && user?.lng) {
            const dist = calculateDistance(user.lat, user.lng, store.lat, store.lng);
            if (dist > maxDistance) return false;
        }

        return true;
    });

    // Search Filter
    if (activeSearch) {
        result = result.filter(deal => {
            const product = products[deal.productId];
            const store = storesMap[deal.vendorId];
            return (
                product?.name.toLowerCase().includes(activeSearch.toLowerCase()) ||
                store?.name.toLowerCase().includes(activeSearch.toLowerCase()) ||
                deal.dealTag?.toLowerCase().includes(activeSearch.toLowerCase())
            );
        });
    }

    // Default distance sort (Always Nearest First by default)
    if (user?.lat && user?.lng) {
        result.sort((a, b) => {
            const storeA = storesMap[a.vendorId];
            const storeB = storesMap[b.vendorId];
            if (!storeA || !storeB) return 0;
            const distA = calculateDistance(user.lat!, user.lng!, storeA.lat, storeA.lng);
            const distB = calculateDistance(user.lat!, user.lng!, storeB.lat, storeB.lng);
            return distA - distB;
        });
    }

    // Override with Rating Sort if chosen
    if (ratingSort !== 'none') {
        result.sort((a, b) => {
            const storeA = storesMap[a.vendorId];
            const storeB = storesMap[b.vendorId];
            const rateA = storeA?.rating || 0;
            const rateB = storeB?.rating || 0;
            if (ratingSort === 'top-rated') return rateB - rateA;
            return rateA - rateB;
        });
    }

    // Override with Price Sorting if chosen
    if (priceSort !== 'none') {
        result.sort((a, b) => {
            if (priceSort === 'low-high') return a.dealPrice - b.dealPrice;
            return b.dealPrice - a.dealPrice;
        });
    }

    return result;
  }, [deals, products, storesMap, user?.lat, user?.lng, activeSearch, priceSort, ratingSort, maxDistance]);

  const handleSearchTrigger = () => {
    setIsSearching(true);
    setTimeout(() => {
      setActiveSearch(searchTerm);
      setIsSearching(false);
    }, 300);
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-[#202020] flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#202020] text-foreground">
      <Header solid />
      
      <div className="pt-20 pb-44">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
            {/* Hero Section - Hide when searching */}
            {!activeSearch && (
            <div className="mb-8">
                <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative h-40 lg:h-44 rounded-3xl overflow-hidden bg-gradient-to-br from-yellow-400 to-amber-600 p-6 flex flex-col justify-center gap-1.5 shadow-2xl shadow-yellow-500/10"
                >
                <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-1/4 -translate-y-1/4">
                    <Zap className="w-48 h-48 lg:w-64 lg:h-64 text-black" />
                </div>
                
                <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-md rounded-full px-4 py-1.5 w-fit border border-white/10">
                    <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Flash Sales Active</span>
                </div>
                <h1 className="text-3xl lg:text-4xl font-black tracking-tighter uppercase leading-none text-black">Limited <br />Time Deals</h1>
                <p className="text-[12px] lg:text-sm text-black/70 font-medium max-w-xs">Grab your favorites at unbeatable prices before the timer runs out!</p>
                </motion.div>
            </div>
            )}

            {/* Sticky Utility Bar - Sync with CustomerHome styling */}
            <div className="sticky top-16 z-40 bg-white/95 dark:bg-[#202020]/95 backdrop-blur-md -mx-4 px-4 sm:-mx-6 sm:px-6 py-2.5 border-b border-border/10 shadow-sm mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (activeSearch || isSearching || searchTerm) {
                                setSearchTerm('');
                                setActiveSearch('');
                            } else {
                                navigate(-1);
                            }
                        }}
                        className="flex-shrink-0 flex items-center justify-center w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-secondary hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all active:scale-95"
                        title={activeSearch || isSearching || searchTerm ? 'Clear Results' : 'Back'}
                    >
                        <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5" />
                    </button>
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchTrigger()}
                            placeholder="Search nearby deals..."
                            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#202020] border border-border/50 shadow-md text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setActiveSearch('');
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-slate-100 text-muted-foreground transition-colors z-10"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={handleSearchTrigger}
                        disabled={isSearching}
                        className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:shadow-primary/30 active:scale-95 transition-all flex items-center justify-center min-w-[100px]"
                    >
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                    </button>
                </div>
            </div>

            {/* All Deals Feed (Nearby Style) */}
            <section>
                <div className="flex items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <MapPin className="w-4 h-4 lg:w-5 lg:h-5 text-primary shrink-0" />
                        <div className="min-w-0">
                            <h2 className="text-lg md:text-xl font-black text-foreground tracking-tight truncate leading-none uppercase">
                                {activeSearch ? `Results for "${activeSearch}"` : 'Deals Nearby'}
                            </h2>
                            <p className="hidden md:block text-[9px] lg:text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
                                {processedDeals.length} local offers active
                            </p>
                        </div>
                    </div>
                    
                    <div className="shrink-0">
                        <SortOptions 
                            priceSort={priceSort}
                            onPriceSortChange={setPriceSort}
                            ratingSort={ratingSort}
                            onRatingSortChange={setRatingSort}
                            maxDistance={maxDistance}
                            onMaxDistanceChange={setMaxDistance}
                            showRating={true}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 lg:gap-4">
                    {processedDeals.length === 0 ? (
                    <div className="col-span-full py-24 bg-white/5 rounded-[3rem] border border-white/5 flex flex-col items-center justify-center text-center px-8">
                        <Zap className="w-12 h-12 text-gray-700 mb-6" />
                        <h3 className="font-bold text-gray-400 uppercase tracking-widest text-xs">No matching deals found</h3>
                        <p className="text-gray-500 text-[10px] mt-2 max-w-[200px]">Check back later or expand your neighborhood range!</p>
                    </div>
                    ) : (
                    processedDeals.map((deal) => {
                        const product = products[deal.productId];
                        const store = storesMap[deal.vendorId];
                        if (!product || !store) return null;
                        
                        const cartItem = cart.find(item => item.product.id === product.id);
                        const count = cartItem ? cartItem.quantity : 0;
                        
                        const distance = user?.lat && user?.lng && store.lat && store.lng ? 
                                        calculateDistance(user.lat, user.lng, store.lat, store.lng) : null;
                        
                        const discountPercent = Math.round(((deal.originalPrice - deal.dealPrice) / deal.originalPrice) * 100);

                        return (
                            <motion.div
                                key={deal.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => setSelectedProductForDetail({ product, store, deal })}
                                className="bg-[#f8f9fa] dark:bg-[#161616] p-2 md:p-2.5 rounded-3xl flex flex-col hover:shadow-2xl hover:shadow-primary/10 transition-all border border-slate-200 dark:border-white/5 group/product cursor-pointer relative overflow-hidden group h-full"
                            >
                                {/* Media Section */}
                                <div className="relative aspect-square overflow-hidden bg-secondary/5 shrink-0 rounded-2xl">
                                    {product.isCombo && product.comboItemsData && product.comboItemsData.length > 0 ? (
                                        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[2px] bg-primary/20 relative">
                                            {product.comboItemsData.slice(0, 4).map((c) => (
                                                <img key={c.id} src={c.image} className="w-full h-full object-cover" alt="" />
                                            ))}
                                            {product.comboItemsData.length < 4 && Array.from({ length: 4 - product.comboItemsData.length }).map((_, i) => (
                                                <div key={i} className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                                    <Package2 className="w-4 h-4 text-primary/20" />
                                                </div>
                                            ))}
                                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent pointer-events-none" />
                                        </div>
                                    ) : (
                                        <img 
                                            src={product.image} 
                                            alt={product.name} 
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover/product:scale-110" 
                                        />
                                    )}
                                    
                                    {/* Discount Overlay */}
                                    <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-[8px] font-black px-1.5 py-0.5 rounded-lg shadow-lg uppercase tracking-tight z-10">
                                        {discountPercent}% OFF
                                    </div>

                                    {product.hasVariants && (
                                        <div className="absolute top-3 right-3 z-20 bg-secondary/80 backdrop-blur-md text-secondary-foreground text-[7px] sm:text-[8px] font-black px-2 py-1 rounded-full flex items-center gap-1 shadow-lg border border-white/20 uppercase tracking-widest">
                                            {product.variants?.length ? `${product.variants.length} Variants` : 'Variants'}
                                        </div>
                                    )}

                                    {/* Timer Box with Solid Background */}
                                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-primary text-black rounded-full px-3 py-1 shadow-lg flex items-center gap-1 font-mono text-[9px] font-black">
                                       <Clock className="w-3 h-3" />
                                       <CountdownTimer endTime={deal.endTime} />
                                    </div>
                                </div>

                                {/* Content Section */}
                                <div className="p-2.5 pb-4 flex flex-col flex-1 gap-1">
                                    {/* Header: Name & Rating */}
                                    <div className="flex items-start justify-between gap-2 mb-0.5">
                                        <h4 className="text-[12px] font-bold text-foreground line-clamp-1 uppercase tracking-tight flex-1 group-hover/product:text-primary transition-colors leading-tight">{product.name}</h4>
                                        <div className="flex flex-col items-end shrink-0 leading-tight">
                                            <div className="flex items-center gap-0.5 text-primary font-black text-[12px]">
                                                <Star className="w-2.5 h-2.5 fill-current" />
                                                {store.rating || '4.5'}
                                            </div>
                                            <span className="text-white text-[8px] font-bold opacity-70">
                                                ({store.reviews?.length || 0}x)
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {(() => {
                                        const variantItem = cart.find(c => c.product.id === product.id && c.selectedVariant);
                                        const displayPrice = variantItem?.selectedVariant 
                                            ? (variantItem.selectedVariant.discountedPrice || variantItem.selectedVariant.price) 
                                            : deal.dealPrice;
                                        const originalPrice = variantItem?.selectedVariant 
                                            ? (variantItem.selectedVariant.discountedPrice ? variantItem.selectedVariant.price : null)
                                            : deal.originalPrice;

                                        return (
                                            <div className="flex items-baseline gap-1.5 mb-2">
                                                <span className="text-[13px] font-black text-foreground">₹{displayPrice}</span>
                                                {originalPrice && (
                                                    <span className="text-[9px] text-muted-foreground line-through opacity-50 font-medium tracking-tighter">₹{originalPrice}</span>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Interaction Bar */}
                                    <div className="mb-2.5" onClick={e => e.stopPropagation()}>
                                        {count === 0 || product.hasVariants ? (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (product.hasVariants) {
                                                        setVariantSelectorProduct(product);
                                                    } else {
                                                        const dealProduct = { ...product, price: deal.dealPrice, discountedPrice: deal.dealPrice };
                                                        addToCart({ product: dealProduct, storeId: store.id, storeName: store.name, storePhone: store.phone || '', quantity: 1 });
                                                    }
                                                }}
                                                className="w-full h-8 rounded-xl bg-primary text-white text-[10px] font-black flex items-center justify-center gap-1.5 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
                                            >
                                                {product.hasVariants && cart.some(c => c.product.id === product.id && c.selectedVariant) ? (
                                                    <>
                                                        <Plus className="w-3 h-3" strokeWidth={4} />
                                                        ADD MORE
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="w-3 h-3" strokeWidth={4} />
                                                        ADD TO CART
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            <div className="w-full h-8 rounded-xl bg-primary text-white flex items-center justify-between px-1.5 shadow-lg shadow-primary/20">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, count - 1); }}
                                                    className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors"
                                                >
                                                    <Minus className="w-3 h-3" strokeWidth={4} />
                                                </button>
                                                <span className="text-[11px] font-black">{count}</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, count + 1); }}
                                                    className="w-6 h-6 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors"
                                                >
                                                    <Plus className="w-3 h-3" strokeWidth={4} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Store Details Area */}
                                    <div className="mt-1 p-2.5 bg-white dark:bg-[#1A1A1A]/50 rounded-2xl flex flex-col gap-1.5 border border-slate-100 dark:border-white/5">
                                        <div className="flex items-center justify-between gap-2 text-foreground/80">
                                            <p className="text-[10px] font-black uppercase tracking-widest truncate flex-1">{store.name}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-bold">
                                            <MapPin className="w-3 h-3 text-primary/60" />
                                            <span className="tracking-tight">{distance?.toFixed(1)} km away</span>
                                            {!store.isOpen && (
                                                <span className="ml-auto text-[7px] bg-red-500 text-white px-1.5 py-0.5 rounded-md uppercase font-black">Closed</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                    )}
                </div>
            </section>
        </div>
      </div>

      <AnimatePresence>
        {selectedProductForDetail && (
          <ProductDetailModal
            product={selectedProductForDetail.product}
            store={selectedProductForDetail.store}
            deal={selectedProductForDetail.deal}
            cart={cart}
            onAddToCart={(p, v) => {
              const { store, deal } = selectedProductForDetail;
              const finalProd = deal ? { ...p, price: deal.dealPrice, discountedPrice: deal.dealPrice } : p;
              addToCart({ 
                product: finalProd, 
                selectedVariant: v,
                storeId: store.id, 
                storeName: store.name, 
                storePhone: store.phone || '', 
                quantity: 1 
              });
            }}
            onUpdateQuantity={(pid, q, vid) => updateQuantity(pid, q, vid)}
            onClose={() => setSelectedProductForDetail(null)}
            onViewStore={() => navigate(`/store/${selectedProductForDetail.store.id}`)}
            onViewProduct={(pid) => navigate(`/store/${selectedProductForDetail.store.id}?productId=${pid}`)}
          />
        )}

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
    </div>
  );
};

export default CustomerDeals;
