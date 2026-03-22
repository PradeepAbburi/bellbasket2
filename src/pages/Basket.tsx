import { useState, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Trash2, CreditCard, Wallet, ArrowLeft, CheckCircle, AlertCircle, Clock, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useApp } from '@/context/appStore';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const Cart = () => {
  const { user, loading, cart, updateQuantity, removeFromCart, placeOrder, stores } = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [pendingMethod, setPendingMethod] = useState<'online' | 'pickup' | 'delivery'>('pickup');
  const [selectedDelivery, setSelectedDelivery] = useState<'pickup' | 'delivery'>('pickup');

  if (loading) {
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const currentStore = cart.length > 0 ? stores.find(s => s.id === cart[0].storeId) : null;
  const offersDelivery = currentStore?.offersDelivery || false;
  const deliveryFee = currentStore?.deliveryFee || 0;

  const subtotal = cart.reduce((s, c) => s + c.product.price * c.quantity, 0);
  const total = subtotal + (selectedDelivery === 'delivery' ? deliveryFee : 0);

  // Check if any store in the cart is closed, blocked or expired
  const restrictedStores = cart.reduce((acc, item) => {
    const store = stores.find(s => s.id === item.storeId);
    if (store && (!store.isOpen || store.isBlocked || store.plan === 'none' || !store.plan) && !acc.some(s => s.id === store.id)) {
      acc.push(store);
    }
    return acc;
  }, [] as any[]);

  const isCheckoutDisabled = restrictedStores.length > 0;

  const startOrder = (method: 'online' | 'pickup' | 'delivery') => {
    if (!user) {
      toast.info('Sign in to continue', {
        description: 'You need an account to place orders.',
      });
      navigate('/auth?returnTo=/cart');
      return;
    }

    if (method === 'online') {
      toast.info('Pay Online coming soon!', {
        description: 'Please use other methods for now.',
        icon: <CreditCard className="w-4 h-4" />
      });
      return;
    }
    setPendingMethod(method);
    setShowConfirm(true);
  };

  const confirmOrder = async () => {
    if (isPlacing) return;
    setIsPlacing(true);
    const orderId = await placeOrder(pendingMethod, { deliveryMethod: selectedDelivery, deliveryFee });

    if (orderId) {
      setShowSuccess(true);
      // Auto navigate after animation
      setTimeout(() => {
        startTransition(() => {
          navigate('/receipts');
        });
      }, 2000);
    } else {
      setIsPlacing(false);
    }
  };

  return (
    <div className="min-h-screen gradient-warm">
      <Header />
      <div className="pt-20 pb-32 px-4 max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('common.back')}
        </button>
        <h1 className="text-2xl font-bold text-foreground mb-6">{t('common.your_cart')}</h1>

        {cart.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-muted-foreground">{t('common.cart_empty')}</p>
            <button onClick={() => navigate('/browse')} className="gradient-primary text-primary-foreground mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
              {t('common.browse_stores')}
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {cart.map((item, i) => (
                <motion.div
                  key={item.product.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white dark:bg-[#202020] rounded-[1.8rem] p-4 flex gap-4 border border-border/40 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="relative w-20 h-20 shrink-0">
                    <img src={item.product.image} alt={item.product.name} className="w-full h-full rounded-2xl object-cover transition-transform group-hover:scale-110" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <h3 className="font-extrabold text-foreground text-[15px] tracking-tight line-clamp-1">{t(`products.${item.product.name}`, { defaultValue: item.product.name })}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.product.quantity && (
                          <span className="text-[9px] font-black text-primary bg-primary/5 px-1.5 py-0.5 rounded-md border border-primary/10 w-fit">
                            {item.product.quantity.includes(' - ') ? item.product.quantity : item.product.quantity.replace(/([0-9.]+)([a-zA-Z]+)/, '$1 - $2')}
                          </span>
                        )}
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">{item.storeName}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="font-black text-foreground text-base">₹{item.product.price * item.quantity}</span>
                      <div className="flex items-center gap-1.5 bg-secondary/30 p-1 rounded-xl border border-border/40">
                        <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-7 h-7 rounded-lg bg-white dark:bg-[#333333] text-primary flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-black text-foreground w-5 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px h-4 bg-border/50 mx-0.5" />
                        <button onClick={() => removeFromCart(item.product.id)} className="w-7 h-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-white transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Restricted Store Warning */}
            {isCheckoutDisabled && (
              <div className="glass rounded-2xl p-4 border-l-4 border-destructive bg-destructive/5 flex items-center gap-3 mb-6 shadow-lg shadow-destructive/5">
                <div className="bg-destructive/10 p-2 rounded-lg text-destructive">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">Store Restricted or Closed</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Please remove items from stores that are currently unavailable.</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {restrictedStores.map(s => (
                      <span key={s.id} className="text-[10px] font-bold bg-destructive/10 text-destructive px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="glass rounded-2xl p-6">

              {offersDelivery && (
                <div className="mb-6 space-y-3 pb-4 border-b border-border/50">
                  <h3 className="text-sm font-bold text-foreground">{t('common.delivery_method')}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${selectedDelivery === 'pickup' ? 'border-primary bg-primary/5' : 'border-border/50 bg-secondary/30'}`}>
                      <input type="radio" name="delivery" value="pickup" checked={selectedDelivery === 'pickup'} onChange={() => setSelectedDelivery('pickup')} className="hidden" />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedDelivery === 'pickup' ? 'border-primary' : 'border-muted-foreground'}`}>
                        {selectedDelivery === 'pickup' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <span className="text-sm font-bold text-foreground">{t('common.store_pickup')}</span>
                    </label>
                    <label className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${selectedDelivery === 'delivery' ? 'border-primary bg-primary/5' : 'border-border/50 bg-secondary/30'}`}>
                      <input type="radio" name="delivery" value="delivery" checked={selectedDelivery === 'delivery'} onChange={() => setSelectedDelivery('delivery')} className="hidden" />
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedDelivery === 'delivery' ? 'border-primary' : 'border-muted-foreground'}`}>
                        {selectedDelivery === 'delivery' && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <span className="text-sm font-bold text-foreground">{t('common.delivery')}</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">{t('common.subtotal')}</span>
                <span className="text-foreground font-medium">₹{subtotal}</span>
              </div>
              <div className={`flex justify-between text-sm ${selectedDelivery === 'delivery' && deliveryFee > 0 ? 'mb-2' : 'mb-4'}`}>
                <span className="text-muted-foreground">{t('common.delivery_method')}</span>
                <span className="text-primary font-bold capitalize">{selectedDelivery === 'pickup' ? t('common.pickup') : t('common.delivery')}</span>
              </div>
              {selectedDelivery === 'delivery' && deliveryFee > 0 && (
                <div className="flex justify-between text-sm mb-4 animate-in slide-in-from-top-1 fade-in duration-200">
                  <span className="text-muted-foreground font-semibold">{t('common.delivery_charge')}</span>
                  <span className="text-foreground font-black">+ ₹{deliveryFee}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 flex justify-between mb-6">
                <span className="font-bold text-foreground">{t('common.total')}</span>
                <span className="font-bold text-foreground text-lg">₹{total}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  disabled={isCheckoutDisabled}
                  onClick={() => startOrder(selectedDelivery === 'pickup' ? 'pickup' : 'delivery')}
                  className={`py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${isCheckoutDisabled ? 'bg-secondary text-muted-foreground opacity-50 cursor-not-allowed' : 'gradient-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/20 active:scale-95'}`}
                >
                  <Wallet className="w-4 h-4" /> {selectedDelivery === 'pickup' ? t('common.pay_on_pickup') : t('common.pay_on_delivery')}
                </button>
                <button
                  disabled={isCheckoutDisabled}
                  onClick={() => startOrder('online')}
                  className={`py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${isCheckoutDisabled ? 'bg-secondary text-muted-foreground opacity-50 cursor-not-allowed' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary active:scale-95 grayscale-[0.5]'}`}
                >
                  <CreditCard className="w-4 h-4" /> {t('common.pay_online')}
                </button>
              </div>

              <p className="text-[10px] text-center text-muted-foreground mt-4 px-4 leading-relaxed">
                By placing an order, you agree to BellBasket's {' '}
                <button
                  type="button"
                  onClick={() => navigate('/privacy')}
                  className="text-primary hover:underline font-bold"
                >
                  Privacy Policy
                </button>
                {' '}and{' '}
                <button
                  type="button"
                  onClick={() => navigate('/terms')}
                  className="text-primary hover:underline font-bold"
                >
                  Terms & Conditions
                </button>
                . Your data helps us process your order smoothly.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirm(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm glass-strong rounded-3xl p-6 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">{t('common.confirm_order')}</h2>
              <p className="text-sm text-muted-foreground mb-6">
                {t('common.place_order_confirm')} <strong>{pendingMethod === 'pickup' ? t('common.pay_on_pickup') : pendingMethod === 'delivery' ? t('common.pay_on_delivery') : t('common.pay_online')}</strong>?
              </p>
              <div className="grid gap-3">
                <button
                  onClick={confirmOrder}
                  disabled={isPlacing}
                  className="w-full gradient-primary text-primary-foreground py-3 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  {isPlacing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('common.processing')}
                    </>
                  ) : (
                    t('common.yes_place_order')
                  )}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="w-full py-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('common.back')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Animation */}
      <AnimatePresence>
        {showSuccess && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/95 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5, times: [0, 0.7, 1] }}
                className="w-24 h-24 rounded-full bg-[#000080]/20 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="w-12 h-12 text-[#000080]" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-foreground mb-2"
              >
                {t('common.order_placed_success')}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-muted-foreground mb-6"
              >
                {t('common.redirecting_receipt')}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 }}
                className="bg-primary/10 border border-primary/20 rounded-2xl p-4 max-w-xs mx-auto animate-pulse"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-[11px] font-medium text-foreground leading-tight">
                    <strong>Note:</strong> {t('common.receipts.acceptance_note_desc')}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Cart;
