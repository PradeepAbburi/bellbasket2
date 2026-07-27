import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, CartItem, Order, Store, Product, PlanTier, ServiceBooking, ProductRequest } from '@/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getDocs, setDoc, updateDoc, collection, onSnapshot, query, where, addDoc, or } from 'firebase/firestore';
import { sendInAppNotification, playBellSound } from '@/utils/notifications';
import { orderBy, limit } from 'firebase/firestore';
import { toast } from 'sonner';
import i18n, { loadLanguage } from '@/i18n';


import { cleanObject } from '@/utils/firebase';
import { initAudio } from '@/utils/notifications';

interface AppState {
  user: User | null;
  cart: CartItem[];
  orders: Order[];
  serviceBookings: ServiceBooking[];
  stores: Store[];
  allProducts: Product[];
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  addToCart: (item: CartItem, force?: boolean) => boolean;
  removeFromCart: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  placeOrder: (paymentMethod: 'online' | 'pickup' | 'delivery', options?: { deliveryMethod: 'pickup' | 'delivery', deliveryFee: number, customerName?: string, customerPhone?: string, customerAddress?: string }) => Promise<string | null>;
  updatePlan: (plan: PlanTier, months?: number, autoPay?: boolean, planId?: string) => Promise<void>;
  notifications: any[];
  installPrompt: any;
  installPWA: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshStores: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  refreshData: () => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  requestPushNotifications: () => Promise<void>;
  productRequests: ProductRequest[];
  requestProduct: (data: any) => Promise<void>;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  cartSubtotal: number;
  toggleSaveStore: (storeId: string) => Promise<void>;
  isStoreSaved: (storeId: string) => boolean;
  isAnyModalOpen: boolean;
  setIsAnyModalOpen: (isOpen: boolean) => void;
  cartConflictItem: CartItem | null;
  setCartConflictItem: (item: CartItem | null) => void;
  activeMode: 'product' | 'service';
  setActiveMode: (mode: 'product' | 'service') => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [serviceBookings, setServiceBookings] = useState<ServiceBooking[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productRequests, setProductRequests] = useState<ProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);
  const [cartConflictItem, setCartConflictItem] = useState<CartItem | null>(null);
  const [activeMode, setActiveModeState] = useState<'product' | 'service'>(
    () => (localStorage.getItem('active_mode') as 'product' | 'service') || 'product'
  );

  const setActiveMode = (mode: 'product' | 'service') => {
    setActiveModeState(mode);
    localStorage.setItem('active_mode', mode);
  };

  // Theme auto-lock to dark
  useEffect(() => {
    setTheme('dark');
    document.documentElement.classList.add('dark');
    localStorage.setItem('bellbasket_theme', 'dark');
  }, []);



  const toggleTheme = () => {
    // Theme is locked to dark
    setTheme('dark');
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (user?.language) {
      loadLanguage(user.language).then(() => {
        i18n.changeLanguage(user.language);
      });
    }
  }, [user?.language, i18n]);
  const [notifications, setNotifications] = useState<any[]>([{ id: 'welcome', title: 'Welcome to BellBasket!', body: 'Stay tuned for updates on your orders.', time: new Date().toISOString() }]);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const prevOrderCount = React.useRef(0);
  const prevOrdersMap = React.useRef<Record<string, string>>({});
  const sessionId = React.useRef(Math.random().toString(36).substring(7));

  // Load cart from local storage on mount and sync across tabs
  useEffect(() => {
    const savedCart = localStorage.getItem('bellbasket_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse saved cart", e);
      }
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'bellbasket_cart') {
        try {
          setCart(e.newValue && e.newValue !== '[]' ? JSON.parse(e.newValue) : []);
        } catch (err) {
          setCart([]);
        }
      }
      if (e.key === 'bellbasket_cart_clear_signal') {
        setCart([]);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Real-time Service Bookings Sync
  useEffect(() => {
    if (!user) {
      setServiceBookings([]);
      return;
    }

    const q = query(
      collection(db, 'serviceBookings'),
      or(
        where('vendorId', '==', user.id),
        where('userId', '==', user.id)
      )
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedBookings = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ServiceBooking))
        .filter(b => {
          if (user.role === 'vendor' && b.deletedByVendor) return false;
          if (user.role === 'customer' && b.deletedByUser) return false;
          return true;
        });
      
      fetchedBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setServiceBookings(fetchedBookings);
    }, (error) => {
      console.error("Service Bookings sync error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Real-time Product Requests Sync
  useEffect(() => {
    if (!user) {
      setProductRequests([]);
      return;
    }

    const q = query(
      collection(db, 'product_requests'),
      or(
        where('storeId', '==', user.id),
        where('userId', '==', user.id)
      )
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ProductRequest))
        .filter(r => {
          if (user.role === 'vendor' && r.deletedByVendor) return false;
          if (user.role === 'customer' && r.deletedByUser) return false;
          return true;
        });
      setProductRequests(fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }, (error) => {
      console.error("Product Requests sync error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Save cart to local storage with safe serialization & QuotaExceededError protection
  useEffect(() => {
    if (cart.length > 0) {
      try {
        const cleanCart = cart.map(item => {
          const p = item.product;
          const isBase64Img = (img?: string) => img && (img.startsWith('data:') || img.length > 500);
          return {
            ...item,
            product: {
              ...p,
              image: isBase64Img(p.image) ? '' : p.image,
              image2: isBase64Img(p.image2) ? '' : p.image2,
              comboItemsData: undefined // Do not persist heavy nested combo products in storage
            }
          };
        });
        localStorage.setItem('bellbasket_cart', JSON.stringify(cleanCart));
      } catch (e) {
        console.warn("⚠️ [AppContext] localStorage quota exceeded while saving cart. Using fallback minimal serializer.", e);
        try {
          // Minimal fallback serializer if localStorage is low on space
          const minimalCart = cart.map(item => ({
            product: {
              id: item.product.id,
              name: item.product.name,
              price: item.product.price,
              discountedPrice: item.product.discountedPrice,
              category: item.product.category || '',
              description: '',
              inStock: item.product.inStock ?? true,
              vendorId: item.product.vendorId || item.storeId,
              storeName: item.product.storeName || item.storeName
            },
            selectedVariant: item.selectedVariant ? {
              id: item.selectedVariant.id,
              quantity: item.selectedVariant.quantity,
              price: item.selectedVariant.price,
              discountedPrice: item.selectedVariant.discountedPrice
            } : undefined,
            storeId: item.storeId,
            storeName: item.storeName,
            storePhone: item.storePhone,
            quantity: item.quantity
          }));
          localStorage.setItem('bellbasket_cart', JSON.stringify(minimalCart));
        } catch (fallbackError) {
          console.error("❌ [AppContext] Storage failed completely:", fallbackError);
        }
      }
    } else {
      try {
        localStorage.removeItem('bellbasket_cart');
      } catch (e) {}
    }
  }, [cart]);

  // Listen for Native Bridge (Median/GoNative) Push Tokens
  // OneSignal Web SDK & Native Bridge Sync
  useEffect(() => {
    if (!user?.id) return;

    const syncTokenToFirebase = async (token: string, type: 'native_app' | 'web_push') => {
      try {
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();

        let tokens = userData?.fcmTokens || [];
        if (!tokens.includes(token)) {
          tokens.push(token);
        }
        if (tokens.length > 5) tokens = tokens.slice(-5);

        await setDoc(userRef, {
          fcmToken: token, // Stores the most recent OneSignal ID
          fcmTokens: tokens,
          deviceType: type,
          lastTokenRefresh: new Date().toISOString()
        }, { merge: true });
        console.log(`✅ [OneSignal] ${type} ID synced to cloud profile`);
      } catch (err) {
        console.error("❌ Failed to sync token:", err);
      }
    };

    // 1. OneSignal Web (Browser/PWA) Initialization
    const initWebOneSignal = async () => {
      // Robust loading check: Wait up to 5 seconds for OneSignal SDK to be available on window
      let OneSignal = (window as any).OneSignal;
      if (!OneSignal) {
        let attempts = 0;
        while (!OneSignal && attempts < 20) {
          await new Promise(resolve => setTimeout(resolve, 250));
          OneSignal = (window as any).OneSignal;
          attempts++;
        }
      }
      if (!OneSignal) {
        console.warn("⚠️ [OneSignal] SDK script not loaded in time.");
        return;
      }

      // Singleton check to prevent multiple initializations
      if ((window as any)._oneSignalInitialized) {
        // Even if inited, we should ensure identity is linked if user changed
        if (OneSignal.login && user?.id && OneSignal.User?.externalId !== user.id) {
           if (!(window as any)._oneSignalLoggingIn) {
             (window as any)._oneSignalLoggingIn = true;
             try { 
               await OneSignal.login(user.id); 
               console.log("✅ [OneSignal] Context-triggered login success");
             } catch(e) {
               console.warn("⚠️ [OneSignal] Identity conflict or sync error:", e);
             } finally {
               (window as any)._oneSignalLoggingIn = false;
             }
           }
        }
        return;
      }
      
      const OS_APP_ID = (import.meta.env.VITE_ONESIGNAL_APP_ID || "317c3713-88c6-4173-b31d-469ced947d19").trim();
      
      try {
        await OneSignal.init({
          appId: OS_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: { enable: false },
          serviceWorkerParam: { scope: "/" },
          serviceWorkerPath: "OneSignalSDKWorker.js"
        });

        (window as any)._oneSignalInitialized = true;

        // 🆔 Identity Linking: Sync UID as an External ID
        if (OneSignal.login && user?.id) {
          try {
            // Check if identity is already linked to avoid 409 Conflict error
            const currentExternalId = OneSignal.User?.externalId;
            if (currentExternalId !== user.id && !(window as any)._oneSignalLoggingIn) {
              (window as any)._oneSignalLoggingIn = true;
              await OneSignal.login(user.id);
              (window as any)._oneSignalLoggingIn = false;
              console.log("✅ [OneSignal] Initial login success");
            }
          } catch (loginErr: any) {
            (window as any)._oneSignalLoggingIn = false;
            console.warn("⚠️ [OneSignal] Initial login conflict:", loginErr);
          }
        }

        // Listen for subscription changes
        OneSignal.User.PushSubscription.addEventListener("change", (e: any) => {
           if (e.current?.id) {
              syncTokenToFirebase(e.current.id, 'web_push');
           }
        });

        // Check if already subscribed
        const subId = OneSignal.User.PushSubscription?.id;
        if (subId) {
          syncTokenToFirebase(subId, 'web_push');
        }
      } catch (e) {}
    };

    // 2. Native Bridge Setup (Median/GoNative)
    const handleNativeToken = async (tokenData: any) => {
      console.log("📱 [Native Bridge] Token Data Received:", tokenData);
      
      const token = typeof tokenData === 'string' ? tokenData : (
        tokenData?.oneSignalUserId || 
        tokenData?.registrationId || 
        tokenData?.pushToken || 
        tokenData?.userId || 
        tokenData?.id
      );

      if (token) {
        syncTokenToFirebase(token, 'native_app');
        toast.success("Push Notifications Connected!");
      }
    };

    // Register global callbacks for the native bridges
    (window as any).median_onesignal_push_token = handleNativeToken;
    (window as any).gonative_onesignal_push_token = handleNativeToken;
    (window as any).median_onesignal_info = handleNativeToken;
    (window as any).gonative_onesignal_info = handleNativeToken;
    
    // Fallback Polling for Native Bridge (Median/GoNative)
    let pollCount = 0;
    const pollForToken = setInterval(() => {
      const isNative = (window as any).median || (window as any).gonative || (window as any).webkit?.messageHandlers;
      if (isNative) {
        // Median OneSignal Commands
        if ((window as any).median?.oneSignal?.info) (window as any).median.oneSignal.info();
        else if ((window as any).median?.oneSignal?.getUserId) (window as any).median.oneSignal.getUserId();
        
        // GoNative OneSignal Commands
        if ((window as any).gonative?.oneSignal?.id) (window as any).gonative.oneSignal.id();
        else if ((window as any).gonative?.oneSignal?.info) (window as any).gonative.oneSignal.info();

        // OneSignal Web SDK check if running in a WebView that supports it
        const OneSignal = (window as any).OneSignal;
        if (OneSignal?.User?.PushSubscription?.id) {
           syncTokenToFirebase(OneSignal.User.PushSubscription.id, 'web_push');
        }
      }
      
      // Stop aggressive polling after 2 minutes, slow down to every 60s
      pollCount++;
      if (pollCount > 12) { // 12 * 10s = 120s
        clearInterval(pollForToken);
        setInterval(() => {
          if ((window as any).median?.oneSignal?.info) (window as any).median.oneSignal.info();
          else if ((window as any).gonative?.oneSignal?.id) (window as any).gonative.oneSignal.id();
        }, 60000);
      }
    }, 10000); // 10s intervals initially

    initWebOneSignal();

    // 3. Global Audio Unlocker
    const unlockAudio = () => {
      initAudio();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      clearInterval(pollForToken);
      delete (window as any).median_onesignal_push_token;
      delete (window as any).gonative_onesignal_push_token;
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, [user?.id]);

  const fetchUserData = async (firebaseUser: any) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const data = userDoc.data();

      const mergedUser = {
        ...data,
        id: firebaseUser.uid,
        name: data.name || firebaseUser.displayName || 'User',
        email: data.email || firebaseUser.email || '',
        phone: data.phone || '',
        role: data.role || 'customer',
        hasSetupStore: data.hasSetupStore || false,
        isVerified: data.isVerified || firebaseUser.emailVerified || false,
        language: data.language || 'English',
        hasCompletedOnboarding: data.hasCompletedOnboarding !== undefined ? data.hasCompletedOnboarding : true,
      } as User;

      setUser(mergedUser);
      return mergedUser;
    } else {
      const guestUser = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'Guest',
        email: firebaseUser.email || '',
        role: 'customer' as const,
        isVerified: firebaseUser.emailVerified || false,
      };
      setUser(guestUser);
      return guestUser;
    }
  };

  // Sync with Firebase Auth and User Document
  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;

    const handleAuthState = async (firebaseUser: any) => {
      setLoading(true);

      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }

      try {
        if (firebaseUser) {
          // Set up real-time listener for the user record
          const userRef = doc(db, 'users', firebaseUser.uid);
          unsubUserDoc = onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              const mergedUser = {
                ...data,
                id: firebaseUser.uid,
                name: data.name || firebaseUser.displayName || 'User',
                email: data.email || firebaseUser.email || '',
                phone: data.phone || '',
                role: data.role || 'customer',
                hasSetupStore: data.hasSetupStore || false,
                isVerified: data.isVerified || firebaseUser.emailVerified || false,
                language: data.language || 'English',
                hasCompletedOnboarding: data.hasCompletedOnboarding !== undefined ? data.hasCompletedOnboarding : true,
              } as User;
              setUser(mergedUser);
              setLoading(false);
            } else {
              // Handle new user or guest
              const guestUser = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || 'Guest',
                email: firebaseUser.email || '',
                role: 'customer' as const,
                isVerified: firebaseUser.emailVerified || false,
              };
              setUser(guestUser);
              setLoading(false);
            }
          }, (err) => {
            if (err.code !== 'permission-denied' && err.code !== 'unauthenticated') {
              console.error("User doc sync error:", err);
            }
            setLoading(false);
          });
        } else if (localStorage.getItem('bellbasket_admin') === 'true') {
          setUser({
            id: 'admin_master',
            name: 'System Admin',
            email: 'ceo@bellbasket.com',
            role: 'admin',
            isVerified: true
          } as User);
          setLoading(false);
        } else if (localStorage.getItem('bellbasket_hr') === 'true') {
          setUser({
            id: 'hr_master',
            name: 'HR Manager',
            email: 'hr@bellbasket.com',
            role: 'hr',
            isVerified: true
          } as User);
          setLoading(false);
        } else {
          setUser(null);
          setLoading(false);
        }
      } catch (error) {
        console.error("Auth sync error:", error);
        setUser(null);
        setLoading(false);
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, handleAuthState);

    // Synchronize across multiple tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'bellbasket_admin' || e.key === 'bellbasket_hr' || e.key === 'bellbasket_user_sync') {
        // Force re-check auth state if admin/hr flags or user sync key changes
        handleAuthState(auth.currentUser);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Ensure state is fresh when tab becomes active
        handleAuthState(auth.currentUser);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubscribeAuth();
      if (unsubUserDoc) unsubUserDoc();
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // PWA Install Prompt Listener
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Stash the event so it can be triggered later.
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);



  const installPWA = async () => {
    if (!installPrompt) {
      toast.info("Installation Ready", {
        description: "BellBasket is already installed or your browser handles installation automatically."
      });
      return;
    }

    // Show the install prompt
    installPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await installPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, so clear it
    setInstallPrompt(null);
  };


  const seenNotificationIds = React.useRef(new Set<string>());

  // Listen for in-app notifications from Firestore
  useEffect(() => {
    if (!user?.id) return;

    seenNotificationIds.current.clear();
    let isInitialLoadWindow = true;
    const initialLoadTimer = setTimeout(() => {
      isInitialLoadWindow = false;
    }, 1500); // 1.5s window to prevent sounds on page load

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.id),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications: any[] = [];
      let hasNewUnread = false;
      let hasPriorityAlert = false;

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const data = change.doc.data();
          const docId = change.doc.id;

          // Unique key for tracking if we've shown this specific content to the user already
          const alertKey = `${docId}_${data.title}_${data.body}`;

          // Check if it's "fresh" (created in last 30s or has no timestamp yet)
          let isFresh = !data.createdAt;
          if (data.createdAt) {
            try {
              const ts = data.createdAt.toDate?.()?.getTime() || 0;
              isFresh = (Date.now() - ts) < 30000;
            } catch (e) { isFresh = true; }
          }

          if (isInitialLoadWindow && !isFresh) {
            seenNotificationIds.current.add(alertKey);
          } else {
            if (!seenNotificationIds.current.has(alertKey)) {
              if (!data.read) {
                seenNotificationIds.current.add(alertKey);
                hasNewUnread = true;
                
                // Track if this is a high-priority sound trigger (Bookings or Service Vendors)
                const isServiceStore = user?.role === 'vendor' && stores?.find(s => s.vendorId === user.id)?.storeType === 'service';
                if (data.type === 'booking' || isServiceStore) {
                  hasPriorityAlert = true;
                }

                // Check localStorage to ensure we only toast/alert once per browser/session
                const localShownKey = `shown_alert_${docId}`;
                const alreadyShownLocally = localStorage.getItem(localShownKey) === 'true';

                if (!alreadyShownLocally) {
                  localStorage.setItem(localShownKey, 'true');

                  toast(data.title, {
                    description: data.body,
                    action: data.url ? {
                      label: 'View',
                      onClick: () => window.location.href = data.url
                    } : undefined
                  });

                  // Show browser/system banner if permission is granted
                  if ("Notification" in window && Notification.permission === 'granted') {
                    const notification = new Notification(data.title, {
                      body: data.body,
                      icon: '/logo.png', // Fallback to logo if available
                      badge: '/logo.png',
                      tag: docId, // Prevent duplicate banners for same ID (overwrites with latest status)
                    });
                    notification.onclick = () => {
                      window.focus();
                      if (data.url) window.location.href = data.url;
                      notification.close();
                    };
                  }
                }
              }
            }
          }
        }
      });

      snapshot.forEach(doc => {
        newNotifications.push({ id: doc.id, ...doc.data() });
      });

      setNotifications(newNotifications);

      // 🔔 Sound Logic
      if (hasNewUnread) {
        // Play sound for new notifications
        // Orders and Bookings are always considered priority for sound
        const isPriorityEvent = newNotifications.some(n =>
          !n.read && (n.type === 'order' || n.type === 'booking' || (user?.role === 'vendor' && stores?.find(s => s.vendorId === user.id)?.storeType === 'service'))
        );

        console.log(`🔔 [AppContext] Triggering bell (Priority: ${isPriorityEvent})`);
        playBellSound(isPriorityEvent);
      }
    }, (err) => {
      if (err.code !== 'permission-denied' && err.code !== 'unauthenticated') {
        console.error("Notifications listener failed:", err);
      }
    });

    return () => {
      clearTimeout(initialLoadTimer);
      unsubscribe();
    };
  }, [user?.id]);



  // Load stores on mount
  useEffect(() => {
    refreshStores();
  }, []);


  const markAllNotificationsRead = async () => {
    if (!user?.id) return;
    const unread = notifications.filter(n => !n.read && n.id !== 'welcome');
    if (unread.length === 0) return;

    try {
      const promises = unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true }));
      await Promise.all(promises);
    } catch (e) {
      console.error("Error marking notifications as read", e);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    if (id === 'welcome') return;
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (e) {
      console.error("Error marking notification as read", e);
    }
  };

  const refreshUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      await fetchUserData(auth.currentUser);
    }
  };

  const refreshOrders = async () => {
    if (!user || typeof user.id !== 'string') return;
    try {
      const uid = user.id;
      const qCustomer = query(collection(db, 'orders'), where('userId', '==', uid));
      const qVendor = query(collection(db, 'orders'), where('storeId', '==', uid));
      
      const [snap1, snap2] = await Promise.all([getDocs(qCustomer), getDocs(qVendor)]);
      
      const combined = new Map<string, Order>();
      snap1.forEach(doc => combined.set(doc.id, { id: doc.id, ...doc.data() } as Order));
      snap2.forEach(doc => combined.set(doc.id, { id: doc.id, ...doc.data() } as Order));
      
      const firestoreOrders = Array.from(combined.values());
      setOrders(firestoreOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (e) { console.error("Order sync error", e); }
  };

  const refreshStores = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'stores'));
      setStores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Store[]);
    } catch (e) { console.error("Store sync error", e); }
  };

  const refreshProducts = async () => {
    // Optimization: Stop fetching ALL products globally. 
    // Products should be fetched per-store or via specifically targeted search queries.
    console.log("🚀 [AppContext] Global product fetch skipped for performance.");
  };

  const refreshData = async () => {
    await Promise.all([refreshOrders(), refreshStores(), refreshProducts()]);
  };

  // Unified Real-time Order Sync - Split into two for maximum reliability
  useEffect(() => {
    if (!user || typeof user.id !== 'string') {
      setOrders([]);
      return;
    }

    const uid = user.id;
    const orderBuffer = new Map<string, Order>();
    
    const handleSnapshot = (snapshot: any) => {
      snapshot.docChanges().forEach((change: any) => {
        const data = change.doc.data() as Order;
        const isSoftDeleted = (user.role === 'vendor' && data.deletedByVendor) || 
                             (user.role === 'customer' && data.deletedByUser);

        if (!isSoftDeleted && (change.type === 'added' || change.type === 'modified')) {
          // Play sounds for fresh events
          if (!isFirstLoad.current && !snapshot.metadata.hasPendingWrites) {
             if (change.type === 'added' && data.storeId === uid) {
               playBellSound(true); 
             }
             if (change.type === 'modified') {
               const prevStatus = prevOrdersMap.current[data.id];
               if (prevStatus && prevStatus !== data.status) {
                 playBellSound(data.status === 'accepted' || data.status === 'ready' || data.status === 'completed');
                 
                 // Send personal in-app notification for status updates
                 if (user.role === 'customer' && data.userId === user.id) {
                   sendInAppNotification(user.id, {
                        title: `Order ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}!`,
                        body: `Your order from ${data.storeName || 'the store'} is now ${data.status}.`,
                        url: '/receipts',
                        type: 'order',
                        id: data.id
                    });
                 } else if (user.role === 'vendor' && data.storeId === user.id) {
                    sendInAppNotification(user.id, {
                        title: `Order ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}`,
                        body: `Order #${data.id.slice(-5)} status updated to ${data.status}.`,
                        url: '/vendor/orders',
                        type: 'order',
                        id: data.id
                    });
                 }
               }
             }
           }
          prevOrdersMap.current[data.id] = data.status;
          orderBuffer.set(data.id, { ...data, id: change.doc.id });
        } else if (isSoftDeleted || change.type === 'removed') {
          orderBuffer.delete(change.doc.id || data.id);
        }
      });

      const firestoreOrders = Array.from(orderBuffer.values());
      setOrders(firestoreOrders.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      }));
    };

    const isFirstLoad = { current: true };
    const q = query(
      collection(db, 'orders'),
      or(
        where('userId', '==', uid),
        where('storeId', '==', uid)
      )
    );

    const unsubscribe = onSnapshot(q, handleSnapshot, (err) => {
      if (err.code !== 'permission-denied' && err.code !== 'unauthenticated') {
        console.error("Order sync error", err);
      }
    });

    // --- Service Bookings Real-time Notification Logic ---
    const prevBookingsMap = { current: {} as Record<string, string> };
    const qBookings = query(
      collection(db, 'serviceBookings'),
      or(
        where('userId', '==', uid),
        where('vendorId', '==', uid)
      )
    );

    const unsubscribeBookings = onSnapshot(qBookings, (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) return;
      
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data() as ServiceBooking;
        if (change.type === 'modified') {
          const prevStatus = prevBookingsMap.current[change.doc.id];
          if (prevStatus && prevStatus !== data.status) {
            // Priority sound for accepted/completed
            playBellSound(data.status === 'accepted' || data.status === 'completed');

            // Send in-app notification for status updates
            if (user.role === 'customer' && data.userId === user.id) {
               sendInAppNotification(user.id, {
                    title: `Booking ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}!`,
                    body: `Your service booking with ${data.storeName || 'the store'} is now ${data.status}.`,
                    url: '/receipts',
                    type: 'booking',
                    id: change.doc.id
                });
            } else if (user.role === 'vendor' && data.vendorId === user.id) {
                sendInAppNotification(user.id, {
                    title: `Booking Status Update`,
                    body: `Booking for ${data.customerName || 'customer'} is now ${data.status}.`,
                    url: '/vendor/bookings',
                    type: 'booking',
                    id: change.doc.id
                });
            }
          }
        }
        prevBookingsMap.current[change.doc.id] = data.status;
      });
    }, (error) => {
      if (error.code !== 'permission-denied' && error.code !== 'unauthenticated') {
        console.error("Service Bookings Notifications sync error:", error);
      }
    });

    setTimeout(() => { isFirstLoad.current = false; }, 2000);

    return () => {
      unsubscribe();
      unsubscribeBookings();
    };
  }, [user?.id]);

  // Sync Stores (Real-time sync to handle blocks/subscription changes immediately)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'stores'), (snapshot) => {
      const allStores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Store[];
      setStores(allStores);
    }, (err) => {
      console.error("Store sync error", err);
    });

    return () => unsubscribe();
  }, []);

  // Products are now fetched on-demand in specific pages to reduce 14MB+ payload
  useEffect(() => {
    // refreshProducts(); // Removed global fetch
  }, []);

  // Automatic Order Reconciliation: auto-reject pending orders older than 24 hours (1 day)
  useEffect(() => {
    if (!user || orders.length === 0) return;

    const oneDayInMs = 24 * 60 * 60 * 1000;
    const now = Date.now();

    const checkAndAutoRejectOrders = async () => {
      const expiredPendingOrders = orders.filter(o => 
        o.status === 'pending' && 
        o.date && 
        (now - new Date(o.date).getTime() > oneDayInMs)
      );

      if (expiredPendingOrders.length === 0) return;

      console.log(`🕒 [Auto-Reconciliation] Found ${expiredPendingOrders.length} expired pending orders. Auto-rejecting...`);

      for (const order of expiredPendingOrders) {
        try {
          const orderRef = doc(db, 'orders', order.id);
          await updateDoc(orderRef, {
            status: 'rejected',
            rejectionReason: 'Auto-rejected: Store did not accept within 24 hours',
            updatedAt: new Date().toISOString()
          });

          // Trigger in-app notification to the customer about auto-rejection
          await sendInAppNotification(order.userId, {
            title: 'Order Expired & Rejected',
            body: `Your order from ${order.storeName || 'the store'} was auto-rejected because the vendor did not accept it within 24 hours.`,
            url: '/receipts',
            type: 'order',
            id: order.id
          });

          // Trigger in-app notification to the vendor as well
          await sendInAppNotification(order.storeId, {
            title: 'Order Expired & Auto-Rejected',
            body: `Order #${order.id.slice(-5)} has been auto-rejected because it was not accepted within 24 hours.`,
            url: '/vendor/orders',
            type: 'order',
            id: order.id
          });

          console.log(`✅ [Auto-Reconciliation] Auto-rejected order ${order.id}`);
        } catch (error) {
          console.error(`❌ [Auto-Reconciliation] Failed to auto-reject order ${order.id}:`, error);
        }
      }
    };

    // Run reconciliation inside a short delay to prevent initial render block
    const timer = setTimeout(checkAndAutoRejectOrders, 3000);
    return () => clearTimeout(timer);
  }, [orders, user?.id]);

  const login = React.useCallback((userData: User) => {
    setUser(userData);
    localStorage.setItem('bellbasket_user_sync', Date.now().toString());
  }, []);

  const logout = React.useCallback(() => {
    auth.signOut().catch(console.error);
    const OS = (window as any).OneSignal;
    if (OS?.logout) OS.logout();
    setUser(null);
    setCart([]);
    setOrders([]);
    localStorage.removeItem('bellbasket_admin');
    localStorage.removeItem('bellbasket_hr');
    localStorage.setItem('bellbasket_user_sync', Date.now().toString());
    localStorage.removeItem('bellbasket_cart');
    sessionStorage.removeItem('bellbasket_hide_expiry');
  }, []);

  const addToCart = React.useCallback((item: CartItem, force: boolean = false): boolean => {
    if (!force && cart.length > 0 && cart[0].storeId !== item.storeId) {
      setCartConflictItem(item);
      return false;
    }

    setCart(prev => {
      if (force || (prev.length > 0 && prev[0].storeId !== item.storeId)) {
        return [item];
      }
      const existing = prev.find(c => 
        c.product.id === item.product.id && 
        c.selectedVariant?.id === item.selectedVariant?.id
      );
      if (existing) {
        return prev.map(c => 
          (c.product.id === item.product.id && c.selectedVariant?.id === item.selectedVariant?.id)
            ? { ...c, quantity: c.quantity + (item.quantity || 1), product: item.product } 
            : c
        );
      }
      return [...prev, item];
    });
    toast.success(`${item.product.name} added to cart`, { duration: 1500 });
    setCartConflictItem(null);
    return true;
  }, [cart]);

  const removeFromCart = React.useCallback((productId: string, variantId?: string) => {
    setCart(prev => prev.filter(c => !(c.product.id === productId && c.selectedVariant?.id === variantId)));
  }, []);

  const updateQuantity = React.useCallback((productId: string, quantity: number, variantId?: string) => {
    if (quantity <= 0) return removeFromCart(productId, variantId);
    setCart(prev => prev.map(c => (c.product.id === productId && c.selectedVariant?.id === variantId) ? { ...c, quantity } : c));
  }, [removeFromCart]);

  const clearCart = React.useCallback(() => {
    setCart(() => []);
    localStorage.removeItem('bellbasket_cart');
    localStorage.setItem('bellbasket_cart_clear_signal', Date.now().toString());
    window.dispatchEvent(new Event('storage'));
    setTimeout(() => localStorage.removeItem('bellbasket_cart_clear_signal'), 1000);
  }, []);

  const placeOrder = React.useCallback(async (paymentMethod: 'online' | 'pickup' | 'delivery', options?: { deliveryMethod: 'pickup' | 'delivery', deliveryFee: number, customerName?: string, customerPhone?: string, customerAddress?: string }) => {
    if (cart.length === 0 || !user) return null;

    const storesInCart = [...new Set(cart.map(c => c.storeId))];
    
    // VERY IMPORTANT: Clear cart immediately and globally
    clearCart();
    sessionStorage.setItem('last_order_cleared', Date.now().toString());

    let firstOrderId: string | null = null;

    for (const storeId of storesInCart) {
      const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      if (!firstOrderId) firstOrderId = orderId;

      const pickupCode = String(Math.floor(1000 + Math.random() * 9000));
      const storeItems = cart.filter(c => c.storeId === storeId);

      const finalItems = storeItems.map(c => {
        let effectivePrice = (c.product.discountedPrice && Number(c.product.discountedPrice) > 0 && Number(c.product.discountedPrice) < c.product.price) 
          ? Number(c.product.discountedPrice) 
          : c.product.price;

        if (c.selectedVariant) {
          effectivePrice = (c.selectedVariant.discountedPrice && Number(c.selectedVariant.discountedPrice) > 0 && Number(c.selectedVariant.discountedPrice) < c.selectedVariant.price)
            ? Number(c.selectedVariant.discountedPrice)
            : c.selectedVariant.price;
        }

        return {
          ...c,
          product: { ...c.product, price: effectivePrice }
        };
      });

      const subtotal = finalItems.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
      
      // Split delivery fee among stores if there are multiple stores (or keep it per store if simple)
      // For simplicity, we'll apply it to the first store if multiple, or just the store itself
      const fee = (storesInCart.indexOf(storeId) === 0) ? (options?.deliveryFee || 0) : 0;
      let total = subtotal + fee;

      const storeInfo = stores.find(s => s.id === storeId);
      
      const newOrder: Order = {
        id: orderId,
        userId: user.id,
        userName: options?.customerName || user.name || 'Customer',
        userPhone: options?.customerPhone || user.phone || '',
        storeId: storeId,
        storeName: storeItems[0].storeName,
        items: finalItems,
        total,
        status: 'pending',
        paymentMethod,
        deliveryMethod: options?.deliveryMethod || 'pickup',
        deliveryFee: fee,
        date: new Date().toISOString(),
        pickupCode,
        customerAddress: options?.customerAddress || '',
        storePhone: storeInfo?.phone || storeItems[0]?.storePhone || ''
      };

      try {
        await setDoc(doc(db, 'orders', orderId), cleanObject(newOrder));
        
        const itemSummary = storeItems.slice(0, 2).map(c => c.product.name).join(', ');
        sendInAppNotification(storeId, {
          title: `🛒 New Order from ${user.name || 'a customer'}`,
          body: `${itemSummary}${storeItems.length > 2 ? ` +${storeItems.length - 2} more` : ''} — ₹${total}`,
          url: '/vendor/orders',
          type: 'order',
          id: orderId
        });
      } catch (err: any) {
        console.error("Firestore Order Error:", err);
      }
    }

    return firstOrderId;
  }, [user, cart, stores, clearCart]);

  const requestProduct = React.useCallback(async (data: any) => {
    if (!user) {
      toast.error("Please login to request products");
      return;
    }
    try {
      await addDoc(collection(db, 'product_requests'), {
        ...data,
        userId: user.id,
        userName: user.name || 'Customer',
        userPhone: user.phone || '',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      toast.success("Request sent successfully!");
    } catch (e) {
      console.error("Product Request Error:", e);
      toast.error("Failed to send request");
    }
  }, [user]);

  const updatePlan = React.useCallback(async (plan: PlanTier, months: number = 1, autoPay: boolean = false, planId?: string) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.id);
      const updateData: any = { plan, planDuration: months };
      if (planId) updateData.planId = planId;
      if (plan !== 'none') {
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + months);
        updateData.subscriptionExpiry = expiryDate.toISOString();
        updateData.autoPay = autoPay;
      }
      await updateDoc(userRef, cleanObject(updateData));
      await refreshUser();
    } catch (e) { console.error(e); throw e; }
  }, [user, refreshUser]);

  const updateUser = React.useCallback(async (data: Partial<User>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.id), cleanObject(data));
      await refreshUser();
    } catch (e) { console.error(e); throw e; }
  }, [user, refreshUser]);

  const requestPushNotifications = React.useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      // 1. Register Service Worker for PWA & Push
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('[SW] Registration warning:', err);
        });
      }

      // 2. Trigger Median / GoNative native app push registration if available
      const win = window as any;
      if (win.gonative?.onesignal?.register) {
        win.gonative.onesignal.register();
      } else if (win.gonative?.push?.register) {
        win.gonative.push.register();
      } else if (win.median?.onesignal?.register) {
        win.median.onesignal.register();
      } else if (win.median?.push?.register) {
        win.median.push.register();
      }

      // 3. Request native browser notification permission across all browsers
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          toast.success("Notifications Enabled! 🔔", {
            description: "You will receive real-time alerts for orders and updates."
          });
          
          // Trigger a sample welcome notification to confirm native push works
          try {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
              navigator.serviceWorker.ready.then(reg => {
                reg.showNotification('BellBasket Alerts Enabled! 🔔', {
                  body: 'You will now receive instant updates on all order activities.',
                  icon: '/pwa-icon.png',
                  badge: '/pwa-icon.png',
                  tag: 'bellbasket-welcome'
                });
              });
            } else {
              new Notification('BellBasket Alerts Enabled! 🔔', {
                body: 'You will now receive instant updates on all order activities.',
                icon: '/pwa-icon.png',
                tag: 'bellbasket-welcome'
              });
            }
          } catch (notifErr) {
            console.warn("Sample notification error:", notifErr);
          }
        } else if (permission === 'denied') {
          toast.error("Notification Permission Denied", {
            description: "Please click the lock/settings icon next to the browser URL bar to allow notifications for BellBasket."
          });
        }
      } else {
        toast.info("Notifications Not Supported", {
          description: "Your current browser does not support Web Push Notifications."
        });
      }

      // 3. Fallback OneSignal prompt if loaded
      const OS = (window as any).OneSignal;
      if (OS && OS.Slidedown && typeof OS.Slidedown.promptPush === 'function') {
        await OS.Slidedown.promptPush().catch(() => {});
      }
    } catch (e) {
      console.error("Error requesting push notifications:", e);
    }
  }, []);

  // Directly trigger system/browser native notification prompt on app/website entry
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const autoPromptTimer = setTimeout(() => {
      if ('Notification' in window && Notification.permission === 'default') {
        requestPushNotifications().catch(() => {});
      } else {
        // Trigger Median / GoNative native push prompt bridge if running inside native Android app
        const win = window as any;
        if (win.gonative?.onesignal?.register) {
          win.gonative.onesignal.register();
        } else if (win.gonative?.push?.register) {
          win.gonative.push.register();
        } else if (win.median?.onesignal?.register) {
          win.median.onesignal.register();
        } else if (win.median?.push?.register) {
          win.median.push.register();
        }
      }
    }, 1500);

    return () => clearTimeout(autoPromptTimer);
  }, [requestPushNotifications]);

  const isStoreSaved = React.useCallback((storeId: string) => {
    if (!user?.savedStores) return false;
    return user.savedStores.some(s => (typeof s === 'string' ? s === storeId : s.storeId === storeId));
  }, [user?.savedStores]);

  const toggleSaveStore = React.useCallback(async (storeId: string) => {
    if (!user) {
      toast.info("Please login first", {
        description: "You need to be signed in to save stores."
      });
      window.location.href = '/auth';
      return;
    }
    
    const savedStores = user.savedStores || [];
    const isSaved = savedStores.some(s => (typeof s === 'string' ? s === storeId : s.storeId === storeId));
    const newSavedStores = isSaved 
      ? savedStores.filter(s => (typeof s === 'string' ? s !== storeId : s.storeId !== storeId))
      : [{ storeId, savedAt: new Date().toISOString() }, ...savedStores];
      
    try {
      await updateUser({ savedStores: newSavedStores });
      if (!isSaved) {
        toast.success("Store saved to your favorites!");
      } else {
        toast.success("Store removed from favorites");
      }
    } catch (e) {
      console.error("Failed to toggle save store:", e);
      toast.error("Failed to update favorites");
    }
  }, [user, updateUser]);

  React.useEffect(() => {
    const handleFirstInteraction = () => {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        requestPushNotifications();
      }
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [requestPushNotifications]);

  const cartSubtotal = React.useMemo(() => {
    return cart.reduce((s, c) => {
      const itemPrice = c.selectedVariant 
        ? (c.selectedVariant.discountedPrice || c.selectedVariant.price)
        : ((c.product.discountedPrice && Number(c.product.discountedPrice) > 0 && Number(c.product.discountedPrice) < c.product.price) 
          ? Number(c.product.discountedPrice) 
          : c.product.price);
      return s + (itemPrice * c.quantity);
    }, 0);
  }, [cart]);

  const value = React.useMemo(() => ({
    user, cart, orders, serviceBookings, stores, allProducts, loading,
    login, logout, refreshUser, addToCart, removeFromCart, updateQuantity,
    clearCart, placeOrder, updatePlan, notifications, installPrompt,
    installPWA, updateUser, refreshOrders, refreshStores, refreshProducts, refreshData,
    markAllNotificationsRead, markNotificationAsRead, requestPushNotifications,
    productRequests, requestProduct,
    theme, toggleTheme,
    cartSubtotal,
    toggleSaveStore,
    isStoreSaved,
    isAnyModalOpen,
    setIsAnyModalOpen,
    cartConflictItem,
    setCartConflictItem,
    activeMode,
    setActiveMode
  }), [
    user, cart, orders, serviceBookings, stores, allProducts, loading,
    login, logout, refreshUser, addToCart, removeFromCart, updateQuantity,
    clearCart, placeOrder, updatePlan, notifications, installPrompt,
    installPWA, updateUser, refreshOrders, refreshStores, refreshProducts, refreshData,
    markAllNotificationsRead, markNotificationAsRead, requestPushNotifications,
    productRequests, requestProduct,
    theme, toggleTheme,
    cartSubtotal,
    toggleSaveStore,
    isStoreSaved,
    isAnyModalOpen,
    setIsAnyModalOpen,
    cartConflictItem,
    setCartConflictItem,
    activeMode,
    setActiveMode
  ]);


  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp must be used within an AppProvider');
  return context;
};

