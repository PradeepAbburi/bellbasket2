import React, { useState, useEffect, useMemo } from 'react';
import { 
    Users, Search, Filter, Mail, Phone, MapPin, 
    Landmark, CreditCard, Activity, ArrowRight,
    Edit3, Trash2, X, Plus, Camera, Eye, 
    User, ChevronRight, MoreVertical, Shield,
    UserCircle, Briefcase, BadgeCheck, Zap,
    GraduationCap, History, FileText, Link as LinkIcon,
    Save, Loader2, Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Staff } from '@/types';
import { toast } from 'sonner';

const StaffCard = ({ staff, index, onClick, onDelete }: { staff: Staff; index: number; onClick: () => void; onDelete: (e: React.MouseEvent) => void }) => (
    <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.05 }}
        onClick={onClick}
        className="glass-strong p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border border-white/60 shadow-2xl group hover:border-primary/40 transition-all hover:translate-y-[-4px] relative overflow-hidden flex flex-col items-center text-center cursor-pointer"
    >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-primary/10" />
        
        <div className="relative z-10 mb-6 w-full flex flex-col items-center">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full p-1 bg-white border-4 border-white shadow-2xl overflow-hidden group-hover:scale-105 transition-transform duration-500">
                <div className="w-full h-full rounded-full bg-secondary overflow-hidden">
                    {staff.image ? (
                        <img src={staff.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/20">
                            <UserCircle className="w-16 h-16" />
                        </div>
                    )}
                </div>
            </div>
            {staff.department && (
                <div className="mt-2 px-4 py-1.5 bg-gradient-to-r from-primary to-purple-600 text-white rounded-full shadow-lg border-2 border-white scale-90 md:scale-100">
                    <span className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap">{staff.department}</span>
                </div>
            )}
        </div>

        <div className="relative z-10 mb-6 md:mb-8 w-full">
            <h4 className="text-lg md:text-xl font-black text-foreground tracking-tight line-clamp-1 group-hover:text-primary transition-colors">{staff.agentName}</h4>
            <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">Employee ID: {staff.referralId}</p>
            
            <div className="space-y-2 mt-4 md:mt-6">
                <div className="flex items-center justify-center gap-2 text-[11px] md:text-xs font-medium text-muted-foreground">
                    <Mail className="w-3 md:w-3.5 h-3 md:h-3.5 text-primary/40 shrink-0" />
                    <span className="truncate">{staff.email || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-[11px] md:text-xs font-medium text-muted-foreground">
                    <Phone className="w-3 md:w-3.5 h-3 md:h-3.5 text-primary/40 shrink-0" />
                    <span>{staff.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-[11px] md:text-xs font-medium text-muted-foreground">
                    <MapPin className="w-3 md:w-3.5 h-3 md:h-3.5 text-primary/40 shrink-0" />
                    <span className="truncate">{staff.officeLocation || 'Main Office'}</span>
                </div>
            </div>
        </div>

        <div className="relative z-10 w-full pt-4 md:pt-6 border-t border-border/10 flex items-center justify-between">
            <div className="flex -space-x-2">
                {[1,2,3].map(i => (
                    <div key={i} className="w-5 md:w-6 h-5 md:h-6 rounded-full border-2 border-white bg-secondary flex items-center justify-center text-[7px] md:text-[8px] font-bold text-muted-foreground">
                        {i}
                    </div>
                ))}
            </div>
            <button 
                onClick={onDelete}
                className="p-2 md:p-2.5 rounded-2xl bg-destructive/5 text-destructive hover:bg-destructive hover:text-white transition-all outline-none"
            >
                <Trash2 className="w-3.5 md:w-4 h-3.5 md:h-4" />
            </button>
        </div>
    </motion.div>
);

const HrStaffDirectory = () => {
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterDept, setFilterDept] = useState("All");
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "referrals"), (snapshot) => {
            const list = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Staff))
                .filter(s => s.agentName && s.agentName.trim() !== "");
            setStaffList(list);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const filteredStaff = useMemo(() => {
        return staffList.filter(s => {
            const matchesSearch = s.agentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.referralId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.phone?.includes(searchQuery);
            
            const matchesDept = filterDept === "All" || s.department === filterDept;
            
            return matchesSearch && matchesDept;
        });
    }, [staffList, searchQuery, filterDept]);

    const handleDeleteStaff = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this staff member? This action cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, "referrals", id));
            toast.success("Staff profile deleted permanently");
        } catch (e) {
            toast.error("Deletion failed");
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 px-4 md:px-0">
            {/* SPACING ADDED: TOP MARGIN FOR DIRECTORY */}
            <div className="mt-4 md:mt-8" /> 

            {/* Header Controls - Responsive Layout */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white/40 p-6 md:p-8 rounded-[2.5rem] md:rounded-[3.5rem] border border-white/60 shadow-xl backdrop-blur-md max-w-[1400px] mx-auto">
                <div className="flex-1 max-w-2xl relative group w-full">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input 
                        type="text"
                        placeholder="Search workforce..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/70 border-0 rounded-[2rem] py-4 md:py-5 pl-16 pr-8 text-xs md:text-sm font-black focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all shadow-inner outline-none"
                    />
                </div>
                
                <div className="overflow-x-auto no-scrollbar pb-1 -mx-2 px-2">
                    <div className="flex items-center gap-2 bg-white/70 p-1.5 md:p-2 rounded-[2rem] shadow-sm ring-1 ring-black/5 w-fit">
                        {["All", "Sales", "Marketing", "HR", "CXO Level"].map(dept => (
                            <button
                                key={dept}
                                onClick={() => setFilterDept(dept)}
                                className={`px-4 md:px-6 py-2.5 md:py-3 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterDept === dept ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:bg-black/5'}`}
                            >
                                {dept}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Staff Grid - Responsive Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 max-w-[1400px] mx-auto">
                {filteredStaff.map((staff, index) => (
                    <StaffCard 
                        key={staff.id} 
                        staff={staff} 
                        index={index} 
                        onClick={() => navigate(`/hr/staff/${staff.id}`)}
                        onDelete={(e) => handleDeleteStaff(e, staff.id)}
                    />
                ))}
            </div>

            {filteredStaff.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 md:py-32 text-center space-y-4 glass rounded-[3rem] border-dashed border-2 border-primary/10">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-secondary flex items-center justify-center">
                        <Users className="w-8 md:w-10 h-8 md:h-10 text-muted-foreground/30" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-foreground uppercase tracking-tight">No Workforce Matches</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">Your search criteria didn't return any active staff profiles.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HrStaffDirectory;
