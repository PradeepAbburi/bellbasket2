import { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, doc, addDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { ArrowLeft, TrendingUp, AlertCircle, Trash2, Eye, EyeOff } from "lucide-react";
import Header from "@/components/Header";
import { toast } from "sonner";
import Loader from "@/components/ui/loader-animation";

const AdminPartnerPayments = () => {
    const { user, loading } = useApp();
    const navigate = useNavigate();

    const [userList, setUserList] = useState<any[]>([]);
    const [referralList, setReferralList] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    const [newAgentName, setNewAgentName] = useState("");
    const [newReferralId, setNewReferralId] = useState("");
    const [newLoginId, setNewLoginId] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [showPartnerPassword, setShowPartnerPassword] = useState(false);
    const [newBankName, setNewBankName] = useState("");
    const [newAccountName, setNewAccountName] = useState("");
    const [newAccountNumber, setNewAccountNumber] = useState("");
    const [newIfsc, setNewIfsc] = useState("");
    const [payingPartnerId, setPayingPartnerId] = useState<string | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [isCreatingReferral, setIsCreatingReferral] = useState(false);

    useEffect(() => {
        if (!loading && (!user?.id || user?.role !== 'admin')) {
            navigate('/auth');
        }
    }, [user?.id, user?.role, loading, navigate]);

    useEffect(() => {
        if (!user || user.role !== 'admin') return;
        setIsLoadingData(true);

        const unsubscribes: (() => void)[] = [];

        unsubscribes.push(onSnapshot(collection(db, "users"), (snapshot) => {
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUserList(users);
        }, (err) => console.error("Users Sync Error:", err)));

        unsubscribes.push(onSnapshot(collection(db, "referrals"), (snapshot) => {
            setReferralList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoadingData(false);
        }, (err) => {
            console.error("Referrals Sync Error:", err);
            setIsLoadingData(false);
        }));

        const safetyLoader = setTimeout(() => setIsLoadingData(false), 3000);

        return () => {
            unsubscribes.forEach(u => u());
            clearTimeout(safetyLoader);
        };
    }, [user?.id, user?.role]);

    const handleCreateReferral = async () => {
        if (!newAgentName.trim() || !newReferralId.trim() || !newLoginId.trim() || !newPassword.trim()) {
            toast.error("Please fill in all fields (Name, Referral ID, Login ID, Password)");
            return;
        }

        setIsCreatingReferral(true);
        try {
            const rid = newReferralId.toUpperCase().trim();
            const existing = referralList.find(r => r.referralId === rid);
            if (existing) {
                toast.error("Referral ID already exists");
                setIsCreatingReferral(false);
                return;
            }

            await addDoc(collection(db, "referrals"), {
                agentName: newAgentName.trim(),
                referralId: rid,
                loginId: newLoginId.trim(),
                password: newPassword.trim(),
                bankName: newBankName.trim(),
                accountName: newAccountName.trim(),
                accountNumber: newAccountNumber.trim(),
                ifsc: newIfsc.trim().toUpperCase(),
                totalPaid: 0,
                createdAt: new Date().toISOString()
            });

            toast.success("Referral created successfully");
            setNewAgentName("");
            setNewReferralId("");
            setNewLoginId("");
            setNewPassword("");
            setNewBankName("");
            setNewAccountName("");
            setNewAccountNumber("");
            setNewIfsc("");
        } catch (e: any) {
            toast.error("Failed to create referral");
        } finally {
            setIsCreatingReferral(false);
        }
    };

    const handleRecordPayment = async (id: string, currentTotalPaid: number) => {
        if (!paymentAmount || paymentAmount <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }
        try {
            await updateDoc(doc(db, "referrals", id), {
                totalPaid: (currentTotalPaid || 0) + paymentAmount,
                lastPaidAt: new Date().toISOString()
            });
            toast.success(`Successfully recorded ₹${paymentAmount} payment!`);
            setPayingPartnerId(null);
            setPaymentAmount(0);
        } catch (error) {
            toast.error("Failed to record payment");
        }
    };

    const handleDeleteReferral = async (id: string) => {
        if (!window.confirm("Delete this referral?")) return;
        try {
            await deleteDoc(doc(db, "referrals", id));
            toast.success("Referral deleted");
        } catch (e) {
            toast.error("Delete failed");
        }
    };

    const leaderboard = referralList.map(ref => {
        const referredVendors = userList.filter(u => u.role === 'vendor' && u.referralCode === ref.referralId);
        const count = referredVendors.length;

        let totalEarnings = 0;
        referredVendors.forEach(v => {
            const plan = v.plan || 'none';
            let price = 0;
            if (plan === 'basic') price = 99;
            else if (plan === 'growth') price = 199;
            else if (plan === 'pro') price = 399;

            totalEarnings += price * 0.3;
        });

        return {
            ...ref,
            count,
            earnings: totalEarnings
        };
    }).sort((a, b) => b.count - a.count);

    const unknownReferralsCount = userList.filter(u => u.role === 'vendor' && u.referralCode && !referralList.some(r => r.referralId === u.referralCode)).length;

    if (loading || isLoadingData) {
        return (
            <div className="min-h-screen gradient-warm flex items-center justify-center">
                <Loader text="System Secure" subtext="Synchronizing Data..." />
            </div>
        );
    }

    return (
        <div className="min-h-screen gradient-warm">
            <Header />
            <div className="pt-24 pb-12 px-4 max-w-6xl mx-auto">
                <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </button>

                <h1 className="text-3xl font-black text-foreground mb-8">Partner Payments & Referrals</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Create Section */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="p-6 bg-secondary/30 rounded-3xl border border-border/50">
                            <h3 className="text-xl font-black text-foreground mb-4">Create Partner ID</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Partner Name</label>
                                    <input
                                        type="text"
                                        value={newAgentName}
                                        onChange={(e) => setNewAgentName(e.target.value)}
                                        placeholder="e.g. Rahul Sharma"
                                        className="w-full px-4 py-3 rounded-xl bg-white border-0 outline-none shadow-sm text-sm font-bold mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Partner ID</label>
                                    <input
                                        type="text"
                                        value={newReferralId}
                                        onChange={(e) => setNewReferralId(e.target.value.toUpperCase())}
                                        placeholder="e.g. PARTNER001"
                                        className="w-full px-4 py-3 rounded-xl bg-white border-0 outline-none shadow-sm text-sm font-bold mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Login ID</label>
                                    <input
                                        type="text"
                                        value={newLoginId}
                                        onChange={(e) => setNewLoginId(e.target.value)}
                                        placeholder="e.g. partner_rahul"
                                        className="w-full px-4 py-3 rounded-xl bg-white border-0 outline-none shadow-sm text-sm font-bold mt-1"
                                    />
                                </div>
                                <div className="relative">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Password</label>
                                    <input
                                        type={showPartnerPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Set password"
                                        className="w-full px-4 py-3 rounded-xl bg-white border-0 outline-none shadow-sm text-sm font-bold mt-1 pr-12"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPartnerPassword(!showPartnerPassword)}
                                        className="absolute right-4 bottom-3 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                                    >
                                        {showPartnerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>

                                <div className="pt-4 mt-4 border-t border-border/50">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Bank Details</h4>
                                    <div className="space-y-3">
                                        <input type="text" value={newBankName} onChange={(e) => setNewBankName(e.target.value)} placeholder="Bank Name" className="w-full px-4 py-3 rounded-xl bg-white border-0 outline-none shadow-sm text-sm font-bold" />
                                        <input type="text" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} placeholder="Account Holder Name" className="w-full px-4 py-3 rounded-xl bg-white border-0 outline-none shadow-sm text-sm font-bold" />
                                        <input type="text" value={newAccountNumber} onChange={(e) => setNewAccountNumber(e.target.value)} placeholder="Account Number" className="w-full px-4 py-3 rounded-xl bg-white border-0 outline-none shadow-sm text-sm font-bold" />
                                        <input type="text" value={newIfsc} onChange={(e) => setNewIfsc(e.target.value)} placeholder="IFSC Code" className="w-full px-4 py-3 rounded-xl bg-white border-0 outline-none shadow-sm text-sm font-bold" />
                                    </div>
                                </div>

                                <button
                                    onClick={handleCreateReferral}
                                    disabled={isCreatingReferral}
                                    className="w-full py-3 rounded-xl gradient-primary text-white font-black text-xs uppercase tracking-widest shadow-lg hover:scale-105 transition-all disabled:opacity-50 mt-2"
                                >
                                    {isCreatingReferral ? "Creating..." : "Generate ID"}
                                </button>
                            </div>
                        </div>

                        <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10">
                            <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-2">Referral Stats</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-muted-foreground">Tracked Partners:</span>
                                    <span className="text-sm font-black text-foreground">{referralList.length}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-muted-foreground">Total Referred:</span>
                                    <span className="text-sm font-black text-foreground">{leaderboard.reduce((a, b) => a + b.count, 0)}</span>
                                </div>
                                {unknownReferralsCount > 0 && (
                                    <div className="flex justify-between items-center pt-2 border-t border-primary/10">
                                        <span className="text-xs font-bold text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Untracked IDs:</span>
                                        <span className="text-sm font-black text-destructive">{unknownReferralsCount}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Leaderboard Section */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-foreground flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                Partner Ledger
                            </h3>
                        </div>

                        <div className="space-y-3">
                            {leaderboard.length === 0 ? (
                                <div className="p-10 text-center glass rounded-3xl border-dashed border-2">
                                    <p className="text-muted-foreground font-bold italic">No partners created yet.</p>
                                </div>
                            ) : (
                                leaderboard.map((item, index) => (
                                    <div key={item.id} className="p-4 rounded-2xl bg-white border border-border shadow-sm flex flex-col gap-4 group hover:shadow-md transition-all">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${index === 0 ? 'bg-amber-100 text-amber-600' : index === 1 ? 'bg-slate-100 text-slate-500' : index === 2 ? 'bg-orange-100 text-orange-600' : 'bg-secondary text-muted-foreground'}`}>
                                                    #{index + 1}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-black text-foreground text-sm">{item.agentName}</p>
                                                        <span className="px-1.5 py-0.5 rounded-md bg-primary/5 text-primary text-[9px] font-black tracking-tighter border border-primary/10">{item.referralId}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-0.5">
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase tracking-tighter">ID: {item.loginId}</span>
                                                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-tighter">PW: {item.password}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="text-xl font-black text-foreground">{item.count}</p>
                                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Vendors</p>
                                                </div>
                                                <div className="text-right border-l border-border pl-6">
                                                    <p className="text-xl font-black text-primary">₹{item.earnings?.toFixed(0)}</p>
                                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Earnings</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteReferral(item.id)}
                                                    className="p-2 rounded-xl bg-destructive/5 text-destructive hover:bg-destructive hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Bank details and payments */}
                                        <div className="flex flex-col xl:flex-row gap-4 pt-4 border-t border-border/50 bg-secondary/20 p-4 rounded-xl">
                                            <div className="flex-1 space-y-1">
                                                <p className="text-[10px] font-black uppercase text-muted-foreground">Bank Details</p>
                                                {item.bankName ? (
                                                    <>
                                                        <p className="text-sm font-bold text-foreground">{item.bankName} - {item.accountName}</p>
                                                        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                                                            <span>A/C: <span className="text-foreground tracking-wider">{item.accountNumber}</span></span>
                                                            <span>IFSC: <span className="text-foreground uppercase">{item.ifsc}</span></span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <p className="text-sm font-bold text-muted-foreground italic">No details provided</p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-4 xl:gap-6 xl:border-l xl:border-border/50 xl:pl-6 shrink-0">
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-green-600">₹{(item.totalPaid || 0).toFixed(0)}</p>
                                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Paid so far</p>
                                                    {item.lastPaidAt && <p className="text-[8px] text-muted-foreground mt-0.5">{new Date(item.lastPaidAt).toLocaleDateString()}</p>}
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-rose-600">₹{Math.max(0, (item.earnings || 0) - (item.totalPaid || 0)).toFixed(0)}</p>
                                                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Pending</p>
                                                </div>

                                                {payingPartnerId === item.id ? (
                                                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
                                                        <input
                                                            type="number"
                                                            value={paymentAmount || ''}
                                                            onChange={e => setPaymentAmount(Number(e.target.value))}
                                                            placeholder="Amt..."
                                                            className="w-16 px-2 py-1 text-sm font-bold outline-none bg-transparent"
                                                        />
                                                        <button onClick={() => handleRecordPayment(item.id, item.totalPaid)} className="px-3 py-1 bg-green-500 text-white rounded font-bold text-xs hover:bg-green-600 transition-colors">Pay</button>
                                                        <button onClick={() => setPayingPartnerId(null)} className="px-3 py-1 bg-slate-100 text-slate-500 rounded font-bold text-xs hover:bg-slate-200 transition-colors">X</button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => { setPayingPartnerId(item.id); setPaymentAmount(Math.max(0, (item.earnings || 0) - (item.totalPaid || 0))); }}
                                                        className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
                                                    >
                                                        Record Payment
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPartnerPayments;
