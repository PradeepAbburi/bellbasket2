import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import MapView from '@/components/MapView';
import { Helmet } from 'react-helmet';
import PullToRefresh from '@/components/ui/PullToRefresh';
import { useApp } from '@/context/AppContext';
import { doc, updateDoc, arrayUnion, setDoc, getDoc, deleteDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { ServiceBooking, Store, Order } from '@/types';
import { Trash2, CheckCircle2, Circle, RefreshCcw, Package, Clock, Star, ArrowLeft, MapPin, Navigation, Loader2, EyeOff, KeyRound, Phone, User as UserIcon, BellRing } from 'lucide-react';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { sendInAppNotification } from '@/utils/notifications';


const statusColors: Record<string, string> = {
  pending: 'bg-muted/50 text-muted-foreground',
  accepted: 'bg-primary/20 text-primary',
  packed: 'bg-accent/20 text-accent',
  completed: 'bg-accent/20 dark:bg-accent/10 text-accent dark:text-accent-foreground',
  rejected: 'bg-destructive/10 text-destructive',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  packed: 'Packed',
  completed: 'Completed',
  rejected: 'Order Rejected',
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-IN', { month: 'short' });
  const year = date.getFullYear();
  return `${day} - ${month} - ${year}`;
};

const RenderBookingCard = ({
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
  vendorInfo
}: {
  booking: ServiceBooking;
  i: number;
  review: { rating: number; text: string; isAnonymous?: boolean; submitted: boolean };
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
}) => {
  const store = getStoreForOrder(booking.storeId);
  const [showContact, setShowContact] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (showSelection) return;
    longPressTimer.current = setTimeout(() => {
      onLongPress?.();
      if (window.navigator.vibrate) window.navigator.vibrate(60);
    }, 450);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  return (
    <motion.div
      key={booking.id}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.08 }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => {
        if (!showSelection) e.preventDefault();
      }}
      onClick={showSelection ? onToggleSelect : onClick}
      className={`glass rounded-2xl p-5 transition-all relative ${onClick || showSelection ? 'cursor-pointer hover:shadow-lg active:scale-[0.98]' : ''} overflow-hidden ${isSelected ? 'ring-2 ring-primary ring-inset bg-primary/5 shadow-inner' : ''}`}
    >
      <AnimatePresence>
        {showSelection && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/90 dark:bg-[#202020] shadow-lg border border-primary/20 hover:scale-110 active:scale-90 transition-all"
          >
            {isSelected ? (
              <CheckCircle2 className="w-5 h-5 text-primary fill-primary" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground/20" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Pending Banner On Top */}
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
        <div className="absolute top-3 left-3 bg-accent/10 dark:bg-accent/20 text-accent text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest animate-pulse border border-accent/20 flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
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
              {booking.timeSlot}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
           <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm ring-1 ring-inset ${
             booking.status === 'completed' ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 ring-green-200 dark:ring-green-500/20' : 
             booking.status === 'accepted' ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-200 dark:ring-amber-500/20' : 
             booking.status === 'rejected' ? 'bg-destructive/10 text-destructive ring-destructive/20' : 
             'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 ring-orange-200 dark:ring-orange-500/20'
           }`}>
             {t(`common.order_status.${booking.status}`, { defaultValue: booking.status.toUpperCase() })}
           </span>
        </div>
      </div>

      {/* Vendor Details Box - Only show if not pending or if contact is requested */}
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

      {/* Acceptance Note for Pending */}
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

      {/* Booking PIN Section */}
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

      <div className="space-y-2 mt-4 text-sm text-foreground">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-medium">Scheduled for:</span> {booking.date} at {booking.timeSlot}
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
            <p className="font-semibold text-foreground mb-1">Details provided:</p>
            {booking.description}
          </div>
        )}
      </div>

      {/* Map & Directions Section */}
      {!onClick && store && (
        <div className="mt-4 p-4 glass rounded-[24px] bg-secondary/10 border border-border/40 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{store.address}</p>
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

      {onClick && (
        <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
          <span className="text-xs font-bold text-primary flex items-center gap-1">
            {booking.status === 'completed' ? <Package className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {booking.status === 'completed'
              ? (review.submitted ? 'Completed' : 'Completed • Give Review')
              : 'View Booking Details'}
          </span>
          {review.submitted && (
            <div className="flex text-primary">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-3 h-3" fill={s <= review.rating ? 'currentColor' : 'none'} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Section */}
      {booking.status === 'completed' && !onClick && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-6 pt-6 border-t border-border space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-foreground text-sm">Service Review</h4>
              <p className="text-[10px] text-muted-foreground font-medium">How was your service experience at {booking.storeName}?</p>
            </div>
            {review.submitted && (
              <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Submitted</span>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  disabled={review.submitted}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRate(star);
                  }}
                  className={`transition-all ${star <= review.rating ? 'text-primary' : 'text-muted-foreground/30'} ${!review.submitted ? 'hover:scale-125' : ''}`}
                >
                  <Star className={`w-6 h-6 ${star <= review.rating ? 'fill-primary' : 'text-muted-foreground/30'}`} fill={star <= review.rating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>

            {!review.submitted ? (
              <div className="space-y-3 pt-2">
                <textarea
                  placeholder="Tell us about the service (optional)..."
                  value={review.text}
                  onChange={(e) => onReviewChange(e.target.value)}
                  className="w-full bg-secondary/30 rounded-xl p-4 text-sm text-foreground outline-none border border-border/50 focus:border-primary/30 transition-all min-h-[100px] resize-none"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAnonymous(!review.isAnonymous);
                      }}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${review.isAnonymous ? 'bg-primary border-primary text-white' : 'border-border'}`}
                    >
                      {review.isAnonymous && <CheckCircle2 className="w-3 h-3" />}
                    </button>
                    <span className="text-xs text-muted-foreground">Review as Anonymous</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSubmit();
                    }}
                    className="gradient-primary text-white px-6 py-2 rounded-xl text-xs font-bold"
                  >
                    Submit Review
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                <p className="text-sm text-foreground italic">"{review.text || 'Excellent service!'}"</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

const RenderOrderCard = ({
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
  vendorInfo
}: {
  order: Order;
  i: number;
  review: { rating: number; text: string; isAnonymous?: boolean; submitted: boolean };
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
}) => {
  const store = getStoreForOrder(order.storeId);
  const [showContact, setShowContact] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (showSelection) return;
    longPressTimer.current = setTimeout(() => {
      onLongPress?.();
      if (window.navigator.vibrate) window.navigator.vibrate(60);
    }, 450);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  return (
    <motion.div
      key={order.id}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.08 }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => {
        if (!showSelection) e.preventDefault();
      }}
      onClick={showSelection ? onToggleSelect : onClick}
      className={`glass rounded-2xl p-5 transition-all relative ${onClick || showSelection ? 'cursor-pointer hover:shadow-lg active:scale-[0.98]' : ''} overflow-hidden ${isSelected ? 'ring-2 ring-primary ring-inset bg-primary/5 shadow-inner' : ''}`}
    >
      <AnimatePresence>
        {showSelection && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/90 dark:bg-[#202020] shadow-lg border border-primary/20 hover:scale-110 active:scale-90 transition-all"
          >
            {isSelected ? (
              <CheckCircle2 className="w-5 h-5 text-primary fill-primary" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground/20" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Pending Banner On Top */}
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
                <h4 className="text-sm font-black text-white leading-none">{store.name}</h4>
                {vendorInfo?.name && <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-1">Owner: {vendorInfo.name}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {order.status === 'completed' && !review.submitted && onClick && (
        <div className="absolute top-3 left-3 bg-primary/10 dark:bg-primary/20 text-primary text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest animate-pulse border border-primary/20 flex items-center gap-1.5 shadow-sm backdrop-blur-sm">
          <Star className="w-2.5 h-2.5 fill-current" />
          Rate Now
        </div>
      )}

      <div className={`flex items-start justify-between mb-4 ${order.status === 'completed' && !review.submitted && onClick ? 'pt-8' : ''}`}>
        <div className="flex-1 min-w-0 pr-12">
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
            {new Date(order.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
          </p>
        </div>
        <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm ring-1 ring-inset ${statusColors[order.status]} ${order.status === 'completed' ? 'ring-accent/20' : 'ring-primary/10'}`}>
          {t(`common.order_status.${order.status}`, { defaultValue: statusLabels[order.status] || order.status.toUpperCase() })}
        </span>
      </div>

      {/* Vendor Details Box - Only show if not pending or if contact is requested */}
      {(order.status !== 'pending' || showContact) && (
        <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
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

      {order.status === 'rejected' ? (
        <div className="w-full bg-destructive/10 text-destructive text-xs font-bold p-3 rounded-lg text-center mb-4 border border-destructive/20">
          Order Rejected.
        </div>
      ) : order.status === 'completed' ? null : (
        <>
      {/* Acceptance Note for Pending */}
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
          <div className="flex items-center gap-1 mb-4">
            {['pending', 'accepted', 'packed', 'completed'].map((step, si) => {
              const steps = ['pending', 'accepted', 'packed', 'completed'];
              const currentIdx = steps.indexOf(order.status);
              const active = si <= currentIdx;
              return <div key={step} className={`h-1.5 flex-1 rounded-full ${active ? 'gradient-primary' : 'bg-secondary'}`} />;
            })}
          </div>
        </>
      )}

      {/* Pickup Code - Amber Style for Consistency */}
      {order.pickupCode && (
        <div className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-3 flex items-center justify-between border border-amber-200/60 dark:border-amber-700/40">
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

      {/* Cancellation Section */}
      {order.status !== 'completed' && order.status !== 'rejected' && (
        <div className="mb-4 bg-destructive/5 rounded-2xl p-4 border border-destructive/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Phone className="w-4 h-4 text-destructive animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-black text-foreground uppercase tracking-tight">Need to cancel?</h4>
              <p className="text-[10px] text-muted-foreground font-medium">Call vendor & quote PIN <span className="text-destructive font-bold">{order.pickupCode || 'Order ID'}</span></p>
            </div>
          </div>
          <a
            href={`tel:${order.storePhone || storePhone}`}
            onClick={(e) => e.stopPropagation()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-destructive text-white text-[11px] font-black uppercase tracking-widest hover:bg-destructive/90 transition-all shadow-lg shadow-destructive/20"
          >
            <Phone className="w-3.5 h-3.5" />
            Call Store to Cancel
          </a>
        </div>
      )}

      <div className="space-y-2">
        {order.items.map(item => (
          <div key={item.product.id} className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {item.product.name}
              {item.product.quantity && <span className="ml-1 text-[10px] opacity-70">({item.product.quantity.includes(' - ') ? item.product.quantity : item.product.quantity.replace(/([0-9.]+)([a-zA-Z]+)/, '$1 - $2')})</span>}
              {" "}× {item.quantity}
            </span>
            <span className="text-foreground font-medium">₹{item.product.price * item.quantity}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-border mt-3 pt-3 flex justify-between items-center">
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          {order.paymentMethod === 'online' ? '💳 Paid' : '💵 Unpaid'}
        </span>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider leading-none">Total</p>
          <p className="font-bold text-lg text-foreground">₹{order.total}</p>
        </div>
      </div>

      {/* Map & Directions for Expanded View */}
      {!onClick && store && (
        <div className="mt-4 p-4 glass rounded-[24px] bg-secondary/10 border border-border/40 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <MapPin className="w-5 h-5" />
              </div>
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  const query = (store.lat && store.lng) ? `${store.lat},${store.lng}` : encodeURIComponent(store.address);
                  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                }}
                className="min-w-0 cursor-pointer hover:text-primary transition-all group"
              >
                <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">{store.address}</p>
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

      {onClick && (
        <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
          <span className="text-xs font-bold text-primary flex items-center gap-1">
            {order.status === 'completed' ? <Package className="w-3 h-3" /> : <Navigation className="w-3 h-3" />}
            {order.status === 'completed'
              ? (review.submitted ? 'Completed' : 'Completed • Rate Now')
              : 'Track Order & View Map'}
          </span>
          {review.submitted && (
            <div className="flex text-primary">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-3 h-3" fill={s <= review.rating ? 'currentColor' : 'none'} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Section */}
      {order.status === 'completed' && !onClick && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-6 pt-6 border-t border-border space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-foreground text-sm">Customer Review</h4>
              <p className="text-[10px] text-muted-foreground font-medium">How was your experience with {order.storeName}?</p>
            </div>
            {review.submitted && (
              <span className="text-[10px] bg-accent/10 text-accent px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Submitted</span>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  disabled={review.submitted}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRate(star);
                  }}
                  className={`transition-all ${star <= review.rating ? 'text-primary' : 'text-muted-foreground/30'} ${!review.submitted ? 'hover:scale-125' : ''}`}
                >
                  <Star className={`w-6 h-6 ${star <= review.rating ? 'fill-primary' : 'text-muted-foreground/30'}`} fill={star <= review.rating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>

            {!review.submitted ? (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">Review Details</span>
                  <div className="h-[1px] flex-1 bg-border/30" />
                </div>
                <textarea
                  placeholder="Tell us what you liked (optional)..."
                  value={review.text}
                  onChange={(e) => onReviewChange(e.target.value)}
                  className="w-full bg-secondary/30 rounded-xl p-4 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border/50 focus:border-primary/30 transition-all min-h-[100px] resize-none"
                />

                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg transition-colors ${review.isAnonymous ? 'bg-primary/20 text-primary' : 'bg-secondary/50 text-muted-foreground'}`}>
                      <EyeOff className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Review as Anonymous</p>
                      <p className="text-[10px] text-muted-foreground">Hide your name from public view</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAnonymous(!review.isAnonymous);
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative ${review.isAnonymous ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${review.isAnonymous ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSubmit();
                  }}
                  className="w-full gradient-primary text-primary-foreground py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20"
                >
                  Submit Review
                </button>
              </div>
            ) : (
              <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                <div className="flex text-primary mb-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4" fill={s <= review.rating ? 'currentColor' : 'none'} />
                  ))}
                </div>
                <p className="text-sm text-foreground italic">"{review.text || 'Excellent products!'}"</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

const Receipts = () => {
  const { user, loading, stores, orders, serviceBookings, refreshData } = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const { requestPushNotifications } = useApp();
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [reviews, setReviews] = useState<Record<string, { rating: number; text: string; isAnonymous: boolean; submitted: boolean }>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<'orders' | 'bookings'>('orders');
  const [view, setView] = useState<'active' | 'history'>('active');
  const [vendorInfoState, setVendorInfoState] = useState<Record<string, { phone: string; name: string }>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    const checkPermission = () => {
      setNotificationPermission(Notification.permission);
    };
    window.addEventListener('focus', checkPermission);
    return () => window.removeEventListener('focus', checkPermission);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    toast.info("Refreshing receipts...");
    window.location.reload();
  };

  // No more manual fetches needed as data is denormalized or in global stores state
  useEffect(() => {
    setSelectedIds([]);
  }, [filterType, view]);


  const handleRating = (orderId: string, rating: number) => {
    setReviews(prev => ({ ...prev, [orderId]: { ...prev[orderId], rating, submitted: false } }));
  };

  const handleAnonymous = (orderId: string, isAnonymous: boolean) => {
    setReviews(prev => ({ ...prev, [orderId]: { ...prev[orderId], isAnonymous } }));
  };

  const getStoreForOrder = (storeId: string): Store | undefined => {
    return stores.find(s => s.id === storeId);
  };

  const handleReviewSubmit = async (id: string, type: 'order' | 'booking' = 'order') => {
    const review = reviews[id];
    if (!review || review.rating === 0) {
      toast.error(t('common.select_rating_message'));
      return;
    }

    const item = type === 'order' ? orders.find(o => o.id === id) : serviceBookings.find(b => b.id === id);
    if (!item) {
      toast.error(t('common.order_not_found'));
      return;
    }

    const loadingToast = toast.loading(t('common.saving_review'));

    try {
      if (user?.id) {
        const collectionName = type === 'order' ? 'orders' : 'serviceBookings';
        const itemRef = doc(db, collectionName, id);
        await updateDoc(itemRef, {
          review: {
            rating: review.rating,
            text: review.text,
            submittedAt: new Date().toISOString(),
            isAnonymous: review.isAnonymous || false
          }
        });

        // 2. Add the review to the Store document
        const storeRef = doc(db, 'stores', item.storeId);

        const isAnon = review.isAnonymous || false;
        const reviewData = {
          id: `rev-${id}-${Date.now()}`,
          userName: isAnon ? t('common.anonymous_customer') : (user?.name || t('common.customer')),
          rating: Number(review.rating),
          comment: review.text.trim() || t('common.excellent_service'),
          date: new Date().toISOString(),
          isAnonymous: isAnon
        };

        try {
          await updateDoc(storeRef, {
            reviews: arrayUnion(reviewData)
          });
        } catch (err: any) {
          await setDoc(storeRef, {
            id: item.storeId,
            name: item.storeName || 'Local Store',
            image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80',
            category: 'Service',
            address: 'Neighborhood Store',
            lat: 28.6139,
            lng: 77.2090,
            isOpen: true,
            rating: 5,
            reviews: [reviewData],
            vendorId: item.storeId
          }, { merge: true });
        }

        // 🔔 Notify the vendor about the new review
        if (item.storeId) {
          sendInAppNotification(item.storeId, {
            title: '⭐ New Review Received!',
            body: `${user?.name || 'A customer'} just rated you ${review.rating} stars: "${review.text.substring(0, 30)}${review.text.length > 30 ? '...' : ''}"`,
            url: '/vendor'
          });
        }
      }

      setReviews(prev => ({
        ...prev,
        [id]: { ...prev[id], submitted: true }
      }));

      toast.dismiss(loadingToast);
      toast.success(t('common.review_saved_successfully'));
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast.dismiss(loadingToast);

      let errorMsg = t('common.failed_to_save_review');
      if (error.code === 'permission-denied') {
        errorMsg = t('common.permission_denied_firestore');
      } else if (error.code === 'not-found') {
        errorMsg = t('common.store_document_not_found');
      }

      toast.error(errorMsg, {
        description: t('common.feedback_not_saved_retry')
      });
    }
  };

  const customerOrders = useMemo(() => {
    return orders.filter(o => o.userId === user?.id);
  }, [orders, user?.id]);

  const activeOrders = customerOrders.filter(o => o.status !== 'completed' && o.status !== 'rejected');
  const pastOrders = customerOrders.filter(o => o.status === 'completed' || o.status === 'rejected');
  const activeBookings = serviceBookings.filter(b => b.status === 'pending' || b.status === 'accepted');
  const pastBookings = serviceBookings.filter(b => b.status === 'completed' || b.status === 'rejected');
  const displayOrders = view === 'active' ? activeOrders : pastOrders;
  const displayBookings = view === 'active' ? activeBookings : pastBookings;

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    const confirmDelete = window.confirm(`Are you sure you want to delete ${selectedIds.length} items?`);
    if (!confirmDelete) return;

    const promise = Promise.all(selectedIds.map(async (id) => {
      const collectionName = filterType === 'orders' ? 'orders' : 'serviceBookings';
      // SOFT DELETE: Only hide for user, keep for vendor audit
      await updateDoc(doc(db, collectionName, id), { deletedByUser: true });
    }));

    toast.promise(promise, {
      loading: 'Deleting items...',
      success: () => {
        setSelectedIds([]);
        return 'Items deleted successfully';
      },
      error: (err) => {
        console.error("Delete error:", err);
        return `Failed to delete: ${err.message || 'Permission Denied'}`;
      }
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const allIds = filterType === 'orders' ? displayOrders.map(o => o.id) : displayBookings.map(b => b.id);
    if (selectedIds.length === allIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allIds);
    }
  };

  return (
    <div className="min-h-screen gradient-warm">
      <Helmet>
        <title>{t('common.receipts.title')} - BellBasket</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <Header />
      <PullToRefresh onRefresh={refreshData} className="pt-20 pb-32 px-4 max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {!selectedOrderId && !selectedBookingId ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6 pb-40"
            >
              {/* Push Notification Banner */}
              {notificationPermission !== 'granted' && !loading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-8 glass-strong rounded-[2rem] p-6 border-2 border-primary/20 bg-primary/5 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
                    <BellRing className="w-32 h-32" />
                  </div>
                  
                  <div className="flex items-center gap-5 relative z-10 text-center md:text-left">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      <BellRing className="w-8 h-8 text-primary animate-bounce-gentle" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Stay Alerts Ready</h2>
                        <p className="text-sm text-muted-foreground font-medium mt-1">Get real-time updates when your order status changes. Turn on notifications!</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={async () => {
                      await requestPushNotifications();
                      if (typeof Notification !== 'undefined') {
                        setNotificationPermission(Notification.permission);
                      }
                    }}
                    className="w-full md:w-auto px-8 py-3.5 rounded-2xl gradient-primary text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all relative z-10"
                  >
                    Allow Notifications
                  </button>
                </motion.div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-foreground">{filterType === 'orders' ? t('common.receipts.title') : 'Service Bookings'}</h1>
                    <button 
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className={`p-2 rounded-full bg-secondary text-primary hover:bg-primary hover:text-white transition-all shadow-sm ${isRefreshing ? 'opacity-50' : 'active:scale-95'}`}
                    >
                      <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="bg-secondary p-1 rounded-xl flex items-center gap-1 w-fit">
                    <button
                      onClick={() => setFilterType('orders')}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${filterType === 'orders' ? 'bg-white dark:bg-primary shadow-sm text-foreground dark:text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Orders ({view === 'active' ? activeOrders.length : pastOrders.length})
                    </button>
                    <button
                      onClick={() => setFilterType('bookings')}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${filterType === 'bookings' ? 'bg-white dark:bg-primary shadow-sm text-foreground dark:text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Bookings ({view === 'active' ? activeBookings.length : pastBookings.length})
                    </button>
                  </div>
                  <div className="bg-secondary p-1 rounded-xl flex items-center gap-1 w-fit">
                    <button
                      onClick={() => setView('active')}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${view === 'active' ? 'bg-white dark:bg-primary shadow-sm text-foreground dark:text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {t('common.active')} ({filterType === 'orders' ? activeOrders.length : activeBookings.length})
                    </button>
                    <button
                      onClick={() => setView('history')}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${view === 'history' ? 'bg-white dark:bg-primary shadow-sm text-foreground dark:text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {t('common.history')} ({filterType === 'orders' ? pastOrders.length : pastBookings.length})
                    </button>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {view === 'history' && selectedIds.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    className="flex items-center justify-between p-3 glass-strong rounded-2xl bg-white/40 dark:bg-black/40 border-primary/20 shadow-xl overflow-hidden"
                  >
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handleSelectAll}
                        className="flex items-center gap-2 group"
                      >
                        <div className={`p-1 rounded-md transition-colors ${selectedIds.length === (filterType === 'orders' ? displayOrders.length : displayBookings.length) ? 'bg-primary/20' : 'bg-muted/30 group-hover:bg-muted/50'}`}>
                          {selectedIds.length === (filterType === 'orders' ? displayOrders.length : displayBookings.length) ? (
                            <CheckCircle2 className="w-5 h-5 text-primary fill-primary" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground/40" />
                          )}
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-foreground">Select All</span>
                      </button>
                      <div className="h-6 w-[1px] bg-border/50 mx-2" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                        {selectedIds.length} <span className="text-muted-foreground ml-1">Items</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleDeleteSelected}
                        className="p-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white active:scale-90 transition-all shadow-sm border border-destructive/20"
                        title="Delete Selected"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Unified Pending Reviews Banner */}
              {view === 'history' && (
                (() => {
                  const pendingCount = (filterType === 'orders' ? pastOrders : serviceBookings.filter(b => b.status === 'completed' || b.status === 'rejected'))
                    .filter(item => {
                      const id = item.id as string;
                      const hasLocalReview = reviews[id]?.submitted;
                      const hasRemoteReview = !!item.review;
                      return item.status === 'completed' && !hasLocalReview && !hasRemoteReview;
                    }).length;

                  if (pendingCount > 0) {
                    return (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-primary/10 dark:bg-primary/20 rounded-2xl p-4 flex items-center justify-between shadow-xl border border-primary/20 backdrop-blur-md"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                            <Star className="w-5 h-5 text-primary fill-white" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-primary uppercase tracking-tight">{t('common.receipts.review_experience')}</h3>
                            <p className="text-[10px] text-primary/60 font-medium">You have {pendingCount} {pendingCount === 1 ? 'order' : 'orders'} waiting for your feedback</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded-lg backdrop-blur-sm">
                          <span className="text-[9px] font-black text-primary/40 uppercase tracking-widest">Scroll to Rate</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        </div>
                      </motion.div>
                    );
                  }
                  return null;
                })()
              )}

              {(filterType === 'orders' ? displayOrders.length : displayBookings.length) === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                  <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">{filterType === 'orders' ? t('common.receipts.no_orders') : 'No service bookings found'}</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {filterType === 'orders' ? (
                    displayOrders.map((order, i) => (
                      <RenderOrderCard
                        key={order.id}
                        order={order}
                        i={i}
                        review={reviews[order.id] || (order.review ? { rating: order.review.rating, text: order.review.text, submitted: true, isAnonymous: order.review.isAnonymous || false } : { rating: 0, text: '', submitted: false, isAnonymous: false })}
                        onRate={(star) => handleRating(order.id, star)}
                        onReviewChange={(text) => setReviews(prev => ({ 
                          ...prev, 
                          [order.id]: { ...(prev[order.id] || { rating: order.review?.rating || 0, submitted: !!order.review, isAnonymous: order.review?.isAnonymous || false }), text } 
                        }))}
                        onAnonymous={(anon) => handleAnonymous(order.id, anon)}
                        onSubmit={() => handleReviewSubmit(order.id, 'order')}
                        t={t}
                        storePhone={getStoreForOrder(order.storeId)?.phone || vendorInfoState[order.storeId]?.phone}
                        vendorInfo={vendorInfoState[order.storeId]}
                        getStoreForOrder={getStoreForOrder}
                        userCoords={user?.lat && user?.lng ? [user.lat, user.lng] : undefined}
                        isSelected={selectedIds.includes(order.id)}
                        onToggleSelect={() => toggleSelect(order.id)}
                        onLongPress={() => toggleSelect(order.id)}
                        showSelection={view === 'history' && selectedIds.length > 0}
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          window.scrollTo(0, 0);
                        }}
                      />
                    ))
                  ) : (
                    displayBookings.map((booking, i) => (
                      <RenderBookingCard
                        key={booking.id}
                        booking={booking}
                        i={i}
                        review={reviews[booking.id] || (booking.review ? { rating: booking.review.rating, text: booking.review.text, submitted: true, isAnonymous: booking.review.isAnonymous || false } : { rating: 0, text: '', submitted: false, isAnonymous: false })}
                        onRate={(star) => setReviews(prev => ({
                          ...prev,
                          [booking.id]: { ...(prev[booking.id] || { text: booking.review?.text || '', submitted: !!booking.review, isAnonymous: booking.review?.isAnonymous || false }), rating: star }
                        }))}
                        onReviewChange={(text) => setReviews(prev => ({
                          ...prev,
                          [booking.id]: { ...(prev[booking.id] || { rating: booking.review?.rating || 0, submitted: !!booking.review, isAnonymous: booking.review?.isAnonymous || false }), text }
                        }))}
                        onAnonymous={(anon) => handleAnonymous(booking.id, anon)}
                        onSubmit={() => handleReviewSubmit(booking.id, 'booking')}
                        t={t}
                        storePhone={getStoreForOrder(booking.storeId)?.phone || vendorInfoState[booking.storeId]?.phone}
                        vendorInfo={vendorInfoState[booking.storeId]}
                        getStoreForOrder={getStoreForOrder}
                        userCoords={user?.lat && user?.lng ? [user.lat, user.lng] : undefined}
                        isSelected={selectedIds.includes(booking.id)}
                        onToggleSelect={() => toggleSelect(booking.id)}
                        onLongPress={() => toggleSelect(booking.id)}
                        showSelection={view === 'history' && selectedIds.length > 0}
                        onClick={() => {
                          setSelectedBookingId(booking.id);
                          window.scrollTo(0, 0);
                        }}
                      />
                    ))
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="tracking"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 pb-40"
            >
              <button onClick={() => { setSelectedOrderId(null); setSelectedBookingId(null); }} className="flex items-center gap-2 text-sm font-bold text-primary mb-2">
                <ArrowLeft className="w-4 h-4" /> {selectedOrderId ? t('common.back_to_all_orders') : 'Back to Bookings'}
              </button>

              {/* Pickup Code - Large Amber Display in Tracking View */}
              {orders.find(o => o.id === selectedOrderId)?.pickupCode && orders.find(o => o.id === selectedOrderId)?.status !== 'completed' && (
                <div className="glass rounded-[2rem] overflow-hidden border-2 border-amber-200/50 dark:border-amber-700/30">
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-10 text-center space-y-6">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-amber-500/20 flex items-center justify-center mx-auto shadow-inner">
                      <KeyRound className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-amber-600/70 dark:text-amber-400/70 uppercase tracking-[0.3em] mb-3">{t('common.your_pickup_code')}</p>
                      <p className="text-5xl font-black text-foreground tracking-[0.4em] font-mono">{orders.find(o => o.id === selectedOrderId)?.pickupCode}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-muted-foreground">
                        {t('common.show_code_to_staff_message')}
                      </p>
                      <p className="text-[10px] text-amber-600/50 font-black uppercase tracking-widest italic">Verify for Pickup</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Info */}
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-foreground px-1">{t('common.receipts.order_details')}</h2>
                {selectedOrderId && (
                  <RenderOrderCard
                    order={orders.find(o => o.id === selectedOrderId)!}
                    i={0}
                    review={reviews[selectedOrderId] || (orders.find(o => o.id === selectedOrderId)?.review ? { rating: orders.find(o => o.id === selectedOrderId)?.review?.rating || 0, text: orders.find(o => o.id === selectedOrderId)?.review?.text || '', submitted: true, isAnonymous: orders.find(o => o.id === selectedOrderId)?.review?.isAnonymous || false } : { rating: 0, text: '', submitted: false, isAnonymous: false })}
                    onRate={(star) => setReviews(prev => ({
                      ...prev,
                      [selectedOrderId]: { ...(prev[selectedOrderId] || { text: orders.find(o => o.id === selectedOrderId)?.review?.text || '', submitted: !!orders.find(o => o.id === selectedOrderId)?.review, isAnonymous: orders.find(o => o.id === selectedOrderId)?.review?.isAnonymous || false }), rating: star }
                    }))}
                    onReviewChange={(text) => setReviews(prev => ({
                      ...prev,
                      [selectedOrderId]: { ...(prev[selectedOrderId] || { rating: orders.find(o => o.id === selectedOrderId)?.review?.rating || 0, submitted: !!orders.find(o => o.id === selectedOrderId)?.review, isAnonymous: orders.find(o => o.id === selectedOrderId)?.review?.isAnonymous || false }), text }
                    }))}
                    onAnonymous={(anon) => handleAnonymous(selectedOrderId, anon)}
                    onSubmit={() => handleReviewSubmit(selectedOrderId)}
                    t={t}
                    storePhone={getStoreForOrder(orders.find(o => o.id === selectedOrderId)?.storeId || '')?.phone || vendorInfoState[orders.find(o => o.id === selectedOrderId)?.storeId || '']?.phone}
                    vendorInfo={vendorInfoState[orders.find(o => o.id === selectedOrderId)?.storeId || '']}
                    getStoreForOrder={getStoreForOrder}
                    userCoords={user?.lat && user?.lng ? [user.lat, user.lng] : undefined}
                  />
                )}

                {selectedBookingId && (
                  <RenderBookingCard
                    booking={serviceBookings.find(b => b.id === selectedBookingId)!}
                    i={0}
                    review={reviews[selectedBookingId] || (serviceBookings.find(b => b.id === selectedBookingId)?.review ? { rating: serviceBookings.find(b => b.id === selectedBookingId)?.review?.rating || 0, text: serviceBookings.find(b => b.id === selectedBookingId)?.review?.text || '', submitted: true, isAnonymous: serviceBookings.find(b => b.id === selectedBookingId)?.review?.isAnonymous || false } : { rating: 0, text: '', submitted: false, isAnonymous: false })}
                    onRate={(star) => setReviews(prev => ({
                      ...prev,
                      [selectedBookingId]: { ...(prev[selectedBookingId] || { text: serviceBookings.find(b => b.id === selectedBookingId)?.review?.text || '', submitted: !!serviceBookings.find(b => b.id === selectedBookingId)?.review, isAnonymous: serviceBookings.find(b => b.id === selectedBookingId)?.review?.isAnonymous || false }), rating: star }
                    }))}
                    onReviewChange={(text) => setReviews(prev => ({
                      ...prev,
                      [selectedBookingId]: { ...(prev[selectedBookingId] || { rating: serviceBookings.find(b => b.id === selectedBookingId)?.review?.rating || 0, submitted: !!serviceBookings.find(b => b.id === selectedBookingId)?.review, isAnonymous: serviceBookings.find(b => b.id === selectedBookingId)?.review?.isAnonymous || false }), text }
                    }))}
                    onAnonymous={(anon) => handleAnonymous(selectedBookingId, anon)}
                    onSubmit={() => handleReviewSubmit(selectedBookingId, 'booking')}
                    t={t}
                    storePhone={getStoreForOrder(serviceBookings.find(b => b.id === selectedBookingId)?.storeId || '')?.phone || vendorInfoState[serviceBookings.find(b => b.id === selectedBookingId)?.storeId || '']?.phone}
                    vendorInfo={vendorInfoState[serviceBookings.find(b => b.id === selectedBookingId)?.storeId || '']}
                    getStoreForOrder={getStoreForOrder}
                    userCoords={user?.lat && user?.lng ? [user.lat, user.lng] : undefined}
                  />
                )}

                {/* Delivery Info Mock */}
                <div className="glass rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t('common.estimated_time')}</p>
                      <p className="text-base font-bold text-foreground">
                        {t('common.fast_secure_pickup')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t('common.pickup_point')}</p>
                      <p className="text-base font-bold text-foreground line-clamp-1">{getStoreForOrder(orders.find(o => o.id === selectedOrderId)?.storeId || serviceBookings.find(b => b.id === selectedBookingId)?.storeId || '')?.address || t('common.near_main_gate')}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Decorative Receipt Bottom Edge */}
              <div className="pt-20 pb-10 flex flex-col items-center gap-4 opacity-30">
                <div className="w-16 h-1 bg-gradient-to-r from-transparent via-border to-transparent rounded-full" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">End of Receipt</p>
              </div>

              <div className="h-64" />
            </motion.div>
          )}
        </AnimatePresence>
      </PullToRefresh>
    </div>
  );
};

export default Receipts;
