import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Briefcase, ArrowLeft, Plus, X, Users, MapPin, IndianRupee, Loader2, Clock, CheckCircle2, FileText, Calendar, Trash2, Phone, Mail, ChevronDown, Pencil } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, orderBy, updateDoc } from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import { toast } from 'sonner';
import Header from '../components/Header';
import PageLoading from '../components/PageLoading';
import MapView from '../components/MapView';

interface BellJob {
  id: string;
  title: string;
  category: string;
  location: string;
  salary: string;
  description: string;
  vendorId: string;
  vendorName: string;
  status: string;
  lat?: number;
  lng?: number;
  createdAt: any;
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
  vendorId: string;
  status: string;
  appliedAt?: any;
  createdAt?: any;
}

const VendorJobsDashboard = () => {
  const { user, loading } = useApp();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'jobs' | 'applications'>('jobs');
  const [jobs, setJobs] = useState<BellJob[]>([]);
  const [applications, setApplications] = useState<BellJobApplication[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'vendor') {
      navigate('/');
      return;
    }

    // Fetch Vendor Jobs
    const jobsQ = query(collection(db, 'bell_jobs'), where('vendorId', '==', user.id));
    const unsubJobs = onSnapshot(jobsQ, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as BellJob));
      setJobs(list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    });

    // Fetch Vendor Applications
    const appsQ = query(collection(db, 'bell_job_applications'), where('vendorId', '==', user.id));
    const unsubApps = onSnapshot(appsQ, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as BellJobApplication));
      setApplications(list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setFetching(false);
    });

    return () => {
      unsubJobs();
      unsubApps();
    };
  }, [user, loading, navigate]);

  const handleDeleteJob = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this job posting?')) return;
    try {
      await deleteDoc(doc(db, 'bell_jobs', id));
      toast.success('Job deleted successfully');
    } catch (err) {
      toast.error('Failed to delete job');
    }
  };

  const handleUpdateAppStatus = async (appId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'bell_job_applications', appId), { status });
      toast.success('Status updated successfully');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (loading || fetching) return <PageLoading />;

  return (
    <div className="min-h-screen gradient-warm pb-32">
      <Helmet>
        <title>Jobs Dashboard | Vendor</title>
      </Helmet>
      <Header />

      <div className="pt-24 px-4 max-w-5xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/vendor/dashboard')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-bold">Back to Dashboard</span>
            </button>
            <h1 className="text-3xl font-black text-foreground">Jobs & Hiring</h1>
            <p className="text-sm text-muted-foreground font-medium mt-1">Manage your store's job postings and applications</p>
          </div>
          <button
            onClick={() => navigate('/vendor/jobs/new')}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Post New Job
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-[2rem] border border-border/50 flex flex-col items-center justify-center text-center">
            <Briefcase className="w-8 h-8 text-primary mb-3" />
            <h3 className="text-3xl font-black text-foreground">{jobs.length}</h3>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Active Postings</p>
          </div>
          <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-[2rem] border border-border/50 flex flex-col items-center justify-center text-center">
            <Users className="w-8 h-8 text-blue-500 mb-3" />
            <h3 className="text-3xl font-black text-foreground">{applications.length}</h3>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Applications</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-secondary/50 rounded-2xl border border-border/50 w-full md:w-fit">
          <button
            onClick={() => setActiveTab('jobs')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'jobs' ? 'bg-white dark:bg-[#2a2a2a] text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            My Jobs
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'applications' ? 'bg-white dark:bg-[#2a2a2a] text-blue-500 shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Applications
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'jobs' ? (
            <motion.div
              key="jobs"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="grid gap-4 md:grid-cols-2"
            >
              {jobs.length === 0 ? (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-border/50 rounded-[2rem]">
                  <Briefcase className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-lg font-black text-foreground">No active jobs</p>
                  <p className="text-sm text-muted-foreground font-medium mt-1">Post a job to find local talent.</p>
                </div>
              ) : (
                jobs.map(job => (
                  <div key={job.id} className="bg-white dark:bg-[#1a1a1a] p-6 rounded-[2rem] border border-border/50 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">{job.category}</span>
                        <h3 className="text-xl font-black text-foreground mt-3">{job.title}</h3>
                      </div>
                      <button onClick={() => navigate(`/vendor/jobs/edit/${job.id}`)} className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteJob(job.id)} className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-muted-foreground flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> {job.location}</p>
                      {job.salary && <p className="text-xs font-bold text-emerald-600 flex items-center gap-2"><IndianRupee className="w-3.5 h-3.5" /> {job.salary}</p>}
                      <p className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" /> 
                        Posted {job.createdAt?.seconds ? new Date(job.createdAt.seconds * 1000).toLocaleDateString() : 'Recently'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="applications"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {applications.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-border/50 rounded-[2rem]">
                  <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-lg font-black text-foreground">No applications yet</p>
                  <p className="text-sm text-muted-foreground font-medium mt-1">When candidates apply, they will appear here.</p>
                </div>
              ) : (
                applications.map(app => (
                  <div key={app.id} className="bg-white dark:bg-[#1a1a1a] p-6 rounded-[2rem] border border-border/50 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                    <div className="space-y-3 flex-1">
                      <div>
                        <h3 className="text-lg font-black text-foreground">{app.applicantName}</h3>
                        <p className="text-xs font-bold text-primary flex items-center gap-1.5 mt-1">Applied for: {app.jobTitle}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 pt-2 border-t border-border/50">
                        <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-foreground" /> {app.phone}</p>
                        {app.email && <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-foreground" /> {app.email}</p>}
                        {app.experience && <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-foreground" /> {app.experience}</p>}
                      </div>

                      {app.note && (
                        <div className="bg-secondary/30 p-4 rounded-2xl mt-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Candidate Note</p>
                          <p className="text-sm font-medium italic text-foreground/80">{app.note}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="shrink-0 flex flex-col md:items-end gap-2">
                      <select
                        value={app.status || 'pending'}
                        onChange={(e) => handleUpdateAppStatus(app.id, e.target.value)}
                        className={`text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-xl border focus:outline-none transition-all cursor-pointer ${
                          app.status === 'reviewed' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                          app.status === 'contacted' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                          app.status === 'hired' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                          app.status === 'rejected' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                          'bg-secondary text-muted-foreground border-border/50'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="reviewed">Under Review</option>
                        <option value="contacted">Contacted</option>
                        <option value="hired">Hired</option>
                        <option value="rejected">Not Selected</option>
                      </select>
                      <p className="text-[10px] text-muted-foreground font-bold mt-1 text-right">
                        {app.appliedAt?.seconds ? new Date(app.appliedAt.seconds * 1000).toLocaleDateString() : 'Recently'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VendorJobsDashboard;
