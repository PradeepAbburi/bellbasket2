import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, MapPin, Clock, Plus, Minus, Loader2, MessageSquare, Search, X, Tag, Phone, ChevronRight, ChevronLeft, Share2, Sparkles, Calendar, AlertCircle, ArrowUpDown, ChevronDown, XCircle, ImageIcon, PackageSearch, Heart, Zap, PackageX, Globe, ShoppingCart } from 'lucide-react';
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
import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import QRCodeWithLogo from '@/components/ui/qr-code-with-logo';
import Header from '@/components/Header';
import ReviewModal from '@/components/ReviewModal';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { sendInAppNotification } from '@/utils/notifications';
import { Product } from '@/types';
import { CATEGORY_METADATA } from '@/constants/categories';
import { cleanObject } from '@/utils/firebase';
import { smartSearchProducts } from '../utils/search';
import PullToRefresh from '@/components/ui/PullToRefresh';
import VariantSelector from '@/components/VariantSelector';
import { Helmet } from 'react-helmet';
import PageLoading from '@/components/PageLoading';

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

  if (!timeLeft) return <span className="text-rose-500 font-bold uppercase tracking-widest text-[8px]">Ended</span>;

  return (
    <span className="tabular-nums">
      {String(timeLeft.h).padStart(2, '0')}:{String(timeLeft.m).padStart(2, '0')}:{String(timeLeft.s).padStart(2, '0')}
    </span>
  );
};

