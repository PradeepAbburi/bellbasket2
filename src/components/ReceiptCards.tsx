import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ServiceBooking, Store, Order } from '@/types';
import { getAvatarUrl } from '@/utils/avatars';
import { Trash2, CheckCircle2, Circle, Clock, Star, MapPin, Navigation, Phone, User as UserIcon, KeyRound, Package, Share2, Copy, EyeOff, X, AlertCircle } from 'lucide-react';
import MapView from './MapView';
import { toast } from 'sonner';
import { useApp } from '@/context/AppContext';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  accepted: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
  packed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  ready: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  out_for_delivery: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  rejected: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  packed: 'Packed',
  ready: 'Ready for Pickup',
  out_for_delivery: 'Out for Delivery',
  completed: 'Completed',
  rejected: 'Order Rejected',
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
  hasReviewedStore = false
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
}) => {
  const store = getStoreForOrder(booking.storeId);
  const [showContact, setShowContact] = useState(false);
  const [showCancelNote, setShowCancelNote] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

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

      {booking.status === 'pending' && store?.image && (
        <div className="-mx-5 -mt-5 mb-4 h-32 relative group overflow-hidden">
          <img 
            src={store.image} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            alt={store.name}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
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
              className="w-full py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2 animate-pulse"
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
          <span className="font-medium">Scheduled for:</span> {booking.date} at {formatTo12Hr(booking.timeSlot)}
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

      {!['completed', 'rejected'].includes(booking.status) && (
        <div className="mt-4 px-2">
          {!showCancelNote ? (
            <button 
              onClick={(e) => { e.stopPropagation(); setShowCancelNote(true); }}
              className="w-full py-3 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20"
            >
              <X className="w-3.5 h-3.5" />
              {t('common.receipts.cancel_booking')}
            </button>
          ) : (
            <div className="px-4 py-2.5 rounded-xl bg-rose-500/5 border border-rose-500/10 flex items-center gap-3 text-left animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest leading-tight">
                {t('common.receipts.cancel_booking_note')}
              </p>
            </div>
          )}
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
  hasReviewedStore = false
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
}) => {
  const store = getStoreForOrder(order.storeId);
  const [showContact, setShowContact] = useState(false);
  const [showCancelNote, setShowCancelNote] = useState(false);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const { setIsAnyModalOpen } = useApp();
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

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

        {order.status === 'pending' && store?.image && (
          <div className="-mx-5 -mt-5 mb-4 h-32 relative group overflow-hidden">
            <img 
              src={store.image} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
              alt={store.name}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-4">
              <div className="absolute top-4 right-4 z-10">
                <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center gap-2 transition-all hover:scale-105 border-2 border-white/20 ${
                  order.deliveryMethod === 'delivery' 
                    ? 'bg-rose-600 text-white' 
                    : 'bg-emerald-600 text-white'
                }`}>
                  {order.deliveryMethod === 'delivery' ? 'Delivery' : 'Pickup'}
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

        <div className={`flex items-start justify-between mb-4`}>
          <div className="flex-1 min-w-0 pr-4 text-left">
            {!onClick && (
              <div className="flex items-center gap-2 mb-1">
                 <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">#{order.id?.slice(-6).toUpperCase()}</span>
              </div>
            )}
            <h3 className="font-bold text-foreground text-lg leading-tight truncate">{order.storeName}</h3>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1.5 mt-2">
              {new Date(order.date).toLocaleDateString()}
              <span className="w-1 h-1 rounded-full bg-border" />
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
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border shadow-sm ${statusColors[order.status] || statusColors.pending}`}>
                {order.status === 'completed' && order.deliveryMethod === 'delivery' ? 'Delivered' : 
                 t(`common.order_status.${order.status}`, { defaultValue: statusLabels[order.status] || order.status.toUpperCase() })}
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
                  className="w-full h-full py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2 animate-pulse"
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
              {!showCancelNote ? (
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowCancelNote(true); }}
                  className="w-full h-full py-3 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20"
                >
                  <X className="w-3.5 h-3.5" />
                  {t('common.receipts.cancel_order')}
                </button>
              ) : (
                <div 
                  onClick={(e) => { e.stopPropagation(); setShowCancelNote(false); }}
                  className="h-full px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col justify-center gap-1 text-left animate-in fade-in slide-in-from-right-2 duration-300 cursor-pointer hover:bg-rose-500/20 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                    <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest">Hide Note</span>
                  </div>
                  <p className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest leading-tight">
                    {t('common.receipts.cancel_order_note')}
                  </p>
                </div>
              )}
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
                ₹{(() => {
                  const itemsTotal = order.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
                  return itemsTotal + (order.deliveryFee || 0);
                })()}
              </p>
            </div>
          </div>
        )}

        {(order.deliveryMethod === 'delivery' || order.paymentMethod === 'delivery') && (
          <div className="mb-4 p-4 rounded-2xl bg-primary/5 border border-primary/10 text-left space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Package className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Delivery Information</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-primary/10">
              <div>
                <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Customer Name</p>
                <p className="text-xs font-bold text-foreground">{order.userName || 'Customer'}</p>
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Contact Phone</p>
                <p className="text-xs font-bold text-foreground">{order.userPhone || 'Not Provided'}</p>
              </div>
            </div>
            
            <div>
              <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Delivery Address</p>
              <p className="text-xs font-medium text-foreground leading-relaxed italic">{order.customerAddress || 'No Address Provided'}</p>
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
              {order.items.map((item, idx) => (
                <div key={item.product.id} className="flex items-center gap-3 p-3 rounded-[1.5rem] bg-secondary/5 border border-border/20 shadow-sm">
                   <div className="w-14 h-14 bg-white dark:bg-[#1A1A1A] rounded-xl flex items-center justify-center overflow-hidden border border-border/20 shadow-sm p-1 shrink-0">
                      {item.product.image ? (
                        <img src={item.product.image} alt={item.product.name} className="w-full h-full object-contain rounded-lg" />
                      ) : (
                        <Package className="w-6 h-6 text-muted-foreground opacity-30" />
                      )}
                   </div>
                   <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-foreground leading-tight break-words">{t(`products.${item.product.name}`, { defaultValue: item.product.name })}</p>
                      {item.product.quantity && (
                        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1 opacity-80">{item.product.quantity}</p>
                      )}
                      <p className="text-[9px] font-black text-primary mt-1.5 opacity-90">
                        ₹{item.product.price} / unit
                      </p>
                   </div>
                   <div className="flex flex-col items-end gap-0.5 shrink-0 ml-4">
                      <div className="font-mono font-black text-sm text-primary bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">
                        x{item.quantity}
                      </div>
                      <p className="text-[10px] font-bold text-muted-foreground">
                        ₹{item.product.price * item.quantity}
                      </p>
                   </div>
                </div>
              ))}
              
              {/* Detailed Summary for Standalone Receipts */}
              <div className="p-4 rounded-[1.5rem] bg-primary/5 border border-primary/10 space-y-2 mt-4 mb-6">
                 {(() => {
                   const itemsTotal = order.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
                   const deliveryFee = order.deliveryFee || 0;
                   return (
                     <>
                       <div className="flex justify-between items-center text-[10px] font-bold">
                         <span className="text-muted-foreground uppercase tracking-[0.2em]">Subtotal</span>
                         <span className="text-foreground">₹{itemsTotal}</span>
                       </div>
                       {deliveryFee > 0 && (
                         <div className="flex justify-between items-center text-[10px] font-bold">
                           <span className="text-muted-foreground uppercase tracking-[0.2em]">Delivery Fee</span>
                           <span className="text-foreground">+ ₹{deliveryFee}</span>
                         </div>
                       )}
                       <div className="flex justify-between items-center text-xs font-black pt-2 border-t border-primary/10">
                         <span className="text-primary uppercase tracking-[0.2em]">Order Total</span>
                         <span className="text-primary text-base">₹{itemsTotal + deliveryFee}</span>
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
                  <span className="text-muted-foreground line-clamp-1 flex-1 pr-4">
                    {t(`products.${item.product.name}`, { defaultValue: item.product.name })}
                    {item.product.quantity && <span className="ml-1 text-[10px] opacity-70">({item.product.quantity})</span>}
                  </span>
                  <span className="text-foreground font-bold shrink-0">
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

      {!['completed', 'rejected', 'pending'].includes(order.status) && (
        <div className="mt-4 px-2">
          {!showCancelNote ? (
            <button 
              onClick={(e) => { e.stopPropagation(); setShowCancelNote(true); }}
              className="w-full py-3 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20"
            >
              <X className="w-3.5 h-3.5" />
              {t('common.receipts.cancel_order')}
            </button>
          ) : (
            <div 
              onClick={(e) => { e.stopPropagation(); setShowCancelNote(false); }}
              className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-left animate-in fade-in slide-in-from-top-2 duration-300 cursor-pointer hover:bg-rose-500/20 transition-colors"
            >
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest leading-tight">
                  {t('common.receipts.cancel_order_note')}
                </p>
                <p className="text-[8px] font-bold text-rose-500/60 uppercase tracking-tighter mt-0.5">Click to hide</p>
              </div>
            </div>
          )}
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
              <div className="h-[70px] px-6 flex items-center justify-between bg-secondary/20 border-b border-border/10 shrink-0">
                <div className="space-y-0.5">
                  <h2 className="text-lg font-black text-foreground tracking-tight uppercase">Order Items</h2>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest bg-background/50 px-2 py-0.5 rounded-md w-fit">
                    #{order.id.slice(-6).toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={() => setShowProductsModal(false)}
                  className="p-2 rounded-full bg-white text-black shadow-lg hover:bg-white/90 transition-all active:scale-90 border border-black/5 flex items-center justify-center"
                >
                  <X className="w-4 h-4" strokeWidth={3} />
                </button>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {order.items.map((item, idx) => (
                  <motion.div 
                    key={item.product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-[1.5rem] bg-secondary/5 border border-border/20 group hover:bg-secondary/10 transition-all"
                  >
                    <div className="w-14 h-14 bg-white dark:bg-[#1A1A1A] rounded-xl flex items-center justify-center overflow-hidden border border-border/20 shadow-sm p-1 shrink-0 group-hover:scale-105 transition-transform">
                      {item.product.image ? (
                        <img src={item.product.image} alt={item.product.name} className="w-full h-full object-contain rounded-lg" />
                      ) : (
                        <Package className="w-6 h-6 text-muted-foreground opacity-20" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-foreground leading-tight truncate">
                        {t(`products.${item.product.name}`, { defaultValue: item.product.name })}
                      </h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                          ₹{item.product.price}
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
                      <p className="text-xs font-black text-foreground">
                        ₹{item.product.price * item.quantity}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Modal Footer - Compact Sticky */}
              <div className="p-4 border-t border-border/10 bg-secondary/10 shrink-0">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-muted-foreground uppercase tracking-widest">Items Subtotal</span>
                  <span className="text-foreground">₹{order.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)}</span>
                </div>
                {order.deliveryFee > 0 && (
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-muted-foreground uppercase tracking-widest">Delivery Fee</span>
                    <span className="text-foreground">+ ₹{order.deliveryFee}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t border-border/20">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Total Amount</p>
                    <p className="text-2xl font-black text-foreground leading-none">
                      ₹{order.items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0) + (order.deliveryFee || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  </>
);
};
