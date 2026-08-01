import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ServiceBooking, Store, Order } from '@/types';
import { getAvatarUrl } from '@/utils/avatars';
import { Trash2, CheckCircle2, Circle, Clock, Star, MapPin, Navigation, Phone, User as UserIcon, KeyRound, Package, Share2, Copy, EyeOff, X, AlertCircle, CheckSquare, Square, Loader2 } from 'lucide-react';
import MapView from './MapView';
import { toast } from 'sonner';
import { useApp } from '@/context/AppContext';
import { getCurrencySymbol } from '@/utils/currency';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  accepted: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
  packed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  ready: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  out_for_delivery: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  rejected: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  cancelled: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  packed: 'Packed',
  ready: 'Ready for Pickup',
  out_for_delivery: 'Out for Delivery',
  completed: 'Completed',
  rejected: 'Order Rejected',
  cancelled: 'Order Cancelled',
};

const formatTo12Hr = (timeStr: string) => {
  if (!timeStr) return '';
  if (timeStr.toLowerCase().includes('am') || timeStr.toLowerCase().includes('pm')) return timeStr;
  
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours)) return timeStr;
    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${(minutes || 0).toString().padStart(2, '0')} ${period}`;
  } catch (e) {
    return timeStr;
  }
};

const handleShare = async (id: string, type: 'order' | 'booking', storeName: string) => {
    const url = `${window.location.origin}/receipt/${id}`;
    if (navigator.share) {
        try {
            await navigator.share({
                title: `Receipt for ${storeName}`,
                text: `View my receipt from ${storeName} on BellBasket`,
                url: url
            });
        } catch (err) {
            console.error(err);
        }
    } else {
        await navigator.clipboard.writeText(url);
        toast.success("Receipt link copied to clipboard!");
    }
};

export const RenderBookingCard = ({
  booking,
  i,
  review,
  onRate,
  onReviewChange,
  onAnonymous,
  onSubmit,
  t,
  storePhone,
  getStoreForOrder,
  onClick,
  userCoords,
  isSelected,
  onToggleSelect,
  showSelection,
  onLongPress,
  vendorInfo,
  standalone = false,
  hasReviewedStore = false,
  onlyShowTime = false
}: {
  booking: ServiceBooking;
  i: number;
  review: { rating: number; text: string; isAnonymous?: boolean; submitted: boolean; submittedAt?: string };
  onRate: (star: number) => void;
  onReviewChange: (text: string) => void;
  onAnonymous: (anon: boolean) => void;
  onSubmit: () => void;
  t: any;
  storePhone?: string;
  getStoreForOrder: (id: string) => Store | undefined;
  onClick?: () => void;
  userCoords?: [number, number];
  isSelected?: boolean;
  onToggleSelect?: () => void;
  showSelection?: boolean;
  onLongPress?: () => void;
  vendorInfo?: { phone: string; name: string };
  standalone?: boolean;
  hasReviewedStore?: boolean;
  onlyShowTime?: boolean;
}) => {
  const store = getStoreForOrder(booking.storeId);
  const navigate = useNavigate();
  const { refreshData } = useApp();
  const [showContact, setShowContact] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancellingBooking, setIsCancellingBooking] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const confirmCancelBooking = async () => {
    if (isCancellingBooking) return;
    setIsCancellingBooking(true);
    try {
      const bookingRef = doc(db, 'serviceBookings', booking.id);
      await updateDoc(bookingRef, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        rejectionReason: 'Cancelled by customer'
      });
      toast.success("Booking cancelled successfully!");
      setShowCancelModal(false);
      refreshData();
    } catch (err: any) {
      console.error("Error cancelling booking:", err);
      toast.error("Failed to cancel booking");
    } finally {
      setIsCancellingBooking(false);
    }
  };

  return (
    <motion.div
      key={booking.id}
      initial={standalone ? { opacity: 1 } : { opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-2xl p-5 transition-all relative ${onClick || showSelection ? 'cursor-pointer hover:shadow-lg active:scale-[0.98]' : ''} overflow-hidden ${isSelected ? 'ring-2 ring-primary ring-inset bg-primary/5 shadow-inner' : ''} ${standalone ? 'max-w-[380px] mx-auto shadow-2xl border-x-2 border-t-2 border-b-0 rounded-b-none' : ''}`}
      onPointerDown={() => {
        if (onLongPress) {
          longPressTimer.current = setTimeout(onLongPress, 600);
        }
      }}
      onPointerUp={() => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
      }}
      onPointerLeave={() => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
      }}
      onClick={(e) => {
        if (showSelection) {
          e.stopPropagation();
          onToggleSelect?.();
        } else if (onClick) {
          onClick();
        }
      }}
    >
      {showSelection && (
        <div className="absolute top-4 right-4 z-10 scale-110">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            isSelected ? 'bg-primary border-primary shadow-lg shadow-primary/30' : 'bg-white/20 border-white/40'
          }`}>
            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
          </div>
        </div>
      )}

      {store?.image && (
        <div className="-mx-5 -mt-5 mb-4 h-32 relative group overflow-hidden">
          <img 
            src={store.image} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            alt={store.name}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
              <div className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-2xl border-2 border-white/20 backdrop-blur-md ${
                booking.status === 'pending' ? 'bg-amber-500 text-white' :
                booking.status === 'accepted' ? 'bg-sky-500 text-white' :
                booking.status === 'completed' ? 'bg-emerald-600 text-white' :
                booking.status === 'rejected' || booking.status === 'cancelled' ? 'bg-rose-600 text-white' :
                'bg-primary text-white'
              }`}>
                {booking.status === 'accepted' ? 'Confirmed ✓' :
                 booking.status === 'pending' ? 'Pending' :
                 booking.status === 'completed' ? 'Completed ✓' :
                 booking.status === 'rejected' ? 'Rejected' :
                 booking.status === 'cancelled' ? 'Cancelled' :
                 String(booking.status).toUpperCase()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center border border-white/20">
                <img 
                    src={getAvatarUrl(booking.storeId)} 
                    alt={booking.storeName} 
                    className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h4 className="text-sm font-black text-white leading-none">{store.name}</h4>
                {vendorInfo?.name && <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-1">Owner: {vendorInfo.name}</p>}
              </div>
            </div>
          </div>
        </div>
      )}


      <div className={`flex items-start justify-between mb-4 ${booking.status === 'completed' && onClick ? 'pt-8' : ''}`}>
        <div className="flex-1 min-w-0 pr-12">
          {!onClick && (
            <div className="flex items-center gap-2 mb-1">
               <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">#{booking.id?.slice(-6).toUpperCase()}</span>
            </div>
          )}
          <h3 className="font-bold text-foreground text-lg leading-tight truncate">{booking.storeName}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-[9px] bg-primary/10 text-primary px-2 py-1 rounded-lg font-black uppercase tracking-widest flex items-center gap-1">
              {booking.serviceName}
            </span>
            <span className="text-[9px] bg-secondary/80 text-muted-foreground px-2 py-1 rounded-lg font-black uppercase tracking-widest flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {formatTo12Hr(booking.timeSlot)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {store && (
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  window.open(`https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`, '_blank'); 
                }}
                className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white transition-all shadow-lg backdrop-blur-md"
                title="Get Directions"
              >
                <Navigation className="w-4 h-4" />
              </button>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); handleShare(booking.id, 'booking', booking.storeName); }}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground/70 hover:bg-white/10 hover:text-foreground transition-all shadow-xl backdrop-blur-md"
              title="Share Booking"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                navigate('/support', { 
                  state: { 
                    prefillSubject: `Report Booking #${booking.id.slice(-6).toUpperCase()}`, 
                    prefillMessage: `I want to report Booking #${booking.id} for the service "${booking.serviceName}" from store "${booking.storeName}".\n\nIssue details: `,
                    bookingId: booking.id,
                    storeId: booking.storeId
                  } 
                });
              }}
              className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-lg backdrop-blur-md"
              title="Report Booking"
            >
              <AlertCircle className="w-4 h-4" />
            </button>
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border shadow-sm ${statusColors[booking.status] || statusColors.pending}`}>
              {t(`common.booking_status.${booking.status}`, { defaultValue: statusLabels[booking.status] || booking.status.toUpperCase() })}
            </span>
          </div>
        </div>
      </div>
      

      {(booking.status !== 'pending' || showContact) && (
        <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-primary/20">
                <img 
                    src={getAvatarUrl(booking.storeId)} 
                    alt={booking.storeName} 
                    className="w-full h-full object-cover"
                />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Contact Vendor</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">{booking.storeName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(vendorInfo?.phone || booking.storePhone || store?.phone) ? (
              <a
                href={`tel:${vendorInfo?.phone || booking.storePhone || store?.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-lg bg-white shadow-sm text-primary hover:scale-110 transition-transform"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            ) : (
              <div className="p-2 rounded-lg bg-white/50 text-muted-foreground">
                <Phone className="w-3.5 h-3.5 opacity-50" />
              </div>
            )}
            <span className="text-xs font-mono font-bold text-foreground">
              {vendorInfo?.phone || booking.storePhone || store?.phone || 'No Phone'}
            </span>
          </div>
        </div>
      )}

      {booking.status === 'pending' && (
        <div className="mb-4">
          {!showContact ? (
            <button
              onClick={(e) => { e.stopPropagation(); setShowContact(true); }}
              className="w-full py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Clock className="w-3.5 h-3.5" />
              {t('common.receipts.acceptance_note')}
            </button>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-500/5 rounded-2xl p-4 border border-amber-500/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-foreground uppercase tracking-tight">Contact {vendorInfo?.name || 'Vendor'}</h4>
                  <p className="text-[10px] text-muted-foreground font-medium">{t('common.receipts.acceptance_note_desc')}</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

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

      <div className="space-y-2 mt-4 text-sm text-foreground text-left">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-medium">Scheduled for:</span> {!onlyShowTime && `${booking.date} at `}{formatTo12Hr(booking.timeSlot)}
        </div>
        <div 
          onClick={(e) => {
            e.stopPropagation();
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.location)}`, '_blank');
          }}
          className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors group"
        >
          <MapPin className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
          <span className="truncate max-w-[200px] font-medium">{booking.location}</span>
        </div>
        {booking.description && (
          <div className="text-xs text-muted-foreground mt-2 p-3 bg-secondary/30 rounded-xl">
            <p className="font-bold text-foreground mb-1 uppercase tracking-widest text-[10px]">Note from you:</p>
            {booking.description}
          </div>
        )}
      </div>

      {!['completed', 'rejected', 'cancelled'].includes(booking.status) && (
        <div className="mt-4 px-2">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowCancelModal(true); }}
            disabled={isCancellingBooking}
            className="w-full py-3 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
            {t('common.receipts.cancel_booking')}
          </button>
        </div>
      )}

      {!onClick && store && (
        <div className="mt-4 p-4 glass rounded-[24px] bg-secondary/10 border border-border/40 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-left">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground whitespace-normal line-clamp-2">{store.address}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Store Location</p>
              </div>
            </div>
            <button
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`, '_blank')}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl gradient-primary text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              <Navigation className="w-4 h-4" /> Get Directions
            </button>
          </div>
        </div>
      )}
      <AnimatePresence>
        {showCancelModal && (
          <div 
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={(e) => { e.stopPropagation(); setShowCancelModal(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#1A1A1A] rounded-[2rem] p-6 max-w-sm w-full shadow-2xl border border-white/10 text-center space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-foreground">Cancel Booking #{booking.id?.slice(-6).toUpperCase()}?</h3>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                  Are you sure you want to cancel this booking? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-3.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Keep Booking
                </button>
                <button
                  type="button"
                  disabled={isCancellingBooking}
                  onClick={confirmCancelBooking}
                  className="flex-1 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCancellingBooking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Cancel'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const RenderOrderCard = ({
  order,
  i,
  review,
  onRate,
  onReviewChange,
  onAnonymous,
  onSubmit,
  t,
  storePhone,
  getStoreForOrder,
  onClick,
  userCoords,
  isSelected,
  onToggleSelect,
  showSelection,
  onLongPress,
  vendorInfo,
  standalone = false,
  hasReviewedStore = false,
  onlyShowTime = false
}: {
  order: Order;
  i: number;
  review: { rating: number; text: string; isAnonymous?: boolean; submitted: boolean; submittedAt?: string };
  onRate: (star: number) => void;
  onReviewChange: (text: string) => void;
  onAnonymous: (anon: boolean) => void;
  onSubmit: () => void;
  t: any;
  storePhone?: string;
  getStoreForOrder: (id: string) => Store | undefined;
  onClick?: () => void;
  userCoords?: [number, number];
  isSelected?: boolean;
  onToggleSelect?: () => void;
  showSelection?: boolean;
  onLongPress?: () => void;
  vendorInfo?: { phone: string; name: string };
  standalone?: boolean;
  hasReviewedStore?: boolean;
  onlyShowTime?: boolean;
}) => {
  const store = getStoreForOrder(order.storeId);
  const navigate = useNavigate();
  const storeSymbol = getCurrencySymbol(store?.country, store?.address);
  const [showContact, setShowContact] = useState(false);
  const [showCancelNote, setShowCancelNote] = useState(false);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const { setIsAnyModalOpen, refreshData } = useApp();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const confirmCancelOrder = async () => {
    if (isCancellingOrder) return;
    setIsCancellingOrder(true);
    try {
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        rejectionReason: 'Cancelled by customer'
      });
      toast.success("Order cancelled successfully!");
      setShowCancelModal(false);
      refreshData();
    } catch (err: any) {
      console.error("Error cancelling order:", err);
      toast.error("Failed to cancel order");
    } finally {
      setIsCancellingOrder(false);
    }
  };

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`receipt_checked_${order.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const toggleCheckItem = (itemId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCheckedItems(prev => {
      const updated = { ...prev, [itemId]: !prev[itemId] };
      localStorage.setItem(`receipt_checked_${order.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const checkedCount = order.items.filter(item => checkedItems[item.product.id]).length;

  useEffect(() => {
    setIsAnyModalOpen(showProductsModal);
    return () => setIsAnyModalOpen(false);
  }, [showProductsModal, setIsAnyModalOpen]);

  return (
    <>
      <motion.div
        key={order.id}
        initial={standalone ? { opacity: 1 } : { opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className={`glass rounded-2xl p-5 transition-all relative ${onClick || showSelection ? 'cursor-pointer hover:shadow-lg active:scale-[0.98]' : ''} overflow-hidden ${isSelected ? 'ring-2 ring-primary ring-inset bg-primary/5 shadow-inner' : ''} ${standalone ? 'max-w-[380px] mx-auto shadow-2xl border-x-2 border-t-2 border-b-0 rounded-b-none' : ''}`}
        onPointerDown={() => {
          if (onLongPress) {
            longPressTimer.current = setTimeout(onLongPress, 600);
          }
        }}
        onPointerUp={() => {
          if (longPressTimer.current) clearTimeout(longPressTimer.current);
        }}
        onPointerLeave={() => {
          if (longPressTimer.current) clearTimeout(longPressTimer.current);
        }}
        onClick={(e) => {
          if (showSelection) {
            e.stopPropagation();
            onToggleSelect?.();
          } else if (onClick) {
            onClick();
          }
        }}
      >
        {showSelection && (
          <div className="absolute top-4 right-4 z-10 scale-110">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
              isSelected ? 'bg-primary border-primary shadow-lg shadow-primary/30' : 'bg-white/20 border-white/40'
            }`}>
              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            </div>
          </div>
        )}

        {store?.image && (
          <div className="-mx-5 -mt-5 mb-4 h-32 relative group overflow-hidden">
            <img 
              src={store.image} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
              alt={store.name}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-4">
              <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5">
                <div className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-1.5 border-2 border-white/20 backdrop-blur-md ${
                  order.status === 'pending' ? 'bg-amber-500 text-white' :
                  order.status === 'accepted' ? 'bg-sky-500 text-white' :
                  order.status === 'packed' ? 'bg-blue-600 text-white' :
                  order.status === 'ready' ? 'bg-emerald-500 text-white' :
                  order.status === 'out_for_delivery' ? 'bg-purple-600 text-white' :
                  order.status === 'completed' ? 'bg-emerald-600 text-white' :
                  order.status === 'rejected' || order.status === 'cancelled' ? 'bg-rose-600 text-white' :
                  'bg-primary text-white'
                }`}>
                  {order.status === 'accepted' ? 'Confirmed ✓' :
                   order.status === 'pending' ? 'Pending' :
                   order.status === 'packed' ? 'Packed ✓' :
                   order.status === 'ready' ? 'Ready for Pickup' :
                   order.status === 'out_for_delivery' ? 'Out for Delivery' :
                   order.status === 'completed' ? 'Completed ✓' :
                   order.status === 'rejected' ? 'Rejected ❌' :
                   order.status === 'cancelled' ? 'Cancelled ❌' :
                   statusLabels[order.status] || String(order.status).toUpperCase()}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center border border-white/20">
                  <img 
                      src={getAvatarUrl(order.storeId)} 
                      alt={order.storeName} 
                      className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white leading-none text-left">{store.name}</h4>
                  {vendorInfo?.name && <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-1 text-left">Owner: {vendorInfo.name}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {order.status === 'rejected' && order.rejectionReason && (
          <div className="mb-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-left">
            <div className="flex items-center gap-2 mb-2">
              <X className="w-4 h-4 text-rose-500" strokeWidth={3} />
              <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Order Rejected</h4>
            </div>
            <p className="text-sm font-bold text-foreground leading-relaxed italic">
              "{order.rejectionReason}"
            </p>
            <p className="text-[9px] text-muted-foreground mt-2 font-medium uppercase tracking-tight italic">
              Note from vendor
            </p>
          </div>
        )}

        {order.items.some(item => item.status === 'rejected') && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Partial Item Rejection Notice
              </h4>
              <p className="text-[11px] text-muted-foreground font-medium mt-0.5 leading-tight">
                {order.items.filter(i => i.status === 'rejected').length} item(s) out of stock and rejected by vendor. Bill subtotal updated.
              </p>
            </div>
          </div>
        )}

        <div className={`flex items-start justify-between mb-4`}>
          <div className="flex-1 min-w-0 pr-4 text-left">
            {!onClick && (
              <div className="flex items-center gap-2 mb-1">
                 <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">#{order.id?.slice(-6).toUpperCase()}</span>
              </div>
            )}
            <h3 className="font-bold text-foreground text-lg leading-tight truncate">{order.storeName}</h3>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1.5 mt-2">
              {!onlyShowTime && (
                <>
                  {new Date(order.date).toLocaleDateString()}
                  <span className="w-1 h-1 rounded-full bg-border" />
                </>
              )}
              {new Date(order.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3 shrink-0">
            <div className="flex items-center gap-2">
              {store && (
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`, '_blank'); 
                  }}
                  className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white transition-all shadow-lg backdrop-blur-md"
                  title="Get Directions"
                >
                  <Navigation className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); handleShare(order.id, 'order', order.storeName); }}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground/70 hover:bg-white/10 hover:text-foreground transition-all shadow-xl backdrop-blur-md"
                title="Share Order"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  navigate('/support', { 
                    state: { 
                      prefillSubject: `Report Order #${order.id.slice(-6).toUpperCase()}`, 
                      prefillMessage: `I want to report Order #${order.id} from store "${order.storeName}".\n\nIssue details: `,
                      orderId: order.id,
                      storeId: order.storeId
                    } 
                  });
                }}
                className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-lg backdrop-blur-md"
                title="Report Order"
              >
                <AlertCircle className="w-4 h-4" />
              </button>
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border shadow-sm ${statusColors[order.status] || statusColors.pending}`}>
                {t(`common.order_status.${order.status}`, { defaultValue: statusLabels[order.status] || order.status.toUpperCase() })}
              </span>
            </div>
          </div>
        </div>

        {(order.status !== 'pending' || showContact) && (
          <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between text-left">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-primary/20">
                  <img 
                      src={getAvatarUrl(order.storeId)} 
                      alt={order.storeName} 
                      className="w-full h-full object-cover"
                  />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Contact Vendor</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">{order.storeName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(vendorInfo?.phone || order.storePhone || store?.phone) ? (
                <a
                  href={`tel:${vendorInfo?.phone || order.storePhone || store?.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 rounded-lg bg-white shadow-sm text-primary hover:scale-110 transition-transform"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
              ) : (
                <div className="p-2 rounded-lg bg-white/50 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 opacity-50" />
                </div>
              )}
              <span className="text-xs font-mono font-bold text-foreground">
                {vendorInfo?.phone || order.storePhone || store?.phone || 'No Phone'}
              </span>
            </div>
          </div>
        )}

        {order.status === 'pending' && (
          <div className="mb-4 flex gap-3 px-1">
            <div className="flex-1">
              {!showContact ? (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowContact(true); }}
                  className="w-full h-full py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Clock className="w-3.5 h-3.5" />
                  {t('common.receipts.acceptance_note')}
                </button>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={(e) => { e.stopPropagation(); setShowContact(false); }}
                  className="h-full bg-amber-500/10 rounded-xl p-3 border border-amber-500/30 text-left cursor-pointer hover:bg-amber-500/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-amber-600 shrink-0" />
                    <p className="text-[9px] text-amber-700 dark:text-amber-400 leading-tight font-black uppercase tracking-tighter">Click to Hide</p>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-tight font-medium mt-1">{t('common.receipts.acceptance_note_desc')}</p>
                </motion.div>
              )}
            </div>
            
            <div className="flex-1">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowCancelModal(true); }}
                disabled={isCancellingOrder}
                className="w-full h-full py-3 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                {t('common.receipts.cancel_order')}
              </button>
            </div>
          </div>
        )}

        {order.pickupCode && (
          <div className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl flex border border-amber-200/60 dark:border-amber-700/40 shadow-sm overflow-hidden text-left">
            <div className="flex-1 p-3 flex items-center gap-3 border-r border-amber-200/40 dark:border-amber-700/30">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Order PIN</p>
                <p className="text-lg font-black text-foreground tracking-[0.2em] font-mono leading-none">{order.pickupCode}</p>
              </div>
            </div>
            <div className="flex-1 p-3 bg-white/10 dark:bg-black/20 flex flex-col justify-center items-end relative">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Total Amount</p>
              <p className="text-xl font-black text-primary leading-none">
                {storeSymbol}{(() => {
                  return order.items.reduce((sum, item) => sum + (item.status === 'rejected' ? 0 : item.product.price * item.quantity), 0);
                })()}
              </p>
            </div>
          </div>
        )}



        <div 
          className={`space-y-4 text-left ${standalone ? '' : 'cursor-pointer hover:bg-secondary/20 p-3 -mx-3 rounded-2xl transition-all group/products border border-transparent hover:border-border/50'}`}
          onClick={(e) => {
            if (!standalone) {
              e.stopPropagation();
              setShowProductsModal(true);
            }
          }}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
              <Package className="w-3 h-3" />
              {t('common.products')} ({order.items.length})
            </span>
            {!standalone && (
              <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black uppercase tracking-widest group-hover/products:scale-105 transition-transform">
                View Details
              </span>
            )}
          </div>
          
          {standalone ? (
            <div className="space-y-2">
              {/* Shopping Progress Banner */}
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] font-black">
                  <span className="text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5" /> Shopping Checklist
                  </span>
                  <span className="text-blue-600 dark:text-blue-400 font-mono">
                    {checkedCount} / {order.items.length} Checked
                  </span>
                </div>
                <div className="w-full h-1.5 bg-blue-500/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                    style={{ width: `${order.items.length > 0 ? (checkedCount / order.items.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {order.items.map((item, idx) => {
                const isChecked = !!checkedItems[item.product.id];
                return (
                  <div 
                    key={item.product.id} 
                    onClick={(e) => toggleCheckItem(item.product.id, e)}
                    className={`flex items-center gap-3 p-3 rounded-[1.5rem] border shadow-sm cursor-pointer transition-all ${
                      isChecked 
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-emerald-500/5' 
                        : item.status === 'rejected' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-secondary/5 border-border/20 hover:bg-secondary/10'
                    }`}
                  >
                     <button
                        type="button"
                        onClick={(e) => toggleCheckItem(item.product.id, e)}
                        className="p-1 rounded-lg shrink-0 focus:outline-none"
                     >
                       {isChecked ? (
                         <CheckSquare className="w-5 h-5 text-emerald-500 transition-transform active:scale-90" />
                       ) : (
                         <Square className="w-5 h-5 text-muted-foreground/40 hover:text-primary transition-colors active:scale-90" />
                       )}
                     </button>
                     <div className="w-12 h-12 bg-white dark:bg-[#1A1A1A] rounded-xl flex items-center justify-center overflow-hidden border border-border/20 shadow-sm p-1 shrink-0">
                        {item.product.image ? (
                          <img src={item.product.image} alt={item.product.name} className={`w-full h-full object-contain rounded-lg ${item.status === 'rejected' ? 'grayscale opacity-60' : isChecked ? 'opacity-70' : ''}`} />
                        ) : (
                          <Package className="w-6 h-6 text-muted-foreground opacity-30" />
                        )}
                     </div>
                     <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-bold text-xs leading-tight break-words ${isChecked ? 'line-through text-emerald-700 dark:text-emerald-400 font-extrabold' : item.status === 'rejected' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {t(`products.${item.product.name}`, { defaultValue: item.product.name })}
                          </p>
                          {isChecked && (
                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Checked ✓
                            </span>
                          )}
                          {item.status === 'rejected' && (
                            <span className="text-[9px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Rejected / Out of Stock
                            </span>
                          )}
                        </div>
                        {item.product.quantity && (
                          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1 opacity-80">{item.product.quantity}</p>
                        )}
                        <p className="text-[9px] font-black text-primary mt-1.5 opacity-90">
                          {storeSymbol}{item.product.price} / unit
                        </p>
                     </div>
                     <div className="flex flex-col items-end gap-0.5 shrink-0 ml-2">
                        <div className="font-mono font-black text-sm text-primary bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">
                          x{item.quantity}
                        </div>
                        <p className={`text-[10px] font-bold ${item.status === 'rejected' ? 'line-through text-rose-400' : isChecked ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {item.status === 'rejected' ? `${storeSymbol}0 (Excluded)` : `${storeSymbol}${item.product.price * item.quantity}`}
                        </p>
                     </div>
                  </div>
                );
              })}
              
              {/* Detailed Summary for Standalone Receipts */}
              <div className="p-4 rounded-[1.5rem] bg-primary/5 border border-primary/10 space-y-2 mt-4 mb-6">
                 {(() => {
                   const itemsTotal = order.items.reduce((sum, item) => sum + (item.status === 'rejected' ? 0 : item.product.price * item.quantity), 0);
                   return (
                     <>
                       <div className="flex justify-between items-center text-xs font-black pt-1">
                         <span className="text-primary uppercase tracking-[0.2em]">Order Total</span>
                         <span className="text-primary text-base">{storeSymbol}{itemsTotal}</span>
                       </div>
                     </>
                   );
                 })()}
              </div>
            </div>
          ) : (
            <>
              {order.items.slice(0, 2).map(item => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className={`line-clamp-1 flex-1 pr-4 ${item.status === 'rejected' ? 'line-through text-rose-400 opacity-70' : 'text-muted-foreground'}`}>
                    {t(`products.${item.product.name}`, { defaultValue: item.product.name })}
                    {item.product.quantity && <span className="ml-1 text-[10px] opacity-70">({item.product.quantity})</span>}
                    {item.status === 'rejected' && <span className="ml-1 font-bold text-rose-500">(Rejected)</span>}
                  </span>
                  <span className={`font-bold shrink-0 ${item.status === 'rejected' ? 'text-rose-400 line-through' : 'text-foreground'}`}>
                    × {item.quantity}
                  </span>
                </div>
              ))}
              {order.items.length > 2 && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-px bg-border/40" />
                  <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest whitespace-nowrap">
                    + {order.items.length - 2} More {order.items.length - 2 === 1 ? 'Product' : 'Products'}
                  </span>
                  <div className="flex-1 h-px bg-border/40" />
                </div>
              )}
            </>
          )}
        </div>

      {!['completed', 'rejected', 'cancelled', 'pending'].includes(order.status) && (
        <div className="mt-4 px-2">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowCancelModal(true); }}
            disabled={isCancellingOrder}
            className="w-full py-3 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
            {t('common.receipts.cancel_order')}
          </button>
        </div>
      )}


      {!onClick && store && (
        <div className="mt-4 p-4 glass rounded-[24px] bg-secondary/10 border border-border/40 space-y-4 text-left">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground whitespace-normal line-clamp-2">{store.address}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Store Location</p>
              </div>
            </div>
            <button
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`, '_blank')}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl gradient-primary text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              <Navigation className="w-4 h-4" /> Get Directions
            </button>
          </div>
        </div>
      )}

        {standalone && (
          <div className="absolute bottom-0 left-0 right-0 h-4 flex items-center justify-center overflow-hidden">
             <div className="w-full flex">
                {Array.from({ length: 20 }).map((_, i) => (
                   <div key={i} className="flex-1 h-3 bg-[#202020] dark:bg-[#1A1A1A]" style={{ clipPath: 'polygon(0% 0%, 50% 100%, 100% 0%)' }} />
                ))}
             </div>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showProductsModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-3xl" onClick={() => setShowProductsModal(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card dark:bg-[#1A1A1A] w-full max-w-lg rounded-[2.5rem] flex flex-col max-h-[90vh] shadow-2xl overflow-hidden border border-border/50"
            >
              {/* Modal Header - Fixed Compact Height */}
              <div className="h-[75px] px-6 flex items-center justify-between bg-secondary/20 border-b border-border/10 shrink-0">
                <div className="space-y-0.5">
                  <h2 className="text-base font-black text-foreground tracking-tight uppercase">Shopping List Checklist</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-md w-fit">
                      {checkedCount} / {order.items.length} Checked Off
                    </span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest bg-background/50 px-2 py-0.5 rounded-md w-fit">
                      #{order.id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowProductsModal(false)}
                  className="p-2 rounded-full bg-white text-black shadow-lg hover:bg-white/90 transition-all active:scale-90 border border-black/5 flex items-center justify-center"
                >
                  <X className="w-4 h-4" strokeWidth={3} />
                </button>
              </div>

              {/* Shopping Progress Bar */}
              <div className="px-4 pt-3 pb-1 shrink-0">
                <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px] font-black">
                    <span className="text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-blue-500" /> Checklist Progress
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 font-mono">
                      {checkedCount} of {order.items.length} Items
                    </span>
                  </div>
                  <div className="w-full h-2 bg-blue-500/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                      style={{ width: `${order.items.length > 0 ? (checkedCount / order.items.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {order.items.map((item, idx) => {
                  const isChecked = !!checkedItems[item.product.id];
                  return (
                    <motion.div 
                      key={item.product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={(e) => toggleCheckItem(item.product.id, e)}
                      className={`flex items-center gap-3 p-3 rounded-[1.5rem] border group transition-all cursor-pointer ${
                        isChecked 
                          ? 'bg-emerald-500/10 border-emerald-500/40' 
                          : item.status === 'rejected' ? 'bg-rose-500/10 border-rose-500/30' : 'bg-secondary/5 border-border/20 hover:bg-secondary/10'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => toggleCheckItem(item.product.id, e)}
                        className="p-1 rounded-lg shrink-0 focus:outline-none"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-5 h-5 text-emerald-500 transition-transform active:scale-90" />
                        ) : (
                          <Square className="w-5 h-5 text-muted-foreground/40 hover:text-primary transition-colors active:scale-90" />
                        )}
                      </button>

                      <div className="w-14 h-14 bg-white dark:bg-[#1A1A1A] rounded-xl flex items-center justify-center overflow-hidden border border-border/20 shadow-sm p-1 shrink-0 group-hover:scale-105 transition-transform">
                        {item.product.image ? (
                          <img src={item.product.image} alt={item.product.name} className={`w-full h-full object-contain rounded-lg ${item.status === 'rejected' ? 'grayscale opacity-60' : isChecked ? 'opacity-70' : ''}`} />
                        ) : (
                          <Package className="w-6 h-6 text-muted-foreground opacity-20" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`font-bold text-xs leading-tight truncate ${isChecked ? 'line-through text-emerald-700 dark:text-emerald-400 font-extrabold' : item.status === 'rejected' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {t(`products.${item.product.name}`, { defaultValue: item.product.name })}
                          </h4>
                          {isChecked && (
                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-500/20 px-2 py-0.5 rounded-full uppercase">
                              Checked ✓
                            </span>
                          )}
                          {item.status === 'rejected' && (
                            <span className="text-[9px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full uppercase">
                              Out of Stock
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                            {storeSymbol}{item.product.price}
                          </span>
                          <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                            per unit
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <div className="font-mono font-black text-sm text-foreground bg-secondary/30 px-2 py-0.5 rounded-lg border border-border/30">
                          x{item.quantity}
                        </div>
                        <p className={`text-xs font-black ${item.status === 'rejected' ? 'line-through text-rose-400' : isChecked ? 'text-emerald-600' : 'text-foreground'}`}>
                          {item.status === 'rejected' ? `${storeSymbol}0 (Excluded)` : `${storeSymbol}${item.product.price * item.quantity}`}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Modal Footer - Compact Sticky */}
              <div className="p-4 border-t border-border/10 bg-secondary/10 shrink-0">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-muted-foreground uppercase tracking-widest">Items Subtotal</span>
                  <span className="text-foreground">{storeSymbol}{order.items.reduce((sum, item) => sum + (item.status === 'rejected' ? 0 : item.product.price * item.quantity), 0)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-border/20">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Total Amount</p>
                    <p className="text-2xl font-black text-foreground leading-none">
                      {storeSymbol}{order.items.reduce((sum, item) => sum + (item.status === 'rejected' ? 0 : item.product.price * item.quantity), 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {showCancelModal && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          onClick={(e) => { e.stopPropagation(); setShowCancelModal(false); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-[#1A1A1A] rounded-[2rem] p-6 max-w-sm w-full shadow-2xl border border-white/10 text-center space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-foreground">Cancel Order #{order.id?.slice(-6).toUpperCase()}?</h3>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                Are you sure you want to cancel this order? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-3.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs uppercase tracking-wider transition-all"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={isCancellingOrder}
                onClick={confirmCancelOrder}
                className="flex-1 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCancellingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Cancel'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  </>
);
};
