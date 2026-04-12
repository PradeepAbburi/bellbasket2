import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, PackageX, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Product } from '@/types';

interface ProductCardProps {
    product: Product;
    qty: number;
    highlighted: boolean;
    addToCart: (options: {
        product: Product;
        storeId: string;
        storeName: string;
        storePhone: string;
        quantity: number;
    }) => void;
    updateQuantity: (productId: string, newQty: number) => void;
    storeId: string;
    storeName: string;
    storePhone: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
    product,
    qty,
    highlighted,
    addToCart,
    updateQuantity,
    storeId,
    storeName,
    storePhone,
}) => {
    const { t } = useTranslation();
    const hasDiscount = !!product.discountedPrice && product.discountedPrice < product.price;
    const discountedPrice = hasDiscount ? product.discountedPrice : product.price;

    return (
        <motion.div
            key={product.id}
            id={`product-${product.id}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -8, scale: 1.02 }}
            className={`w-[155px] sm:w-[185px] md:w-[220px] h-[335px] shrink-0 snap-start bg-white/30 dark:bg-[#202020]/60 backdrop-blur-xl rounded-[2rem] border border-white/20 shadow-lg hover:shadow-2xl transition-all duration-300 group flex flex-col overflow-hidden relative ${highlighted ? 'border-primary ring-4 ring-primary/20 scale-105 z-10' : 'border-white/40'
                }`}
        >
            {/* Image Section */}
            <div className="relative h-[150px] shrink-0 overflow-hidden p-2">
                <div className="w-full h-full rounded-[1.8rem] overflow-hidden bg-gradient-to-br from-secondary/20 to-secondary/5 relative">
                    <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                {/* Stock Overlay */}
                {!product.inStock && (
                    <div className="absolute inset-2.5 rounded-[1.8rem] bg-black/50 backdrop-blur-[1px] z-20 flex flex-col items-center justify-center p-3 text-center">
                        <span className="text-white text-[9px] font-black uppercase tracking-widest bg-red-500/80 px-2 py-1 rounded-full">
                            {t('common.out_of_stock')}
                        </span>
                    </div>
                )}
                {/* Discount Badge */}
                {hasDiscount && (
                    <div className="absolute top-3 left-3 z-20 bg-primary/90 backdrop-blur-md text-primary-foreground text-[8px] sm:text-[9px] font-black px-2 py-1 rounded-full flex items-center gap-1 shadow-lg border border-white/20 uppercase tracking-tighter">
                        {Math.round(((product.price - product.discountedPrice!) / product.price) * 100)}% {t('common.off')}
                    </div>
                )}
                {/* Quantity Tag & Quality Badge */}
                <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 z-20">
                    {product.quantity && (
                        <div className="bg-slate-900/80 backdrop-blur-md text-white text-[8px] sm:text-[9px] font-black px-2.5 py-1 rounded-full shadow-lg border border-white/10 uppercase tracking-tighter">
                            {product.quantity.includes(' - ') ? product.quantity : product.quantity.replace(/([0-9.]+)([a-zA-Z]+)/, '$1 - $2')}
                        </div>
                    )}

                </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-col flex-1 px-4 pb-4 pt-0 min-w-0">
                <div className="flex flex-col min-h-[38px] sm:min-h-[42px] md:min-h-[48px] justify-center">
                    <h3 className="font-black text-xs sm:text-[14px] md:text-[15px] text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-primary transition-colors duration-300 tracking-tight leading-none mb-1">
                        {t(`products.${product.name}`, { defaultValue: product.name })}
                    </h3>
                    <p className="text-[8px] sm:text-[9px] text-muted-foreground/50 line-clamp-1 leading-relaxed font-bold uppercase tracking-tighter">
                        {product.description ? t(`products_desc.${product.name}`, { defaultValue: product.description }) : ''}
                    </p>
                </div>
                <div className="mt-auto pt-2 border-t border-slate-100/50">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 h-6 sm:h-7">
                                <span className="text-sm sm:text-base md:text-lg font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                                    ₹{discountedPrice}
                                </span>
                                {hasDiscount && (
                                    <span className="text-[10px] text-muted-foreground line-through opacity-40 font-bold leading-none mt-0.5">
                                        ₹{product.price}
                                    </span>
                                )}
                            </div>
                            <span className="text-[8px] font-black text-muted-foreground/30 uppercase tracking-[0.1em] -mt-0.5">Net Price</span>
                        </div>
                        {product.inStock && (
                            <div className="flex items-center gap-1">
                                {qty === 0 ? (
                                    <motion.button
                                        whileTap={{ scale: 0.92 }}
                                        whileHover={{ scale: 1.05 }}
                                        onClick={() => {
                                            addToCart({ product, storeId, storeName, storePhone, quantity: 1 });
                                        }}
                                        className="gradient-primary text-primary-foreground h-8 px-4 sm:h-9 sm:px-5 rounded-xl flex items-center justify-center gap-1.5 shadow-[0_5px_15px_-5px_rgba(234,179,8,0.4)] hover:shadow-primary/40 transition-all font-black"
                                    >
                                        <Plus className="w-3 h-3" />
                                        <span className="text-[9px] sm:text-[10px] uppercase tracking-widest pt-0.5">Add</span>
                                    </motion.button>
                                ) : (
                                    <div className="flex items-center gap-1 bg-primary/5 rounded-xl p-0.5 border border-primary/10 backdrop-blur-sm">
                                        <motion.button
                                            whileTap={{ scale: 0.8 }}
                                            onClick={() => updateQuantity(product.id, qty - 1)}
                                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white dark:bg-[#202020] text-primary flex items-center justify-center hover:bg-destructive hover:text-white transition-all shadow-sm border border-border/10"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </motion.button>
                                        <span className="text-xs font-black text-primary min-w-[1rem] text-center">{qty}</span>
                                        <motion.button
                                            whileTap={{ scale: 0.8 }}
                                            onClick={() => updateQuantity(product.id, qty + 1)}
                                            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-primary text-white flex items-center justify-center hover:opacity-90 transition-all shadow-sm"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </motion.button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ProductCard;