const StoreDetail = () => {
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productIdFromUrl = searchParams.get('productId');
  const searchQueryFromUrl = searchParams.get('search');
  const { t } = useTranslation();
  const { cart, addToCart, updateQuantity, stores, allProducts, user, clearCart, toggleSaveStore, isStoreSaved, setIsAnyModalOpen, cartSubtotal } = useApp();
  const location = useLocation();
  const [store, setStore] = useState<any>(() => location.state?.store || stores.find(s => s.id === id || (slug && s.slug === slug)));
  const [products, setProducts] = useState<Product[]>(() => {
    const targetId = (location.state?.store?.id) || stores.find(s => s.id === id || (slug && s.slug === slug))?.id || id;
    const contextProducts = allProducts.filter(p => p.vendorId === targetId);
    // Instant Enrichment for context products
    return contextProducts.map(p => {
      if (p.isCombo && p.comboItems && p.comboItems.length > 0) {
        return {
          ...p,
          comboItemsData: contextProducts.filter(item => p.comboItems?.includes(item.id))
        };
      }
      return p;
    });
  });
  const [loading, setLoading] = useState(() => {
    const targetId = (location.state?.store?.id) || stores.find(s => s.id === id || (slug && s.slug === slug))?.id || id;
    const hasStore = !!(location.state?.store || stores.find(s => s.id === id || (slug && s.slug === slug)));
    const hasProducts = allProducts.some(p => p.vendorId === targetId);
    return !(hasStore && hasProducts);
  });
  const [showReviews, setShowReviews] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchQueryFromUrl || '');
  const [isSearching, setIsSearching] = useState(false);
  const [activeSearch, setActiveSearch] = useState(searchQueryFromUrl || '');
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [variantSelectorProduct, setVariantSelectorProduct] = useState<Product | null>(null);
  const [bookingService, setBookingService] = useState<Product | null>(null);
  const [bookingData, setBookingData] = useState({ name: '', phone: '', location: '', description: '', date: '', timeSlot: '' });
  const [isBooking, setIsBooking] = useState(false);
  const [priceSort, setPriceSort] = useState<'none' | 'low-high' | 'high-low'>('none');
  const [ratingSort, setRatingSort] = useState<'none' | 'top-rated' | 'low-rated'>('none');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestData, setRequestData] = useState({ productName: '', description: '', image: '' });
  const [activeComboItemIndex, setActiveComboItemIndex] = useState(-1); // -1: main combo, 0+: sub-items
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageScrollRef = useRef<HTMLDivElement>(null);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showBookingDiscardConfirm, setShowBookingDiscardConfirm] = useState(false);
  const [activeDeals, setActiveDeals] = useState<any[]>([]);
  const { requestProduct } = useApp();

  // Cart banner: compute store-specific item count & total
  const storeCartItems = useMemo(() => cart.filter(c => c.storeId === store?.id), [cart, store?.id]);
  const storeCartCount = useMemo(() => storeCartItems.reduce((sum, c) => sum + c.quantity, 0), [storeCartItems]);
  const storeCartTotal = useMemo(() => {
    return storeCartItems.reduce((s, c) => {
      const itemPrice = c.selectedVariant
        ? (c.selectedVariant.discountedPrice || c.selectedVariant.price)
        : ((c.product.discountedPrice && Number(c.product.discountedPrice) > 0 && Number(c.product.discountedPrice) < c.product.price)
          ? Number(c.product.discountedPrice)
          : c.product.price);
      return s + (itemPrice * c.quantity);
    }, 0);
  }, [storeCartItems]);
  
  // 0. Immediate Visibility Check (for stores already in context)
  useEffect(() => {
    if (store) {
      if (store.isBlocked) {
        toast.error("This store has been restricted by administrators.");
        navigate('/', { replace: true });
      } else if (store.plan === 'none' || !store.plan) {
        toast.info("This store is currently undergoing maintenance.");
        navigate('/', { replace: true });
      }
    }
  }, [store?.id, store?.isBlocked, store?.plan]);

  // Track store visit
  useEffect(() => {
    if (!store?.id) return;
    // Fire and forget — log visit to Firestore
    addDoc(collection(db, 'store_visits'), {
      storeId: store.id,
      storeName: store.name || '',
      storeCategory: store.category || '',
      timestamp: serverTimestamp()
    }).catch(() => { /* Silent fail */ });
  }, [store?.id]);


  // Scroll to product if productId is in URL
  useEffect(() => {
    if (!loading && products.length > 0 && productIdFromUrl) {
      const product = products.find(p => p.id === productIdFromUrl);
      if (product) {
        setHighlightedProductId(productIdFromUrl);

        // Brief timeout to ensure DOM is ready
        setTimeout(() => {
          setActiveComboItemIndex(-1);
          const element = document.getElementById(`product-${productIdFromUrl}`);
          if (element) {
            // 1. Scroll the window to the category section first if needed
            // Actually scrollIntoView on the element might be enough
            element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

            // Auto-open booking modal for service stores
            if (store?.storeType === 'service') {
              setBookingService(product);
            }

            // 2. Clear highlighting after a few seconds
            setTimeout(() => setHighlightedProductId(null), 3000);
          }
        }, 500);
      }
    }
  }, [loading, products, productIdFromUrl]);

  const searchSuggestions = useMemo(() => {
    if (!searchTerm.trim() || isSearching || activeSearch === searchTerm) return [];

    const query = searchTerm.toLowerCase();
    const suggestions = new Set<string>();

    products.forEach(p => {
      if (p.name.toLowerCase().includes(query)) {
        suggestions.add(JSON.stringify({ type: 'product', name: p.name }));
      }
    });

    return Array.from(suggestions).map(s => JSON.parse(s)).slice(0, 10);
  }, [searchTerm, products, isSearching, activeSearch]);

  // Reset image index when product or combo item changes
  useEffect(() => {
    setCurrentImageIndex(0);
    if (imageScrollRef.current) {
      imageScrollRef.current.scrollTo({ left: 0 });
    }
  }, [selectedProduct, activeComboItemIndex]);

  // 1. Setup Data Sync
  useEffect(() => {
    if (!id && !slug) return;

    let unsubscribeStore: (() => void) | null = null;
    let isMounted = true;

    const setupListener = (storeId: string) => {
      return onSnapshot(doc(db, 'stores', storeId), async (snap) => {
        if (snap.exists() && isMounted) {
          const data = snap.data();
          let phone = data.phone;
          let ownerName = data.ownerName;

          if ((!phone || !ownerName) && data.vendorId) {
             const userSnap = await getDoc(doc(db, 'users', data.vendorId));
             if (userSnap.exists()) {
               const userData = userSnap.data();
               if (!phone) phone = userData.phone;
               if (!ownerName) ownerName = userData.name;
             }
          }

          setStore((prev: any) => ({ ...prev, id: snap.id, ...data, phone, ownerName }));
          
          if (data.isBlocked) {
            toast.error("This store has been restricted.");
            navigate('/', { replace: true });
          }
        }
      });
    };

    const loadData = async () => {
      let targetId = id;

      // 1. Resolve ID from slug if needed
      if (!targetId && slug) {
        const q = query(collection(db, 'stores'), where('slug', '==', slug));
        const snap = await getDocs(q);
          if (isMounted) {
            if (!snap.empty) {
              targetId = snap.docs[0].id;
              setStore({ id: targetId, ...snap.docs[0].data() });
            } else {
              setNotFound(true);
              setLoading(false);
              return;
            }
          }
      }

      if (targetId && isMounted) {
        unsubscribeStore = setupListener(targetId);

        try {
          const q = query(collection(db, 'products'), where('vendorId', '==', targetId));
          const querySnapshot = await getDocs(q);
          
          if (!isMounted) return;

          const productData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Product[];

          if (productData.length > 0) {
            const productMap = new Map(productData.map(p => [p.id, p]));
            const enriched = productData.map(p => {
              if (p.isCombo && p.comboItems?.length) {
                return {
                  ...p,
                  comboItemsData: p.comboItems.map(cid => productMap.get(cid)).filter(Boolean) as Product[]
                };
              }
              return p;
            });
            setProducts(enriched);

            // 3. Fetch Active Deals
            const dealsQ = query(
              collection(db, 'deals'), 
              where('vendorId', '==', targetId),
              where('status', '==', 'active')
            );
            const dealsSnap = await getDocs(dealsQ);
            const now = new Date();
            const validDeals = dealsSnap.docs
              .map(doc => ({ id: doc.id, ...doc.data() } as any))
              .filter((d: any) => new Date(d.endTime) > now);
            
            setActiveDeals(validDeals);

            // 4. Enrich products with deal data
            if (validDeals.length > 0) {
              setProducts(prev => prev.map(p => {
                const deal = validDeals.find(d => d.productId === p.id);
                if (deal) {
                  return {
                    ...p,
                    discountedPrice: deal.dealPrice,
                    deal: deal
                  };
                }
                return p;
              }));
            }
          }
        } catch (error) {
          console.warn("Refresh failed, using context", error);
        } finally {
          if (isMounted) setLoading(false);
        }
      } else if (isMounted) {
        setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
      if (unsubscribeStore) unsubscribeStore();
    };
  }, [id, slug]);

  const filteredProducts = useMemo(() => {
    let result = smartSearchProducts(products, activeSearch) as Product[];

    if (priceSort !== 'none') {
      result = [...result].sort((a, b) => {
        const pA = a.discountedPrice && a.discountedPrice < a.price ? a.discountedPrice : a.price;
        const pB = b.discountedPrice && b.discountedPrice < b.price ? b.discountedPrice : b.price;
        if (priceSort === 'low-high') return pA - pB;
        return pB - pA;
      });
    } else if (ratingSort !== 'none') {
      // Sort by discount percentage as a proxy for \"popularity/deal quality\" inside a store
      result = [...result].sort((a, b) => {
        const getScore = (p: Product) => {
          if (p.discountedPrice && p.discountedPrice < p.price) {
            return Math.round(((p.price - p.discountedPrice) / p.price) * 100);
          }
          return 0;
        };
        const sA = getScore(a);
        const sB = getScore(b);
        return ratingSort === 'top-rated' ? sB - sA : sA - sB;
      });
    }

    return result;
  }, [products, activeSearch, priceSort, ratingSort]);

  const handleSearchTrigger = () => {
    setIsSearching(true);
    setTimeout(() => {
      setActiveSearch(searchTerm);
      setIsSearching(false);
    }, 800);
  };

  const scrollContainer = (id: string, direction: 'left' | 'right') => {
    const container = document.getElementById(`scroll-${id}`);
    if (container) {
      container.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
    }
  };

  const [showShareModal, setShowShareModal] = useState(false);

  const handleShareStore = () => {
    setShowShareModal(true);
  };

  // Use global modal state to hide nav elements
  useEffect(() => {
    const isModalOpen = !!(
      bookingService || 
      showReviews || 
      showShareModal || 
      showCallModal || 
      showRequestModal || 
      selectedProduct || 
      variantSelectorProduct
    );
    
    setIsAnyModalOpen(isModalOpen);
    return () => setIsAnyModalOpen(false);
  }, [bookingService, showReviews, showShareModal, showCallModal, showRequestModal, selectedProduct, variantSelectorProduct, setIsAnyModalOpen]);

  const storeUrl = window.location.href;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(storeUrl)}`;

  // Generate next 14 days for date selection
  const bookingDates = useMemo(() => {
    const days = Array.from({ length: 14 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d;
    });

    if (bookingService?.availability?.days) {
      return days.filter(d => bookingService.availability!.days.includes(d.getDay()));
    }
    return days;
  }, [bookingService]);

  const getCartQty = (productId: string, variantId?: string) => {
    if (variantId) {
      return cart.find(c => c.product.id === productId && c.selectedVariant?.id === variantId)?.quantity || 0;
    }
    return cart.find(c => c.product.id === productId && !c.selectedVariant)?.quantity || 0;
  };

  const isServiceStore = store?.storeType === 'service';

  const serviceTimeSlots = useMemo(() => {
    if (!bookingService?.availability) return store?.availableTimeSlots || [];
    
    const { startTime, endTime } = bookingService.availability;
    const slots = [];
    let current = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    while (current < end) {
      const time = current.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      slots.push(time);
      current.setMinutes(current.getMinutes() + 30);
    }
    return slots;
  }, [bookingService, store]);

  const handleBookService = async () => {
    if (!bookingService || !store) return;
    if (!bookingData.name || !bookingData.phone || !bookingData.location || !bookingData.date || !bookingData.timeSlot) {
      toast.error('Please fill all required fields');
      return;
    }

    // Additional validation for selected day
    const selectedDate = new Date(bookingData.date);
    if (bookingService.availability?.days && !bookingService.availability.days.includes(selectedDate.getDay())) {
      toast.error('Service is not available on selected day');
      return;
    }

    setIsBooking(true);
    try {
      const serviceData = {
        storeId: store.id,
        storeName: store.name,
        serviceId: bookingService.id,
        serviceName: bookingService.name,
        customerName: bookingData.name,
        customerPhone: bookingData.phone,
        location: bookingData.location,
        description: bookingData.description,
        date: bookingData.date,
        timeSlot: bookingData.timeSlot,
        status: 'pending',
        pickupCode: Math.floor(1000 + Math.random() * 9000).toString(),
        createdAt: new Date().toISOString(),
        vendorId: store.vendorId,
        userId: user?.id || 'guest',
        storePhone: store.phone || '',
        storeImage: store.image || '',
      };

      const cleanedData = cleanObject(serviceData);
      console.log("Submitting booking:", cleanedData);
      await addDoc(collection(db, 'serviceBookings'), cleanedData);
      
      // Dispatch notifications to the vendor
      await sendInAppNotification(store.vendorId, {
        title: 'New Service Booking!',
        body: `You have a new booking for ${bookingService.name} from ${bookingData.name} on ${bookingData.date} at ${bookingData.timeSlot}.`,
        url: '/vendor/bookings',
        type: 'booking'
      });

      toast.success('Service requested successfully!', {
        description: t('common.receipts.acceptance_note_desc'),
        duration: 5000,
      });
      setBookingService(null);
      setBookingData({ name: '', phone: '', location: '', description: '', date: '', timeSlot: '' });
      clearCart();
      navigate('/receipts');
    } catch (e: any) {
      console.error("🔥 Booking Error:", e);
      toast.error('Failed to request service', {
        description: e.message || "Please check your network."
      });
    } finally {
      setIsBooking(false);
    }
  };

  const handleRequestSubmit = async () => {
    if (!requestData.productName.trim()) {
      toast.error("Please enter a product name");
      return;
    }
    setIsSubmittingRequest(true);
    try {
      await requestProduct({
        storeId: store.id,
        storeName: store.name,
        productName: requestData.productName,
        description: requestData.description,
        image: requestData.image
      });
      setShowRequestModal(false);
      setRequestData({ productName: '', description: '', image: '' });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleCloseBooking = () => {
    const hasData = bookingData.name || bookingData.phone || bookingData.location || bookingData.description || (bookingData.date && bookingData.date !== new Date().toISOString().split('T')[0]);
    if (hasData) {
      setShowBookingDiscardConfirm(true);
    } else {
      setBookingService(null);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6">
          <XCircle className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-black mb-2">Store Not Found</h2>
        <p className="text-muted-foreground mb-8 text-center max-w-xs">The store you're looking for doesn't exist or has been removed.</p>
        <button onClick={() => navigate('/')} className="px-8 py-3 bg-primary text-white rounded-2xl font-bold">Back to Home</button>
      </div>
    );
  }

  if (!store || loading) {
    return <PageLoading />;
  }

  return (
    <div className="min-h-screen gradient-warm">
      <Helmet>
        <title>{store.name} | {store.category} in {store.district || store.mandal || (store.address ? store.address.split(',')[0] : 'Local')} - BellBasket</title>
        <meta name="description" content={`Order ${store.category} and daily essentials from ${store.name} in ${store.district || store.mandal || (store.address ? store.address.split(',')[0] : 'Local')}. Trusted local partner for quick pickup via BellBasket.`} />
        <meta name="keywords" content={`${store.name}, ${store.category} in ${store.district}, ${store.mandal} stores, buy ${store.category} near me, ${store.address ? store.address.split(',')[0] : 'Local'}, BellBasket, local shops`} />

        <meta property="og:title" content={`${store.name} - ${store.category} in ${store.district || (store.address ? store.address.split(',')[0] : 'Local')}`} />
        <meta property="og:description" content={`Shop from ${store.name} on BellBasket. Quality ${store.category} items in ${store.district || (store.address ? store.address.split(',')[0] : 'Local')}.`} />
        <meta property="og:image" content={store.image} />
        <meta property="og:url" content={window.location.href} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${store.name} on BellBasket`} />
        <meta name="twitter:description" content={`Quality ${store.category} items from ${store.name} in ${store.address ? store.address.split(',')[0] : 'Local'}.`} />
        
        <link rel="canonical" href={store.slug ? `https://bellbasket.com/stores/${store.slug}` : `https://bellbasket.com/store/${store.id}`} />

        {/* Structured Data for Google Search */}
        <script type="application/ld+json">
          {JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              "name": store.name,
              "image": store.image,
              "@id": window.location.href,
              "url": window.location.href,
              "telephone": store.phone || "",
              "description": `Shop from ${store.name} in ${store.address ? store.address.split(',')[0] : 'Local'}. Quality ${store.category} items available for quick pickup via BellBasket.`,
              "address": {
                "@type": "PostalAddress",
                "streetAddress": store.address || "",
                "addressLocality": (store.address ? store.address.split(',')[0] : "Local") || "Local",
                "addressRegion": store.state || "Andhra Pradesh",
                "addressCountry": "IN"
              },
              "geo": {
                "@type": "GeoCoordinates",
                "latitude": store.lat || 0,
                "longitude": store.lng || 0
              },
              "priceRange": "₹",
              "openingHoursSpecification": {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                "opens": "00:00",
                "closes": "23:59"
              },
              ...(store.reviews && store.reviews.length > 0 ? {
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": (store.reviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0) / store.reviews.length).toFixed(1),
                  "reviewCount": store.reviews.length,
                  "bestRating": "5",
                  "worstRating": "1"
                }
              } : {})
            },
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Home",
                  "item": "https://bellbasket.com/"
                },
                {
                  "@type": "ListItem",
                  "position": 2,
                  "name": "Browse",
                  "item": "https://bellbasket.com/browse"
                },
                {
                  "@type": "ListItem",
                  "position": 3,
                  "name": store.name,
                  "item": window.location.href
                }
              ]
            },
            {
              "@context": "https://schema.org",
              "@type": "ItemList",
              "name": `Products at ${store.name}`,
              "itemListElement": products.slice(0, 20).map((p, i) => ({
                "@type": "ListItem",
                "position": i + 1,
                "item": {
                  "@type": "Product",
                  "name": p.name,
                  "image": p.image,
                  "description": p.description || `${p.name} available at ${store.name}`,
                  "offers": {
                    "@type": "Offer",
                    "price": p.price,
                    "priceCurrency": "INR",
                    "availability": "https://schema.org/InStock"
                  }
                }
              }))
            }
          ])}
        </script>
      </Helmet>
      <Header />

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#202020] w-full max-w-sm rounded-3xl p-8 relative shadow-2xl border border-white/10"
            >
              <button
                onClick={() => setShowShareModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-secondary/50 text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-foreground tracking-tight">{t('store.share_store')}</h2>
                  <p className="text-sm text-muted-foreground font-medium">{t('store.scan_to_visit')} {store.name}</p>
                </div>

                <div className="bg-gradient-to-br from-primary/5 to-secondary/5 p-8 rounded-2xl border border-primary/10 flex flex-col items-center justify-center gap-4">
                  <QRCodeWithLogo value={storeUrl} size={180} logoSize={40} />
                  <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-xs font-black uppercase tracking-widest">
                    <Sparkles className="w-3.5 h-3.5" />
                    {t('store.permanent_qr')}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(storeUrl);
                      toast.success("Link copied!");
                    }}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-sm transition-all border border-border/40"
                  >
                    {t('store.copy_link')}
                  </button>
                  <button
                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-white font-bold text-sm transition-all shadow-md shadow-primary/20"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: store.name,
                          url: storeUrl
                        });
                      }
                    }}
                  >
                    <Share2 className="w-4 h-4" /> {t('store.share_directly')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="pt-20 pb-32 lg:pb-8 px-4 max-w-6xl mx-auto">
        {/* Back */}
        <button
          onClick={() => {
            if (activeSearch || isSearching || searchTerm) {
              setSearchTerm('');
              setActiveSearch('');
            } else {
              navigate(-1);
            }
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {activeSearch || isSearching || searchTerm ? t('common.back_to_store') : t('common.back')}
        </button>

        {/* Store header - Hidden when searching or viewing search results */}
        {!activeSearch && !isSearching && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-[#202020] rounded-3xl overflow-hidden mb-8 border border-border/40 shadow-sm relative">
            <div className="relative h-36 md:h-52">
              <img src={store.image} alt={store.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                <span className={`text-[9.5px] md:text-[11px] font-black px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md border border-black/5 uppercase tracking-widest bg-white text-black flex items-center gap-1.5`}>
                  <div className={`w-2 h-2 rounded-full ${store.isOpen ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                  {store.isOpen ? t('home.open_now') : t('home.currently_closed')}
                </span>
              </div>

              {/* Category Tag */}
              <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                <span 
                  className="px-2.5 py-1 rounded-full shadow-lg backdrop-blur-md bg-white text-black text-[9.5px] md:text-[11px] font-black flex items-center gap-1 border border-black/5 uppercase tracking-widest"
                >
                  {CATEGORY_METADATA[store.category]?.icon && (() => {
                    const Icon = CATEGORY_METADATA[store.category].icon;
                    return <Icon className="w-3 h-3 md:w-3.5 h-3.5" style={{ color: CATEGORY_METADATA[store.category]?.color || 'inherit' }} />;
                  })()}
                  {t(`categories.${store.category}`, { defaultValue: store.category })}
                </span>
              </div>

              {/* Store Branding Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 translate-y-12 md:translate-y-14 z-20">
                <div className="bg-black/40 backdrop-blur-md p-4 md:p-5 rounded-3xl border border-white/10 shadow-2xl flex items-center gap-4 md:gap-6">
                  {(store.logo && store.plan === 'pro') ? (
                    <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-white p-1 md:p-1.5 shadow-xl shrink-0 flex items-center justify-center">
                      <img src={store.logo} alt="Logo" className="w-full h-full object-contain rounded-xl" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-primary/20 backdrop-blur-sm p-1 md:p-1.5 shadow-xl shrink-0 border border-primary/30 flex flex-col items-center justify-center text-primary">
                      <span className="text-xl md:text-2xl font-black">{store.name.charAt(0)}</span>
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-white drop-shadow-lg tracking-tight leading-tight truncate">
                        {(store.brandText && store.plan === 'pro') ? store.brandText : store.name}
                      </h1>
                    </div>
                    <p className="text-[10px] md:text-xs font-bold text-white/90 drop-shadow-md flex items-center gap-1.5 opacity-90 line-clamp-1">
                      <MapPin className="w-3 h-3 text-primary" />
                      {store.address || 'Address not registered'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-16 md:pt-20 px-4 md:px-8 pb-6 md:pb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="grid grid-cols-2 md:flex items-center gap-x-6 gap-y-4 md:gap-8 w-full md:w-auto">
                {Array.isArray(store.reviews) && store.reviews.length > 0 ? (
                  <div 
                    onClick={() => setShowReviews(true)}
                    className="flex flex-col items-start md:items-center bg-secondary/30 px-4 py-2 rounded-xl cursor-pointer hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-primary">
                      <Star className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                      <span className="font-black text-lg md:text-xl">
                        {(store.reviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0) / store.reviews.length).toFixed(1)}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap tracking-wider">{store.reviews.length} {t('common.reviews')}</span>
                  </div>
                ) : (
                  <div 
                    onClick={() => setShowReviews(true)}
                    className="flex flex-col items-start md:items-center bg-secondary/30 px-4 py-2 rounded-xl cursor-pointer hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-primary">
                      <Star className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                      <span className="font-black text-lg md:text-xl">{store.rating || '4.5'}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap tracking-wider">{t('common.rating')}</span>
                  </div>
                )}

                <div 
                  onClick={() => {
                    if (store.lat && store.lng) {
                      window.open(`https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lng}`, '_blank');
                    } else {
                      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`, '_blank');
                    }
                  }}
                  className="flex flex-col bg-secondary/30 px-4 py-2.5 rounded-xl min-w-0 max-w-[200px] cursor-pointer hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-1.5 text-primary mb-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Address</span>
                  </div>
                  <span className="text-sm font-bold text-foreground line-clamp-1">
                    {store.address || 'Location Verified'}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 bg-secondary/30 px-4 py-2.5 rounded-xl col-span-2 md:col-span-1">
                  <Clock className="w-4 h-4 md:w-5 md:h-5 text-primary shrink-0" />
                  <span className="text-sm font-black text-foreground">{store.timings ? `${store.timings.open} - ${store.timings.close}` : '10:00 - 22:00'}</span>
                </div>
              </div>

              {store.plan === 'pro' && store.useWatermark && (
                <div className="hidden lg:block text-[9px] font-black uppercase tracking-[0.4em] text-foreground/20 select-none px-3 py-1 border border-border/50 rounded-full">
                  BellBasket Pro
                </div>
              )}

              <div className="flex flex-row gap-2 sm:gap-3 w-full md:w-auto mt-2 md:mt-0">
                <button
                  onClick={() => setShowReviews(true)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 md:px-6 py-3 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white font-bold transition-all relative border border-primary/20 shadow-sm min-w-0"
                >
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline whitespace-nowrap">{t('common.reviews')}</span>
                  {store.reviews && store.reviews.length > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 md:w-5 md:h-5 rounded-full text-[8px] md:text-[10px] font-black text-black bg-primary flex items-center justify-center shadow-md animate-in zoom-in"
                    >
                      {store.reviews.length}
                    </span>
                  )}
                </button>
 
                {store.phone && (
                  <button
                    onClick={() => setShowCallModal(true)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 md:px-6 py-3 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold transition-all shadow-md min-w-0"
                  >
                    <Phone className="w-4 h-4 shrink-0" />
                    <span className="hidden md:inline whitespace-nowrap">{t('common.call')}</span>
                  </button>
                )}

                {store.website && (
                  <button
                    onClick={() => window.open(store.website?.startsWith('http') ? store.website : `https://${store.website}`, '_blank')}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 md:px-6 py-3 rounded-xl bg-blue-500 text-white hover:bg-blue-600 font-bold transition-all shadow-md min-w-0"
                  >
                    <Globe className="w-4 h-4 shrink-0" />
                    <span className="hidden md:inline whitespace-nowrap">Website</span>
                  </button>
                )}
 
                <button
                  onClick={handleShareStore}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 md:px-6 py-3 rounded-xl bg-secondary/80 text-foreground hover:bg-secondary font-bold transition-all shadow-sm border border-border/40 min-w-0"
                  aria-label="Share Store"
                >
                  <Share2 className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline whitespace-nowrap">{t('common.share')}</span>
                </button>
 
                <button
                  onClick={() => toggleSaveStore(store.id)}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 md:px-6 py-3 rounded-xl font-bold transition-all shadow-sm border min-w-0 ${
                    isStoreSaved(store.id)
                      ? 'bg-pink-500/10 text-pink-600 border-pink-500/20'
                      : 'bg-secondary/80 text-foreground hover:bg-secondary border-border/40'
                  }`}
                  aria-label={isStoreSaved(store.id) ? "Unsave Store" : "Save Store"}
                >
                  <Heart className={`w-4 h-4 shrink-0 ${isStoreSaved(store.id) ? 'fill-current' : ''}`} />
                  <span className="hidden md:inline whitespace-nowrap">{isStoreSaved(store.id) ? t('common.saved') : t('common.save')}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}



        <ReviewModal
          isOpen={showReviews}
          onClose={() => setShowReviews(false)}
          reviews={store.reviews || []}
          storeId={store.id}
          storeName={store.name}
        />

        {/* Closed Store Banner */}
        {!store.isOpen && !activeSearch && !isSearching && (
          <div className="mb-8 bg-red-50 dark:bg-red-900/10 rounded-2xl p-4 border border-red-200 dark:border-red-900/30 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 text-red-600 dark:text-red-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-base font-bold text-red-900 dark:text-red-300">{t('store.store_closed')}</p>
              <p className="text-sm text-red-700/80 dark:text-red-400/80 mt-0.5">
                {store.timings ? `${t('store.ordering_disabled')} ${store.timings.open}` : t('store.cannot_place_orders')}
              </p>
            </div>
          </div>
        )}


        {/* Search Bar inside Store */}
        <div className="sticky top-16 z-30 py-3 -mx-4 px-4 bg-white/95 dark:bg-[#202020]/95 backdrop-blur-md border-b border-border/10 shadow-sm">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchTrigger()}
                placeholder={`${t('common.search')} in ${store.name}...`}
                className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-white dark:bg-[#202020] border border-border/50 shadow-sm text-foreground text-sm md:text-base outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setActiveSearch('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground transition-colors z-10"
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
                              setSearchTerm(suggestion.name);
                              setIsSearching(true);
                              setTimeout(() => {
                                setActiveSearch(suggestion.name);
                                setIsSearching(false);
                              }, 600);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-secondary/50 flex items-center gap-3 transition-colors border-b border-border/10 last:border-0"
                          >
                            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium text-foreground truncate">{suggestion.name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button
              onClick={handleSearchTrigger}
              disabled={isSearching}
              className="bg-primary text-primary-foreground px-4 md:px-6 py-3 rounded-2xl font-bold text-sm shadow-lg hover:shadow-primary/30 active:scale-95 transition-all flex items-center justify-center min-w-[50px] md:min-w-[100px]"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
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
              ratingLabel="Best Deals"
              compact={true} 
              className="py-3 rounded-2xl px-4 md:px-5" 
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
              <Loader text={t('common.searching')} subtext={`${t('store.finding_matches')} ${store.name}`} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results/Products Area - Hidden while searching */}
        {!isSearching && (
          <div className="space-y-6">
            <AnimatePresence>
              {!activeSearch && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-8 overflow-hidden"
                >
                  {/* Optional: Add something here if you want to show categories list like in Zomato */}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Products Grouped by Category */}
            {loading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white dark:bg-[#202020] rounded-3xl p-16 text-center space-y-4 border border-border/40 shadow-sm">
                <div className="w-20 h-20 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto opacity-40">
                  <Search className="w-10 h-10" />
                </div>
                <p className="text-lg text-muted-foreground font-medium">{t('common.no_results')} "{activeSearch}"</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setActiveSearch('');
                  }}
                  className="text-primary font-bold hover:underline"
                >
                  {t('common.clear_search')}
                </button>
              </div>
            ) : (
              <div className="space-y-10 pb-20">
                {loading && filteredProducts.length === 0 ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-6">
                      <div className="flex items-center gap-4 px-1">
                        <div className="w-12 h-12 rounded-2xl bg-muted shrink-0 animate-pulse" />
                        <div className="h-8 bg-muted rounded-full w-48 animate-pulse" />
                      </div>
                      <div className="flex gap-3 md:gap-4 overflow-hidden -mx-4 px-4">
                        {Array.from({ length: 4 }).map((_, j) => (
                          <div key={j} className="w-[130px] sm:w-[168px] md:w-[190px] h-[240px] bg-muted rounded-2xl shrink-0 animate-pulse" />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                {activeSearch && (
                  <div className="flex items-center justify-between px-1 mb-6">
                    <h2 className="text-xl font-bold text-foreground">{t('common.showing_results')} "{activeSearch}"</h2>
                    <span className="text-sm text-muted-foreground font-bold">{filteredProducts.length} {t('common.items')} found</span>
                  </div>
                )}
                  {(() => {
                    const groupedMap: Record<string, Product[]> = {};
                    const deals: Product[] = [];

                    filteredProducts.forEach(p => {
                      // Check for deal: MUST be part of an active deal with valid end time
                      const hasActiveDeal = p.deal && new Date(p.deal.endTime) > new Date();
                      
                      if (hasActiveDeal) {
                        deals.push(p);
                      }

                      const cat = p.category || 'Other Items';
                      if (!groupedMap[cat]) groupedMap[cat] = [];
                      groupedMap[cat].push(p);
                    });

                    // Synthesize categories list starting with Deals if they exist
                    const entries = Object.entries(groupedMap);
                    const finalEntries: [string, Product[]][] = entries;
                    
                    return finalEntries.map(([category, items], ci) => (
                    <motion.div
                      key={category}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: ci * 0.1 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-4 px-0">
                        {CATEGORY_METADATA[category] && (
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br ${CATEGORY_METADATA[category].gradient} text-white shadow-md`}>
                            {(() => {
                              const Icon = CATEGORY_METADATA[category].icon;
                              return <Icon className="w-6 h-6" />;
                            })()}
                          </div>
                        )}
                        <h2 className="text-2xl font-black text-foreground tracking-tight">{t(`categories.${category}`, { defaultValue: category })}</h2>
                        <div className="h-px flex-1 bg-border/50" />
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{items.length} {t('common.units')}</span>
                      </div>

                      <div className="relative group/slider">
                        <button
                          onClick={() => scrollContainer(category, 'left')}
                          className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 hidden md:group-hover/slider:flex w-10 h-10 bg-white dark:bg-slate-800 shadow-xl rounded-full items-center justify-center border border-border/50 text-foreground hover:bg-secondary transition-all opacity-0 group-hover/slider:opacity-100"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>

                        <button
                          onClick={() => scrollContainer(category, 'right')}
                          className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 hidden md:group-hover/slider:flex w-10 h-10 bg-white dark:bg-slate-800 shadow-xl rounded-full items-center justify-center border border-border/50 text-foreground hover:bg-secondary transition-all opacity-0 group-hover/slider:opacity-100"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>

                        <div
                          id={`scroll-${category}`}
                          className="flex overflow-x-auto snap-x snap-mandatory gap-3 md:gap-4 pb-4 pt-2 scroll-smooth scrollbar-hide"
                        >
                          {items.map((product, pi) => {
                            const variantInCart = cart.find(c => c.product.id === product.id && c.selectedVariant)?.selectedVariant;
                            const qty = getCartQty(product.id, variantInCart?.id);
                            
                            const baseHasDiscount = !!product.discountedPrice && Number(product.discountedPrice) > 0 && Number(product.discountedPrice) < product.price;
                            const variantHasDiscount = variantInCart ? (!!variantInCart.discountedPrice && variantInCart.discountedPrice < variantInCart.price) : false;
                            
                            const hasDiscount = variantInCart ? variantHasDiscount : baseHasDiscount;
                            const lowestVariantPrice = (!variantInCart && product.hasVariants && product.variants?.length)
                              ? Math.min(...product.variants.map(v => v.discountedPrice || v.price))
                              : null;
                            const discountedPrice = variantInCart 
                              ? (variantHasDiscount ? variantInCart.discountedPrice : variantInCart.price)
                              : (lowestVariantPrice || (baseHasDiscount ? Number(product.discountedPrice) : product.price));
                            const discountPercent = hasDiscount 
                              ? Math.round((( (variantInCart ? variantInCart.price : product.price) - discountedPrice) / (variantInCart ? variantInCart.price : product.price)) * 100) 
                              : 0;
                            
                            const displayQty = (variantInCart ? variantInCart.quantity : product.quantity) 
                              ? ((variantInCart ? variantInCart.quantity : product.quantity).includes(' - ') 
                                  ? (variantInCart ? variantInCart.quantity : product.quantity) 
                                  : (variantInCart ? variantInCart.quantity : product.quantity).replace(/([0-9.]+)([a-zA-Z]+)/, '$1 - $2')) 
                              : '';

                            return (
                              <motion.div
                                key={product.id}
                                id={`product-${product.id}`}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: pi * 0.04 }}
                                whileHover={{ y: -4, scale: 1.02 }}
                                onClick={() => setSelectedProduct(product)}
                                className={`w-[130px] sm:w-[168px] md:w-[190px] shrink-0 snap-start cursor-pointer bg-white dark:bg-[#202020] rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col overflow-hidden relative ${highlightedProductId === product.id
                                  ? 'border-primary ring-2 ring-primary/30 scale-105 z-10'
                                  : 'border-slate-200/80 dark:border-slate-700/60'
                                  } ${product.isCombo ? 'border-primary/40 bg-primary/[0.02]' : ''}`}
                              >
                                <div className="relative h-[115px] sm:h-[148px] overflow-hidden bg-slate-50 dark:bg-slate-800">
                                  {product.isCombo && product.comboItemsData && product.comboItemsData.length > 0 ? (
                                    <div className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide group/card-gallery">
                                      {/* Slide 1: The Grid View */}
                                      <div className="min-w-full h-full snap-center relative">
                                        <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[1.5px] bg-primary/20 relative">
                                          {product.comboItemsData.slice(0, 4).map((c) => (
                                            <img key={c.id} src={c.image} className="w-full h-full object-cover" alt="" />
                                          ))}
                                          {product.comboItemsData.length < 4 && Array.from({ length: 4 - product.comboItemsData.length }).map((_, i) => (
                                            <div key={i} className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                              <PackageSearch className="w-4 h-4 text-primary/20" />
                                            </div>
                                          ))}
                                          <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent pointer-events-none" />
                                          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-yellow-500 text-[6px] font-black uppercase text-white shadow-lg tracking-wider z-20">Bundle</div>
                                        </div>
                                      </div>

                                      {/* Following Slides: Individual Item Images */}
                                      {product.comboItemsData.map((item, idx) => (
                                        <div key={`${item.id}-${idx}`} className="min-w-full h-full snap-center relative bg-slate-100 dark:bg-slate-800">
                                          <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                                          <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
                                            <p className="text-[7px] font-bold text-white truncate uppercase tracking-tighter">{item.name}</p>
                                          </div>
                                        </div>
                                      ))}

                                      {/* Gallery Indicators for Card */}
                                      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 z-20 opacity-0 group-hover/card-gallery:opacity-100 transition-opacity">
                                        <div className="w-1 h-1 rounded-full bg-primary shadow-sm" />
                                        {product.comboItemsData.map((_, i) => (
                                          <div key={i} className="w-1 h-1 rounded-full bg-white/40 shadow-sm" />
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <img
                                      src={product.image}
                                      alt={product.name}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out"
                                    />
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                                  {!product.inStock && (
                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-20 flex items-center justify-center pointer-events-none">
                                      <div className="bg-red-600/80 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/20 shadow-2xl flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                                        <PackageX className="w-3.5 h-3.5 text-white" />
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">{t('common.out_of_stock')}</span>
                                      </div>
                                    </div>
                                  )}
                                  {hasDiscount && (
                                    <div className="absolute top-2 left-2 z-20 bg-primary text-black text-[8px] font-black px-1.5 py-0.5 rounded-md shadow uppercase tracking-tight">
                                      {discountPercent}% OFF
                                    </div>
                                  )}
                                  {product.deal && (
                                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 bg-primary text-black px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 font-mono text-[8px] font-black whitespace-nowrap">
                                      <Clock className="w-2.5 h-2.5" />
                                      <CountdownTimer endTime={product.deal.endTime} />
                                    </div>
                                  )}
                                  {product.hasVariants && (
                                    <div className="absolute top-2 right-2 z-20 bg-secondary/80 backdrop-blur-md text-secondary-foreground text-[8px] font-black px-1.5 py-0.5 rounded-md shadow uppercase tracking-tight border border-white/10">
                                      {product.variants?.length ? `${product.variants.length} Variants` : 'Variants'}
                                    </div>
                                  )}
                                  <div className="absolute bottom-2 right-2 flex flex-col items-end gap-1.5 z-20">
                                    {displayQty && (
                                      <div className="bg-black/70 backdrop-blur-sm text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                                        {displayQty}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col flex-1 p-2 md:p-2.5">
                                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider line-clamp-1 mb-0.5">
                                    {product.category || ''}
                                  </p>
                                  <h3 className={`text-[12px] md:text-[13px] font-bold line-clamp-1 leading-snug mb-0.5 ${product.isCombo ? 'text-primary' : 'text-foreground'}`}>
                                    {t(`products.${product.name}`, { defaultValue: product.name })}
                                  </h3>
                                  <div className="mt-auto pt-2">
                                    <div className="flex items-baseline gap-1.5 mb-2">
                                      <span className="text-[14px] md:text-[15px] font-black text-foreground leading-none">
                                        ₹{discountedPrice}
                                      </span>
                                      {hasDiscount && (
                                         <span className="text-[9px] md:text-[10px] text-muted-foreground line-through decoration-2">
                                           ₹{variantInCart ? variantInCart.price : product.price}
                                         </span>
                                      )}
                                    </div>
                                    {product.inStock ? (
                                      <div onClick={e => e.stopPropagation()}>
                                        {isServiceStore ? (
                                          <button
                                            onClick={e => {
                                              e.stopPropagation();
                                              setBookingService(product);
                                            }}
                                            className="w-full h-8 rounded-xl bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5"
                                          >
                                            Book Now
                                          </button>
                                        ) : (qty === 0) ? (
                                          <button
                                            onClick={e => {
                                              e.stopPropagation();
                                              if (product.hasVariants) {
                                                  setVariantSelectorProduct(product);
                                              } else {
                                                  const productToCart = hasDiscount ? { ...product, price: discountedPrice } : product;
                                                  addToCart({ product: productToCart, storeId: store.id, storeName: store.name, storePhone: store.phone, quantity: 1 });
                                              }
                                            }}
                                            className="w-full h-8 rounded-xl bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5"
                                          >
                                            {product.hasVariants ? 'Select' : <><Plus className="w-3.5 h-3.5" /> Add</>}
                                          </button>
                                        ) : (
                                          <div className="w-full flex items-center justify-between bg-primary rounded-xl px-2 py-1.5">
                                            <button
                                              onClick={e => { e.stopPropagation(); updateQuantity(product.id, qty - 1, variantInCart?.id); }}
                                              className="w-6 h-6 rounded-lg flex items-center justify-center text-primary-foreground"
                                            >
                                              <Minus className="w-3.5 h-3.5" />
                                            </button>
                                            <span className="text-[12px] font-black text-primary-foreground">{qty}</span>
                                            <button
                                              onClick={e => { e.stopPropagation(); updateQuantity(product.id, qty + 1, variantInCart?.id); }}
                                              className="w-6 h-6 rounded-lg flex items-center justify-center text-primary-foreground"
                                            >
                                              <Plus className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="w-full h-8 rounded-xl bg-secondary/60 flex items-center justify-center border border-border/10">
                                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">{t('common.out_of_stock', { defaultValue: 'OUT OF STOCK' })}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  ));
                })()}
              </>
            )}
              </div>
            )}
          </div>
        )}

        {/* Product Request Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 mb-8 p-8 md:p-12 bg-white dark:bg-[#202020] rounded-[3rem] border border-border/40 text-center space-y-6 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <PackageSearch className="w-32 h-32 text-primary" />
          </div>
          
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto text-primary relative z-10">
            <PackageSearch className="w-10 h-10" />
          </div>
          
          <div className="space-y-2 relative z-10">
            <h3 className="text-2xl font-black text-foreground tracking-tight">{t('store.request_product_title', { defaultValue: "Can't find what you're looking for?" })}</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto font-medium">
              {t('store.request_product_desc', { defaultValue: "Let the shopkeeper know! Request a product and we'll check if we can source it for you." })}
            </p>
          </div>
          
          <button 
            onClick={() => setShowRequestModal(true)}
            className="px-10 py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 relative z-10 shadow-lg shadow-primary/20"
          >
            {t('store.request_product_btn', { defaultValue: "Product Req" })}
          </button>
        </motion.div>
      </div>

      {/* ── Product Detail Popup Modal ── */}
      <AnimatePresence>
        {selectedProduct && (() => {
          const p = selectedProduct;
          const comboItems = p.isCombo ? (p.comboItemsData || []) : [];
          const currentDisplayProduct = (activeComboItemIndex === -1 || !comboItems[activeComboItemIndex]) ? p : comboItems[activeComboItemIndex];
          
          const hasDisc = !!currentDisplayProduct.discountedPrice && Number(currentDisplayProduct.discountedPrice) > 0 && Number(currentDisplayProduct.discountedPrice) < currentDisplayProduct.price;
          const finalPrice = hasDisc ? Number(currentDisplayProduct.discountedPrice) : currentDisplayProduct.price;
          const discountPercent = hasDisc ? Math.round(((currentDisplayProduct.price - finalPrice) / currentDisplayProduct.price) * 100) : 0;
          const qtyInCart = getCartQty(currentDisplayProduct.id);
          const dispQty = currentDisplayProduct.quantity ? (currentDisplayProduct.quantity.includes(' - ') ? currentDisplayProduct.quantity : currentDisplayProduct.quantity.replace(/([0-9.]+)([a-zA-Z]+)/, '$1 - $2')) : '';

          return (
            <motion.div
              key="product-popup-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSelectedProduct(null); setActiveComboItemIndex(-1); }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4"
            >
              <motion.div
                key="product-popup-card"
                initial={{ y: 80, opacity: 0, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 80, opacity: 0, scale: 0.97 }}
                transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                onClick={e => e.stopPropagation()}
                className="relative w-full max-w-md bg-white dark:bg-[#202020] rounded-[2rem] overflow-hidden shadow-2xl"
              >
                {/* Close */}
                <button
                  onClick={() => { setSelectedProduct(null); setActiveComboItemIndex(-1); }}
                  className="absolute top-4 right-4 z-[60] w-10 h-10 rounded-full bg-white flex items-center justify-center text-black shadow-lg hover:bg-white/90 active:scale-90 transition-all"
                >
                  <X className="w-5 h-5" strokeWidth={3} />
                </button>

                {/* Navigation Buttons for Combo */}
                {p.isCombo && comboItems.length > 0 && (
                  <>
                    <button 
                      onClick={() => setActiveComboItemIndex(prev => prev > -1 ? prev - 1 : comboItems.length - 1)}
                      className="absolute left-2 top-[35%] -translate-y-1/2 z-[60] w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 active:scale-90 transition-all border border-white/10"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={() => setActiveComboItemIndex(prev => prev < comboItems.length - 1 ? prev + 1 : -1)}
                      className="absolute right-2 top-[35%] -translate-y-1/2 z-[60] w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 active:scale-90 transition-all border border-white/10"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                    
                    {/* Position Indicator */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-white text-[10px] font-black uppercase tracking-widest">
                       {activeComboItemIndex === -1 ? 'Main Combo' : `Item ${activeComboItemIndex + 1} of ${comboItems.length}`}
                    </div>
                  </>
                )}

                {/* Image Gallery */}
                <div className="relative h-56 sm:h-64 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden group/gallery">
                  <div 
                    ref={imageScrollRef}
                    onScroll={(e) => {
                      const target = e.currentTarget;
                      const index = Math.round(target.scrollLeft / target.clientWidth);
                      if (index !== currentImageIndex) setCurrentImageIndex(index);
                    }}
                    className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                  >
                    {/* Flattened Combo Gallery Slider */}
                    {(() => {
                      const slides = [];

                      // 1. Add Main Combo View (Grid + Main Images)
                      if (p.isCombo && p.comboItemsData && p.comboItemsData.length > 0) {
                        slides.push(
                          <div key="combo-grid" className="min-w-full h-full snap-center relative">
                            <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[2px] bg-primary/20 relative">
                              {p.comboItemsData.slice(0, 4).map((item) => (
                                <img key={item.id} src={item.image} className="w-full h-full object-cover" alt="" />
                              ))}
                              {p.comboItemsData.length < 4 && Array.from({ length: 4 - p.comboItemsData.length }).map((_, i) => (
                                <div key={i} className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                  <PackageSearch className="w-6 h-6 text-primary/20" />
                                </div>
                              ))}
                              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent pointer-events-none" />
                            </div>
                          </div>
                        );
                      }

                      // 2. Add Images from Main Product
                      if (p.image) slides.push(<div key="main-img-1" className="min-w-full h-full snap-center"><img src={p.image} className="w-full h-full object-cover" alt="" /></div>);
                      if (p.image2) slides.push(<div key="main-img-2" className="min-w-full h-full snap-center"><img src={p.image2} className="w-full h-full object-cover" alt="" /></div>);

                      // 3. Add Images from all combo items
                      if (p.isCombo && p.comboItemsData) {
                        p.comboItemsData.forEach((item, idx) => {
                          if (item.image) slides.push(
                            <div key={`item-${idx}-img-1`} className="min-w-full h-full snap-center relative">
                              <img src={item.image} className="w-full h-full object-cover" alt="" />
                              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">{item.name}</span>
                              </div>
                            </div>
                          );
                          if (item.image2) slides.push(
                            <div key={`item-${idx}-img-2`} className="min-w-full h-full snap-center relative">
                              <img src={item.image2} className="w-full h-full object-cover" alt="" />
                              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">{item.name}</span>
                              </div>
                            </div>
                          );
                        });
                      } else if (!p.isCombo) {
                        // Regular product images already handled above
                      }

                      return slides;
                    })()}
                  </div>

                  {/* Side Navigation Buttons */}
                  {(() => {
                    const imagesCount = [currentDisplayProduct.image, currentDisplayProduct.image2].filter(Boolean).length + (activeComboItemIndex === -1 && p.isCombo ? 1 : 0);
                    if (imagesCount <= 1) return null;
                    
                    return (
                      <>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (imageScrollRef.current) {
                              imageScrollRef.current.scrollBy({ left: -imageScrollRef.current.clientWidth, behavior: 'smooth' });
                            }
                          }}
                          className={`absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white transition-all border border-white/10 ${currentImageIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (imageScrollRef.current) {
                              imageScrollRef.current.scrollBy({ left: imageScrollRef.current.clientWidth, behavior: 'smooth' });
                            }
                          }}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white transition-all border border-white/10 ${currentImageIndex >= imagesCount - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    );
                  })()}
                  
                  {/* Indicators */}
                  {(() => {
                    const totalSlides = [p.image, p.image2].filter(Boolean).length + (p.isCombo ? 1 + (p.comboItemsData?.length || 0) : 0);
                    if (totalSlides <= 1) return null;

                    return (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-30">
                        {Array.from({ length: totalSlides }).map((_, i) => (
                          <div 
                            key={i} 
                            className={`transition-all duration-300 rounded-full shadow-md ${i === currentImageIndex ? 'w-4 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-white/40'}`}
                          />
                        ))}
                      </div>
                    );
                  })()}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                  {hasDisc && (
                    <div className="absolute top-4 left-4 z-20 bg-green-500 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase shadow">
                      {discountPercent}% OFF
                    </div>
                  )}
                  {dispQty && (
                    <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg z-20">
                      {dispQty}
                    </div>
                  )}
                  {!currentDisplayProduct.inStock && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-40 flex items-center justify-center pointer-events-none">
                      <div className="bg-red-600/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 shadow-2xl flex items-center gap-2.5 animate-in fade-in zoom-in duration-300">
                        <PackageX className="w-4 h-4 text-white" />
                        <span className="text-[12px] font-black text-white uppercase tracking-widest leading-none">{t('common.out_of_stock')}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">{currentDisplayProduct.category}</p>
                    {activeComboItemIndex !== -1 && (
                      <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Part of Bundle</span>
                    )}
                  </div>
                  <h2 className="text-xl font-black text-foreground leading-snug mb-1">
                    {t(`products.${currentDisplayProduct.name}`, { defaultValue: currentDisplayProduct.name })}
                  </h2>
                  {currentDisplayProduct.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">
                      {t(`products_desc.${currentDisplayProduct.name}`, { defaultValue: currentDisplayProduct.description })}
                    </p>
                  )}

                  {/* Variants Section */}
                  {currentDisplayProduct.hasVariants && currentDisplayProduct.variants && currentDisplayProduct.variants.length > 0 && (
                    <div className="mb-6 space-y-3">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-primary" /> {t('products.available_variants', { defaultValue: 'Available Variants' })}
                      </h3>
                      <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1 custom-scrollbar">
                        {currentDisplayProduct.variants.map((v) => {
                          const hasVDisc = v.discountedPrice && v.discountedPrice < v.price;
                          const vPrice = hasVDisc ? v.discountedPrice : v.price;
                          const vInCart = cart.find(c => c.product.id === currentDisplayProduct.id && c.selectedVariant?.id === v.id);
                          const vQty = vInCart ? vInCart.quantity : 0;

                          return (
                            <div key={v.id} className="bg-muted/30 border border-border/50 p-3 rounded-2xl flex items-center justify-between transition-all hover:bg-muted/50">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{v.quantity}</span>
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-sm font-black text-foreground">₹{vPrice}</span>
                                  {hasVDisc && <span className="text-[10px] text-muted-foreground line-through font-bold">₹{v.price}</span>}
                                </div>
                              </div>
                              
                              {vQty === 0 ? (
                                <button
                                  disabled={!currentDisplayProduct.inStock}
                                  onClick={() => addToCart({ 
                                    product: hasVDisc ? { ...currentDisplayProduct, price: vPrice } : currentDisplayProduct, 
                                    selectedVariant: v,
                                    storeId: store.id, 
                                    storeName: store.name, 
                                    storePhone: store.phone, 
                                    quantity: 1 
                                  })}
                                  className={`h-8 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!currentDisplayProduct.inStock ? 'bg-secondary/40 text-muted-foreground cursor-not-allowed' : 'gradient-primary text-primary-foreground hover:opacity-90 active:scale-95 shadow-lg shadow-primary/10'}`}
                                >
                                  {!currentDisplayProduct.inStock ? 'OOS' : t('common.add', { defaultValue: 'Add' })}
                                </button>
                              ) : (
                                <div className="flex items-center bg-primary rounded-xl p-0.5 gap-1 shadow-md">
                                  <button
                                    onClick={() => updateQuantity(currentDisplayProduct.id, vQty - 1, v.id)}
                                    className="w-7 h-7 flex items-center justify-center hover:bg-white/10 text-primary-foreground rounded-lg transition-all"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="text-xs font-black text-primary-foreground min-w-[1.2rem] text-center">{vQty}</span>
                                  <button
                                    onClick={() => updateQuantity(currentDisplayProduct.id, vQty + 1, v.id)}
                                    className="w-7 h-7 flex items-center justify-center hover:bg-white/10 text-primary-foreground rounded-lg transition-all"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Price & Add */}
                  {!currentDisplayProduct.hasVariants && (
                    <div className="flex items-center justify-between mt-2">
                    <div>
                      <span className="text-2xl font-black text-foreground">₹{finalPrice}</span>
                      {hasDisc && (
                        <span className="text-sm text-muted-foreground line-through ml-2">₹{currentDisplayProduct.price}</span>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 font-medium mt-0.5">
                        {activeComboItemIndex === -1 ? 'Bundle Price' : 'Individual Item Info'}
                      </p>
                    </div>

                    {currentDisplayProduct.inStock ? (
                      isServiceStore ? (
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={() => {
                            setBookingService(currentDisplayProduct);
                            setSelectedProduct(null);
                            setActiveComboItemIndex(-1);
                          }}
                          className="h-11 px-8 rounded-xl gradient-primary text-primary-foreground text-sm font-black uppercase tracking-widest shadow-lg hover:opacity-90 transition-all"
                        >
                          Book Service
                        </motion.button>
                      ) : activeComboItemIndex !== -1 ? (
                        <div className="h-11 px-6 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                          <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest text-center leading-tight">Must Buy Full<br/>Bundle</span>
                        </div>
                      ) : qtyInCart === 0 ? (
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={() => {
                            const productToCart = hasDisc ? { ...currentDisplayProduct, price: finalPrice } : currentDisplayProduct;
                            if (productToCart.hasVariants) {
                                setVariantSelectorProduct(productToCart);
                            } else {
                                addToCart({ product: productToCart, storeId: store.id, storeName: store.name, storePhone: store.phone, quantity: 1 });
                            }
                          }}
                          className="h-11 px-8 rounded-xl gradient-primary text-primary-foreground text-sm font-black uppercase tracking-widest shadow-lg hover:opacity-90 transition-all"
                        >
                          Add Bundle
                        </motion.button>
                      ) : (
                        <div className="flex items-center gap-2 bg-primary rounded-xl px-2 py-1.5">
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={() => updateQuantity(currentDisplayProduct.id, qtyInCart - 1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/20 transition-all"
                          >
                            <Minus className="w-4 h-4" />
                          </motion.button>
                          <span className="text-base font-black text-primary-foreground min-w-[1.5rem] text-center">{qtyInCart}</span>
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={() => updateQuantity(currentDisplayProduct.id, qtyInCart + 1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/20 transition-all"
                          >
                            <Plus className="w-4 h-4" />
                          </motion.button>
                        </div>
                      )
                    ) : (
                      <div className="h-11 px-8 rounded-xl bg-secondary/60 flex items-center justify-center border border-border/10">
                        <span className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-60">Out of Stock</span>
                      </div>
                    )}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Booking Popup Modal ── */}
      <AnimatePresence>
        {bookingService && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end justify-center pointer-events-auto"
            onClick={handleCloseBooking}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-white dark:bg-[#202020] rounded-t-[2.5rem] shadow-2xl relative border-t border-white/5 max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-border/20 rounded-full z-50" />
              
              {/* Header - Fixed */}
              <div className="p-6 pb-4 border-b border-border/10">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 pr-4">
                    <h3 className="text-lg font-black text-foreground uppercase tracking-tight truncate">Book {bookingService.name}</h3>
                    <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.15em] mt-0.5">Please provide your details</p>
                  </div>
                  <button
                    onClick={handleCloseBooking}
                    className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-all border border-border/50 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Middle Section - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={bookingData.name}
                      onChange={e => setBookingData({ ...bookingData, name: e.target.value })}
                      className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={bookingData.phone}
                      onChange={e => setBookingData({ ...bookingData, phone: e.target.value })}
                      className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Select Date *</label>
                      <div className="flex gap-3 overflow-x-auto pb-4 pt-2 px-1 -mx-1 custom-scrollbar hide-scrollbar snap-x">
                        {bookingDates.map((d, i) => {
                          const dateStr = d.toISOString().split('T')[0];
                          const isSelected = bookingData.date === dateStr;
                          const isToday = i === 0;
                          const isTomorrow = i === 1;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setBookingData({ ...bookingData, date: dateStr })}
                              className={`relative flex-shrink-0 w-[4.5rem] h-[5.5rem] rounded-[1.5rem] flex flex-col items-center justify-center gap-0.5 transition-all duration-300 snap-start
                                ${isSelected
                                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/40 scale-110 z-10 -translate-y-1'
                                  : 'bg-secondary/60 text-muted-foreground hover:bg-secondary border border-border/50'
                                }`}
                            >
                              <span className={`text-[9px] uppercase font-black tracking-widest ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground/70'}`}>
                                {isToday ? 'Today' : isTomorrow ? 'Tmrw' : d.toLocaleDateString('en-US', { weekday: 'short' })}
                              </span>
                              <span className="text-2xl font-black leading-none my-1">{d.getDate()}</span>
                              <span className={`text-[10px] font-bold ${isSelected ? 'text-primary-foreground/90' : ''}`}>{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Time Slot *</label>
                      {serviceTimeSlots && serviceTimeSlots.length > 0 ? (
                        <div className="relative w-full h-[3.25rem] bg-secondary/50 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/50 shadow-inner group">
                          {/* Static left icon */}
                          <div className="absolute left-4 top-0 bottom-0 flex items-center pointer-events-none z-10">
                            <Clock className="w-4 h-4 text-primary/80" />
                          </div>

                          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-full bg-white/5 pointer-events-none z-0" />

                          <div className="absolute inset-0 overflow-y-auto snap-y snap-mandatory hide-scrollbar z-20">
                            {serviceTimeSlots.map((slot: string, i: number) => {
                              const isSelected = bookingData.timeSlot === slot;
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={(e) => {
                                    e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                    setBookingData({ ...bookingData, timeSlot: slot });
                                  }}
                                  className={`w-full h-[3.25rem] flex items-center pl-11 pr-10 snap-center text-sm font-black transition-all select-none
                                    ${isSelected
                                      ? 'text-foreground tracking-wide scale-[1.02]'
                                      : 'text-muted-foreground/40 scale-100 hover:text-muted-foreground'
                                    }`}
                                >
                                  {slot}
                                </button>
                              );
                            })}
                          </div>

                          {/* Static right indicators */}
                          <div className="absolute right-4 top-0 bottom-0 flex flex-col justify-center gap-1.5 pointer-events-none z-10 text-muted-foreground/50 group-hover:text-primary transition-colors">
                            <ChevronLeft className="w-3.5 h-3.5 rotate-90" strokeWidth={3} />
                            <ChevronLeft className="w-3.5 h-3.5 -rotate-90" strokeWidth={3} />
                          </div>

                          {/* Top/Bottom fade to make it look like a dial */}
                          <div className="absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-secondary/80 to-transparent pointer-events-none z-30" />
                          <div className="absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-secondary/80 to-transparent pointer-events-none z-30" />
                        </div>
                      ) : (
                        <input
                          type="time"
                          required
                          value={bookingData.timeSlot}
                          onChange={e => setBookingData({ ...bookingData, timeSlot: e.target.value })}
                          className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Location / Address *</label>
                    <textarea
                      required
                      rows={2}
                      value={bookingData.location}
                      onChange={e => setBookingData({ ...bookingData, location: e.target.value })}
                      className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description (Optional)</label>
                    <textarea
                      rows={2}
                      value={bookingData.description}
                      onChange={e => setBookingData({ ...bookingData, description: e.target.value })}
                      className="w-full bg-secondary/50 rounded-xl px-4 py-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      placeholder="Any specific instructions..."
                    />
                  </div>
                </div>
              </div>

              {/* Footer - Fixed */}
              <div className="p-6 pt-4 border-t border-border/10 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                <button
                  onClick={handleBookService}
                  disabled={isBooking}
                  className="w-full gradient-primary text-primary-foreground font-black uppercase tracking-widest text-sm py-4 rounded-xl active:scale-95 transition-all"
                >
                  {isBooking ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm Booking'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── Call Confirmation Modal ── */}
      <AnimatePresence>
        {showCallModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#202020] w-full max-w-xs rounded-[2.5rem] p-8 relative shadow-2xl border border-white/10 text-center"
            >
              <button
                onClick={() => setShowCallModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-secondary/50 text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-6 pt-2">
                <div className="w-20 h-20 rounded-[2rem] bg-primary/10 flex items-center justify-center mx-auto text-primary">
                  <Phone className="w-10 h-10" />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-foreground">{store.name}</h3>
                  {store.ownerName && (
                    <p className="text-[11px] font-black text-primary uppercase tracking-widest">{store.ownerName}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground font-medium line-clamp-1 italic px-4">{store.address}</p>
                </div>

                <div className="flex flex-col gap-3">
                  <a 
                    href={`tel:${store.phone}`}
                    onClick={() => setShowCallModal(false)}
                    className="w-full py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    <Phone className="w-4 h-4" /> Call Now
                  </a>
                  <button 
                    onClick={() => setShowCallModal(false)}
                    className="w-full py-4 rounded-2xl bg-secondary text-foreground font-bold text-xs uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── Booking Discard Confirmation Modal ── */}
      <AnimatePresence>
        {showBookingDiscardConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#202020] w-full max-w-xs rounded-[2.5rem] p-8 relative shadow-2xl border border-white/10 text-center"
            >
              <div className="space-y-6 pt-2">
                <div className="w-20 h-20 rounded-[2rem] bg-red-500/10 flex items-center justify-center mx-auto text-red-500">
                  <AlertCircle className="w-10 h-10" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-foreground">Discard Booking?</h3>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed px-2">You have unsaved changes. Are you sure you want to discard this booking?</p>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      setShowBookingDiscardConfirm(false);
                      setBookingService(null);
                      setBookingData({ name: '', phone: '', location: '', description: '', date: '', timeSlot: '' });
                    }}
                    className="w-full py-4 rounded-2xl bg-red-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-red-500/20 hover:opacity-90 transition-all"
                  >
                    Discard Changes
                  </button>
                  <button 
                    onClick={() => setShowBookingDiscardConfirm(false)}
                    className="w-full py-4 rounded-2xl bg-secondary text-foreground font-bold text-xs uppercase tracking-widest transition-all"
                  >
                    Keep Booking
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Product Request Modal ── */}
      <AnimatePresence>
        {showRequestModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#202020] w-full max-w-sm rounded-[2.5rem] p-8 relative shadow-2xl border border-white/10"
            >
              <button
                onClick={() => setShowRequestModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-secondary/50 text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-black text-foreground tracking-tight">Product Req</h2>
                  <p className="text-sm text-muted-foreground font-medium">Tell us what you need from {store.name}</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Product Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Organic Almond Milk"
                      value={requestData.productName}
                      onChange={e => setRequestData({ ...requestData, productName: e.target.value })}
                      className="w-full bg-secondary/50 rounded-xl px-4 py-3.5 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Notes (Optional)</label>
                    <textarea
                      placeholder="Specify brand, quantity or weight..."
                      rows={3}
                      value={requestData.description}
                      onChange={e => setRequestData({ ...requestData, description: e.target.value })}
                      className="w-full bg-secondary/50 rounded-xl px-4 py-3.5 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Photo (Optional)</label>
                    <div className="relative">
                      {requestData.image ? (
                        <div className="relative w-full h-32 rounded-xl overflow-hidden group">
                          <img src={requestData.image} alt="Request" className="w-full h-full object-cover" />
                          <button 
                            onClick={() => setRequestData({ ...requestData, image: '' })}
                            className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-24 bg-secondary/30 rounded-xl border-2 border-dashed border-border/50 cursor-pointer hover:bg-secondary/50 transition-all">
                          <ImageIcon className="w-6 h-6 text-muted-foreground mb-1" />
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Upload Reference</span>
                          <input 
                            type="file" 
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 800000) { // 800KB limit for base64 + firestore overhead
                                  toast.error("Image too large. Please select a smaller photo (under 800KB).");
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onloadend = () => setRequestData({ ...requestData, image: reader.result as string });
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleRequestSubmit}
                  disabled={isSubmittingRequest}
                  className="w-full py-4 rounded-xl bg-primary text-white font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-primary/20"
                >
                  {isSubmittingRequest ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Req"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                        storeId: store.id, 
                        storeName: store.name, 
                        storePhone: store.phone, 
                        quantity: 1 
                    });
                }
                setVariantSelectorProduct(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Sticky Cart Bar — fixed directly above bottom nav */}
      <AnimatePresence>
        {storeCartCount > 0 && (
          <motion.div
            initial={{ y: 48 }}
            animate={{ y: 0 }}
            exit={{ y: 48 }}
            transition={{ type: 'tween', duration: 0.2 }}
            onClick={() => navigate('/cart')}
            className="fixed bottom-[56px] left-0 right-0 z-[45] cursor-pointer bg-amber-400 dark:bg-amber-500 border-t border-amber-500/30 lg:hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 max-w-lg mx-auto">
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="w-[17px] h-[17px] text-black" />
                <div className="flex flex-col">
                  <span className="text-[13px] font-extrabold text-black leading-tight">
                    {storeCartCount} {storeCartCount === 1 ? 'Item' : 'Items'} &middot; ₹{storeCartTotal.toFixed(0)}
                  </span>
                  <span className="text-[10px] font-semibold text-black/50 leading-tight truncate max-w-[180px]">
                    {store?.name}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-black text-[12px] font-black uppercase tracking-wide">
                View Cart
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoreDetail;
