import { User, CartItem, Order, Store, Product, PlanTier, ServiceBooking } from '@/types';
import { auth, db } from '@/lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, getDocs, setDoc, updateDoc, collection, query, where, or } from 'firebase/firestore';
import { sendInAppNotification } from '@/utils/notifications';
import { toast } from 'sonner';
import { getToken } from 'firebase/messaging';
import { messaging } from '@/lib/firebase';
import { cleanObject } from '@/utils/firebase';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { initAudio } from '@/utils/notifications';

export const DELIVERY_ACK_SOURCE = 'web_app';
export const NOTIFICATION_DEDUPE_TTL_MS = 45000;
export const SEEN_NOTIFICATIONS_STORAGE_KEY = 'bellbasket_seen_notifications';

type InstallPromptChoice = { outcome: 'accepted' | 'dismissed'; platform: string };

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallPromptChoice>;
}

export interface NotificationRecord {
  id: string;
  title?: string;
  body?: string;
  url?: string;
  type?: string;
  read?: boolean;
  createdAt?: string;
  time?: string;
  [key: string]: unknown;
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error);
};

type FirebaseUserProfileData = Partial<User> & Record<string, unknown>;

export const buildUserFromFirebase = (firebaseUser: FirebaseUser, data: FirebaseUserProfileData = {}): User => {
  return {
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
};

export const buildGuestUserFromFirebase = (firebaseUser: FirebaseUser): User => {
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || 'Guest',
    email: firebaseUser.email || '',
    role: 'customer' as const,
    isVerified: firebaseUser.emailVerified || false,
  };
};

const fetchUserData = async (firebaseUser: FirebaseUser): Promise<User> => {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const userDoc = await getDoc(userRef);

  if (userDoc.exists()) {
    return buildUserFromFirebase(firebaseUser, userDoc.data() as FirebaseUserProfileData);
  }

  return buildGuestUserFromFirebase(firebaseUser);
};

export const syncPushTokenForUser = async (currentUser: User) => {
  if (!messaging) return null;

  const serviceWorkerRegistration = await navigator.serviceWorker.ready;
  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration,
  });

  if (!token) return null;

  const userRef = doc(db, 'users', currentUser.id);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data();

  const previousTokens = Array.isArray(userData?.fcmTokens) ? userData.fcmTokens : [];
  const previousPrimaryToken = typeof userData?.fcmToken === 'string' ? userData.fcmToken : null;

  let tokens = [...previousTokens];
  if (!tokens.includes(token)) {
    tokens.push(token);
  }
  if (tokens.length > 5) tokens = tokens.slice(-5);

  const hasTokenListChanged = tokens.length !== previousTokens.length || tokens.some((value, index) => value !== previousTokens[index]);
  const hasPrimaryTokenChanged = previousPrimaryToken !== token;

  if (!hasTokenListChanged && !hasPrimaryTokenChanged) {
    return token;
  }

  await updateDoc(userRef, {
    fcmToken: token,
    fcmTokens: tokens,
    lastTokenRefresh: new Date().toISOString(),
  });

  return token;
};

