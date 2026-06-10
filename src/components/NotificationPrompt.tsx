import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, X, Sparkles, ShieldCheck } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { initAudio } from '@/utils/notifications';

const NotificationPrompt = () => {
  const { user, orders, serviceBookings, requestPushNotifications } = useApp();
  const [show, setShow] = useState(false);
  const [permission, setPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'granted'
  );

  useEffect(() => {
    // Check if notifications are already asked
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') {
      return;
    }

    // Don't show if already dismissed in this session
    if (sessionStorage.getItem('notification_prompt_dismissed') === 'true') {
      return;
    }

    if (!user || user.role === 'admin' || user.role === 'hr') return;

    // Show if they are a vendor 
    // OR if they have active orders/bookings
    const hasActiveOrders = orders.some(o => !['completed', 'rejected'].includes(o.status));
    const hasActiveBookings = serviceBookings.some(b => !['completed', 'rejected'].includes(b.status));
    
    if (user.role === 'vendor' || hasActiveOrders || hasActiveBookings) {
      const timer = setTimeout(() => setShow(true), 4000);
      return () => clearTimeout(timer);
    }
  }, [user, orders, serviceBookings]);

  const handleEnable = async () => {
    initAudio();
    await requestPushNotifications();
    sessionStorage.setItem('notification_prompt_dismissed', 'true');
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
      if (Notification.permission === 'granted') {
        setShow(false);
      }
    }
  };

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem('notification_prompt_dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          className="fixed bottom-24 left-4 right-4 z-[999] md:left-auto md:right-8 md:w-96"
        >
          <div className="bg-white dark:bg-[#1A1A1A] rounded-[2.5rem] p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-primary/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
              <BellRing className="w-32 h-32" />
            </div>
            
            <button 
              onClick={handleDismiss}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-secondary/80 text-muted-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center shrink-0">
                  <BellRing className="w-8 h-8 text-primary animate-bounce-gentle" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">Recommended</span>
                    <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                  </div>
                  <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Stay Alerts Ready</h3>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                  Get instant push notifications for every new order. Don't miss a beat!
                </p>
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 bg-emerald-500/5 px-3 py-1.5 rounded-xl w-fit">
                  <ShieldCheck className="w-3 h-3" /> Real-time Order Tracking Enabled
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={handleEnable}
                  className="w-full py-4 rounded-2xl gradient-primary text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Allow Notifications
                </button>
                <button
                  onClick={handleDismiss}
                  className="w-full py-3 rounded-2xl bg-secondary/50 text-muted-foreground font-bold text-xs uppercase tracking-widest hover:bg-secondary transition-all"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationPrompt;
