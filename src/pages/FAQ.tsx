import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle, ChevronRight, Search, MessageCircle, Mail, Phone, ExternalLink } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { useState } from 'react';

const FAQ = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    const categories = [
        {
            title: "General & Getting Started",
            id: "started",
            questions: [
                { q: "What is BellBasket?", a: "BellBasket is the top local commerce platform for neighborhood stores. It is a hyper-local marketplace designed to connect you with trusted stores and service providers in your neighborhood. We empower local vendors by giving them a digital storefront while providing customers with a convenient way to shop or book services from nearby shops." },
                { q: "How do I create an account?", a: "Click on the 'Sign In' button on the landing page or home page. You can sign up using your email and a password, or through secure social login options like Google." },
                { q: "Is BellBasket free for customers?", a: "Yes, browsing, searching, and placing orders or bookings through BellBasket is completely free for customers. You only pay the vendor directly for the products or services you receive." },
                { q: "Which areas does BellBasket cover?", a: "We are currently expanding rapidly across various neighborhoods. Simply set your location on the home page to see verified stores and services available in your immediate vicinity." },
                { q: "Can I use BellBasket on my mobile phone?", a: "Absolutely! BellBasket is built as a Progressive Web App (PWA), meaning you can use it on any mobile browser. You can even 'Add to Home Screen' for a native app experience." }
            ]
        },
        {
            title: "Shopping for Products",
            id: "products",
            questions: [
                { q: "How do I order products from a local store?", a: "Set your location, browse the available product stores (Groceries, Electronics, Fashion, etc.), add items to your basket, and place your order. Once confirmed, you can visit the store to pick up your items." },
                { q: "When can I pick up my order?", a: "You can visit the store during their operational hours once your order status changes to 'Ready for Pickup'. Store timings are clearly displayed on each store's detail page." },
                { q: "Can I cancel a product order?", a: "Yes, you can cancel your order from the 'My Orders' section as long as the vendor hasn't started preparing it. If it's already being prepared, please contact the store directly." },
                { q: "How do I know if a product is in stock?", a: "Vendors update their inventory in real-time. If a product is visible and has an 'Add to Basket' button, it is typically available. If it's out of stock, it will be labeled accordingly." },
                { q: "What if I receive a damaged product?", a: "Since our current model is Store Pickup, we recommend verifying all items at the store during collection. If you find an issue later, please contact the vendor using the details on your receipt." }
            ]
        },
        {
            title: "Service Bookings",
            id: "services",
            questions: [
                { q: "How do I book a service (Plumber, Salon, etc.)?", a: "Search for the service you need, select a provider, choose your preferred date and time slot, and fill in your details. The provider will review and accept your booking." },
                { q: "Is there a booking fee?", a: "No, BellBasket does not charge any convenience or booking fees. You pay the full service amount directly to the provider after the service is completed." },
                { q: "How do I find the service provider's location?", a: "Once a booking is made, the exact location and contact details of the provider are available on your digital receipt. You can also use the 'Directions' button to navigate via Google Maps." },
                { q: "What happens if a service provider doesn't show up?", a: "If the provider is coming to your location and fails to arrive, or if you visit their store and they are unavailable, please report the issue through our Support Center or email us at contact@bellbasket.com." },
                { q: "Can I reschedule my service booking?", a: "Currently, you should contact the service provider directly to request a reschedule. Their phone number is provided on your booking receipt." }
            ]
        },
        {
            title: "Payments & Financials",
            id: "payments",
            questions: [
                { q: "What payment methods are supported?", a: "We currently support 'Pay at Store/Site'. You can pay using Cash, UPI, or Cards directly to the vendor during pickup or after service delivery." },
                { q: "Why can't I pay online through the app?", a: "We've disabled online payments to ensure maximum transparency. You only pay after you've personally verified the products or received the service, eliminating refund delays and payment failures." },
                { q: "What if a vendor charges me more than the app price?", a: "App prices are set by vendors. If there's a discrepancy, please show them the app price. You can always report price mismatches through our support chat." },
                { q: "Do I get a receipt for my order?", a: "Yes, every order or booking generates a digital receipt in the 'My Orders' section of the app. This receipt serves as your proof of purchase." }
            ]
        },
        {
            title: "Vendor & Partner Support",
            id: "vendors",
            questions: [
                { q: "How do I list my store on BellBasket?", a: "Click on 'Become a Vendor' in the menu, complete your shop setup, and start adding products. Our team will verify your shop within 24 hours." },
                { q: "What are the charges for vendors?", a: "BellBasket works on a simple subscription model. We don't take any commission on your sales, allowing you to keep 100% of your earnings." },
                { q: "How do I manage my inventory?", a: "You can use the Vendor Dashboard to add, edit, or remove products, manage categories, and set stock levels in real-time." },
                { q: "Who handles the delivery?", a: "Currently, BellBasket focuses on a 'Pickup' model where customers visit your store. This eliminates delivery logistics and ensures the freshest experience for the customer." }
            ]
        },
        {
            title: "Security & Privacy",
            id: "security",
            questions: [
                { q: "Is my personal data safe with BellBasket?", a: "Absolutely. We use industry-standard encryption to protect your data. Your contact details are only shared with a vendor once you place a confirmed order or booking." },
                { q: "How do you verify the quality of stores?", a: "We have a strict verification process for vendors. Additionally, our community-driven review system ensures that only the best-rated stores and services stay prominent on the platform." },
                { q: "Can I delete my account and data?", a: "Yes, you can request account deletion through the 'Settings' section in your profile. All your personal data will be permanently removed from our active databases." }
            ]
        }
    ];

    const filteredCategories = categories.map(cat => ({
        ...cat,
        questions: cat.questions.filter(q => 
            q.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
            q.a.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(cat => cat.questions.length > 0);

    return (
        <div className="min-h-screen gradient-warm pb-20">
            <Helmet>
                <title>FAQ - BellBasket Neighborhood Marketplace</title>
                <meta name="description" content="Find answers about the top neighborhood marketplace. Learn about ordering from local stores, booking near shops, and vendor setup on BellBasket." />
                <meta name="keywords" content="neighborhood marketplace faq, local stores help, neighborhood shops support, how bellbasket works, local shopping questions" />
            </Helmet>

            <div className="max-w-4xl mx-auto px-4 pt-10 space-y-12">
                {/* Header */}
                <div className="space-y-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors glass px-4 py-2 rounded-full border border-white/20"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>
                    <div className="text-center space-y-4">
                        <h1 className="text-4xl md:text-6xl font-black text-foreground tracking-tight">
                            How can we <span className="text-gradient">help?</span>
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                            Search for topics or browse our most frequently asked questions.
                        </p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative max-w-2xl mx-auto">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input 
                        type="text" 
                        placeholder="Search for questions..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 rounded-3xl py-6 pl-16 pr-6 text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                    />
                </div>

                {/* FAQ Content */}
                <div className="space-y-16">
                    {filteredCategories.length > 0 ? (
                        filteredCategories.map((category) => (
                            <section key={category.id} className="space-y-6">
                                <h2 className="text-2xl font-black text-foreground flex items-center gap-3">
                                    <HelpCircle className="w-6 h-6 text-primary" />
                                    {category.title}
                                </h2>
                                <div className="space-y-4">
                                    {category.questions.map((faq, idx) => (
                                        <motion.div 
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            className="glass rounded-2xl overflow-hidden border border-primary/10 hover:border-primary/30 transition-all"
                                        >
                                            <details className="group">
                                                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                                                    <span className="text-lg font-bold text-foreground break-words">{faq.q}</span>
                                                    <span className="transition-transform duration-300 group-open:rotate-180 shrink-0 ml-4">
                                                        <ChevronRight className="w-5 h-5 text-primary" />
                                                    </span>
                                                </summary>
                                                <div className="px-6 pb-6 text-muted-foreground text-sm leading-relaxed border-t border-primary/5 pt-4">
                                                    {faq.a}
                                                </div>
                                            </details>
                                        </motion.div>
                                    ))}
                                </div>
                            </section>
                        ))
                    ) : (
                        <div className="text-center py-20 glass rounded-[3rem] border-dashed border-2 border-white/20">
                            <p className="text-xl font-bold text-muted-foreground">No questions found matching your search.</p>
                            <button onClick={() => setSearchQuery('')} className="mt-4 text-primary font-black uppercase tracking-widest text-sm hover:underline underline-offset-4">
                                Clear Search
                            </button>
                        </div>
                    )}
                </div>

                {/* Support Contact */}
                <div className="bg-foreground text-background rounded-[3rem] p-8 md:p-12 text-center space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full" />
                    <div className="relative z-10 space-y-6">
                        <h2 className="text-3xl font-black">Still have questions?</h2>
                        <p className="opacity-80 max-w-md mx-auto">
                            If you couldn't find the answer you were looking for, our friendly support team is just an email away.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <a href="mailto:contact@bellbasket.com" className="bg-primary text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:scale-105 transition-all">
                                <Mail className="w-5 h-5" />
                                Email Support
                            </a>
                            <button onClick={() => navigate('/support')} className="glass text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-white/10 transition-all border-white/20">
                                <MessageCircle className="w-5 h-5" />
                                Support Center
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FAQ;
