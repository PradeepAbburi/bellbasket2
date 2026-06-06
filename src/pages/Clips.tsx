import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Sparkles, Film, Heart, MessageCircle, Share2, ShoppingBag, Wrench, Send, HelpCircle } from 'lucide-react';
import Header from '@/components/Header';

const Clips = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'products' | 'services'>('products');

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col relative overflow-hidden">
      {/* Decorative blurred background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px]" />

      <Header solid />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-6 pt-24 pb-16 flex flex-col items-center justify-center relative z-10">
        
        {/* Back Button */}
        <button
          onClick={() => navigate('/browse')}
          className="self-start flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-white mb-8 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Browse
        </button>

        {/* Feature Coming Soon Container */}
        <div className="w-full grid md:grid-cols-12 gap-8 items-center mt-4">
          
          {/* Text Description Column */}
          <div className="md:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest rounded-full">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Feature Sneak Peek
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight uppercase italic bg-gradient-to-r from-white via-zinc-200 to-primary bg-clip-text text-transparent">
              BellBasket Clips
            </h1>
            
            <p className="text-sm text-zinc-400 font-medium leading-relaxed">
              We are building a state-of-the-art vertical video feed (Reels) right into your local marketplace! Vendors in your neighborhood will soon showcase their items and skills through short clips.
            </p>

            {/* Feature Highlights list */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center shrink-0 text-primary">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Shop From Videos</h4>
                  <p className="text-[11px] text-zinc-500 font-medium">Click tagged product cards to buy items directly as you watch prep or review clips.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center shrink-0 text-indigo-400">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Book Services Instantly</h4>
                  <p className="text-[11px] text-zinc-500 font-medium">Watch local experts demonstrate their repair or styling work and book them on the spot.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center shrink-0 text-emerald-400">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Ask Queries Directly</h4>
                  <p className="text-[11px] text-zinc-500 font-medium">Fill quick, pinned query forms on the clips to ask questions and get instant vendor responses.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Mockup Reel Column */}
          <div className="md:col-span-5 flex flex-col items-center">
            {/* Phone Container */}
            <div className="w-64 aspect-[9/16] bg-[#161616] border border-white/10 rounded-[2.5rem] shadow-2xl p-3 flex flex-col relative overflow-hidden group">
              {/* Dynamic camera notch */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4.5 bg-black rounded-full z-30 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-800" />
              </div>

              {/* Feed Tabs / Toggle Selector */}
              <div className="absolute top-10 left-0 right-0 z-20 flex justify-center gap-1.5 px-4">
                <button
                  onClick={() => setActiveTab('products')}
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'products'
                      ? 'bg-primary text-black font-black'
                      : 'bg-black/40 text-zinc-400 hover:text-white border border-white/5'
                  }`}
                >
                  Products
                </button>
                <button
                  onClick={() => setActiveTab('services')}
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === 'services'
                      ? 'bg-indigo-600 text-white font-black'
                      : 'bg-black/40 text-zinc-400 hover:text-white border border-white/5'
                  }`}
                >
                  Services
                </button>
              </div>

              {/* Mock Video Body */}
              <div className="flex-1 bg-zinc-950 rounded-[2rem] overflow-hidden relative flex flex-col justify-end p-4 border border-white/5">
                
                {/* Visualizer blur image base depending on active tab */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 bg-cover bg-center filter saturate-75 opacity-40 brightness-75"
                    style={{
                      backgroundImage: activeTab === 'products'
                        ? "url('https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop&q=60')"
                        : "url('https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&auto=format&fit=crop&q=60')"
                    }}
                  />
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 pointer-events-none" />

                {/* Right overlay buttons */}
                <div className="absolute right-3 bottom-24 flex flex-col gap-4 items-center z-10">
                  <div className="w-8 h-8 rounded-full border border-white/20 bg-zinc-900 overflow-hidden flex items-center justify-center shadow-lg">
                    <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60" className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <button className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-rose-500 border border-white/5 shadow-md">
                      <Heart className="w-4 h-4 fill-rose-500" />
                    </button>
                    <span className="text-[8px] font-black mt-1">2.4k</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <button className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white border border-white/5 shadow-md">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <span className="text-[8px] font-black mt-1">84</span>
                  </div>

                  <button className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white border border-white/5 shadow-md">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Bottom left mock context */}
                <div className="space-y-1.5 relative z-10 text-left w-[80%] pr-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-white">@delicious_pizza</p>
                  <p className="text-[9px] text-zinc-300 line-clamp-2 leading-relaxed">
                    {activeTab === 'products'
                      ? "Fresh sourdough pizza baked wood-fired daily! Tagged cards below."
                      : "AC cleaning & gas refill showcase. Book quick service below."
                    }
                  </p>

                  {/* Mock Card Attachment */}
                  {activeTab === 'products' ? (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="bg-black/80 border border-white/10 rounded-2xl p-2.5 flex items-center gap-3 backdrop-blur-md shadow-2xl w-full"
                    >
                      <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-zinc-950">
                        <img src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&auto=format&fit=crop&q=60" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-bold truncate text-white">Sourdough Margherita</p>
                        <p className="text-[10px] font-black text-primary">₹299</p>
                      </div>
                      <button className="px-2.5 py-1 bg-primary text-black text-[8px] font-black rounded-lg uppercase tracking-wider shrink-0 cursor-not-allowed">
                        Buy
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="bg-black/80 border border-white/10 rounded-2xl p-2.5 flex items-center gap-3 backdrop-blur-md shadow-2xl w-full"
                    >
                      <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-zinc-950 flex items-center justify-center text-indigo-400 bg-indigo-500/10 border border-indigo-500/20">
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-bold truncate text-white">AC Deep Clean</p>
                        <p className="text-[8px] font-black uppercase text-indigo-400">Available Slot</p>
                      </div>
                      <button className="px-2.5 py-1 bg-indigo-600 text-white text-[8px] font-black rounded-lg uppercase tracking-wider shrink-0 cursor-not-allowed">
                        Book
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Glowing Tag */}
            <div className="mt-6 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Coming Soon to Marketplace</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Clips;
