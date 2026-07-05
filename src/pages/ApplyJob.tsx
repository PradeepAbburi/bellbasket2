import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    ArrowLeft, User, Mail, Phone, Users, 
    GraduationCap, Briefcase as ExperienceIcon, 
    Globe, Send, Zap, X, MapPin, Clock, CheckCircle2
} from 'lucide-react';
import { Helmet } from 'react-helmet';
import { db, storage } from '../lib/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
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
    vendorId?: string;
    vendorName?: string;
}

const ApplyJob = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, loading: userLoading } = useApp();
    const [job, setJob] = useState<JobPost | null>(null);
    const [loading, setLoading] = useState(true);
    const [checkingApplication, setCheckingApplication] = useState(true);
    const [hasApplied, setHasApplied] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        gender: '',
        highestQualification: '',
        branch: '',
        eduStartYear: '',
        eduPassYear: '',
        expRole: '',
        expCompany: '',
        expStartYear: '',
        expEndYear: '',
        totalExperience: '',
        portfolioLink: '',
        note: ''
    });

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                fullName: prev.fullName || user.name || '',
                email: prev.email || user.email || '',
                phone: prev.phone || user.phone || ''
            }));
        }
    }, [user]);

    useEffect(() => {
        const checkApplicationStatus = async () => {
            if (!id || !user) {
                setCheckingApplication(false);
                return;
            }
            try {
                const q = query(
                    collection(db, 'job_applications'),
                    where('jobId', '==', id),
                    where('userId', '==', user.id)
                );
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    setHasApplied(true);
                }
            } catch (err) {
                console.error("Error checking application status:", err);
            } finally {
                setCheckingApplication(false);
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
                toast.error('Error fetching job details');
            } finally {
                setLoading(false);
            }
        };

        fetchJob();
        checkApplicationStatus();
    }, [id, user, navigate]);

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!job) return;
        
        setSubmitting(true);
        try {
            let resumeData = '';

            if (resumeFile) {
                // Check file size (Firestore limit is 1MB per document, Base64 adds ~33% overhead)
                if (resumeFile.size > 500 * 1024) {
                    toast.error('File too large (Max 500KB). Please use a Google Drive link or compress the PDF.');
                    setSubmitting(false);
                    return;
                }

                setUploadProgress(20);
                resumeData = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        setUploadProgress(100);
                        resolve(reader.result as string);
                    };
                    reader.readAsDataURL(resumeFile);
                });
            }

            await addDoc(collection(db, 'job_applications'), {
                jobId: job.id,
                jobTitle: job.title,
                vendorId: job.vendorId || null,
                userId: user?.id || null,
                ...formData,
                resumeUrl: resumeData || formData.portfolioLink,
                appliedAt: serverTimestamp(),
                status: 'pending'
            });

            toast.success('Application submitted successfully!');
            setHasApplied(true);
            navigate('/careers');
        } catch (err: any) {
            toast.error(err.message || 'Failed to submit application');
        } finally {
            setSubmitting(false);
            setUploadProgress(0);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen gradient-warm flex items-center justify-center">
                <Zap className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!job) return null;

    return (
        <div className="min-h-screen gradient-warm pb-32">
            <Helmet>
                <title>Apply for {job.title} | Careers - BellBasket</title>
            </Helmet>

            <div className="pt-8 px-4 max-w-3xl mx-auto space-y-8">
                {/* Back Link */}
                <button
                    onClick={() => navigate(`/careers/job/${id}`)}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-bold">Back to Job Details</span>
                </button>

                {/* Info Card */}
                <div className="glass p-8 rounded-[2.5rem] border border-white/40 space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
                            {job.category}
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tighter">
                        Application for {job.title}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 opacity-70">
                        <div className="flex items-center gap-2 text-xs font-bold">
                            <MapPin className="w-3.5 h-3.5" /> {job.location}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold">
                            <Clock className="w-3.5 h-3.5" /> {job.type}
                        </div>
                    </div>
                </div>

                {/* Main Form */}
                {hasApplied ? (
                    <div className="glass p-12 text-center rounded-[3rem] border border-white/40 space-y-6">
                        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-black text-foreground">Application Already Submitted</h2>
                        <p className="text-muted-foreground text-sm font-medium max-w-md mx-auto">
                            You have already applied for this role. The hiring team is currently reviewing your profile.
                        </p>
                        <button
                            onClick={() => navigate('/careers')}
                            className="bg-primary text-white px-8 py-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20"
                        >
                            Explore Other Careers
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleApply} className="space-y-8">
                    {/* Personal Info */}
                    <div className="glass p-8 md:p-10 rounded-[3rem] border border-white/40 space-y-8">
                        <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
                            <User className="w-5 h-5 text-primary" /> Personal Information
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                                <input 
                                    type="text" 
                                    placeholder="Enter your full name"
                                    value={formData.fullName}
                                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                                    className="w-full bg-secondary/50 border border-border rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email ID</label>
                                <input 
                                    type="email" 
                                    placeholder="email@example.com"
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                    className="w-full bg-secondary/50 border border-border rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Phone Number</label>
                                <input 
                                    type="tel" 
                                    placeholder="+91 00000 00000"
                                    value={formData.phone}
                                    onChange={e => setFormData({...formData, phone: e.target.value})}
                                    className="w-full bg-secondary/50 border border-border rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Gender</label>
                                <select 
                                    value={formData.gender}
                                    onChange={e => setFormData({...formData, gender: e.target.value})}
                                    className="w-full bg-secondary/50 border border-border rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none pointer-cursor"
                                    required
                                >
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Education */}
                    <div className="glass p-8 md:p-10 rounded-[3rem] border border-white/40 space-y-8">
                        <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
                            <GraduationCap className="w-5 h-5 text-primary" /> Educational Background
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Highest Qualification</label>
                                <select 
                                    value={formData.highestQualification}
                                    onChange={e => setFormData({...formData, highestQualification: e.target.value})}
                                    className="w-full bg-secondary/50 border border-border rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none pointer-cursor"
                                    required
                                >
                                    <option value="">Select Qualification</option>
                                    <option value="Intermediate">Intermediate</option>
                                    <option value="Degree">Degree</option>
                                    <option value="Bachelors">Bachelors</option>
                                    <option value="Masters">Masters</option>
                                    <option value="PhD">PhD</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Branch / Field</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Computer Science"
                                    value={formData.branch}
                                    onChange={e => setFormData({...formData, branch: e.target.value})}
                                    className="w-full bg-secondary/50 border border-border rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Start Year</label>
                                <input 
                                    type="number" 
                                    placeholder="YYYY"
                                    value={formData.eduStartYear}
                                    onChange={e => setFormData({...formData, eduStartYear: e.target.value})}
                                    className="w-full bg-secondary/50 border border-border rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Passing Year</label>
                                <input 
                                    type="number" 
                                    placeholder="YYYY"
                                    value={formData.eduPassYear}
                                    onChange={e => setFormData({...formData, eduPassYear: e.target.value})}
                                    className="w-full bg-secondary/50 border border-border rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Experience */}
                    <div className="glass p-8 md:p-10 rounded-[3rem] border border-white/40 space-y-8">
                        <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
                            <ExperienceIcon className="w-5 h-5 text-primary" /> Professional Experience
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Most Recent Role</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Frontend Developer"
                                    value={formData.expRole}
                                    onChange={e => setFormData({...formData, expRole: e.target.value})}
                                    className="w-full bg-secondary/50 border border-border rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Company Name</label>
                                <input 
                                    type="text" 
                                    placeholder="Enter company name"
                                    value={formData.expCompany}
                                    onChange={e => setFormData({...formData, expCompany: e.target.value})}
                                    className="w-full bg-secondary/50 border border-border rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Start Year</label>
                                <input 
                                    type="number" 
                                    placeholder="YYYY"
                                    value={formData.expStartYear}
                                    onChange={e => setFormData({...formData, expStartYear: e.target.value})}
                                    className="w-full bg-secondary/50 border border-border rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Total Years of Experience</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. 3.5 Years"
                                    value={formData.totalExperience}
                                    onChange={e => setFormData({...formData, totalExperience: e.target.value})}
                                    className="w-full bg-secondary/50 border border-border rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">End Year</label>
                                <input 
                                    type="text" 
                                    placeholder="YYYY or Present"
                                    value={formData.expEndYear}
                                    onChange={e => setFormData({...formData, expEndYear: e.target.value})}
                                    className="w-full bg-secondary/50 border border-border rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Resume & Portfolio */}
                    <div className="glass p-8 md:p-10 rounded-[3rem] border border-white/40 space-y-8">
                        <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
                            <Globe className="w-5 h-5 text-primary" /> Assets & Links
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Upload Resume (PDF)</label>
                                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-[2rem] py-12 px-4 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group">
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept=".pdf,.doc,.docx"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                if (file.size > 5 * 1024 * 1024) {
                                                    toast.error("File size must be under 5MB");
                                                    return;
                                                }
                                                setResumeFile(file);
                                            }
                                        }}
                                    />
                                    <Send className="w-8 h-8 text-primary/40 mb-3 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground text-center line-clamp-1">
                                        {resumeFile ? resumeFile.name : 'Choose File'}
                                    </span>
                                </label>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Portfolio or Link (Optional)</label>
                                    <input 
                                        type="url" 
                                        placeholder="https://yourportfolio.com"
                                        value={formData.portfolioLink}
                                        onChange={e => setFormData({...formData, portfolioLink: e.target.value})}
                                        className="w-full bg-secondary/50 border border-border rounded-2xl py-4 px-6 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10">
                                    <p className="text-[10px] text-primary font-black uppercase leading-relaxed">
                                        Providing a link directly is helpful if your resume file is large.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Final Note */}
                    <div className="glass p-8 md:p-10 rounded-[3rem] border border-white/40 space-y-6">
                        <h2 className="text-xl font-black tracking-tight">Short note to hiring team</h2>
                        <textarea 
                            rows={4} 
                            placeholder="Tell us what makes you the right fit for BellBasket's mission..."
                            value={formData.note}
                            onChange={e => setFormData({...formData, note: e.target.value})}
                            className="w-full bg-secondary/50 border border-border rounded-3xl py-6 px-8 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none shadow-inner"
                            required
                        />
                    </div>

                    {/* Submit Section */}
                    <div className="pt-4 flex flex-col md:flex-row items-center gap-6">
                        <button 
                            type="submit"
                            disabled={submitting}
                            className="w-full md:w-auto bg-primary text-white px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {submitting ? (
                                <>
                                    <Zap className="w-4 h-4 animate-spin" />
                                    {uploadProgress > 0 ? `Uploading Resume: ${uploadProgress}%` : 'Submitting...'}
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Send Application Now
                                </>
                            )}
                        </button>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Application will be reviewed by HR
                        </p>
                    </div>
                </form>
                )}
            </div>
        </div>
    );
};

export default ApplyJob;
