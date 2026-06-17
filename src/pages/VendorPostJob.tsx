import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2, Search, Pencil } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import { toast } from 'sonner';
import Header from '../components/Header';
import PageLoading from '../components/PageLoading';
import MapView from '../components/MapView';

const VendorPostJob = () => {
  const { user, loading } = useApp();
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id?: string }>();
  const isEditing = !!editId;

  const [posting, setPosting] = useState(false);
  const [fetchingJob, setFetchingJob] = useState(!!editId);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const [newJob, setNewJob] = useState({
    title: '',
    category: '',
    location: '',
    salary: '',
    description: '',
    lat: 17.3850,
    lng: 78.4867,
  });

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'vendor') {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Fetch existing job for edit mode
  useEffect(() => {
    if (!editId || loading) return;
    const fetchJob = async () => {
      try {
        const snap = await getDoc(doc(db, 'bell_jobs', editId));
        if (snap.exists()) {
          const data = snap.data();
          setNewJob({
            title: data.title || '',
            category: data.category || '',
            location: data.location || '',
            salary: data.salary || '',
            description: data.description || '',
            lat: data.lat || 17.3850,
            lng: data.lng || 78.4867,
          });
        } else {
          toast.error('Job not found');
          navigate('/vendor/jobs');
        }
      } catch (err) {
        toast.error('Failed to load job');
      } finally {
        setFetchingJob(false);
      }
    };
    fetchJob();
  }, [editId, loading, navigate]);

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!user.plan || user.plan === 'none') {
      toast.error('An active subscription is required to post jobs.');
      return;
    }
    if (!newJob.lat || !newJob.lng) {
      toast.error('Please pinpoint the exact location on the map.');
      return;
    }

    setPosting(true);
    try {
      if (isEditing && editId) {
        await updateDoc(doc(db, 'bell_jobs', editId), {
          ...newJob,
        });
        toast.success('Job updated successfully!');
      } else {
        await addDoc(collection(db, 'bell_jobs'), {
          ...newJob,
          vendorId: user.id,
          vendorName: user.name || 'Local Store',
          status: 'active',
          createdAt: serverTimestamp()
        });
        toast.success('Job posted successfully!');
      }
      navigate('/vendor/jobs');
    } catch (err: any) {
      toast.error(isEditing ? 'Failed to update job.' : 'Failed to post job.');
    } finally {
      setPosting(false);
    }
  };

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setNewJob(prev => ({
          ...prev,
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        }));
        toast.success('Location found!');
      } else {
        toast.error('Location not found.');
      }
    } catch (err) {
      toast.error('Failed to search location.');
    } finally {
      setSearching(false);
    }
  };

  if (loading || fetchingJob) return <PageLoading />;

  return (
    <div className="min-h-screen gradient-warm pb-32">
      <Helmet>
        <title>Post Job | Vendor</title>
      </Helmet>
      <Header />

      <div className="pt-24 px-4 max-w-3xl mx-auto space-y-8">
        <div>
          <button
            onClick={() => navigate('/vendor/jobs')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-bold">Back to Jobs Dashboard</span>
          </button>
          <h1 className="text-3xl font-black text-foreground">{isEditing ? 'Edit Job' : 'Post a New Job'}</h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">{isEditing ? 'Update the details below.' : 'Fill out the details below to publish your job listing.'}</p>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] p-6 md:p-8 rounded-[2rem] border border-border/50 shadow-2xl">
          <form onSubmit={handlePostJob} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Job Title *</label>
              <input type="text" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} placeholder="e.g., Cashier, Store Helper"
                className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" required />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category *</label>
                <input type="text" value={newJob.category} onChange={e => setNewJob({...newJob, category: e.target.value})} placeholder="e.g., Retail, Delivery"
                  className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Salary (Optional)</label>
                <input type="text" value={newJob.salary} onChange={e => setNewJob({...newJob, salary: e.target.value})} placeholder="e.g., ₹10,000/mo"
                  className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Location Name *</label>
              <input type="text" value={newJob.location} onChange={e => setNewJob({...newJob, location: e.target.value})} placeholder="e.g., Kukatpally, Hyderabad"
                className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex justify-between">
                <span>Pin Exact Location *</span>
                <button type="button" onClick={() => {
                  if (navigator.geolocation) {
                    toast.loading('Detecting location...', { id: 'loc' });
                    navigator.geolocation.getCurrentPosition(pos => {
                      setNewJob(prev => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude }));
                      toast.success('Location updated', { id: 'loc' });
                    }, () => {
                      toast.error('Location access denied', { id: 'loc' });
                    });
                  }
                }} className="text-primary hover:underline lowercase font-bold">detect my location</button>
              </label>

              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  placeholder="Search a city or area..."
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearchLocation())}
                  className="flex-1 bg-secondary/50 border border-border/50 rounded-xl py-2 px-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                />
                <button type="button" onClick={handleSearchLocation} disabled={searching} className="bg-primary text-white px-4 py-2 rounded-xl flex items-center justify-center disabled:opacity-50">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>

              <div className="h-64 rounded-2xl overflow-hidden border border-border/50 relative z-0">
                <MapView 
                  stores={[{ id: 'pin', name: 'Job Location', lat: newJob.lat, lng: newJob.lng } as any]} 
                  center={[newJob.lat, newJob.lng]} 
                  onMapClick={(lat, lng) => setNewJob(prev => ({ ...prev, lat, lng }))}
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-center pt-1 italic">Click on the map to place the job pin precisely.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Requirements & Details</label>
              <textarea rows={5} value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})} placeholder="What are you looking for?"
                className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none resize-none" />
            </div>

            <button type="submit" disabled={posting}
              className="w-full py-4 mt-2 rounded-2xl bg-primary text-white text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all">
              {posting ? <Loader2 className="w-5 h-5 animate-spin" /> : isEditing ? <Pencil className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              {posting ? (isEditing ? 'Updating...' : 'Publishing...') : (isEditing ? 'Update Job' : 'Publish Job')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VendorPostJob;
