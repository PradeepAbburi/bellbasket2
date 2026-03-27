import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Store as StoreIcon, Power, PowerOff, Package, TrendingUp, ShoppingCart, Crown, Check, Star, MessageSquare, Send, Zap, Building2, BarChart3, Clock, Scissors, Settings, MessageCircle, ArrowRight, Image as ImageIcon, Lock, Save, Mail, XCircle, Share2, Phone, ShoppingBasket, Camera, Upload, MapPin, Search, Navigation, X, KeyRound, ShieldAlert, BellRing } from 'lucide-react';
import { getStoreVisualStatus } from '@/utils/store-status';
import Loader from '@/components/ui/loader-animation';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, onSnapshot, setDoc, addDoc } from 'firebase/firestore';
import QRCodeWithLogo from '@/components/ui/qr-code-with-logo';
import MapView from '@/components/MapView';
import { reverseGeocode } from '@/utils/geo';
import { generateSlug } from '@/utils/seo';
import PullToRefresh from '@/components/ui/PullToRefresh';


import { StoreReview } from '@/types';

const VendorDashboard = () => {
  const { user, loading, orders: allOrders, serviceBookings, stores, updateUser, refreshData } = useApp();
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
  const [vendorStore, setVendorStore] = useState<any>(null);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});

  const [contactEmail, setContactEmail] = useState('');
  const [daysToExpiry, setDaysToExpiry] = useState<number | null>(null);
  const [hideExpiryBanner, setHideExpiryBanner] = useState(false);

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
    return () => window.removeEventListener('focus', checkPermission);
  }, []);

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
    return (
      <Loader fullScreen text={t('common.loading')} />
    );
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
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

  const handleDeleteStore = () => {
    setShowDeleteModal(true);
    setDeleteConfirmText('');
  };

  const executeDeleteStore = async () => {
    if (!user || deleteConfirmText !== 'DELETE MY STORE') return;
    
    setIsDeleting(true);
    const loadingToast = toast.loading('Permenantly deleting your store data...');
    
    try {
      // 1. Delete from stores collection
      await deleteDoc(doc(db, 'stores', user.id));

      // 2. Update user profile flag
      await setDoc(doc(db, 'users', user.id), {
        hasSetupStore: false
      }, { merge: true });

      toast.dismiss(loadingToast);
      toast.success('Store deleted successfully');
      setShowDeleteModal(false);

      // 3. Force navigate to setup
      window.location.href = '/vendor/setup';
    } catch (error) {
      console.error("Delete failed:", error);
      toast.dismiss(loadingToast);
      toast.error('Failed to delete store. Check your database permissions.');
    } finally {
      setIsDeleting(false);
    }
  };

  // STORE SETTINGS (Gated Features)

  const [showSettings, setShowSettings] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportQuery, setSupportQuery] = useState('');
  const [tempTimings, setTempTimings] = useState({ open: '09:00', close: '22:00' });
  const [tempPhone, setTempPhone] = useState('');
  const [tempOffersDelivery, setTempOffersDelivery] = useState(false);

  const [tempDeliveryFee, setTempDeliveryFee] = useState(50);
  const [tempBanner, setTempBanner] = useState('');
  const [tempAutoClose, setTempAutoClose] = useState(false);
  const [tempStoreType, setTempStoreType] = useState<'product' | 'service'>('product');
  const storeFileInputRef = useRef<HTMLInputElement>(null);


  const [tempLat, setTempLat] = useState<number>(0);
  const [tempLng, setTempLng] = useState<number>(0);
  const [tempAddress, setTempAddress] = useState('');

  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<any>(null);

  useEffect(() => {
    if (vendorStore?.timings) setTempTimings(vendorStore.timings);
    if (vendorStore?.phone) setTempPhone(vendorStore.phone);
    if (vendorStore?.offersDelivery !== undefined) setTempOffersDelivery(vendorStore.offersDelivery);
    if (vendorStore?.deliveryFee !== undefined) setTempDeliveryFee(vendorStore.deliveryFee);
    if (vendorStore?.image) setTempBanner(vendorStore.image);
    if (vendorStore?.lat) setTempLat(vendorStore.lat);
    if (vendorStore?.lng) setTempLng(vendorStore.lng);
    if (vendorStore?.address) setTempAddress(vendorStore.address);
    if (vendorStore?.storeType) setTempStoreType(vendorStore.storeType);
    if (vendorStore?.autoClose !== undefined) setTempAutoClose(vendorStore.autoClose);
  }, [vendorStore]);

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 700 * 1024) {
        toast.error("Image too large. Please select an image under 700KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempBanner(reader.result as string);
        toast.success("New banner preview loaded!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLocationSearch = (val: string) => {
    setLocationSearch(val);
    if (val.length < 2) {
      setLocationResults([]);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&lat=${tempLat}&lon=${tempLng}&limit=12`;
        const res = await fetch(photonUrl);
        const data = await res.json();

        const results = data.features.map((f: any) => {
          const p = f.properties;
          const dist = Math.sqrt(Math.pow(f.geometry.coordinates[1] - tempLat, 2) + Math.pow(f.geometry.coordinates[0] - tempLng, 2)) * 111.32;

          let namePart = p.name || p.street || p.district || p.city || '';
          const context = p.district || p.city || p.locality || '';
          if (context && namePart !== context && !namePart.includes(context)) {
            namePart = `${namePart}, ${context}`;
          }

          const addressParts = [];
          if (p.street) addressParts.push(p.street);
          if (p.district) addressParts.push(p.district);
          if (p.city) addressParts.push(p.city);
          if (p.state) addressParts.push(p.state);

          const fullName = [p.name, ...addressParts.filter(part => part !== p.name)].filter(Boolean).join(', ');

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

        const sorted = results.sort((a: any, b: any) => {
          if (a.distanceKm < 5 && b.distanceKm > 5) return -1;
          if (b.distanceKm < 5 && a.distanceKm > 5) return 1;
          return 0;
        });

        setLocationResults(sorted);
      } catch (e) {
        console.error('Search failed', e);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=in&limit=6&addressdetails=1`);
          const data = await res.json();
          setLocationResults(data.map((r: any) => ({ ...r, short_name: r.display_name.split(',')[0] })));
        } catch (fallbackErr) {
          console.error('Fallback search failed', fallbackErr);
        }
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const selectLocation = (res: any) => {
    const lat = typeof res.lat === 'string' ? parseFloat(res.lat) : res.lat;
    const lng = typeof res.lon === 'string' ? parseFloat(res.lon) : res.lon;
    const shortName = res.short_name || res.display_name.split(',')[0];

    setTempLat(lat);
    setTempLng(lng);
    setTempAddress(res.display_name);
    setLocationSearch('');
    setLocationResults([]);
    toast.success('Location set to ' + shortName);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setTempLat(lat);
        setTempLng(lng);
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          .then(res => res.json())
          .then(data => {
            setTempAddress(data.display_name);
            toast.success('Location detected!');
          })
          .catch(() => {
            setTempAddress('Detected Location');
          });
        setDetecting(false);
      },
      () => {
        setDetecting(false);
        toast.error('Could not detect location');
      },
      { timeout: 10000, maximumAge: 0 }
    );
  };
  const saveSettings = async () => {
    if (!user?.id) return;
    const loadingToast = toast.loading('Saving settings...');
    try {
      const area = tempAddress ? tempAddress.split(',')[0] : '';
      const slug = generateSlug(vendorStore?.brandText || vendorStore?.name || 'store', area);

      await updateDoc(doc(db, 'stores', user.id), {
        timings: tempTimings,
        phone: tempPhone,
        offersDelivery: tempOffersDelivery,
        deliveryFee: tempDeliveryFee,
        image: tempBanner,
        lat: tempLat,
        lng: tempLng,
        address: tempAddress,
        storeType: tempStoreType,
        autoClose: tempAutoClose,
        slug
      });

      await updateUser({
        storeBanner: tempBanner,
        lat: tempLat,
        lng: tempLng,
        address: tempAddress
      });

      toast.dismiss(loadingToast);
      toast.success('Settings updated!');
      setShowSettings(false);
    } catch (e) {
      toast.dismiss(loadingToast);
      toast.error('Failed to save settings');
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
              className="bg-white dark:bg-[#202020] w-full max-w-sm rounded-[2.5rem] p-8 relative shadow-2xl border border-white/10"
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
                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-white font-bold text-sm transition-all shadow-md shadow-primary/20"
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-y-5 mb-8 pt-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">{t('common.dashboard')}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={handleShareStore}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-secondary/80 text-foreground text-xs font-bold hover:scale-105 transition-all shadow-sm"
              title="Share Store Link"
            >
              <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Share Store</span>
            </button>
            {user?.plan && user.plan !== 'basic' && (
              <button
                onClick={requestSupport}
                className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
              >
                <MessageCircle className="w-4 h-4" /> Priority Support
              </button>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleShop}
              className={`relative flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold text-sm transition-all shadow-lg overflow-hidden ${isOpen
                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                : 'bg-rose-500 text-white shadow-rose-500/20'
                }`}
            >
              {/* Internal sliding background highlight */}
              <motion.div
                layout
                className="absolute inset-0 bg-white/10"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />

              <AnimatePresence mode="wait">
                <motion.div
                  key={isOpen ? 'open' : 'closed'}
                  initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
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

              {/* Status Pulse Dot */}
              <div className="relative flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute w-2 h-2 rounded-full bg-white"
                />
                <div className={`w-1.5 h-1.5 rounded-full bg-white relative z-10`} />
              </div>
            </motion.button>
            {notificationPermission === 'denied' && (
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-[10px] sm:text-xs font-black uppercase tracking-widest border border-destructive/20 animate-pulse">
                <BellRing className="w-4 h-4" /> Blocked! Please allow in browser settings
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
                className="flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all shadow-sm border border-primary/20"
              >
                <BellRing className="w-4 h-4" /> <span className="hidden xs:inline">Enable Alerts</span>
              </button>
            )}
          </div>
        </div>

        {/* Removed Banner */}
        
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
               className="px-8 py-3.5 rounded-2xl bg-white dark:bg-[#202020] text-destructive font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all w-full md:w-auto border border-border"
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
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-destructive text-white text-xs font-bold whitespace-nowrap shrink-0 shadow-lg shadow-destructive/20 active:scale-95 transition-all text-center"
            >
              Resubscribe Now
            </button>
          </motion.div>
        )}

        {!user?.autoPay && daysToExpiry !== null && daysToExpiry <= 3 && daysToExpiry >= 0 && !hideExpiryBanner && (
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
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
              >
                Renew Now
              </button>
              <button
                onClick={() => setHideExpiryBanner(true)}
                className="p-2.5 text-amber-600/60 hover:text-amber-600 hover:bg-amber-100/50 rounded-xl transition-colors absolute top-2 right-2 sm:relative sm:top-0 sm:right-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Plan Status Section */}
        {user?.plan === 'none' && !user?.autoPayFailed && (
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
              className="px-8 py-3.5 rounded-2xl bg-destructive text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-destructive/20 hover:scale-105 active:scale-95 transition-all"
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
              className="px-6 py-3 rounded-2xl gradient-primary text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/25 hover:scale-105 transition-all active:scale-95"
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
            {user?.plan === 'none' && (
              <span className="px-3 py-1 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold border border-destructive/20 animate-pulse">{t('common.features_restricted')}</span>
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


        {/* Analytics Section - Gated for Growth+ */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              {t('common.advanced_analytics')}
            </h2>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-500/70">{t('common.growth_feature')}</span>
          </div>

          {user?.plan && user.plan !== 'basic' ? (
            <div
              onClick={() => navigate('/vendor/analytics')}
              className="bg-white dark:bg-[#202020] rounded-3xl p-8 text-center border-primary/20 bg-primary/5 cursor-pointer hover:shadow-xl hover:scale-[1.01] active:brightness-90 transition-all group"
            >
              <BarChart3 className="w-10 h-10 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform" />
              <p className="text-foreground font-bold">{t('common.view_full_analytics')}</p>
              <p className="text-xs text-muted-foreground mt-2 mb-4">{t('common.analytics_desc')}</p>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 group-hover:gap-3 transition-all">
                {t('common.open_analytics')} <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#202020] rounded-3xl p-8 relative overflow-hidden group border-orange-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent pointer-events-none" />
              <div className="flex flex-col items-center justify-center text-center relative z-10 py-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{t('common.unlock_growth_analytics')}</h3>
                <p className="text-sm text-muted-foreground max-w-sm mb-6 font-medium">
                  {t('common.unlock_analytics_desc')}
                </p>
                <button
                  onClick={() => navigate('/vendor/subscription')}
                  className="bg-orange-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/20"
                >
                  {t('common.upgrade_for_price')}
                </button>
              </div>
            </div>
          )}
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
                                                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground flex-shrink-0">
                                                    {(review.userName || 'C').charAt(0).toUpperCase()}
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
                          className="gradient-primary text-primary-foreground px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
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
        <div className="mt-20 mb-12 border-t border-border pt-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Settings className="w-5 h-5" />
                </div>
                Store Configuration
              </h2>
              <p className="text-sm text-muted-foreground ml-11">Manage your store's hours, appearance, and marketing.</p>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${showSettings ? 'bg-secondary text-foreground' : 'gradient-primary text-white shadow-lg shadow-primary/25 hover:scale-105'}`}
            >
              {showSettings ? 'Close Panel' : 'Open Controls'}
            </button>
          </div>

          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0, y: -20 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "anticipate" }}
                className="overflow-hidden"
              >
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {/* Timings Card */}
                  <div className={`bg-white dark:bg-[#202020] rounded-3xl p-6 relative overflow-hidden group border transition-all ${user?.plan && user.plan !== 'basic' ? 'border-primary/20 hover:border-primary/40' : 'border-border opacity-80'}`}>
                    {(!user?.plan || user.plan === 'basic') && (
                      <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <div className="bg-background/90 text-foreground px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 border border-border">
                          <Lock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs font-bold uppercase tracking-widest">Growth Feature</span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                          <Clock className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">Click & Collect Hours</h3>
                          <p className="text-xs text-muted-foreground">Set ordering availability</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Opens At</label>
                        <input
                          type="time"
                          value={tempTimings.open}
                          onChange={e => setTempTimings(t => ({ ...t, open: e.target.value }))}
                          className="w-full bg-secondary/50 border border-transparent focus:border-primary/30 focus:bg-background transition-all rounded-xl px-4 py-3 text-sm font-bold outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Closes At</label>
                        <input
                          type="time"
                          value={tempTimings.close}
                          onChange={e => setTempTimings(t => ({ ...t, close: e.target.value }))}
                          className="w-full bg-secondary/50 border border-transparent focus:border-primary/30 focus:bg-background transition-all rounded-xl px-4 py-3 text-sm font-bold outline-none"
                        />
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-border/50">
                      <label className="flex items-center justify-between cursor-pointer group">
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">Automatic Shop Hours</p>
                          <p className="text-[10px] text-muted-foreground font-medium">Auto-manage opening and closing times</p>
                        </div>
                        <div className="relative inline-flex items-center">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={tempAutoClose}
                            onChange={e => setTempAutoClose(e.target.checked)}
                          />
                          <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Business Contact */}
                  <div className="bg-white dark:bg-[#202020] rounded-3xl p-6 relative overflow-hidden transition-all border border-border cursor-pointer active:brightness-95" onClick={() => navigate('/vendor/editor')}>
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                          <Phone className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">Business Contact</h3>
                          <p className="text-xs text-muted-foreground">Displayed on customer receipts</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Store Phone Number</label>
                      <input
                        type="tel"
                        value={tempPhone}
                        onChange={e => setTempPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full bg-secondary border border-transparent focus:border-primary/30 focus:bg-background transition-all rounded-xl px-4 py-3 text-sm font-bold outline-none"
                      />
                    </div>

                    </div>


                  {/* Delivery Options */}
                  <div className="bg-white dark:bg-[#202020] rounded-3xl p-6 relative overflow-hidden transition-all border border-border opacity-100 cursor-pointer active:brightness-95" onClick={() => navigate('/vendor/editor')}>
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-600">
                          <Package className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">Delivery Options</h3>
                          <p className="text-xs text-muted-foreground">Manage local delivery</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tempOffersDelivery}
                          onChange={e => setTempOffersDelivery(e.target.checked)}
                          className="w-5 h-5 rounded-md border-border text-primary focus:ring-primary/30"
                        />
                        <span className="text-sm font-bold text-foreground">Offer Delivery</span>
                      </label>

                      {tempOffersDelivery && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Delivery Fee (₹)</label>
                          <input
                            type="number"
                            value={tempDeliveryFee}
                            onChange={e => setTempDeliveryFee(Number(e.target.value))}
                            className="w-full bg-secondary border border-transparent focus:border-primary/30 focus:bg-background transition-all rounded-xl px-4 py-3 text-sm font-bold outline-none"
                            min="0"
                          />
                        </div>
                      )}
                    </div>
                  </div>


                  {/* Store Editor */}
                  {user?.plan === 'pro' && (
                    <div className="bg-white dark:bg-[#202020] rounded-3xl p-6 relative overflow-hidden group border border-amber-400/30 hover:border-amber-400/50 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-foreground">Visual Store Editor</h3>
                            <p className="text-xs text-muted-foreground">Customize theme & preview as customer</p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <button
                            onClick={() => navigate('/vendor/editor')}
                            className="hidden md:flex px-4 py-2 rounded-xl bg-purple-500 text-white text-xs font-bold uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all items-center gap-2"
                          >
                            Open Editor <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <span className="md:hidden text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                            Available on Desktop
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Store Banner */}
                  <div className="glass rounded-3xl p-6 relative overflow-hidden transition-all border border-border md:col-span-2">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">Store Banner</h3>
                          <p className="text-xs text-muted-foreground">Customize your storefront appearance</p>
                        </div>
                      </div>
                    </div>

                    <div className="relative group">
                      {tempBanner ? (
                        <div className="relative w-full aspect-[21/9] md:aspect-[3/1] rounded-2xl overflow-hidden border-2 border-border/50">
                          <img src={tempBanner} alt="Storefront" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={() => storeFileInputRef.current?.click()}
                              className="px-4 py-2 rounded-xl bg-white text-foreground font-bold text-xs flex items-center gap-2"
                            >
                              <Upload className="w-4 h-4" /> Change Banner
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => storeFileInputRef.current?.click()}
                          className="w-full aspect-[21/9] md:aspect-[3/1] rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center gap-3 group hover:bg-primary/10 transition-all"
                        >
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Upload className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-foreground">Upload Store Banner</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 text-center">PNG, JPG up to 700KB</p>
                          </div>
                        </button>
                      )}
                      <input
                        type="file"
                        ref={storeFileInputRef}
                        onChange={handleBannerUpload}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>
                  {/* Store Location */}
                  <div className="bg-white dark:bg-[#202020] rounded-3xl p-6 relative overflow-hidden transition-all border border-border md:col-span-2">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                          <MapPin className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground">Store Location</h3>
                          <p className="text-xs text-muted-foreground">Update your shop's physical address and map point</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div 
                        onClick={() => {
                          if (tempLat && tempLng) {
                            window.open(`https://www.google.com/maps/search/?api=1&query=${tempLat},${tempLng}`, '_blank');
                          } else if (tempAddress) {
                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tempAddress)}`, '_blank');
                          }
                        }}
                        className="p-4 rounded-2xl bg-secondary/30 border border-border/50 cursor-pointer hover:bg-secondary/50 transition-colors"
                      >
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Current Address</p>
                        <p className="text-sm font-bold text-foreground">{tempAddress || 'No address set'}</p>
                      </div>

                      <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                          type="text"
                          value={locationSearch}
                          onChange={e => handleLocationSearch(e.target.value)}
                          placeholder="Search your shop area..."
                          className="w-full pl-12 pr-12 py-4 rounded-2xl bg-secondary/50 border-0 text-sm font-bold text-foreground outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                        />
                        <button
                          type="button"
                          onClick={detectLocation}
                          disabled={detecting || searching}
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-background flex items-center justify-center text-primary shadow-sm border border-border/50 active:scale-95 transition-all"
                        >
                          {detecting || searching ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Navigation className="w-4 h-4" />}
                        </button>

                        {/* Search Results Dropdown */}
                        <AnimatePresence>
                          {locationResults.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute top-full left-0 right-0 mt-3 bg-background rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-border p-3 z-[1000] max-h-64 overflow-y-auto"
                            >
                              {locationResults.map(res => (
                                <button
                                  key={res.place_id}
                                  onClick={() => selectLocation(res)}
                                  className="w-full flex items-start gap-4 p-4 hover:bg-primary/5 transition-all text-left group border-b border-border last:border-0"
                                >
                                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                    <MapPin className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="font-bold text-sm text-foreground truncate">{res.short_name}</p>
                                      {res.distanceKm !== undefined && (
                                        <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                                          {res.distanceKm < 1 ? '<1 km' : `${Math.round(res.distanceKm)} km`}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-tight">{res.display_name}</p>
                                  </div>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="h-[400px] rounded-2xl overflow-hidden border border-border shadow-inner relative group">
                        <MapView
                          center={[tempLat || 28.6139, tempLng || 77.2090]}
                          centerLabel="Store Location"
                          stores={[]}
                          showSearch={true}
                          onMapClick={async (lat, lng) => {
                            setTempLat(lat);
                            setTempLng(lng);
                            try {
                              const { reverseGeocode } = await import('@/utils/geo');
                              const address = await reverseGeocode(lat, lng);
                              setTempAddress(address);
                              toast.success("Location pinpointed!");
                            } catch (e) {
                              // If internal reverse-geocoder fails, use nominatim
                              fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                                .then(res => res.json())
                                .then(data => {
                                  setTempAddress(data.display_name);
                                  toast.success("Location pinpointed!");
                                }).catch(console.error);
                            }
                          }}
                        />
                        <div className="absolute top-1/2 left-1/2 pointer-events-none flex items-center justify-center z-[400] -translate-x-1/2 -translate-y-1/2">
                          <MapPin className="w-10 h-10 text-primary drop-shadow-lg -mt-5" />
                        </div>
                        <div className="absolute bottom-4 left-4 right-4 z-[401] pointer-events-none">
                          <div className="bg-black/60 backdrop-blur-md text-[10px] text-white px-3 py-2 rounded-xl font-bold text-center">
                            Use the search bar or tap the map to update your location
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={saveSettings}
                    className="px-8 py-4 bg-foreground text-background rounded-2xl font-bold flex items-center gap-3 shadow-2xl hover:scale-105 active:scale-95 transition-all"
                  >
                    <Save className="w-5 h-5" />
                    Save Configuration
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Danger Zone */}
        <div className="mt-12 pt-8 border-t border-destructive/20">
          <div className="glass-strong border-destructive/20 rounded-3xl p-6 bg-destructive/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <h3 className="text-lg font-bold text-destructive">Danger Zone</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Deleting your store will remove your listings and take your shop offline permanently.
              </p>
            </div>
            <button
              onClick={handleDeleteStore}
              className="w-full md:w-auto px-8 py-3.5 rounded-2xl bg-destructive text-destructive-foreground font-black text-xs uppercase tracking-widest hover:bg-destructive/90 transition-all shadow-lg shadow-destructive/20 active:scale-95 whitespace-nowrap"
            >
              Delete My Store
            </button>
          </div>
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

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {showDeleteModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
              onClick={() => !isDeleting && setShowDeleteModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={e => e.stopPropagation()}
                className="bg-background rounded-[2.5rem] max-w-sm w-full p-8 shadow-2xl border border-destructive/20 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-2 bg-destructive" />
                
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="absolute top-6 right-6 p-2 rounded-full hover:bg-secondary/50 text-muted-foreground transition-colors"
                  disabled={isDeleting}
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive shadow-inner mb-2 animate-bounce-gentle">
                    <ShieldAlert className="w-10 h-10" />
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-foreground tracking-tight">Are you absolutely sure?</h2>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                      This will <span className="text-destructive font-bold underline">permanently delete</span> your store, all products, and your brand presence from BellBasket.
                    </p>
                  </div>

                  <div className="w-full space-y-4">
                    <div className="bg-destructive/5 rounded-xl p-4 border border-destructive/10">
                      <p className="text-[10px] font-black uppercase tracking-widest text-destructive mb-3">Type the following to confirm:</p>
                      <p className="text-lg font-black text-destructive select-none mb-4 tracking-widest">DELETE MY STORE</p>
                      <input 
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="Type here..."
                        className="w-full bg-background border-2 border-destructive/10 focus:border-destructive rounded-xl px-4 py-3 text-center text-sm font-bold uppercase tracking-widest outline-none transition-all placeholder:text-muted-foreground/30"
                        disabled={isDeleting}
                        autoFocus
                      />
                    </div>

                    <button
                      onClick={executeDeleteStore}
                      disabled={deleteConfirmText !== 'DELETE MY STORE' || isDeleting}
                      className="w-full py-4 rounded-xl bg-destructive text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-destructive/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isDeleting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Permanently Delete Store"
                      )}
                    </button>
                    
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      disabled={isDeleting}
                      className="w-full py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors"
                    >
                      Wait, Keep My Store
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </PullToRefresh>
    </div>
  );
};

export default VendorDashboard;
 

