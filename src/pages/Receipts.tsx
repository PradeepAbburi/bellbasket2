import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import MapView from '@/components/MapView';
import { Helmet } from 'react-helmet';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { useApp } from '@/context/AppContext';
import { getCurrencySymbol } from '@/utils/currency';
import { doc, updateDoc, arrayUnion, setDoc, getDoc, deleteDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { ServiceBooking, Store, Order } from '@/types';
import { Trash2, CheckCircle2, Circle, RefreshCcw, Package, Clock, Star, ArrowLeft, MapPin, Navigation, Loader2, EyeOff, KeyRound, Phone, User as UserIcon, BellRing, ShoppingCart, ChevronRight, Rewind } from 'lucide-react';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { sendInAppNotification } from '@/utils/notifications';
import { RenderBookingCard, RenderOrderCard } from '@/components/ReceiptCards';
import PageLoading from '@/components/PageLoading';

const statusColors: Record<string, string> = {
  pending: 'bg-slate-50 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800',
  accepted: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
  packed: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
  completed: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
  rejected: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  packed: 'Packed',
  completed: 'Completed',
  rejected: 'Order Rejected',
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-IN', { month: 'short' });
  const year = date.getFullYear();
  return `${day} - ${month} - ${year}`;
};

const Receipts = () => {
  const { user, stores, orders, serviceBookings, refreshData, loading, cart, cartSubtotal } = useApp();
  if (loading) return <PageLoading />;
  const { t } = useTranslation();
  const cartStore = cart.length > 0 ? stores.find(s => s.id === cart[0].storeId) : null;
  const cartSymbol = getCurrencySymbol(cartStore?.country, cartStore?.address);
  const navigate = useNavigate();
  const [view, setView] = useState<'active' | 'history'>('active');
  const activeMode = localStorage.getItem('active_mode') || 'product';
  const filterType = activeMode === 'service' ? 'bookings' : 'orders';
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedOrderId = searchParams.get('orderId');
  const selectedBookingId = searchParams.get('bookingId');
  
  const setSelectedOrderId = (id: string | null) => {
    if (id) setSearchParams({ orderId: id });
    else {
      searchParams.delete('orderId');
      setSearchParams(searchParams);
    }
  };

  const setSelectedBookingId = (id: string | null) => {
    if (id) setSearchParams({ bookingId: id });
    else {
      searchParams.delete('bookingId');
      setSearchParams(searchParams);
    }
  };

  const { requestPushNotifications } = useApp();
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [reviews, setReviews] = useState<Record<string, { rating: number; text: string; isAnonymous: boolean; submitted: boolean }>>(() => {
    const saved = localStorage.getItem('order_reviews');
    return saved ? JSON.parse(saved) : {};
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [vendorInfoState, setVendorInfoState] = useState<Record<string, { phone: string; name: string }>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [scrollMonthYear, setScrollMonthYear] = useState<string>('');
  const [showScrollTag, setShowScrollTag] = useState<boolean>(false);

  useEffect(() => {
    const handleWindowScroll = () => {
      if (window.scrollY < 80) {
        setShowScrollTag(false);
        return;
      }

      const headers = document.querySelectorAll('.date-section-header');
      let activeHeader: Element | null = null;
      
      for (let i = 0; i < headers.length; i++) {
        const rect = headers[i].getBoundingClientRect();
        if (rect.top <= 240) {
          activeHeader = headers[i];
        }
      }
      
      if (activeHeader) {
        const rawDate = activeHeader.getAttribute('data-date');
        if (rawDate) {
          const parts = rawDate.split(',');
          if (parts.length > 1) {
            const datePart = parts[1].trim();
            const dateWords = datePart.split(' ');
            if (dateWords.length >= 3) {
              setScrollMonthYear(`${dateWords[1]} ${dateWords[2]}`);
            } else {
              setScrollMonthYear(datePart);
            }
          } else {
            setScrollMonthYear(rawDate);
          }
          setShowScrollTag(true);
        }
      } else {
        setShowScrollTag(false);
      }
    };

    window.addEventListener('scroll', handleWindowScroll);
    return () => {
      window.removeEventListener('scroll', handleWindowScroll);
    };
  }, []);
  
  // Shared Receipts State
  const [sharedOrder, setSharedOrder] = useState<Order | null>(null);
  const [sharedBooking, setSharedBooking] = useState<ServiceBooking | null>(null);
  const [fetchingShared, setFetchingShared] = useState(false);
  const sessionSeenIds = useRef<Set<string>>(new Set());
  const [rejectionsToHideInSession, setRejectionsToHideInSession] = useState<Set<string>>(new Set());
  const hasAcknowlegedNewRejections = useRef(false);

  useEffect(() => {
    localStorage.setItem('order_reviews', JSON.stringify(reviews));
  }, [reviews]);

  // Fetch shared order/booking if not found in context
  useEffect(() => {
    const fetchShared = async () => {
      if (selectedOrderId) {
        const found = orders.find(o => o.id === selectedOrderId);
        if (!found) {
          setFetchingShared(true);
          try {
            const snap = await getDoc(doc(db, 'orders', selectedOrderId));
            if (snap.exists()) {
              setSharedOrder({ id: snap.id, ...snap.data() } as Order);
            }
          } catch (err) {
            console.error("Shared order fetch error:", err);
          } finally {
            setFetchingShared(false);
          }
        } else {
          setSharedOrder(null);
        }
      } else {
        setSharedOrder(null);
      }

      if (selectedBookingId) {
        const found = serviceBookings.find(b => b.id === selectedBookingId);
        if (!found) {
          setFetchingShared(true);
          try {
            const snap = await getDoc(doc(db, 'serviceBookings', selectedBookingId));
            if (snap.exists()) {
              setSharedBooking({ id: snap.id, ...snap.data() } as ServiceBooking);
            }
          } catch (err) {
            console.error("Shared booking fetch error:", err);
          } finally {
            setFetchingShared(false);
          }
        } else {
          setSharedBooking(null);
        }
      } else {
        setSharedBooking(null);
      }
    };

    fetchShared();
  }, [selectedOrderId, selectedBookingId, orders, serviceBookings]);

  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    const checkPermission = () => {
      setNotificationPermission(Notification.permission);
    };
    window.addEventListener('focus', checkPermission);
    return () => window.removeEventListener('focus', checkPermission);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    toast.info("Refreshing receipts...");
    refreshData().finally(() => setIsRefreshing(false));
  };

  useEffect(() => {
    setSelectedIds([]);
  }, [filterType, view]);

  const handleRating = (id: string, rating: number) => {
    setReviews(prev => ({ ...prev, [id]: { ...(prev[id] || { text: '', isAnonymous: false, submitted: false }), rating } }));
  };

  const handleAnonymous = (id: string, isAnonymous: boolean) => {
    setReviews(prev => ({ ...prev, [id]: { ...(prev[id] || { rating: 0, text: '', submitted: false }), isAnonymous } }));
  };

  const getStoreForOrder = (storeId: string): Store | undefined => {
    return stores.find(s => s.id === storeId);
  };

  const handleReviewSubmit = async (id: string, type: 'order' | 'booking' = 'order') => {
    const review = reviews[id];
    if (!review || review.rating === 0) {
      toast.error(t('common.select_rating_message'));
      return;
    }

    const item = type === 'order' 
      ? (orders.find(o => o.id === id) || sharedOrder)
      : (serviceBookings.find(b => b.id === id) || sharedBooking);
    if (!item) {
      toast.error(t('common.order_not_found'));
      return;
    }

    const loadingToast = toast.loading(t('common.saving_review'));

    try {
      if (user?.id) {
        const collectionName = type === 'order' ? 'orders' : 'serviceBookings';
        const itemRef = doc(db, collectionName, id);
        await updateDoc(itemRef, {
          review: {
            rating: review.rating,
            text: review.text || '',
            submittedAt: new Date().toISOString(),
            isAnonymous: review.isAnonymous || false
          }
        });

        const storeRef = doc(db, 'stores', item.storeId);
        const isAnon = review.isAnonymous || false;
        const reviewData = {
          id: `rev-${id}-${Date.now()}`,
          userName: isAnon ? t('common.anonymous_customer') : (user?.name || t('common.customer')),
          rating: Number(review.rating),
          comment: review.text?.trim() || '',
          date: new Date().toISOString(),
          isAnonymous: isAnon
        };

        try {
          await updateDoc(storeRef, {
            reviews: arrayUnion(reviewData)
          });
        } catch (err: any) {
          // If updateDoc fails, could be due to missing reviews field, but arrayUnion usually handles it if doc exists
          console.error("Store review update failed:", err);
        }

        if (item.storeId) {
          sendInAppNotification(item.storeId, {
            title: '⭐ New Review Received!',
            body: `${user?.name || 'A customer'} just rated you ${review.rating} stars${review.text?.trim() ? `: "${review.text.substring(0, 30)}${review.text.length > 30 ? '...' : ''}"` : ''}`,
            url: '/vendor'
          });
        }
      }

      setReviews(prev => ({
        ...prev,
        [id]: { ...prev[id], submitted: true, submittedAt: new Date().toISOString() }
      }));

      toast.dismiss(loadingToast);
      toast.success(t('common.review_saved_successfully'));
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast.dismiss(loadingToast);
      toast.error(t('common.failed_to_save_review'));
    }
  };

  const customerOrders = useMemo(() => {
    return orders.filter(o => o.userId === user?.id);
  }, [orders, user?.id]);

  // Handle Rejection Viewing logic
  useEffect(() => {
    if (loading || !user) return;

    const findNewRejections = async () => {
      const newRejectedOrders = customerOrders.filter(o => o.status === 'rejected' && !o.rejectionViewed);
      const newRejectedBookings = serviceBookings.filter(b => b.status === 'rejected' && !b.rejectionViewed);
      
      const allNewIds = [...newRejectedOrders.map(o => o.id), ...newRejectedBookings.map(b => b.id)];
      if (allNewIds.length === 0) return;

      // Mark them as "seen in this session" so they stay in ACTIVE for now
      allNewIds.forEach(id => sessionSeenIds.current.add(id));

      // 🕒 Start a 5-second timer to move them to HISTORY
      setTimeout(() => {
        setRejectionsToHideInSession(prev => {
          const next = new Set(prev);
          allNewIds.forEach(id => next.add(id));
          return next;
        });
      }, 5000);

      // Mark them as viewed in DB in the background
      for (const order of newRejectedOrders) {
        updateDoc(doc(db, 'orders', order.id), { rejectionViewed: true });
      }
      for (const booking of newRejectedBookings) {
        updateDoc(doc(db, 'serviceBookings', booking.id), { rejectionViewed: true });
      }
    };

    findNewRejections();
  }, [loading, user, customerOrders.length, serviceBookings.length]);

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 3000);
    return () => clearInterval(interval);
  }, []);

  const activeOrders = customerOrders.filter(o => {
    if (o.status !== 'completed' && o.status !== 'rejected') return true;
    if (o.status === 'completed') {
      const completedAt = o.completedAt ? new Date(o.completedAt).getTime() : 0;
      return completedAt > 0 && (now - completedAt) < 30000;
    }
    if (o.status === 'rejected') {
      // Hide if timer expired in this session
      if (rejectionsToHideInSession.has(o.id)) return false;

      // Stay in active if it was new when this page loaded
      if (sessionSeenIds.current.has(o.id)) return true;
      
      // If none of the session trackers apply, use the DB flag
      return !o.rejectionViewed;
    }
    return false;
  });

  const pastOrders = customerOrders.filter(o => {
    if (o.status === 'completed') {
      const completedAt = o.completedAt ? new Date(o.completedAt).getTime() : 0;
      return completedAt === 0 || (now - completedAt) >= 30000;
    }
    if (o.status === 'rejected') {
      // Show if timer expired in this session
      if (rejectionsToHideInSession.has(o.id)) return true;

      // If it was new this session but timer hasn't expired, don't show in past yet
      if (sessionSeenIds.current.has(o.id)) return false;
      
      return o.rejectionViewed === true;
    }
    return false;
  }).filter(o => !o.deletedByUser);

  const activeBookings = serviceBookings.filter(b => {
    if (b.status !== 'completed' && b.status !== 'rejected') return true;
    if (b.status === 'rejected') {
      if (rejectionsToHideInSession.has(b.id)) return false;
      if (sessionSeenIds.current.has(b.id)) return true;
      
      return !b.rejectionViewed;
    }
    return false;
  });

  const pastBookings = serviceBookings.filter(b => {
    if (b.status === 'completed') return true;
    if (b.status === 'rejected') {
      if (rejectionsToHideInSession.has(b.id)) return true;
      if (sessionSeenIds.current.has(b.id)) return false;
      
      return b.rejectionViewed === true;
    }
    return false;
  }).filter(b => !b.deletedByUser);
  const displayOrders = view === 'active' ? activeOrders : pastOrders;
  const displayBookings = view === 'active' ? activeBookings : pastBookings;

  const groupReceiptsByDate = (items: any[]) => {
    const groups: Record<string, any[]> = {};
    const sorted = [...items].sort((a, b) => {
      const dateA = new Date(a.date || a.bookingDate || a.createdAt || Date.now());
      const dateB = new Date(b.date || b.bookingDate || b.createdAt || Date.now());
      return dateB.getTime() - dateA.getTime();
    });

    sorted.forEach(item => {
      const dateVal = item.date || item.bookingDate || item.createdAt || new Date().toISOString();
      const dateObj = new Date(dateVal);
      const dateKey = dateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });
    return groups;
  };


  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const confirmDelete = window.confirm(`Are you sure you want to delete ${selectedIds.length} items?`);
    if (!confirmDelete) return;

    const promise = Promise.all(selectedIds.map(async (id) => {
      const collectionName = filterType === 'orders' ? 'orders' : 'serviceBookings';
      await updateDoc(doc(db, collectionName, id), { deletedByUser: true });
    }));

    toast.promise(promise, {
      loading: 'Deleting items...',
      success: () => {
        setSelectedIds([]);
        refreshData();
        return 'Items deleted successfully';
      },
      error: (err) => `Failed to delete: ${err.message || 'Error'}`
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    const allIds = filterType === 'orders' ? displayOrders.map(o => o.id) : displayBookings.map(b => b.id);
    setSelectedIds(selectedIds.length === allIds.length ? [] : allIds);
  };

  // Fetch vendor details logic
  useEffect(() => {
    const fetchVendors = async () => {
      const details: Record<string, any> = {};
      const uniqueStoreIds = new Set([
        ...orders.map(o => o.storeId),
        ...serviceBookings.map(b => b.storeId)
      ]);

      for (const sid of uniqueStoreIds) {
        if (sid) {
          try {
            const sDoc = await getDoc(doc(db, 'stores', sid));
            if (sDoc.exists()) {
              const sData = sDoc.data();
              if (sData.vendorId) {
                const vDoc = await getDoc(doc(db, 'vendors', sData.vendorId));
                if (vDoc.exists()) {
                  details[sid] = { 
                    phone: vDoc.data()?.phone || sData.phone, 
                    name: vDoc.data()?.companyName || sData.name 
                  };
                }
              }
            }
          } catch (e) {}
        }
      }
      setVendorInfoState(details);
    };

    if (orders.length > 0 || serviceBookings.length > 0) {
      fetchVendors();
    }
  }, [orders, serviceBookings]);

  const userCoords: [number, number] = [
    Number(localStorage.getItem('user_lat')) || 28.6139,
    Number(localStorage.getItem('user_lng')) || 77.2090
  ];

  return (
    <div className="min-h-screen gradient-warm">
      {/* Floating Month & Year Scroll Indicator */}
      <AnimatePresence>
        {showScrollTag && scrollMonthYear && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-[76px] left-0 right-0 mx-auto w-fit z-50 px-4 py-2 bg-[#202020] text-yellow-400 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl border border-white/20 backdrop-blur-md flex items-center justify-center gap-2"
          >
            <Clock className="w-3.5 h-3.5 animate-pulse text-yellow-400" />
            {scrollMonthYear}
          </motion.div>
        )}
      </AnimatePresence>

      <Helmet>
        <title>{t('common.receipts.title')} - BellBasket</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <Header />
      <PullToRefresh onRefresh={refreshData} className="pt-20 pb-32 px-4 max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {!selectedOrderId && !selectedBookingId ? (
          <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6 pb-20"
            >
              {/* Active Basket Banner */}
              {cart.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <button
                    onClick={() => navigate('/cart')}
                    className="w-full flex items-center justify-between bg-primary text-primary-foreground p-5 rounded-[2rem] shadow-lg shadow-primary/20 group hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                        <ShoppingCart className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-black uppercase tracking-[0.2em] opacity-80 leading-none mb-1">My Active Shopping List</p>
                        <p className="text-xl font-black tracking-tight">{cartSymbol}{cartSubtotal}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 group-hover:bg-white/20 transition-colors">
                      {cart.reduce((s, c) => s + c.quantity, 0)} Items <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                </motion.div>
              )}

              {/* Section Header + Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-foreground">
                      {filterType === 'orders' ? t('common.receipts.title') : 'Service Bookings'}
                    </h1>
                    <button 
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className={`p-2 rounded-full bg-secondary text-primary hover:bg-primary hover:text-white transition-all shadow-sm ${isRefreshing ? 'opacity-50' : 'active:scale-95'}`}
                    >
                      <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {filterType === 'orders' 
                      ? `${activeOrders.length} active · ${pastOrders.length} completed`
                      : `${activeBookings.length} active · ${pastBookings.length} completed`
                    }
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {notificationPermission === 'denied' && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-destructive/10 text-destructive text-[9px] font-black uppercase tracking-widest border border-destructive/20 animate-pulse">
                      <BellRing className="w-3 h-3" /> Notifications Blocked! Please allow in browser settings
                    </div>
                  )}
                  {notificationPermission === 'default' && (
                    <button
                      onClick={async () => {
                        await requestPushNotifications();
                        if (typeof Notification !== 'undefined') {
                          setNotificationPermission(Notification.permission);
                        }
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm border border-primary/20"
                    >
                      <BellRing className="w-3 h-3" /> Enable Alerts
                    </button>
                  )}
                  <div className="bg-secondary p-1 rounded-xl flex items-center gap-1 w-fit">
                    <button onClick={() => setView('active')} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${view === 'active' ? 'bg-white dark:bg-primary shadow-sm text-foreground dark:text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                      {t('common.active')}
                    </button>
                    <button onClick={() => setView('history')} className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${view === 'history' ? 'bg-white dark:bg-primary shadow-sm text-foreground dark:text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                      {t('common.history')}
                    </button>
                  </div>


                </div>
              </div>



              <AnimatePresence>
                {view === 'history' && selectedIds.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center justify-between p-3 glass-strong rounded-2xl bg-white/40 dark:bg-black/40 border-primary/20 shadow-xl overflow-hidden">
                    <div className="flex items-center gap-4">
                      <button onClick={handleSelectAll} className="flex items-center gap-2 group">
                        <div className={`p-1 rounded-md transition-colors ${selectedIds.length === (filterType === 'orders' ? displayOrders.length : displayBookings.length) ? 'bg-primary/20' : 'bg-muted/30 group-hover:bg-muted/50'}`}>
                          {selectedIds.length === (filterType === 'orders' ? displayOrders.length : displayBookings.length) ? <CheckCircle2 className="w-5 h-5 text-primary fill-primary" /> : <Circle className="w-5 h-5 text-muted-foreground/40" />}
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-foreground">Select All</span>
                      </button>
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">{selectedIds.length} Items</span>
                    </div>
                    <button onClick={handleDeleteSelected} className="p-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white active:scale-90 transition-all shadow-sm border border-destructive/20"><Trash2 className="w-5 h-5" /></button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Content Area */}
              {filterType === 'orders' ? (
                /* Products View */
                displayOrders.length === 0 ? (
                  <div className="glass rounded-2xl p-12 text-center">
                    <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="font-bold text-foreground mb-1">No Product Orders</p>
                    <p className="text-sm text-muted-foreground">{view === 'active' ? 'You have no active product orders right now.' : 'No past product orders to show.'}</p>
                  </div>
                ) : view === 'history' ? (() => {
                  const grouped = groupReceiptsByDate(displayOrders);
                  return (
                    <div className="space-y-6">
                      {Object.entries(grouped).map(([dateLabel, items]) => (
                        <div key={dateLabel} className="space-y-3">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/75 flex items-center gap-4 date-section-header w-full my-4" data-date={dateLabel}>
                            <span className="flex-1 h-[1px] bg-primary/40" />
                            <span>{dateLabel}</span>
                            <span className="flex-1 h-[1px] bg-primary/40" />
                          </h3>
                          <div className="grid md:grid-cols-2 gap-4">
                            {items.map((order, i) => (
                              <RenderOrderCard
                                key={order.id}
                                order={order} i={i}
                                onlyShowTime={true}
                                review={reviews[order.id] || (order.review ? { ...order.review, submitted: true } : { rating: 0, text: '', submitted: false, isAnonymous: false })}
                                onRate={(star) => handleRating(order.id, star)}
                                onReviewChange={(text) => setReviews(prev => ({ ...prev, [order.id]: { ...(prev[order.id] || { rating: 0, submitted: false, isAnonymous: false }), text } }))}
                                onAnonymous={(anon) => handleAnonymous(order.id, anon)}
                                onSubmit={() => handleReviewSubmit(order.id, 'order')}
                                t={t} storePhone={getStoreForOrder(order.storeId)?.phone}
                                vendorInfo={vendorInfoState[order.storeId]} getStoreForOrder={getStoreForOrder}
                                userCoords={userCoords} isSelected={selectedIds.includes(order.id)}
                                onToggleSelect={() => toggleSelect(order.id)} onLongPress={() => toggleSelect(order.id)}
                                showSelection={view === 'history' && selectedIds.length > 0}
                                hasReviewedStore={Array.isArray(getStoreForOrder(order.storeId)?.reviews) && getStoreForOrder(order.storeId)!.reviews!.some((r: any) => r.userId === user?.id)}
                                onClick={() => { 
                                  navigate(`/receipt/${order.id}`); 
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })() : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {displayOrders.map((order, i) => (
                      <RenderOrderCard
                        key={order.id}
                        order={order} i={i}
                        review={reviews[order.id] || (order.review ? { ...order.review, submitted: true } : { rating: 0, text: '', submitted: false, isAnonymous: false })}
                        onRate={(star) => handleRating(order.id, star)}
                        onReviewChange={(text) => setReviews(prev => ({ ...prev, [order.id]: { ...(prev[order.id] || { rating: 0, submitted: false, isAnonymous: false }), text } }))}
                        onAnonymous={(anon) => handleAnonymous(order.id, anon)}
                        onSubmit={() => handleReviewSubmit(order.id, 'order')}
                        t={t} storePhone={getStoreForOrder(order.storeId)?.phone}
                        vendorInfo={vendorInfoState[order.storeId]} getStoreForOrder={getStoreForOrder}
                        userCoords={userCoords} isSelected={selectedIds.includes(order.id)}
                        onToggleSelect={() => toggleSelect(order.id)} onLongPress={() => toggleSelect(order.id)}
                        showSelection={false}
                        hasReviewedStore={Array.isArray(getStoreForOrder(order.storeId)?.reviews) && getStoreForOrder(order.storeId)!.reviews!.some((r: any) => r.userId === user?.id)}
                        onClick={() => { 
                          navigate(`/receipt/${order.id}`); 
                        }}
                      />
                    ))}
                  </div>
                )
              ) : (
                /* Services View */
                displayBookings.length === 0 ? (
                  <div className="glass rounded-2xl p-12 text-center">
                    <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="font-bold text-foreground mb-1">No Service Bookings</p>
                    <p className="text-sm text-muted-foreground">{view === 'active' ? 'You have no active service bookings right now.' : 'No past service bookings to show.'}</p>
                  </div>
                ) : view === 'history' ? (() => {
                  const grouped = groupReceiptsByDate(displayBookings);
                  return (
                    <div className="space-y-6">
                      {Object.entries(grouped).map(([dateLabel, items]) => (
                        <div key={dateLabel} className="space-y-3">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/75 flex items-center gap-4 date-section-header w-full my-4" data-date={dateLabel}>
                            <span className="flex-1 h-[1px] bg-primary/40" />
                            <span>{dateLabel}</span>
                            <span className="flex-1 h-[1px] bg-primary/40" />
                          </h3>
                          <div className="grid md:grid-cols-2 gap-4">
                            {items.map((booking, i) => (
                              <RenderBookingCard
                                key={booking.id} booking={booking} i={i}
                                onlyShowTime={true}
                                review={reviews[booking.id] || (booking.review ? { ...booking.review, submitted: true } : { rating: 0, text: '', submitted: false, isAnonymous: false })}
                                onRate={(star) => handleRating(booking.id, star)}
                                onReviewChange={(text) => setReviews(prev => ({ ...prev, [booking.id]: { ...(prev[booking.id] || { rating: 0, submitted: false, isAnonymous: false }), text } }))}
                                onAnonymous={(anon) => handleAnonymous(booking.id, anon)}
                                onSubmit={() => handleReviewSubmit(booking.id, 'booking')}
                                t={t} storePhone={getStoreForOrder(booking.storeId)?.phone}
                                vendorInfo={vendorInfoState[booking.storeId]} getStoreForOrder={getStoreForOrder}
                                userCoords={userCoords} isSelected={selectedIds.includes(booking.id)}
                                onToggleSelect={() => toggleSelect(booking.id)} onLongPress={() => toggleSelect(booking.id)}
                                showSelection={view === 'history' && selectedIds.length > 0}
                                hasReviewedStore={Array.isArray(getStoreForOrder(booking.storeId)?.reviews) && getStoreForOrder(booking.storeId)!.reviews!.some((r: any) => r.userId === user?.id)}
                                onClick={() => { 
                                  navigate(`/receipt/${booking.id}`); 
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })() : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {displayBookings.map((booking, i) => (
                      <RenderBookingCard
                        key={booking.id} booking={booking} i={i}
                        review={reviews[booking.id] || (booking.review ? { ...booking.review, submitted: true } : { rating: 0, text: '', submitted: false, isAnonymous: false })}
                        onRate={(star) => handleRating(booking.id, star)}
                        onReviewChange={(text) => setReviews(prev => ({ ...prev, [booking.id]: { ...(prev[booking.id] || { rating: 0, submitted: false, isAnonymous: false }), text } }))}
                        onAnonymous={(anon) => handleAnonymous(booking.id, anon)}
                        onSubmit={() => handleReviewSubmit(booking.id, 'booking')}
                        t={t} storePhone={getStoreForOrder(booking.storeId)?.phone}
                        vendorInfo={vendorInfoState[booking.storeId]} getStoreForOrder={getStoreForOrder}
                        userCoords={userCoords} isSelected={selectedIds.includes(booking.id)}
                        onToggleSelect={() => toggleSelect(booking.id)} onLongPress={() => toggleSelect(booking.id)}
                        showSelection={false}
                        hasReviewedStore={Array.isArray(getStoreForOrder(booking.storeId)?.reviews) && getStoreForOrder(booking.storeId)!.reviews!.some((r: any) => r.userId === user?.id)}
                        onClick={() => { 
                          navigate(`/receipt/${booking.id}`); 
                        }}
                      />
                    ))}
                  </div>
                )
              )}
            </motion.div>
          ) : (
            <motion.div key="tracking" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 pb-20">
              <button onClick={() => { setSelectedOrderId(null); setSelectedBookingId(null); }} className="flex items-center gap-2 text-sm font-bold text-primary mb-2">
                <ArrowLeft className="w-4 h-4" /> {selectedOrderId ? t('common.back_to_all_orders') : 'Back to Bookings'}
              </button>

              {selectedOrderId && (
                (() => {
                  const order = orders.find(o => o.id === selectedOrderId) || sharedOrder;
                  if (!order) {
                    return fetchingShared ? (
                      <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
                    ) : (
                      <div className="p-12 glass rounded-2xl text-center text-muted-foreground border-2 border-dashed border-border/50">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="font-bold text-lg">{t('common.order_not_found')}</p>
                        <p className="text-xs mt-1">This receipt might be private or doesn't exist.</p>
                      </div>
                    );
                  }
                  return (
                    <RenderOrderCard
                      order={order} i={0}
                      review={reviews[selectedOrderId] || (order.review ? { ...order.review, submitted: true } as any : { rating: 0, text: '', submitted: false, isAnonymous: false })}
                      onRate={(star) => handleRating(selectedOrderId, star)}
                      onReviewChange={(text) => setReviews(prev => ({ ...prev, [selectedOrderId]: { ...(prev[selectedOrderId] || { rating: 0, submitted: false, isAnonymous: false }), text } }))}
                      onAnonymous={(anon) => handleAnonymous(selectedOrderId, anon)}
                      onSubmit={() => handleReviewSubmit(selectedOrderId)}
                      t={t} storePhone={getStoreForOrder(order.storeId)?.phone}
                      vendorInfo={vendorInfoState[order.storeId]}
                      getStoreForOrder={getStoreForOrder} userCoords={userCoords} standalone={true}
                    />
                  );
                })()
              )}

              {selectedBookingId && (
                (() => {
                  const booking = serviceBookings.find(b => b.id === selectedBookingId) || sharedBooking;
                  if (!booking) {
                    return fetchingShared ? (
                      <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
                    ) : (
                      <div className="p-12 glass rounded-2xl text-center text-muted-foreground border-2 border-dashed border-border/50">
                        <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="font-bold text-lg">Booking Not Found</p>
                        <p className="text-xs mt-1">This booking might be private or doesn't exist.</p>
                      </div>
                    );
                  }
                  return (
                    <RenderBookingCard
                      booking={booking} i={0}
                      review={reviews[selectedBookingId] || (booking.review ? { ...booking.review, submitted: true } as any : { rating: 0, text: '', submitted: false, isAnonymous: false })}
                      onRate={(star) => handleRating(selectedBookingId, star)}
                      onReviewChange={(text) => setReviews(prev => ({ ...prev, [selectedBookingId]: { ...(prev[selectedBookingId] || { rating: 0, submitted: false, isAnonymous: false }), text } }))}
                      onAnonymous={(anon) => handleAnonymous(selectedBookingId, anon)}
                      onSubmit={() => handleReviewSubmit(selectedBookingId, 'booking')}
                      t={t} storePhone={getStoreForOrder(booking.storeId)?.phone}
                      vendorInfo={vendorInfoState[booking.storeId]}
                      getStoreForOrder={getStoreForOrder} userCoords={userCoords} standalone={true}
                    />
                  );
                })()
              )}

              <div className="glass rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center"><Clock className="w-6 h-6 text-primary" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t('common.estimated_time')}</p>
                    <p className="text-base font-bold text-foreground">{t('common.fast_secure_pickup')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center"><MapPin className="w-6 h-6 text-accent" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t('common.pickup_point')}</p>
                    <p className="text-base font-bold text-foreground line-clamp-1">
                      {getStoreForOrder(
                        orders.find(o => o.id === selectedOrderId)?.storeId || 
                        sharedOrder?.storeId ||
                        serviceBookings.find(b => b.id === selectedBookingId)?.storeId || 
                        sharedBooking?.storeId || 
                        ''
                      )?.address || 'Near main gate'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </PullToRefresh>
    </div>
  );
};

export default Receipts;
