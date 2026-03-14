import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, MapPin, Clock, Plus, Minus, Loader2, MessageSquare, Search, X, Tag, Phone, ChevronRight, ChevronLeft, Share2, Sparkles, ShoppingBasket, Calendar, AlertCircle } from 'lucide-react';
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

import { Helmet } from 'react-helmet';

const StoreDetail = () => {
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productIdFromUrl = searchParams.get('productId');
  const searchQueryFromUrl = searchParams.get('search');
  const { t } = useTranslation();
  const { cart, addToCart, updateQuantity, stores, allProducts } = useApp();
  const [store, setStore] = useState<any>(stores.find(s => s.id === id));
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReviews, setShowReviews] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchQueryFromUrl || '');
  const [isSearching, setIsSearching] = useState(false);
  const [activeSearch, setActiveSearch] = useState(searchQueryFromUrl || '');
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [bookingService, setBookingService] = useState<Product | null>(null);
  const [bookingData, setBookingData] = useState({ name: '', phone: '', location: '', description: '', date: '', timeSlot: '' });
  const [isBooking, setIsBooking] = useState(false);
  const { user } = useApp();
  
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

  // Hide BottomBar when Booking Service Modal is open
  useEffect(() => {
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) {
      bottomNav.style.display = bookingService ? 'none' : '';
    }
    return () => {
      if (bottomNav) bottomNav.style.display = '';
    };
  }, [bookingService]);

  // Scroll to product if productId is in URL
  useEffect(() => {
    if (!loading && products.length > 0 && productIdFromUrl) {
      const product = products.find(p => p.id === productIdFromUrl);
      if (product) {
        setHighlightedProductId(productIdFromUrl);

        // Brief timeout to ensure DOM is ready
        setTimeout(() => {
          const element = document.getElementById(`product-${productIdFromUrl}`);
          if (element) {
            // 1. Scroll the window to the category section first if needed
            // Actually scrollIntoView on the element might be enough
            element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

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
      if (p.name.toLowerCase().includes(query)) suggestions.add(p.name);
    });

    return Array.from(suggestions).slice(0, 6);
  }, [searchTerm, products, isSearching, activeSearch]);

  // 1. Setup Real-time Store Listener & Fetch Products
  useEffect(() => {
    if (!id && !slug) return;

    let unsubscribeStore: (() => void) | null = null;

    const setupListener = (storeId: string) => {
      return onSnapshot(doc(db, 'stores', storeId), async (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          let phone = data.phone;

          if (!phone && data.vendorId) {
            try {
              const userSnap = await getDoc(doc(db, 'users', data.vendorId));
              if (userSnap.exists()) {
                const userData = userSnap.data();
                phone = userData.phone;
              }
            } catch (e) {
              console.log("Failed to fetch vendor phone", e);
            }
          }

          setStore({ id: snap.id, ...data, phone });

          // Visibility Check
          if (data.isBlocked) {
            toast.error("This store has been restricted by administrators.");
            navigate('/', { replace: true });
            return;
          }
          if (data.plan === 'none' || !data.plan) {
            toast.info("This store is currently undergoing maintenance.");
            navigate('/', { replace: true });
            return;
          }
        }
      }, (error) => {
        console.warn("Real-time store sync failed:", error);
      });
    };

    const loadData = async () => {
      let targetId = id;

      if (!targetId && slug) {
        // Find store by slug
        const q = query(collection(db, 'stores'), where('slug', '==', slug));
        const snap = await getDocs(q);
        if (!snap.empty) {
          targetId = snap.docs[0].id;
          const data = snap.docs[0].data();
          setStore({ id: targetId, ...data });
        }
      }

      if (targetId) {
        unsubscribeStore = setupListener(targetId);

        // Fetch products
        setLoading(true);
        try {
          const q = query(collection(db, 'products'), where('vendorId', '==', targetId));
          const querySnapshot = await getDocs(q);
          const productData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Product[];

          if (productData.length > 0) {
            setProducts(productData);
          } else {
            const contextProducts = allProducts.filter(p => p.vendorId === targetId);
            setProducts(contextProducts);
          }
        } catch (error) {
          console.warn("Product fetch failed:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadData();
    return () => {
      if (unsubscribeStore) unsubscribeStore();
    };
  }, [id, slug]); // Re-run when ID or slug changes

  const filteredProducts = useMemo(() => {
    const q = activeSearch.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  }, [products, activeSearch]);

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

  const getCartQty = (productId: string) => cart.find(c => c.product.id === productId)?.quantity || 0;

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

  if (!store) {
    return (
      <Loader fullScreen text={t('store.connecting')} subtext={t('store.wait_moment')} />
    );
  }

  return (
    <div className="min-h-screen gradient-warm">
      <Helmet>
        <title>{store.brandText || store.name} in {store.address.split(',')[0]} | BellBasket</title>
        <meta name="description" content={`Order from ${store.name} in ${store.address || 'your area'}. Shop ${store.category} items, fresh products, and essentials delivered to your doorstep via BellBasket.`} />
        <meta name="keywords" content={`${store.name}, ${store.category}, order online, ${store.address}, BellBasket, grocery delivery ${store.address.split(',')[0]}`} />

        <meta property="og:title" content={`${store.name} | Order Online on BellBasket`} />
        <meta property="og:description" content={`Shop fresh products from ${store.name}. Quick delivery or pickup available in ${store.address.split(',')[0]}.`} />
        <meta property="og:image" content={store.image} />
        <meta property="og:url" content={window.location.href} />

        <meta name="twitter:card" content="summary_large_image" />
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
              "address": {
                "@type": "PostalAddress",
                "streetAddress": store.address,
                "addressLocality": store.address.split(',')[0],
                "addressRegion": "Andhra Pradesh",
                "addressCountry": "IN"
              },
              "geo": {
                "@type": "GeoCoordinates",
                "latitude": store.lat,
                "longitude": store.lng
              },
              "openingHoursSpecification": {
                "@type": "OpeningHoursSpecification",
                "dayOfWeek": [
                  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
                ],
                "opens": store.timings?.open || "09:00",
                "closes": store.timings?.close || "22:00"
              }
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
                  "offers": {
                    "@type": "Offer",
                    "price": p.price,
                    "priceCurrency": "INR"
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
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 relative shadow-2xl border border-white/10"
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

                <div className="bg-gradient-to-br from-primary/5 to-secondary/5 p-8 rounded-[2rem] border border-primary/10 flex flex-col items-center justify-center gap-4">
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
      <div className="pt-20 pb-32 lg:pb-8 px-4 max-w-4xl mx-auto">
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden mb-8 border border-border/40 shadow-sm relative">
            <div className="relative h-36 md:h-52">
              <img src={store.image} alt={store.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                <span className={`text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md border border-white/20 ${store.isOpen ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                  {store.isOpen ? t('home.open_now') : t('home.currently_closed')}
                </span>
              </div>

              {/* Store Branding Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 flex items-end gap-3 md:gap-5 translate-y-8 md:translate-y-10 z-20">
                {(store.logo && store.plan === 'pro') ? (
                  <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl bg-white p-1.5 md:p-2 shadow-xl shrink-0 border border-slate-100">
                    <img src={store.logo} alt="Logo" className="w-full h-full object-contain rounded-xl" />
                  </div>
                ) : (
                  <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl bg-primary/10 p-1.5 md:p-2 shadow-xl shrink-0 border border-primary/20 flex flex-col items-center justify-center text-primary">
                    <span className="text-2xl md:text-3xl font-black">{store.name.charAt(0)}</span>
                  </div>
                )}
                <div className="flex-1 pb-8 md:pb-10">
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white drop-shadow-lg tracking-tight leading-none mb-1">
                    {(store.brandText && store.plan === 'pro') ? store.brandText : store.name}
                  </h1>
                  <p className="text-[10px] md:text-xs font-bold text-white/90 drop-shadow-md mb-2 flex items-center gap-1.5 opacity-90">
                    <MapPin className="w-3 h-3" />
                    {store.address || 'Address not registered'}
                  </p>
                  <div className="flex items-center gap-2 text-[9px] text-white/70 bg-black/30 backdrop-blur-md w-fit px-2.5 py-1 rounded-full border border-white/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    {t('home.live_storefront')}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-12 md:pt-16 px-4 md:px-8 pb-6 md:pb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="grid grid-cols-2 md:flex items-center gap-x-6 gap-y-4 md:gap-8 w-full md:w-auto">
                {Array.isArray(store.reviews) && store.reviews.length > 0 ? (
                  <div className="flex flex-col items-start md:items-center bg-secondary/30 px-4 py-2 rounded-xl">
                    <div className="flex items-center gap-1.5 text-primary">
                      <Star className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                      <span className="font-black text-lg md:text-xl">
                        {(store.reviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 0), 0) / store.reviews.length).toFixed(1)}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap tracking-wider">{store.reviews.length} {t('common.reviews')}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-start md:items-center bg-secondary/30 px-4 py-2 rounded-xl">
                    <div className="flex items-center gap-1.5 text-primary">
                      <Star className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                      <span className="font-black text-lg md:text-xl">{store.rating || '4.5'}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap tracking-wider">{t('common.rating')}</span>
                  </div>
                )}

                <div className="flex flex-col bg-secondary/30 px-4 py-2.5 rounded-xl min-w-0 max-w-[200px]">
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

              <div className="flex flex-row gap-3 w-full md:w-auto mt-2 md:mt-0">
                <button
                  onClick={() => setShowReviews(true)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white font-bold transition-all relative border border-primary/20 shadow-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{t('common.reviews')}</span>
                  {store.reviews && store.reviews.length > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-black text-white bg-primary flex items-center justify-center shadow-md animate-in zoom-in"
                    >
                      {store.reviews.length}
                    </span>
                  )}
                </button>

                {store.phone && (
                  <a
                    href={`tel:${store.phone}`}
                    className="flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold transition-all shadow-md"
                  >
                    <Phone className="w-4 h-4" />
                    <span className="hidden md:inline">{t('common.call')}</span>
                  </a>
                )}

                <button
                  onClick={handleShareStore}
                  className="flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-secondary/80 text-foreground hover:bg-secondary font-bold transition-all shadow-sm border border-border/40"
                  aria-label="Share Store"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden md:inline">{t('common.share')}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        <ReviewModal
          isOpen={showReviews}
          onClose={() => setShowReviews(false)}
          reviews={store.reviews || []}
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
        <div className="mb-10 sticky top-16 z-30 py-3 -mx-4 px-4 bg-white/95 backdrop-blur-md border-b border-border/10 shadow-sm">
          <div className="relative group flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchTrigger()}
                placeholder={`${t('common.search')} in ${store.name}...`}
                className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-border/50 shadow-sm text-foreground text-sm md:text-base outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                    className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-border/50 overflow-hidden z-50 origin-top"
                  >
                    <ul>
                      {searchSuggestions.map((suggestion, idx) => (
                        <li key={idx}>
                          <button
                            onClick={() => {
                              setSearchTerm(suggestion);
                              setIsSearching(true);
                              setTimeout(() => {
                                setActiveSearch(suggestion);
                                setIsSearching(false);
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
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center space-y-4 border border-border/40 shadow-sm">
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
                {activeSearch && (
                  <div className="flex items-center justify-between px-1 mb-6">
                    <h2 className="text-xl font-bold text-foreground">{t('common.showing_results')} "{activeSearch}"</h2>
                    <span className="text-sm text-muted-foreground font-bold">{filteredProducts.length} {t('common.items')} found</span>
                  </div>
                )}
                {Object.entries(
                  filteredProducts.reduce((acc, p) => {
                    const cat = p.category || 'Other Items';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(p);
                    return acc;
                  }, {} as Record<string, Product[]>)
                ).map(([category, items], ci) => (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: ci * 0.1 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-4 px-1">
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
                      {/* Left Scroll Button (Desktop Only) */}
                      <button
                        onClick={() => scrollContainer(category, 'left')}
                        className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 hidden md:group-hover/slider:flex w-10 h-10 bg-white dark:bg-slate-800 shadow-xl rounded-full items-center justify-center border border-border/50 text-foreground hover:bg-secondary transition-all opacity-0 group-hover/slider:opacity-100"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>

                      {/* Right Scroll Button (Desktop Only) */}
                      <button
                        onClick={() => scrollContainer(category, 'right')}
                        className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 hidden md:group-hover/slider:flex w-10 h-10 bg-white dark:bg-slate-800 shadow-xl rounded-full items-center justify-center border border-border/50 text-foreground hover:bg-secondary transition-all opacity-0 group-hover/slider:opacity-100"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>

                      <div
                        id={`scroll-${category}`}
                        className="flex overflow-x-auto snap-x snap-mandatory gap-3 md:gap-4 pb-4 pt-2 -mx-4 px-4 md:px-2 md:-mx-2 scroll-smooth scrollbar-hide"
                      >
                        {items.map((product, pi) => {
                          const qty = getCartQty(product.id);
                          const hasDiscount = !!product.discountedPrice && Number(product.discountedPrice) > 0 && Number(product.discountedPrice) < product.price;
                          const discountedPrice = hasDiscount ? Number(product.discountedPrice) : product.price;
                          const discountPercent = hasDiscount ? Math.round(((product.price - discountedPrice) / product.price) * 100) : 0;
                          const displayQty = product.quantity ? (product.quantity.includes(' - ') ? product.quantity : product.quantity.replace(/([0-9.]+)([a-zA-Z]+)/, '$1 - $2')) : '';

                          return (
                            <motion.div
                              key={product.id}
                              id={`product-${product.id}`}
                              initial={{ opacity: 0, y: 16 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: pi * 0.04 }}
                              whileHover={{ y: -4, scale: 1.02 }}
                              onClick={() => setSelectedProduct(product)}
                              className={`w-[148px] sm:w-[168px] md:w-[190px] shrink-0 snap-start cursor-pointer bg-white dark:bg-slate-900 rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col overflow-hidden relative ${highlightedProductId === product.id
                                ? 'border-primary ring-2 ring-primary/30 scale-105 z-10'
                                : 'border-slate-200/80 dark:border-slate-700/60'
                                }`}
                            >
                              {/* Image */}
                              <div className="relative h-[130px] sm:h-[148px] overflow-hidden bg-slate-50 dark:bg-slate-800">
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400 ease-out"
                                />
                                {/* Gradient overlay bottom */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

                                {/* Watermark */}
                                {store?.useWatermark && (
                                  <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none select-none">
                                    {(store.logo && store.plan === 'pro') ? (
                                      <img src={store.logo} alt="" className="w-9 h-9 object-contain opacity-10 -rotate-12 mix-blend-multiply grayscale" />
                                    ) : (
                                      <span className="text-[9px] font-black uppercase -rotate-12 opacity-20 text-primary">
                                        {store.plan === 'pro' ? (store.brandText || store.name) : 'BellBasket'}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Out of stock */}
                                {!product.inStock && (
                                  <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-20 flex items-center justify-center">
                                    <span className="text-white text-[9px] font-black uppercase tracking-widest bg-red-500/90 px-2.5 py-1 rounded-full shadow">
                                      {t('common.out_of_stock')}
                                    </span>
                                  </div>
                                )}

                                {/* Discount pill */}
                                {hasDiscount && (
                                  <div className="absolute top-2 left-2 z-20 bg-green-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md shadow uppercase tracking-tight">
                                    {discountPercent}% OFF
                                  </div>
                                )}

                                {/* Qty tag */}
                                {displayQty && (
                                  <div className="absolute bottom-2 right-2 z-20 bg-black/70 backdrop-blur-sm text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                                    {displayQty}
                                  </div>
                                )}
                              </div>

                              {/* Content */}
                              <div className="flex flex-col flex-1 p-2.5">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider line-clamp-1 mb-0.5">
                                  {product.category || ''}
                                </p>
                                <h3 className="text-[13px] font-bold text-foreground line-clamp-1 leading-snug mb-0.5">
                                  {t(`products.${product.name}`, { defaultValue: product.name })}
                                </h3>
                                {(() => {
                                  const desc = product.description
                                    ? t(`products_desc.${product.name}`, { defaultValue: product.description })
                                    : t('store.quality_assured');
                                  const isLong = desc.length > 60;
                                  return (
                                    <div className="mb-1">
                                      <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed inline">
                                        {desc}
                                      </p>
                                      {isLong && (
                                        <button
                                          onClick={e => { e.stopPropagation(); setSelectedProduct(product); }}
                                          className="text-[10px] text-primary font-bold ml-1 hover:underline whitespace-nowrap"
                                        >
                                          +more
                                        </button>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Price */}
                                <div className="mt-auto pt-2">
                                  <div className="flex items-baseline gap-1.5 mb-2">
                                    <span className="text-[15px] font-black text-foreground leading-none">₹{discountedPrice}</span>
                                    {hasDiscount && (
                                      <span className="text-[10px] text-muted-foreground line-through">₹{product.price}</span>
                                    )}
                                  </div>
                                  {/* Full-width Add / Qty stepper */}
                                  {product.inStock ? (
                                    <div onClick={e => e.stopPropagation()}>
                                      {isServiceStore ? (
                                        <motion.button
                                          whileTap={{ scale: 0.95 }}
                                          onClick={e => {
                                            e.stopPropagation();
                                            setBookingService(product);
                                          }}
                                          className="w-full h-8 rounded-xl bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-md shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
                                        >
                                          Book Now
                                        </motion.button>
                                      ) : qty === 0 ? (
                                        <motion.button
                                          whileTap={{ scale: 0.95 }}
                                          onClick={e => {
                                            e.stopPropagation();
                                            addToCart({ product, storeId: store.id, storeName: store.name, storePhone: store.phone, quantity: 1 });
                                          }}
                                          className="w-full h-8 rounded-xl bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-md shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
                                        >
                                          <Plus className="w-3.5 h-3.5" />
                                          Add
                                        </motion.button>
                                      ) : (
                                        <div className="w-full flex items-center justify-between bg-primary rounded-xl px-2 py-1.5">
                                          <motion.button
                                            whileTap={{ scale: 0.8 }}
                                            onClick={e => { e.stopPropagation(); updateQuantity(product.id, qty - 1); }}
                                            className="w-6 h-6 rounded-lg flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/20 transition-all"
                                          >
                                            <Minus className="w-3.5 h-3.5" />
                                          </motion.button>
                                          <span className="text-[12px] font-black text-primary-foreground">{qty}</span>
                                          <motion.button
                                            whileTap={{ scale: 0.8 }}
                                            onClick={e => { e.stopPropagation(); updateQuantity(product.id, qty + 1); }}
                                            className="w-6 h-6 rounded-lg flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/20 transition-all"
                                          >
                                            <Plus className="w-3.5 h-3.5" />
                                          </motion.button>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="w-full h-8 rounded-xl bg-secondary/60 flex items-center justify-center">
                                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Out of Stock</span>
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
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Product Detail Popup Modal ── */}
      <AnimatePresence>
        {selectedProduct && (() => {
          const p = selectedProduct;
          const hasDisc = !!p.discountedPrice && Number(p.discountedPrice) > 0 && Number(p.discountedPrice) < p.price;
          const finalPrice = hasDisc ? Number(p.discountedPrice) : p.price;
          const discountPercent = hasDisc ? Math.round(((p.price - finalPrice) / p.price) * 100) : 0;
          const qtyInCart = getCartQty(p.id);
          const dispQty = p.quantity ? (p.quantity.includes(' - ') ? p.quantity : p.quantity.replace(/([0-9.]+)([a-zA-Z]+)/, '$1 - $2')) : '';

          return (
            <motion.div
              key="product-popup-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            >
              <motion.div
                key="product-popup-card"
                initial={{ y: 80, opacity: 0, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 80, opacity: 0, scale: 0.97 }}
                transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                onClick={e => e.stopPropagation()}
                className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl"
              >
                {/* Close */}
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center hover:bg-black/20 transition-all"
                >
                  <X className="w-4 h-4 text-foreground" />
                </button>

                {/* Image */}
                <div className="relative h-56 sm:h-64 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                  {hasDisc && (
                    <div className="absolute top-4 left-4 z-20 bg-green-500 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase shadow">
                      {discountPercent}% OFF
                    </div>
                  )}
                  {dispQty && (
                    <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                      {dispQty}
                    </div>
                  )}
                  {!p.inStock && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="bg-red-500 text-white font-black text-sm px-4 py-2 rounded-full uppercase tracking-widest">
                        {t('common.out_of_stock')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">{p.category}</p>
                  <h2 className="text-xl font-black text-foreground leading-snug mb-1">
                    {t(`products.${p.name}`, { defaultValue: p.name })}
                  </h2>
                  {p.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      {t(`products_desc.${p.name}`, { defaultValue: p.description })}
                    </p>
                  )}

                  {/* Price & Add */}
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <span className="text-2xl font-black text-foreground">₹{finalPrice}</span>
                      {hasDisc && (
                        <span className="text-sm text-muted-foreground line-through ml-2">₹{p.price}</span>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 font-medium mt-0.5">Inclusive of all taxes</p>
                    </div>

                    {p.inStock && (
                      isServiceStore ? (
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={() => {
                            setBookingService(p);
                            setSelectedProduct(null); // Close this modal
                          }}
                          className="h-11 px-8 rounded-xl gradient-primary text-primary-foreground text-sm font-black uppercase tracking-widest shadow-lg hover:opacity-90 transition-all"
                        >
                          Book Service
                        </motion.button>
                      ) : qtyInCart === 0 ? (
                        <motion.button
                          whileTap={{ scale: 0.92 }}
                          onClick={() => {
                            addToCart({ product: p, storeId: store.id, storeName: store.name, storePhone: store.phone, quantity: 1 });
                          }}
                          className="h-11 px-8 rounded-xl gradient-primary text-primary-foreground text-sm font-black uppercase tracking-widest shadow-lg hover:opacity-90 transition-all"
                        >
                          Add to Cart
                        </motion.button>
                      ) : (
                        <div className="flex items-center gap-2 bg-primary rounded-xl px-2 py-1.5">
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={() => updateQuantity(p.id, qtyInCart - 1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/20 transition-all"
                          >
                            <Minus className="w-4 h-4" />
                          </motion.button>
                          <span className="text-base font-black text-primary-foreground min-w-[1.5rem] text-center">{qtyInCart}</span>
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={() => updateQuantity(p.id, qtyInCart + 1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/20 transition-all"
                          >
                            <Plus className="w-4 h-4" />
                          </motion.button>
                        </div>
                      )
                    )}
                  </div>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 overflow-y-auto"
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-2xl my-8"
            >
              <button
                onClick={() => setBookingService(null)}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-secondary text-foreground flex items-center justify-center hover:bg-secondary/80 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <h2 className="text-xl font-black mb-4 pr-8">Book {bookingService.name}</h2>

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

              <button
                onClick={handleBookService}
                disabled={isBooking}
                className="w-full mt-6 gradient-primary text-primary-foreground font-black uppercase tracking-widest text-sm py-4 rounded-xl shadow-lg hover:shadow-primary/30 active:scale-95 transition-all"
              >
                {isBooking ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm Booking'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoreDetail;
