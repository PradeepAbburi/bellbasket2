import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft, Briefcase, MapPin, Search, Clock, Plus, Trash2, X,
  Phone, Navigation, Sliders, ChevronDown, Send, Eye, EyeOff,
  Building2, Users, FileText, Loader2, CheckCircle2, CircleDot,
  Radius, IndianRupee, SlidersHorizontal, Sparkles, Zap, UserCheck, AlertCircle
} from 'lucide-react';
import { Helmet } from 'react-helmet';
import { toast } from 'sonner';
import { db } from '../lib/firebase';
import {
  collection, query, onSnapshot, addDoc, deleteDoc, doc,
  serverTimestamp, updateDoc, where, orderBy
} from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import Header from '@/components/Header';

// ─── Types ───────────────────────────────────────────────────────────────
interface BellJob {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  salary: string;
  contactPhone: string;
  location: string;
  lat: number;
  lng: number;
  radiusKm: number;
  vendorId: string;
  vendorName: string;
  storeName: string;
  status: 'active' | 'paused' | 'closed';
  createdAt?: any;
}

interface BellJobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  applicantName: string;
  phone: string;
  email: string;
  experience: string;
  note: string;
  resumeUrl: string;
  status: 'pending' | 'reviewed' | 'contacted' | 'hired' | 'rejected';
  appliedAt?: any;
  vendorId?: string;
}

// ─── Haversine Distance ──────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Constants ───────────────────────────────────────────────────────────
const JOB_CATEGORIES = [
  'Delivery', 'Retail / Sales', 'Kitchen / Food', 'Warehouse',
  'Driving', 'Office / Admin', 'Cleaning', 'Security',
  'Construction', 'Teaching', 'Healthcare', 'IT / Tech', 'Other'
];

const JOB_TYPES = ['Full-time', 'Part-time', 'Daily Wage', 'Contract', 'Internship'];

const RADIUS_OPTIONS = [
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
  { label: '25 km', value: 25 },
  { label: '50 km', value: 50 },
  { label: 'All', value: 99999 },
];

