import React, { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, Send, CheckCircle, Info, HelpCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useApp } from '@/context/AppContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';

const HelpSupport = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useApp();
    
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [subject, setSubject] = useState(location.state?.prefillSubject || '');
    const [message, setMessage] = useState(location.state?.prefillMessage || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [previousTickets, setPreviousTickets] = useState<any[]>([]);
    const [loadingTickets, setLoadingTickets] = useState(true);

    // Prefill user details if user signs in/updates
    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setEmail(user.email || '');
        }
    }, [user]);

    // Real-time listener for customer's previous tickets
    useEffect(() => {
        if (!user?.id) {
            setPreviousTickets([]);
            setLoadingTickets(false);
            return;
        }
        const q = query(
            collection(db, "support_requests"),
            where("userId", "==", user.id)
        );
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            list.sort((a: any, b: any) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
            });
            setPreviousTickets(list);
            setLoadingTickets(false);
        }, (err) => {
            console.error("Error loading customer support tickets:", err);
            setLoadingTickets(false);
        });
        return () => unsub();
    }, [user?.id]);

    const handleSubmitTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
            toast.error("Please fill in all form fields");
            return;
        }

        setIsSubmitting(true);
        const loadingToast = toast.loading("Creating support ticket...");

        try {
            const ticketData: any = {
                userId: user?.id || 'guest_' + Date.now(),
                userName: name.trim(),
                userEmail: email.trim(),
                userRole: user?.role || 'customer',
                status: 'pending',
                subject: subject.trim(),
                details: message.trim(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                messages: [
                    {
                        id: 'init-sys',
                        text: `Support ticket created regarding: ${subject.trim()}`,
                        senderId: 'system',
                        senderName: 'System',
                        role: 'system',
                        timestamp: new Date().toISOString()
                    },
                    {
                        id: 'init-msg',
                        text: message.trim(),
                        senderId: user?.id || 'guest',
                        senderName: name.trim(),
                        role: user?.role || 'customer',
                        timestamp: new Date().toISOString()
                    }
                ]
            };

            if (location.state?.storeId) {
                ticketData.storeId = location.state.storeId;
            }
            if (location.state?.orderId) {
                ticketData.orderId = location.state.orderId;
            }
            if (location.state?.bookingId) {
                ticketData.bookingId = location.state.bookingId;
            }

            await addDoc(collection(db, "support_requests"), ticketData);

            toast.dismiss(loadingToast);
            toast.success("Support ticket submitted successfully!");
            
            // Clear message form
            setSubject('');
            setMessage('');
        } catch (err) {
            toast.dismiss(loadingToast);
            console.error("Support request creation failed:", err);
            toast.error("Failed to create ticket. Falling back to email support.");
            window.location.href = `mailto:contact@bellbasket.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSelectQuickTopic = (topic: string) => {
        setSubject(topic);
        toast.info(`Topic prefilled: "${topic}"`);
    };

    return (
        <div className="min-h-screen bg-background pb-24 text-left">
            <Helmet>
                <title>Help & Support | BellBasket Customer Service</title>
                <meta name="description" content="Get help with your BellBasket orders, payments, and account. Submit support tickets and view their updated status in real-time." />
            </Helmet>
            
            <div className="p-6 flex items-center gap-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-10">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-secondary rounded-full">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold">Help & Support</h1>
            </div>

            <div className="p-6 space-y-8 max-w-lg mx-auto">
                <div className="text-center pt-6">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                        <MessageSquare className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-black mb-1">Inbound Ticket Portal</h2>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                        State your problem below. Creating a ticket alerts administrative agents, and status updates will be shown here and in notifications.
                    </p>
                </div>

                {/* Form to submit support ticket */}
                <form onSubmit={handleSubmitTicket} className="space-y-4 bg-card border border-border p-6 rounded-[2rem] shadow-sm">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Your Name</label>
                        <input 
                            type="text" 
                            placeholder="e.g. John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full bg-secondary/50 border border-border/80 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-all font-medium"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Email Address</label>
                        <input 
                            type="email" 
                            placeholder="e.g. john@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-secondary/50 border border-border/80 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-all font-medium"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Subject / Problem Area</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Order #12345 Refund Status"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            required
                            className="w-full bg-secondary/50 border border-border/80 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-all font-medium"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">Describe the Issue</label>
                        <textarea 
                            placeholder="Please provide details about what went wrong..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                            rows={4}
                            className="w-full bg-secondary/50 border border-border/80 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-all font-medium resize-none"
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-750 text-white font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                    >
                        <Send className="w-3.5 h-3.5" /> {isSubmitting ? "Creating..." : "Submit Support Ticket"}
                    </button>
                </form>

                {/* Quick pre-fill topics */}
                <div className="space-y-3">
                    <h3 className="font-bold text-sm text-muted-foreground flex items-center gap-1.5">
                        <HelpCircle className="w-4.5 h-4.5 text-primary" />
                        Quick Subject Prefills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {['Account Recovery', 'Payment Issues', 'Vendor Verification', 'Bug Report'].map(topic => (
                            <button
                                key={topic}
                                type="button"
                                onClick={() => handleSelectQuickTopic(topic)}
                                className="px-3.5 py-2 rounded-xl bg-secondary/60 border border-border/70 hover:border-primary/30 text-xs font-bold text-foreground transition-all active:scale-95"
                            >
                                {topic}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Previous Support Tickets */}
                <div className="space-y-4 pt-6 border-t border-border">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-primary" />
                        Your Support Tickets ({previousTickets.length})
                    </h3>
                    
                    {loadingTickets ? (
                        <div className="text-center py-6 text-xs text-muted-foreground">Loading tickets...</div>
                    ) : previousTickets.length === 0 ? (
                        <div className="p-6 text-center border border-dashed border-border rounded-2xl text-xs text-muted-foreground">
                            You have no submitted tickets yet.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {previousTickets.map((t) => {
                                const isResolved = t.status === 'resolved' || t.status === 'closed';
                                return (
                                    <div key={t.id} className="p-5 rounded-[2rem] bg-card border border-border flex flex-col gap-3 shadow-sm">
                                        <div className="flex justify-between items-center">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                isResolved 
                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                            }`}>
                                                {t.status || 'pending'}
                                            </span>
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                                {new Date(t.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-foreground leading-snug break-words">{t.subject || 'Support Request'}</h4>
                                            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words leading-relaxed">{t.details || t.messages?.[t.messages.length - 1]?.text}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Offline Email Support Details */}
                <div className="pt-6 border-t border-border space-y-3">
                    <div className="p-4 rounded-xl bg-secondary/35 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <p className="text-xs font-black text-foreground">Offline Email Support</p>
                            <p className="text-[10px] text-muted-foreground">For issues if the database connection drops</p>
                        </div>
                        <a href="mailto:contact@bellbasket.com" className="text-xs font-bold text-primary hover:underline">
                            contact@bellbasket.com
                        </a>
                    </div>
                </div>

                <div className="text-center text-xs text-muted-foreground pt-6">
                    &copy; {new Date().getFullYear()} BellBasket Support
                </div>
            </div>
        </div>
    );
};

export default HelpSupport;
