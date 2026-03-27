import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ServiceBooking, Store, Order } from '@/types';
import { Trash2, CheckCircle2, Circle, Clock, Star, MapPin, Navigation, Phone, User as UserIcon, KeyRound, Package, Share2, Copy, EyeOff } from 'lucide-react';
import MapView from './MapView';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  accepted: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
  packed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  ready: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  rejected: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  packed: 'Packed',
  ready: 'Ready',
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
  standalone = false
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
}) => {
  const store = getStoreForOrder(booking.storeId);
  const [showContact, setShowContact] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  return (
    <motion.div
      key={booking.id}
      initial={standalone ? { opacity: 1 } : { opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-2xl p-5 transition-all relative ${onClick || showSelection ? 'cursor-pointer hover:shadow-lg active:scale-[0.98]' : ''} overflow-hidden ${isSelected ? 'ring-2 ring-primary ring-inset bg-primary/5 shadow-inner' : ''}`}
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
      {/* Removed Absolute Share Button */}

      {booking.status === 'pending' && store?.image && (
        <div className="-mx-5 -mt-5 mb-4 h-32 relative group overflow-hidden">
          <img 
            src={store.image} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            alt={store.name}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/20">
                <UserIcon className="w-3 h-3 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white leading-none">{store.name}</h4>
                {vendorInfo?.name && <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-1">Owner: {vendorInfo.name}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {booking.status === 'completed' && !review.submitted && onClick && (
        <div className="absolute top-3 left-3 bg-amber-400 dark:bg-amber-500 text-black text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest animate-pulse border border-amber-500/50 flex items-center gap-1.5 shadow-md backdrop-blur-sm z-10">
          <Star className="w-2.5 h-2.5 fill-current" />
          Give Review
        </div>
      )}

      <div className={`flex items-start justify-between mb-4 ${booking.status === 'completed' && !review.submitted && onClick ? 'pt-8' : ''}`}>
        <div className="flex-1 min-w-0 pr-12">
          {!onClick && (
            <div className="flex items-center gap-2 mb-1">
               <span className="text-[10px] font-mono text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded tracking-tighter shrink-0">{booking.id?.slice(0, 8)}</span>
               <div className="h-[1px] flex-1 bg-border/20" />
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
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {booking.storeName.charAt(0)}
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

      {!onClick && booking.status === 'completed' && !review.submitted && (
        <div className="mt-8 space-y-6 text-left p-6 rounded-3xl bg-[#1A1A1A] border border-white/5 shadow-2xl">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Customer Review</h3>
            <p className="text-xs text-white/50">How was your experience with {booking.storeName}?</p>
          </div>

          <div className="flex gap-2.5 py-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => onRate(star)}
                className="transition-transform active:scale-90"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= review.rating 
                      ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]' 
                      : 'text-white/20 stroke-[1.5]'
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="space-y-4">
             <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Review Details</span>
                <div className="h-[1px] flex-1 bg-white/10" />
             </div>

             <textarea
               value={review.text}
               onChange={(e) => onReviewChange(e.target.value)}
               placeholder="Tell us what you liked (optional)..."
               className="w-full min-h-[120px] p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-sm text-white focus:border-amber-500/50 outline-none transition-all resize-none shadow-inner"
             />
             
             <div 
               onClick={() => onAnonymous(!review.isAnonymous)}
               className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/[0.04] transition-all group"
             >
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-white/20">
                      <EyeOff className="w-5 h-5 text-white/40" />
                   </div>
                   <div>
                      <h4 className="text-xs font-bold text-white">Review as Anonymous</h4>
                      <p className="text-[10px] text-white/40 mt-0.5 font-medium">Hide your name from public view</p>
                   </div>
                </div>
                
                <div className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${review.isAnonymous ? 'bg-amber-500' : 'bg-white/10'}`}>
                   <div className={`absolute top-[2px] left-[2px] w-[20px] h-[20px] bg-white rounded-full transition-transform shadow-md ${review.isAnonymous ? 'translate-x-[24px]' : 'translate-x-0'}`} />
                </div>
             </div>
             
             <button
               onClick={onSubmit}
               disabled={review.rating === 0}
               className={`w-full py-4 rounded-[1.25rem] text-sm font-black transition-all ${
                 review.rating > 0 
                   ? 'bg-amber-500 text-black shadow-[0_8px_20px_-4px_rgba(245,158,11,0.3)] hover:scale-[1.01] active:scale-95' 
                   : 'bg-white/5 text-white/20 cursor-not-allowed'
               }`}
             >
               Submit Review
             </button>
          </div>
        </div>
      )}

      {!onClick && booking.status === 'completed' && review.submitted && (
        <div className="mt-8 p-6 rounded-3xl bg-[#1A1A1A] border border-white/5 text-left">
           <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-black text-white uppercase tracking-tight">Review Submitted</h4>
                  {review.submittedAt && (
                    <span className="text-[9px] text-white/30 font-bold tracking-wider">
                      {new Date(review.submittedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </span>
                  )}
                </div>
                <div className="flex gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-2.5 h-2.5 ${star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-white/10'}`}
                    />
                  ))}
                </div>
              </div>
           </div>
           {review.text?.trim() && (
             <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-sm text-white/70 italic leading-relaxed">
                "{review.text}"
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
          <div className="w-full h-40 rounded-2xl overflow-hidden border border-border/30 relative z-0">
            <MapView
              stores={[store]}
              center={userCoords || [store.lat, store.lng]}
              showRoute={!!userCoords}
              centerLabel={userCoords ? "Your Location" : store.name}
            />
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
  standalone = false
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
}) => {
  const store = getStoreForOrder(order.storeId);
  const [showContact, setShowContact] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  return (
    <motion.div
      key={order.id}
      initial={standalone ? { opacity: 1 } : { opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-2xl p-5 transition-all relative ${onClick || showSelection ? 'cursor-pointer hover:shadow-lg active:scale-[0.98]' : ''} overflow-hidden ${isSelected ? 'ring-2 ring-primary ring-inset bg-primary/5 shadow-inner' : ''}`}
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
        {/* Removed Absolute Share Button */}

      {order.status === 'pending' && store?.image && (
        <div className="-mx-5 -mt-5 mb-4 h-32 relative group overflow-hidden">
          <img 
            src={store.image} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            alt={store.name}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/20">
                <UserIcon className="w-3 h-3 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white leading-none text-left">{store.name}</h4>
                {vendorInfo?.name && <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-1 text-left">Owner: {vendorInfo.name}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {order.status === 'completed' && !review.submitted && onClick && (
        <div className="absolute top-3 left-3 bg-amber-400 dark:bg-amber-500 text-black text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest animate-pulse border border-amber-500/50 flex items-center gap-1.5 shadow-md backdrop-blur-sm z-10">
          <Star className="w-2.5 h-2.5 fill-current" />
          Rate Now
        </div>
      )}

      <div className={`flex items-start justify-between mb-4 ${order.status === 'completed' && !review.submitted && onClick ? 'pt-8' : ''}`}>
        <div className="flex-1 min-w-0 pr-4 text-left">
          {!onClick && (
            <div className="flex items-center gap-2 mb-1">
               <span className="text-[10px] font-mono text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded tracking-tighter shrink-0">{order.id?.slice(0, 10)}</span>
               <div className="h-[1px] flex-1 bg-border/20" />
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
            <button 
              onClick={(e) => { e.stopPropagation(); handleShare(order.id, 'order', order.storeName); }}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground/70 hover:bg-white/10 hover:text-foreground transition-all shadow-xl backdrop-blur-md"
              title="Share Order"
            >
              <Share2 className="w-4 h-4" />
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
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {order.storeName.charAt(0)}
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
              className="bg-amber-500/5 rounded-2xl p-4 border border-amber-500/20 text-left"
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

      {order.pickupCode && (
        <div className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-3 flex items-center justify-between border border-amber-200/60 dark:border-amber-700/40 text-left">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Order PIN</p>
              <p className="text-lg font-black text-foreground tracking-[0.3em] font-mono">{order.pickupCode}</p>
            </div>
          </div>
          <span className="text-[8px] font-black text-amber-600/60 dark:text-amber-400/60 uppercase tracking-widest">
            {order.status === 'completed' ? 'Verified ✓' : 'Verify for Pickup'}
          </span>
        </div>
      )}

      <div className="space-y-2 text-left">
        {order.items.map(item => (
          <div key={item.product.id} className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {item.product.name}
              {item.product.quantity && <span className="ml-1 text-[10px] opacity-70">({item.product.quantity})</span>}
              {" "}× {item.quantity}
            </span>
            <span className="text-foreground font-medium">₹{item.product.price * item.quantity}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-border mt-3 pt-3 flex justify-between items-center text-left">
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          {order.paymentMethod === 'online' ? '💳 Paid' : '💵 Unpaid'}
        </span>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider leading-none">Total</p>
          <p className="font-bold text-lg text-foreground">₹{order.total}</p>
        </div>
      </div>

      {!onClick && order.status === 'completed' && !review.submitted && (
        <div className="mt-8 space-y-6 text-left p-6 rounded-3xl bg-[#1A1A1A] border border-white/5 shadow-2xl">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Customer Review</h3>
            <p className="text-xs text-white/50">How was your experience with {order.storeName}?</p>
          </div>

          <div className="flex gap-2.5 py-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => onRate(star)}
                className="transition-transform active:scale-90"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= review.rating 
                      ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]' 
                      : 'text-white/20 stroke-[1.5]'
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="space-y-4">
             <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Review Details</span>
                <div className="h-[1px] flex-1 bg-white/10" />
             </div>

             <textarea
               value={review.text}
               onChange={(e) => onReviewChange(e.target.value)}
               placeholder="Tell us what you liked (optional)..."
               className="w-full min-h-[120px] p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-sm text-white focus:border-amber-500/50 outline-none transition-all resize-none shadow-inner"
             />
             
             <div 
               onClick={() => onAnonymous(!review.isAnonymous)}
               className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/[0.04] transition-all group"
             >
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-white/20">
                      <EyeOff className="w-5 h-5 text-white/40" />
                   </div>
                   <div>
                      <h4 className="text-xs font-bold text-white">Review as Anonymous</h4>
                      <p className="text-[10px] text-white/40 mt-0.5 font-medium">Hide your name from public view</p>
                   </div>
                </div>
                
                <div className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${review.isAnonymous ? 'bg-amber-500' : 'bg-white/10'}`}>
                   <div className={`absolute top-[2px] left-[2px] w-[20px] h-[20px] bg-white rounded-full transition-transform shadow-md ${review.isAnonymous ? 'translate-x-[24px]' : 'translate-x-0'}`} />
                </div>
             </div>
             
             <button
               onClick={onSubmit}
               disabled={review.rating === 0}
               className={`w-full py-4 rounded-[1.25rem] text-sm font-black transition-all ${
                 review.rating > 0 
                   ? 'bg-amber-500 text-black shadow-[0_8px_20px_-4px_rgba(245,158,11,0.3)] hover:scale-[1.01] active:scale-95' 
                   : 'bg-white/5 text-white/20 cursor-not-allowed'
               }`}
             >
               Submit Review
             </button>
          </div>
        </div>
      )}

      {!onClick && order.status === 'completed' && review.submitted && (
        <div className="mt-8 p-6 rounded-3xl bg-[#1A1A1A] border border-white/5 text-left">
           <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-black text-white uppercase tracking-tight">Review Submitted</h4>
                  {review.submittedAt && (
                    <span className="text-[9px] text-white/30 font-bold tracking-wider">
                      {new Date(review.submittedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </span>
                  )}
                </div>
                <div className="flex gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-2.5 h-2.5 ${star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-white/10'}`}
                    />
                  ))}
                </div>
              </div>
           </div>
           {review.text?.trim() && (
             <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-sm text-white/70 italic leading-relaxed">
                "{review.text}"
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
          <div className="w-full h-40 rounded-2xl overflow-hidden border border-border/30 relative z-0">
            <MapView
              stores={[store]}
              center={userCoords || [store.lat, store.lng]}
              showRoute={!!userCoords}
              centerLabel={userCoords ? "Your Location" : store.name}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};
