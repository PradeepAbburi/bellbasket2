import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, Briefcase, MapPin, Clock, Globe, 
    CheckCircle2, Send, X, User, Mail, Phone, 
    GraduationCap, Briefcase as ExperienceIcon, Users, Calendar, Zap
} from 'lucide-react';
import { Helmet } from 'react-helmet';
import { db, storage } from '../lib/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import { useApp } from '../context/AppContext';

interface JobPost {
    id: string;
    title: string;
    type: string;
    location: string;
    workplace: string;
    category: string;
    status: 'active' | 'on_hold';
    description: string;
    requirements?: string;
    responsibilities?: string;
    vendorId?: string;
    vendorName?: string;
}

const JobDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useApp();
    const [job, setJob] = useState<JobPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasApplied, setHasApplied] = useState(false);
    const [applicationStatus, setApplicationStatus] = useState<string>('pending');

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'review':
            case 'reviewed':
                return { colorClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Under Review' };
            case 'interview':
            case 'contacted':
                return { colorClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Interviewing' };
            case 'hired':
                return { colorClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Hired' };
            case 'rejected':
                return { colorClass: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Not Selected' };
            case 'pending':
            default:
                return { colorClass: 'bg-secondary/40 text-muted-foreground border-border/30', label: 'Application Pending' };
        }
    };

    useEffect(() => {
        const checkApplicationStatus = async () => {
            if (!id || !user) return;
            try {
                const q = query(
                    collection(db, 'job_applications'),
                    where('jobId', '==', id),
                    where('userId', '==', user.id)
                );
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    setHasApplied(true);
                    const appData = querySnapshot.docs[0].data();
                    setApplicationStatus(appData.status || 'pending');
                }
            } catch (err) {
                console.error("Error checking application status:", err);
            }
        };

        const fetchJob = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, 'job_posts', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const jobData = { id: docSnap.id, ...docSnap.data() } as JobPost;
                    if (jobData.status === 'on_hold') {
                        toast.error('This role is currently on hold');
                        navigate('/careers');
                        return;
                    }
                    setJob(jobData);
                } else {
                    toast.error('Job not found');
                    navigate('/careers');
                }
            } catch (err) {
                console.error(err);
                toast.error('Error fetching job details');
            } finally {
                setLoading(false);
            }
        };

        fetchJob();
        checkApplicationStatus();
    }, [id, user, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen gradient-warm flex items-center justify-center">
                <Zap className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!job) return null;

    return (
        <div className="min-h-screen gradient-warm">
            <Helmet>
                <title>{job.title} | Careers - BellBasket</title>
            </Helmet>

            <div className="pt-8 pb-32 px-4 max-w-4xl mx-auto space-y-12">
                {/* Back Button */}
                <button
                    onClick={() => {
                        if (window.history.length > 1) {
                            navigate(-1);
                        } else {
                            navigate('/careers');
                        }
                    }}
                    className="flex items-center gap-2.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-border/50 text-foreground hover:bg-white dark:hover:bg-zinc-900 transition-all group shadow-md active:scale-95 self-start"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-primary" />
                    <span className="text-xs font-black uppercase tracking-wider">Back to Careers</span>
                </button>

                {/* Job Header */}
                <div className="glass p-8 md:p-12 rounded-[3rem] border border-white/40 space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl -z-10" />
                    
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-4 py-1.5 rounded-full">
                                {job.category}
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter leading-tight">
                            {job.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-6">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold">
                                <MapPin className="w-4 h-4 text-primary/60" />
                                {job.location}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold">
                                <Clock className="w-4 h-4 text-primary/60" />
                                {job.type}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold">
                                <Globe className="w-4 h-4 text-primary/60" />
                                {job.workplace}
                            </div>
                        </div>
                    </div>

                    {hasApplied ? (() => {
                        const style = getStatusStyle(applicationStatus);
                        return (
                            <button 
                                disabled
                                className={`w-full md:w-auto px-10 py-5 rounded-2xl text-sm font-black uppercase tracking-widest cursor-not-allowed flex items-center justify-center gap-2 ${style.colorClass}`}
                            >
                                <CheckCircle2 className="w-4 h-4" /> {style.label}
                            </button>
                        );
                    })() : (
                        <button 
                            onClick={() => navigate(`/careers/apply/${id}`)}
                            className="w-full md:w-auto bg-primary text-white px-10 py-5 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95"
                        >
                            Apply for this Role
                        </button>
                    )}
                </div>

                {/* Job Content */}
                <div className="grid gap-12 px-2">
                    <section className="space-y-4">
                        <h2 className="text-2xl font-black text-foreground tracking-tight">Job Summary</h2>
                        <div className="text-muted-foreground font-medium leading-relaxed whitespace-pre-wrap">
                            {job.description || "As part of our growing team, you will contribute to building the most efficient local commerce engine for Bharat. We are looking for individuals who can take ownership and drive impact from day one."}
                        </div>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <section className="glass p-8 rounded-[2rem] border border-white/30 space-y-4">
                            <h3 className="text-xl font-bold text-foreground">What you'll do</h3>
                            <ul className="space-y-3">
                                {[
                                    "Take end-to-end ownership of projects",
                                    "Collaborate with cross-functional teams",
                                    "Solve complex problems for millions of users",
                                    "Build scalable systems from scratch"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground font-medium">
                                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section className="glass p-8 rounded-[2rem] border border-white/30 space-y-4">
                            <h3 className="text-xl font-bold text-foreground">Requirements</h3>
                            <ul className="space-y-3">
                                {[
                                    "Proven track record in relevant field",
                                    "High agency and ownership mindset",
                                    "Excellent communication skills",
                                    "Willingness to learn and grow"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground font-medium">
                                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </section>
                    </div>
                </div>

                {/* Apply Flow Footer */}
                <div className="glass-strong rounded-[2.5rem] p-8 md:p-12 text-center space-y-6 border border-primary/10">
                    <h2 className="text-3xl font-black text-foreground">Ready to Build?</h2>
                    <p className="text-muted-foreground font-medium max-w-sm mx-auto">
                        Join a team that values speed, intensity, and deep ownership.
                    </p>
                    {hasApplied ? (() => {
                        const style = getStatusStyle(applicationStatus);
                        return (
                            <button 
                                disabled
                                className={`w-full md:w-auto px-10 py-5 rounded-2xl text-sm font-black uppercase tracking-widest cursor-not-allowed flex items-center justify-center gap-2 ${style.colorClass}`}
                            >
                                <CheckCircle2 className="w-4 h-4" /> {style.label}
                            </button>
                        );
                    })() : (
                        <button 
                            onClick={() => navigate(`/careers/apply/${id}`)}
                            className="bg-primary text-white px-10 py-5 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
                        >
                            Apply Now
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JobDetail;
