import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  ArrowLeft, Briefcase, MapPin, Search, Clock, Plus, Trash2, X,
  Phone, Navigation, Sliders, ChevronDown, Send, Eye, EyeOff,
  Building2, Users, FileText, Loader2, CheckCircle2, CircleDot,
  Radius, IndianRupee, SlidersHorizontal, Sparkles, Zap, UserCheck, AlertCircle, History
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
  const [loading, setLoading] = useState(true);
  const [userApplications, setUserApplications] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      setUserApplications([]);
      return;
    }
    const q = query(collection(db, 'bell_job_applications'), where('userId', '==', user.id));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUserApplications(list);
    }, (error) => {
      console.error("Error fetching user applications:", error);
    });
    return () => unsub();
  }, [user]);

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
  const [userLat, setUserLat] = useState<number | null>(() => {
    const lat = localStorage.getItem('user_lat');
    return lat ? parseFloat(lat) : null;
  });
  const [userLng, setUserLng] = useState<number | null>(() => {
    const lng = localStorage.getItem('user_lng');
    return lng ? parseFloat(lng) : null;
  });
  const [locationName, setLocationName] = useState(localStorage.getItem('user_location_name') || 'Current Location');
  const [locating, setLocating] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [searchHistory, setSearchHistory] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('location_history') || '[]'); } catch { return []; }
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [radiusFilter, setRadiusFilter] = useState(25);
  const [showFilters, setShowFilters] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 100);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Search
  const locationSearchTimeout = useRef<NodeJS.Timeout>();

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
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserLat(lat);
        setUserLng(lng);
        
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          .then(async res => {
            if (!res.ok) throw new Error(`Nominatim error`);
            return res.json();
          })
          .then(data => {
            const name = data.display_name?.split(',')[0] || data.address?.city || 'Current Location';
            setLocationName(name);
            localStorage.setItem('user_lat', lat.toString());
            localStorage.setItem('user_lng', lng.toString());
            localStorage.setItem('user_location_name', name);
            toast.success('Found you in ' + name);
          })
          .catch(() => {
             setLocationName('Current Location');
             toast.success('Location detected');
          })
          .finally(() => {
             setLocating(false);
          });
      },
      () => {
        setLocating(false);
        toast.error('Could not detect location. Showing all jobs.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleLocationSearch = (val: string) => {
    setLocationSearch(val);
    if (val.length < 2) {
      setLocationResults([]);
      return;
    }

    if (locationSearchTimeout.current) clearTimeout(locationSearchTimeout.current);
    
    setIsSearchingLocation(true);
    locationSearchTimeout.current = setTimeout(async () => {
      try {
        const query = val.toUpperCase() === 'HYD' ? 'Hyderabad, India' : val;
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=${userLat || 16.98}&lon=${userLng || 82.24}&limit=12`;
        const res = await fetch(photonUrl);
        const data = await res.json();

        const results = data.features
          .filter((f: any) => {
            const country = f.properties.countrycode?.toUpperCase();
            return country !== 'BD' && country !== 'PK';
          })
          .map((f: any) => {
            const lat = f.geometry.coordinates[1];
            const lon = f.geometry.coordinates[0];
            const name = f.properties.name || '';
            const type = f.properties.osm_value || f.properties.osm_key;
            
            let displayNameTokens = [name];
            if (f.properties.city && f.properties.city !== name) displayNameTokens.push(f.properties.city);
            else if (f.properties.county && f.properties.county !== name) displayNameTokens.push(f.properties.county);
            if (f.properties.state) displayNameTokens.push(f.properties.state);

            return {
              place_id: Math.random().toString(),
              lat, lon,
              short_name: name,
              display_name: displayNameTokens.join(', '),
              type,
              distanceKm: userLat && userLng ? haversineKm(userLat, userLng, lat, lon) : undefined
            };
          });

        setLocationResults(results);
      } catch (err) {
        console.error("Location search failed", err);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 500);
  };

  const selectResult = (res: any) => {
    const lat = typeof res.lat === 'string' ? parseFloat(res.lat) : res.lat;
    const lng = typeof res.lon === 'string' ? parseFloat(res.lon) : res.lon;
    const shortName = res.short_name || res.display_name.split(',')[0];

    setUserLat(lat);
    setUserLng(lng);
    setLocationName(shortName);
    
    const newItem = {
      id: res.place_id?.toString() || Math.random().toString(),
      name: shortName,
      lat,
      lon: lng,
    };

    setSearchHistory(prev => {
      const filtered = prev.filter(item => item.name !== shortName);
      const newHistory = [newItem, ...filtered].slice(0, 5);
      localStorage.setItem('location_history', JSON.stringify(newHistory));
      return newHistory;
    });

    localStorage.setItem('user_lat', lat.toString());
    localStorage.setItem('user_lng', lng.toString());
    localStorage.setItem('user_location_name', shortName);
    
    setLocationSearch('');
    setShowLocationPicker(false);
    toast.success(`Location set to ${shortName}`);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('location_history');
  };

  // Auto-detect on mount
  useEffect(() => {
    if (!userLat || !userLng) {
      detectLocation();
    }
  }, [userLat, userLng, detectLocation]);

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



  // ── Filtered Jobs ──
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // Only show active to public
      
      if (activeVendorId && job.vendorId !== activeVendorId) {
        return false;
      }

      if (job.status !== 'active') return false;

      const matchesSearch = !searchTerm ||
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.category?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || job.category === categoryFilter;
      const matchesType = typeFilter === 'All' || job.type === typeFilter || !job.type;

      // Distance filter
      let matchesRadius = true;
      if (!activeVendorId && userLat !== null && userLng !== null && radiusFilter < 99999) {
        const dist = haversineKm(userLat, userLng, job.lat, job.lng);
        matchesRadius = dist <= radiusFilter;
      }

      return matchesSearch && matchesCategory && matchesType && matchesRadius;
    });
  }, [jobs, searchTerm, categoryFilter, typeFilter, radiusFilter, userLat, userLng, user, activeVendorId]);


  // ── Distance helper ──
  const getDistance = (job: BellJob) => {
    if (userLat === null || userLng === null) return null;
    return haversineKm(userLat, userLng, job.lat, job.lng);
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

      <Header />

      {/* ── Main Content ── */}
      <div className="pb-32 lg:pb-8 px-4 max-w-5xl mx-auto space-y-6 pt-24 lg:pt-28">
        
        {/* Top Nav Row (Hidden on scroll) */}
        <div className={`flex items-center justify-between transition-all duration-300 ${isScrolled ? 'opacity-0 h-0 overflow-hidden pointer-events-none -mt-6' : 'opacity-100 h-10 mb-4'}`}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/browse')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" /> <span className="text-sm font-bold">Back</span>
            </button>
            {activeVendorName && (
              <div className="h-8 w-px bg-border/50 hidden sm:block"></div>
            )}
            {activeVendorName && (
              <div className="flex flex-col min-w-0">
                <span className="text-base font-black text-yellow-400">
                  {activeVendorName}
                </span>
                {(urlStore?.address || urlStore?.mandal) && (
                  <span className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    {urlStore.address || urlStore.mandal}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!activeVendorId && user && !isAdmin && (
              <button onClick={() => navigate('/belljobs/applied')}
                className="flex items-center gap-2 bg-[#202020] text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#2a2a2a] transition-all shadow-lg">
                <FileText className="w-3.5 h-3.5 text-white" /> Applied Jobs
              </button>
            )}
            {hasValidPlan && (
              <button onClick={() => navigate('/vendor/jobs/new')}
                className="sm:hidden flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20">
                <Plus className="w-3.5 h-3.5" /> Post Job
              </button>
            )}
          </div>
        </div>

      {/* ── Sticky Toolbar ── */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-xl border-t border-border/40 pt-3 pb-0 shadow-sm transition-all -mx-4 px-4 mb-0">
        <div className="max-w-5xl mx-auto flex flex-col gap-3">
          <div className="flex items-center gap-2 md:gap-3">
            {isScrolled && (
              <div className="flex items-center gap-3">
                <button onClick={() => navigate('/browse')} className="flex-shrink-0 w-10 h-10 md:w-auto md:px-4 flex items-center justify-center gap-2 rounded-xl bg-secondary/50 hover:bg-secondary text-foreground transition-all">
                  <ArrowLeft className="w-5 h-5 md:w-4 md:h-4" />
                  <span className="hidden md:inline text-sm font-bold">Back</span>
                </button>
                {activeVendorName && (
                  <div className="hidden sm:flex flex-col min-w-0 max-w-[200px]">
                    <span className="text-sm font-black text-yellow-400 truncate">
                      {activeVendorName}
                    </span>
                    {(urlStore?.address || urlStore?.mandal) && (
                      <span className="text-[9px] text-muted-foreground truncate flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />
                        {urlStore.address || urlStore.mandal}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <div className="flex-1 min-w-0 relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input type="text" placeholder="Search jobs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-secondary/50 border border-border/50 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
            </div>

            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex-shrink-0 w-10 h-10 md:w-auto md:px-4 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all border ${showFilters ? 'bg-primary text-white border-primary' : 'bg-secondary/50 border-border/50 text-foreground hover:bg-secondary'}`}>
              <SlidersHorizontal className="w-4 h-4 md:w-4 md:h-4" /> 
              <span className="hidden md:inline">Filters</span>
            </button>

            {isScrolled && !activeVendorId && user && !isAdmin && (
              <button onClick={() => navigate('/belljobs/applied')}
                className="hidden sm:flex flex-shrink-0 items-center gap-2 bg-[#202020] text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#2a2a2a] transition-all shadow-sm">
                <FileText className="w-3.5 h-3.5" /> Applied
              </button>
            )}

            {isScrolled && hasValidPlan && (
              <button onClick={() => navigate('/vendor/jobs/new')}
                className="hidden sm:flex flex-shrink-0 items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-sm">
                <Plus className="w-3.5 h-3.5" /> Post Job
              </button>
            )}
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
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
      </div>

        <div className="text-center max-w-3xl mx-auto -mt-6">
          {!activeVendorId && (
            <div className="max-w-2xl mx-auto w-full space-y-4 relative">
              <div className="glass rounded-2xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 text-left">
                  <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Your location</p>
                    <p className="text-sm font-semibold text-foreground truncate">
                      {locating ? 'Detecting...' : locationName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={detectLocation}
                    disabled={locating}
                    className="text-xs font-medium text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
                    <span className="hidden sm:inline">Detect</span>
                  </button>
                  <button
                    onClick={() => setShowLocationPicker(!showLocationPicker)}
                    className="text-xs font-medium bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Location picker dropdown */}
              <AnimatePresence>
                {showLocationPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="glass rounded-2xl p-4 space-y-4 text-left shadow-2xl absolute z-40 left-0 right-0 max-w-2xl mx-auto bg-white dark:bg-[#1a1a1a]"
                  >
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={locationSearch}
                        onChange={e => handleLocationSearch(e.target.value)}
                        placeholder="Search for your area or city..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary border border-border/50 text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        autoFocus
                      />
                      {isSearchingLocation && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        </div>
                      )}
                    </div>

                    {locationResults.length > 0 ? (
                      <div className="divide-y divide-border max-h-60 overflow-y-auto">
                        {locationResults.map(res => (
                          <button
                            key={res.place_id}
                            onClick={() => selectResult(res)}
                            className="w-full text-left py-3 px-1 hover:bg-secondary/50 transition-colors rounded-lg flex items-start justify-between gap-3 group"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                <MapPin className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground line-clamp-1">{res.short_name}</p>
                                <p className="text-[11px] text-muted-foreground line-clamp-1">{res.display_name}</p>
                              </div>
                            </div>
                            {res.distanceKm !== undefined && (
                              <div className="shrink-0 flex flex-col items-end">
                                <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                                  {res.distanceKm < 1 ? '<1 km' : `${Math.round(res.distanceKm)} km`}
                                </span>
                                {res.type && res.type !== 'place' && (
                                  <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter mt-1">{res.type}</span>
                                )}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <>
                        {searchHistory.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                <History className="w-3 h-3" />
                                Recently Searched
                              </div>
                              <button onClick={clearHistory} className="text-[10px] text-primary hover:underline font-bold">Clear</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {searchHistory.map(item => (
                                <button
                                  key={item.id}
                                  onClick={() => {
                                    setUserLat(item.lat);
                                    setUserLng(item.lon);
                                    setLocationName(item.name);
                                    setShowLocationPicker(false);
                                    toast.success('Location set to ' + item.name);
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 hover:bg-primary hover:text-primary-foreground transition-all group"
                                >
                                  <MapPin className="w-3 h-3" />
                                  <span className="text-xs font-medium">{item.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

            {/* Location Status */}
            {!activeVendorId && (
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
                      {activeVendorName ? `No jobs available at ${activeVendorName}` : 'No jobs found nearby'}
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium max-w-xs mx-auto">
                      {activeVendorName ? 'Check back later for new opportunities.' : 'Try increasing the radius or removing filters.'}
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
                          ) : (() => {
                            const app = userApplications.find(a => a.jobId === job.id);
                            
                            return (
                              <>
                                {app && (() => {
                                  const status = app.status || 'pending';
                                  let statusColor = 'bg-secondary text-muted-foreground border-border';
                                  let statusLabel = 'Application Pending';
                                  if (status === 'reviewed') {
                                    statusColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                                    statusLabel = 'Under Review';
                                  } else if (status === 'contacted') {
                                    statusColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                                    statusLabel = 'Contacted';
                                  } else if (status === 'hired') {
                                    statusColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                                    statusLabel = 'Hired';
                                  } else if (status === 'rejected') {
                                    statusColor = 'bg-red-500/10 text-red-400 border-red-500/20';
                                    statusLabel = 'Not Selected';
                                  }
                                  return (
                                    <span className={`px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider ${statusColor}`}>
                                      {statusLabel}
                                    </span>
                                  );
                                })()}
                                {job.contactPhone && (
                                  <a href={`tel:${job.contactPhone}`}
                                    className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest">
                                    <Phone className="w-4 h-4" /> Call
                                  </a>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); navigate(`/belljobs/${job.id}`); }}
                                  className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all active:scale-95 shadow-sm">
                                  View Details
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>

            {/* CTA for non-vendors */}
            {!isVendor && !isAdmin && (
              <div className="glass-strong rounded-3xl p-8 md:p-10 text-center space-y-4 border border-primary/10">
                <h2 className="text-2xl font-black text-foreground">Want to post a job?</h2>
                <p className="text-muted-foreground font-medium max-w-sm mx-auto">
                  Become a vendor on BellBasket to post jobs in your locality and reach people nearby.
                </p>
                <button onClick={() => navigate('/vendor/setup')}
                  className="inline-flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-sm">
                  <UserCheck className="w-4 h-4" /> Become a Vendor
                </button>
              </div>
            )}
      </div>
    </div>
  );
};

export default BellJobs;
