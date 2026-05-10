import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    UserCircle, Mail, Phone, MapPin, Landmark, Key, Shield, 
    Briefcase, GraduationCap, History, FileText, 
    Link as LinkIcon, Save, Loader2, ArrowLeft,
    Edit3, Trash2, Camera, BadgeCheck, Zap, X,
    DollarSign, Activity, FileCheck, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Staff } from '@/types';
import { toast } from 'sonner';
import PageLoading from '@/components/PageLoading';

const EditableField = ({ label, icon: Icon, value, onChange, type = "text", placeholder, isDropdown = false, options = [], disabled = false }: any) => (
    <div className="space-y-3 group">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-focus-within:text-primary transition-colors">{label}</p>
        <div className="relative">
            {Icon && <Icon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />}
            {isDropdown ? (
                <select
                    disabled={disabled}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={`w-full bg-white/70 border border-white/60 rounded-[1.5rem] py-5 ${Icon ? 'pl-14' : 'px-8'} pr-8 text-sm font-black focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all appearance-none cursor-pointer disabled:opacity-70 disabled:bg-slate-50/50 shadow-sm`}
                >
                    {options.map((opt: any) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            ) : (
                <input 
                    disabled={disabled}
                    type={type}
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`w-full bg-white/70 border border-white/60 rounded-[1.5rem] py-5 ${Icon ? 'pl-14' : 'px-8'} pr-8 text-sm font-black focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all disabled:opacity-70 disabled:bg-slate-50/50 shadow-sm`}
                />
            )}
        </div>
    </div>
);

const StaffProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [staff, setStaff] = useState<Staff | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editForm, setEditForm] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'identity' | 'financial' | 'education' | 'experience' | 'history'>('identity');

    const formatJoinDate = (date: any) => {
        if (!date) return '';
        if (typeof date === 'string') return date.split('T')[0];
        if (date.toDate) {
            try {
                return date.toDate().toISOString().split('T')[0];
            } catch (e) {
                return '';
            }
        }
        if (date.seconds) {
            try {
                return new Date(date.seconds * 1000).toISOString().split('T')[0];
            } catch (e) {
                return '';
            }
        }
        return '';
    };

    useEffect(() => {
        const fetchStaff = async () => {
            if (!id) return;
            try {
                const docSnap = await getDoc(doc(db, "referrals", id));
                if (docSnap.exists()) {
                    const data = { id: docSnap.id, ...docSnap.data() } as Staff;
                    setStaff(data);
                    setEditForm(data);
                } else {
                    toast.error("Staff member not found");
                    navigate('/hr/staff');
                }
            } catch (e) {
                toast.error("Failed to load staff profile");
            } finally {
                setLoading(false);
            }
        };
        fetchStaff();
    }, [id, navigate]);

    const handleSaveEdits = async () => {
        if (!id || !editForm) return;
        setIsSaving(true);
        try {
            const { id: _, ...updateData } = editForm;
            await updateDoc(doc(db, "referrals", id), updateData);
            toast.success("Profile updated successfully");
            setStaff(editForm);
            setIsEditMode(false);
        } catch (e) {
            toast.error("Failed to update profile");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!id || !window.confirm("Delete this staff member permanently?")) return;
        try {
            await deleteDoc(doc(db, "referrals", id));
            toast.success("Profile deleted");
            navigate('/hr/staff');
        } catch (e) {
            toast.error("Deletion failed");
        }
    };

    if (loading) return <PageLoading />;

    const tabs = [
        { id: 'identity', label: 'Primary Identity', icon: UserCircle },
        { id: 'financial', label: 'Pay Ledger', icon: Landmark },
        { id: 'education', label: 'Education', icon: GraduationCap },
        { id: 'experience', label: 'Experience', icon: History },
        { id: 'history', label: 'Live Performance', icon: Activity }
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-10 pb-24 px-4">
            {/* Header Controls */}
            <header className="flex flex-col sm:flex-row items-center justify-between bg-white/40 p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] border border-white/60 shadow-xl backdrop-blur-md gap-4">
                <button onClick={() => navigate('/hr/staff')} className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Go Back
                </button>
                <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
                    {!isEditMode ? (
                        <button onClick={() => setIsEditMode(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white border border-slate-200 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm whitespace-nowrap">
                            <Edit3 className="w-4 h-4" /> Edit Profile
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button onClick={() => setIsEditMode(false)} className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-white border border-slate-200 text-xs font-black uppercase tracking-widest whitespace-nowrap">
                                Cancel
                            </button>
                            <button onClick={handleSaveEdits} disabled={isSaving} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl gradient-primary text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 whitespace-nowrap">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save
                            </button>
                        </div>
                    )}
                    <button onClick={handleDelete} className="p-3 rounded-2xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Profile Hero - Responsively Unified Design */}
            <section className="relative glass-strong rounded-[3rem] md:rounded-[4rem] p-4 md:p-6 overflow-hidden border border-white/60 shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full -mr-48 -mt-48 blur-3xl" />
                
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8">
                    {/* Compact Image Container */}
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl p-1 bg-white/80 shadow-xl relative group shrink-0">
                        <div className="w-full h-full rounded-2xl bg-secondary overflow-hidden border-2 border-white">
                            {staff?.image ? (
                                <img src={staff.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-primary/5">
                                    <UserCircle className="w-20 h-20 text-primary/20" />
                                </div>
                            )}
                        </div>
                        {isEditMode && (
                            <button className="absolute -bottom-2 -right-2 p-3 rounded-xl bg-primary text-white shadow-xl hover:scale-110 transition-all z-20">
                                <Camera className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    
                    {/* Unified Identity Panel */}
                    <div className="flex-1 text-center md:text-left space-y-3 bg-white/20 p-6 rounded-[2rem] border border-white/40 shadow-sm backdrop-blur-sm">
                        <div className="space-y-0.5">
                            <h1 className="text-2xl md:text-4xl font-black text-foreground tracking-tight leading-none">{staff?.agentName}</h1>
                            <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                                <span className="bg-primary text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shadow-sm">
                                    ID: {staff?.referralId}
                                </span>
                                <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${staff?.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                    {staff?.isActive ? 'ACTIVE NODE' : 'INACTIVE'}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                <Briefcase className="w-3.5 h-3.5 text-primary" />
                                {staff?.department || 'Operations'}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                <MapPin className="w-3.5 h-3.5 text-primary" />
                                {staff?.officeLocation || 'Main Office'}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tab Navigation - Separate Pages for Each Section */}
            <div className="flex items-center gap-2 bg-white/40 p-2 rounded-[2rem] border border-white shadow-sm overflow-x-auto custom-scrollbar no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-3 px-8 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-white/60'}`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                >
                    {activeTab === 'identity' && (
                        <div className="glass-strong rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-12 border border-white/60 shadow-xl space-y-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <Briefcase className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Personnel Identity</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <EditableField 
                                    label="Full Name" 
                                    icon={UserCircle} 
                                    value={editForm?.agentName} 
                                    disabled={!isEditMode}
                                    onChange={(val: string) => setEditForm({...editForm, agentName: val})}
                                />
                                <EditableField 
                                    label="Contact Email" 
                                    icon={Mail} 
                                    value={editForm?.email} 
                                    disabled={!isEditMode}
                                    onChange={(val: string) => setEditForm({...editForm, email: val})}
                                />
                                <EditableField 
                                    label="Phone Number" 
                                    icon={Phone} 
                                    value={editForm?.phone} 
                                    disabled={!isEditMode}
                                    onChange={(val: string) => setEditForm({...editForm, phone: val})}
                                />
                                <EditableField 
                                    label="Residential Address" 
                                    icon={MapPin} 
                                    value={editForm?.address} 
                                    disabled={!isEditMode}
                                    onChange={(val: string) => setEditForm({...editForm, address: val})}
                                />
                                <EditableField 
                                    label="Aadhar Number" 
                                    icon={Shield} 
                                    value={editForm?.aadharNumber} 
                                    disabled={!isEditMode}
                                    onChange={(val: string) => setEditForm({...editForm, aadharNumber: val})}
                                />
                                <EditableField 
                                    label="Office Location" 
                                    icon={MapPin} 
                                    value={editForm?.officeLocation} 
                                    disabled={!isEditMode}
                                    onChange={(val: string) => setEditForm({...editForm, officeLocation: val})}
                                />
                                <EditableField 
                                    label="Department" 
                                    icon={Briefcase} 
                                    value={editForm?.department} 
                                    isDropdown 
                                    options={["Sales", "Marketing", "HR", "Operations", "Tech", "CXO Level"]}
                                    disabled={!isEditMode}
                                    onChange={(val: string) => setEditForm({...editForm, department: val})}
                                />
                                <EditableField 
                                    label="Commission %" 
                                    icon={DollarSign} 
                                    type="number"
                                    value={editForm?.commissionRate} 
                                    disabled={!isEditMode}
                                    onChange={(val: string) => setEditForm({...editForm, commissionRate: val})}
                                />
                                <EditableField 
                                    label="Date of Joining" 
                                    icon={History} 
                                    type="date"
                                    value={formatJoinDate(editForm?.createdAt)} 
                                    disabled={true}
                                    onChange={() => {}}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'financial' && (
                        <div className="glass-strong rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-12 border border-white/60 shadow-xl space-y-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                                    <Landmark className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Financial Ledger</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <EditableField 
                                    label="Account Holder" 
                                    icon={UserCircle} 
                                    value={editForm?.accountName} 
                                    disabled={!isEditMode}
                                    onChange={(val: string) => setEditForm({...editForm, accountName: val})}
                                />
                                <EditableField 
                                    label="Bank Name" 
                                    icon={Landmark} 
                                    value={editForm?.bankName} 
                                    disabled={!isEditMode}
                                    onChange={(val: string) => setEditForm({...editForm, bankName: val})}
                                />
                                <EditableField 
                                    label="Account Number" 
                                    icon={FileText} 
                                    value={editForm?.accountNumber} 
                                    disabled={!isEditMode}
                                    onChange={(val: string) => setEditForm({...editForm, accountNumber: val})}
                                />
                                <EditableField 
                                    label="IFSC Code" 
                                    icon={Key} 
                                    value={editForm?.ifscCode} 
                                    disabled={!isEditMode}
                                    onChange={(val: string) => setEditForm({...editForm, ifscCode: val})}
                                />
                                <div className="md:col-span-2 lg:col-span-1 p-8 rounded-[2rem] bg-indigo-50 border border-indigo-100 flex flex-col justify-center text-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Lifetime Settlements</p>
                                    <p className="text-3xl font-black text-indigo-900">\u20B9{staff?.totalEarnings || 0}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'education' && (
                        <div className="glass-strong rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-12 border border-white/60 shadow-xl space-y-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                                    <GraduationCap className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Academic History</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <EditableField 
                                    label="Highest Qualification" 
                                    icon={GraduationCap} 
                                    value={editForm?.qualification} 
                                    disabled={!isEditMode}
                                    onChange={(val: string) => setEditForm({...editForm, qualification: val})}
                                    placeholder="e.g. MBA in Marketing"
                                />
                                <EditableField 
                                    label="Institution Name" 
                                    icon={Landmark} 
                                    value={editForm?.institution} 
                                    disabled={!isEditMode}
                                    onChange={(val: string) => setEditForm({...editForm, institution: val})}
                                    placeholder="University Name"
                                />
                                <EditableField 
                                    label="Graduation Year" 
                                    icon={Calendar} 
                                    value={editForm?.gradYear} 
                                    disabled={!isEditMode}
                                    onChange={(val: string) => setEditForm({...editForm, gradYear: val})}
                                    type="number"
                                />
                                <div className="p-8 rounded-[2rem] bg-purple-50 border border-purple-100 italic text-xs text-purple-600 font-bold">
                                    Educational documents have been uploaded and verified by HR core.
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'experience' && (
                        <div className="glass-strong rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-12 border border-white/60 shadow-xl space-y-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                                    <History className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Professional Timeline</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <EditableField 
                                    label="Previous Organization" 
                                    icon={Briefcase} 
                                    value={editForm?.prevOrg} 
                                    disabled={!isEditMode}
                                    onChange={(val: string) => setEditForm({...editForm, prevOrg: val})}
                                />
                                <EditableField 
                                    label="Years of Experience" 
                                    icon={Zap} 
                                    value={editForm?.yearsExp} 
                                    disabled={!isEditMode}
                                    onChange={(val: string) => setEditForm({...editForm, yearsExp: val})}
                                    type="number"
                                />
                                <div className="md:col-span-2">
                                    <EditableField 
                                        label="Key Responsibilities" 
                                        icon={FileText} 
                                        value={editForm?.responsibilities} 
                                        disabled={!isEditMode}
                                        onChange={(val: string) => setEditForm({...editForm, responsibilities: val})}
                                        placeholder="Brief summary of past experience..."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">
                                <div className="glass-strong rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-12 border border-white/60 shadow-xl space-y-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                                            <Activity className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Performance Intelligence</h3>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Efficiency Rating</p>
                                            <p className="text-2xl font-black text-slate-900">94.2%</p>
                                        </div>
                                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Growth Delta</p>
                                            <p className="text-2xl font-black text-slate-900">1.2x</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recent Activity Pipeline</p>
                                        {[1,2,3].map(i => (
                                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/40 border border-white/60">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <FileCheck className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black">Audit Milestone {4-i}</p>
                                                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Verified by System</p>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-black text-emerald-500">OPTIMAL</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Verification Summary */}
                            <div className="space-y-8">
                                <div className="bg-slate-900 rounded-[2.5rem] md:rounded-[3.5rem] p-8 text-white relative overflow-hidden group h-full">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-bl-full -mr-8 -mt-8" />
                                    <h3 className="text-lg font-black tracking-tight relative z-10 uppercase tracking-widest">Verification Dossier</h3>
                                    
                                    <div className="mt-10 space-y-6 relative z-10">
                                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                                            <BadgeCheck className="w-6 h-6 text-emerald-500" />
                                            <div>
                                                <p className="text-xs font-black">KYC Status</p>
                                                <p className="text-[10px] font-bold text-white/40 uppercase">Verified</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                                            <Shield className="w-6 h-6 text-indigo-500" />
                                            <div>
                                                <p className="text-xs font-black">Background Access</p>
                                                <p className="text-[10px] font-bold text-white/40 uppercase">Clearance Level 2</p>
                                            </div>
                                        </div>
                                        <div className="pt-6 space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Loyalty Index</p>
                                            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                                <motion.div initial={{ width: 0 }} animate={{ width: '85%' }} className="h-full bg-primary" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default StaffProfile;
