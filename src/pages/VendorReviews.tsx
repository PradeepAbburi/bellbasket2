import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Star, ArrowLeft, Send, MessageSquare, Crown, Store as StoreIcon, Search, Filter, TrendingUp, Users, ThumbsUp, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { StoreReview } from '@/types';

const VendorReviews = () => {
    const navigate = useNavigate();
    const { user, stores } = useApp();
    const vendorStore = stores.find(s => s.id === user?.id);
    const reviews: StoreReview[] = vendorStore?.reviews || [];

    const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
    const [filterRating, setFilterRating] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

    const canReply = user?.plan && user.plan !== 'basic' && user.plan !== 'none';
    const canDelete = user?.plan === 'pro';

    // Stats
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0
        ? (reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / totalReviews).toFixed(1)
        : '0.0';
    const repliedCount = reviews.filter(r => r.reply).length;
    const replyRate = totalReviews > 0 ? Math.round((repliedCount / totalReviews) * 100) : 0;

    // Star distribution
    const starCounts = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: reviews.filter(r => Math.round(Number(r.rating)) === star).length,
        pct: totalReviews > 0
            ? Math.round((reviews.filter(r => Math.round(Number(r.rating)) === star).length / totalReviews) * 100)
            : 0,
    }));

    // Filtered & sorted reviews
    const filteredReviews = useMemo(() => {
        let list = [...reviews];

        if (filterRating !== null) {
            list = list.filter(r => Math.round(Number(r.rating)) === filterRating);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(r =>
                r.userName.toLowerCase().includes(q) ||
                r.comment.toLowerCase().includes(q) ||
                (r.reply && r.reply.toLowerCase().includes(q))
            );
        }

        list.sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime();
            if (sortBy === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime();
            if (sortBy === 'highest') return Number(b.rating) - Number(a.rating);
            return Number(a.rating) - Number(b.rating);
        });

        return list;
    }, [reviews, filterRating, searchQuery, sortBy]);

    const handleReplySubmit = async (reviewId: string) => {
        const reply = replyInputs[reviewId];
        if (!reply || !reply.trim() || !user?.id) {
            toast.error('Please enter a reply');
            return;
        }

        if (!canReply) {
            toast.error('Upgrade to Growth or Pro to reply to reviews');
            return;
        }

        const loadingToast = toast.loading('Posting reply...');
        try {
            const updatedReviews = (vendorStore?.reviews || []).map((r: StoreReview) => {
                if (r.id === reviewId) return { ...r, reply: reply.trim() };
                return r;
            });

            await updateDoc(doc(db, 'stores', user.id), { reviews: updatedReviews });

            setReplyInputs(prev => ({ ...prev, [reviewId]: '' }));
            toast.dismiss(loadingToast);
            toast.success('Reply posted successfully!');
        } catch (error) {
            console.error("Reply failed:", error);
            toast.dismiss(loadingToast);
            toast.error('Failed to post reply.');
        }
    };

    const handleDeleteReview = async (reviewId: string) => {
        if (!canDelete) {
            toast.error('Upgrade to Pro to delete reviews');
            return;
        }

        if (!window.confirm("Are you sure you want to delete this review?")) return;

        const loadingToast = toast.loading('Deleting review...');
        try {
            const updatedReviews = (vendorStore?.reviews || []).filter((r: StoreReview) => r.id !== reviewId);
            await updateDoc(doc(db, 'stores', user!.id), { reviews: updatedReviews });
            toast.dismiss(loadingToast);
            toast.success('Review deleted successfully!');
        } catch (error) {
            console.error("Delete failed:", error);
            toast.dismiss(loadingToast);
            toast.error('Failed to delete review.');
        }
    };

    return (
        <div className="min-h-screen gradient-warm">
            <Header />
            <div className="pt-20 pb-44 px-4 max-w-4xl mx-auto relative">
                <button onClick={() => navigate('/vendor')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors relative z-20">
                    <ArrowLeft className="w-4 h-4" /> Dashboard
                </button>

                {/* Gated Content Overlay */}
                {!canReply && (
                    <div className="absolute inset-0 top-32 z-10 flex items-start justify-center pt-32">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="glass-strong rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border-2 border-primary/20 bg-white/60 backdrop-blur-xl mx-4"
                        >
                            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/30">
                                <Crown className="w-8 h-8 text-primary-foreground" />
                            </div>
                            <h2 className="text-2xl font-black text-foreground mb-3">Unlock Customer Reviews</h2>
                            <p className="text-muted-foreground mb-8 text-sm font-medium leading-relaxed">
                                View and reply to customer feedback to build trust and loyalty. This feature is available on <span className="text-primary font-bold">Growth</span> and <span className="text-amber-500 font-bold">Pro</span> plans.
                            </p>
                            <button
                                onClick={() => navigate('/vendor/subscription')}
                                className="w-full py-3.5 rounded-xl gradient-primary text-primary-foreground font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                            >
                                Upgrade Now <Crown className="w-4 h-4" />
                            </button>
                        </motion.div>
                    </div>
                )}

                <div className={`transition-all duration-500 ${!canReply ? 'blur-md opacity-40 pointer-events-none select-none grayscale' : ''}`}>
                    {/* Page Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                                <MessageSquare className="w-6 h-6 text-primary" />
                                Customer Reviews
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">Manage feedback and build trust with your customers</p>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: 'Avg Rating', value: avgRating, icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
                            { label: 'Total Reviews', value: totalReviews, icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-50' },
                            { label: 'Replied', value: `${repliedCount}/${totalReviews}`, icon: ThumbsUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                            { label: 'Reply Rate', value: `${replyRate}%`, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50' },
                        ].map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="glass rounded-2xl p-4"
                            >
                                <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                                </div>
                                <p className="text-xl font-black text-foreground">{stat.value}</p>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{stat.label}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Star Distribution */}
                    <div className="glass rounded-2xl p-6 mb-8">
                        <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            Rating Distribution
                        </h3>
                        <div className="space-y-3">
                            {starCounts.map(({ star, count, pct }) => (
                                <button
                                    key={star}
                                    onClick={() => setFilterRating(filterRating === star ? null : star)}
                                    className={`w-full flex items-center gap-3 group transition-all rounded-lg px-2 py-1 -mx-2 ${filterRating === star ? 'bg-primary/10' : 'hover:bg-secondary/50'}`}
                                >
                                    <span className="text-xs font-bold text-foreground w-4">{star}</span>
                                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.8, delay: (5 - star) * 0.1 }}
                                            className="h-full bg-amber-400 rounded-full"
                                        />
                                    </div>
                                    <span className="text-xs font-bold text-muted-foreground w-12 text-right">{count} ({pct}%)</span>
                                </button>
                            ))}
                        </div>
                        {filterRating !== null && (
                            <button
                                onClick={() => setFilterRating(null)}
                                className="mt-3 text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                            >
                                Clear Filter
                            </button>
                        )}
                    </div>

                    {/* Search & Sort Controls */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-6 sticky top-16 z-30 py-4 -mx-4 px-4 bg-[#202020] backdrop-blur-md border-b border-white/10 rounded-b-2xl shadow-xl">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                            <input
                                type="text"
                                placeholder="Search reviews..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/10 rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-white placeholder:text-white/30 outline-none border border-white/10 focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm p-1 rounded-xl border border-white/10">
                            {(['newest', 'oldest', 'highest', 'lowest'] as const).map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => setSortBy(opt)}
                                    className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${sortBy === opt ? 'bg-primary text-primary-foreground shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reviews List */}
                    <div className="space-y-4">
                        {filteredReviews.length === 0 ? (
                            <div className="glass rounded-2xl p-12 text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto opacity-40">
                                    <MessageSquare className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="font-bold text-foreground">
                                        {totalReviews === 0 ? 'No reviews yet' : 'No matching reviews'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {totalReviews === 0
                                            ? 'Reviews from your customers will appear here.'
                                            : 'Try adjusting your search or filter.'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <AnimatePresence mode="popLayout">
                                {filteredReviews.map((review, i) => (
                                    <motion.div
                                        key={review.id}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ delay: i * 0.04 }}
                                        className={`glass rounded-2xl p-5 space-y-4 transition-all ${!review.reply && canReply ? 'border-l-4 border-amber-400' : ''}`}
                                    >
                                        {/* Review Header */}
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground flex-shrink-0">
                                                    {review.userName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-foreground">{review.userName}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="flex text-amber-400">
                                                            {[...Array(5)].map((_, j) => (
                                                                <Star
                                                                    key={j}
                                                                    className={`w-3 h-3 ${j < Number(review.rating) ? 'fill-current' : 'opacity-20'}`}
                                                                />
                                                            ))}
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">• {review.date}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {review.reply ? (
                                                    <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">Replied</span>
                                                ) : (
                                                    <span className="text-[8px] font-black uppercase tracking-widest bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">Pending</span>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDeleteReview(review.id)}
                                                        className="p-1.5 hover:bg-destructive/10 text-destructive/50 hover:text-destructive rounded-lg transition-colors group-hover:opacity-100 relative z-10"
                                                        title="Delete review (Pro Feature)"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Review Comment */}
                                        <p className="text-sm text-foreground leading-relaxed pl-[52px]">
                                            {review.comment}
                                        </p>

                                        {/* Vendor Reply or Reply Input */}
                                        {review.reply ? (
                                            <div className="pl-[52px] bg-secondary/30 rounded-xl p-4 border-l-4 border-primary">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <StoreIcon className="w-4 h-4 text-primary" />
                                                    <span className="text-xs font-bold text-primary">Your Reply</span>
                                                </div>
                                                <p className="text-sm text-foreground">{review.reply}</p>
                                            </div>
                                        ) : canReply ? (
                                            <div className="pl-[52px] space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reply to this review</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Thank you for your feedback..."
                                                        value={replyInputs[review.id] || ''}
                                                        onChange={(e) => setReplyInputs(prev => ({
                                                            ...prev,
                                                            [review.id]: e.target.value
                                                        }))}
                                                        className="flex-1 bg-secondary/50 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none border-0 focus:ring-1 focus:ring-primary/30"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleReplySubmit(review.id);
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => handleReplySubmit(review.id)}
                                                        className="gradient-primary text-primary-foreground px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
                                                    >
                                                        <Send className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Hidden for non-pro users as the whole page is blurred, but kept structure */
                                            null
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VendorReviews;
