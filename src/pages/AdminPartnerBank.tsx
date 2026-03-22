import { useState, useEffect } from "react";
import { useApp } from "@/context/appStore";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { ArrowLeft, TrendingUp, Trash2, Check, Edit, Calendar } from "lucide-react";
import Header from "@/components/Header";
import { toast } from "sonner";
import Loader from "@/components/ui/loader-animation";

// Admin Partner Bank & Payment Management Page
const AdminPartnerBank = () => {
    const { user, loading, logout } = useApp();
    const navigate = useNavigate();

    const [referralList, setReferralList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [bankName, setBankName] = useState("");
    const [accountName, setAccountName] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [ifsc, setIfsc] = useState("");
    const [nextPaymentDate, setNextPaymentDate] = useState("");
    const [paymentAmount, setPaymentAmount] = useState<number>(0);

    // Guard admin access
    useEffect(() => {
        if (!loading && (!user?.id || user?.role !== "admin")) {
            navigate("/auth");
        }
    }, [user?.id, user?.role, loading, navigate]);

    // Sync referrals in real‑time
    useEffect(() => {
        if (!user || user.role !== "admin") return;
        setIsLoading(true);
        const unsub = onSnapshot(collection(db, "referrals"), (snap) => {
            setReferralList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setIsLoading(false);
        }, (err) => {
            console.error("Referrals sync error:", err);
            setIsLoading(false);
        });
        return () => unsub();
    }, [user?.id, user?.role]);

    const startEdit = (partner: any) => {
        setEditingId(partner.id);
        setBankName(partner.bankName || "");
        setAccountName(partner.accountName || "");
        setAccountNumber(partner.accountNumber || "");
        setIfsc(partner.ifsc || "");
        setNextPaymentDate(partner.nextPaymentDate || "");
    };

    const cancelEdit = () => {
        setEditingId(null);
        setBankName("");
        setAccountName("");
        setAccountNumber("");
        setIfsc("");
        setNextPaymentDate("");
    };

    const saveBankDetails = async () => {
        if (!editingId) return;
        try {
            await updateDoc(doc(db, "referrals", editingId), {
                bankName: bankName.trim(),
                accountName: accountName.trim(),
                accountNumber: accountNumber.trim(),
                ifsc: ifsc.trim().toUpperCase(),
                nextPaymentDate: nextPaymentDate ? new Date(nextPaymentDate).toISOString() : null,
            });
            toast.success("Bank details updated");
            cancelEdit();
        } catch (e) {
            console.error(e);
            toast.error("Failed to update bank details");
        }
    };

    const recordPayment = async (partner: any) => {
        if (!paymentAmount || paymentAmount <= 0) {
            toast.error("Enter a valid amount");
            return;
        }
        try {
            const newTotal = (partner.totalPaid || 0) + paymentAmount;
            const paymentEntry = { amount: paymentAmount, date: new Date().toISOString() };
            await updateDoc(doc(db, "referrals", partner.id), {
                totalPaid: newTotal,
                lastPaidAt: new Date().toISOString(),
                payments: partner.payments ? [...partner.payments, paymentEntry] : [paymentEntry],
            });
            toast.success(`Recorded ₹${paymentAmount} payment`);
            setPaymentAmount(0);
        } catch (e) {
            console.error(e);
            toast.error("Payment record failed");
        }
    };

    const deletePartner = async (id: string) => {
        if (!window.confirm("Delete this staff?")) return;
        try {
            await deleteDoc(doc(db, "referrals", id));
            toast.success("Partner deleted");
        } catch (e) {
            console.error(e);
            toast.error("Delete failed");
        }
    };

    if (loading || isLoading) {
        return (
            <div className="min-h-screen gradient-warm flex items-center justify-center">
                <Loader text="Loading" subtext="Fetching partner data..." />
            </div>
        );
    }

    return (
        <div className="min-h-screen gradient-warm">
            <Header />
            <div className="pt-24 pb-12 px-4 max-w-6xl mx-auto">
                <button onClick={() => navigate("/admin")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </button>
                <h1 className="text-3xl font-black text-foreground mb-8">Staff Bank & Payment Management</h1>
                {/* Partner List */}
                <div className="space-y-6">
                    {referralList.length === 0 ? (
                        <div className="p-10 text-center glass rounded-3xl border-dashed border-2">
                            <p className="text-muted-foreground font-bold italic">No staff created yet.</p>
                        </div>
                    ) : (
                        referralList.map((partner) => (
                            <div key={partner.id} className="p-4 rounded-2xl bg-white border border-border shadow-sm flex flex-col gap-4 group hover:shadow-md transition-all">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black bg-primary/10 text-primary">
                                            {partner.agentName?.charAt(0) ?? "P"}
                                        </div>
                                        <div>
                                            <p className="font-black text-foreground text-sm">{partner.agentName || "Unnamed Staff"}</p>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase">ID: {partner.referralId}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => deletePartner(partner.id)} className="p-2 rounded-xl bg-destructive/5 text-destructive hover:bg-destructive hover:text-white transition-all">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => startEdit(partner)} className="p-2 rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                {/* Bank Details */}
                                <div className="flex flex-col xl:flex-row gap-4 pt-4 border-t border-border/50">
                                    <div className="flex-1 space-y-1">
                                        <p className="text-[10px] font-black uppercase text-muted-foreground">Bank Details</p>
                                        {partner.bankName ? (
                                            <>
                                                <p className="text-sm font-bold text-foreground">{partner.bankName} - {partner.accountName}</p>
                                                <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                                                    <span>A/C: <span className="text-foreground tracking-wider">{partner.accountNumber}</span></span>
                                                    <span>IFSC: <span className="text-foreground uppercase">{partner.ifsc}</span></span>
                                                </div>
                                            </>
                                        ) : (
                                            <p className="text-sm font-bold text-muted-foreground italic">No bank details provided</p>
                                        )}
                                    </div>
                                    {/* Payment Summary */}
                                    <div className="flex items-center gap-4 xl:gap-6 shrink-0">
                                        <div className="text-right">
                                            <p className="text-sm font-black text-green-600">₹{(partner.totalPaid || 0).toFixed(0)}</p>
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Paid so far</p>
                                            {partner.lastPaidAt && <p className="text-[8px] text-muted-foreground mt-0.5">{new Date(partner.lastPaidAt).toLocaleDateString()}</p>}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-rose-600">₹{Math.max(0, (partner.earnings || 0) - (partner.totalPaid || 0)).toFixed(0)}</p>
                                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Pending</p>
                                        </div>
                                    </div>
                                </div>
                                {/* Record Payment */}
                                <div className="flex items-center gap-4 mt-4">
                                    <input
                                        type="number"
                                        placeholder="Amount"
                                        value={paymentAmount || ""}
                                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                        className="w-24 px-2 py-1 border rounded text-sm"
                                    />
                                    <button
                                        onClick={() => recordPayment(partner)}
                                        className="px-4 py-1 bg-primary/10 text-primary rounded font-black text-xs uppercase hover:bg-primary hover:text-white transition"
                                    >
                                        Record Payment
                                    </button>
                                </div>
                                {/* Edit Bank Details Inline */}
                                {editingId === partner.id && (
                                    <>
                                        {/* Payment History */}
                                        {partner.payments && partner.payments.length > 0 && (
                                            <div className="mt-4 p-4 bg-secondary/5 rounded-lg border border-border">
                                                <h5 className="text-sm font-black uppercase mb-2">Payment History</h5>
                                                <ul className="space-y-1 text-xs">
                                                    {partner.payments
                                                        .slice()
                                                        .reverse()
                                                        .map((p: any, idx: number) => (
                                                            <li key={idx} className="flex justify-between text-muted-foreground">
                                                                <span>{new Date(p.date).toLocaleDateString()}</span>
                                                                <span>₹{p.amount}</span>
                                                            </li>
                                                        ))}
                                                </ul>
                                            </div>
                                        )}
                                        {/* Edit Bank Details */}
                                        <div className="mt-4 p-4 bg-secondary/10 rounded-lg border border-border">
                                            <h4 className="text-sm font-black uppercase mb-2">Edit Bank Details</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <input type="text" placeholder="Bank Name" value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full px-3 py-2 rounded border" />
                                                <input type="text" placeholder="Account Holder" value={accountName} onChange={(e) => setAccountName(e.target.value)} className="w-full px-3 py-2 rounded border" />
                                                <input type="text" placeholder="Account Number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="w-full px-3 py-2 rounded border" />
                                                <input type="text" placeholder="IFSC" value={ifsc} onChange={(e) => setIfsc(e.target.value)} className="w-full px-3 py-2 rounded border" />
                                                <input type="date" placeholder="Next Payment Date" value={nextPaymentDate?.split('T')[0] || ''} onChange={(e) => setNextPaymentDate(e.target.value)} className="w-full px-3 py-2 rounded border" />
                                            </div>
                                            <div className="flex gap-2 mt-3">
                                                <button onClick={saveBankDetails} className="px-4 py-1 bg-green-500 text-white rounded font-bold text-xs">Save</button>
                                                <button onClick={cancelEdit} className="px-4 py-1 bg-gray-300 text-gray-800 rounded font-bold text-xs">Cancel</button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPartnerBank;