// ─── Component ───────────────────────────────────────────────────────────
const BellJobs = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeStoreId, slug: routeStoreSlug } = useParams();
  const { user, stores } = useApp();

  const urlStore = useMemo(() => {
    return stores.find(s => s.id === routeStoreId || (routeStoreSlug && s.slug === routeStoreSlug));
  }, [stores, routeStoreId, routeStoreSlug]);

  const activeVendorId = location.state?.vendorId || urlStore?.id;
  const activeVendorName = location.state?.vendorName || urlStore?.name;

  const isVendor = user?.role === 'vendor';
  const isAdmin = user?.role === 'admin' || user?.role === 'hr';

  // ── State ──
  const [jobs, setJobs] = useState<BellJob[]>([]);
  const [applications, setApplications] = useState<BellJobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'browse' | 'my-jobs' | 'applications'>('browse');

  const hasValidPlan = useMemo(() => {
    if (!user) return false;
    if (isAdmin) return true;
    if (user.role !== 'vendor') return false;
    const plan = user.plan;
    if (!plan || plan === 'none') return false;
    if (user.subscriptionExpiry) {
      const expiry = new Date(user.subscriptionExpiry).getTime();
      if (!isNaN(expiry) && Date.now() > expiry) return false;
    }
    return true;
  }, [user, isAdmin]);

  // Location
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [radiusFilter, setRadiusFilter] = useState(25);
  const [showFilters, setShowFilters] = useState(false);

  // Post Job Modal
  const [showPostModal, setShowPostModal] = useState(false);
  const [posting, setPosting] = useState(false);
  const [newJob, setNewJob] = useState({
    title: '', description: '', category: 'Retail / Sales', type: 'Full-time',
    salary: '', contactPhone: '', location: '', lat: 0, lng: 0, radiusKm: 10,
  });
  const [detectingJobLoc, setDetectingJobLoc] = useState(false);

  // Apply Modal
  const [applyingJob, setApplyingJob] = useState<BellJob | null>(null);
  const [applyForm, setApplyForm] = useState({
    applicantName: '', phone: '', email: '', experience: '', note: '',
  });
  const [submittingApp, setSubmittingApp] = useState(false);

  // App tab
  const [appTab, setAppTab] = useState<'pending' | 'reviewed' | 'contacted' | 'hired'>('pending');

  // ── Vendor store for auto-fill ──
  const vendorStore = useMemo(() => {
    if (!isVendor || !user) return null;
    return stores.find(s => s.vendorId === user.id || s.id === user.id);
  }, [isVendor, user, stores]);

  // ── Detect User Location ──
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setLocating(false);
        toast.success('Location detected!');
      },
      () => {
        setLocating(false);
        toast.error('Could not detect location. Showing all jobs.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Auto-detect on mount
  useEffect(() => {
    detectLocation();
  }, []);

  // ── Fetch Jobs ──
  useEffect(() => {
    const q = query(collection(db, 'bell_jobs'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as BellJob));
      setJobs(list);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  // ── Fetch Applications (vendor only) ──
  useEffect(() => {
    if (!isVendor && !isAdmin) return;
    const baseCol = collection(db, 'bell_job_applications');
    const q = isAdmin ? query(baseCol) : query(baseCol, where('vendorId', '==', user?.id));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as BellJobApplication));
      if (isVendor && user) {
        const myJobIds = new Set(jobs.filter(j => j.vendorId === user.id).map(j => j.id));
        setApplications(list.filter(a => myJobIds.has(a.jobId)));
      } else {
        setApplications(list);
      }
    });
    return () => unsub();
  }, [isVendor, isAdmin, user, jobs]);

  // ── Filtered Jobs ──
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Only show active to public
      if (viewMode === 'my-jobs') {
        return job.vendorId === user?.id;
      }
      
      if (activeVendorId && job.vendorId !== activeVendorId) {
        return false;
      }

      if (job.status !== 'active') return false;

      const matchesSearch = !searchTerm ||
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || job.category === categoryFilter;
      const matchesType = typeFilter === 'All' || job.type === typeFilter;

      // Distance filter
      let matchesRadius = true;
      if (!activeVendorId && userLat !== null && userLng !== null && radiusFilter < 99999) {
        const dist = haversineKm(userLat, userLng, job.lat, job.lng);
        matchesRadius = dist <= radiusFilter;
      }

      return matchesSearch && matchesCategory && matchesType && matchesRadius;
    });
  }, [jobs, searchTerm, categoryFilter, typeFilter, radiusFilter, userLat, userLng, viewMode, user, activeVendorId]);

  // ── Filtered Applications ──
  const filteredApps = useMemo(() => {
    return applications.filter(a => (a.status || 'pending') === appTab);
  }, [applications, appTab]);

  // ── Distance helper ──
  const getDistance = (job: BellJob) => {
    if (userLat === null || userLng === null) return null;
    return haversineKm(userLat, userLng, job.lat, job.lng);
  };

  // ── Post Job ──
  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error('Please login first'); return; }
    if (!hasValidPlan) { toast.error('An active subscription is required to post jobs.'); return; }
    if (!newJob.title.trim() || !newJob.location.trim()) {
      toast.error('Title and Location are required');
      return;
    }
    if (!newJob.lat || !newJob.lng) {
      toast.error('Please detect location for the job');
      return;
    }

    setPosting(true);
    try {
      await addDoc(collection(db, 'bell_jobs'), {
        ...newJob,
        vendorId: user.id,
        vendorName: user.name || 'Vendor',
        storeName: vendorStore?.name || '',
        status: 'active',
        createdAt: serverTimestamp(),
      });
      toast.success('Job posted successfully!');
      setShowPostModal(false);
      setNewJob({
        title: '', description: '', category: 'Retail / Sales', type: 'Full-time',
        salary: '', contactPhone: '', location: '', lat: 0, lng: 0, radiusKm: 10,
      });
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setPosting(false);
    }
  };

  // ── Toggle Job Status ──
  const toggleJobStatus = async (id: string, current: string) => {
    try {
      const next = current === 'active' ? 'paused' : 'active';
      await updateDoc(doc(db, 'bell_jobs', id), { status: next });
      toast.success(next === 'active' ? 'Job resumed' : 'Job paused');
    } catch { toast.error('Failed to update'); }
  };

  // ── Delete Job ──
  const deleteJob = async (id: string) => {
    if (!window.confirm('Delete this job posting?')) return;
    try {
      await deleteDoc(doc(db, 'bell_jobs', id));
      toast.success('Job deleted');
    } catch { toast.error('Failed to delete'); }
  };

  // ── Apply ──
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyingJob) return;
    if (!applyForm.applicantName || !applyForm.phone) {
      toast.error('Name and Phone are required');
      return;
    }

    setSubmittingApp(true);
    try {
      await addDoc(collection(db, 'bell_job_applications'), {
        jobId: applyingJob.id,
        jobTitle: applyingJob.title,
        vendorId: applyingJob.vendorId,
        ...applyForm,
        resumeUrl: '',
        status: 'pending',
        appliedAt: serverTimestamp(),
      });
      toast.success('Application submitted!');
      setApplyingJob(null);
      setApplyForm({ applicantName: '', phone: '', email: '', experience: '', note: '' });
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setSubmittingApp(false);
    }
  };

  // ── Update App Status ──
  const updateAppStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'bell_job_applications', id), { status });
      toast.success(`Moved to ${status}`);
    } catch { toast.error('Failed'); }
  };

  // ── Delete Application ──
  const deleteApplication = async (id: string) => {
    if (!window.confirm('Delete this application?')) return;
    try {
      await deleteDoc(doc(db, 'bell_job_applications', id));
      toast.success('Removed');
    } catch { toast.error('Failed'); }
  };

  // ── Detect Job Location ──
  const detectJobLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setDetectingJobLoc(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNewJob(prev => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setDetectingJobLoc(false);
        toast.success('Job location set from GPS');
      },
      () => { setDetectingJobLoc(false); toast.error('Could not detect'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Auto-fill from vendor store
  const autoFillFromStore = () => {
    if (!vendorStore) return;
    setNewJob(prev => ({
      ...prev,
      location: vendorStore.address || '',
      lat: vendorStore.lat || 0,
      lng: vendorStore.lng || 0,
      contactPhone: vendorStore.phone || prev.contactPhone,
    }));
    toast.success('Auto-filled from store');
  };

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen gradient-warm">
      <Helmet>
        <title>BellJobs — Local Jobs Near You | BellBasket</title>
        <meta name="description" content="Find local jobs near you. Vendors post jobs in their locality with km radius visibility. Apply instantly on BellJobs by BellBasket." />
        <meta property="og:title" content="BellJobs — Local Jobs Near You" />
        <meta property="og:url" content="https://bellbasket.com/belljobs" />
        <link rel="canonical" href="https://bellbasket.com/belljobs" />
      </Helmet>
      <Header />

      {/* ── Apply Modal ── */}
      <AnimatePresence>
        {applyingJob && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setApplyingJob(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-lg rounded-3xl p-8 relative shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setApplyingJob(null)} className="absolute top-5 right-5 p-2 rounded-full hover:bg-secondary/50"><X className="w-5 h-5" /></button>
              <div className="space-y-1 mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">{applyingJob.category}</span>
                <h2 className="text-2xl font-black text-foreground mt-2">{applyingJob.title}</h2>
                <p className="text-xs text-muted-foreground font-bold flex items-center gap-1.5"><MapPin className="w-3 h-3" />{applyingJob.location}</p>
                {applyingJob.salary && <p className="text-xs text-emerald-600 font-bold flex items-center gap-1.5"><IndianRupee className="w-3 h-3" />{applyingJob.salary}</p>}
              </div>

              <form onSubmit={handleApply} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Full Name *</label>
                  <input type="text" value={applyForm.applicantName} onChange={e => setApplyForm({ ...applyForm, applicantName: e.target.value })}
                    className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-3.5 px-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Phone *</label>
                    <input type="tel" value={applyForm.phone} onChange={e => setApplyForm({ ...applyForm, phone: e.target.value })}
                      className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-3.5 px-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email</label>
                    <input type="email" value={applyForm.email} onChange={e => setApplyForm({ ...applyForm, email: e.target.value })}
                      className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-3.5 px-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Experience</label>
                  <input type="text" placeholder="e.g., 2 years in retail" value={applyForm.experience} onChange={e => setApplyForm({ ...applyForm, experience: e.target.value })}
                    className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-3.5 px-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Why should we hire you?</label>
                  <textarea rows={3} value={applyForm.note} onChange={e => setApplyForm({ ...applyForm, note: e.target.value })}
                    className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-3.5 px-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                </div>
                <button type="submit" disabled={submittingApp}
                  className="w-full bg-primary text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {submittingApp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submittingApp ? 'Submitting...' : 'Submit Application'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Post Job Modal ── */}
      <AnimatePresence>
        {showPostModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
            onClick={() => setShowPostModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-2xl rounded-3xl p-8 relative shadow-2xl border border-white/10 my-8 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setShowPostModal(false)} className="absolute top-5 right-5 p-2 rounded-full hover:bg-secondary/50"><X className="w-5 h-5" /></button>
              <h2 className="text-3xl font-black text-foreground mb-2">Post a Local Job</h2>
              <p className="text-sm text-muted-foreground font-medium mb-8">Your job will be visible to people within the specified radius.</p>

              <form onSubmit={handlePostJob} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Job Title *</label>
                  <input type="text" placeholder="e.g. Delivery Boy, Shop Assistant" value={newJob.title} onChange={e => setNewJob({ ...newJob, title: e.target.value })}
                    className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-3.5 px-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20" required />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</label>
                  <select value={newJob.category} onChange={e => setNewJob({ ...newJob, category: e.target.value })}
                    className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-3.5 px-5 text-sm font-bold focus:outline-none">
                    {JOB_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Job Type</label>
                  <select value={newJob.type} onChange={e => setNewJob({ ...newJob, type: e.target.value })}
                    className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-3.5 px-5 text-sm font-bold focus:outline-none">
                    {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Salary / Pay (Optional)</label>
                  <input type="text" placeholder="e.g. ₹12,000/month" value={newJob.salary} onChange={e => setNewJob({ ...newJob, salary: e.target.value })}
                    className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-3.5 px-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contact Phone</label>
                  <input type="tel" placeholder="Phone number" value={newJob.contactPhone} onChange={e => setNewJob({ ...newJob, contactPhone: e.target.value })}
                    className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-3.5 px-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>

                {/* Location Section */}
                <div className="md:col-span-2 space-y-3 bg-secondary/30 p-5 rounded-2xl border border-border/30">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Job Location</label>
                    <div className="flex items-center gap-2">
                      {vendorStore && (
                        <button type="button" onClick={autoFillFromStore}
                          className="text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary px-3 py-1.5 rounded-full hover:bg-primary/20 transition-all">
                          Use Store Location
                        </button>
                      )}
                      <button type="button" onClick={detectJobLocation} disabled={detectingJobLoc}
                        className="text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-600 px-3 py-1.5 rounded-full hover:bg-blue-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50">
                        {detectingJobLoc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                        Detect GPS
                      </button>
                    </div>
                  </div>
                  <input type="text" placeholder="Address / Area name *" value={newJob.location} onChange={e => setNewJob({ ...newJob, location: e.target.value })}
                    className="w-full bg-white dark:bg-[#252525] border border-border/50 rounded-xl py-3 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20" required />
                  {newJob.lat !== 0 && (
                    <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> GPS: {newJob.lat.toFixed(4)}, {newJob.lng.toFixed(4)}
                    </p>
                  )}
                  {newJob.lat === 0 && (
                    <p className="text-[10px] font-bold text-amber-600 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> Please detect GPS location or use store location
                    </p>
                  )}

                  {/* Radius Selector */}
                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Radius className="w-3.5 h-3.5" /> Visibility Radius — {newJob.radiusKm} km
                    </label>
                    <input type="range" min={1} max={50} value={newJob.radiusKm} onChange={e => setNewJob({ ...newJob, radiusKm: parseInt(e.target.value) })}
                      className="w-full accent-primary h-2 rounded-full" />
                    <div className="flex justify-between text-[9px] text-muted-foreground font-bold">
                      <span>1 km</span><span>10 km</span><span>25 km</span><span>50 km</span>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description</label>
                  <textarea rows={3} placeholder="Job details, requirements, timings..." value={newJob.description} onChange={e => setNewJob({ ...newJob, description: e.target.value })}
                    className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-3.5 px-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                </div>

                <button type="submit" disabled={posting}
                  className="md:col-span-2 bg-primary text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {posting ? 'Posting...' : 'Post Job'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Content ── */}
      <div className="pt-20 pb-32 lg:pb-8 px-4 max-w-5xl mx-auto space-y-8">
        {/* Nav Row */}
        <div className="flex items-center justify-between">
          <button onClick={() => {
            if (activeVendorId || window.history.length > 2) {
              navigate(-1);
            } else {
              navigate('/');
            }
          }} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all hover:translate-x-[-4px]">
            <ArrowLeft className="w-4 h-4" /><span className="text-sm font-bold">Back</span>
          </button>
          {hasValidPlan && (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowPostModal(true)}
                className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20">
                <Plus className="w-3.5 h-3.5" /> Post Job
              </button>
            </div>
          )}
        </div>

        {/* Hero */}
        <div className="text-center space-y-5 max-w-3xl mx-auto">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Powered by BellBasket</span>
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black text-foreground leading-[1.1] tracking-tighter">
            {activeVendorName ? (
              <>Jobs at <span className="text-gradient">{activeVendorName}</span></>
            ) : (
              <>Bell<span className="text-gradient">Jobs</span></>
            )}
          </h1>
          <p className="text-base text-muted-foreground font-medium max-w-md mx-auto leading-relaxed">
            {activeVendorName 
              ? `Apply to open positions at ${activeVendorName}.`
              : 'Find and post local jobs near you. Connecting employers and job seekers in your neighborhood.'}
          </p>
        </div>

        {/* View Tabs (Vendor) */}
        {hasValidPlan && (
          <div className="flex items-center justify-center gap-2">
            {(['browse', 'my-jobs', 'applications'] as const).map(tab => (
              <button key={tab} onClick={() => setViewMode(tab)}
                className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === tab
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'glass border border-border/10 text-muted-foreground hover:bg-white/5'
                }`}>
                {tab === 'browse' && <><Search className="w-3.5 h-3.5 inline mr-1.5" />Browse</>}
                {tab === 'my-jobs' && <><Briefcase className="w-3.5 h-3.5 inline mr-1.5" />My Jobs</>}
                {tab === 'applications' && <><Users className="w-3.5 h-3.5 inline mr-1.5" />Applicants ({applications.length})</>}
              </button>
            ))}
          </div>
        )}

        {/* ════════════════════════ APPLICATIONS VIEW ════════════════════════ */}
        {viewMode === 'applications' ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {(['pending', 'reviewed', 'contacted', 'hired'] as const).map(tab => (
                <button key={tab} onClick={() => setAppTab(tab)}
                  className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${appTab === tab
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'glass border border-border/10 text-muted-foreground hover:bg-white/5'
                  }`}>
                  {tab} ({applications.filter(a => (a.status || 'pending') === tab).length})
                </button>
              ))}
            </div>

            <div className="grid gap-4">
              {filteredApps.length === 0 ? (
                <div className="p-16 text-center glass rounded-3xl border-dashed border-2 border-border/50">
                  <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground font-bold text-sm">No applicants in {appTab} stage.</p>
                </div>
              ) : filteredApps.map(app => (
                <motion.div key={app.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="glass p-6 rounded-3xl border border-white/40 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full">{app.jobTitle}</span>
                      <h3 className="text-xl font-black text-foreground">{app.applicantName}</h3>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground font-bold">
                        <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-primary/60" /> {app.phone}</span>
                        {app.email && <span className="flex items-center gap-1.5">✉ {app.email}</span>}
                        {app.experience && <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-primary/60" /> {app.experience}</span>}
                      </div>
                      {app.note && <p className="text-sm text-muted-foreground italic bg-secondary/30 p-4 rounded-2xl mt-2">"{app.note}"</p>}
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {appTab !== 'reviewed' && (
                        <button onClick={() => updateAppStatus(app.id, 'reviewed')}
                          className="text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-600 px-3 py-2 rounded-xl border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all">
                          Reviewed
                        </button>
                      )}
                      {appTab !== 'contacted' && (
                        <button onClick={() => updateAppStatus(app.id, 'contacted')}
                          className="text-[8px] font-black uppercase tracking-widest bg-purple-500/10 text-purple-600 px-3 py-2 rounded-xl border border-purple-500/20 hover:bg-purple-500 hover:text-white transition-all">
                          Contacted
                        </button>
                      )}
                      {appTab !== 'hired' && (
                        <button onClick={() => updateAppStatus(app.id, 'hired')}
                          className="text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 px-3 py-2 rounded-xl border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all">
                          Hired
                        </button>
                      )}
                      <button onClick={() => deleteApplication(app.id)}
                        className="text-[8px] font-black uppercase tracking-widest bg-red-500/10 text-red-600 px-3 py-2 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all">
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* ════════════════════════ BROWSE / MY JOBS VIEW ════════════════════════ */}

            {/* Search & Filter Bar */}
            {viewMode === 'browse' && (
              <div className="glass-strong rounded-3xl p-4 border border-white/40 shadow-xl space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input type="text" placeholder="Search jobs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                      className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  </div>
                  <button onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all border ${showFilters ? 'bg-primary text-white border-primary' : 'bg-secondary/50 border-border/50 text-foreground hover:bg-secondary'}`}>
                    <SlidersHorizontal className="w-4 h-4" /> Filters
                  </button>
                  {!activeVendorId && (
                    <button onClick={detectLocation} disabled={locating}
                      className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all disabled:opacity-50">
                      {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                      {userLat ? 'Refresh GPS' : 'Detect Location'}
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {showFilters && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-border/20">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</label>
                          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                            className="w-full bg-secondary/50 border border-border/50 rounded-xl py-3 px-4 text-sm font-bold focus:outline-none">
                            <option value="All">All Categories</option>
                            {JOB_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Job Type</label>
                          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                            className="w-full bg-secondary/50 border border-border/50 rounded-xl py-3 px-4 text-sm font-bold focus:outline-none">
                            <option value="All">All Types</option>
                            {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                        {!activeVendorId && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              Radius: {radiusFilter >= 99999 ? 'All' : `${radiusFilter} km`}
                            </label>
                            <div className="flex items-center gap-2 pt-1">
                              {RADIUS_OPTIONS.map(r => (
                                <button key={r.value} onClick={() => setRadiusFilter(r.value)}
                                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${radiusFilter === r.value
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-secondary/50 text-muted-foreground hover:bg-secondary border border-border/30'
                                  }`}>
                                  {r.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Location Status */}
            {viewMode === 'browse' && !activeVendorId && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-bold">
                {userLat ? (
                  <><CircleDot className="w-3.5 h-3.5 text-emerald-500" /> Showing jobs near your location{radiusFilter < 99999 ? ` within ${radiusFilter} km` : ''}</>
                ) : (
                  <><CircleDot className="w-3.5 h-3.5 text-amber-500" /> Location not set — showing all jobs</>
                )}
              </div>
            )}

            {/* Job List */}
            <div className="grid gap-4">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  <div className="p-16 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
                ) : filteredJobs.length === 0 ? (
                  <div className="p-16 text-center space-y-4 glass rounded-3xl border-dashed border-2 border-primary/20">
                    <Briefcase className="w-10 h-10 text-primary/30 mx-auto" />
                    <h3 className="text-xl font-black text-foreground">
                      {viewMode === 'my-jobs' ? 'No jobs posted yet' : (activeVendorName ? `No jobs available at ${activeVendorName}` : 'No jobs found nearby')}
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium max-w-xs mx-auto">
                      {viewMode === 'my-jobs'
                        ? 'Click "Post Job" to create your first listing.'
                        : (activeVendorName ? 'Check back later for new opportunities.' : 'Try increasing the radius or removing filters.')}
                    </p>
                  </div>
                ) : (
                  filteredJobs.map((job, i) => {
                    const dist = getDistance(job);
                    const canManage = (isVendor && job.vendorId === user?.id) || isAdmin;

                    return (
                      <motion.div key={job.id} layout
                        initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ delay: i * 0.03 }}
                        className={`glass p-6 md:p-7 rounded-3xl border border-white/40 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:shadow-2xl hover:border-primary/20 transition-all group ${job.status === 'paused' ? 'opacity-60' : ''}`}>
                        <div className="space-y-3 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">{job.category}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-full">{job.type}</span>
                            {job.status === 'paused' && <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full">Paused</span>}
                          </div>
                          <h3 className="text-lg md:text-xl font-black text-foreground group-hover:text-primary transition-colors truncate">{job.title}</h3>
                          {job.description && <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>}
                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-bold">
                            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary/60" /> {job.location}</span>
                            {dist !== null && !activeVendorId && <span className="flex items-center gap-1.5 text-blue-600"><Navigation className="w-3.5 h-3.5" /> {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)} km`}</span>}
                            {job.salary && <span className="flex items-center gap-1.5 text-emerald-600"><IndianRupee className="w-3.5 h-3.5" /> {job.salary}</span>}
                            {job.storeName && <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-primary/60" /> {job.storeName}</span>}
                            <span className="flex items-center gap-1.5"><Radius className="w-3.5 h-3.5 text-primary/60" /> {job.radiusKm} km radius</span>
                          </div>
                          {job.vendorName && (
                            <p className="text-[10px] text-muted-foreground/70 font-bold">Posted by {job.vendorName} • {
                              job.createdAt?.seconds
                                ? new Date(job.createdAt.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                : 'Recently'
                            }</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {canManage ? (
                            <>
                              <button onClick={() => toggleJobStatus(job.id, job.status)}
                                className={`p-3 rounded-2xl transition-all border ${job.status === 'active'
                                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500 hover:text-white'
                                  : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500 hover:text-white'
                                }`} title={job.status === 'active' ? 'Pause' : 'Resume'}>
                                {job.status === 'active' ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                              </button>
                              <button onClick={() => deleteJob(job.id)}
                                className="bg-red-500/10 text-red-600 p-3 rounded-2xl hover:bg-red-500 hover:text-white transition-all border border-red-500/20">
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              {job.contactPhone && (
                                <a href={`tel:${job.contactPhone}`}
                                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest">
                                  <Phone className="w-4 h-4" /> Call
                                </a>
                              )}
                              <button onClick={() => setApplyingJob(job)}
                                className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all active:scale-95">
                                <Send className="w-4 h-4" /> Apply
                              </button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>

            {/* CTA for non-vendors */}
            {!isVendor && !isAdmin && viewMode === 'browse' && (
              <div className="glass-strong rounded-3xl p-8 md:p-10 text-center space-y-4 border border-primary/10">
                <h2 className="text-2xl font-black text-foreground">Want to post a job?</h2>
                <p className="text-muted-foreground font-medium max-w-sm mx-auto">
                  Become a vendor on BellBasket to post jobs in your locality and reach people nearby.
                </p>
                <button onClick={() => navigate('/vendor/setup')}
                  className="inline-flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                  <UserCheck className="w-4 h-4" /> Become a Vendor
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BellJobs;
