import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, CheckCircle } from 'lucide-react';
import { StoreReview } from '@/types';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    reviews: StoreReview[];
    storeName: string;
}

const ReviewModal = ({ isOpen, onClose, reviews = [], storeName }: ReviewModalProps) => {
    const { t } = useTranslation();
    const [selectedStar, setSelectedStar] = useState<number | null>(null);

    const stats = useMemo(() => {
        const counts = [0, 0, 0, 0, 0, 0];
        reviews.forEach(r => {
            const rTag = Math.round(Number(r.rating) || 0);
            if (rTag >= 1 && rTag <= 5) {
                counts[rTag]++;
            }
        });
        const total = reviews.length || 1;
        return {
            5: { count: counts[5], pct: (counts[5] / total) * 100 },
            4: { count: counts[4], pct: (counts[4] / total) * 100 },
            3: { count: counts[3], pct: (counts[3] / total) * 100 },
            2: { count: counts[2], pct: (counts[2] / total) * 100 },
            1: { count: counts[1], pct: (counts[1] / total) * 100 },
        };
    }, [reviews]);

    const filteredReviews = useMemo(() => {
        const withComment = reviews.filter(r => r.comment && r.comment.trim() !== '');
        if (selectedStar === null) return withComment;
        return withComment.filter(r => Math.round(Number(r.rating) || 0) === selectedStar);
    }, [reviews, selectedStar]);

    const averageRating = useMemo(() => {
        if (!Array.isArray(reviews) || reviews.length === 0) return "0.0";
        const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
        return (sum / reviews.length).toFixed(1);
    }, [reviews]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-lg glass-strong rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/30">
                            <div>
                                <h2 className="text-xl font-bold text-foreground">{storeName} {t('common.reviews')}</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="flex text-primary">
                                        <Star className="w-4 h-4 fill-current" />
                                    </div>
                                    <span className="text-sm font-bold text-foreground">{averageRating}</span>
                                    <span className="text-xs text-muted-foreground">• {reviews.length} {t('common.reviews')}</span>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {/* Ratings Summary */}
                            <div className="space-y-3">
                                {[5, 4, 3, 2, 1].map(star => (
                                    <button
                                        key={star}
                                        onClick={() => setSelectedStar(selectedStar === star ? null : star)}
                                        className={`w-full flex items-center gap-4 group hover:bg-secondary/20 p-1 rounded-lg transition-colors ${selectedStar === star ? 'bg-primary/10' : ''}`}
                                    >
                                        <span className="text-xs font-bold text-muted-foreground w-2">{star}</span>
                                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${stats[star as keyof typeof stats].pct}%` }}
                                                className="h-full gradient-primary"
                                            />
                                        </div>
                                        <span className="text-xs font-medium text-muted-foreground w-8 text-right">
                                            {stats[star as keyof typeof stats].count}
                                        </span>
                                    </button>
                                ))}
                                {selectedStar !== null && (
                                    <button
                                        onClick={() => setSelectedStar(null)}
                                        className="text-[10px] font-bold uppercase tracking-wider hover:underline block mx-auto pt-2 text-primary"
                                    >
                                        {t('common.show_all_reviews')}
                                    </button>
                                )}
                            </div>

                            {/* Review List */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                                    <h3 className="font-bold text-sm text-foreground">
                                        {selectedStar ? `${selectedStar} ${t('common.star_reviews')}` : t('common.all_reviews')}
                                    </h3>
                                    <span className="text-xs text-muted-foreground">{filteredReviews.length} {t('common.items')}</span>
                                </div>

                                {filteredReviews.length === 0 ? (
                                    <div className="py-12 text-center space-y-2">
                                        <Star className="w-10 h-10 text-muted-foreground/10 mx-auto" />
                                        <p className="text-sm text-muted-foreground">{t('common.no_reviews_yet')}</p>
                                    </div>
                                ) : (
                                    filteredReviews.map((review, i) => (
                                        <motion.div
                                            key={review.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="space-y-2 p-4 rounded-2xl bg-secondary/20 border border-white/10"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white gradient-primary">
                                                        {review.userName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-bold text-foreground leading-none">{review.userName}</p>
                                                            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[8px] font-black uppercase tracking-widest border border-green-500/20">
                                                                <CheckCircle className="w-2 h-2" />
                                                                {t('common.verified')}
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground">{review.date}</span>
                                                    </div>
                                                </div>
                                                <div className="flex text-primary">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star
                                                            key={i}
                                                            className={`w-3 h-3 ${i < review.rating ? 'fill-current' : 'opacity-20'}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            {review.comment && (
                                                <p className="text-sm text-foreground/90 font-medium leading-relaxed pl-10 border-l-2 ml-4 py-1 border-primary/10">
                                                    {t(`reviews.${review.id}`, { defaultValue: review.comment })}
                                                </p>
                                            )}

                                            {/* Vendor Reply Thread */}
                                            {review.reply && (
                                                <div className="ml-10 mt-3 p-3 rounded-xl border-l-4 space-y-2 bg-primary/5 border-primary">
                                                    <div className="flex items-center gap-2 text-primary">
                                                        <CheckCircle className="w-3 h-3" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">{t('common.vendor_response')}</span>
                                                    </div>
                                                    <p className="text-xs text-foreground/80 leading-relaxed italic">
                                                        "{review.reply}"
                                                    </p>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ReviewModal;
