import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Calendar, Phone, MapPin, X, Loader2, KeyRound, Navigation, Trash2, Clock, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { toast } from 'sonner';
import { useApp } from '@/context/AppContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { sendInAppNotification, playBellSound } from '@/utils/notifications';
import { ServiceBooking } from '@/types';
import PageLoading from '@/components/PageLoading';

const statusFlow = ['pending', 'accepted', 'completed'] as const;

const VendorBookings = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user, serviceBookings: bookings, loading, setIsAnyModalOpen } = useApp();
    const [view, setView] = useState<'active' | 'past'>('active');
    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
    
    if (loading) return <PageLoading />;

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [longPressTimer, setLongPressTimer] = useState<any>(null);

    // Use global modal state to hide nav elements
    useEffect(() => {
        setIsAnyModalOpen(!!selectedBookingId);
        return () => setIsAnyModalOpen(false);
    }, [selectedBookingId, setIsAnyModalOpen]);

    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 3000);
        return () => clearInterval(interval);
    }, []);

    const activeBookings = bookings.filter(b => {
        if (b.status !== 'completed' && b.status !== 'rejected' && b.status !== 'cancelled') return true;
        if (b.status === 'completed') {
            const completedAt = b.completedAt ? new Date(b.completedAt).getTime() : 0;
            return completedAt > 0 && (now - completedAt) < 30000;
        }
        if (b.status === 'rejected' || b.status === 'cancelled') {
            const cancelTime = b.cancelledAt ? new Date(b.cancelledAt).getTime() : (b.rejectedAt ? new Date(b.rejectedAt).getTime() : 0);
            return cancelTime > 0 && (now - cancelTime) < 30000;
        }
        return false;
    });

    const pastBookings = bookings.filter(b => {
        if (b.status === 'completed') {
            const completedAt = b.completedAt ? new Date(b.completedAt).getTime() : 0;
            return completedAt === 0 || (now - completedAt) >= 30000;
        }
        if (b.status === 'rejected' || b.status === 'cancelled') {
            const cancelTime = b.cancelledAt ? new Date(b.cancelledAt).getTime() : (b.rejectedAt ? new Date(b.rejectedAt).getTime() : 0);
            return cancelTime === 0 || (now - cancelTime) >= 30000;
        }
        return false;
    });

    const displayBookings = view === 'active' ? activeBookings : pastBookings;
    const selectedBooking = bookings.find(b => b.id === selectedBookingId) || null;

    const advanceStatus = async (bookingId: string) => {
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) return;

        const idx = statusFlow.indexOf(booking.status as any);
        if (idx < statusFlow.length - 1) {
            const next = statusFlow[idx + 1];

            try {
                const updateData: any = { status: next };
                if (next === 'completed') {
                    updateData.completedAt = new Date().toISOString();
                }
                await updateDoc(doc(db, 'serviceBookings', bookingId), updateData);
                playBellSound(next === 'accepted'); // Play high pitch for acceptance

                // 🔔 Push notification to the customer
                if (booking.userId && booking.userId !== 'guest') {
                    const statusMessages: Record<string, string> = {
                        accepted: `✅ Your service booking with ${booking.storeName} has been accepted!`,
                        completed: `🎉 Your service with ${booking.storeName} is marked as completed.`,
                    };
                    const body = statusMessages[next] || `Your booking status updated to: ${next}`;
                    sendInAppNotification(booking.userId, {
                        title: 'BellBasket Booking Update',
                        body,
                        url: '/receipts',
                        type: 'booking',
                        id: bookingId
                    });
                }

                toast.success(`Booking status updated to: ${next}`);
                // Automatically close popup after action
                if (selectedBookingId === bookingId) {
                    setSelectedBookingId(null);
                }
            } catch (error) {
                console.error(error);
                toast.error('Failed to update status');
            }
        }
    };

    const rejectBooking = async (bookingId: string) => {
        if (!window.confirm("Are you sure you want to reject this booking?")) return;

        try {
            const booking = bookings.find(b => b.id === bookingId);
            await updateDoc(doc(db, 'serviceBookings', bookingId), {
                status: 'rejected',
            });
            playBellSound(false);

            // 🔔 Push notification to the customer
            if (booking?.userId && booking.userId !== 'guest') {
                sendInAppNotification(booking.userId, {
                    title: '❌ Booking Rejected',
                    body: `Your service booking with ${booking.storeName} has been rejected by the vendor.`,
                    url: '/receipts',
                    type: 'booking',
                    id: bookingId
                });
            }

            toast.success("Booking rejected");
            // Automatically close popup after rejection
            if (selectedBookingId === bookingId) {
                setSelectedBookingId(null);
            }
        } catch (e) {
            console.error(e);
            toast.error('Failed to reject booking');
        }
    };

    const handleDeleteBooking = async (bookingId: string) => {
        if (!window.confirm("Remove this booking from your history? It will still be visible to the customer.")) return;
        try {
            await updateDoc(doc(db, 'serviceBookings', bookingId), { deletedByVendor: true });
            toast.success("Booking removed from your view");
        } catch (e) {
            toast.error("Failed to remove booking");
        }
    };

    // Selection Logic
    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
            if (newSelected.size === 0) setIsSelectionMode(false);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const startLongPress = (id: string) => {
        const timer = setTimeout(() => {
            setIsSelectionMode(true);
            toggleSelection(id);
            if (window.navigator.vibrate) window.navigator.vibrate(50);
        }, 600);
        setLongPressTimer(timer);
    };

    const cancelLongPress = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
    };

    const handleSelectAll = () => {
        if (selectedIds.size === displayBookings.length) {
            setSelectedIds(new Set());
            setIsSelectionMode(false);
        } else {
            setSelectedIds(new Set(displayBookings.map(b => b.id!)));
            setIsSelectionMode(true);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`Permanently remove ${selectedIds.size} ${view} bookings from your view?`)) return;

        const loadingToast = toast.loading(`Deleting ${selectedIds.size} bookings...`);
        try {
            const promises = Array.from(selectedIds).map(id =>
                updateDoc(doc(db, 'serviceBookings', id), { deletedByVendor: true })
            );
            await Promise.all(promises);
            toast.dismiss(loadingToast);
            toast.success(`${selectedIds.size} items removed`);
            setSelectedIds(new Set());
            setIsSelectionMode(false);
        } catch (e) {
            toast.dismiss(loadingToast);
            toast.error("Deletion failed");
        }
    };

    if (loading) {
        return <PageLoading />;
    }

    return (
        <div className="min-h-screen gradient-warm">
            <Header />
            <div className="pt-20 pb-40 px-4 max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={() => navigate('/vendor')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-4 h-4" /> {t('common.dashboard')}
                    </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold text-foreground">
                            {isSelectionMode ? `Selected (${selectedIds.size})` : `Service Bookings (${activeBookings.length})`}
                        </h1>
                    </div>
                    {isSelectionMode ? (
                        <div className="flex items-center gap-2">
                             <button
                                onClick={handleSelectAll}
                                className="px-4 py-2 rounded-xl bg-secondary text-foreground text-xs font-black uppercase tracking-widest hover:bg-secondary/80 transition-all border border-border/50"
                            >
                                {selectedIds.size === displayBookings.length ? 'Deselect All' : 'Select All'}
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                className="px-4 py-2 rounded-xl bg-destructive text-white text-xs font-black uppercase tracking-widest hover:bg-destructive/90 transition-all shadow-lg shadow-destructive/20"
                            >
                                Delete ({selectedIds.size})
                            </button>
                            <button
                                onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }}
                                className="p-2 rounded-xl bg-secondary text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="bg-secondary p-1.5 rounded-2xl flex items-center gap-1 w-fit shadow-inner">
                            <button
                                onClick={() => setView('active')}
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${view === 'active' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Active ({activeBookings.length})
                            </button>
                            <button
                                onClick={() => setView('past')}
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${view === 'past' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                History ({pastBookings.length})
                            </button>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    {displayBookings.length === 0 ? (
                        <div className="glass rounded-2xl p-12 text-center space-y-3">
                            <Calendar className="w-12 h-12 text-muted-foreground mx-auto opacity-20" />
                            <p className="text-muted-foreground">No {view} bookings found.</p>
                        </div>
                    ) : (
                        displayBookings.map((booking, i) => (
                            <motion.div
                                key={booking.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08 }}
                                onPointerDown={() => !isSelectionMode && startLongPress(booking.id!)}
                                onPointerUp={cancelLongPress}
                                onPointerLeave={cancelLongPress}
                                onClick={() => {
                                    if (isSelectionMode) {
                                        toggleSelection(booking.id!);
                                    } else {
                                        navigate(`/receipt/${booking.id}`);
                                    }
                                }}
                                className={`rounded-2xl p-4 border shadow-sm transition-all cursor-pointer relative overflow-hidden ${
                                    selectedIds.has(booking.id!) 
                                        ? 'bg-primary/5 border-primary ring-2 ring-primary/20' 
                                        : 'glass border-border/50 hover:border-border'
                                }`}
                            >
                                {isSelectionMode && (
                                    <div className="absolute top-4 right-4 z-10">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                            selectedIds.has(booking.id!) ? 'bg-primary border-primary' : 'bg-transparent border-muted-foreground/30'
                                        }`}>
                                            {selectedIds.has(booking.id!) && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                    </div>
                                )}
                                
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <span className="text-[10px] font-black font-mono tracking-tighter bg-secondary/80 text-secondary-foreground px-2 py-0.5 rounded-md border border-border/40 shadow-sm transition-all hover:bg-secondary">
                                                {booking.id?.slice(-8).toUpperCase()}
                                            </span>
                                            <div className="flex items-center gap-1.5 bg-secondary/40 px-2 py-0.5 rounded-md border border-border/20">
                                                <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                                                    {new Date(booking.createdAt).toLocaleDateString()}
                                                </span>
                                                <span className="w-1 h-1 rounded-full bg-border" />
                                                <span className="text-[10px] font-black text-foreground uppercase tracking-wider whitespace-nowrap">
                                                    {new Date(booking.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="font-semibold text-foreground text-base">{booking.serviceName}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-3 shrink-0">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border shadow-sm ${
                                            booking.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                            booking.status === 'accepted' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                            booking.status === 'rejected' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                            'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                        }`}>
                                            {t(`common.order_status.${booking.status}`, { defaultValue: booking.status.toUpperCase() })}
                                        </span>
                                    </div>
                                </div>

                                {/* Booking PIN - Matching Normal Orders */}
                                {booking.pickupCode && (
                                    <div className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-3 flex items-center justify-between border border-amber-200/60 dark:border-amber-700/40">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                                <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Service PIN</p>
                                                <p className="text-lg font-black text-foreground tracking-[0.3em] font-mono">{booking.pickupCode}</p>
                                            </div>
                                        </div>
                                        <span className="text-[8px] font-black text-amber-600/60 dark:text-amber-400/60 uppercase tracking-widest">
                                            {booking.status === 'completed' ? 'Verified ✓' : 'Verify for Service'}
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center gap-3 mb-4 text-[12px] font-bold text-primary px-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>Scheduled: {booking.date} at {booking.timeSlot}</span>
                                </div>

                                {/* Customer Details */}
                                <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                            {(booking.customerName || 'C').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-foreground">
                                                {booking.customerName}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Customer</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <a
                                            href={`tel:${booking.customerPhone}`}
                                            className="p-2 rounded-lg bg-white shadow-sm text-primary hover:scale-110 transition-transform"
                                        >
                                            <Phone className="w-3.5 h-3.5" />
                                        </a>
                                        <span className="text-xs font-mono font-bold text-foreground">
                                            {booking.customerPhone}
                                        </span>
                                    </div>
                                </div>

                                {/* Directions Section - Consistent with Orders */}
                                <div className="mb-4 p-4 glass rounded-[1.5rem] bg-secondary/20 flex flex-col sm:flex-row justify-between items-center gap-4 border border-border/40">
                                    <div className="flex-1 flex items-center gap-3 w-full sm:w-auto">
                                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                                            <MapPin className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-foreground truncate">{booking.location}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-black">Customer Location</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(booking.location)}`, '_blank');
                                        }}
                                        className="w-full sm:w-auto bg-primary text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shrink-0"
                                    >
                                        <Navigation className="w-3.5 h-3.5" /> Get Directions
                                    </button>
                                </div>

                                {booking.description && (
                                    <div className="mb-4 text-xs text-muted-foreground p-3 rounded-xl bg-secondary/30">
                                        <span className="font-bold block mb-1">Details:</span>
                                        <p>{booking.description}</p>
                                    </div>
                                )}

                                {booking.status !== 'completed' && booking.status !== 'rejected' && (
                                    <div className="flex items-center gap-2 pt-2 border-t border-border/50 w-full justify-end">
                                        {booking.status === 'accepted' ? (
                                            <>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); rejectBooking(booking.id!); }}
                                                    className="bg-destructive/10 text-destructive text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-destructive/20 transition-colors flex items-center gap-1.5"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); advanceStatus(booking.id!); }}
                                                    className="bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    Complete
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedBookingId(booking.id!);
                                                }}
                                                className="bg-primary text-primary-foreground w-full py-3 text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                            >
                                                <Calendar className="w-4 h-4" />
                                                Review & Accept
                                            </button>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            {/* Booking Review Modal */}
            <AnimatePresence>
                {selectedBooking && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            className="bg-[#202020] w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] flex flex-col max-h-[75vh] shadow-2xl overflow-hidden border-t sm:border border-border/50"
                        >
                            <div className="p-5 border-b border-border/50 flex items-center justify-between bg-card/50">
                                <div className="space-y-1">
                                    <h2 className="text-lg font-black text-foreground tracking-tight uppercase">Review Booking</h2>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest bg-secondary/50 px-2 py-0.5 rounded-md w-fit">#{selectedBooking.id?.slice(-8).toUpperCase()}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedBookingId(null)}
                                    className="p-2 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-all active:scale-90"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-5 overflow-y-auto flex-1 space-y-5">
                                {/* Service Details */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Calendar className="w-4 h-4 text-primary" />
                                        <h3 className="font-black text-[10px] text-foreground uppercase tracking-widest">Service Information</h3>
                                    </div>
                                    <div className="p-4 bg-secondary/30 rounded-2xl border border-border/40 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-none mb-1.5">Service Name</p>
                                                <p className="font-bold text-base text-foreground">{selectedBooking.serviceName}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-none mb-1.5">Date & Time</p>
                                                <p className="font-bold text-xs text-foreground">{selectedBooking.date} · {selectedBooking.timeSlot}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="pt-3 border-t border-border/20">
                                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-none mb-1.5">Customer Location</p>
                                            <div className="flex items-center gap-2 text-primary font-bold text-xs">
                                                <MapPin className="w-3.5 h-3.5" />
                                                <span className="break-all">{selectedBooking.location}</span>
                                            </div>
                                        </div>

                                        {selectedBooking.description && (
                                            <div className="pt-3 border-t border-border/20">
                                                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-none mb-1.5">Customer Message / Note</p>
                                                <p className="text-sm text-foreground italic leading-relaxed">"{selectedBooking.description}"</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Customer Quick Actions */}
                                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary border border-primary/20">
                                            {(selectedBooking.customerName || 'C').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">{selectedBooking.customerName}</p>
                                            <p className="text-[10px] font-mono font-medium text-muted-foreground">{selectedBooking.customerPhone}</p>
                                        </div>
                                    </div>
                                    <a
                                        href={`tel:${selectedBooking.customerPhone}`}
                                        className="p-3 rounded-xl bg-white shadow-sm text-primary hover:scale-110 transition-transform border border-border/50 active:scale-95"
                                    >
                                        <Phone className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>

                            <div className="p-5 border-t border-border/50 bg-card/50">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => rejectBooking(selectedBooking.id!)}
                                        className="flex-1 bg-destructive/10 text-destructive font-black py-4 rounded-2xl hover:bg-destructive/20 transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest border border-destructive/20 active:scale-95"
                                    >
                                        <X className="w-5 h-5" />
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => advanceStatus(selectedBooking.id!)}
                                        className="flex-[2] bg-primary text-primary-foreground font-black py-4 rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest active:scale-[0.98]"
                                    >
                                        <Check className="w-5 h-5" />
                                        Confirm & Accept
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VendorBookings;