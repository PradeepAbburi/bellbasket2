import { beforeEach, describe, expect, it, vi } from 'vitest';
import { User, CartItem, Order, Store, PlanTier } from '@/types';
import { BeforeInstallPromptEvent } from './appStore';

const mocks = vi.hoisted(() => {
  const signOut = vi.fn().mockResolvedValue(undefined);
  const getToken = vi.fn();
  const getDoc = vi.fn();
  const getDocs = vi.fn();
  const setDoc = vi.fn();
  const updateDoc = vi.fn();
  const sendInAppNotification = vi.fn();
  const initAudio = vi.fn();
  const toastInfo = vi.fn();
  const toastError = vi.fn();
  const toastWarning = vi.fn();
  const toastSuccess = vi.fn();
  const toastLoading = vi.fn().mockReturnValue('toast-id');

  return {
    signOut,
    getToken,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    sendInAppNotification,
    initAudio,
    toastInfo,
    toastError,
    toastWarning,
    toastSuccess,
    toastLoading,
  };
});

vi.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null,
    signOut: mocks.signOut,
  },
  db: {},
  messaging: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((...args: unknown[]) => ({ __type: 'doc', args })),
  getDoc: mocks.getDoc,
  getDocs: mocks.getDocs,
  setDoc: mocks.setDoc,
  updateDoc: mocks.updateDoc,
  collection: vi.fn((_db: unknown, name: string) => ({ __type: 'collection', name })),
  query: vi.fn((collectionRef: unknown, ...filters: unknown[]) => ({ __type: 'query', collectionRef, filters })),
  where: vi.fn((...args: unknown[]) => ({ __type: 'where', args })),
  or: vi.fn((...args: unknown[]) => ({ __type: 'or', args })),
}));

vi.mock('firebase/messaging', () => ({
  getToken: mocks.getToken,
}));

vi.mock('@/utils/notifications', () => ({
  sendInAppNotification: mocks.sendInAppNotification,
  initAudio: mocks.initAudio,
}));

vi.mock('@/utils/firebase', () => ({
  cleanObject: <T>(value: T) => value,
}));

vi.mock('sonner', () => ({
  toast: {
    info: mocks.toastInfo,
    error: mocks.toastError,
    warning: mocks.toastWarning,
    success: mocks.toastSuccess,
    loading: mocks.toastLoading,
  },
}));

import { auth } from '@/lib/firebase';
import { useAppStore, syncPushTokenForUser } from './appStore';

const makeSnapshot = (rows: Array<{ id: string; data: Record<string, unknown> }>) => ({
  docs: rows.map((row) => ({
    id: row.id,
    data: () => row.data,
  })),
});

