import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Sparkles, Upload, FileText, BarChart3, Phone, Mail, Check, Trash2, Heart, MessageSquare, X, CheckCircle } from 'lucide-react';
import Header from '@/components/Header';
import { toast } from 'sonner';

const initialVideos = [
  {
    id: '1',
    title: 'Latte Art Masterclass',
    likes: '2.4k',
    queries: 2,
    bgUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&auto=format&fit=crop&q=60',
    active: true
  },
  {
    id: '2',
    title: 'Haircut & Styling Demo',
    likes: '1.1k',
    queries: 1,
    bgUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=200&auto=format&fit=crop&q=60',
    active: true
  }
];

const initialLeads = [
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
];

const mockUploadOptions = [
  { title: 'Espresso Extraction Guide', url: 'https://images.unsplash.com/photo-151097252790b-a481d9f48d1e?w=200&auto=format&fit=crop&q=60' },
  { title: 'Signature Beard Grooming', url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=200&auto=format&fit=crop&q=60' },
  { title: 'Neapolitan Sourdough Stretch', url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&auto=format&fit=crop&q=60' }
];

const VendorClips = () => {
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState<'videos' | 'leads'>('videos');
  const [leads, setLeads] = useState(initialLeads);
  const [videos, setVideos] = useState(initialVideos);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeFulfillLead, setActiveFulfillLead] = useState<any>(null);

  const handleDismissLead = (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    toast.success('Lead inquiry archived');
  };

  const handleAction = (type: 'call' | 'mail', name: string) => {
    toast.success(`${type === 'call' ? 'Calling' : 'Composing email to'} ${name}...`, {
      description: 'Simulator link triggered'
    });
  };

  const handleUploadVideo = (title: string, url: string) => {
    const newVideo = {
      id: Date.now().toString(),
      title,
      likes: '0',
      queries: 0,
      bgUrl: url,
      active: true
    };
    setVideos(prev => [newVideo, ...prev]);
    setShowUploadModal(false);
    toast.success(`Video "${title}" published!`, {
      description: 'It will start rendering in the customer Clips feed shortly.'
    });
  };

  const confirmFulfillment = (lead: any) => {
    setActiveFulfillLead(lead);
  };

  const completeFulfill = () => {
    if (activeFulfillLead) {
      setLeads(prev => prev.filter(l => l.id !== activeFulfillLead.id));
      toast.success(`Lead for ${activeFulfillLead.clientName} marked as FULFILLED!`);
      setActiveFulfillLead(null);
    }
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

      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-24 pb-16 flex flex-col items-center justify-center relative z-10">
        
        {/* Navigation Breadcrumb */}
        <button
          onClick={() => navigate('/vendor')}
          className="self-start flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-teal-400 hover:text-teal-300 mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        {/* Console Simulator directly rendered */}
        <div className="w-full bg-[#141414] border border-white/10 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden text-left">
          
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
              My Videos ({videos.length})
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
                  {videos.map(video => (
                    <div key={video.id} className="p-3 bg-zinc-950/40 border border-white/5 rounded-xl flex items-center gap-3 hover:bg-zinc-950/60 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-zinc-900 overflow-hidden shrink-0 relative flex items-center justify-center text-teal-500 border border-white/5 bg-cover bg-center" style={{ backgroundImage: `url('${video.bgUrl}')` }}>
                        <Play className="w-3.5 h-3.5 fill-current text-white relative z-10" />
                        <div className="absolute inset-0 bg-black/45" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold truncate text-white">{video.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-0.5">
                            <Heart className="w-2.5 h-2.5 fill-zinc-600 text-zinc-600" /> {video.likes}
                          </span>
                          <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-0.5">
                            <MessageSquare className="w-2.5 h-2.5 text-zinc-600" /> {video.queries}
                          </span>
                        </div>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                  ))}
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
                              onClick={() => confirmFulfillment(lead)}
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
                onClick={() => setShowUploadModal(true)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-[9px] font-black uppercase tracking-widest text-zinc-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Video
              </button>
            </div>
          </div>
        </div>

        {/* Glowing Active indicator */}
        <div className="mt-5 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-teal-400">CONSOLE SIMULATION READY</span>
        </div>
      </main>

      {/* Mock Upload Modal Overlay */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1c1c1c] border border-white/10 rounded-[2rem] p-6 w-full max-w-sm text-left shadow-2xl relative"
            >
              <button
                onClick={() => setShowUploadModal(false)}
                className="absolute top-5 right-5 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1.5 mb-5">
                <h4 className="text-sm font-black uppercase tracking-wider text-white">Select Video to Upload</h4>
                <p className="text-xs text-zinc-500 font-medium">Choose from pre-recorded catalog reels to simulate posting</p>
              </div>

              <div className="space-y-3">
                {mockUploadOptions.map((opt, i) => (
                  <div 
                    key={i}
                    onClick={() => handleUploadVideo(opt.title, opt.url)}
                    className="p-3 bg-zinc-900 border border-white/5 rounded-2xl flex items-center gap-3 hover:border-teal-500/40 hover:bg-teal-500/5 cursor-pointer transition-all"
                  >
                    <img src={opt.url} className="w-10 h-10 rounded-lg object-cover border border-white/5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{opt.title}</p>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase mt-0.5">Size: 4.8MB • MP4 Format</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mock Fulfill Phone Call Modal */}
      <AnimatePresence>
        {activeFulfillLead && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1c1c1c] border border-white/10 rounded-[2rem] p-6 w-full max-w-xs text-center shadow-2xl relative"
            >
              <button
                onClick={() => setActiveFulfillLead(null)}
                className="absolute top-5 right-5 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-16 h-16 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 animate-bounce" />
              </div>

              <div className="space-y-1 mb-6">
                <h4 className="text-xs font-black uppercase tracking-wider text-white">Call Simulator</h4>
                <p className="text-[10px] text-zinc-500 font-medium">Contacting {activeFulfillLead.clientName}...</p>
                <p className="text-sm font-bold text-white mt-2">+91 {activeFulfillLead.phone}</p>
              </div>

              <div className="p-3 bg-zinc-900 border border-white/5 rounded-2xl text-[10px] text-zinc-400 leading-normal italic text-left mb-6">
                "Simulating connection to client regarding their inquiry on '{activeFulfillLead.sourceClip}'"
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={completeFulfill}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" /> Mark as Resolved
                </button>
                <button
                  onClick={() => setActiveFulfillLead(null)}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                >
                  Cancel Call
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendorClips;
