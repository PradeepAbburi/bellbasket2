import React, { useState, useEffect } from 'react';
import { 
    CreditCard, Users, Search, History, TrendingUp, 
    Landmark, CheckCircle2, Clock, AlertCircle,
    ArrowRight, DollarSign, Calendar, ChevronRight,
    ArrowUpRight, Download, Filter, Loader2, Landmark as Bank
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { Staff } from '@/types';
import { toast } from 'sonner';

const StaffPayments = () => {
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [amount, setAmount] = useState<string>("");
    const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
    const [isProcessing, setIsProcessing] = useState(false);
    const [loading, setLoading] = useState(true);

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString());

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "referrals"), (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
            setStaffList(list);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const filteredStaff = staffList.filter(s => 
        s.agentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.referralId?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleProcessPayment = async () => {
        if (!selectedStaff || !amount || parseFloat(amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        setIsProcessing(true);
        try {
            const numAmount = parseFloat(amount);
            const paymentRecord = {
                amount: numAmount,
                date: new Date().toISOString(),
                month: selectedMonth,
                year: selectedYear,
                status: 'completed',
                transactionRef: `PY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
            };

            const staffRef = doc(db, "referrals", selectedStaff.id);
            await updateDoc(staffRef, {
                payments: arrayUnion(paymentRecord),
                totalEarnings: (selectedStaff.totalEarnings || 0) + numAmount
            });

            toast.success(`Payment of ₹${amount} recorded for ${selectedStaff.agentName} (${selectedMonth} ${selectedYear})`, {
                icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            });
            setAmount("");
            setSelectedStaff(null);
        } catch (e) {
            toast.error("Payment failed to register");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6 md:space-y-12 pb-20 px-4 md:px-0">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                        </div>
                        <h1 className="text-2xl md:text-4xl font-black text-foreground tracking-tight">Staff Payments</h1>
                    </div>
                    <p className="text-muted-foreground font-medium text-xs md:text-sm pl-1">Process salary and commission settlements for employees.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 md:gap-10">
                {/* Staff Selection Column */}
                <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
                    <div className="glass-strong p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border border-white/60 shadow-xl space-y-6">
                        <h3 className="text-[10px] md:text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" /> Select Employee
                        </h3>
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input 
                                type="text"
                                placeholder="Search by name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/40 border border-white/60 rounded-xl py-3 md:py-4 pl-12 pr-4 text-xs font-black focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                            />
                        </div>

                        <div className="max-h-[400px] md:max-h-[500px] overflow-y-auto custom-scrollbar space-y-2 pr-2">
                            {loading ? (
                                [1,2,3].map(n => <div key={n} className="h-16 md:h-20 glass animate-pulse rounded-2xl" />)
                            ) : filteredStaff.length === 0 ? (
                                <div className="p-10 text-center glass rounded-2xl border-dashed border-2 border-primary/20">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground">No employees found</p>
                                </div>
                            ) : (
                                filteredStaff.map((staff) => (
                                    <button
                                        key={staff.id}
                                        onClick={() => setSelectedStaff(staff)}
                                        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all border ${
                                            selectedStaff?.id === staff.id 
                                            ? 'bg-primary text-white shadow-xl shadow-primary/20 border-primary scale-[1.02]' 
                                            : 'glass border-white/40 hover:bg-white/05 text-foreground'
                                        }`}
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-white/20 overflow-hidden flex-shrink-0">
                                            {staff.image ? <img src={staff.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary/40 font-black">{staff.agentName?.charAt(0)}</div>}
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <p className="text-xs font-black truncate">{staff.agentName}</p>
                                            <p className={`text-[8px] font-black uppercase tracking-widest ${selectedStaff?.id === staff.id ? 'text-white/60' : 'text-primary'}`}>{staff.referralId}</p>
                                        </div>
                                        {selectedStaff?.id === staff.id && <CheckCircle2 className="w-4 h-4" />}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Settlement Column */}
                <div className="lg:col-span-3 space-y-6 md:order-2">
                    <AnimatePresence mode="wait">
                        {selectedStaff ? (
                            <motion.div 
                                key={selectedStaff.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                {/* Bank Info Card */}
                                <div className="glass-strong p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-white shadow-2xl bg-gradient-to-br from-amber-500/5 to-transparent relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-5">
                                        <Bank className="w-24 h-24 md:w-40 md:h-40" />
                                    </div>
                                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                                    <Bank className="w-5 h-5 text-amber-500" />
                                                </div>
                                                <h3 className="text-xl font-black text-foreground tracking-tight">Bank Details</h3>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-8">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Bank Name</p>
                                                    <p className="font-extrabold text-foreground text-sm">{selectedStaff.bankName || 'Not Provided'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">IFSC Code</p>
                                                    <p className="font-extrabold text-foreground uppercase tracking-widest text-sm">{selectedStaff.ifscCode || 'N/A'}</p>
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Account Number</p>
                                                    <p className="text-xl md:text-2xl font-black text-foreground tracking-widest">{selectedStaff.accountNumber || 'MISSING DATA'}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-white/60 p-6 md:p-8 rounded-3xl border border-white text-center min-w-[180px]">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Total Paid to Date</p>
                                            <h4 className="text-2xl md:text-3xl font-black text-foreground">₹{selectedStaff.totalEarnings || 0}</h4>
                                            <div className="mt-4 flex items-center justify-center gap-2 text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 py-1.5 rounded-full">
                                                <CheckCircle2 className="w-3 h-3" /> Active Employee
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Input */}
                                <div className="glass-strong p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-white shadow-2xl space-y-6 md:space-y-8">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                <CreditCard className="w-5 h-5 text-primary" />
                                            </div>
                                            <h3 className="text-xl font-black text-foreground tracking-tight">Disburse Amount</h3>
                                        </div>
                                        <div className="flex gap-2">
                                            <select 
                                                value={selectedMonth}
                                                onChange={(e) => setSelectedMonth(e.target.value)}
                                                className="bg-white/40 border border-white/60 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-primary/5 cursor-pointer outline-none"
                                            >
                                                {months.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                            <select 
                                                value={selectedYear}
                                                onChange={(e) => setSelectedYear(e.target.value)}
                                                className="bg-white/40 border border-white/60 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-primary/5 cursor-pointer outline-none"
                                            >
                                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="relative group">
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl md:text-3xl font-black text-primary opacity-40">₹</div>
                                            <input 
                                                type="number" 
                                                placeholder="0.00"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                className="w-full h-20 md:h-24 bg-white/40 border-2 border-primary/10 rounded-2xl md:rounded-[2rem] pl-16 pr-8 text-3xl md:text-4xl font-black text-foreground focus:outline-none focus:border-primary/40 focus:ring-8 focus:ring-primary/5 transition-all text-left"
                                            />
                                        </div>
                                        <button 
                                            onClick={handleProcessPayment}
                                            disabled={isProcessing || !amount}
                                            className="w-full gradient-primary text-white h-16 md:h-20 rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-4"
                                        >
                                            {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Landmark className="w-6 h-6" />}
                                            Record Payment
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-10 md:p-20 glass rounded-[3rem] md:rounded-[4rem] border-dashed border-2 border-primary/20 space-y-6">
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-primary/5 flex items-center justify-center">
                                    <CreditCard className="w-12 h-12 md:w-16 md:h-16 text-primary/20" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl md:text-3xl font-black text-foreground/40">No Employee Selected</h3>
                                    <p className="text-muted-foreground font-medium text-xs md:text-sm max-w-sm mx-auto">Select a staff member from the left to manage their payments and history.</p>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Recent Payments Log */}
            <section className="space-y-6 pt-10">
                <div className="flex items-center gap-3">
                    <History className="w-6 h-6 text-primary" />
                    <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tight uppercase tracking-widest">Recent Payout History</h2>
                </div>
                <div className="glass-strong rounded-[2rem] md:rounded-[2.5rem] border border-white/60 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/40 border-b border-white/60">
                                <tr>
                                    <th className="px-6 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">Employee</th>
                                    <th className="px-6 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center whitespace-nowrap">Ref ID</th>
                                    <th className="px-6 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">Period</th>
                                    <th className="px-6 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">Date</th>
                                    <th className="px-6 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center whitespace-nowrap">Status</th>
                                    <th className="px-6 md:px-8 py-4 md:py-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right whitespace-nowrap">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {staffList.flatMap(s => (s.payments || []).map(p => ({ ...p, agentName: s.agentName, referralId: s.referralId }))).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15).map((payment, i) => (
                                    <tr key={i} className="border-b border-border/5 hover:bg-white/05 transition-colors group">
                                        <td className="px-6 md:px-8 py-4 md:py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center font-black text-primary text-[10px]">
                                                    {payment.agentName?.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-foreground truncate">{payment.agentName}</p>
                                                    <p className="text-[9px] font-bold text-primary uppercase tracking-widest truncate">{payment.referralId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 md:px-8 py-4 md:py-6 text-center">
                                            <span className="text-[10px] font-black text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full uppercase tracking-widest">{(payment as any).transactionRef || 'N/A'}</span>
                                        </td>
                                        <td className="px-6 md:px-8 py-4 md:py-6 whitespace-nowrap">
                                            <p className="text-xs font-black text-foreground uppercase tracking-widest">{(payment as any).month} {(payment as any).year}</p>
                                        </td>
                                        <td className="px-6 md:px-8 py-4 md:py-6 whitespace-nowrap">
                                            <p className="text-xs font-bold text-muted-foreground">{new Date(payment.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                        </td>
                                        <td className="px-6 md:px-8 py-4 md:py-6 text-center">
                                            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-500 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                                <CheckCircle2 className="w-3 h-3" /> Processed
                                            </span>
                                        </td>
                                        <td className="px-6 md:px-8 py-4 md:py-6 text-right">
                                            <p className="text-base md:text-lg font-black text-foreground">₹{payment.amount}</p>
                                        </td>
                                    </tr>
                                ))}
                                {staffList.length > 0 && staffList.every(s => !s.payments?.length) && (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-20 text-center text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] opacity-40">No payment history found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default StaffPayments;


