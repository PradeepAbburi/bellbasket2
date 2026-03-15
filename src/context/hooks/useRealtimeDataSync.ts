import { useEffect, useRef } from 'react';
import { collection, onSnapshot, or, query, where } from 'firebase/firestore';
import { toast } from 'sonner';
import { Order, ServiceBooking, Store } from '@/types';
import { db } from '@/lib/firebase';
import { playBellSound } from '@/utils/notifications';
import { useAppStore } from '../appStore';

export const useRealtimeDataSync = () => {
  const user = useAppStore((state) => state.user);
  const setOrders = useAppStore((state) => state.setOrders);
  const setStores = useAppStore((state) => state.setStores);
  const setServiceBookings = useAppStore((state) => state.setServiceBookings);

  const prevOrdersMap = useRef<Record<string, string>>({});

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'stores'), (snapshot) => {
      setStores(snapshot.docs.map((storeDoc) => ({ id: storeDoc.id, ...storeDoc.data() })) as Store[]);
    }, (err) => console.error('Store sync error', err));
    return () => unsubscribe();
  }, [setStores]);

  useEffect(() => {
    if (!user) {
      setServiceBookings([]);
      return;
    }

    const q = query(
      collection(db, 'serviceBookings'),
      user.role === 'vendor' ? where('vendorId', '==', user.id) : where('userId', '==', user.id),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedBookings = snapshot.docs.map((bookingDoc) => ({ id: bookingDoc.id, ...bookingDoc.data() })) as ServiceBooking[];
      fetchedBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setServiceBookings(fetchedBookings);
    });

    return () => unsubscribe();
  }, [user, setServiceBookings]);

  useEffect(() => {
    if (!user?.id) {
      setOrders([]);
      return;
    }
    const uid = user.id;
    const q = query(collection(db, 'orders'), or(where('userId', '==', uid), where('storeId', '==', uid)));

    let isFirstLoad = true;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const data = { id: change.doc.id, ...change.doc.data() } as Order;
          if (!isFirstLoad && !snapshot.metadata.hasPendingWrites) {
            if (change.type === 'added' && data.storeId === uid) playBellSound(true);
            if (change.type === 'modified') {
              const prevStatus = prevOrdersMap.current[data.id];
              if (prevStatus && prevStatus !== data.status) playBellSound(data.status === 'accepted' || data.status === 'completed');
            }
          }
          prevOrdersMap.current[data.id] = data.status;
        }
      });
      isFirstLoad = false;
      const firestoreOrders = snapshot.docs.map((orderDoc) => ({ id: orderDoc.id, ...orderDoc.data() })) as Order[];
      setOrders(firestoreOrders.sort((a, b) => (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0)));
    }, (err) => {
      console.error('Unified order sync error', err);
      if (err.code === 'permission-denied') toast.error('Order Sync Failed: Permission Denied', { description: 'Please apply the latest Firestore Rules.' });
    });
    return () => unsubscribe();
  }, [setOrders, user]);
};
