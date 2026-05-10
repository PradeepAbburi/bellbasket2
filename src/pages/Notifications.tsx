import React from 'react';
import { useApp } from '@/context/AppContext';
import Header from '@/components/Header';
import { Bell, Check, Trash2, ArrowLeft, Calendar, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import PageLoading from '@/components/PageLoading';

const NotificationsPage = () => {
    const { notifications, markAllNotificationsRead, user, requestPushNotifications, loading } = useApp();
    if (loading) return <PageLoading />;
    const navigate = useNavigate();
    const { t } = useTranslation();

    const unreadCount = notifications.filter((n: any) => !n.read && n.id !== 'welcome').length;

    const handleMarkAllRead = () => {
        markAllNotificationsRead();
        toast.success("All notifications marked as read");
    };

    return (
        <div className="min-h-screen gradient-warm pb-20">
            <Header />
            <main className="pt-24 px-4 max-w-2xl mx-auto">
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/50 backdrop-blur-sm hover:bg-white transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h1 className="text-2xl font-black text-foreground tracking-tight">Notifications</h1>
                        </div>
                        {unreadCount > 0 && (
                            <button 
                                onClick={handleMarkAllRead}
                                className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-4 py-2 rounded-xl hover:bg-primary hover:text-white transition-all active:scale-95"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="space-y-3">
                        {notifications.length === 0 ? (
                            <div className="glass rounded-[2.5rem] p-12 text-center flex flex-col items-center gap-4">
                                <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center">
                                    <Bell className="w-10 h-10 text-primary/20" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-bold">All clear!</h3>
                                    <p className="text-sm text-muted-foreground">No new notifications to show.</p>
                                </div>
                                {typeof Notification !== 'undefined' && Notification.permission === 'default' && (
                                    <div className="mt-4 flex flex-col items-center gap-3 bg-primary/5 p-6 rounded-2xl border-2 border-primary/10 max-w-sm mx-auto">
                                        <p className="text-sm font-bold text-foreground">Allow On-Screen Notifications</p>
                                        <p className="text-xs text-muted-foreground px-4">Receive updates like new orders, messages, or alerts directly on your screen.</p>
                                        <button 
                                            onClick={async () => {
                                                await requestPushNotifications();
                                                // Trigger a re-render to hide the prompt
                                                window.location.reload();
                                            }} 
                                            className="px-8 py-2.5 bg-primary text-white font-black rounded-xl text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all mt-2"
                                        >
                                            Allow
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <AnimatePresence mode="popLayout">
                                {notifications.sort((a: any, b: any) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime()).map((notif: any, i: number) => (
                                    <motion.div
                                        key={notif.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: i * 0.05 }}
                                        onClick={() => {
                                            if (notif.url) {
                                                navigate(notif.url);
                                            } else if (user?.role === 'vendor') {
                                                navigate('/vendor/orders');
                                            } else {
                                                navigate('/receipts');
                                            }
                                        }}
                                        className={`glass rounded-2xl p-5 cursor-pointer transition-all hover:translate-x-1 group relative overflow-hidden ${!notif.read && notif.id !== 'welcome' ? 'ring-2 ring-primary/20 bg-primary/5' : 'hover:bg-white/05'}`}
                                    >
                                        <div className="relative z-10 flex gap-4">
                                            <div className={`w-12 h-12 rounded-xl shrink-0 flex items-center justify-center transition-colors ${!notif.read && notif.id !== 'welcome' ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                                <Info className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className={`font-bold text-base leading-tight truncate ${!notif.read && notif.id !== 'welcome' ? 'text-primary' : 'text-foreground'}`}>
                                                        {notif.title}
                                                    </h3>
                                                    {!notif.read && notif.id !== 'welcome' && (
                                                        <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-lg shadow-primary/40 animate-pulse shrink-0 mt-1" />
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 italic mb-3">
                                                    "{notif.body}"
                                                </p>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                                        <Calendar className="w-3 h-3 text-primary/40" />
                                                        {notif.time ? new Date(notif.time).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Today'}
                                                    </div>
                                                    <span className="w-1 h-1 rounded-full bg-border" />
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-primary/60">
                                                        {notif.time ? new Date(notif.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : ''}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Decorative background accent */}
                                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default NotificationsPage;


