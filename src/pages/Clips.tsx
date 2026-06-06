import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Sparkles, Heart, MessageCircle, Share2, ShoppingBag, Wrench, Send, Info, Eye } from 'lucide-react';
import Header from '@/components/Header';

const Clips = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'products' | 'services'>('products');
  const [likes, setLikes] = useState({ products: 2405, services: 1104 });
  const [hasLiked, setHasLiked] = useState({ products: false, services: false });

  const handleLike = () => {
    if (activeTab === 'products') {
      setLikes(prev => ({
        ...prev,
        products: prev.products + (hasLiked.products ? -1 : 1)
      }));
      setHasLiked(prev => ({ ...prev, products: !prev.products }));
    } else {
      setLikes(prev => ({
        ...prev,
        services: prev.services + (hasLiked.services ? -1 : 1)
      }));
      setHasLiked(prev => ({ ...prev, services: !prev.services }));
    }
  };

  return (
    <div className="min-h-screen bg-[#202020] text-white flex flex-col relative overflow-hidden">
      {/* Full-screen ambient background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-[0.12] saturate-100 filter blur-[1px] pointer-events-none z-0"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80')" }}
      />

      {/* Decorative liquid animated background blobs */}
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
          onClick={() => navigate('/browse')}
          className="self-start flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-amber-500 hover:text-amber-400 mb-8 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Browse
        </button>

        {/* Dynamic Split Layout */}
        <div className="w-full grid md:grid-cols-12 gap-8 items-center mt-2">
          
          {/* Left: Info & Features Redesign */}
          <div className="md:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider rounded-full">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Interactive Experience
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none uppercase italic bg-gradient-to-r from-white via-zinc-200 to-amber-400 bg-clip-text text-transparent">
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
                <div className="flex items-center gap-3">
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

            {/* Premium action description */}
            <div className="flex items-center gap-3 p-3.5 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
              <Info className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-[11px] text-zinc-400 font-medium">
                Tap on <span className="text-white font-bold">Products</span> or <span className="text-white font-bold">Services</span> tabs on the simulator preview to test the customer flow.
              </p>
            </div>
          </div>

          {/* Right: Phone Simulator (Redesigned, removed "Coming Soon") */}
          <div className="md:col-span-5 flex flex-col items-center w-full">
            {/* Phone Container */}
            <div className="w-full max-w-[280px] aspect-[9/16] bg-zinc-900 border-4 border-zinc-800 rounded-[2.5rem] shadow-2xl p-2.5 flex flex-col relative overflow-hidden group">
              {/* Camera Notch */}
              <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-20 h-4.5 bg-black rounded-full z-30 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-zinc-900" />
              </div>

              {/* Category Tab Toggle */}
              <div className="absolute top-10 left-0 right-0 z-20 flex justify-center gap-1.5 px-4">
                <button
                  onClick={() => setActiveTab('products')}
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'products'
                      ? 'bg-amber-500 text-black font-black shadow-md'
                      : 'bg-black/55 text-zinc-400 hover:text-white border border-white/5'
                  }`}
                >
                  Products
                </button>
                <button
                  onClick={() => setActiveTab('services')}
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'services'
                      ? 'bg-amber-500 text-black font-black shadow-md'
                      : 'bg-black/55 text-zinc-400 hover:text-white border border-white/5'
                  }`}
                >
                  Services
                </button>
              </div>

              {/* Video Player Mock Content */}
              <div className="flex-1 bg-zinc-950 rounded-[2rem] overflow-hidden relative flex flex-col justify-end p-4 border border-white/5">
                
                {/* Simulated Video Frames */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 bg-cover bg-center filter saturate-100 opacity-60 brightness-[0.6]"
                    style={{
                      backgroundImage: activeTab === 'products'
                        ? "url('https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80')"
                        : "url('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&auto=format&fit=crop&q=80')"
                    }}
                  />
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/35 pointer-events-none" />

                {/* Simulated Live Overlays */}
                <div className="absolute top-12 left-4 z-10 flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded-full border border-white/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-wider text-white">LIVE FEED</span>
                </div>

                {/* Right Actions Bar */}
                <div className="absolute right-3 bottom-20 flex flex-col gap-4 items-center z-10">
                  <div className="w-8 h-8 rounded-full border border-amber-500/40 bg-zinc-900 overflow-hidden flex items-center justify-center shadow-lg">
                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60" className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <button 
                      onClick={handleLike}
                      className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-md transition-all active:scale-75 ${
                        (activeTab === 'products' ? hasLiked.products : hasLiked.services)
                          ? 'bg-amber-500/20 border-amber-500 text-amber-500'
                          : 'bg-black/45 hover:bg-black/60 border-white/5 text-white'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${((activeTab === 'products' ? hasLiked.products : hasLiked.services)) ? 'fill-current' : ''}`} />
                    </button>
                    <span className="text-[8px] font-black mt-1 text-zinc-400">
                      {activeTab === 'products' ? likes.products : likes.services}
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <button className="w-8 h-8 rounded-full bg-black/45 hover:bg-black/60 flex items-center justify-center text-white border border-white/5 shadow-md">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <span className="text-[8px] font-black mt-1 text-zinc-400">
                      {activeTab === 'products' ? 24 : 12}
                    </span>
                  </div>

                  <button className="w-8 h-8 rounded-full bg-black/45 hover:bg-black/60 flex items-center justify-center text-white border border-white/5 shadow-md">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Bottom Overlay Context & Mock tagged elements */}
                <div className="space-y-2.5 relative z-10 text-left w-[82%] pr-2">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black uppercase tracking-wider text-white">@brew_alchemy</p>
                    <p className="text-[9px] text-zinc-300 line-clamp-2 leading-relaxed">
                      {activeTab === 'products'
                        ? "Pouring fresh organic single-origin lattes all morning. Order below!"
                        : "Classic haircut, beard grooming, and hot towel styling slots available."
                      }
                    </p>
                  </div>

                  {/* Shopping / Booking tagged cards */}
                  <AnimatePresence mode="wait">
                    {activeTab === 'products' ? (
                      <motion.div
                        key="product-card"
                        initial={{ y: 15, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -15, opacity: 0 }}
                        className="bg-black/85 border border-white/10 rounded-2xl p-2 flex items-center gap-2.5 backdrop-blur-md shadow-2xl w-full"
                      >
                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-zinc-950">
                          <img src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&auto=format&fit=crop&q=80" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] font-bold truncate text-white">Specialty Latte</p>
                          <p className="text-[9px] font-black text-amber-400">₹180</p>
                        </div>
                        <button className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black text-[8px] font-black rounded-lg uppercase tracking-wider shrink-0 transition-colors">
                          Buy
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="service-card"
                        initial={{ y: 15, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -15, opacity: 0 }}
                        className="bg-black/85 border border-white/10 rounded-2xl p-2 flex items-center gap-2.5 backdrop-blur-md shadow-2xl w-full"
                      >
                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                          <Wrench className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] font-bold truncate text-white">Haircut & Styling</p>
                          <p className="text-[7px] font-black uppercase text-emerald-400">Next Slot: 5 PM</p>
                        </div>
                        <button className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black text-[8px] font-black rounded-lg uppercase tracking-wider shrink-0 transition-colors">
                          Book
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Glowing Live Feed Indicator (No Coming Soon references) */}
            <div className="mt-5 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-500">ACTIVE SIMULATION PREVIEW</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Clips;
