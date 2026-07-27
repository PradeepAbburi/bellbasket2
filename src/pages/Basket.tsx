import { useState, useEffect, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Trash2, CreditCard, Wallet, ArrowLeft, CheckCircle, AlertCircle, Clock, Phone, ShoppingBag, User as UserIcon, XCircle, Store, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import PageLoading from '@/components/PageLoading';
import { getCurrencySymbol } from '@/utils/currency';


const Cart = () => {
  const { user, loading, cart, updateQuantity, removeFromCart, placeOrder, stores, cartSubtotal, setIsAnyModalOpen } = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [pendingMethod, setPendingMethod] = useState<'online' | 'pickup' | 'delivery'>('pickup');

  if (loading) return <PageLoading />;

  // Group cart items by store
  const cartGroups = cart.reduce((acc, item) => {
    if (!acc[item.storeId]) acc[item.storeId] = { name: item.storeName, items: [], storeInfo: stores.find(s => s.id === item.storeId) };
    acc[item.storeId].items.push(item);
    return acc;
  }, {} as Record<string, { name: string, items: any[], storeInfo?: any }>);

  const groupIds = Object.keys(cartGroups);

  const subtotal = cartSubtotal;

  // For multi-shop, we'll take the max delivery fee or a flat fee
  const total = subtotal;

  const mainSymbol = groupIds.length > 0 
    ? getCurrencySymbol(cartGroups[groupIds[0]].storeInfo?.country, cartGroups[groupIds[0]].storeInfo?.address) 
    : '₹';

  // Check if any store in the cart is closed, blocked or expired
  const restrictedStores = groupIds
    .map(id => cartGroups[id].storeInfo)
    .filter(store => store && (!store.isOpen || store.isBlocked || store.plan === 'none' || !store.plan));

  const isCheckoutDisabled = restrictedStores.length > 0;

  // Use global modal state to hide nav elements
  useEffect(() => {
    setIsAnyModalOpen(!!(showConfirm || showSuccess));
    return () => setIsAnyModalOpen(false);
  }, [showConfirm, showSuccess, setIsAnyModalOpen]);

  const startOrder = (method: 'online' | 'pickup' | 'delivery' = 'pickup') => {
    if (!user) {
      toast.info('Sign in to continue', {
        description: 'You need an account to create shopping lists.',
      });
      navigate('/auth?returnTo=/cart');
      return;
    }
    setPendingMethod(method);
    setShowConfirm(true);
  };

  const confirmOrder = async () => {
    if (isPlacing) return;
    setIsPlacing(true);
    const effectiveDeliveryMethod: 'pickup' | 'delivery' = pendingMethod === 'delivery' ? 'delivery' : 'pickup';
    const orderId = await placeOrder(pendingMethod, { 
      deliveryMethod: effectiveDeliveryMethod, 
      deliveryFee: 0,
      customerName: user?.name || '',
      customerPhone: user?.phone || '',
      customerAddress: ''
    });

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
            {groupIds.length > 1 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary/5 border border-primary/20 rounded-3xl p-5 mb-8 flex items-center gap-4 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-x-12 -translate-y-12 blur-3xl" />
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-xl shadow-primary/5">
                  <ShoppingBag className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-lg bg-primary text-black text-[9px] font-black uppercase tracking-widest">Multi-Store</span>
                    <span className="text-[10px] text-primary font-bold uppercase tracking-widest animate-pulse">Thread Active</span>
                  </div>
                  <h2 className="text-lg font-black text-foreground tracking-tight leading-none mb-1.5">Multi-Store Shopping List Mode</h2>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    You're creating a shopping list from <span className="text-foreground font-black underline decoration-primary/30 decoration-2">{groupIds.length} different stores</span> at once.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                   <div className="flex -space-x-3">
                      {groupIds.slice(0, 3).map((id, i) => (
                        <div key={id} className={`w-8 h-8 rounded-full border-2 border-[#E8F0F2] dark:border-[#1A1A1A] bg-primary/20 flex items-center justify-center overflow-hidden shadow-md z-[${3-i}]`}>
                          {cartGroups[id].storeInfo?.logo ? <img src={cartGroups[id].storeInfo.logo} className="w-full h-full object-cover" /> : <Store className="w-4 h-4 text-primary" />}
                        </div>
                      ))}
                      {groupIds.length > 3 && (
                        <div className="w-8 h-8 rounded-full border-2 border-[#E8F0F2] dark:border-[#1A1A1A] bg-secondary flex items-center justify-center text-[10px] font-black z-0 shadow-md">
                          +{groupIds.length - 3}
                        </div>
                      )}
                   </div>
                </div>
              </motion.div>
            )}

            <div className="space-y-8 mb-6">
              {Object.entries(cartGroups).map(([storeId, group], groupIdx) => {
                const storeSymbol = getCurrencySymbol(group.storeInfo?.country, group.storeInfo?.address);
                return (
                  <div key={storeId} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Store className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-foreground uppercase tracking-tight">{group.name}</h2>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                        {group.items.length} {t('common.items')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {group.items.map((item, i) => (
                      <motion.div
                        key={item.product.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (groupIdx * 0.1) + (i * 0.05) }}
                        className="bg-white dark:bg-[#202020] rounded-[1.8rem] p-3 md:p-4 flex gap-3 md:gap-4 border border-border/40 shadow-sm hover:shadow-md transition-all group"
                      >
                        <div className="relative w-16 h-16 md:w-20 md:h-20 shrink-0">
                          <img src={item.product.image} alt={item.product.name} className="w-full h-full rounded-2xl object-cover transition-transform group-hover:scale-110" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div>
                            <h3 className="font-extrabold text-foreground text-[14px] md:text-[15px] tracking-tight line-clamp-1">{t(`products.${item.product.name}`, { defaultValue: item.product.name })}</h3>
                            <div className="flex flex-col gap-1 items-start mt-0.5">
                              {item.selectedVariant ? (
                                <span className="text-[9px] font-black text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded-md border border-amber-500/10">
                                  Variant: {item.selectedVariant.quantity}
                                </span>
                              ) : item.product.quantity && (
                                <span className="text-[9px] font-black text-primary bg-primary/5 px-1.5 py-0.5 rounded-md border border-primary/10">
                                  {item.product.quantity.includes(' - ') ? item.product.quantity : item.product.quantity.replace(/([0-9.]+)([a-zA-Z]+)/, '$1 - $2')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-auto">
                            <span className="font-black text-foreground text-base">
                              {storeSymbol}{(item.selectedVariant ? 
                                 (item.selectedVariant.discountedPrice || item.selectedVariant.price) : 
                                 ((item.product.discountedPrice && Number(item.product.discountedPrice) > 0 && Number(item.product.discountedPrice) < item.product.price) ? Number(item.product.discountedPrice) : item.product.price)
                                ) * item.quantity}
                            </span>
                            <div className="flex items-center gap-1.5 bg-secondary/30 p-1 rounded-xl border border-border/40">
                              <button onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedVariant?.id)} className="w-7 h-7 rounded-lg bg-white dark:bg-[#333333] text-primary flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all">
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-black text-foreground w-5 text-center">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedVariant?.id)} className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all">
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <div className="w-px h-4 bg-border/50 mx-0.5" />
                              <button onClick={() => removeFromCart(item.product.id, item.selectedVariant?.id)} className="w-7 h-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-white transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
                );
              })}
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
            <div className="glass rounded-[2rem] p-8 mb-8 border border-border/40 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-x-8 -translate-y-8 blur-3xl" />
              
              <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-6 px-1 italic">Order Summary</h3>

              <div className="space-y-4">
                <button
                  disabled={isCheckoutDisabled}
                  onClick={() => startOrder('pickup')}
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.15em] flex items-center justify-center gap-3 transition-all ${
                    isCheckoutDisabled 
                      ? 'bg-secondary text-muted-foreground opacity-50 cursor-not-allowed' 
                      : 'gradient-primary text-primary-foreground hover:scale-[1.01] active:scale-95'
                  }`}
                >
                  <Wallet className="w-5 h-5" /> 
                  {t('common.pay_on_pickup')}
                </button>
              </div>

              <p className="text-[10px] text-center text-muted-foreground mt-8 px-4 leading-relaxed opacity-60">
                By placing an order, you agree to the BellBasket {' '}
                <button type="button" onClick={() => navigate('/privacy')} className="text-primary hover:underline font-bold">Privacy</button>
                {' '}and{' '}
                <button type="button" onClick={() => navigate('/terms')} className="text-primary hover:underline font-bold">Terms</button>
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
              <h2 className="text-xl font-bold text-foreground mb-2">{groupIds.length > 1 ? 'Start Thread Order?' : t('common.confirm_order')}</h2>
              <p className="text-sm text-muted-foreground mb-6">
                {groupIds.length > 1 ? `This will initiate a multi-store thread covering all ${groupIds.length} orders.` : t('common.place_order_confirm')} <strong>{t('common.pay_on_pickup')}</strong>?
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
                      Processing...
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
                className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle className="w-12 h-12 text-primary" />
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
                className="bg-primary/10 border border-primary/20 rounded-2xl p-4 max-w-xs mx-auto"
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
