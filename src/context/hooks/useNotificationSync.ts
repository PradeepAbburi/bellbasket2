import { useCallback, useEffect, useRef } from 'react';
import { doc, limit, onSnapshot, orderBy, query, updateDoc, where, collection } from 'firebase/firestore';
import { onMessage } from 'firebase/messaging';
import { toast } from 'sonner';
import { db, messaging } from '@/lib/firebase';
import { playBellSound } from '@/utils/notifications';
import {
  DELIVERY_ACK_SOURCE,
  NOTIFICATION_DEDUPE_TTL_MS,
  NotificationRecord,
  SEEN_NOTIFICATIONS_STORAGE_KEY,
  useAppStore,
} from '../appStore';

export const useNotificationSync = () => {
  const user = useAppStore((state) => state.user);
  const stores = useAppStore((state) => state.stores);
  const setNotifications = useAppStore((state) => state.setNotifications);

  const storesRef = useRef(stores);
  const seenNotificationIds = useRef(new Set<string>());
  const dedupeEventMap = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    storesRef.current = stores;
  }, [stores]);

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
      if ((now - timestamp) > NOTIFICATION_DEDUPE_TTL_MS) map.delete(key);
    }

    if (map.has(eventKey)) return true;
    map.set(eventKey, now);
    return false;
  }, []);

  const presentRealtimeNotification = useCallback((payload: {
    id?: string; title?: string; body?: string; url?: string; type?: string; source?: 'fcm' | 'firestore'; forceSound?: boolean;
  }) => {
    const title = payload.title || 'BellBasket Update';
    const body = payload.body || 'You have a new alert.';
    const targetUrl = payload.url || '/vendor/orders';

    toast(title, { description: body, duration: 10000, action: { label: 'View', onClick: () => { window.location.href = targetUrl; } } });

    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(title, { body, icon: '/pwa-icon.png', badge: '/pwa-icon.png', tag: payload.id || `notif-${Date.now()}`, data: { url: targetUrl } });
      browserNotification.onclick = () => {
        window.focus();
        window.location.href = targetUrl;
        browserNotification.close();
      };
    }

    const isServiceStore = user?.role === 'vendor' && storesRef.current.find((store) => store.vendorId === user?.id)?.storeType === 'service';
    const isPriority = payload.forceSound || payload.type === 'booking' || payload.type === 'order' || isServiceStore;
    playBellSound(Boolean(isPriority));
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!user?.id) return;

    seenNotificationIds.current.clear();
    dedupeEventMap.current.clear();

    if (typeof window !== 'undefined') {
      try {
        const cached = JSON.parse(sessionStorage.getItem(SEEN_NOTIFICATIONS_STORAGE_KEY) || '[]');
        if (Array.isArray(cached)) seenNotificationIds.current = new Set(cached);
      } catch {
        seenNotificationIds.current = new Set();
      }
    }

    let isInitialLoadWindow = true;
    const initialLoadTimer = setTimeout(() => { isInitialLoadWindow = false; }, 1500);

    const q = query(collection(db, 'notifications'), where('userId', '==', user.id), orderBy('createdAt', 'desc'), limit(20));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const docId = change.doc.id;

          let isFresh = true;
          if (data.createdAt) {
            try { isFresh = (Date.now() - (data.createdAt.toDate?.()?.getTime() || 0)) < 30000; }
            catch { isFresh = true; }
          }

          if (isInitialLoadWindow && !isFresh) {
            rememberSeenNotification(docId);
          } else if (!seenNotificationIds.current.has(docId) && !data.read) {
            rememberSeenNotification(docId);
            const dedupeKey = data.id || data.messageId || (data.orderId ? `${data.orderId}-${data.status || data.type}` : docId);

            if (!shouldSkipDuplicateEvent(String(dedupeKey))) {
              presentRealtimeNotification({ id: docId, title: data.title, body: data.body, url: data.url, type: data.type, source: 'firestore' });
            }

            if (!data.deliveredAt) {
              updateDoc(doc(db, 'notifications', docId), { deliveredAt: new Date().toISOString(), deliveredVia: DELIVERY_ACK_SOURCE }).catch(() => undefined);
            }
          }
        }
      });
      setNotifications(snapshot.docs.map((notificationDoc) => ({ id: notificationDoc.id, ...notificationDoc.data() })) as NotificationRecord[]);
    }, (err) => console.error('Notifications listener failed:', err));

    return () => {
      clearTimeout(initialLoadTimer);
      unsubscribe();
    };
  }, [presentRealtimeNotification, rememberSeenNotification, setNotifications, shouldSkipDuplicateEvent, user?.id]);

  useEffect(() => {
    if (!messaging) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      const dedupeKey = payload.data?.id || payload.messageId || payload.data?.messageId || (payload.data?.orderId ? `${payload.data.orderId}-${payload.data.status || payload.data.type}` : undefined);

      if (shouldSkipDuplicateEvent(dedupeKey ? String(dedupeKey) : undefined)) return;

      const title = payload.notification?.title || payload.data?.title || 'BellBasket Update';
      const body = payload.notification?.body || payload.data?.body || 'You have a new alert.';
      const targetUrl = payload.data?.url || '/vendor/orders';
      const notificationType = payload.data?.type;
      const localId = dedupeKey ? String(dedupeKey) : `fcm-${Date.now()}`;

      presentRealtimeNotification({ id: localId, title, body, url: targetUrl, type: notificationType, source: 'fcm' });

      setNotifications((prev) => {
        if (prev.some((item) => item.id === localId)) return prev;
        return [{ id: localId, title, body, url: targetUrl, type: notificationType || 'general', read: false, createdAt: new Date().toISOString(), liveOnly: true }, ...prev].slice(0, 20);
      });
      rememberSeenNotification(localId);
    });

    return () => unsubscribe();
  }, [presentRealtimeNotification, rememberSeenNotification, setNotifications, shouldSkipDuplicateEvent]);
};
