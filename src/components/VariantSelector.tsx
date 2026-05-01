import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ChevronRight, Minus, Plus } from 'lucide-react';
import type { Product, ProductVariant, CartItem } from '@/types';
import { useApp } from '@/context/AppContext';
import { useEffect } from 'react';

interface VariantSelectorProps {
    product: Product | null;
    cart: CartItem[];
    updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
    onClose: () => void;
    onSelect: (variant: ProductVariant) => void;
}

const VariantSelector: React.FC<VariantSelectorProps> = ({ product, cart, updateQuantity, onClose, onSelect }) => {
    const { setIsAnyModalOpen } = useApp();

    useEffect(() => {
        setIsAnyModalOpen(true);
        return () => setIsAnyModalOpen(false);
    }, [setIsAnyModalOpen]);
    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end justify-center pointer-events-auto"
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="w-full max-w-md bg-white dark:bg-[#202020] rounded-t-3xl p-4 pb-6 space-y-4 shadow-2xl relative border-t border-white/5"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-border/20 rounded-full" />
                    
                    <div className="flex items-center justify-between">
                        <div className="min-w-0 pr-4">
                            <h3 className="text-lg font-black text-foreground uppercase tracking-tight truncate">{product.name}</h3>
                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.15em] mt-0.5">Available Quantities & Prices</p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-all border border-border/50 shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                        {product.variants?.map((v) => {
                            const hasVariantDiscount = v.discountedPrice && v.discountedPrice < v.price;
                            const finalVariantPrice = hasVariantDiscount ? v.discountedPrice : v.price;
                            const variantQty = cart.find(c => c.product.id === product.id && c.selectedVariant?.id === v.id)?.quantity || 0;
                            
                            return (
                                <button
                                    key={v.id}
                                    onClick={() => {
                                        if (variantQty === 0) onSelect(v);
                                    }}
                                    className={`w-full p-3 sm:p-4 rounded-2xl border transition-all active:scale-[0.98] flex items-center justify-between group ${
                                        variantQty > 0 
                                            ? 'bg-primary/5 dark:bg-white/5 border-primary/30' 
                                            : 'bg-secondary/30 dark:bg-white/[0.03] border-border/50 hover:bg-primary/5 hover:border-primary/30'
                                    }`}
                                >
                                    <div className="flex flex-col items-start gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black tracking-[0.1em] text-muted-foreground uppercase">{v.quantity}</span>
                                            {variantQty > 0 && (
                                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[7px] font-black uppercase tracking-widest">
                                                    <div className="w-0.5 h-0.5 rounded-full bg-primary animate-pulse" />
                                                    Added
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-black text-foreground tracking-tight">₹{finalVariantPrice}</span>
                                            {hasVariantDiscount && (
                                                <span className="text-[10px] text-muted-foreground line-through opacity-50 decoration-2 font-bold">₹{v.price}</span>
                                            )}
                                        </div>
                                    </div>
                                    {variantQty === 0 ? (
                                        <motion.button
                                            whileTap={{ scale: 0.92 }}
                                            onClick={(e) => { e.stopPropagation(); onSelect(v); }}
                                            className="gradient-primary text-primary-foreground h-8 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-lg font-black transition-all"
                                        >
                                            <Plus className="w-3 h-3" />
                                            <span className="text-[10px] uppercase tracking-widest pt-0.5">Add</span>
                                        </motion.button>
                                    ) : (
                                        <div className="flex items-center gap-2 bg-primary text-white rounded-xl p-1 shadow-lg shadow-primary/20" onClick={e => e.stopPropagation()}>
                                            <motion.button 
                                                whileTap={{ scale: 0.8 }}
                                                onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, variantQty - 1, v.id); }}
                                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/20 transition-all"
                                            >
                                                <Minus className="w-3.5 h-3.5" />
                                            </motion.button>
                                            <span className="text-[11px] font-black min-w-[1.2rem] text-center">{variantQty}</span>
                                            <motion.button 
                                                whileTap={{ scale: 0.8 }}
                                                onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, variantQty + 1, v.id); }}
                                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/20 transition-all"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </motion.button>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-center gap-2 p-2">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none pt-0.5">Freshly picked & packed from shelf</span>
                    </div>
                </motion.div>
            </motion.div>
        </>
    );
};

export default VariantSelector;