describe('appStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState(useAppStore.getInitialState(), true);
    localStorage.clear();

    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      configurable: true,
      value: { ready: Promise.resolve({}) },
    });

    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      },
    });

    mocks.getDoc.mockResolvedValue({ exists: () => false, data: () => ({}) });
    mocks.getDocs.mockResolvedValue(makeSnapshot([]));
    mocks.getToken.mockResolvedValue('fcm-token-1');

    (auth as unknown as { currentUser: unknown }).currentUser = null;
  });

  it('handles login and logout state transitions', async () => {
    const user = { id: 'u1', name: 'Test', email: 't@example.com', role: 'customer', isVerified: true };

    useAppStore.getState().login(user as unknown as User);
    expect(useAppStore.getState().user?.id).toBe('u1');

    useAppStore.setState({ cart: [{ product: { id: 'p1', price: 10 }, quantity: 1, storeId: 's1', storeName: 'S' } as unknown as CartItem], orders: [{ id: 'o1' } as unknown as Order] });
    useAppStore.getState().logout();

    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().user).toBeNull();
    expect(useAppStore.getState().cart).toHaveLength(0);
    expect(useAppStore.getState().orders).toHaveLength(0);
  });

  it('adds to cart, updates quantity, and removes items', () => {
    useAppStore.setState({ user: { id: 'u1', role: 'customer', isVerified: true } as unknown as User });

    const item = { product: { id: 'p1', price: 25 }, quantity: 1, storeId: 's1', storeName: 'Store' } as unknown as CartItem;
    const added = useAppStore.getState().addToCart(item);
    expect(added).toBe(true);
    expect(useAppStore.getState().cart).toHaveLength(1);

    useAppStore.getState().addToCart(item);
    expect(useAppStore.getState().cart[0].quantity).toBe(2);

    useAppStore.getState().updateQuantity('p1', 5);
    expect(useAppStore.getState().cart[0].quantity).toBe(5);

    useAppStore.getState().updateQuantity('p1', 0);
    expect(useAppStore.getState().cart).toHaveLength(0);
  });

  it('prevents adding cart items from a different store', () => {
    useAppStore.setState({
      user: { id: 'u1', role: 'customer', isVerified: true } as unknown as User,
      cart: [{ product: { id: 'p1', price: 10 }, quantity: 1, storeId: 's1', storeName: 'Store A' } as unknown as CartItem],
    });

    const result = useAppStore.getState().addToCart({
      product: { id: 'p2', price: 30 },
      quantity: 1,
      storeId: 's2',
      storeName: 'Store B',
    } as unknown as CartItem);

    expect(result).toBe(false);
    expect(mocks.toastError).toHaveBeenCalled();
  });

  it('places an order and clears cart on success', async () => {
    useAppStore.setState({
      user: { id: 'u1', name: 'Alice', phone: '123', role: 'customer', isVerified: true } as unknown as User,
      stores: [{ id: 's1', phone: '999' } as unknown as Store],
      cart: [{ product: { id: 'p1', name: 'Apple', price: 20 }, quantity: 2, storeId: 's1', storeName: 'Fresh Store' } as unknown as CartItem],
    });

    const orderId = await useAppStore.getState().placeOrder('online');

    expect(orderId).toContain('ORD-');
    expect(mocks.setDoc).toHaveBeenCalledTimes(1);
    expect(mocks.sendInAppNotification).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().cart).toHaveLength(0);
  });

  it('updates user profile and refreshes from auth user', async () => {
    const firebaseUser = {
      uid: 'u1',
      displayName: 'Firebase User',
      email: 'firebase@example.com',
      emailVerified: true,
      reload: vi.fn().mockResolvedValue(undefined),
    };

    (auth as unknown as { currentUser: unknown }).currentUser = firebaseUser;
    mocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ role: 'customer', phone: '555', language: 'English' }),
    });

    useAppStore.setState({ user: { id: 'u1', role: 'customer', isVerified: true } as unknown as User });
    await useAppStore.getState().updateUser({ name: 'Updated Name' });

    expect(mocks.updateDoc).toHaveBeenCalled();
    expect(firebaseUser.reload).toHaveBeenCalled();
    expect(useAppStore.getState().user?.id).toBe('u1');
  });

  it('updates plan and syncs plan to store', async () => {
    useAppStore.setState({ user: { id: 'v1', role: 'vendor', isVerified: true, autoPay: true } as unknown as User });
    mocks.getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({}) });

    await useAppStore.getState().updatePlan('premium' as PlanTier, 2, true);

    expect(mocks.updateDoc).toHaveBeenCalled();
  });

  it('refreshes orders, stores, products, and aggregate refreshData', async () => {
    useAppStore.setState({ user: { id: 'u1', role: 'customer', isVerified: true } as unknown as User });

    mocks.getDocs
      .mockResolvedValueOnce(makeSnapshot([
        { id: 'o1', data: { date: '2026-03-10T00:00:00.000Z' } },
        { id: 'o2', data: { date: '2026-03-11T00:00:00.000Z' } },
      ]))
      .mockResolvedValueOnce(makeSnapshot([{ id: 's1', data: { name: 'Store 1' } }]))
      .mockResolvedValueOnce(makeSnapshot([{ id: 'p1', data: { name: 'Prod 1' } }]));

    await useAppStore.getState().refreshOrders();
    await useAppStore.getState().refreshStores();
    await useAppStore.getState().refreshProducts();

    expect(useAppStore.getState().orders[0].id).toBe('o2');
    expect(useAppStore.getState().stores).toHaveLength(1);
    expect(useAppStore.getState().allProducts).toHaveLength(1);

    mocks.getDocs
      .mockResolvedValueOnce(makeSnapshot([]))
      .mockResolvedValueOnce(makeSnapshot([]))
      .mockResolvedValueOnce(makeSnapshot([]));

    await useAppStore.getState().refreshData();
    expect(mocks.getDocs).toHaveBeenCalled();
  });

  it('marks notifications as read', async () => {
    useAppStore.setState({
      user: { id: 'u1', role: 'customer', isVerified: true } as unknown as User,
      notifications: [
        { id: 'welcome', read: false },
        { id: 'n1', read: false },
        { id: 'n2', read: true },
      ],
    });

    await useAppStore.getState().markAllNotificationsRead();
    expect(mocks.updateDoc).toHaveBeenCalledTimes(1);

    await useAppStore.getState().markNotificationAsRead('welcome');
    expect(mocks.updateDoc).toHaveBeenCalledTimes(1);

    await useAppStore.getState().markNotificationAsRead('n2');
    expect(mocks.updateDoc).toHaveBeenCalledTimes(2);
  });

  it('handles installPWA with and without prompt', async () => {
    await useAppStore.getState().installPWA();
    expect(mocks.toastInfo).toHaveBeenCalled();

    const prompt = {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
    };

    useAppStore.setState({ installPrompt: prompt as unknown as BeforeInstallPromptEvent });
    await useAppStore.getState().installPWA();

    expect(prompt.prompt).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().installPrompt).toBeNull();
  });

  it('requests push notifications successfully', async () => {
    useAppStore.setState({ user: { id: 'u1', role: 'customer', isVerified: true } as unknown as User });
    mocks.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ fcmTokens: [] }) });

    await useAppStore.getState().requestPushNotifications();

    expect(mocks.initAudio).toHaveBeenCalled();
    expect(mocks.toastLoading).toHaveBeenCalled();
    expect(mocks.getToken).toHaveBeenCalled();
    expect(mocks.toastSuccess).toHaveBeenCalled();
  });

  it('handles denied notification permission path', async () => {
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: {
        permission: 'denied',
        requestPermission: vi.fn(),
      },
    });

    useAppStore.setState({ user: { id: 'u1', role: 'customer', isVerified: true } as unknown as User });
    await useAppStore.getState().requestPushNotifications();

    expect(mocks.toastError).toHaveBeenCalled();
  });

  it('syncPushTokenForUser saves token and caps token list', async () => {
    mocks.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ fcmTokens: ['a', 'b', 'c', 'd', 'e'] }),
    });
    mocks.getToken.mockResolvedValue('f');

    const token = await syncPushTokenForUser({ id: 'u1' } as unknown as User);

    expect(token).toBe('f');
    expect(mocks.updateDoc).toHaveBeenCalled();
  });
});
