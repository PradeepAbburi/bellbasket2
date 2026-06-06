import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Sparkles, Upload, FileText, BarChart3, Phone, Mail, Check, Trash2, Heart, MessageSquare } from 'lucide-react';
import Header from '@/components/Header';
import { toast } from 'sonner';

const VendorClips = () => {
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState<'videos' | 'leads'>('videos');
  const [leads, setLeads] = useState([
    {
      id: '1',
      clientName: 'Rahul Dev',
      sourceClip: 'Latte Art Masterclass',
      query: 'Do you offer bulk catering or coffee bars for corporate events?',
      time: '2m ago',
      phone: '9876543210',
      email: 'rahul.dev@example.com'
    },
    {
      id: '2',
      clientName: 'Priya Sharma',
      sourceClip: 'Haircut & Styling Demo',
      query: 'Is the 5 PM slot today open for styling and colouring together?',
      time: '15m ago',
      phone: '9876543211',
      email: 'priya.s@example.com'
    }
  ]);

  const handleDismissLead = (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    toast.success('Lead inquiry archived');
  };

  const handleAction = (type: 'call' | 'mail', name: string) => {
    toast.success(`${type === 'call' ? 'Calling' : 'Composing email to'} ${name}...`, {
      description: 'Simulator link triggered'
    });
  };

  return (
    <div className="min-h-screen bg-[#202020] text-white flex flex-col relative overflow-hidden">
      {/* Decorative liquid background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          animate={{
            borderRadius: ["40% 60% 70% 30% / 40% 50% 60% 50%", "60% 40% 30% 70% / 50% 60% 40% 60%", "40% 60% 70% 30% / 40% 50% 60% 50%"],
            x: [0, 25, 0],
            y: [0, -25, 0]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-[-10%] right-[-10%] w-[65vw] h-[65vw] bg-gradient-to-br from-teal-500/15 via-emerald-600/10 to-transparent blur-[120px]"
        />
        <motion.div
          animate={{
            borderRadius: ["50% 50% 30% 70% / 50% 60% 30% 60%", "30% 70% 70% 30% / 50% 30% 70% 40%", "50% 50% 30% 70% / 50% 60% 30% 60%"],
            x: [0, -25, 0],
            y: [0, 25, 0]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-[-10%] left-[-10%] w-[55vw] h-[55vw] bg-gradient-to-tl from-emerald-600/15 via-teal-500/10 to-transparent blur-[120px]"
        />
      </div>

      <Header solid />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 pt-24 pb-16 flex flex-col items-center justify-center relative z-10">
        
        {/* Navigation Breadcrumb */}
        <button
          onClick={() => navigate('/vendor')}
          className="self-start flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-teal-400 hover:text-teal-300 mb-8 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        {/* Dynamic Split Layout */}
        <div className="w-full grid md:grid-cols-12 gap-8 items-center mt-2">
          
          {/* Left: Copywriting & Feature breakdown */}
          <div className="md:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-black uppercase tracking-wider rounded-full">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Vendor Console Suite
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none uppercase italic bg-gradient-to-r from-white via-zinc-200 to-teal-400 bg-clip-text text-transparent">
              Clips Manager
            </h1>
            
            <p className="text-sm text-zinc-400 font-medium leading-relaxed">
              Showcase your store's personality and products with video. Upload custom baking demos, product unboxings, or services in action. Pinned interaction cards let viewers place orders or send specific requests while watching.
            </p>

            {/* Core Features */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0 text-teal-400 border border-teal-500/10">
                  <Upload className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Video Studio & Tagging</h4>
                  <p className="text-[11px] text-zinc-500 font-medium">Publish MP4 video reels. Seamlessly tag items from your active catalog or service menu, overlaying shop tags dynamically on the screen.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0 text-teal-400 border border-teal-500/10">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Interactive Leads capture</h4>
                  <p className="text-[11px] text-zinc-500 font-medium">Attach micro-inquiry forms on reels. Customers fill custom prompts, populating your dashboard leads spreadsheet instantly.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0 text-teal-400 border border-teal-500/10">
                  <BarChart3 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">Direct Engagement Hub</h4>
                  <p className="text-[11px] text-zinc-500 font-medium">Review customer inquiries. Tap call or mail icons to start conversing, saving contact details, or fulfilling special requests.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Dashboard Simulator Mock (Redesigned, removed "Coming Soon") */}
          <div className="md:col-span-5 flex flex-col items-center w-full">
            <div className="w-full bg-[#141414] border border-white/10 rounded-[2rem] p-5 shadow-2xl relative overflow-hidden text-left">
              
              {/* Simulator Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Clips Console</p>
                  <h3 className="text-xs font-bold text-white uppercase tracking-tight">Console Simulation</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-400 text-[8px] font-black tracking-widest uppercase border border-teal-500/10">
                  Active Demo
                </span>
              </div>

              {/* Sub-tab Switcher */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-zinc-950/80 border border-white/5 mb-4 text-center">
                <button
                  onClick={() => setActiveSubTab('videos')}
                  className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    activeSubTab === 'videos'
                      ? 'bg-teal-500/15 border border-teal-500/20 text-teal-400'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  My Videos (2)
                </button>
                <button
                  onClick={() => setActiveSubTab('leads')}
                  className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    activeSubTab === 'leads'
                      ? 'bg-teal-500/15 border border-teal-500/20 text-teal-400'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Leads ({leads.length})
                </button>
              </div>

              {/* Console Body */}
              <div className="min-h-[220px] flex flex-col justify-between">
                <AnimatePresence mode="wait">
                  {activeSubTab === 'videos' ? (
                    <motion.div
                      key="videos-tab"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="space-y-3"
                    >
                      {/* Video 1 */}
                      <div className="p-3 bg-zinc-950/40 border border-white/5 rounded-xl flex items-center gap-3 hover:bg-zinc-950/60 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-zinc-900 overflow-hidden shrink-0 relative flex items-center justify-center text-teal-500 border border-white/5 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&auto=format&fit=crop&q=60')" }}>
                          <Play className="w-3.5 h-3.5 fill-current text-white relative z-10" />
                          <div className="absolute inset-0 bg-black/45" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold truncate text-white">Latte Art Masterclass</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-0.5">
                              <Heart className="w-2.5 h-2.5 fill-zinc-600 text-zinc-600" /> 2.4k
                            </span>
                            <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-0.5">
                              <MessageSquare className="w-2.5 h-2.5 text-zinc-600" /> 24
                            </span>
                          </div>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>

                      {/* Video 2 */}
                      <div className="p-3 bg-zinc-950/40 border border-white/5 rounded-xl flex items-center gap-3 hover:bg-zinc-950/60 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-zinc-900 overflow-hidden shrink-0 relative flex items-center justify-center text-teal-500 border border-white/5 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=200&auto=format&fit=crop&q=60')" }}>
                          <Play className="w-3.5 h-3.5 fill-current text-white relative z-10" />
                          <div className="absolute inset-0 bg-black/45" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold truncate text-white">Haircut & Styling Demo</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-0.5">
                              <Heart className="w-2.5 h-2.5 fill-zinc-600 text-zinc-600" /> 1.1k
                            </span>
                            <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-0.5">
                              <MessageSquare className="w-2.5 h-2.5 text-zinc-600" /> 12
                            </span>
                          </div>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="leads-tab"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="space-y-3"
                    >
                      {leads.length === 0 ? (
                        <div className="py-8 text-center text-zinc-600 text-[11px] font-bold uppercase">
                          No active lead inquiries
                        </div>
                      ) : (
                        leads.map(lead => (
                          <div key={lead.id} className="p-3 bg-zinc-950/60 border-l-4 border-teal-500 rounded-r-xl rounded-l-md space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-[10px] font-bold text-white">{lead.clientName}</p>
                                <p className="text-[7px] text-zinc-500 font-bold uppercase mt-0.5">Ref: {lead.sourceClip}</p>
                              </div>
                              <span className="text-[7px] text-zinc-500 font-black uppercase">{lead.time}</span>
                            </div>
                            <div className="p-2 rounded-lg bg-zinc-900 border border-white/5 text-[9px] text-zinc-400 leading-normal italic">
                              "{lead.query}"
                            </div>
                            <div className="flex justify-between items-center pt-1">
                              <button 
                                onClick={() => handleDismissLead(lead.id)}
                                className="p-1 text-zinc-500 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <div className="flex gap-1.5">
                                <button 
                                  onClick={() => handleAction('mail', lead.clientName)}
                                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-teal-400 text-[8px] transition-colors"
                                >
                                  <Mail className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => handleAction('call', lead.clientName)}
                                  className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[8px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors"
                                >
                                  <Phone className="w-2.5 h-2.5" /> Fulfill
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Upload Button overlay for active simulation */}
                <div className="pt-4 mt-2 border-t border-white/5 flex gap-2">
                  <button 
                    onClick={() => toast.success('Video uploader initialized (Simulator)')}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-[9px] font-black uppercase tracking-widest text-zinc-300 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Video
                  </button>
                </div>
              </div>
            </div>

            {/* Glowing Active indicator (removed Beta/Coming soon branding) */}
            <div className="mt-5 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-teal-400">CONSOLE SIMULATION READY</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VendorClips;
