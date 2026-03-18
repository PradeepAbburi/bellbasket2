import { motion } from 'framer-motion';
import { FileText, ChevronLeft, Scale, ShieldCheck, ClipboardCheck, AlertTriangle, UserCheck, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';

const TermsAndConditions = () => {
    const navigate = useNavigate();

    const sections = [
        {
            icon: UserCheck,
            title: '1. Acceptance of Terms',
            content: 'By accessing or using BellBasket, you agree to be bound by these Terms and Conditions. If you do not agree to all of these terms, do not use our services. We provide a hyperlocal marketplace platform connecting neighborhood customers with local vendors.'
        },
        {
            icon: ClipboardCheck,
            title: '2. User Accounts',
            content: 'You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. We reserve the right to suspend accounts that violate our community standards.'
        },
        {
            icon: Scale,
            title: '3. Payments & Refunds',
            content: 'BellBasket facilitates transactions between users and vendors. Payment terms are dictated by the chosen method (Pay on Delivery, Pay on Pickup, or Online). Refunds and cancellations are subject to the individual store policies and must be resolved directly with the vendor, though we may mediate in disputes.'
        },
        {
            icon: AlertTriangle,
            title: '4. Prohibited Content',
            content: 'Users and vendors are prohibited from posting fraudulent, misleading, offensive, or illegal content. Vendors must ensure their product listings are accurate and comply with local food safety and trade regulations.'
        },
        {
            icon: ShieldCheck,
            title: '5. Limitation of Liability',
            content: 'BellBasket provides a platform "as is" and is not responsible for the quality, safety, or legality of items sold by independent vendors. We are not liable for any indirect or consequential losses arising from your use of the marketplace.'
        },
        {
            icon: MessageSquare,
            title: '6. Communication',
            content: 'By using BellBasket, you consent to receive transactional communications regarding your orders via email, phone, or push notifications. You may opt-out of marketing communications in your profile settings.'
        }
    ];

    return (
        <div className="min-h-screen gradient-warm">
            <Helmet>
                <title>Terms & Conditions - BellBasket</title>
                <meta name="description" content="Read the Terms and Conditions for using BellBasket Hyperlocal Marketplace." />
            </Helmet>

            <div className="pt-20 pb-20 px-4 max-w-4xl mx-auto">
                <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-primary font-bold mb-8 hover:gap-3 transition-all group"
                >
                    <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                    Back
                </motion.button>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-[2rem] p-8 md:p-12 border border-white/20 shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />

                    <div className="flex items-center gap-6 mb-12 relative z-10">
                        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-white shrink-0 shadow-lg">
                            <FileText className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-foreground tracking-tight">Terms & Conditions</h1>
                            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mt-1">Last updated: March 12, 2026</p>
                        </div>
                    </div>

                    <div className="space-y-12 relative z-10">
                        {sections.map((section, i) => (
                            <motion.div
                                key={section.title}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="group/item"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover/item:bg-primary group-hover/item:text-white transition-all duration-300">
                                        <section.icon className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-2xl font-black text-foreground tracking-tight">{section.title}</h2>
                                </div>
                                <p className="text-muted-foreground leading-relaxed pl-14 text-base md:text-lg">
                                    {section.content}
                                </p>
                            </motion.div>
                        ))}
                    </div>

                    <div className="mt-20 pt-10 border-t border-border/50 text-center relative z-10">
                        <p className="text-sm text-muted-foreground">
                            Questions about our terms? Contact our legal team at{' '}
                            <a href="mailto:contact.belllbasket1@gmail.com" className="text-primary font-black hover:underline tracking-tight">
                                contact.belllbasket1@gmail.com
                            </a>
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default TermsAndConditions;
