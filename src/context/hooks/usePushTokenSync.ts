import { useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, messaging } from '@/lib/firebase';
import { syncPushTokenForUser, useAppStore } from '../appStore';

interface NativeWindow extends Window {
  median_onesignal_push_token?: (tokenData: unknown) => void | Promise<void>;
  gonative_onesignal_push_token?: (tokenData: unknown) => void | Promise<void>;
  median_library_ready?: () => void;
  median?: {
    notifications?: {
      requestPermission: () => void;
    };
  };
}

export const usePushTokenSync = () => {
  const user = useAppStore((state) => state.user);
  const userId = user?.id;

  useEffect(() => {
    const handleNativeToken = async (tokenData: unknown) => {
      if (!userId) return;

      const tokenDataRecord = (typeof tokenData === 'object' && tokenData !== null) ? tokenData as Record<string, unknown> : null;
      const token = typeof tokenData === 'string' ? tokenData : (
        (typeof tokenDataRecord?.oneSignalUserId === 'string' && tokenDataRecord.oneSignalUserId) ||
        (typeof tokenDataRecord?.registrationId === 'string' && tokenDataRecord.registrationId) ||
        (typeof tokenDataRecord?.pushToken === 'string' && tokenDataRecord.pushToken)
      );

      if (!token) return;

      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();

        const previousTokens = Array.isArray(userData?.fcmTokens) ? userData.fcmTokens : [];
        const previousPrimaryToken = typeof userData?.fcmToken === 'string' ? userData.fcmToken : null;

        let tokens = [...previousTokens];
        if (!tokens.includes(token)) tokens.push(token);
        if (tokens.length > 5) tokens = tokens.slice(-5);

        const hasTokenListChanged = tokens.length !== previousTokens.length || tokens.some((value, index) => value !== previousTokens[index]);
        const hasPrimaryTokenChanged = previousPrimaryToken !== token;

        if (!hasTokenListChanged && !hasPrimaryTokenChanged) {
          return;
        }

        await updateDoc(userRef, {
          fcmToken: token,
          fcmTokens: tokens,
          deviceType: 'apk_shell',
          lastTokenRefresh: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to save native token:', err);
      }
    };

    const nativeWindow = window as NativeWindow;
    nativeWindow.median_onesignal_push_token = handleNativeToken;
    nativeWindow.gonative_onesignal_push_token = handleNativeToken;
    nativeWindow.median_library_ready = () => nativeWindow.median?.notifications?.requestPermission();

    return () => {
      delete nativeWindow.median_onesignal_push_token;
      delete nativeWindow.gonative_onesignal_push_token;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !messaging || typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;

    const currentUser = useAppStore.getState().user;
    if (!currentUser) return;

    let cancelled = false;
    syncPushTokenForUser(currentUser)
      .then((token) => { if (!cancelled && token) console.log('🔔 Existing push permission detected. Token synced.'); })
      .catch((error) => { if (!cancelled) console.warn('Push token auto-sync skipped:', error?.message || error); });

    return () => { cancelled = true; };
  }, [userId]);
};
