import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Briefcase, MapPin, IndianRupee, Phone, Calendar, Clock, ArrowLeft, Building2 } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import PageLoading from '../components/PageLoading';

const CustomerAppliedJobs = () => {
  const { user, loading } = useApp();
  const navigate = useNavigate();

  const [applications, setApplications] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/auth');
      return;
    }

    const q = query(collection(db, 'bell_job_applications'), where('userId', '==', user.id));
    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setApplications(list.sort((a, b) => (b.appliedAt?.seconds || 0) - (a.appliedAt?.seconds || 0)));
      setFetching(false);
    }, (error) => {
      console.error('Applied jobs listener error:', error);
      setFetching(false);
    });

    return () => unsub();
  }, [user, loading, navigate]);

  if (loading || fetching) return <PageLoading />;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reviewed': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'contacted': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'hired': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'pending':
      default: return 'bg-secondary text-muted-foreground border-border';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'reviewed': return 'Under Review';
      case 'contacted': return 'Contacted';
      case 'hired': return 'Hired';
      case 'rejected': return 'Not Selected';
      case 'pending':
      default: return 'Application Pending';
    }
  };

  return (
    <div className="min-h-screen gradient-warm pb-32">
      <Helmet>
        <title>My Applied Jobs | BellBasket</title>
      </Helmet>
      <Header />

      <div className="pt-24 px-4 max-w-4xl mx-auto space-y-8">
        <div>
          <button
            onClick={() => navigate('/belljobs')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-bold">Back to Jobs</span>
          </button>
          <h1 className="text-3xl font-black text-foreground">My Applied Jobs</h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">Track the status of your job applications</p>
        </div>

        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {applications.length === 0 ? (
              <div className="py-16 text-center bg-white dark:bg-[#1a1a1a] rounded-[2rem] border border-border/50 shadow-xl">
                <Briefcase className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-xl font-black text-foreground">No applications yet</h3>
                <p className="text-sm text-muted-foreground font-medium mt-1">You haven't applied to any jobs yet.</p>
                <button onClick={() => navigate('/belljobs')} className="mt-6 px-6 py-3 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                  Browse Jobs
                </button>
              </div>
            ) : (
              applications.map((app, i) => (
                <motion.div key={app.id} layout
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white dark:bg-[#1a1a1a] p-6 rounded-[2rem] border border-border/50 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer hover:border-primary/30 transition-all"
                  onClick={() => navigate(`/belljobs/${app.jobId}`)}
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex items-start justify-between md:justify-start gap-4">
                      <h3 className="text-xl font-black text-foreground group-hover:text-primary transition-colors">{app.jobTitle}</h3>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${getStatusColor(app.status || 'pending')}`}>
                        {getStatusLabel(app.status || 'pending')}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-muted-foreground pt-2">
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-primary/60" /> Applied: {app.appliedAt?.seconds ? new Date(app.appliedAt.seconds * 1000).toLocaleDateString() : 'Recently'}</span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default CustomerAppliedJobs;
