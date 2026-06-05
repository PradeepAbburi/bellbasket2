import { useState, useMemo, useEffect, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, ArrowLeft, Send, MessageSquare, Search, ThumbsUp, CheckCircle, Loader2, Award, Sparkles } from 'lucide-react';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import PageLoading from '@/components/PageLoading';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, getDoc, query, collection, where, getDocs, onSnapshot } from 'firebase/firestore';
import { StoreReview, Store } from '@/types';
import { getAvatarUrl } from '@/utils/avatars';
import { Helmet } from 'react-helmet';

const StoreReviews = () => {
    const { id, slug } = useParams();
    const navigate = useNavigate();
    const { user, stores, loading: contextLoading } = useApp();

    const [store, setStore] = useState<Store | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    // Review filters & form state
    const [selectedStar, setSelectedStar] = useState<number | null>(null);
    const [showWriteForm, setShowWriteForm] = useState(false);
    const [newRating, setNewRating] = useState(5);
    const [newComment, setNewComment] = useState('');
    const [newName, setNewName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 120) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 1. Resolve Store from parameters (ID or Slug)
    useEffect(() => {
        if (!id && !slug) return;

        let isMounted = true;
        let unsubscribe: (() => void) | null = null;

        const loadStore = async () => {
            let targetId = id;

            // Resolve ID from slug if slug is provided
            if (!targetId && slug) {
                try {
                    const q = query(collection(db, 'stores'), where('slug', '==', slug));
                    const snap = await getDocs(q);
                    if (!snap.empty && isMounted) {
                        targetId = snap.docs[0].id;
                    } else if (isMounted) {
                        setNotFound(true);
                        setLoading(false);
                        return;
                    }
                } catch (err) {
                    console.error("Error resolving slug:", err);
                    if (isMounted) {
                        setNotFound(true);
                        setLoading(false);
                        return;
                    }
                }
            }

            if (targetId) {
                // Subscribe to real-time store changes
                unsubscribe = onSnapshot(doc(db, 'stores', targetId), (snap) => {
                    if (snap.exists() && isMounted) {
                        setStore({ id: snap.id, ...snap.data() } as Store);
                        setLoading(false);
                    } else if (isMounted) {
                        setNotFound(true);
                        setLoading(false);
                    }
                }, (err) => {
                    console.error("Error loading store detail:", err);
                    if (isMounted) {
                        setNotFound(true);
                        setLoading(false);
                    }
                });
            }
        };

        loadStore();

        return () => {
            isMounted = false;
            if (unsubscribe) unsubscribe();
        };
    }, [id, slug]);

    // Populate name form field once user is loaded
    useEffect(() => {
        if (user?.name) {
            setNewName(user.name);
        }
    }, [user]);

    // 2. Safe normalization of reviews list
    const safeReviews = useMemo(() => {
        if (!store || !store.reviews) return [];
        return Array.isArray(store.reviews) ? store.reviews : [];
    }, [store]);

    // Active comments-only list
    const commentReviews = useMemo(() => {
        return safeReviews.filter(
            (r: StoreReview) => r && r.comment && typeof r.comment === 'string' && r.comment.trim() !== ""
        );
    }, [safeReviews]);

    // Fetch avatars for comments reviewers
    useEffect(() => {
        const fetchAvatars = async () => {
            const uniqueUserIds = [...new Set(commentReviews
                .filter(r => r && r.userId)
                .map(r => r.userId!)
            )];

            const newAvatars: Record<string, string> = {};
            await Promise.all(uniqueUserIds.map(async (uid) => {
                if (userAvatars[uid]) return;
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

        if (commentReviews.length > 0) {
            fetchAvatars();
        }
    }, [commentReviews]);

    const hasReviewed = useMemo(() => {
        if (!user?.id) return false;
        return safeReviews.some((r: any) => r && r.userId === user.id);
    }, [user, safeReviews]);

    // 3. Review statistics & percentages
    const stats = useMemo(() => {
        const counts = [0, 0, 0, 0, 0, 0];
        safeReviews.forEach(r => {
            if (!r) return;
            const rTag = Math.round(Number(r.rating) || 0);
            if (rTag >= 1 && rTag <= 5) {
                counts[rTag]++;
            }
        });
        const total = safeReviews.length || 1;
        return {
            5: { count: counts[5], pct: (counts[5] / total) * 100 },
            4: { count: counts[4], pct: (counts[4] / total) * 100 },
            3: { count: counts[3], pct: (counts[3] / total) * 100 },
            2: { count: counts[2], pct: (counts[2] / total) * 100 },
            1: { count: counts[1], pct: (counts[1] / total) * 100 },
        };
    }, [safeReviews]);

    const averageRating = useMemo(() => {
        if (safeReviews.length === 0) return "0.0";
        const sum = safeReviews.reduce((acc, r) => acc + (r ? (Number(r.rating) || 0) : 0), 0);
        return (sum / safeReviews.length).toFixed(1);
    }, [safeReviews]);

    // 4. Searching & Filtering
    const filteredReviews = useMemo(() => {
        let list = [...commentReviews];

        if (selectedStar !== null) {
            list = list.filter(r => r && Math.round(Number(r.rating) || 0) === selectedStar);
        }

        // Sort by newest
        list.sort((a, b) => {
            const timeB = b && b.date ? new Date(b.date).getTime() : 0;
            const timeA = a && a.date ? new Date(a.date).getTime() : 0;
            return timeB - timeA;
        });

        return list;
    }, [commentReviews, selectedStar]);

    // 5. Submit Review
    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!store) return;
        if (!newComment.trim()) {
            toast.error("Please write a comment.");
            return;
        }
        if (!user) {
            toast.error("Please log in to post a review.");
            navigate(`/auth?returnTo=${window.location.pathname}`);
            return;
        }

        setIsSubmitting(true);
        const reviewData = {
            id: `rev-${Date.now()}`,
            userName: newName.trim() || user.name || 'Customer',
            rating: newRating,
            comment: newComment.trim(),
            date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
            userId: user.id,
            avatarUrl: user.avatarUrl || null,
            isAnonymous: !newName.trim() && !user.name
        };

        try {
            await updateDoc(doc(db, 'stores', store.id), {
                reviews: arrayUnion(reviewData)
            });
            toast.success("Review submitted! Thank you.");
            setNewComment('');
            setShowWriteForm(false);
        } catch (err) {
            console.error("Submission failed", err);
            toast.error("Failed to submit review.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (notFound) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                    <MessageSquare className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold mb-2">Store Not Found</h2>
                <p className="text-muted-foreground text-sm text-center max-w-xs mb-8">This store reviews are not currently available.</p>
                <button onClick={() => navigate('/')} className="px-6 py-3 gradient-primary text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg shadow-primary/20">Back to Market</button>
            </div>
        );
    }

    if (loading || contextLoading) {
        return <PageLoading />;
    }

    const backPath = slug ? `/stores/${slug}` : `/store/${store?.id}`;

    return (
        <div className="min-h-screen gradient-warm">
            <Helmet>
                <title>{store ? `Customer Reviews of ${store.name} | Verified Ratings - BellBasket` : 'Store Reviews - BellBasket'}</title>
                <meta name="description" content={store ? `Read verified customer feedback, rating stats, and reviews for ${store.name} (${store.category}) located at ${store.address}. Average rating: ${averageRating} / 5 stars based on ${safeReviews.length} reviews.` : 'Read customer reviews and ratings for verified local stores and home service providers in your neighborhood on BellBasket.'} />
                <meta name="keywords" content={store ? `${store.name} reviews, ${store.name} customer ratings, verified reviews ${store.name}, local ratings ${store.name}, ${store.category} stores near me, support local business` : 'local store reviews, kirana reviews, home service ratings, neighborhood shop feedback'} />
                <link rel="canonical" href={slug ? `https://bellbasket.com/stores/${slug}/reviews` : `https://bellbasket.com/store/${id}/reviews`} />
                <meta property="og:title" content={store ? `Customer Reviews of ${store.name} | BellBasket` : 'Store Reviews - BellBasket'} />
                <meta property="og:description" content={store ? `Verified ratings for ${store.name} (${store.category}). Average score: ${averageRating}★ with ${safeReviews.length} customer feedback comments.` : 'Read customer reviews and ratings for verified local stores on BellBasket.'} />
                <meta property="og:url" content={window.location.href} />
                <meta name="robots" content="index, follow" />
                {store && (
                    <script type="application/ld+json">
                        {JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "LocalBusiness",
                            "name": store.name,
                            "image": store.image || getAvatarUrl(store.id),
                            "@id": slug ? `https://bellbasket.com/stores/${slug}` : `https://bellbasket.com/store/${store.id}`,
                            "url": slug ? `https://bellbasket.com/stores/${slug}` : `https://bellbasket.com/store/${store.id}`,
                            "telephone": store.phone || "",
                            "address": {
                                "@type": "PostalAddress",
                                "streetAddress": store.address || "Local",
                                "addressLocality": store.address?.split(',')[0] || "Local",
                                "addressCountry": "IN"
                            },
                            "aggregateRating": {
                                "@type": "AggregateRating",
                                "ratingValue": averageRating,
                                "reviewCount": safeReviews.length > 0 ? safeReviews.length : 1,
                                "bestRating": "5",
                                "worstRating": "1"
                            },
                            "review": commentReviews.slice(0, 5).map(r => ({
                                "@type": "Review",
                                "author": {
                                    "@type": "Person",
                                    "name": r.userName || "Customer"
                                },
                                "datePublished": r.date ? new Date(r.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                                "reviewBody": r.comment || "",
                                "reviewRating": {
                                    "@type": "Rating",
                                    "ratingValue": r.rating || 5,
                                    "bestRating": "5"
                                }
                            }))
                        })}
                    </script>
                )}
            </Helmet>
            <Header />

            {/* Sticky Fixed Header on Scroll */}
            <AnimatePresence>
                {isScrolled && (
                    <motion.div 
                        initial={{ y: -64, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -64, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed top-16 left-0 right-0 z-40 bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-md border-b border-border/40 shadow-sm"
                    >
                        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 min-w-0">
                                <button onClick={() => navigate(backPath)} className="p-2 rounded-xl hover:bg-secondary transition-colors shrink-0 text-foreground">
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <h2 className="font-black text-base text-foreground truncate">{store?.name}</h2>
                            </div>
                            <div className="flex items-center gap-1.5 bg-amber-400/10 text-amber-500 border border-amber-400/20 px-3 py-1.5 rounded-xl shrink-0">
                                <Star className="w-4 h-4 fill-current shrink-0" />
                                <span className="font-black text-sm text-foreground leading-none">{averageRating}</span>
                                <span className="text-[10px] text-muted-foreground font-bold">({safeReviews.length})</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="pt-20 pb-32 px-4 max-w-2xl mx-auto">
                <button onClick={() => navigate(backPath)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Store
                </button>

                {/* Store mini-profile card */}
                <div className="glass rounded-[2rem] p-5 mb-8 flex items-center gap-4 border border-white/10 shadow-lg relative overflow-hidden group">
                    <div className="w-16 h-16 rounded-2xl bg-secondary overflow-hidden shrink-0 border border-white/10 relative">
                        <img src={getAvatarUrl(store?.id || '')} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md uppercase tracking-wider mb-1 inline-block">{store?.category}</span>
                        <h2 className="text-xl font-extrabold text-foreground truncate drop-shadow-sm">{store?.name}</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">{store?.address ? store.address.split(',')[1]?.trim() || store.address.split(',')[0] : 'Local Shop'}</p>
                    </div>
                </div>

                {/* Review stats panel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-white dark:bg-[#1a1a1a] rounded-[2.5rem] p-6 border border-border/20 shadow-xl">
                    <div className="flex flex-col items-center justify-center text-center p-4 border-b md:border-b-0 md:border-r border-border/50">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Average Rating</p>
                        <p className="text-6xl font-black text-foreground tracking-tighter leading-none mb-3">{averageRating}</p>
                        <div className="flex text-amber-400 gap-1 mb-2">
                            {[1, 2, 3, 4, 5].map(star => (
                                <Star key={star} className={`w-4 h-4 ${Math.round(Number(averageRating)) >= star ? 'fill-current' : 'opacity-20'}`} />
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground font-semibold">{safeReviews.length} total reviews</p>
                    </div>

                    <div className="space-y-2.5 p-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3 text-left pl-1">Ratings Breakdown</p>
                        {[5, 4, 3, 2, 1].map(star => (
                            <button
                                key={star}
                                onClick={() => setSelectedStar(selectedStar === star ? null : star)}
                                className={`w-full flex items-center gap-3 group rounded-xl p-1 transition-all ${selectedStar === star ? 'bg-primary/15 scale-[1.01]' : 'hover:bg-secondary/40'}`}
                            >
                                <span className="text-xs font-bold text-foreground w-3 text-left">{star}</span>
                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full gradient-primary rounded-full"
                                        style={{ width: `${stats[star as keyof typeof stats].pct}%` }}
                                    />
                                </div>
                                <span className="text-xs font-bold text-muted-foreground w-12 text-right">
                                    {stats[star as keyof typeof stats].count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Write Review Gating & submission form */}
                {!showWriteForm && !hasReviewed && (
                    <button 
                        onClick={() => setShowWriteForm(true)}
                        className="w-full gradient-primary text-primary-foreground py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all mb-8"
                    >
                        <MessageSquare className="w-4 h-4" /> Share Your Review
                    </button>
                )}

                {hasReviewed && (
                    <div className="w-full bg-emerald-500/10 text-emerald-500 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 border border-emerald-500/20 mb-8">
                        <CheckCircle className="w-4 h-4" /> You have already posted reviews for this store
                    </div>
                )}

                <AnimatePresence>
                    {showWriteForm && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden mb-8"
                        >
                            <form onSubmit={handleReviewSubmit} className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] p-6 border border-primary/20 space-y-6">
                                <div className="flex justify-between items-center pb-2 border-b border-border/40">
                                    <h3 className="font-black text-sm uppercase tracking-wider text-foreground">Write Your Review</h3>
                                    <button type="button" onClick={() => setShowWriteForm(false)} className="text-muted-foreground hover:text-foreground">
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex flex-col items-center gap-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select Rating</p>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setNewRating(star)}
                                                className={`transition-all ${newRating >= star ? 'text-amber-500 scale-110' : 'text-primary/10'}`}
                                            >
                                                <Star className={`w-8 h-8 ${newRating >= star ? 'fill-current' : ''}`} />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Your Name (Leave blank for anonymous)</label>
                                        <input
                                            type="text"
                                            value={newName}
                                            onChange={e => setNewName(e.target.value)}
                                            placeholder="John Doe"
                                            className="w-full bg-white dark:bg-[#151515] rounded-xl px-4 py-3 text-sm font-bold text-foreground outline-none border border-border focus:border-primary transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Comments</label>
                                        <textarea 
                                            value={newComment}
                                            onChange={e => setNewComment(e.target.value)}
                                            rows={3}
                                            placeholder="Share your experience shopping at this store..."
                                            className="w-full bg-white dark:bg-[#151515] rounded-xl px-4 py-3 text-sm font-medium text-foreground outline-none border border-border focus:border-primary transition-all resize-none"
                                        />
                                    </div>
                                    <button 
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full gradient-primary text-primary-foreground py-3.5 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Post Review</>}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Reviews Cards List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                        <h3 className="font-bold text-sm text-foreground">
                            {selectedStar ? `${selectedStar} Star Reviews` : 'Customer Feedback'}
                        </h3>
                        <div className="flex items-center gap-3">
                            {selectedStar !== null && (
                                <button
                                    onClick={() => setSelectedStar(null)}
                                    className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg shrink-0 hover:bg-primary hover:text-white transition-all active:scale-95"
                                >
                                    Show All
                                </button>
                            )}
                            <span className="text-xs text-muted-foreground">{filteredReviews.length} matching comments</span>
                        </div>
                    </div>

                    {filteredReviews.length === 0 ? (
                        <div className="glass rounded-[2rem] py-16 text-center space-y-3 border border-border/30 shadow-md">
                            <Star className="w-12 h-12 text-muted-foreground/15 mx-auto" />
                            <p className="font-extrabold text-foreground">No matching reviews</p>
                            <p className="text-xs text-muted-foreground px-4">There are no reviews with comments matching your criteria.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredReviews.map((review, idx) => (
                                <motion.div
                                    key={review.id || idx}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="p-5 rounded-[2rem] bg-white/40 dark:bg-black/20 border border-white/10 shadow-lg relative overflow-hidden group"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-secondary shrink-0">
                                                <img 
                                                    src={getAvatarUrl(userAvatars[review.userId || ''] || review.avatarUrl || review.userId || review.userName)} 
                                                    alt={review.userName} 
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-extrabold text-foreground leading-none">{review.userName}</p>
                                                    <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                        <CheckCircle className="w-2.5 h-2.5 fill-current shrink-0" />
                                                        Verified
                                                    </div>
                                                </div>
                                                <span className="text-[10px] text-muted-foreground">{review.date}</span>
                                            </div>
                                        </div>
                                        <div className="flex text-amber-400">
                                            {[...Array(5)].map((_, j) => (
                                                <Star
                                                    key={j}
                                                    className={`w-3.5 h-3.5 ${j < review.rating ? 'fill-current' : 'opacity-20'}`}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <p className="text-sm text-foreground/90 font-medium leading-relaxed pl-12 border-l-2 ml-5 py-1 border-primary/20 italic">
                                        "{review.comment}"
                                    </p>

                                    {/* Nested Vendor Response */}
                                    {review.reply && (
                                        <div className="ml-12 mt-4 p-4 rounded-2xl border-l-4 space-y-2 bg-primary/5 border-primary shadow-sm">
                                            <div className="flex items-center gap-2 text-primary">
                                                <Sparkles className="w-3.5 h-3.5 fill-current shrink-0" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Vendor Response</span>
                                            </div>
                                            <p className="text-xs text-foreground/80 leading-relaxed italic">
                                                "{review.reply}"
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StoreReviews;
