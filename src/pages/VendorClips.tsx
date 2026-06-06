import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Sparkles, Upload, FileText, LayoutDashboard, Film, BarChart3, MessageSquare, Phone, Check } from 'lucide-react';
import Header from '@/components/Header';
import { useTranslation } from 'react-i18next';

const VendorClips = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#202020] text-white flex flex-col relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-teal-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />

      <Header solid />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 md:px-6 pt-28 pb-16 flex flex-col items-center justify-center relative z-10">
        
        {/* Back Button */}
        <button
          onClick={() => navigate('/vendor')}
          className="self-start flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-teal-500 hover:text-teal-400 mb-8 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        {/* Feature Coming Soon Container */}
        <div className="w-full grid md:grid-cols-12 gap-8 items-center mt-4">
          
          {/* Text Description Column */}
          <div className="md:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-black uppercase tracking-widest rounded-full">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Upcoming Vendor Suite
            </div>
            
            <h1 className="text-4xl font-black tracking-tight leading-tight uppercase bg-gradient-to-r from-white via-zinc-200 to-teal-400 bg-clip-text text-transparent italic">
              Clips Manager
            </h1>
            
            <p className="text-sm text-zinc-400 font-medium leading-relaxed">
              Unlock the power of short-form video to market your shop! The upcoming Clips Manager will give you a comprehensive suite to engage customers with Reels.
            </p>

            {/* Feature Highlights List */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center shrink-0 text-teal-400">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Video Publishing</h4>
                  <p className="text-[11px] text-zinc-500 font-medium">Upload video files or paste links. Tag them as Product or Service clips to showcase your offerings.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center shrink-0 text-teal-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Interactive Query Forms</h4>
                  <p className="text-[11px] text-zinc-500 font-medium">Attach customizable forms on your videos (e.g. quote requests) so clients can submit inquiries as they watch.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center shrink-0 text-teal-400">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Lead Dashboard</h4>
                  <p className="text-[11px] text-zinc-500 font-medium">Gather all client responses and contact cards in one sheet. Tap to immediately reply via WhatsApp or Email.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Mockup Dashboard Column */}
          <div className="md:col-span-5 flex flex-col items-center w-full">
            {/* Panel Container */}
            <div className="w-full bg-[#181818] border border-white/10 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden text-left">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Clips & Leads</p>
                  <h3 className="text-xs font-bold text-white uppercase tracking-tight">Active Engagement</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 text-[8px] font-black tracking-widest uppercase">PRO PREVIEW</span>
              </div>

              {/* Mock Dashboard Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-zinc-950/60 border border-white/5 mb-4 text-center">
                <div className="py-2 rounded-lg bg-teal-600/25 border border-teal-500/30 text-[9px] font-black text-teal-400 uppercase tracking-widest">
                  MY VIDEOS (2)
                </div>
                <div className="py-2 rounded-lg text-zinc-500 text-[9px] font-black uppercase tracking-widest">
                  LEADS (14)
                </div>
              </div>

              {/* Mock List */}
              <div className="space-y-3">
                {/* Item 1 */}
                <div className="p-3 bg-zinc-950/40 border border-white/5 rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-900 overflow-hidden shrink-0 relative flex items-center justify-center text-teal-500 border border-white/5 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&auto=format&fit=crop&q=60')" }}>
                    <Play className="w-3.5 h-3.5 fill-current text-white relative z-10" />
                    <div className="absolute inset-0 bg-black/30" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold truncate text-white">Pizza Baking Demo</p>
                    <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-black mt-0.5">Likes: 240 &middot; Queries: 8</p>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>

                {/* Lead Submission Card */}
                <div className="p-3 bg-zinc-950/60 border-l-4 border-teal-500 rounded-r-xl rounded-l-md space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-bold text-white">Rahul Dev (Inquiry)</p>
                      <p className="text-[8px] text-zinc-500 font-bold uppercase mt-0.5">From: pizza baking demo</p>
                    </div>
                    <span className="text-[8px] text-zinc-500 font-black uppercase">2m ago</span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-900 border border-white/5 text-[9px] text-zinc-400 leading-normal italic">
                    "Do you offer gluten-free crust options for birthday catering orders?"
                  </div>
                  <div className="flex justify-end gap-1.5 pt-1">
                    <button className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[8px] font-black uppercase tracking-widest text-zinc-400 cursor-not-allowed">
                      Dismiss
                    </button>
                    <button className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-[8px] font-black uppercase tracking-widest flex items-center gap-1 cursor-not-allowed">
                      <Phone className="w-2.5 h-2.5" /> Call Client
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Status indicator */}
            <div className="mt-6 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-400">Beta Launching Soon</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VendorClips;
