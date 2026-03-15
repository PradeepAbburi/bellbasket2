import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { User, CartItem, Order, Store, Product, PlanTier, ServiceBooking } from '@/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getDocs, setDoc, updateDoc, collection, onSnapshot, query, where, addDoc, or } from 'firebase/firestore';
import { sendInAppNotification, playBellSound } from '@/utils/notifications';
import { orderBy, limit } from 'firebase/firestore';
import { toast } from 'sonner';
import i18n from 'i18next';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '@/lib/firebase';


import { cleanObject } from '@/utils/firebase';
import { initAudio } from '@/utils/notifications';

const DELIVERY_ACK_SOURCE = 'web_app';
const NOTIFICATION_DEDUPE_TTL_MS = 45000;
const SEEN_NOTIFICATIONS_STORAGE_KEY = 'bellbasket_seen_notifications';

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
      user.role === 'vendor'
        ? where('vendorId', '==', user.id)
        : where('userId', '==', user.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ServiceBooking[];
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
  useEffect(() => {
    const handleNativeToken = async (tokenData: any) => {
      console.log("📱 Native Bridge Push Token Received:", tokenData);
      // Handle various formats: direct string, Median object, or OneSignal object
      const token = typeof tokenData === 'string' ? tokenData : (tokenData?.oneSignalUserId || tokenData?.registrationId || tokenData?.pushToken);

      if (token && user) {
        try {
          const userRef = doc(db, 'users', user.id);
          const userSnap = await getDoc(userRef);
          const userData = userSnap.data();

          let tokens = userData?.fcmTokens || [];
          if (!tokens.includes(token)) {
            tokens.push(token);
          }
          if (tokens.length > 5) tokens = tokens.slice(-5);

          await updateDoc(userRef, {
            fcmToken: token,
            fcmTokens: tokens,
            deviceType: 'apk_shell',
            lastTokenRefresh: new Date().toISOString()
          });
          console.log("✅ Native Push Token synced to cloud profile (Merged into fcmTokens)");
        } catch (err) {
          console.error("Failed to save native token:", err);
        }
      }
    };

    // Attach to global window scope for Median/GoNative callbacks
    (window as any).median_onesignal_push_token = handleNativeToken;
    (window as any).gonative_onesignal_push_token = handleNativeToken;
    (window as any).median_library_ready = () => {
      console.log("📱 Median Library Ready - Checking Native Permissions");
      if ((window as any).median?.notifications) {
        (window as any).median.notifications.requestPermission();
      }
    };

    // Global Audio Unlocker for Mobile/Modern Browsers
    const unlockAudio = () => {
      console.log("🔊 Interaction detected - Unlocking Audio");
      initAudio();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      delete (window as any).median_onesignal_push_token;
      delete (window as any).gonative_onesignal_push_token;
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, [user?.id, user?.role]);

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
          setUser({
            id: 'admin_master',
            name: 'System Admin',
            email: 'contact.bellbasket1@gmail.com',
            role: 'admin',
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
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(e);
      console.log('PWA Install Prompt captured');
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
  const dedupeEventMap = React.useRef<Map<string, number>>(new Map());

  const rememberSeenNotification = useCallback((notificationId: string) => {
    seenNotificationIds.current.add(notificationId);
    if (typeof window === 'undefined') return;

    try {
      const existing = JSON.parse(sessionStorage.getItem(SEEN_NOTIFICATIONS_STORAGE_KEY) || '[]');
      const merged = Array.from(new Set([...existing, notificationId])).slice(-200);
      sessionStorage.setItem(SEEN_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // no-op
    }
  }, []);

  const shouldSkipDuplicateEvent = useCallback((eventKey?: string) => {
    if (!eventKey) return false;

    const now = Date.now();
    const map = dedupeEventMap.current;

    for (const [key, timestamp] of map.entries()) {
      if ((now - timestamp) > NOTIFICATION_DEDUPE_TTL_MS) {
        map.delete(key);
      }
    }

    if (map.has(eventKey)) {
      return true;
    }

    map.set(eventKey, now);
    return false;
  }, []);

  const presentRealtimeNotification = useCallback((payload: {
    id?: string;
    title?: string;
    body?: string;
    url?: string;
    type?: string;
    source?: 'fcm' | 'firestore';
    forceSound?: boolean;
  }) => {
    const title = payload.title || 'BellBasket Update';
    const body = payload.body || 'You have a new alert.';
    const targetUrl = payload.url || '/vendor/orders';

    toast(title, {
      description: body,
      duration: 10000,
      action: {
        label: 'View',
        onClick: () => {
          window.location.href = targetUrl;
        }
      }
    });

    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(title, {
        body,
        icon: '/pwa-icon.png',
        badge: '/pwa-icon.png',
        tag: payload.id || `notif-${Date.now()}`,
        data: { url: targetUrl }
      });

      browserNotification.onclick = () => {
        window.focus();
        window.location.href = targetUrl;
        browserNotification.close();
      };
    }

    const isServiceStore = user?.role === 'vendor' && stores?.find((store) => store.vendorId === user.id)?.storeType === 'service';
    const isPriority = payload.forceSound || payload.type === 'booking' || payload.type === 'order' || isServiceStore;
    playBellSound(Boolean(isPriority));
  }, [stores, user?.id, user?.role]);

  // Listen for in-app notifications from Firestore
  useEffect(() => {
    if (!user?.id) return;

    seenNotificationIds.current.clear();
    dedupeEventMap.current.clear();

    if (typeof window !== 'undefined') {
      try {
        const cached = JSON.parse(sessionStorage.getItem(SEEN_NOTIFICATIONS_STORAGE_KEY) || '[]');
        if (Array.isArray(cached)) {
          seenNotificationIds.current = new Set(cached);
        }
      } catch {
        seenNotificationIds.current = new Set();
      }
    }

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

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const docId = change.doc.id;

          // Check if it's "fresh" (created in last 30s or has no timestamp yet)
          let isFresh = !data.createdAt;
          if (data.createdAt) {
            try {
              const ts = data.createdAt.toDate?.()?.getTime() || 0;
              isFresh = (Date.now() - ts) < 30000;
            } catch (e) { isFresh = true; }
          }

          if (isInitialLoadWindow && !isFresh) {
            rememberSeenNotification(docId);
          } else {
            if (!seenNotificationIds.current.has(docId)) {
              if (!data.read) {
                rememberSeenNotification(docId);
                const dedupeKey = data.messageId || data.id || data.orderId || docId;

                if (!shouldSkipDuplicateEvent(String(dedupeKey))) {
                  presentRealtimeNotification({
                    id: docId,
                    title: data.title,
                    body: data.body,
                    url: data.url,
                    type: data.type,
                    source: 'firestore',
                  });
                }

                if (!data.deliveredAt) {
                  updateDoc(doc(db, 'notifications', docId), {
                    deliveredAt: new Date().toISOString(),
                    deliveredVia: DELIVERY_ACK_SOURCE,
                  }).catch(() => undefined);
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
    }, (err) => {
      console.error("Notifications listener failed:", err);
    });

    return () => {
      clearTimeout(initialLoadTimer);
      unsubscribe();
    };
  }, [presentRealtimeNotification, rememberSeenNotification, shouldSkipDuplicateEvent, user?.id]);



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
      const readAt = new Date().toISOString();
      const promises = unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true, readAt }));
      await Promise.all(promises);
    } catch (e) {
      console.error("Error marking notifications as read", e);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    if (id === 'welcome') return;
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true, readAt: new Date().toISOString() });
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
      const q = query(
        collection(db, 'orders'),
        or(where('userId', '==', uid), where('storeId', '==', uid))
      );
      const snapshot = await getDocs(q);
      const firestoreOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
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

  // Unified Real-time Order Sync (Efficient: only triggers on changes)
  useEffect(() => {
    if (!user || typeof user.id !== 'string') {
      setOrders([]);
      return;
    }

    const uid = user.id;

    try {
      const q = query(
        collection(db, 'orders'),
        or(
          where('userId', '==', uid),
          where('storeId', '==', uid)
        )
      );

      const isFirstLoad = React.useRef(true);
      const unsubscribe = onSnapshot(q, (snapshot) => {
        // Track meaningful changes for 'Live' feel
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data() as Order;

            // Only play sounds for events that happen AFTER the app is loaded and synced
            if (!isFirstLoad.current && !snapshot.metadata.hasPendingWrites) {
               // 1. If I am the vendor and a NEW order arrived
               if (change.type === 'added' && data.storeId === uid) {
                 console.log("🔔 [AppContext] New Order arrived - playing sound");
                 playBellSound(true);
               }

               // 2. If an order STATUS changed (for anyone)
               if (change.type === 'modified') {
                 const prevStatus = prevOrdersMap.current[data.id];
                 if (prevStatus && prevStatus !== data.status) {
                   console.log(`🔔 [AppContext] Order ${data.id} status updated: ${prevStatus} -> ${data.status}`);
                   // Play sound if I am the customer OR if I am the vendor watching the order flow
                   playBellSound(data.status === 'accepted' || data.status === 'completed');
                 }
               }
            }

            // Always update the status map
            prevOrdersMap.current[data.id] = data.status;
          }
        });

        isFirstLoad.current = false;

        const firestoreOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
        setOrders(firestoreOrders.sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        }));
      }, (err) => {
        console.error("Unified order sync error", err);
        if (err.code === 'permission-denied') {
          toast.error("Order Sync Failed: Permission Denied", {
            description: "Please apply the latest Firestore Rules to enable live updates.",
            duration: 10000
          });
        }
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Unified order sync setup error", err);
    }
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
          id: orderId,
          orderId,
          orderStatus: 'pending',
          storeName: newOrder.storeName,
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

    const syncPushToken = useCallback(async () => {
      if (!messaging || !user) {
        return null;
      }

      const serviceWorkerRegistration = await navigator.serviceWorker.ready;
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration,
      });

      if (!token) {
        return null;
      }

      const userRef = doc(db, 'users', user.id);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      let tokens = Array.isArray(userData?.fcmTokens) ? userData.fcmTokens : [];
      if (!tokens.includes(token)) {
        tokens.push(token);
      }
      if (tokens.length > 5) tokens = tokens.slice(-5);

      await updateDoc(userRef, {
        fcmToken: token,
        fcmTokens: tokens,
        lastTokenRefresh: new Date().toISOString()
      });

      return token;
    }, [user?.id, messaging]);

    useEffect(() => {
      if (!user?.id || !messaging || typeof window === 'undefined') {
        return;
      }

      if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
      }

      let cancelled = false;

      syncPushToken()
        .then((token) => {
          if (!cancelled && token) {
            console.log('🔔 Existing push permission detected. Token synced.');
          }
        })
        .catch((error) => {
          if (!cancelled) {
            console.warn('Push token auto-sync skipped:', error?.message || error);
          }
        });

      return () => {
        cancelled = true;
      };
    }, [user?.id, messaging, syncPushToken]);

    const requestPushNotifications = async () => {
      // 1. Basic Support Check
      if (!("Notification" in window)) {
        toast.error("Push Notifications are not supported by this browser.", {
          description: "If you are on iOS, please use 'Add to Home Screen' first."
        });
        return;
      }

      if (!messaging || !user) {
        toast.error("User not logged in or Firebase not initialized");
        return;
      }

      console.log("🔔 Current Notification Permission:", Notification.permission);

      // 2. Handle 'Denied' state proactively
      if (Notification.permission === 'denied') {
        toast.error("Notifications are blocked!", {
          description: "Please go to your browser/site settings and allow notifications for this site, then try again."
        });
        return;
      }

      initAudio();

      try {
        // 3. Request Permission (if not already granted)
        const permission = Notification.permission === 'granted'
          ? 'granted'
          : await Notification.requestPermission();

        if (permission === 'granted') {
          const toastId = toast.loading("Connecting your device to cloud messaging...");
          const token = await syncPushToken();

          if (token) {
            console.log('✅ FCM Connection Successful');
            toast.success('Push notifications enabled!', { id: toastId });
          } else {
            toast.error("Could not retrieve notification token.", { id: toastId });
          }
        } else {
          toast.warning("Notification permission was not granted.");
        }
      } catch (error: any) {
        console.error('Error requesting push notification permission:', error);
        toast.error("Notification setup failed: " + (error.message || "Unknown error"));
      }
    };

    // Unified foreground push listener
    useEffect(() => {
      if (!messaging) return;

      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Foreground Message:', payload);

        const messageId = payload.messageId || payload.data?.messageId || payload.data?.id || payload.data?.orderId;
        const dedupeKey = messageId ? `fcm:${messageId}` : undefined;
        if (shouldSkipDuplicateEvent(dedupeKey)) {
          return;
        }

        const title = payload.notification?.title || payload.data?.title || 'BellBasket Update';
        const body = payload.notification?.body || payload.data?.body || 'You have a new alert.';
        const targetUrl = payload.data?.url || '/vendor/orders';
        const notificationType = payload.data?.type;
        const localId = messageId ? String(messageId) : `fcm-${Date.now()}`;

        presentRealtimeNotification({
          id: localId,
          title,
          body,
          url: targetUrl,
          type: notificationType,
          source: 'fcm',
        });

        setNotifications((prev) => {
          const alreadyExists = prev.some((item) => item.id === localId);
          if (alreadyExists) return prev;

          const liveNotification = {
            id: localId,
            title,
            body,
            url: targetUrl,
            type: notificationType || 'general',
            read: false,
            createdAt: new Date().toISOString(),
            liveOnly: true,
          };

          return [liveNotification, ...prev].slice(0, 20);
        });

        rememberSeenNotification(localId);
      });

      return () => unsubscribe();
    }, [presentRealtimeNotification, rememberSeenNotification, shouldSkipDuplicateEvent]);

  return (
    <AppContext.Provider value={{
      user, cart, orders, serviceBookings, stores, allProducts, loading,
      login, logout, refreshUser, addToCart, removeFromCart, updateQuantity,
      clearCart, placeOrder, updatePlan, notifications, installPrompt,
      installPWA, updateUser, refreshOrders, refreshStores, refreshProducts, refreshData,
      markAllNotificationsRead, markNotificationAsRead, requestPushNotifications
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

