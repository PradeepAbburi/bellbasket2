export const registerPush = async () => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ [ServiceWorker] PWA Service worker registered:', reg.scope);
      return reg;
    } catch (err) {
      console.warn('⚠️ [ServiceWorker] Registration failed:', err);
    }
  }
};

export const addListeners = async () => {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (e) {}
    }
  }
};
