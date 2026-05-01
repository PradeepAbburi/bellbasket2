import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Star, MapPin, Package2, ShieldCheck, Zap, ArrowRight, Plus, Minus, Info, Clock, Phone, Sparkles } from 'lucide-react';
import { Product, Store, Deal, CartItem, ProductVariant } from '@/types';
import { useApp } from '@/context/AppContext';

interface ProductDetailModalProps {
  product: Product;
  store: Store;
  deal?: Deal;
  cart: CartItem[];
  onAddToCart: (product: Product, variant?: ProductVariant) => void;
  onUpdateQuantity: (productId: string, newQty: number, variantId?: string) => void;
  onClose: () => void;
  onViewStore: () => void;
  onViewProduct: (productId: string) => void;
}

const CountdownTimer = ({ endTime }: { endTime: string }) => {
  const [timeLeft, setTimeLeft] = useState<{h:number, m:number, s:number} | null>(null);

  useEffect(() => {
    const calculate = () => {
        const distance = new Date(endTime).getTime() - new Date().getTime();
        if (distance < 0) {
          setTimeLeft(null);
          return;
        }
        setTimeLeft({
          h: Math.floor((distance / (1000 * 60 * 60))),
          m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((distance % (1000 * 60)) / 1000)
        });
    };
    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  if (!timeLeft) return <span className="text-rose-500 font-black uppercase tracking-[0.2em] text-[9px]">Sale Ended</span>;

  return (
    <span className="tabular-nums tracking-tighter">
      {String(timeLeft.h).padStart(2, '0')}:{String(timeLeft.m).padStart(2, '0')}:{String(timeLeft.s).padStart(2, '0')}
    </span>
  );
};

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  store,
  deal,
  cart,
  onAddToCart,
  onUpdateQuantity,
  onClose,
  onViewStore,
  onViewProduct,
}) => {
  const { setIsAnyModalOpen } = useApp();
  const [showCallModal, setShowCallModal] = React.useState(false);

  useEffect(() => {
    setIsAnyModalOpen(true);
    return () => setIsAnyModalOpen(false);
  }, [setIsAnyModalOpen]);
  const discountPercent = deal 
    ? Math.round(((deal.originalPrice - deal.dealPrice) / deal.originalPrice) * 100)
    : product.discountedPrice 
      ? Math.round(((product.price - product.discountedPrice) / product.price) * 100)
      : 0;

  const displayPrice = deal ? deal.dealPrice : (product.discountedPrice || product.price);
  const originalPrice = deal ? deal.originalPrice : (product.discountedPrice ? product.price : null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-xl bg-[#161616] rounded-3xl overflow-hidden shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white flex items-center justify-center text-black hover:bg-white/90 transition-all active:scale-90 shadow-lg"
        >
          <X className="w-5 h-5" strokeWidth={3} />
        </button>

        <div className="flex flex-col h-full max-h-[90vh] overflow-y-auto custom-scrollbar">
          {/* Image Section - More Compact */}
          <div className="w-full aspect-[4/3] bg-zinc-900 flex-shrink-0 relative overflow-hidden">
            {product.isCombo && product.comboItemsData && product.comboItemsData.length > 0 ? (
                <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[1px] bg-primary/20 relative">
                    {product.comboItemsData.slice(0, 4).map((c) => (
                        <img key={c.id} src={c.image} className="w-full h-full object-cover" alt="" />
                    ))}
                    {product.comboItemsData.length < 4 && Array.from({ length: 4 - product.comboItemsData.length }).map((_, i) => (
                        <div key={i} className="w-full h-full bg-zinc-950 flex items-center justify-center">
                            <Package2 className="w-6 h-6 text-primary/20" />
                        </div>
                    ))}
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent pointer-events-none" />
                </div>
            ) : (
                <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                />
            )}
            
            {(discountPercent > 0) && (
              <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 bg-primary text-black font-black text-[10px] px-3 py-1.5 rounded-xl shadow-xl uppercase tracking-tighter z-10">
                <Zap className="w-3.5 h-3.5 fill-current" />
                {discountPercent}% OFF
              </div>
            )}

            {deal && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 bg-primary px-4 py-2 rounded-full shadow-2xl z-10 scale-110">
                <div className="flex items-center gap-1.5 font-mono text-[11px] font-black text-black">
                  <Clock className="w-3.5 h-3.5" />
                  <CountdownTimer endTime={deal.endTime} />
                </div>
              </div>
            )}
          </div>

          {/* Details Section - Compact padding */}
          <div className="p-6 flex flex-col gap-5 bg-gradient-to-b from-[#161616] to-[#0a0a0a]">
            <div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <h2 className="text-2xl font-black text-white italic uppercase tracking-tight leading-none truncate">
                    {product.name}
                </h2>
                <div className="flex items-end gap-1.5 shrink-0">
                    <span className="text-xl font-black text-white tracking-tighter leading-none">₹{displayPrice}</span>
                    {originalPrice && (
                        <span className="text-[10px] text-zinc-600 line-through font-bold mb-0.5">₹{originalPrice}</span>
                    )}
                </div>
              </div>
              <p className="text-zinc-500 text-[11px] font-medium leading-relaxed line-clamp-2">
                {product.description || "Special limited-time flash deal available exclusively for neighborhood delivery."}
              </p>
            </div>

            {/* Variants Section */}
            {product.hasVariants && product.variants && product.variants.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                  <Zap className="w-3 h-3" /> Available Variants & Prices
                </h3>
                <div className="space-y-2">
                  {product.variants.map((v) => {
                    const hasVDisc = v.discountedPrice && v.discountedPrice < v.price;
                    const vPrice = hasVDisc ? v.discountedPrice : v.price;
                    const vInCart = cart.find(c => c.product.id === product.id && c.selectedVariant?.id === v.id);
                    const vQty = vInCart ? vInCart.quantity : 0;

                    return (
                      <div key={v.id} className="bg-white/5 border border-white/5 p-3 rounded-2xl flex items-center justify-between transition-all hover:bg-white/10 group/variant">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">{v.quantity}</span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-sm font-black text-white">₹{vPrice}</span>
                            {hasVDisc && <span className="text-[10px] text-zinc-600 line-through font-bold">₹{v.price}</span>}
                          </div>
                        </div>
                        
                        {vQty === 0 ? (
                          <button
                            onClick={() => onAddToCart(product, v)}
                            className="h-8 px-4 rounded-xl bg-primary text-black text-[9px] font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/10"
                          >
                            Add
                          </button>
                        ) : (
                          <div className="flex items-center bg-zinc-950 rounded-xl p-1 gap-2 border border-white/5 shadow-inner">
                            <button
                              onClick={() => onUpdateQuantity(product.id, vQty - 1, v.id)}
                              className="w-8 h-8 flex items-center justify-center bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all active:scale-90 border border-rose-500/20"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-black text-white min-w-[1.5rem] text-center">{vQty}</span>
                            <button
                              onClick={() => onUpdateQuantity(product.id, vQty + 1, v.id)}
                              className="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary rounded-lg transition-all hover:bg-primary hover:text-black active:scale-90 border border-primary/20"
                            >
                              <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Combo Items - Smaller cards */}
            {product.isCombo && product.comboItemsData && (
              <div className="space-y-3">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                  <Package2 className="w-3 h-3" /> Includes {product.comboItemsData.length} Items
                </h3>
                <div className="flex flex-wrap gap-2">
                  {product.comboItemsData.map((item) => (
                    <button 
                      key={item.id} 
                      onClick={() => onViewProduct(item.id)}
                      className="bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-xl flex items-center gap-2 hover:bg-white/10 hover:border-primary/30 transition-all group/item text-left"
                    >
                      <img src={item.image} className="w-6 h-6 rounded-md object-cover shadow-lg group-hover/item:scale-110 transition-transform" alt="" />
                      <span className="text-[10px] font-bold text-zinc-300 group-hover/item:text-primary transition-colors">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Store Information - Minimalist */}
            <div className="bg-zinc-900/40 rounded-2xl p-4 border border-white/5 flex items-center justify-between group cursor-pointer" onClick={onViewStore}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-zinc-950 overflow-hidden shadow-xl border border-white/10 shrink-0">
                  <img src={store.image} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-white text-[11px] truncate uppercase tracking-tight leading-none mb-1">{store.name}</h4>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5 text-primary font-black text-[9px]">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      {store.rating || '4.5'}
                    </div>
                    <span className="text-zinc-600 text-[9px] font-bold tracking-tight truncate">· {store.address}</span>
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:translate-x-1 transition-all" />
            </div>

            {!product.hasVariants && (
              <div className="pt-4 border-t border-white/5 flex items-center gap-3">
                {(cart.find(c => c.product.id === product.id && !c.selectedVariant)?.quantity || 0) === 0 ? (
                  <button
                    onClick={() => onAddToCart(product)}
                    className="flex-1 h-12 bg-primary text-black rounded-xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-lg shadow-primary/10 active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" strokeWidth={3} />
                    Add to Cart
                  </button>
                ) : (
                  <div className="flex-1 flex items-center justify-between bg-zinc-950 rounded-2xl p-1 border border-white/5 shadow-inner">
                    <button
                      onClick={() => {
                        const existing = cart.find(c => c.product.id === product.id && !c.selectedVariant);
                        if (existing) onUpdateQuantity(product.id, existing.quantity - 1);
                      }}
                      className="w-10 h-10 flex items-center justify-center bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all rounded-xl active:scale-90 border border-rose-500/20"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">Quantity</span>
                        <div className="text-sm font-black text-white tabular-nums">
                            {cart.find(c => c.product.id === product.id && !c.selectedVariant)?.quantity || 0}
                        </div>
                    </div>
                    <button
                      onClick={() => {
                        const existing = cart.find(c => c.product.id === product.id && !c.selectedVariant);
                        if (existing) onUpdateQuantity(product.id, existing.quantity + 1);
                      }}
                      className="w-10 h-10 flex items-center justify-center bg-primary/10 text-primary transition-all rounded-xl border border-primary/20 active:scale-90 hover:bg-primary hover:text-black"
                    >
                      <Plus className="w-4 h-4" strokeWidth={3} />
                    </button>
                  </div>
                )}
                
                {store.phone && (
                  <button
                      onClick={() => setShowCallModal(true)}
                      className="w-12 h-12 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white flex items-center justify-center transition-all border border-green-500/20"
                      title="Contact Vendor"
                  >
                      <Phone className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Call Modal Overlay (Internal) */}
        <AnimatePresence>
          {showCallModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 10 }}
                className="bg-[#1a1a1a] w-full max-w-xs rounded-3xl p-8 relative shadow-2xl border border-white/10 text-center"
              >
                <button
                  onClick={() => setShowCallModal(false)}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 text-zinc-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="space-y-6">
                  <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto text-green-500">
                    <Phone className="w-8 h-8" />
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-white italic uppercase tracking-tight">{store.name}</h3>
                    <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">Contact Vendor</p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <a 
                      href={`tel:${store.phone}`}
                      className="w-full py-4 rounded-xl bg-green-500 text-white font-black text-[11px] uppercase tracking-widest shadow-lg shadow-green-500/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                      <Phone className="w-4 h-4" strokeWidth={3} /> Call Now
                    </a>
                    <button 
                      onClick={() => setShowCallModal(false)}
                      className="w-full py-4 rounded-xl bg-white/5 text-zinc-400 font-bold text-[11px] uppercase tracking-widest transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};


export default ProductDetailModal;
