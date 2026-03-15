import { useCallback, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';
import { User } from '@/types';
import { auth, db } from '@/lib/firebase';
import { buildGuestUserFromFirebase, buildUserFromFirebase, useAppStore } from '../appStore';

export const useAuthSync = () => {
  const user = useAppStore((state) => state.user);
  const updatePlan = useAppStore((state) => state.updatePlan);
  const setUser = useAppStore((state) => state.setUser);
  const setLoading = useAppStore((state) => state.setLoading);

  const hasCheckedExpiry = useRef(false);

  const applyUserAuthState = useCallback((nextUser: User | null) => {
    setUser(nextUser);
    setLoading(false);
  }, [setLoading, setUser]);

  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }

      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        unsubUserDoc = onSnapshot(userRef, (snapshot) => {
          if (snapshot.exists()) {
            applyUserAuthState(buildUserFromFirebase(firebaseUser, snapshot.data() as Partial<User> & Record<string, unknown>));
          } else {
            applyUserAuthState(buildGuestUserFromFirebase(firebaseUser));
          }
        }, (err) => {
          console.error('User doc sync error:', err);
          setLoading(false);
        });
      } else if (localStorage.getItem('bellbasket_admin') === 'true') {
        applyUserAuthState({
          id: 'admin_master',
          name: 'System Admin',
          email: 'contact.bellbasket1@gmail.com',
          role: 'admin',
          isVerified: true,
        } as User);
      } else {
        applyUserAuthState(null);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, [applyUserAuthState, setLoading]);

  useEffect(() => {
    if (user?.role === 'vendor' && user.plan && user.plan !== 'none' && user.subscriptionExpiry && !hasCheckedExpiry.current) {
      const expiryDate = new Date(user.subscriptionExpiry).getTime();
      if (Date.now() > expiryDate) {
        hasCheckedExpiry.current = true;
        updatePlan('none').then(() => {
          toast.info('Your subscription has expired.', { description: 'Please renew your plan to continue accessing vendor features.' });
        }).catch((e) => console.error('Auto-downgrade failed', e));
      }
    }
  }, [updatePlan, user]);
};
