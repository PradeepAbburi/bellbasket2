import React, { useState, useEffect } from 'react';
import { 
    UserPlus, Shield, Lock, Mail, Phone, User, MapPin,
    Camera, Landmark, Info, CheckCircle2, 
    AtSign, Key, Briefcase, Plus, Trash2,
    Eye, EyeOff, Loader2, Sparkles, GraduationCap, 
    History, FileText, Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { Staff } from '@/types';

const FormSection = ({ title, icon: Icon, children }: any) => (
    <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-primary/10 pb-4">
            <Icon className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-black text-foreground uppercase tracking-widest">{title}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {children}
        </div>
    </section>
);

const InputField = ({ label, icon: Icon, type = "text", value, onChange, placeholder, required }: any) => (
    <div className="space-y-2 group">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-focus-within:text-primary transition-colors flex items-center gap-2">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />}
            <input 
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={`w-full bg-white/60 border border-white/80 rounded-2xl py-4 ${Icon ? 'pl-12' : 'px-6'} pr-6 text-sm font-black focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all shadow-sm ring-1 ring-black/5`}
                onInput={(e) => e.stopPropagation()}
            />
        </div>
    </div>
);

const StaffOnboarding = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [staffList, setStaffList] = useState<any[]>([]);
    
    // Form State
    const [formData, setFormData] = useState({
        agentName: '',
        referralId: '',
        loginId: '',
        password: '',
        email: '',
        phone: '',
        bankName: '',
        accountName: '',
        accountNumber: '',
        ifsc: '',
        degree: '',
        college: '',
        branch: '',
        eduStartYear: '',
        eduEndYear: '',
        companyName: '',
        role: '',
        expStartYear: '',
        expEndYear: '',
        totalPastExperience: '',
        resumeUrl: '',
        department: 'Sales',
        address: '',
        aadharNumber: '',
        officeLocation: ''
    });
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    useEffect(() => {
        const fetchStaff = async () => {
            const snap = await getDocs(collection(db, "referrals"));
            const list = snap.docs.map(doc => doc.data());
            setStaffList(list);
            
            // Auto ID logic
            const numericalIds = list
                .map(r => {
                    const idStr = r.referralId || '';
                    const match = idStr.match(/\d+/);
                    return match ? parseInt(match[0]) : NaN;
                })
                .filter(id => !isNaN(id));
            
            const nextId = numericalIds.length > 0 ? Math.max(...numericalIds) + 1 : 1;
            setFormData(prev => ({ ...prev, referralId: nextId.toString() }));
        };
        fetchStaff();
    }, []);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleOnboard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.agentName || !formData.loginId || !formData.password) {
            toast.error("Please fill in essential fields (Name, Login ID, Password)");
            return;
        }

        setIsLoading(true);
        try {
            const staffData = {
                agentName: formData.agentName,
                referralId: formData.referralId,
                loginId: formData.loginId,
                password: formData.password,
                email: formData.email,
                phone: formData.phone,
                image: imagePreview,
                bankDetails: {
                    bankName: formData.bankName,
                    accountName: formData.accountName,
                    accountNumber: formData.accountNumber,
                    ifsc: formData.ifsc
                },
                education: {
                    degree: formData.degree,
                    college: formData.college,
                    branch: formData.branch,
                    startYear: formData.eduStartYear,
                    endYear: formData.eduEndYear
                },
                experience: {
                    companyName: formData.companyName,
                    role: formData.role,
                    startYear: formData.expStartYear,
                    endYear: formData.expEndYear
                },
                totalPastExperience: parseInt(formData.totalPastExperience) || 0,
                resume: formData.resumeUrl,
                department: formData.department,
                address: formData.address,
                aadharNumber: formData.aadharNumber,
                officeLocation: formData.officeLocation,
                totalEarnings: 0,
                totalVendors: 0,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, "referrals"), staffData);
            toast.success("Staff member onboarded successfully", {
                description: `Credentials generated for ${formData.agentName}`,
                icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            });

            // Reset form
            setFormData({
                agentName: '',
                referralId: (parseInt(formData.referralId) + 1).toString(),
                loginId: '',
                password: '',
                email: '',
                phone: '',
                bankName: '',
                accountName: '',
                accountNumber: '',
                ifsc: '',
                degree: '',
                college: '',
                branch: '',
                eduStartYear: '',
                eduEndYear: '',
                companyName: '',
                role: '',
                expStartYear: '',
                expEndYear: '',
                totalPastExperience: '',
                resumeUrl: '',
                department: 'Sales',
                address: '',
                aadharNumber: '',
                officeLocation: ''
            });
            setImagePreview(null);
        } catch (e) {
            toast.error("Process failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-12">
            <header className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 mb-4">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">New Talent Acquisition</span>
                </div>
                <h1 className="text-5xl font-black text-foreground tracking-tight">Staff Onboarding</h1>
                <p className="text-muted-foreground font-medium max-w-lg mx-auto">Generate secure credentials and capture comprehensive data for your new workforce assets.</p>
            </header>

            <form onSubmit={handleOnboard} className="glass-strong p-10 md:p-16 rounded-[4rem] border border-white/60 shadow-2xl bg-white/40 space-y-16 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -mr-64 -mt-64" />
                
                {/* Photo Upload Section */}
                <div className="flex flex-col items-center gap-6 relative z-10">
                    <div className="relative group">
                        <div className="w-40 h-40 rounded-[3rem] bg-secondary border-4 border-white shadow-2xl overflow-hidden relative transition-all group-hover:scale-105">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                                    <Camera className="w-8 h-8 opacity-20" />
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Choose Photo</span>
                                </div>
                            )}
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleImageChange}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl border-4 border-white group-hover:rotate-12 transition-all">
                            <Plus className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-[11px] font-black uppercase tracking-widest text-foreground">Official Staff Portrait</p>
                        <p className="text-[9px] font-bold text-muted-foreground mt-1 opacity-60">High resolution JPG or PNG recommended</p>
                    </div>
                </div>

                <div className="space-y-16 relative z-10">
                    <FormSection title="Account Identity" icon={Shield}>
                        <InputField 
                            label="Employee ID (Auto-Generated)" 
                            icon={Shield} 
                            value={formData.referralId} 
                            onChange={(v: string) => setFormData({...formData, referralId: v})}
                        />
                        <InputField 
                            label="Full Legal Name" 
                            icon={User} 
                            placeholder="e.g. Satya Nadella" 
                            value={formData.agentName}
                            onChange={(v: string) => setFormData({...formData, agentName: v})}
                            required
                        />
                        <div className="space-y-2 group">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-focus-within:text-primary transition-colors flex items-center gap-2">
                                Department / Organization Node <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <select 
                                    value={formData.department}
                                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                                    className="w-full bg-white/60 border border-white/80 rounded-2xl py-4 pl-12 pr-6 text-sm font-black focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all shadow-sm appearance-none cursor-pointer"
                                >
                                    <option value="Sales">Sales</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="HR">HR</option>
                                    <option value="CXO Level">CXO Level Executive</option>
                                    <option value="Operations">Operations</option>
                                    <option value="Finance">Finance</option>
                                    <option value="IT Support">IT Support</option>
                                </select>
                            </div>
                        </div>
                        <InputField 
                            label="Residential Address" 
                            icon={MapPin} 
                            placeholder="Current living quarters..." 
                            value={formData.address}
                            onChange={(v: string) => setFormData({...formData, address: v})}
                        />
                        <InputField 
                            label="Identity Verification (Aadhar)" 
                            icon={Shield} 
                            placeholder="Unique ID number" 
                            value={formData.aadharNumber}
                            onChange={(v: string) => setFormData({...formData, aadharNumber: v})}
                        />
                        <InputField 
                            label="Allocated Office Location" 
                            icon={Landmark} 
                            placeholder="e.g. Hyderabad H.O." 
                            value={formData.officeLocation}
                            onChange={(v: string) => setFormData({...formData, officeLocation: v})}
                        />
                    </FormSection>

                    <FormSection title="Access Credentials" icon={Lock}>
                        <InputField 
                            label="System Login ID" 
                            icon={AtSign} 
                            placeholder="Unique username" 
                            value={formData.loginId}
                            onChange={(v: string) => setFormData({...formData, loginId: v})}
                            required
                        />
                        <div className="relative group space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-focus-within:text-primary transition-colors flex items-center gap-2">
                                Password <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Secure passphrase"
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    className="w-full bg-white/60 border border-white/80 rounded-2xl py-4 pl-12 pr-12 text-sm font-black focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all shadow-sm ring-1 ring-black/5"
                                    required
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </FormSection>

                    <FormSection title="Contact Dossier" icon={Mail}>
                        <InputField 
                            label="Official Email" 
                            icon={Mail} 
                            type="email" 
                            placeholder="name@bellbasket.com" 
                            value={formData.email}
                            onChange={(v: string) => setFormData({...formData, email: v})}
                        />
                        <InputField 
                            label="Mobile Number" 
                            icon={Phone} 
                            placeholder="+91 XXXXX XXXXX" 
                            value={formData.phone}
                            onChange={(v: string) => setFormData({...formData, phone: v})}
                        />
                    </FormSection>

                    <FormSection title="Financial Repository" icon={Landmark}>
                        <InputField 
                            label="Bank Name" 
                            icon={Landmark} 
                            placeholder="e.g. HDFC Bank" 
                            value={formData.bankName}
                            onChange={(v: string) => setFormData({...formData, bankName: v})}
                        />
                        <InputField 
                            label="Account Beneficiary" 
                            icon={User} 
                            placeholder="As per bank records" 
                            value={formData.accountName}
                            onChange={(v: string) => setFormData({...formData, accountName: v})}
                        />
                        <InputField 
                            label="Account Number" 
                            icon={Key} 
                            placeholder="Digit string only" 
                            value={formData.accountNumber}
                            onChange={(v: string) => setFormData({...formData, accountNumber: v})}
                        />
                        <InputField 
                            label="IFSC Identifier" 
                            icon={Shield} 
                            placeholder="Alpha-numeric code" 
                            value={formData.ifsc}
                            onChange={(v: string) => setFormData({...formData, ifsc: v})}
                        />
                    </FormSection>

                    <FormSection title="Educational Background" icon={GraduationCap}>
                        <InputField 
                            label="Degree / Qualification" 
                            icon={GraduationCap} 
                            placeholder="e.g. B.Tech Computer Science" 
                            value={formData.degree}
                            onChange={(v: string) => setFormData({...formData, degree: v})}
                        />
                        <InputField 
                            label="College / University" 
                            icon={Landmark} 
                            placeholder="e.g. IIT Madras" 
                            value={formData.college}
                            onChange={(v: string) => setFormData({...formData, college: v})}
                        />
                        <InputField 
                            label="Specialization / Branch" 
                            icon={Briefcase} 
                            placeholder="e.g. Software Engineering" 
                            value={formData.branch}
                            onChange={(v: string) => setFormData({...formData, branch: v})}
                        />
                         <div className="grid grid-cols-2 gap-4">
                            <InputField 
                                label="Start Year" 
                                placeholder="2018" 
                                value={formData.eduStartYear}
                                onChange={(v: string) => setFormData({...formData, eduStartYear: v})}
                            />
                            <InputField 
                                label="End Year" 
                                placeholder="2022" 
                                value={formData.eduEndYear}
                                onChange={(v: string) => setFormData({...formData, eduEndYear: v})}
                            />
                        </div>
                    </FormSection>

                    <FormSection title="Professional Narrative" icon={History}>
                        <InputField 
                            label="Previous Company" 
                            icon={Briefcase} 
                            placeholder="e.g. Google India" 
                            value={formData.companyName}
                            onChange={(v: string) => setFormData({...formData, companyName: v})}
                        />
                        <InputField 
                            label="Designation / Role" 
                            icon={User} 
                            placeholder="e.g. Senior Associate" 
                            value={formData.role}
                            onChange={(v: string) => setFormData({...formData, role: v})}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <InputField 
                                label="Start Date" 
                                placeholder="MM/YYYY" 
                                value={formData.expStartYear}
                                onChange={(v: string) => setFormData({...formData, expStartYear: v})}
                            />
                            <InputField 
                                label="End Date" 
                                placeholder="MM/YYYY" 
                                value={formData.expEndYear}
                                onChange={(v: string) => setFormData({...formData, expEndYear: v})}
                            />
                        </div>
                        <InputField 
                            label="Total Years Experience" 
                            icon={Sparkles} 
                            placeholder="Number of years" 
                            type="number"
                            value={formData.totalPastExperience}
                            onChange={(v: string) => setFormData({...formData, totalPastExperience: v})}
                        />
                    </FormSection>

                    <FormSection title="Digital Dossier" icon={FileText}>
                        <InputField 
                            label="Resume / Portfolio Link" 
                            icon={LinkIcon} 
                            placeholder="Public Google Drive or LinkedIn URL" 
                            value={formData.resumeUrl}
                            onChange={(v: string) => setFormData({...formData, resumeUrl: v})}
                        />
                    </FormSection>
                </div>

                <div className="pt-10 border-t border-primary/10 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                        <Info className="w-5 h-5 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground max-w-xs leading-relaxed">By generating this profile, you are granting system access to this individual. Double check all small details.</span>
                    </div>
                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="gradient-primary text-white h-20 px-16 rounded-[2rem] text-sm font-black uppercase tracking-widest shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-4"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin" /> Processing Identity...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-6 h-6" /> Finalize Onboarding
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default StaffOnboarding;
