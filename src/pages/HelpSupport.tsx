import { ArrowLeft, Mail, ExternalLink, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HelpSupport = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background pb-24">
            <div className="p-6 flex items-center gap-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-10">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-secondary rounded-full">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold">Help & Support</h1>
            </div>

            <div className="p-6 space-y-8 max-w-lg mx-auto">
                <div className="text-center py-10">
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-6 animate-pulse">
                        <Mail className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black mb-2">Contact Us</h2>
                    <p className="text-muted-foreground mb-6 max-w-xs mx-auto leading-relaxed">
                        We are here to help! For any questions or assistance, please reach out to our official support email.
                    </p>

                    <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 p-8 rounded-3xl border border-primary/10 shadow-lg" onClick={() => window.location.href = "mailto:contact.belllbasket1@gmail.com"}>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-3">Official Support Email</p>
                        <a href="mailto:contact.belllbasket1@gmail.com" className="text-xl md:text-2xl font-black text-primary hover:underline break-all">
                            contact.belllbasket1@gmail.com
                        </a>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-primary" />
                        Quick Topics
                    </h3>
                    {['Account Recovery', 'Payment Issues', 'Vendor Verification', 'Bug Report'].map(topic => (
                        <div key={topic} className="p-4 rounded-xl border border-border flex items-center justify-between hover:bg-secondary/50 cursor-pointer transition-colors group" onClick={() => window.location.href = "mailto:contact.belllbasket1@gmail.com?subject=" + encodeURIComponent(topic)}>
                            <span className="font-medium text-sm group-hover:text-primary transition-colors">{topic}</span>
                            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                    ))}
                </div>

                <div className="text-center text-xs text-muted-foreground pt-10">
                    &copy; {new Date().getFullYear()} BellBasket Support
                </div>
            </div>
        </div>
    );
};

export default HelpSupport;
