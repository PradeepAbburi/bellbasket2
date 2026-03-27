import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, CartItem, Order, Store, Product, PlanTier, ServiceBooking } from '@/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getDocs, setDoc, updateDoc, collection, onSnapshot, query, where, addDoc, or } from 'firebase/firestore';
import { sendInAppNotification, playBellSound } from '@/utils/notifications';
import { orderBy, limit } from 'firebase/firestore';
import { toast } from 'sonner';
import i18n from 'i18next';


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
  addToCart: (item: CartItem) => boolean;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  placeOrder: (paymentMethod: 'online' | 'pickup' | 'delivery', options?: { deliveryMethod: 'pickup' | 'delivery', deliveryFee: number }) => Promise<string | null>;
  updatePlan: (plan: PlanTier, months?: number, autoPay?: boolean) => Promise<void>;
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
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [serviceBookings, setServiceBookings] = useState<ServiceBooking[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('bellbasket_theme');
    if (saved === 'dark' || saved === 'light') return saved as 'light' | 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Listen for system theme changes in real-time IF no manual preference is set
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem('bellbasket_theme');
      if (!saved) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('bellbasket_theme', newTheme);
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
      i18n.changeLanguage(user.language);
    }
  }, [user?.language]);
  const [notifications, setNotifications] = useState<any[]>([{ id: 'welcome', title: 'Welcome to BellBasket!', body: 'Stay tuned for updates on your orders.', time: new Date().toISOString() }]);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const prevOrderCount = React.useRef(0);
  const prevOrdersMap = React.useRef<Record<string, string>>({});
  const sessionId = React.useRef(Math.random().toString(36).substring(7));

  // Load cart from local storage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('bellbasket_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse saved cart", e);
      }
    }
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
    });

    return () => unsubscribe();
  }, [user]);

  // Save cart to local storage
  useEffect(() => {
    localStorage.setItem('bellbasket_cart', JSON.stringify(cart));
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
      const OneSignal = (window as any).OneSignal;
      if (!OneSignal) return;

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

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
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
            console.error("User doc sync error:", err);
            setLoading(false);
          });
        } else if (localStorage.getItem('bellbasket_admin') === 'true') {
          // Fallback for Master Admin/HR if Firebase metadata is unavailable correctly
          // We can't know for sure if it was HR or Admin from just 'true', but Admin is safer for recovery
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
    });

    return () => {
      unsubscribeAuth();
      if (unsubUserDoc) unsubUserDoc();
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
      console.error("Notifications listener failed:", err);
    });

    return () => {
      clearTimeout(initialLoadTimer);
      unsubscribe();
    };
  }, [user?.id]);



  useEffect(() => {
    if (user?.language) {
      i18n.changeLanguage(user.language);
    }
  }, [user?.language]);

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
    try {
      const snapshot = await getDocs(collection(db, 'products'));
      setAllProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[]);
    } catch (e) {
      console.error("Product sync error", e);
    }
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
      console.error("Order sync error", err);
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

  // Sync All Products (Manual fetch to reduce reads)
  useEffect(() => {
    refreshProducts();
  }, []);

  const login = (u: User) => setUser(u);
  const logout = () => {
    auth.signOut().catch(console.error);
    const OS = (window as any).OneSignal;
    if (OS?.logout) OS.logout(); // Clear OneSignal Session Identity
    localStorage.removeItem('bellbasket_admin');
    setUser(null);
    setCart([]);
    setOrders([]);
  };

  const addToCart = (item: CartItem): boolean => {
    if (!user) {
      toast.info("Please login first", {
        description: "You need to be signed in to add items to your cart."
      });
      window.location.href = '/auth';
      return false;
    }

    if (cart.length > 0 && cart[0].storeId !== item.storeId) {
      toast.error("You can only order from one store at a time. Please clear your cart first.");
      return false;
    }

    setCart(prev => {
      const existing = prev.find(c => c.product.id === item.product.id);
      if (existing) {
        return prev.map(c => c.product.id === item.product.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, item];
    });
    return true;
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(c => c.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (!user) {
      toast.info("Please login first");
      window.location.href = '/auth';
      return;
    }
    if (quantity <= 0) return removeFromCart(productId);
    setCart(prev => prev.map(c => c.product.id === productId ? { ...c, quantity } : c));
  };

  const clearCart = () => setCart([]);


  const placeOrder = async (paymentMethod: 'online' | 'pickup' | 'delivery', options?: { deliveryMethod: 'pickup' | 'delivery', deliveryFee: number }) => {
    if (cart.length === 0) return null;

    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const pickupCode = String(Math.floor(1000 + Math.random() * 9000)); // 4-digit PIN

    const subtotal = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
    let total = subtotal;
    if (options?.deliveryMethod === 'delivery') {
      total += options.deliveryFee;
    }

    const newOrder: Order = {
      id: orderId,
      storeId: cart[0].storeId,
      storeName: cart[0].storeName,
      items: [...cart],
      total,
      status: 'pending',
      paymentMethod,
      deliveryMethod: options?.deliveryMethod || 'pickup',
      deliveryFee: options?.deliveryMethod === 'delivery' ? options.deliveryFee : 0,
      date: new Date().toISOString(),
      pickupCode,
      rejectedAt: null, // Explicitly null initially
    };

    const storeInfo = stores.find(s => s.id === cart[0].storeId);

    if (user) {
      const orderToSave = {
        ...newOrder,
        userId: user.id,
        userName: user.name || 'Customer',
        userPhone: user.phone || '',
        storePhone: storeInfo?.phone || cart[0]?.storePhone || ''
      };

      try {
        const cleanedOrder = cleanObject(orderToSave);
        console.log("Saving cleaned order to Firestore:", cleanedOrder);
        await setDoc(doc(db, 'orders', orderId), cleanedOrder);

        // Notify the vendor about the new order
        const itemSummary = cart.slice(0, 2).map(c => c.product.name).join(', ');
        sendInAppNotification(cart[0].storeId, {
          title: `🛒 New Order from ${user.name || 'a customer'}`,
          body: `${itemSummary}${cart.length > 2 ? ` +${cart.length - 2} more` : ''} — ₹${newOrder.total}`,
          url: '/vendor/orders',
          type: 'order',
          id: orderId
        });

        setCart([]);
        return orderId;
      } catch (err: any) {
        console.error("🔥 Firestore Order Error:", err);
        toast.error("Database sync failed", {
          description: `Code: ${err.code || 'unknown'} - ${err.message || 'Check your internet'}`,
          duration: 8000
        });
        return null;
      }
    }

    toast.error("You must be logged in to place an order");
    return null;
  };

    // Check for expired subscription
    // Check for expired subscription (Run once on load or when user changes, but avoid improved loop)
    const hasCheckedExpiry = React.useRef(false);

    useEffect(() => {
      if (user && user.role === 'vendor' && user.plan && user.plan !== 'none' && user.subscriptionExpiry && !hasCheckedExpiry.current) {
        const expiryDate = new Date(user.subscriptionExpiry);
        const now = new Date();

        if (now > expiryDate) {
          console.log("Subscription expired. Downgrading to basic.");
          hasCheckedExpiry.current = true; // Prevent loop

          // Directly update Firestore here to avoid calling updatePlan which might trigger re-renders or be circular if not careful
          // Actually updatePlan handles it, but let's be safe
          const downgrade = async () => {
            try {
              await updatePlan('none');
              toast.info("Your subscription has expired.", { description: "Please renew your plan to continue accessing vendor features." });
            } catch (e) {
              console.error("Auto-downgrade failed", e);
            }
          };
          downgrade();
        }
      }
    }, [user?.id, user?.subscriptionExpiry]);

    const updatePlan = async (plan: PlanTier, months: number = 1, autoPay: boolean = false) => {
      if (!user) return;
      try {
        const userRef = doc(db, 'users', user.id);

        const updateData: any = { plan };

        // Make all plans valid for 30 days
        if (plan !== 'none') {
          const expiryDate = new Date();
          expiryDate.setMonth(expiryDate.getMonth() + months);
          updateData.subscriptionExpiry = expiryDate.toISOString();
          updateData.autoPay = autoPay;
          updateData.autoPayFailed = false; // Reset if they resubscribe
        } else {
          // If downgrading to none, remove expiry
          updateData.subscriptionExpiry = null;
          if (user.autoPay) {
            updateData.autoPay = false;
          }
        }

        await updateDoc(userRef, cleanObject(updateData));
        
        // Also update the store document if it exists to keep plan in sync for visibility filtering
        try {
          const storeRef = doc(db, 'stores', user.id);
          const storeSnap = await getDoc(storeRef);
          if (storeSnap.exists()) {
            await updateDoc(storeRef, { plan });
          }
        } catch (e) {
          console.error("Failed to sync plan to store doc:", e);
        }

        await refreshUser();
      } catch (e) {
        console.error("Update plan error", e);
        throw e;
      }
    };

    const updateUser = async (data: Partial<User>) => {
      if (!user) return;
      try {
        await updateDoc(doc(db, 'users', user.id), cleanObject(data));
        await refreshUser();
      } catch (e) {
        console.error("Update user error", e);
        throw e;
      }
    };

    const requestPushNotifications = async () => {
      // 1. Audio Initialization (Always needed for bell sound)
      initAudio();

      const OneSignal = (window as any).OneSignal;
      if ("Notification" in window) {
        try {
          // Native browser permission first
          const permission = await Notification.requestPermission();
          if (permission === 'granted' && OneSignal) {
             // If OneSignal supports explicit notification trigger, do it silently
             if (OneSignal.Notifications?.requestPermission) {
               await OneSignal.Notifications.requestPermission();
             }
          }
        } catch (e) {}
      }

      // 3. Mobile Native Bridge Check (Median/GoNative OneSignal)
      if ((window as any).median?.notifications) {
        console.log("📱 Requesting Mobile Native Permissions via Median...");
        (window as any).median.notifications.requestPermission();
        toast.info("Requesting device permissions...");
        return;
      }

      // 4. Basic Web Support Check
      if (!("Notification" in window)) {
        toast.error("Push Notifications require the mobile app or a supported browser.", {
          description: "If you are on iOS, please use 'Add to Home Screen' and open from there."
        });
        return;
      }
      
      console.log("🔔 Current Notification Permission:", Notification.permission);

      // 4. Handle Web Permission
      if (Notification.permission === 'denied') {
        toast.error("Notifications are blocked!", {
          description: "Please allow notifications in your browser settings to receive order updates."
        });
        return;
      }

      if (Notification.permission === 'granted') {
          toast.success("Notifications already enabled.");
          return;
      }

      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          toast.success("Browser notifications enabled!");
        } else {
          toast.warning("Notification permission not granted.");
        }
      } catch (error: any) {
        console.error('Error requesting push permission:', error);
      }
    };


  return (
    <AppContext.Provider value={{
      user, cart, orders, serviceBookings, stores, allProducts, loading,
      login, logout, refreshUser, addToCart, removeFromCart, updateQuantity,
      clearCart, placeOrder, updatePlan, notifications, installPrompt,
      installPWA, updateUser, refreshOrders, refreshStores, refreshProducts, refreshData,
      markAllNotificationsRead, markNotificationAsRead, requestPushNotifications,
      theme,
      toggleTheme
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp must be used within an AppProvider');
  return context;
};

