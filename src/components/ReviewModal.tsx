import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, CheckCircle, MessageSquare, Send, Loader2, User } from 'lucide-react';
import { StoreReview } from '@/types';
import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/context/AppContext';
import { getAvatarUrl } from '@/utils/avatars';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    reviews: StoreReview[];
    storeId: string;
    storeName: string;
}

const ReviewModal = ({ isOpen, onClose, reviews: allReviews = [], storeId, storeName }: ReviewModalProps) => {
    const { t } = useTranslation();
    const { user, setIsAnyModalOpen } = useApp();

    useEffect(() => {
        setIsAnyModalOpen(isOpen);
        return () => setIsAnyModalOpen(false);
    }, [isOpen, setIsAnyModalOpen]);

    const [selectedStar, setSelectedStar] = useState<number | null>(null);
    const [showWriteReview, setShowWriteReview] = useState(false);
    
    // New review state
    const [newRating, setNewRating] = useState(5);
    const [newComment, setNewComment] = useState('');
    const [newName, setNewName] = useState(user?.name || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});

    const reviews = useMemo(() => {
        if (!allReviews) return [];
        return allReviews.filter(r => r.comment && r.comment.trim() !== '');
    }, [allReviews]);

    // Fetch avatars for reviewers
    useEffect(() => {
        const fetchAvatars = async () => {
            const uniqueUserIds = [...new Set(reviews
                .filter(r => r.userId)
                .map(r => r.userId!)
            )];

            const newAvatars: Record<string, string> = {};
            await Promise.all(uniqueUserIds.map(async (uid) => {
                if (userAvatars[uid]) return; // Skip if already fetched
                try {
                    const userDoc = await getDoc(doc(db, 'users', uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        if (userData.avatarUrl) {
                            newAvatars[uid] = userData.avatarUrl;
                        }
                    }
                } catch (err) {
                    console.error("Error fetching reviewer avatar:", err);
                }
            }));

            if (Object.keys(newAvatars).length > 0) {
                setUserAvatars(prev => ({ ...prev, ...newAvatars }));
            }
        };

        if (reviews.length > 0) {
            fetchAvatars();
        }
    }, [reviews]);

    const hasReviewed = useMemo(() => {
        if (!user?.id || !allReviews) return false;
        return Array.isArray(allReviews) && allReviews.some((r: any) => r.userId === user.id);
    }, [user, allReviews]);

    const stats = useMemo(() => {
        const counts = [0, 0, 0, 0, 0, 0];
        allReviews.forEach(r => {
            const rTag = Math.round(Number(r.rating) || 0);
            if (rTag >= 1 && rTag <= 5) {
                counts[rTag]++;
            }
        });
        const total = allReviews.length || 1;
        return {
            5: { count: counts[5], pct: (counts[5] / total) * 100 },
            4: { count: counts[4], pct: (counts[4] / total) * 100 },
            3: { count: counts[3], pct: (counts[3] / total) * 100 },
            2: { count: counts[2], pct: (counts[2] / total) * 100 },
            1: { count: counts[1], pct: (counts[1] / total) * 100 },
        };
    }, [allReviews]);

    const filteredReviews = useMemo(() => {
        if (selectedStar === null) return reviews;
        return reviews.filter(r => Math.round(Number(r.rating) || 0) === selectedStar);
    }, [reviews, selectedStar]);

    const averageRating = useMemo(() => {
        if (!Array.isArray(allReviews) || allReviews.length === 0) return "0.0";
        const sum = allReviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
        return (sum / allReviews.length).toFixed(1);
    }, [allReviews]);

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) {
            toast.error("Please write a comment.");
            return;
        }
        if (!user) {
            toast.error("Please log in to post a review.");
            return;
        }

        setIsSubmitting(true);
        const reviewData = {
            id: `rev-${Date.now()}`,
            userName: newName || user.name || 'Customer',
            rating: newRating,
            comment: newComment.trim(),
            date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
            userId: user.id,
            avatarUrl: user.avatarUrl || null,
            isAnonymous: !newName && !user.name
        };

        try {
            await updateDoc(doc(db, 'stores', storeId), {
                reviews: arrayUnion(reviewData)
            });
            toast.success("Review submitted! Thank you.");
            setNewComment('');
            setShowWriteReview(false);
        } catch (e) {
            console.error("Submission failed", e);
            toast.error("Failed to submit review.");
        } finally {
            setIsSubmitting(false);
        }
    };

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
                        className="relative w-full max-w-lg glass-strong rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-white/20"
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
                                    <span className="text-xs text-muted-foreground">• {allReviews.length} {t('common.reviews')}</span>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            
                            {/* Write Review Section */}
                            {!showWriteReview && !hasReviewed && (
                                <button 
                                    onClick={() => setShowWriteReview(true)}
                                    className="w-full gradient-primary text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all"
                                >
                                    <MessageSquare className="w-4 h-4" /> Give a Review
                                </button>
                            )}

                            {hasReviewed && (
                                <div className="w-full bg-green-500/10 text-green-500 py-3 rounded-2xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 border border-green-500/20">
                                    <CheckCircle className="w-3.5 h-3.5" /> You've already reviewed this store
                                </div>
                            )}

                            <AnimatePresence>
                                {showWriteReview && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="bg-secondary/40 rounded-3xl p-6 border border-primary/20 space-y-6">
                                            <div className="flex justify-between items-center">
                                                <h3 className="font-black text-sm uppercase tracking-wider text-foreground">Write Your Review</h3>
                                                <button onClick={() => setShowWriteReview(false)} className="text-muted-foreground hover:text-foreground">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="flex flex-col items-center gap-2">
                                                <div className="flex gap-2">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <button
                                                            key={star}
                                                            type="button"
                                                            onClick={() => setNewRating(star)}
                                                            className={`transition-all ${newRating >= star ? 'text-primary scale-110' : 'text-primary/10'}`}
                                                        >
                                                            <Star className={`w-8 h-8 ${newRating >= star ? 'fill-current' : ''}`} />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Comments</label>
                                                    <textarea 
                                                        value={newComment}
                                                        onChange={e => setNewComment(e.target.value)}
                                                        rows={3}
                                                        placeholder="Share your experience..."
                                                        className="w-full bg-white dark:bg-[#151515] rounded-xl px-4 py-3 text-sm font-medium text-foreground outline-none border border-border focus:border-primary transition-all resize-none"
                                                    />
                                                </div>
                                                <button 
                                                    onClick={handleReviewSubmit}
                                                    disabled={isSubmitting}
                                                    className="w-full gradient-primary text-white py-3.5 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                                                >
                                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Submit Review</>}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

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
                                            key={review.id || i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="space-y-2 p-4 rounded-2xl bg-secondary/20 border border-white/10"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-secondary">
                                                        <img 
                                                            src={getAvatarUrl(userAvatars[review.userId || ''] || review.avatarUrl || review.userId || review.userName)} 
                                                            alt={review.userName} 
                                                            className="w-full h-full object-cover"
                                                        />
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
                                                <p className="text-sm text-foreground/90 font-medium leading-relaxed pl-10 border-l-2 ml-4 py-1 border-primary/10 italic">
                                                    "{review.comment}"
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
