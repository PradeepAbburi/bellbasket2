import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { doc, getDoc, updateDoc, arrayUnion, onSnapshot, collection, query, where, orderBy, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { Send, User as UserIcon, Shield, ArrowLeft, Loader2, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    role: string;
    timestamp: string;
    quickReplies?: string[];
}

interface TicketSummary {
    id: string;
    status: string;
    createdAt: string;
    lastMessage?: string;
}

const SupportChat = () => {
    const { id } = useParams<{ id: string }>();
    const { user, loading } = useApp();
    const navigate = useNavigate();
    const [messages, setMessages] = useState<Message[]>([]);
    const [ticket, setTicket] = useState<any>(null);
    const [historyTickets, setHistoryTickets] = useState<TicketSummary[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Fetch Ticket History
    useEffect(() => {
        if (!user || user.role === 'admin') return; // Admins handle tickets differently usually 

        const fetchHistory = async () => {
            let firestoreList: TicketSummary[] = [];
            try {
                const q = query(
                    collection(db, 'support_requests'),
                    where('userId', '==', user.id)
                );
                const snap = await getDocs(q);
                firestoreList = snap.docs.map(d => ({
                    id: d.id,
                    status: d.data().status || 'active',
                    createdAt: d.data().createdAt,
                    lastMessage: d.data().messages?.[d.data().messages.length - 1]?.text
                }));
            } catch (e: any) {
                console.warn("Firestore history fetch failed:", e);
            }

            // Merge with Local Storage Tickets
            try {
                const local = JSON.parse(localStorage.getItem('bellbasket_local_tickets') || '[]');
                const myLocal = local
                    .filter((t: any) => t.userId === user.id)
                    .map((t: any) => ({
                        id: t.id,
                        status: t.status,
                        createdAt: t.createdAt,
                        lastMessage: t.messages?.[t.messages.length - 1]?.text || 'No messages'
                    }));

                const combined = [...firestoreList, ...myLocal].sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                setHistoryTickets(combined);
            } catch (e) {
                console.error("Local history error", e);
                setHistoryTickets(firestoreList);
            }
        };
        fetchHistory();
    }, [user]);

    useEffect(() => {
        if (loading) return;
        if (!user) {
            navigate('/auth');
            return;
        }
        if (!id) {
            navigate('/');
            return;
        }

        // Bot Mode
        if (id === 'bot') {
            setTicket({
                id: 'virtual-assistant',
                status: 'online',
                type: 'bot',
                userId: user.id
            });
            setMessages([
                {
                    id: 'welcome',
                    text: "Hello! I'm your virtual assistant. Since our live support is offline, please select a topic regarding your problem:",
                    senderId: 'bot',
                    senderName: 'Assistant',
                    role: 'admin',
                    timestamp: new Date().toISOString(),
                    quickReplies: ["Order Issue", "Payment/Refund", "Store Setup", "Tech Support", "Connect to Support"]
                }
            ]);
            return;
        }

        // Local Offline Mode
        if (id.startsWith('local-')) {
            const loadLocal = () => {
                const localTickets = JSON.parse(localStorage.getItem('bellbasket_local_tickets') || '[]');
                const found = localTickets.find((t: any) => t.id === id);
                if (found) {
                    setTicket(found);
                    setMessages(found.messages || []);
                } else {
                    toast.error("Ticket not found locally.");
                    navigate(-1);
                }
            };

            loadLocal();
            // Poll for updates (simplified real-time for local)
            const interval = setInterval(loadLocal, 1000);
            return () => clearInterval(interval);
        }

        // Firestore Mode
        const unsubscribe = onSnapshot(doc(db, 'support_requests', id), (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                // Security check
                if (user.role !== 'admin' && data.userId !== user.id) {
                    toast.error("Unauthorized");
                    navigate('/');
                    return;
                }
                setTicket({ id: docSnapshot.id, ...data });
                setMessages(data.messages || []);
            } else {
                toast.error("Ticket not found");
                navigate('/');
            }
        }, (error) => {
            console.error("Chat sync error:", error);
            if (error.code === 'permission-denied') {
                toast.error("Database permission denied.");
            }
        });

        return () => unsubscribe();
    }, [id, user, loading, navigate]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendText = async (text: string) => {
        if (!text.trim() || !id || !user) return;

        if (text === "Connect to Support") {
            handleConnectLive();
            return;
        }

        setIsSending(true);

        // Local Mode Send
        if (id.startsWith('local-')) {
            const newMsg: Message = {
                id: Date.now().toString(),
                text,
                senderId: user.id,
                senderName: user.name || 'User',
                role: user.role === 'admin' ? 'admin' : 'user',
                timestamp: new Date().toISOString()
            };

            const localTickets = JSON.parse(localStorage.getItem('bellbasket_local_tickets') || '[]');
            const idx = localTickets.findIndex((t: any) => t.id === id);
            if (idx !== -1) {
                localTickets[idx].messages.push(newMsg);
                localTickets[idx].updatedAt = new Date().toISOString();
                localStorage.setItem('bellbasket_local_tickets', JSON.stringify(localTickets));
                setMessages(prev => [...prev, newMsg]);
            }
            setIsSending(false);
            setNewMessage('');
            return;
        }

        if (id === 'bot') {
            const userMsg: Message = {
                id: Date.now().toString(),
                text: text,
                senderId: user.id,
                senderName: user.name,
                role: user.role || 'customer',
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, userMsg]);
            setIsSending(false);

            // Bot Reply Logic
            setTimeout(() => {
                let replyText = "I've logged your request. For urgent matters, please email contact@bellbasket.com.";
                const lower = text.toLowerCase();
                let nextOptions: string[] | undefined = undefined;

                if (lower.includes('order') || lower.includes('status')) {
                    replyText = "You can view and manage live orders in the 'Orders' tab. Need help with a specific Order ID?";
                    nextOptions = ["Yes, specific order", "No, general query"];
                }
                else if (lower.includes('payment') || lower.includes('refund')) {
                    replyText = "For payment disputes, please email accounts@bellbasket.com with your Transaction ID.";
                }
                else if (lower.includes('store') || lower.includes('setup')) {
                    replyText = "You can configure store timings and banner in the Dashboard settings panel.";
                }
                else if (lower.includes('tech')) {
                    replyText = "Creating a technical ticket. Please describe the bug.";
                }

                const botMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    text: replyText,
                    senderId: 'bot',
                    senderName: 'Assistant',
                    role: 'admin',
                    timestamp: new Date().toISOString(),
                    quickReplies: nextOptions
                };
                setMessages(prev => [...prev, botMsg]);
            }, 1000);
            return;
        }

        try {
            const msg: Message = {
                id: Date.now().toString(),
                text: text,
                senderId: user.id,
                senderName: user.name,
                role: user.role || 'customer',
                timestamp: new Date().toISOString()
            };

            await updateDoc(doc(db, 'support_requests', id), {
                messages: arrayUnion(msg),
                updatedAt: new Date().toISOString(),
                hasUnreadUser: user.role === 'admin',
                hasUnreadAdmin: user.role !== 'admin'
            });
        } catch (err) {
            console.error("Send error:", err);
            toast.error("Failed to send message");
        } finally {
            setIsSending(false);
        }
    };

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        sendText(newMessage);
        setNewMessage('');
    };

    const handleConnectLive = async () => {
        setIsSending(true);
        const loadingToast = toast.loading("Attempting to connect to live agent...");
        try {
            const docRef = await addDoc(collection(db, "support_requests"), {
                userId: user.id,
                userName: user.name,
                userEmail: user.email || '',
                userRole: user.role || 'customer',
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                messages: [{
                    id: 'init',
                    text: "User requested live agent connection from Bot.",
                    senderId: 'system',
                    senderName: 'System',
                    role: 'system',
                    timestamp: new Date().toISOString()
                }]
            });
            toast.dismiss(loadingToast);
            toast.success("Connected to live queue!");
            navigate(`/support/chat/${docRef.id}`);
        } catch (e: any) {
            toast.dismiss(loadingToast);
            console.error("Live connect error:", e);
            toast.error("Agents currently unavailable (Database locked).");
            setIsSending(false);
        }
    };

    const handleCloseTicket = async () => {
        if (!id || id === 'bot') return;

        if (id.startsWith('local-')) {
            const localTickets = JSON.parse(localStorage.getItem('bellbasket_local_tickets') || '[]');
            const idx = localTickets.findIndex((t: any) => t.id === id);
            if (idx !== -1) {
                localTickets[idx].status = 'closed';
                localStorage.setItem('bellbasket_local_tickets', JSON.stringify(localTickets));
                toast.success('Ticket closed locally');
                navigate(-1);
            }
            return;
        }

        try {
            await updateDoc(doc(db, 'support_requests', id), { status: 'closed' });
            toast.success("Ticket closed.");
            navigate(-1);
        } catch (e) {
            toast.error("Failed to close ticket.");
        }
    };

    const handleBack = () => {
        // If bot or already closed, just go back
        if (id === 'bot' || ticket?.status === 'closed') {
            navigate('/vendor'); // Or -1
        } else {
            setShowCloseConfirm(true);
        }
    };

    if (loading || !ticket) {
        return (
            <div className="min-h-screen gradient-warm flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen gradient-warm flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar - Ticket History */}
            <div className="hidden md:flex flex-col w-80 bg-white/50 backdrop-blur-xl border-r border-white/20 h-screen z-10">
                <div className="p-6 border-b border-white/20">
                    <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" /> History
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {historyTickets.map(t => (
                        <div
                            key={t.id}
                            onClick={() => navigate(`/support/chat/${t.id}`)}
                            className={`p-4 rounded-xl cursor-pointer transition-all border ${t.id === id ? 'bg-primary text-primary-foreground shadow-lg scale-[1.02]' : 'bg-white/40 hover:bg-white/70 border-white/40'}`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full ${t.id === id ? 'bg-white/20 text-white' : 'bg-secondary text-muted-foreground'}`}>
                                    {t.status}
                                </span>
                                <span className={`text-[10px] ${t.id === id ? 'text-white/80' : 'text-muted-foreground'}`}>
                                    {new Date(t.createdAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                                </span>
                            </div>
                            <p className={`text-xs font-medium line-clamp-2 ${t.id === id ? 'text-white/90' : 'text-foreground/80'}`}>
                                {t.lastMessage || 'No messages'}
                            </p>
                            <p className={`text-[10px] mt-2 text-right ${t.id === id ? 'text-white/60' : 'text-muted-foreground'}`}>
                                {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    ))}
                    {historyTickets.length === 0 && (
                        <div className="text-center py-10 text-muted-foreground text-sm">
                            No past tickets found.
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-screen relative">
                {/* Chat Header */}
                <div className="px-6 py-4 bg-white/40 backdrop-blur-md border-b border-white/20 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleBack}
                            className="w-10 h-10 rounded-xl bg-white/50 hover:bg-white flex items-center justify-center transition-colors shadow-sm"
                        >
                            <ArrowLeft className="w-5 h-5 text-foreground" />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-lg font-bold flex items-center gap-2 text-foreground">
                                    {id === 'bot' ? 'Virtual Assistant' : 'Priority Support'}
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${ticket.status === 'closed' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                        {ticket.status || 'Active'}
                                    </span>
                                </h1>
                                {id === 'bot' && (
                                    <button
                                        onClick={handleConnectLive}
                                        className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold shadow-lg hover:scale-105 transition-all animate-pulse"
                                    >
                                        <Shield className="w-3 h-3" /> Connect Live
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">ID: {ticket.id}</p>
                        </div>
                    </div>
                    {/* Status Indicator */}
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${ticket.status === 'closed' ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`} />
                        <span className="text-xs font-bold text-muted-foreground capitalize">{ticket.status}</span>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 py-6 md:px-10">
                    <div className="max-w-3xl mx-auto space-y-6">
                        {messages.length === 0 ? (
                            <div className="text-center py-20 text-muted-foreground">
                                <Shield className="w-16 h-16 mx-auto mb-4 text-primary/20" />
                                <p>Start the conversation with our support team.</p>
                            </div>
                        ) : (
                            messages.map((msg, idx) => {
                                const isMe = msg.senderId === user?.id;
                                const isAdmin = msg.role === 'admin';

                                return (
                                    <motion.div
                                        key={msg.id || idx}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isAdmin ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                                            {isAdmin ? <Shield className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                                        </div>
                                        <div className={`flex flex-col gap-2 max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${isMe
                                                ? 'bg-primary text-primary-foreground rounded-tr-sm'
                                                : 'bg-white border border-white/50 rounded-tl-sm'
                                                }`}>
                                                <div className={`flex items-center gap-2 mb-1 ${isMe ? 'opacity-80' : 'opacity-50'}`}>
                                                    <span className="text-[10px] font-bold uppercase">{msg.senderName}</span>
                                                    <span className="text-[8px]">{new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                                                </div>
                                                {msg.text}
                                            </div>
                                            {msg.quickReplies && (
                                                <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    {msg.quickReplies.map((reply, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => sendText(reply)}
                                                            className="px-3 py-1.5 rounded-full bg-white border border-primary/20 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95"
                                                        >
                                                            {reply}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                        <div ref={bottomRef} />
                    </div>
                </div>

                {/* Input Area */}
                {ticket.status !== 'closed' && (
                    <div className="p-4 bg-white/60 backdrop-blur-md border-t border-white/20 shrink-0">
                        <form onSubmit={sendMessage} className="max-w-3xl mx-auto flex gap-3">
                            <input
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type your message..."
                                disabled={isSending}
                                className="flex-1 bg-white/80 rounded-xl px-5 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all border border-transparent shadow-sm"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim() || isSending}
                                className="bg-primary text-primary-foreground w-14 h-14 rounded-xl flex items-center justify-center hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                            >
                                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* Close Confirm Modal */}
            <AnimatePresence>
                {showCloseConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
                        >
                            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4 mx-auto">
                                <AlertTriangle className="w-6 h-6 text-amber-600" />
                            </div>
                            <h3 className="text-lg font-bold text-center mb-2">Mark as Resolved?</h3>
                            <p className="text-sm text-muted-foreground text-center mb-6">
                                Are you done with this support session? Creating a new ticket later is always free.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="px-4 py-3 rounded-xl bg-secondary text-foreground font-bold text-sm hover:bg-secondary/80 transition-colors"
                                >
                                    Keep Local
                                </button>
                                <button
                                    onClick={handleCloseTicket}
                                    className="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity"
                                >
                                    Yes, Close
                                </button>
                            </div>
                            <button
                                onClick={() => setShowCloseConfirm(false)}
                                className="w-full mt-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
                            >
                                Cancel
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SupportChat;

