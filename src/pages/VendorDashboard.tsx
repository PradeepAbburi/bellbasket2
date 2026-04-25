import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Store as StoreIcon, Power, PowerOff, Package, TrendingUp, ShoppingCart, Crown, Check, Star, MessageSquare, Send, Zap, Building2, BarChart3, Clock, Scissors, Settings, MessageCircle, ArrowRight, Image as ImageIcon, Lock, Save, Mail, XCircle, Share2, Phone, Camera, Upload, MapPin, Search, Navigation, X, KeyRound, ShieldAlert, BellRing, Rocket, FileText, StickyNote, Plus, PackageSearch } from 'lucide-react';
import { getStoreVisualStatus } from '@/utils/store-status';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { getAvatarUrl } from '@/utils/avatars';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import QRCodeWithLogo from '@/components/ui/qr-code-with-logo';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { DashboardSkeleton } from '@/components/SkeletonLoader';
import { StoreReview } from '@/types';

const VendorDashboard = () => {
  const { user, loading, orders: allOrders, serviceBookings, stores, updateUser, refreshData, productRequests = [] } = useApp();
  
  const recentReviews = useMemo(() => {
    const allStoreReviews = stores?.flatMap(s => s.reviews || []) || [];
    return allStoreReviews
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [stores]);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ua = navigator.userAgent;
  const { requestPushNotifications } = useApp();
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [playerInfo, setPlayerInfo] = useState<{ id: string; synced: boolean }>({ id: '', synced: false });
  const [isOpen, setIsOpen] = useState(true);
  const [productCount, setProductCount] = useState(0);
  const [revenue, setRevenue] = useState(0);
  const [recentNotes, setRecentNotes] = useState<any[]>([]);
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});
  const [vendorStore, setVendorStore] = useState<any>(null);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [daysToExpiry, setDaysToExpiry] = useState<number | null>(null);
  const [hideExpiryBanner, setHideExpiryBanner] = useState(() => {
    return sessionStorage.getItem('bellbasket_hide_expiry') === 'true';
  });

  const dismissExpiryBanner = () => {
    sessionStorage.setItem('bellbasket_hide_expiry', 'true');
    setHideExpiryBanner(true);
  };
  const [contactEmail, setContactEmail] = useState('');
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportQuery, setSupportQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  useEffect(() => {
    if (user?.subscriptionExpiry && user.plan !== 'none') {
      const expiry = new Date(user.subscriptionExpiry);
      const now = new Date();
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysToExpiry(diffDays);
    } else {
      setDaysToExpiry(null);
    }
  }, [user?.subscriptionExpiry, user?.plan]);

  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    
    // Polling or focusing window to check permission state change
    const checkPermission = () => {
      setNotificationPermission(Notification.permission);
    };
    
    window.addEventListener('focus', checkPermission);

    // Auto-prompt after 3 seconds if default
    if (Notification.permission === 'default') {
      const timer = setTimeout(() => {
        requestPushNotifications();
      }, 3000);
      return () => {
        window.removeEventListener('focus', checkPermission);
        clearTimeout(timer);
      };
    }

    return () => window.removeEventListener('focus', checkPermission);
  }, [requestPushNotifications]);

  // Sync OneSignal Status for Diagnostics
  useEffect(() => {
    if (user) {
      const tokens = user.fcmTokens || (user.fcmToken ? [user.fcmToken] : []);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validId = tokens.find(t => typeof t === 'string' && uuidRegex.test(t));
      
      setPlayerInfo({
        id: validId || '',
        synced: !!validId
      });
    }
  }, [user?.fcmTokens, user?.fcmToken]);

  const sendTestPush = async () => {
    if (!user?.id) return;
    const loadingToast = toast.loading("Sending test push notification...");
    try {
      const response = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: user.id,
          title: "Test Notification 🔔",
          body: "Push notifications are correctly configured!",
          type: 'system'
        })
      });
      
      const data = await response.json();
      toast.dismiss(loadingToast);

      if (data.success) {
        if (data.recipientCount > 0) {
          toast.success("Test push sent successfully!", {
            description: `Sent to ${data.recipientCount} device(s). Check your mobile bar.`
          });
        } else {
          const errorMsg = data.errors ? (Array.isArray(data.errors) ? data.errors.join(", ") : JSON.stringify(data.errors)) : (data.message || "Check if your device ID is registered on OneSignal dashboard.");
          toast.warning("API success, but 0 recipients matched.", {
            description: errorMsg,
            duration: 8000
          });
        }
      } else {
        const errorDetail = data.error?.errors?.[0] || data.error?.message || data.message || "Unknown error";
        toast.error(`Push delivery failed (${data.status || '500'})`, {
          description: errorDetail,
          duration: 10000
        });
      }
    } catch (e) {
      toast.dismiss(loadingToast);
      toast.error("Network error sending test push");
    }
  };

  const refreshPushStatus = () => {
    const ua = navigator.userAgent;
    const isNativeBridge = (window as any).median || (window as any).gonative;
    const OneSignal = (window as any).OneSignal;

    console.log("🔍 [Diagnostic] UA:", ua);
    console.log("🔍 [Diagnostic] Bridge:", !!isNativeBridge);
    console.log("🔍 [Diagnostic] Web SDK:", !!OneSignal);

    if (isNativeBridge) {
      toast.info("Polling native bridge for OneSignal ID...");
      if ((window as any).median?.oneSignal?.info) {
        (window as any).median.oneSignal.info();
      } else if ((window as any).gonative?.oneSignal?.id) {
        (window as any).gonative.oneSignal.id();
      }
    } else if (OneSignal) {
       toast.info("Requesting Web Notification Slidedown...");
        OneSignal.Slidedown.promptPush();
    } else {
      toast.error("OneSignal SDK not found.", {
        description: "If you just deployed, please refresh the page and wait a few seconds."
      });
    }
  };

  const requestSupport = () => {
    setContactEmail(user?.email || '');
    setShowSupportModal(true);
  };

  // Fetch recent notes for the dashboard preview
  useEffect(() => {
    if (!user?.id) return;
    const q = query(collection(db, 'notes'), where('vendorId', '==', user.id));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRecentNotes(data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 3));
    });
    return () => unsub();
  }, [user?.id]);

  const handleSubmitTicket = async () => {
    if (!user) return;
    const loadingToast = toast.loading("Submitting ticket...");
    try {
      await addDoc(collection(db, "support_requests"), {
        userId: user.id,
        userName: user.name || 'Vendor',
        userEmail: contactEmail,
        plan: user.plan || 'basic',
        status: 'open',
        details: supportQuery,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [{
          id: 'init',
          text: supportQuery,
          senderId: user.id,
          senderName: user.name || 'Vendor',
          role: 'user',
          timestamp: new Date().toISOString()
        }]
      });
      toast.dismiss(loadingToast);
      toast.success("Ticket Submitted Successfully!");
      setShowSupportModal(false);
      setSupportQuery('');
    } catch (e: any) {
      toast.dismiss(loadingToast);
      console.warn("Firestore write failed, falling back to local storage:", e);

      // Fallback: Save to Local Storage for Demo/Offline consistency
      const newLocalTicket = {
        id: 'local-' + Date.now(),
        userId: user.id,
        userName: user.name || 'Vendor',
        userEmail: contactEmail,
        plan: user.plan || 'basic',
        status: 'open',
        details: supportQuery,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [{
          id: 'init',
          text: supportQuery,
          senderId: user.id,
          senderName: user.name || 'Vendor',
          role: 'user',
          timestamp: new Date().toISOString()
        }]
      };
      const existing = JSON.parse(localStorage.getItem('bellbasket_local_tickets') || '[]');
      localStorage.setItem('bellbasket_local_tickets', JSON.stringify([newLocalTicket, ...existing]));

      toast.success("Ticket Submitted Successfully (Offline Mode)!");
      setShowSupportModal(false);
      setSupportQuery('');
    }
  };

  // Filter orders for this vendor
  const vendorOrders = useMemo(() => {
    return allOrders.filter(o => o.storeId === user?.id);
  }, [allOrders, user?.id]);

  useEffect(() => {
    if (!loading && user) {
      if (user.role !== 'vendor') {
        navigate('/auth');
      } else if (!user.hasSetupStore) {
        navigate('/vendor/setup');
      }
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  useEffect(() => {
    if (!user) return;

    // Find vendor's store
    const store = stores.find(s => s.vendorId === user.id || s.id === user.id);
    setVendorStore(store);

    // Fetch store status
    getDoc(doc(db, 'stores', user.id)).then((docSnap) => {
      if (docSnap.exists()) {
        setIsOpen(docSnap.data().isOpen);
      }
    });

    // Fetch product count
    const fetchStats = async () => {
      try {
        if (!user?.id) return;
        const q = query(collection(db, 'products'), where('vendorId', '==', user.id));
        const snapshot = await getDocs(q);
        setProductCount(snapshot.size);

        // Simple revenue calculation from completed orders
        const rev = vendorOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total, 0);

        // Compute revenue from completed bookings if they have a total price
        // For now we use 0 as default since ServiceBooking is not tracking price yet
        const bookingsRev = serviceBookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + ((b as any).total || 0), 0);

        setRevenue(rev + bookingsRev);
      } catch (e) {
        console.warn("Stats fetch failed:", e);
      }
    };

    fetchStats();
  }, [user?.id, vendorOrders, stores]);

  // Auto-manage shop status based on timings
  useEffect(() => {
    if (!vendorStore?.timings || !vendorStore?.autoClose || !user?.id) return;

    const checkAutoStatus = async () => {
      if (!vendorStore || !user?.id) return;
      
      const visualStatus = getStoreVisualStatus(vendorStore);

      // If database status doesn't match the calculated visual status, update it
      if (visualStatus !== isOpen) {
        try {
          await updateDoc(doc(db, 'stores', user.id), { isOpen: visualStatus });
          setIsOpen(visualStatus);
          toast.info(`Shop automatically ${visualStatus ? 'opened' : 'closed'} based on scheduled timings`, {
            description: "You can manually change this status at any time."
          });
        } catch (e) {
          console.error("Auto-status update failed:", e);
        }
      }
    };

    const interval = setInterval(checkAutoStatus, 60000);
    checkAutoStatus();
    return () => clearInterval(interval);
  }, [vendorStore?.timings, vendorStore?.autoClose, isOpen, user?.id, vendorStore?.lastManualUpdate]);

  const toggleShop = async () => {
    if (!user) return;
    try {
      const newStatus = !isOpen;
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'stores', user.id), { 
        isOpen: newStatus,
        lastManualUpdate: now 
      });
      setIsOpen(newStatus);
      toast.success(newStatus ? 'Shop opened' : 'Shop closed');
    } catch (error) {
      toast.error('Failed to update shop status');
    }
  };

  const [showShareModal, setShowShareModal] = useState(false);
  const storeUrl = vendorStore?.slug
    ? `${window.location.origin}/stores/${vendorStore.slug}`
    : `${window.location.origin}/store/${user?.id}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(storeUrl)}`;

  const handleShareStore = () => {
    setShowShareModal(true);
  };

  const handleReplySubmit = async (reviewId: string) => {
    const reply = replyInputs[reviewId];
    if (!reply || !reply.trim() || !user?.id) {
      toast.error('Please enter a reply');
      return;
    }

    const loadingToast = toast.loading('Posting reply...');
    try {
      // 1. Get current reviews
      const updatedReviews = (vendorStore?.reviews || []).map((r: StoreReview) => {
        if (r.id === reviewId) {
          return { ...r, reply: reply.trim() };
        }
        return r;
      });

      // 2. Update Firestore
      await updateDoc(doc(db, 'stores', user.id), {
        reviews: updatedReviews
      });

      // 3. Clear input
      setReplyInputs(prev => ({
        ...prev,
        [reviewId]: ''
      }));

      toast.dismiss(loadingToast);
      toast.success('Reply posted successfully!');
    } catch (error) {
      console.error("Reply failed:", error);
      toast.dismiss(loadingToast);
      toast.error('Failed to post reply. Check permissions.');
    }
  };

  const sendPromotion = () => {
    if (user?.plan !== 'pro') return toast.error('Pro plan required for broadcasts');
    const msg = window.prompt("Enter promotional message to broadcast to all nearby customers:");
    if (!msg) return;
    toast.success("Broadcast Sent!", {
      description: "Your promotion is now visible to nearby customers in the locality."
    });
  };

  const handleBellBoost = () => {
    toast.info("Coming Soon!", {
        duration: 5000
    });
  };

  const isServiceStore = vendorStore?.storeType === 'service';

  const stats = [
    { label: isServiceStore ? 'Total Services' : t('vendor_dashboard.total_products'), value: productCount, icon: isServiceStore ? Scissors : Package },
    { label: isServiceStore ? 'Active Bookings' : t('vendor_dashboard.active_orders'), value: isServiceStore ? serviceBookings.length : vendorOrders.length, icon: ShoppingCart },
    { label: t('vendor_dashboard.revenue'), value: `₹${revenue.toLocaleString()}`, icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen gradient-warm">
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
              className="bg-[#202020] w-full max-w-sm rounded-[2.5rem] p-8 relative shadow-2xl border border-white/10"
            >
              <button
                onClick={() => setShowShareModal(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-secondary/50 text-muted-foreground transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>

              <div className="text-center space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-foreground tracking-tight">Store QR Code</h2>
                  <p className="text-sm text-muted-foreground font-medium">Customers can scan this to visit your store</p>
                </div>

                <div className="bg-gradient-to-br from-primary/5 to-secondary/5 p-8 rounded-[2rem] border border-primary/10 flex flex-col items-center justify-center gap-4">
                  <QRCodeWithLogo value={storeUrl} size={180} logoSize={40} />
                  <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-xs font-black uppercase tracking-widest">
                    <Zap className="w-3.5 h-3.5" />
                    Permanent QR Code
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
                    Copy Link
                  </button>
                  <button
                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-white font-bold text-sm transition-all shadow-sm"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: vendorStore?.name || "My Store",
                          url: storeUrl
                        });
                      }
                    }}
                  >
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PullToRefresh onRefresh={refreshData} className="pt-20 pb-40 lg:pb-8 px-4 max-w-4xl mx-auto">
        <div className="space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-y-5 mb-8 pt-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">{t('common.dashboard')}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={handleShareStore}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-secondary/80 text-foreground text-xs font-bold  transition-all shadow-sm"
              title="Share Store Link"
            >
              <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Share Store</span>
            </button>
            <button
              onClick={handleBellBoost}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-black uppercase tracking-widest  transition-all shadow-sm border border-primary/20"
              title="BellBoost Marketing"
            >
              <Rocket className="w-4 h-4" /> <span className="hidden sm:inline">BellBoost</span>
              <span className="sm:hidden">Boost</span>
            </button>
            {user?.plan && user.plan !== 'basic' && (
              <button
                onClick={requestSupport}
                className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold transition-all"
              >
                <MessageCircle className="w-4 h-4" /> Priority Support
              </button>
            )}
            <button
              onClick={toggleShop}
              className={`relative flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold text-sm transition-all overflow-hidden ${isOpen
                ? 'bg-emerald-500 text-white'
                : 'bg-rose-500 text-white'
                }`}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={isOpen ? 'open' : 'closed'}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 relative z-10"
                >
                  {isOpen ? (
                    <>
                      <Power className="w-4 h-4" />
                      <span>{t('home.open_now')}</span>
                    </>
                  ) : (
                    <>
                      <PowerOff className="w-4 h-4" />
                      <span>{t('home.closed')}</span>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="w-1.5 h-1.5 rounded-full bg-white relative z-10" />
            </button>
            {notificationPermission === 'denied' && (
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-[10px] sm:text-xs font-black uppercase tracking-widest border border-destructive/20 ">
                <BellRing className="w-4 h-4" /> Blocked! Please allow in browser settings
              </div>
            )}

            {vendorStore?.offersDelivery ? (
               <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shadow-sm transition-all animate-in fade-in slide-in-from-right-4 duration-500">
                  <Package className="w-4 h-4 text-emerald-500 " />
                  <div className="flex flex-col items-start leading-none gap-0.5">
                     <span className="text-[10px] uppercase tracking-widest font-black">Delivery Active</span>
                     <span className="text-[9px] opacity-70 font-bold">₹{vendorStore?.deliveryFee} fee</span>
                  </div>
               </div>
            ) : (
               <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-2xl bg-secondary/50 text-muted-foreground border border-border/50 shadow-sm transition-all opacity-60">
                  <Package className="w-4 h-4" />
                  <span className="text-[10px] uppercase tracking-widest font-black">Delivery Off</span>
               </div>
            )}
          </div>
        </div>

        {/* Notification Permission Banner */}
        {notificationPermission === 'default' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/5 border-2 border-primary/20 rounded-[2rem] p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                <BellRing className="w-8 h-8" />
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-lg font-black text-foreground">Allow On-Screen Notifications?</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xl font-medium">
                  We recommend enabling notifications to receive updates (like new orders, messages, or alerts) even when you are not actively looking at the website.
                </p>
              </div>
            </div>
            <button
                onClick={async () => {
                  await requestPushNotifications();
                  if (typeof Notification !== 'undefined') {
                    setNotificationPermission(Notification.permission);
                  }
                }}
                className="px-8 py-3.5 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-widest active:scale-95 transition-all w-full md:w-auto shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5"
            >
              Allow
            </button>
          </motion.div>
        )}
        
        {/* Blocked Account Alert */}
        {user?.isBlocked && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-destructive border-2 border-white/20 rounded-3xl p-6 mb-8 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-10 h-10" />
              </div>
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-black uppercase tracking-tight">Account Restricted</h2>
                <p className="font-medium opacity-90 mt-1">Your store access has been restricted by administrators. Please contact support to resolve this.</p>
              </div>
            </div>
            <button
               onClick={requestSupport}
               className="px-8 py-3.5 rounded-2xl bg-white dark:bg-[#202020] text-destructive font-black text-xs uppercase tracking-widest active:scale-95 transition-all w-full md:w-auto border border-border"
            >
              Contact Support
            </button>
          </motion.div>
        )}
        {/* AutoPay Alerts */}
        {user?.autoPayFailed && user?.plan === 'none' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 md:p-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-sm font-bold text-destructive">Auto-pay payment failed</h3>
                <p className="text-xs text-destructive/80 font-medium">Please resubscribe to the subscription again to continue your store features.</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/vendor/subscription')}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-destructive text-white text-xs font-bold whitespace-nowrap shrink-0 shadow-sm active:scale-95 transition-all text-center"
            >
              Resubscribe Now
            </button>
          </motion.div>
        )}

        {!user?.autoPay && daysToExpiry !== null && daysToExpiry >= 0 && !hideExpiryBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 md:p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-800 dark:text-amber-500">Subscription expires in {daysToExpiry} {daysToExpiry === 1 ? 'day' : 'days'}</h3>
                <p className="text-xs text-amber-700 dark:text-amber-500/80 font-medium">Auto-renew is disabled. Keep your store online by resubscribing.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => navigate('/vendor/subscription')}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-bold shadow-sm active:scale-95 transition-all"
              >
                Renew Now
              </button>
              <button
                onClick={dismissExpiryBanner}
                className="p-2.5 text-amber-600/60 hover:text-amber-600 hover:bg-amber-100/50 rounded-xl transition-colors absolute top-2 right-2 sm:relative sm:top-0 sm:right-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Plan Status Section */}
        {(user?.plan === 'none' || (daysToExpiry !== null && daysToExpiry < 0)) && !user?.autoPayFailed && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-destructive/10 border-2 border-destructive/20 rounded-[2rem] p-8 mb-8 text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto text-destructive">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-foreground">{t('common.subscription_expired')}</h2>
              <p className="text-muted-foreground max-w-md mx-auto font-medium">
                {t('common.subscription_expired_desc')}
              </p>
            </div>
            <button
              onClick={() => navigate('/vendor/subscription')}
              className="px-8 py-3.5 rounded-2xl bg-destructive text-white font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
            >
              {t('common.get_plan_now')}
            </button>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`bg-white dark:bg-[#202020] rounded-3xl p-6 mb-8 border-l-8 ${user?.plan === 'pro' ? 'border-amber-400' :
            user?.plan === 'growth' ? 'border-blue-500' :
              user?.plan === 'basic' ? 'border-orange-600' : 'border-slate-400'
            } shadow-xl relative overflow-hidden`}
        >
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 p-8 opacity-5">
            {user?.plan === 'pro' ? <Crown className="w-32 h-32" /> :
              user?.plan === 'growth' ? <Zap className="w-32 h-32" /> :
                <Building2 className="w-32 h-32" />}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${user?.plan === 'pro' ? 'bg-amber-100 text-amber-600' :
                user?.plan === 'growth' ? 'bg-blue-100 text-blue-600' :
                  user?.plan === 'basic' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'
                }`}>
                {user?.plan === 'pro' ? <Crown className="w-7 h-7" /> :
                  user?.plan === 'growth' ? <Zap className="w-7 h-7" /> :
                    <Building2 className="w-7 h-7" />}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('vendor_dashboard.active_plan')}</p>
                <h3 className="text-2xl font-black text-foreground capitalize">{user?.plan === 'none' ? t('common.no_active') : user?.plan} {t('common.plan')}</h3>
              </div>
            </div>

            <button
              onClick={() => navigate('/vendor/subscription')}
              className="px-6 py-3 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95"
            >
              {user?.plan === 'pro' ? t('common.manage_subscription') : (user?.plan === 'none' ? t('common.choose_plan') : t('common.upgrade_plan'))}
            </button>
          </div>

          {/* Feature Badges */}
          <div className="flex flex-wrap gap-2 mt-6">
            <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold border border-green-500/20">{t('common.active_storefront')}</span>
            <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold border border-green-500/20">{t('common.pickup_ready')}</span>
            {user?.plan && user.plan !== 'basic' && user.plan !== 'none' && (
              <>
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold border border-blue-500/20">{t('common.featured_badge')}</span>
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold border border-blue-500/20">{t('common.analytics_pro')}</span>
              </>
            )}
            {user?.plan === 'pro' && (
              <>
                <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold border border-amber-500/20">{t('common.sponsored_ranking')}</span>
                <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold border border-amber-500/20">{t('common.pdf_reports')}</span>
              </>
            )}
            {vendorStore?.offersDelivery && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold border border-emerald-500/20 flex items-center gap-1.5 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 " />
                Delivery: ₹{vendorStore?.deliveryFee}
              </span>
            )}
            {user?.plan === 'none' && (
              <span className="px-3 py-1 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold border border-destructive/20 ">{t('common.features_restricted')}</span>
            )}
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white dark:bg-[#202020] rounded-2xl p-4 text-center flex flex-col items-center justify-center gap-2 border border-border/50 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="text-center min-w-0 flex-1">
                <p className="text-lg sm:text-2xl font-black text-foreground">{stat.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-widest line-clamp-1 mt-0.5 px-1">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>


        {/* Marketing & Growth Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" />
              Marketing & Visibility
            </h2>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">Boost your sales</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Analytics Tool */}
            {user?.plan && user.plan !== 'basic' ? (
                <div
                onClick={() => navigate('/vendor/analytics')}
                className="bg-white dark:bg-[#202020] rounded-3xl p-6 text-center border-primary/20 bg-primary/5 cursor-pointer   transition-all group border"
                >
                <BarChart3 className="w-8 h-8 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <p className="text-foreground font-black text-sm">{t('common.view_full_analytics')}</p>
                <p className="text-[10px] text-muted-foreground mt-1 mb-4 line-clamp-1">{t('common.analytics_desc')}</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest">
                    {t('common.open_analytics')} <ArrowRight className="w-3.5 h-3.5" />
                </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-[#202020] rounded-3xl p-6 relative overflow-hidden group border border-orange-500/20">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
                <div className="flex flex-col items-center justify-center text-center relative z-10">
                    <TrendingUp className="w-8 h-8 text-orange-600 mb-3 group-hover:scale-110 transition-transform" />
                    <h3 className="text-sm font-black text-foreground mb-1">{t('common.unlock_growth_analytics')}</h3>
                    <p className="text-[10px] text-muted-foreground mb-4 line-clamp-1">{t('common.unlock_analytics_desc')}</p>
                    <button
                        onClick={() => navigate('/vendor/subscription')}
                        className="bg-orange-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                        {t('common.upgrade_for_price')}
                    </button>
                </div>
                </div>
            )}

            {/* BellBoost Tool */}
            <div 
              onClick={handleBellBoost}
              className="bg-white dark:bg-[#202020] rounded-3xl p-6 text-center border-purple-500/20 bg-purple-500/5 cursor-pointer   transition-all group border flex flex-col items-center justify-center"
            >
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-3">
                <Rocket className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-foreground font-black text-sm">BellBoost Marketing</p>
              <p className="text-[10px] text-muted-foreground mt-1 mb-4 line-clamp-1 truncate">Audience matching engine.</p>
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest">
                  <Rocket className="w-3.5 h-3.5" /> BellBoost
              </div>
            </div>

            {/* Deals Manager */}
            {user?.plan === 'pro' ? (
                <div 
                onClick={() => navigate('/vendor/deals')}
                className="bg-white dark:bg-[#202020] rounded-3xl p-6 text-center border-teal-500/20 bg-teal-500/5 cursor-pointer   transition-all group border flex flex-col items-center justify-center"
                >
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-3">
                    <Zap className="w-5 h-5 text-teal-600" />
                </div>
                <p className="text-foreground font-black text-sm">Deals Manager</p>
                <p className="text-[10px] text-muted-foreground mt-1 mb-4 line-clamp-1">Create limited-time flash sales.</p>
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest">
                    <Zap className="w-3.5 h-3.5" /> Manage Deals
                </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-[#202020] rounded-3xl p-6 relative overflow-hidden group border border-teal-500/20 opacity-70">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent pointer-events-none" />
                <div className="flex flex-col items-center justify-center text-center relative z-10">
                    <Zap className="w-8 h-8 text-teal-600 mb-3 grayscale group-hover:grayscale-0 transition-all" />
                    <h3 className="text-sm font-black text-foreground mb-1">Flash Sale Deals</h3>
                    <p className="text-[10px] text-muted-foreground mb-4">Run real-time countdown deals.</p>
                    <button
                        onClick={() => navigate('/vendor/subscription')}
                        className="bg-teal-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest opacity-80"
                    >
                        PRO FEATURE
                    </button>
                    <Lock className="absolute top-2 right-2 w-4 h-4 text-teal-500/30" />
                </div>
                </div>
            )}
          </div>
        </div>

        {/* Productivity & Operations */}


  {/* Product Requests Section */}
  <div className="mb-10">
    <div className="flex items-center justify-between mb-4 px-1">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <StickyNote className="w-5 h-5 text-primary" />
        Bell Notes & Req
      </h2>
      {(productRequests.length > 0 || recentNotes.length > 0) && (
        <span className="text-[10px] font-black bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-widest">
          {productRequests.filter((r: any) => r.status === 'pending').length + recentNotes.length} Total
        </span>
      )}
    </div>

    <div className="space-y-3">
      {productRequests.length === 0 && recentNotes.length === 0 ? (
        <div 
          onClick={() => navigate('/vendor/notes')}
          className="bg-white dark:bg-[#202020] rounded-3xl p-8 text-center border border-dashed border-border/60 shadow-sm opacity-60 cursor-pointer hover:opacity-100 transition-all hover:bg-primary/5"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Add notes or check customer reqs</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Notes Preview */}
          {recentNotes.map((note: any) => (
            <div 
              key={note.id} 
              onClick={() => navigate('/vendor/notes')}
              className="bg-white dark:bg-[#202020] rounded-22 p-4 border border-primary/5 shadow-sm hover:border-primary/30 transition-all cursor-pointer flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                 <h3 className="font-bold text-foreground text-sm truncate">{note.itemName}</h3>
                 <p className="text-[10px] text-muted-foreground font-medium truncate capitalize">{note.quantity} • {new Date(note.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground/30" />
            </div>
          ))}

          {/* Product Requests Preview */}
          {productRequests.filter((r: any) => r.status === 'pending').slice(0, 3).map((request: any) => (
            <div 
              key={request.id} 
              onClick={() => setSelectedRequest(request)}
              className="bg-white dark:bg-[#202020] rounded-22 p-4 border border-amber-500/10 shadow-sm hover:border-amber-500/30 transition-all cursor-pointer flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0 overflow-hidden border border-amber-500/5">
                {request.image ? (
                  <img src={request.image} alt="Ref" className="w-full h-full object-cover" />
                ) : (
                  <PackageSearch className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                 <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Req</span>
                 </div>
                 <h3 className="font-bold text-foreground text-sm truncate">{request.productName}</h3>
                 <p className="text-[10px] text-muted-foreground font-medium truncate italic">Requested by {request.userName || 'Customer'}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground/30" />
            </div>
          ))}
        </div>
      )}

      <button 
        onClick={() => navigate('/vendor/notes')}
        className="w-full py-4 rounded-2xl bg-secondary/50 text-foreground font-black text-[10px] uppercase tracking-[0.2em] border border-border/40 hover:bg-secondary transition-all active:scale-95"
      >
        Open Bell Notes & Req
      </button>
    </div>

    {/* Quick Request Details Modal */}
    <AnimatePresence>
      {selectedRequest && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setSelectedRequest(null)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white dark:bg-[#1A1A1A] w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5"
            onClick={e => e.stopPropagation()}
          >
            {selectedRequest.image && (
              <div className="aspect-square w-full bg-black relative">
                <img src={selectedRequest.image} alt="Preview" className="w-full h-full object-contain" />
                <button 
                  onClick={() => setSelectedRequest(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            
            <div className="p-8">
              {!selectedRequest.image && (
                <div className="flex justify-between items-start mb-6">
                   <h2 className="text-xl font-black text-foreground">{selectedRequest.productName}</h2>
                   <button onClick={() => setSelectedRequest(null)}><X className="w-6 h-6 text-muted-foreground" /></button>
                </div>
              )}
              
              {selectedRequest.image && <h2 className="text-xl font-black text-foreground mb-4">{selectedRequest.productName}</h2>}
              
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-secondary/50 border border-border/40">
                  <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                    {selectedRequest.description || "No specific details provided."}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Customer</span>
                    <span className="font-bold text-foreground">{selectedRequest.userName || 'Anonymous'}</span>
                  </div>
                  {selectedRequest.userPhone && (
                    <a href={`tel:${selectedRequest.userPhone}`} className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5 hover:scale-105 active:scale-95 transition-all">
                      <Phone className="w-5 h-5" />
                    </a>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                   <button 
                    onClick={() => {
                        navigate('/vendor/notes');
                        setSelectedRequest(null);
                    }}
                    className="flex-1 py-4 rounded-2xl bg-secondary text-foreground font-black text-[10px] uppercase tracking-widest hover:bg-secondary/80 transition-all"
                   >
                     Go to Notes
                   </button>
                   <button 
                    onClick={async () => {
                      const toastId = toast.loading("Marking as fulfilled...");
                      try {
                        await updateDoc(doc(db, 'product_requests', selectedRequest.id), { status: 'fulfilled' });
                        toast.success("Request Fulfilled!", { id: toastId });
                        setSelectedRequest(null);
                      } catch (e) {
                        toast.error("Failed to update", { id: toastId });
                      }
                    }}
                    className="flex-1 py-4 rounded-2xl bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:opacity-90 transition-all active:scale-95"
                   >
                     Fulfilled
                   </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>


        {/* Recent Orders/Bookings - Limited to 3 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">
            {isServiceStore 
              ? `Recent Bookings (${serviceBookings.filter(b => b.status === 'pending' || b.status === 'accepted').length})` 
              : `${t('common.recent_orders')} (${vendorOrders.filter(o => o.status === 'pending' || o.status === 'accepted' || o.status === 'packed').length})`}
          </h2>
          <button
            onClick={() => isServiceStore ? navigate('/vendor/bookings') : navigate('/vendor/orders')}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            {t('common.view_all')} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3 mb-12">
          {(!isServiceStore ? vendorOrders : serviceBookings).length === 0 ? (
            <div className="bg-white dark:bg-[#202020] rounded-2xl p-8 text-center text-muted-foreground border border-border/50">
              {isServiceStore ? 'No bookings yet.' : t('vendor_orders.no_orders')}
            </div>
          ) : (
            (!isServiceStore ? vendorOrders : serviceBookings).slice(0, 3).map(item => (
              <div key={item.id} className="bg-white dark:bg-[#202020] rounded-2xl p-4 flex items-center justify-between hover:bg-secondary dark:hover:bg-[#333333] active:brightness-90 transition-all cursor-pointer" onClick={() => isServiceStore ? navigate('/vendor/bookings') : navigate('/vendor/orders')}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold bg-secondary px-2 py-0.5 rounded text-muted-foreground">{item.id.slice(-6)}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(item.date || item.createdAt || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                  </div>
                  {isServiceStore ? (
                    <p className="font-semibold text-foreground text-sm">{item.serviceName}</p>
                  ) : (
                    <p className="font-semibold text-foreground text-sm">{item.items?.length || 0} {t('common.items')} · ₹{item.total || 0}</p>
                  )}
                  <p className="text-[10px] text-primary font-bold mt-1">
                    {item.userName || item.customerName || t('common.customer')} • {item.userPhone || item.customerPhone || t('common.no_phone')}
                  </p>
                  
                  {item.customerAddress && (
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5" />
                      <span className="truncate max-w-[200px]">Delivery: {item.customerAddress}</span>
                    </p>
                  )}

                  {/* PIN Display for Quick Access */}
                  {item.pickupCode && (
                    <div className="mt-2 flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 border border-amber-200/50 rounded-md w-fit">
                      <KeyRound className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                      <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">PIN: {item.pickupCode}</span>
                    </div>
                  )}

                  {isServiceStore && item.date && item.timeSlot && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Requested: {item.date} {item.timeSlot}
                    </p>
                  )}
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${item.status === 'accepted' ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20' :
                  item.status === 'packed' || item.status === 'completed' ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20' :
                    'bg-secondary text-muted-foreground border-border'
                  }`}>
                  {t(`common.order_status.${item.status}`, { defaultValue: item.status })}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Customer Reviews Section - Limited to 2, with more spacing */}
        <div className="mt-16 mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Recent Reviews
          </h2>
          <button
            onClick={() => navigate('/vendor/reviews')}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-4 mb-16">
          {(() => {
            const hasReviews = (vendorStore?.reviews || []).some((r: any) => r.comment && r.comment.trim() !== '');
            if (!hasReviews) {
              return (
                <div className="bg-white dark:bg-[#202020] rounded-2xl p-8 text-center text-muted-foreground border border-border/50">
                  No reviews with comments yet.
                </div>
              );
            }
            return vendorStore.reviews
              .filter((r: StoreReview) => r.comment && r.comment.trim().length > 0)
              .slice()
              .sort((a: StoreReview, b: StoreReview) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 2)
              .map((review: StoreReview) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-[#202020] rounded-2xl p-5 space-y-4 border border-border/50 shadow-sm active:brightness-95 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-primary/10 flex-shrink-0">
                                                    <img 
                                                        src={getAvatarUrl(userAvatars[review.userId || ''] || review.avatarUrl || review.userId || review.userName)} 
                                                        alt={review.userName} 
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                      <div>
                        <p className="font-bold text-foreground">{review.userName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex text-primary">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'opacity-20'}`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">• {review.date}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {review.comment && (
                    <p className="text-sm text-foreground leading-relaxed pl-[52px]">
                      {review.comment}
                    </p>
                  )}

                  {/* Vendor Reply */}
                  {review.reply ? (
                    <div className="pl-[52px] bg-secondary/30 rounded-xl p-4 border-l-4 border-primary">
                      <div className="flex items-center gap-2 mb-2">
                        <StoreIcon className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold text-primary">Your Reply</span>
                      </div>
                      <p className="text-sm text-foreground">{review.reply}</p>
                    </div>
                  ) : user?.plan && user.plan !== 'basic' && user.plan !== 'none' ? (
                    <div className="pl-[52px] space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reply to this review</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Thank you for your feedback..."
                          value={replyInputs[review.id] || ''}
                          onChange={(e) => setReplyInputs(prev => ({
                            ...prev,
                            [review.id]: e.target.value
                          }))}
                          className="flex-1 bg-secondary/50 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border-0 focus:ring-1 focus:ring-primary/30"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleReplySubmit(review.id);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleReplySubmit(review.id)}
                          className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pl-[52px]">
                      <button
                        onClick={() => navigate('/vendor/subscription')}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors bg-secondary/30 px-4 py-2 rounded-xl"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        Upgrade to Growth+ to reply to reviews
                      </button>
                    </div>
                  )}
                </motion.div>
              ));
            })()}
        </div>
        <div className="mt-20 mb-12 border-t border-white/5 pt-12">
          <motion.div 
             whileHover={{ scale: 1.01 }}
             whileTap={{ scale: 0.99 }}
             onClick={() => navigate('/vendor/config')}
             className="relative overflow-hidden group cursor-pointer rounded-[3rem] border border-white/10 hover:border-primary/30 transition-colors duration-500"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#121212] via-[#0A0A0A] to-[#121212]" />
            
            {/* Dark Mode Glow Effects */}
            <div className="absolute top-0 left-0 w-full h-full bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 shadow-[inset_0_0_100px_rgba(255,184,0,0.05)]" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[100px] group-hover:bg-primary/20 transition-all duration-700" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/5 rounded-full blur-[100px] opacity-20 group-hover:opacity-40 transition-all duration-700" />
            
            <div className="relative z-10 p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
               <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8 text-center md:text-left">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[1.75rem] sm:rounded-[2rem] bg-primary/10 backdrop-blur-3xl flex items-center justify-center text-primary border border-primary/20 shadow-inner group-hover:rotate-6 transition-transform duration-500">
                     <Settings className="w-8 h-8 sm:w-10 sm:h-10 drop-shadow-[0_0_15px_rgba(255,184,0,0.4)]" />
                  </div>
                  <div className="space-y-2">
                     <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">Store Config</h2>
                     <p className="text-white/40 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] leading-relaxed">Identity • Hours • Location • Identity</p>
                  </div>
               </div>
               
               <div className="w-full md:w-auto px-8 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-3 group-hover:gap-5 transition-all">
                  Configure Console <ArrowRight className="w-4 h-4" />
               </div>
            </div>
          </motion.div>
        </div>

        {/* Support Request Modal */}
        <AnimatePresence>
          {showSupportModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowSupportModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-background rounded-3xl max-w-md w-full p-6 shadow-2xl border border-border"
              >
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner mb-2">
                    <Mail className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-foreground">Contact Support</h2>
                    <p className="text-sm text-muted-foreground font-medium max-w-xs mx-auto leading-relaxed">
                      For assistance, please email our support team directly. We typically reply within 24 hours.
                    </p>
                  </div>

                  <div className="w-full bg-secondary/50 p-6 rounded-2xl border border-border/50 transition-all hover:bg-secondary/80 group cursor-pointer" onClick={() => window.location.href = "mailto:contact@bellbasket.com"}>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Official Channel</p>
                    <a href="mailto:contact@bellbasket.com" className="text-xl font-black text-primary group-hover:underline break-all">
                      contact@bellbasket.com
                    </a>
                  </div>

                  <button
                    onClick={() => setShowSupportModal(false)}
                    className="w-full py-4 text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-widest transition-colors"
                  >
                    Close Window
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

          </div>
        </PullToRefresh>
      </div>
  );
};

export default VendorDashboard;
 





