import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Calendar, Phone, MapPin, X, Loader2, KeyRound, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { toast } from 'sonner';
import { useApp } from '@/context/AppContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { sendInAppNotification, playBellSound } from '@/utils/notifications';
import { ServiceBooking } from '@/types';

const statusFlow = ['pending', 'accepted', 'completed'] as const;

const VendorBookings = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user, serviceBookings: bookings, loading } = useApp();
    const [view, setView] = useState<'active' | 'past'>('active');
    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

    const activeBookings = bookings.filter(b => b.status === 'pending' || b.status === 'accepted');
    const pastBookings = bookings.filter(b => b.status === 'completed' || b.status === 'rejected');

    const displayBookings = view === 'active' ? activeBookings : pastBookings;
    const selectedBooking = bookings.find(b => b.id === selectedBookingId) || null;

    const advanceStatus = async (bookingId: string) => {
        const booking = bookings.find(b => b.id === bookingId);
        if (!booking) return;

        const idx = statusFlow.indexOf(booking.status as any);
        if (idx < statusFlow.length - 1) {
            const next = statusFlow[idx + 1];

            try {
                await updateDoc(doc(db, 'serviceBookings', bookingId), { status: next });
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
                if (next === 'completed' && selectedBookingId === bookingId) {
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
            if (selectedBookingId === bookingId) {
                setSelectedBookingId(null);
            }
        } catch (e) {
            console.error(e);
            toast.error('Failed to reject booking');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen gradient-warm flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
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
                        <h1 className="text-2xl font-bold text-foreground">Service Bookings</h1>
                    </div>
                    <div className="bg-secondary p-1 rounded-xl flex items-center gap-1 w-fit">
                        <button
                            onClick={() => setView('active')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'active' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Active ({activeBookings.length})
                        </button>
                        <button
                            onClick={() => setView('past')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'past' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            History ({pastBookings.length})
                        </button>
                    </div>
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
                                className="glass rounded-2xl p-5"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-mono font-bold bg-secondary px-2 py-0.5 rounded text-muted-foreground">{booking.id?.slice(0, 8)}...</span>
                                            <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                                                {new Date(booking.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="font-semibold text-foreground text-base">{booking.serviceName}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize border ${booking.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' :
                                        booking.status === 'accepted' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                            booking.status === 'rejected' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                                                'bg-amber-100 text-amber-700 border-amber-200'
                                        }`}>
                                        {t(`common.order_status.${booking.status}`, { defaultValue: booking.status.toUpperCase() })}
                                    </span>
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
                                        className="w-full sm:w-auto bg-primary text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 shrink-0"
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
                                                    onClick={() => advanceStatus(booking.id!)}
                                                    className="gradient-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5"
                                                >
                                                    <Check className="w-3 h-3" />
                                                    Mark Completed
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => rejectBooking(booking.id!)}
                                                    className="bg-destructive/10 text-destructive text-xs font-semibold px-4 py-2 rounded-lg hover:bg-destructive/20 transition-colors flex items-center gap-1.5"
                                                >
                                                    <X className="w-3 h-3" />
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => advanceStatus(booking.id!)}
                                                    className="gradient-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5"
                                                >
                                                    <Check className="w-3 h-3" />
                                                    Accept Booking
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default VendorBookings;
