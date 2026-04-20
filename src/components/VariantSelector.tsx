import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ChevronRight, Minus, Plus } from 'lucide-react';
import type { Product, ProductVariant, CartItem } from '@/types';

interface VariantSelectorProps {
    product: Product | null;
    cart: CartItem[];
    updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
    onClose: () => void;
    onSelect: (variant: ProductVariant) => void;
}

const VariantSelector: React.FC<VariantSelectorProps> = ({ product, cart, updateQuantity, onClose, onSelect }) => {
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
                    className="w-full max-w-xl bg-white dark:bg-[#202020] rounded-t-[3rem] p-8 pb-12 space-y-8 shadow-2xl relative border-t border-white/5"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-border/20 rounded-full" />
                    
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-black text-foreground uppercase tracking-tight">{product.name}</h3>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1">Available Quantities & Prices</p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-all border border-border/50"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
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
                                    className={`w-full p-5 sm:p-6 rounded-[2rem] border transition-all active:scale-[0.98] flex items-center justify-between group ${
                                        variantQty > 0 
                                            ? 'bg-primary/5 dark:bg-white/5 border-primary/30 shadow-lg' 
                                            : 'bg-secondary/30 dark:bg-white/[0.03] border-border/50 hover:bg-primary/5 hover:border-primary/30'
                                    }`}
                                >
                                    <div className="flex flex-col items-start gap-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-black tracking-[0.15em] text-muted-foreground uppercase">{v.quantity}</span>
                                            {variantQty > 0 && (
                                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest">
                                                    <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                                                    Selected
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl font-black text-foreground">₹{finalVariantPrice}</span>
                                            {hasVariantDiscount && (
                                                <span className="text-xs text-muted-foreground line-through opacity-50 decoration-2">₹{v.price}</span>
                                            )}
                                        </div>
                                    </div>
                                    {variantQty === 0 ? (
                                        <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-white transition-all border border-border/50">
                                            <Plus className="w-5 h-5" />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 bg-secondary/80 dark:bg-white/10 backdrop-blur-md rounded-2xl p-1.5 border border-border/50" onClick={e => e.stopPropagation()}>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, variantQty - 1, v.id); }}
                                                className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 shadow-sm transition-all"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="text-sm font-black text-foreground min-w-[1rem] text-center">{variantQty}</span>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, variantQty + 1, v.id); }}
                                                className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 shadow-sm transition-all"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
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
