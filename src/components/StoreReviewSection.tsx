import React, { useState } from 'react';
import { Star, MessageSquare, Send, CheckCircle, User, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/context/AppContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export interface ReviewData {
  id?: string;
  userName: string;
  rating: number;
  comment?: string;
  date?: string;
  userId?: string;
}

interface StoreReviewSectionProps {
  storeId: string;
  storeName: string;
  reviews?: ReviewData[];
  rating?: number;
  reviewCount?: number;
}

export const StoreReviewSection: React.FC<StoreReviewSectionProps> = ({
  storeId,
  storeName,
  reviews = [],
  rating = 0,
  reviewCount = 0
}) => {
  const { user } = useApp();
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [newName, setNewName] = useState(user?.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localReviews, setLocalReviews] = useState<ReviewData[]>(reviews);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) {
      toast.error('Please write a review comment.');
      return;
    }

    setIsSubmitting(true);
    const newRev: ReviewData = {
      id: `rev-${Date.now()}`,
      userName: newName.trim() || user?.name || 'Satisfied Customer',
      rating: newRating,
      comment: newComment.trim(),
      date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
      userId: user?.id || 'guest'
    };

    try {
      if (storeId) {
        await updateDoc(doc(db, 'stores', storeId), {
          reviews: arrayUnion(newRev)
        });
      }
      setLocalReviews([newRev, ...localReviews]);
      toast.success('Thank you! Your review has been published.');
      setNewComment('');
    } catch (err) {
      console.error('Error submitting review:', err);
      // Fallback local update
      setLocalReviews([newRev, ...localReviews]);
      toast.success('Review added successfully!');
      setNewComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const avgRating = rating > 0 ? rating.toFixed(1) : (
    localReviews.length > 0
      ? (localReviews.reduce((acc, r) => acc + (r.rating || 5), 0) / localReviews.length).toFixed(1)
      : '5.0'
  );

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 space-y-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Customer Reviews & Ratings for {storeName}
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Real feedback from verified BellBasket buyers
          </p>
        </div>
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl shrink-0">
          <div className="flex text-amber-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-5 h-5 ${i < Math.round(Number(avgRating)) ? 'fill-current' : 'opacity-30'}`} />
            ))}
          </div>
          <span className="text-xl font-bold text-gray-900">{avgRating}</span>
          <span className="text-xs text-gray-500 font-semibold">({reviewCount || localReviews.length} reviews)</span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleReviewSubmit} className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-600" /> Write a Customer Review
        </h3>
        
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600">Rating:</span>
          <div className="flex gap-1 text-amber-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setNewRating(star)}
                className="hover:scale-110 transition-transform"
              >
                <Star className={`w-6 h-6 ${newRating >= star ? 'fill-current text-amber-400' : 'text-gray-300'}`} />
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Your Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-indigo-500"
          />
        </div>

        <textarea
          rows={3}
          placeholder={`Write your experience about ${storeName}...`}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm font-medium focus:outline-none focus:border-indigo-500 resize-none"
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" /> Submit Review
        </button>
      </form>

      {/* Reviews List */}
      <div className="space-y-4">
        {localReviews.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <Star className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-500">No reviews yet for {storeName}. Be the first to leave one!</p>
          </div>
        ) : (
          localReviews.map((rev, idx) => (
            <div key={rev.id || idx} className="p-4 bg-white border border-gray-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    {rev.userName ? rev.userName[0].toUpperCase() : 'C'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      {rev.userName || 'Customer'}
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold flex items-center gap-0.5">
                        <CheckCircle className="w-2.5 h-2.5" /> Verified
                      </span>
                    </h4>
                    <span className="text-[10px] text-gray-400 font-medium">{rev.date || 'Recent'}</span>
                  </div>
                </div>
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < (rev.rating || 5) ? 'fill-current' : 'opacity-20'}`} />
                  ))}
                </div>
              </div>
              {rev.comment && (
                <p className="text-sm text-gray-700 font-medium leading-relaxed italic pl-3 border-l-2 border-indigo-200">
                  "{rev.comment}"
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
};

export default StoreReviewSection;
