import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Sparkles, Heart, MessageCircle, Share2, ShoppingBag, Wrench, Send, Info, Eye, X, MessageSquare, ChevronUp, ChevronDown, CheckCircle2, User } from 'lucide-react';
import Header from '@/components/Header';
import { toast } from 'sonner';

const initialClips = [
  {
    id: 1,
    username: '@brew_alchemy',
    storeName: 'Brew Alchemy Café',
    caption: 'Pouring fresh organic single-origin lattes all morning. Order below! ☕️✨',
    bgUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
    likes: 2405,
    liked: false,
    comments: [
      { id: 1, user: 'Rahul Dev', text: 'Best espresso in town! Ordered mine already.' },
      { id: 2, user: 'Neha Sen', text: 'Is the caramel syrup house-made?' }
    ],
    cardType: 'product',
    cardTitle: 'Specialty Café Latte',
    cardImage: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&auto=format&fit=crop&q=80',
    cardPrice: '₹180',
    actionText: 'Buy Now',
    formPrompt: 'Request coffee cart catering'
  },
  {
    id: 2,
    username: '@blade_and_beard',
    storeName: 'Blade & Beard Salon',
    caption: 'Classic haircut, beard grooming, and hot towel styling slots available. Book now! ✂️💈',
    bgUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&auto=format&fit=crop&q=80',
    likes: 1104,
    liked: false,
    comments: [
      { id: 1, user: 'Amit K.', text: 'Highly recommend Stylist Vikram. Clean cut.' },
      { id: 2, user: 'Rohit S.', text: 'Do they do home appointments?' }
    ],
    cardType: 'service',
    cardTitle: 'Haircut & Styling',
    cardImage: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=200&auto=format&fit=crop&q=80',
    cardPrice: '₹450',
    actionText: 'Book Slot',
    formPrompt: 'Inquire about home service'
  },
  {
    id: 3,
    username: '@dough_alchemy',
    storeName: 'Dough Alchemy Pizza',
    caption: 'Wood-fired sourdough Neapolitan pizza baked fresh to order. Tagged card below! 🍕🔥',
    bgUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=80',
    likes: 3102,
    liked: false,
    comments: [
      { id: 1, user: 'Sneha L.', text: 'That blistered crust looks perfect.' },
      { id: 2, user: 'Vikram A.', text: 'Ordered the Margherita. Delivered in 15 mins hot!' }
    ],
    cardType: 'product',
    cardTitle: 'Sourdough Margherita',
    cardImage: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&auto=format&fit=crop&q=80',
    cardPrice: '₹299',
    actionText: 'Buy Now',
    formPrompt: 'Book party catering'
  }
];