interface AppState {
  user: User | null;
  cart: CartItem[];
  orders: Order[];
  serviceBookings: ServiceBooking[];
  stores: Store[];
  allProducts: Product[];
  loading: boolean;
  notifications: NotificationRecord[];
  installPrompt: BeforeInstallPromptEvent | null;
  login: (user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  addToCart: (item: CartItem) => boolean;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  placeOrder: (paymentMethod: 'online' | 'pickup' | 'delivery', options?: { deliveryMethod: 'pickup' | 'delivery', deliveryFee: number }) => Promise<string | null>;
  updatePlan: (plan: PlanTier, months?: number, autoPay?: boolean) => Promise<void>;
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

export interface AppStore extends AppState {
  setUser: (user: User | null) => void;
  setCart: (cart: CartItem[]) => void;
  setOrders: (orders: Order[]) => void;
  setServiceBookings: (bookings: ServiceBooking[]) => void;
  setStores: (stores: Store[]) => void;
  setLoading: (loading: boolean) => void;
  setInstallPrompt: (prompt: BeforeInstallPromptEvent | null) => void;
  setNotifications: (notifications: NotificationRecord[] | ((prev: NotificationRecord[]) => NotificationRecord[])) => void;
}

type PersistedUser = Pick<User, 'id' | 'role' | 'language' | 'isVerified' | 'hasCompletedOnboarding' | 'name'>;

const STORE_PERSIST_KEY = 'bellbasket-store';
const LEGACY_CART_KEY = 'bellbasket_cart';

const buildPersistedUser = (user: User | null): PersistedUser | null => {
  if (!user) return null;
  return {
    id: user.id,
    role: user.role,
    language: user.language,
    isVerified: user.isVerified,
    hasCompletedOnboarding: user.hasCompletedOnboarding,
    name: user.name,
  };
};

const readLegacyCart = (): CartItem[] => {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(LEGACY_CART_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as CartItem[] : [];
  } catch {
    return [];
  }
};

export const useAppStore = create<AppStore>()(persist((set, get) => ({
  user: null,
  cart: readLegacyCart(),
  orders: [],
  serviceBookings: [],
  stores: [],
  allProducts: [],
  loading: true,
  notifications: [{ id: 'welcome', title: 'Welcome to BellBasket!', body: 'Stay tuned for updates on your orders.', time: new Date().toISOString() }],
  installPrompt: null,

  setUser: (user) => set({ user }),
  setCart: (cart) => set({ cart }),
  setOrders: (orders) => set({ orders }),
  setServiceBookings: (serviceBookings) => set({ serviceBookings }),
  setStores: (stores) => set({ stores }),
  setLoading: (loading) => set({ loading }),
  setInstallPrompt: (installPrompt) => set({ installPrompt }),
  setNotifications: (notifications) => set((state) => ({
    notifications: typeof notifications === 'function' ? notifications(state.notifications) : notifications,
  })),

  login: (user) => set({ user }),

  logout: () => {
    auth.signOut().catch(console.error);
    localStorage.removeItem('bellbasket_admin');
    set({ user: null, cart: [], orders: [] });
  },

  refreshUser: async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    const refreshed = await fetchUserData(auth.currentUser);
    set({ user: refreshed });
  },

  addToCart: (item) => {
    const { user, cart } = get();

    if (!user) {
      toast.info('Please login first', {
        description: 'You need to be signed in to add items to your cart.',
      });
      window.location.href = '/auth';
      return false;
    }

    if (cart.length > 0 && cart[0].storeId !== item.storeId) {
      toast.error('You can only order from one store at a time. Please clear your cart first.');
      return false;
    }

    set((state) => {
      const existing = state.cart.find((c) => c.product.id === item.product.id);
      if (existing) {
        return {
          cart: state.cart.map((c) => c.product.id === item.product.id ? { ...c, quantity: c.quantity + 1 } : c),
        };
      }
      return { cart: [...state.cart, item] };
    });

    return true;
  },

  removeFromCart: (productId) => {
    set((state) => ({ cart: state.cart.filter((c) => c.product.id !== productId) }));
  },

  updateQuantity: (productId, quantity) => {
    const { user, removeFromCart } = get();
    if (!user) {
      toast.info('Please login first');
      window.location.href = '/auth';
      return;
    }
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    set((state) => ({
      cart: state.cart.map((c) => c.product.id === productId ? { ...c, quantity } : c),
    }));
  },

  clearCart: () => set({ cart: [] }),

  placeOrder: async (paymentMethod, options) => {
    const { cart, user, stores } = get();

    if (cart.length === 0) return null;

    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const pickupCode = String(Math.floor(1000 + Math.random() * 9000));

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
      rejectedAt: null,
    };

    const storeInfo = stores.find((s) => s.id === cart[0].storeId);

    if (user) {
      const orderToSave = {
        ...newOrder,
        userId: user.id,
        userName: user.name || 'Customer',
        userPhone: user.phone || '',
        storePhone: storeInfo?.phone || cart[0]?.storePhone || '',
      };

      try {
        const cleanedOrder = cleanObject(orderToSave);
        await setDoc(doc(db, 'orders', orderId), cleanedOrder);

        const itemSummary = cart.slice(0, 2).map((c) => c.product.name).join(', ');
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

        set({ cart: [] });
        return orderId;
      } catch (err: unknown) {
        console.error('🔥 Firestore Order Error:', err);
        toast.error('Database sync failed', {
          description: `Code: ${(err as { code?: string })?.code || 'unknown'} - ${getErrorMessage(err) || 'Check your internet'}`,
          duration: 8000,
        });
        return null;
      }
    }

    toast.error('You must be logged in to place an order');
    return null;
  },

  updatePlan: async (plan, months = 1, autoPay = false) => {
    const { user, refreshUser } = get();
    if (!user) return;

    const userRef = doc(db, 'users', user.id);
    const updateData: Record<string, unknown> = { plan };

    if (plan !== 'none') {
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + months);
      updateData.subscriptionExpiry = expiryDate.toISOString();
      updateData.autoPay = autoPay;
      updateData.autoPayFailed = false;
    } else {
      updateData.subscriptionExpiry = null;
      if (user.autoPay) {
        updateData.autoPay = false;
      }
    }

    await updateDoc(userRef, cleanObject(updateData));

    try {
      const storeRef = doc(db, 'stores', user.id);
      const storeSnap = await getDoc(storeRef);
      if (storeSnap.exists()) {
        await updateDoc(storeRef, { plan });
      }
    } catch (e) {
      console.error('Failed to sync plan to store doc:', e);
    }

    await refreshUser();
  },

  installPWA: async () => {
    const installPrompt = get().installPrompt;
    if (!installPrompt) {
      toast.info('Installation Ready', {
        description: 'BellBasket is already installed or your browser handles installation automatically.',
      });
      return;
    }

    installPrompt.prompt();
    await installPrompt.userChoice;
    set({ installPrompt: null });
  },

  updateUser: async (data) => {
    const { user, refreshUser } = get();
    if (!user) return;

    await updateDoc(doc(db, 'users', user.id), cleanObject(data));
    await refreshUser();
  },

  refreshOrders: async () => {
    const user = get().user;
    if (!user || typeof user.id !== 'string') return;

    try {
      const q = query(
        collection(db, 'orders'),
        or(where('userId', '==', user.id), where('storeId', '==', user.id)),
      );
      const snapshot = await getDocs(q);
      const firestoreOrders = snapshot.docs.map((orderDoc) => ({ id: orderDoc.id, ...orderDoc.data() })) as Order[];
      set({
        orders: firestoreOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      });
    } catch (e) {
      console.error('Order sync error', e);
    }
  },

  refreshStores: async () => {
    try {
      const snapshot = await getDocs(collection(db, 'stores'));
      set({ stores: snapshot.docs.map((storeDoc) => ({ id: storeDoc.id, ...storeDoc.data() })) as Store[] });
    } catch (e) {
      console.error('Store sync error', e);
    }
  },

  refreshProducts: async () => {
    try {
      const snapshot = await getDocs(collection(db, 'products'));
      set({ allProducts: snapshot.docs.map((productDoc) => ({ id: productDoc.id, ...productDoc.data() })) as Product[] });
    } catch (e) {
      console.error('Product sync error', e);
    }
  },

  refreshData: async () => {
    const { refreshOrders, refreshStores, refreshProducts } = get();
    await Promise.all([refreshOrders(), refreshStores(), refreshProducts()]);
  },

  markAllNotificationsRead: async () => {
    const { user, notifications } = get();
    if (!user?.id) return;

    const unread = notifications.filter((n) => !n.read && n.id !== 'welcome');
    if (unread.length === 0) return;

    try {
      const readAt = new Date().toISOString();
      const promises = unread.map((n) => updateDoc(doc(db, 'notifications', n.id), { read: true, readAt }));
      await Promise.all(promises);
    } catch (e) {
      console.error('Error marking notifications as read', e);
    }
  },

  markNotificationAsRead: async (id) => {
    if (id === 'welcome') return;
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true, readAt: new Date().toISOString() });
    } catch (e) {
      console.error('Error marking notification as read', e);
    }
  },

  requestPushNotifications: async () => {
    const user = get().user;

    if (!('Notification' in window)) {
      toast.error('Push Notifications are not supported by this browser.', {
        description: "If you are on iOS, please use 'Add to Home Screen' first.",
      });
      return;
    }

    if (!messaging || !user) {
      toast.error('User not logged in or Firebase not initialized');
      return;
    }

    if (Notification.permission === 'denied') {
      toast.error('Notifications are blocked!', {
        description: 'Please go to your browser/site settings and allow notifications for this site, then try again.',
      });
      return;
    }

    initAudio();

    try {
      const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();

      if (permission === 'granted') {
        const token = await syncPushTokenForUser(user);

        if (token) {
          toast.success('Push notifications enabled!');
        } else {
          toast.error('Could not retrieve notification token.');
        }
      } else {
        toast.warning('Notification permission was not granted.');
      }
    } catch (error: unknown) {
      console.error('Error requesting push notification permission:', error);
      toast.error(`Notification setup failed: ${getErrorMessage(error) || 'Unknown error'}`);
    }
  },
}), {
  name: STORE_PERSIST_KEY,
  version: 1,
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    cart: state.cart,
    user: buildPersistedUser(state.user) as User | null,
    notifications: state.notifications.slice(0, 10),
  }),
  migrate: (persistedState: unknown, version) => {
    if (version === 0 && persistedState && typeof persistedState === 'object') {
      const legacyState = persistedState as Record<string, unknown>;
      return {
        ...legacyState,
        notifications: Array.isArray(legacyState.notifications)
          ? (legacyState.notifications as NotificationRecord[]).slice(0, 10)
          : [{ id: 'welcome', title: 'Welcome to BellBasket!', body: 'Stay tuned for updates on your orders.', time: new Date().toISOString() }],
      };
    }
    return persistedState as AppStore;
  },
  onRehydrateStorage: () => () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LEGACY_CART_KEY);
    }
  },
}));

const identitySelector = (state: AppStore) => state;

export const useApp = <T = AppStore>(selector?: (state: AppStore) => T) => {
  return useAppStore(selector ?? (identitySelector as (state: AppStore) => T));
};
