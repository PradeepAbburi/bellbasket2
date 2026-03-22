import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing, X, ShieldCheck, Zap } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { initAudio } from '@/utils/notifications';

const NotificationPrompt = () => {
  const { user, orders, serviceBookings, requestPushNotifications } = useApp();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show to logged in users
    if (!user) return;

    // Check if notifications are already granted or denied
    if (!("Notification" in window) || Notification.permission !== 'default') {
      return;
    }

    // Don't show if already dismissed in this session
    if (sessionStorage.getItem('notification_prompt_dismissed') === 'true') {
      return;
    }

    // Important context check:
    // Show if they are a vendor (needs orders) 
    // OR if they are an admin 
    // OR if they are a customer with active orders
    const hasActiveOrders = orders.some(o => !['completed', 'rejected'].includes(o.status));
    const hasActiveBookings = serviceBookings.some(b => !['completed', 'rejected'].includes(b.status));
    
    if (user.role === 'vendor' || user.role === 'admin' || hasActiveOrders || hasActiveBookings) {
      // Small delay for better UX
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [user, orders, serviceBookings]);

  const handleEnable = async () => {
    initAudio();
    await requestPushNotifications();
    setShow(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem('notification_prompt_dismissed', 'true');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/40 backdrop-blur-[2px] pointer-events-auto"
            onClick={handleDismiss}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="relative w-full max-w-sm glass-strong rounded-[2.5rem] p-6 shadow-2xl pointer-events-auto border border-white/20 bg-white/95 dark:bg-slate-900/95"
          >
            <button 
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2.5 rounded-full hover:bg-secondary/80 text-muted-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
                  <BellRing className="w-10 h-10 text-primary animate-bounce shadow-primary/20" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white border-4 border-background shadow-lg">
                  <Zap className="w-4 h-4 fill-current" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-foreground tracking-tight">Stay Updated</h2>
                <p className="text-sm text-muted-foreground leading-relaxed px-4">
                  Enable push notifications to receive real-time updates on your <span className="text-foreground font-bold italic">orders, status changes, and critical alerts.</span>
                </p>
              </div>

              <div className="flex flex-col w-full gap-3 pt-2">
                <button
                  onClick={handleEnable}
                  className="w-full gradient-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  Enable Notifications <ShieldCheck className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDismiss}
                  className="w-full py-3 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Maybe later
                </button>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 uppercase tracking-widest font-black">
                <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                Safe & Secure Delivery Updates
                <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NotificationPrompt;