const Clips = () => {
  const navigate = useNavigate();
  const [showSimulator, setShowSimulator] = useState(false);
  const [clips, setClips] = useState(initialClips);
  const [activeIdx, setActiveIdx] = useState(0);
  
  // Interactive UI states
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', query: '' });
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'success'>('details');

  const currentClip = clips[activeIdx];

  const handleNextVideo = () => {
    if (activeIdx < clips.length - 1) {
      setActiveIdx(prev => prev + 1);
      setShowComments(false);
    } else {
      toast.info('You reached the end of the feed!');
    }
  };

  const handlePrevVideo = () => {
    if (activeIdx > 0) {
      setActiveIdx(prev => prev - 1);
      setShowComments(false);
    }
  };

  const toggleLike = (clipId: number) => {
    setClips(prev => prev.map(c => {
      if (c.id === clipId) {
        return {
          ...c,
          liked: !c.liked,
          likes: c.likes + (c.liked ? -1 : 1)
        };
      }
      return c;
    }));
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    setClips(prev => prev.map(c => {
      if (c.id === currentClip.id) {
        return {
          ...c,
          comments: [...c.comments, { id: Date.now(), user: 'You (Demo User)', text: commentInput }]
        };
      }
      return c;
    }));
    setCommentInput('');
    toast.success('Comment posted (Demo mode)');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.query) {
      toast.error('Please fill in all fields');
      return;
    }
    toast.success(`Form submitted successfully!`, {
      description: `Inquiry sent to ${currentClip.storeName}. They will response via WhatsApp shortly.`
    });
    setShowFormModal(false);
    setFormData({ name: '', phone: '', query: '' });
  };

  const handlePay = () => {
    setCheckoutStep('success');
    toast.success(`${currentClip.cardType === 'product' ? 'Order Placed' : 'Booking Confirmed'}!`);
  };

  const closeCheckout = () => {
    setShowCheckoutModal(false);
    setCheckoutStep('details');
  };

  return (
    <div className="min-h-screen bg-[#202020] text-white flex flex-col relative overflow-hidden">
      {/* Decorative liquid background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          animate={{
            borderRadius: ["40% 60% 70% 30% / 40% 50% 60% 50%", "60% 40% 30% 70% / 50% 60% 40% 60%", "40% 60% 70% 30% / 40% 50% 60% 50%"],
            x: [0, 30, 0],
            y: [0, -20, 0]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-gradient-to-tr from-amber-500/15 via-yellow-600/10 to-transparent blur-[120px]"
        />
        <motion.div
          animate={{
            borderRadius: ["50% 50% 30% 70% / 50% 60% 30% 60%", "30% 70% 70% 30% / 50% 30% 70% 40%", "50% 50% 30% 70% / 50% 60% 30% 60%"],
            x: [0, -30, 0],
            y: [0, 30, 0]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-gradient-to-bl from-amber-600/15 via-yellow-500/10 to-transparent blur-[120px]"
        />
      </div>

      <Header solid />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 pt-24 pb-16 flex flex-col items-center justify-center relative z-10">
        
        {/* Navigation Breadcrumb */}
        <button
          onClick={() => {
            if (showSimulator) {
              setShowSimulator(false);
            } else {
              navigate('/browse');
            }
          }}
          className="self-start flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-amber-500 hover:text-amber-400 mb-8 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> {showSimulator ? 'Back to Overview' : 'Back to Browse'}
        </button>

        <AnimatePresence mode="wait">
          {!showSimulator ? (
            /* Intro Section */
            <motion.div
              key="intro-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="w-full grid md:grid-cols-12 gap-8 items-center mt-2"
            >
              <div className="md:col-span-7 space-y-6 text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider rounded-full">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Interactive Experience
                </div>
                
                <h1 
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                  className="text-4xl md:text-5xl font-black tracking-tight leading-none uppercase bg-gradient-to-r from-white via-zinc-200 to-amber-400 bg-clip-text text-transparent"
                >
                  BellBasket Clips
                </h1>
                
                <p className="text-sm text-zinc-400 font-medium leading-relaxed">
                  Explore your neighborhood visually. Clips brings short-form video directly to your local marketplace. Local stores, chefs, and experts upload updates, product details, and styling clips to connect with you.
                </p>

                {/* Redesigned interactive feature cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-sm space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">Visual Commerce</h4>
                    <p className="text-[11px] text-zinc-500 leading-normal">Interactive overlays let you view and purchase products directly as you watch.</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-sm space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">Instant Bookings</h4>
                    <p className="text-[11px] text-zinc-500 leading-normal">Schedule salons, repairs, or catering instantly via action cards embedded in clips.</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 backdrop-blur-sm space-y-2 sm:col-span-2">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                        <Send className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">Direct-to-Vendor Inquiries</h4>
                        <p className="text-[11px] text-zinc-500 leading-normal">Have custom requests? Fill the quick query sheet pinned inside the clip for a direct response.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-4">
                  <button
                    onClick={() => setShowSimulator(true)}
                    className="px-8 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4.5 h-4.5 fill-current" /> Launch Simulator
                  </button>
                  <div className="text-[11px] text-zinc-500 font-medium">
                    Try the interactive prototype demo
                  </div>
                </div>
              </div>

              {/* Right Mock phone layout */}
              <div className="md:col-span-5 flex flex-col items-center w-full">
                {/* Phone Container */}
                <div className="w-full max-w-[280px] aspect-[9/16] bg-zinc-900 border-4 border-zinc-800 rounded-[2.5rem] shadow-2xl p-2.5 flex flex-col relative overflow-hidden group">
                  <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-20 h-4.5 bg-black rounded-full z-30 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-zinc-900" />
                  </div>

                  <div className="flex-1 bg-zinc-950 rounded-[2rem] overflow-hidden relative flex flex-col justify-end p-4 border border-white/5 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80')" }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/35 pointer-events-none" />
                    <div className="space-y-2 relative z-10 text-left w-full pr-4">
                      <p className="text-[9px] font-black uppercase tracking-wider text-white">@brew_alchemy</p>
                      <p className="text-[8px] text-zinc-300 line-clamp-2 leading-relaxed">
                        Pouring fresh organic single-origin lattes...
                      </p>
                      <div className="bg-black/85 border border-white/10 rounded-2xl p-2 flex items-center gap-2.5 backdrop-blur-md w-full">
                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-zinc-950">
                          <img src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&auto=format&fit=crop&q=80" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] font-bold truncate text-white">Specialty Latte</p>
                          <p className="text-[9px] font-black text-amber-400">₹180</p>
                        </div>
                        <button className="px-2.5 py-1 bg-amber-500 text-black text-[8px] font-black rounded-lg uppercase tracking-wider shrink-0">
                          Buy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-500">ACTIVE SIMULATION PREVIEW</span>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Simulator View (Prototype Feed) */
            <motion.div
              key="simulator-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-[2.5rem] aspect-[9/16] overflow-hidden relative flex flex-col justify-between shadow-2xl p-2 md:p-3"
            >
              {/* Phone Camera notch */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-30 flex items-center justify-center pointer-events-none">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-800" />
              </div>

              {/* Feed Header */}
              <div className="absolute top-10 left-0 right-0 z-20 flex justify-between items-center px-6 pointer-events-none">
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-white/5 backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Live Simulator</span>
                </div>
                <button
                  onClick={() => setShowSimulator(false)}
                  className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white border border-white/10 backdrop-blur-md pointer-events-auto transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Video background wrapper */}
              <div className="absolute inset-0 z-0 bg-zinc-950">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeIdx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 bg-cover bg-center brightness-[0.4]"
                    style={{ backgroundImage: `url('${currentClip.bgUrl}')` }}
                  />
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/35 pointer-events-none" />
              </div>

              {/* Next/Prev Video Navigation buttons overlay */}
              <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
                <button
                  onClick={handlePrevVideo}
                  disabled={activeIdx === 0}
                  className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                    activeIdx === 0
                      ? 'bg-zinc-900/30 border-white/5 text-zinc-600 cursor-not-allowed'
                      : 'bg-black/40 hover:bg-black/60 border-white/10 text-white cursor-pointer active:scale-90'
                  }`}
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextVideo}
                  disabled={activeIdx === clips.length - 1}
                  className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
                    activeIdx === clips.length - 1
                      ? 'bg-zinc-900/30 border-white/5 text-zinc-600 cursor-not-allowed'
                      : 'bg-black/40 hover:bg-black/60 border-white/10 text-white cursor-pointer active:scale-90'
                  }`}
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>

              {/* Right Side overlay actions */}
              <div className="absolute right-4 bottom-28 flex flex-col gap-4 items-center z-20">
                {/* Store Profile */}
                <div className="w-9 h-9 rounded-full border border-amber-500/40 bg-zinc-900 overflow-hidden flex items-center justify-center shadow-lg">
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60" className="w-full h-full object-cover" />
                </div>

                {/* Like Button */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => toggleLike(currentClip.id)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center border shadow-md transition-all active:scale-75 ${
                      currentClip.liked
                        ? 'bg-amber-500/20 border-amber-500 text-amber-500'
                        : 'bg-black/40 hover:bg-black/60 border-white/10 text-white'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${currentClip.liked ? 'fill-current' : ''}`} />
                  </button>
                  <span className="text-[9px] font-black mt-1 text-zinc-300">{currentClip.likes}</span>
                </div>

                {/* Comment Button */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setShowComments(!showComments)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center border shadow-md transition-all active:scale-75 ${
                      showComments
                        ? 'bg-amber-500/20 border-amber-500 text-amber-500'
                        : 'bg-black/40 hover:bg-black/60 border-white/10 text-white'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <span className="text-[9px] font-black mt-1 text-zinc-300">{currentClip.comments.length}</span>
                </div>

                {/* Inquiry Form Button */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setShowFormModal(true)}
                    className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white border border-white/10 shadow-md active:scale-75 transition-all"
                    title={currentClip.formPrompt}
                  >
                    <Send className="w-4 h-4 text-amber-400" />
                  </button>
                  <span className="text-[8px] font-black uppercase mt-1 tracking-wider text-amber-400">Ask</span>
                </div>

                {/* Share Button */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Clip link copied to clipboard!');
                  }}
                  className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white border border-white/10 shadow-md active:scale-75 transition-all"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Bottom text overlay and product card */}
              <div className="absolute left-4 right-16 bottom-6 z-10 space-y-3.5 text-left pointer-events-auto">
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-wider text-white">{currentClip.username}</p>
                  <p className="text-[10px] text-zinc-300 leading-relaxed max-w-[85%]">{currentClip.caption}</p>
                </div>

                {/* The Interactive tag card */}
                <motion.div
                  key={currentClip.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="bg-black/85 border border-white/10 rounded-2xl p-2.5 flex items-center gap-3 backdrop-blur-md shadow-2xl w-full"
                >
                  <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-zinc-950">
                    <img src={currentClip.cardImage} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold truncate text-white">{currentClip.cardTitle}</p>
                    <p className="text-[10px] font-black text-amber-400">{currentClip.cardPrice}</p>
                  </div>
                  <button
                    onClick={() => {
                      setCheckoutStep('details');
                      setShowCheckoutModal(true);
                    }}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-[9px] font-black rounded-lg uppercase tracking-wider shrink-0 transition-colors cursor-pointer"
                  >
                    {currentClip.actionText}
                  </button>
                </motion.div>
              </div>

              {/* Comments Sliding Drawer Overlay */}
              <AnimatePresence>
                {showComments && (
                  <>
                    <div className="absolute inset-0 bg-black/40 z-30" onClick={() => setShowComments(false)} />
                    <motion.div
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                      className="absolute bottom-0 left-0 right-0 h-[60%] bg-[#1c1c1c] border-t border-white/10 rounded-t-3xl z-40 flex flex-col justify-between p-4"
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-white/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Comments</span>
                        <button onClick={() => setShowComments(false)} className="text-zinc-400 hover:text-white">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Comment list */}
                      <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
                        {currentClip.comments.map(c => (
                          <div key={c.id} className="flex gap-2.5 items-start">
                            <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 text-white text-[9px] font-bold">
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-zinc-300">{c.user}</p>
                              <p className="text-[10px] text-zinc-400 leading-snug">{c.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Comment Input form */}
                      <form onSubmit={handleAddComment} className="flex gap-2 border-t border-white/5 pt-3">
                        <input
                          type="text"
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          placeholder="Add a comment..."
                          className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 text-white"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                        >
                          Send
                        </button>
                      </form>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* inquiry Form Modal Overlay */}
              <AnimatePresence>
                {showFormModal && (
                  <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="bg-[#1c1c1c] border border-white/10 rounded-[2rem] p-5 w-full max-w-xs space-y-4 text-left shadow-2xl relative"
                    >
                      <button
                        onClick={() => setShowFormModal(false)}
                        className="absolute top-4 right-4 text-zinc-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">Direct Inquiry</h4>
                        <p className="text-[9px] text-zinc-500 font-medium">To {currentClip.storeName}</p>
                      </div>

                      <form onSubmit={handleFormSubmit} className="space-y-3">
                        <div>
                          <label className="text-[8px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Your Name</label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Rahul Dev"
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[8px] font-black uppercase tracking-wider text-zinc-400 block mb-1">WhatsApp Number</label>
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="9876543210"
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[8px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Inquiry Details</label>
                          <textarea
                            value={formData.query}
                            onChange={(e) => setFormData({ ...formData, query: e.target.value })}
                            placeholder={currentClip.formPrompt}
                            rows={3}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                        >
                          Submit Inquiry
                        </button>
                      </form>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Checkout / Booking Modal Overlay */}
              <AnimatePresence>
                {showCheckoutModal && (
                  <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="bg-[#1c1c1c] border border-white/10 rounded-[2rem] p-5 w-full max-w-xs text-left shadow-2xl relative"
                    >
                      <button
                        onClick={closeCheckout}
                        className="absolute top-4 right-4 text-zinc-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {checkoutStep === 'details' ? (
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <h4 className="text-xs font-black uppercase tracking-wider text-white">
                              {currentClip.cardType === 'product' ? 'Quick Purchase' : 'Instant Booking'}
                            </h4>
                            <p className="text-[9px] text-zinc-500 font-medium">Fulfilling via {currentClip.storeName}</p>
                          </div>

                          <div className="p-3 bg-zinc-900/60 border border-white/5 rounded-xl flex items-center gap-3">
                            <img src={currentClip.cardImage} className="w-8 h-8 rounded-lg object-cover" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] font-bold truncate text-white">{currentClip.cardTitle}</p>
                              <p className="text-[10px] font-black text-amber-400">{currentClip.cardPrice}</p>
                            </div>
                          </div>

                          <div className="space-y-2 text-[9px] text-zinc-400 font-medium">
                            <div className="flex justify-between">
                              <span>Subtotal</span>
                              <span className="text-white">{currentClip.cardPrice}</span>
                            </div>
                            <div className="flex justify-between border-t border-white/5 pt-2 font-bold text-white">
                              <span>Total Due</span>
                              <span className="text-amber-400">{currentClip.cardPrice}</span>
                            </div>
                          </div>

                          <button
                            onClick={handlePay}
                            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                          >
                            Pay {currentClip.cardPrice}
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-4 space-y-4">
                          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-8 h-8" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-xs font-black uppercase tracking-wider text-white">
                              {currentClip.cardType === 'product' ? 'Order Successful!' : 'Booking Confirmed!'}
                            </h4>
                            <p className="text-[9px] text-zinc-500 font-medium">Transaction ID: TXN-BB829</p>
                          </div>
                          <p className="text-[10px] text-zinc-400 leading-relaxed px-2">
                            {currentClip.cardType === 'product'
                              ? `Your order for ${currentClip.cardTitle} is placed. Store is preparing your package.`
                              : `Your slot for ${currentClip.cardTitle} is confirmed. Stylist has blocked your time.`}
                          </p>
                          <button
                            onClick={closeCheckout}
                            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                          >
                            Done
                          </button>
                        </div>
                      )}
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Clips;
