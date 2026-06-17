import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, IndianRupee, Briefcase, Building2, Send, Loader2, CheckCircle2, Phone, Mail } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import PageLoading from '../components/PageLoading';
import MapView from '../components/MapView';

interface BellJob {
  id: string;
  title: string;
  description: string;
  category: string;
  type?: string;
  salary: string;
  location: string;
  vendorId: string;
  vendorName: string;
  storeName?: string;
  status: string;
  lat?: number;
  lng?: number;
  createdAt: any;
}

const BellJobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: appLoading } = useApp();

  const [job, setJob] = useState<BellJob | null>(null);
  const [loading, setLoading] = useState(true);

  const [applyForm, setApplyForm] = useState({
    applicantName: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    experience: '',
    note: '',
  });
  const [submittingApp, setSubmittingApp] = useState(false);
  
  const [appliedJobs, setAppliedJobs] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('bell_applied_jobs') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    if (!id) return;
    const fetchJob = async () => {
      try {
        const d = await getDoc(doc(db, 'bell_jobs', id));
        if (d.exists()) {
          setJob({ id: d.id, ...d.data() } as BellJob);
        }
      } catch (err) {
        toast.error('Failed to load job details');
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in or create an account to apply');
      navigate('/auth');
      return;
    }
    if (!job) return;
    if (!applyForm.applicantName || !applyForm.phone) {
      toast.error('Name and Phone are required');
      return;
    }

    setSubmittingApp(true);
    try {
      await addDoc(collection(db, 'bell_job_applications'), {
        jobId: job.id,
        jobTitle: job.title,
        vendorId: job.vendorId,
        vendorName: job.vendorName,
        storeName: job.storeName || job.vendorName,
        jobLocation: job.location,
        jobSalary: job.salary || '',
        jobCategory: job.category || '',
        jobType: job.type || '',
        userId: user.id,
        ...applyForm,
        resumeUrl: '',
        status: 'pending',
        appliedAt: serverTimestamp(),
      });
      
      const newApplied = [...appliedJobs, job.id];
      setAppliedJobs(newApplied);
      localStorage.setItem('bell_applied_jobs', JSON.stringify(newApplied));
      toast.success('Application submitted successfully!');
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setSubmittingApp(false);
    }
  };

  if (appLoading || loading) return <PageLoading />;

  if (!job) {
    return (
      <div className="min-h-screen gradient-warm pt-24 pb-32 flex flex-col items-center justify-center text-center px-4">
        <Header />
        <Briefcase className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h1 className="text-3xl font-black text-foreground">Job Not Found</h1>
        <p className="text-muted-foreground mt-2 max-w-md">This job posting might have been removed or is no longer available.</p>
        <button onClick={() => navigate('/belljobs')} className="mt-6 px-6 py-3 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20">
          Browse Other Jobs
        </button>
      </div>
    );
  }

  const hasApplied = appliedJobs.includes(job.id);

  return (
    <div className="min-h-screen gradient-warm pb-32">
      <Helmet>
        <title>{job.title} | BellBasket Jobs</title>
        <meta name="description" content={`Apply for ${job.title} at ${job.storeName || job.vendorName} on BellBasket.`} />
      </Helmet>
      <Header />

      <div className="pt-24 px-4 max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Details */}
        <div className="lg:col-span-2 space-y-6">
          <button
            onClick={() => navigate('/belljobs')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-bold">Back to all jobs</span>
          </button>

          <div className="bg-white dark:bg-[#1a1a1a] p-6 md:p-8 rounded-[2rem] border border-border/50 shadow-xl space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">{job.category}</span>
                {job.type && <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-full">{job.type}</span>}
                {job.status === 'paused' && <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-full">Paused</span>}
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-foreground leading-tight">{job.title}</h1>
              
              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground font-bold mt-4">
                <span className="flex items-center gap-2 text-foreground"><Building2 className="w-4 h-4 text-primary" /> {job.storeName || job.vendorName}</span>
                <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {job.location}</span>
                {job.salary && <span className="flex items-center gap-2 text-emerald-600"><IndianRupee className="w-4 h-4" /> {job.salary}</span>}
              </div>
            </div>

            <div className="pt-6 border-t border-border/50 space-y-4">
              <h2 className="text-lg font-black text-foreground">Job Description</h2>
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{job.description || 'No detailed description provided.'}</p>
            </div>

            {job.lat && job.lng && (
              <div className="pt-6 border-t border-border/50 space-y-4">
                <h2 className="text-lg font-black text-foreground">Location</h2>
                <div className="h-64 rounded-2xl overflow-hidden border border-border/50 relative z-0">
                  <MapView 
                    stores={[{ id: job.id, name: job.title, lat: job.lat, lng: job.lng } as any]} 
                    center={[job.lat, job.lng]} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Apply */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-[#1a1a1a] p-6 md:p-8 rounded-[2rem] border border-border/50 shadow-xl sticky top-24">
            <h2 className="text-2xl font-black text-foreground mb-6">Apply Now</h2>
            
            {hasApplied ? (
              <div className="text-center py-8 space-y-4">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
                <h3 className="text-xl font-black text-foreground">Application Sent!</h3>
                <p className="text-sm text-muted-foreground font-medium">You have already applied for this position.</p>
                <button onClick={() => navigate('/belljobs/applied')} className="mt-4 px-6 py-3 w-full border-2 border-primary text-primary font-bold rounded-2xl">
                  View My Applications
                </button>
              </div>
            ) : job.status !== 'active' ? (
              <div className="text-center py-8">
                <p className="text-lg font-black text-amber-600">This job is no longer active.</p>
              </div>
            ) : (
              <form onSubmit={handleApply} className="space-y-4">
                {!user && (
                  <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl mb-4">
                    <p className="text-xs font-bold text-amber-600 mb-3">You must be logged in to apply for this job.</p>
                    <button type="button" onClick={() => navigate('/auth')} className="w-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-xl">
                      Login / Register
                    </button>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Full Name *</label>
                  <input type="text" value={applyForm.applicantName} onChange={e => setApplyForm({ ...applyForm, applicantName: e.target.value })} disabled={!user}
                    className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-3.5 px-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50" required />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Phone *</label>
                  <input type="tel" value={applyForm.phone} onChange={e => setApplyForm({ ...applyForm, phone: e.target.value })} disabled={!user}
                    className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-3.5 px-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50" required />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email</label>
                  <input type="email" value={applyForm.email} onChange={e => setApplyForm({ ...applyForm, email: e.target.value })} disabled={!user}
                    className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-3.5 px-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50" />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Experience</label>
                  <input type="text" placeholder="e.g., 2 years in retail" value={applyForm.experience} onChange={e => setApplyForm({ ...applyForm, experience: e.target.value })} disabled={!user}
                    className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-3.5 px-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50" />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Why should we hire you?</label>
                  <textarea rows={3} value={applyForm.note} onChange={e => setApplyForm({ ...applyForm, note: e.target.value })} disabled={!user}
                    className="w-full bg-secondary/50 border border-border/50 rounded-2xl py-3.5 px-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none disabled:opacity-50" />
                </div>
                
                <button type="submit" disabled={submittingApp || !user}
                  className="w-full bg-primary text-white py-4 mt-2 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2">
                  {submittingApp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submittingApp ? 'Submitting...' : 'Submit Application'}
                </button>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default BellJobDetail;
