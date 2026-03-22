import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Store, ShoppingCart, MapPin, Bell, ShieldCheck, ArrowRight, CheckCircle2, ArrowLeft, HeartHandshake, TrendingUp, Truck, Headphones, Sparkles } from 'lucide-react';
import { Helmet } from 'react-helmet';

const About = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen gradient-warm">
            <Helmet>
                <title>About BellBasket | How it Works for Shoppers & Vendors</title>
                <meta name="description" content="Discover how BellBasket works. We empower local neighborhood stores to sell online and enable customers to shop fresh groceries and daily essentials directly from kirana shops and local vendors." />
                <meta name="keywords" content="BellBasket, how it works, local shopping app, grocery delivery, support local business, neighborhood kirana stores, become a vendor, sell groceries online" />
                <meta property="og:title" content="About BellBasket | How it Works" />
                <meta property="og:description" content="Discover how BellBasket digitizes neighborhood kirana stores, empowering vendors and giving customers the convenience of local shopping." />
                <meta property="og:url" content="https://bellbasket.com/about" />
                <link rel="canonical" href="https://bellbasket.com/about" />
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "AboutPage",
                        "name": "About BellBasket",
                        "description": "BellBasket is a hyper-local marketplace that empowers local stores to sell online and enables customers to shop fresh groceries and daily essentials directly from their trusted neighborhood vendors.",
                        "url": "https://bellbasket.com/about",
                        "publisher": {
                            "@type": "Organization",
                            "name": "BellBasket"
                        },
                        "mainEntity": {
                            "@type": "ItemList",
                            "itemListElement": [
                                {
                                    "@type": "ListItem",
                                    "position": 1,
                                    "name": "How it Works for Shoppers",
                                    "description": "Shoppers can set their location, browse products from verified local stores, add items to their basket, and choose between fast delivery or store pickup."
                                },
                                {
                                    "@type": "ListItem",
                                    "position": 2,
                                    "name": "How it Works for Vendors",
                                    "description": "Vendors can set up a digital storefront in minutes, manage products and inventory instantly, receive orders securely, and boost visibility using Pro features."
                                },
                                {
                                    "@type": "ListItem",
                                    "position": 3,
                                    "name": "Trust & Security",
                                    "description": "All vendors are verified and transactions are secured using industry-leading encryption to ensure a safe local shopping environment."
                                }
                            ]
                        }
                    })}
                </script>
            </Helmet>

            <div className="pt-8 pb-32 px-4 max-w-6xl mx-auto space-y-24">

                {/* Back Button & Logo */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors glass px-4 py-2 rounded-full border border-white/20"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>
                    <div className="text-2xl font-black text-foreground tracking-tighter glass px-4 py-2 rounded-full border border-white/20">
                        BellBasket
                    </div>
                </div>

                {/* Intro Section */}
                <div className="text-center space-y-6 max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 glass rounded-full px-5 py-2.5 border border-primary/20 bg-primary/5 text-primary">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-widest">About BellBasket Marketplace</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-foreground leading-[1.1] tracking-tight">
                        Connecting Bharat to its <span className="text-gradient">Neighborhood</span>
                    </h1>
                    <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto font-medium">
                        BellBasket is India's premier hyper-local marketplace. We empower local neighborhood stores (Kiranas) to sell online, enabling customers to shop fresh groceries and daily essentials directly from their trusted community vendors with fast, reliable delivery.
                    </p>
                </div>

                {/* Section 1: The Core Mission & Vision */}
                <div className="grid md:grid-cols-2 gap-8">
                    <section className="bg-white/40 dark:bg-slate-900/40 rounded-[3rem] p-8 md:p-12 border border-white/50 shadow-xl overflow-hidden relative">
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
                        <div className="space-y-6 relative z-10">
                            <h2 className="text-3xl font-black text-foreground">1. Our Core Mission</h2>
                            <p className="text-muted-foreground text-lg leading-relaxed">
                                We believe in the power of local communities. Our mission is to digitize neighborhood kirana stores, bakeries, and fresh produce vendors, giving them the tools to compete in the modern digital age while providing customers with the unparalleled convenience of local shopping.
                            </p>
                            <div className="flex items-center gap-4 text-primary font-bold">
                                <HeartHandshake className="w-6 h-6" /> Support Local Businesses
                            </div>
                        </div>
                    </section>

                    <section className="bg-white/40 dark:bg-slate-900/40 rounded-[3rem] p-8 md:p-12 border border-white/50 shadow-xl overflow-hidden relative">
                        <div className="absolute -top-24 -left-24 w-64 h-64 bg-accent/10 rounded-full blur-[80px] pointer-events-none" />
                        <div className="space-y-6 relative z-10">
                            <h2 className="text-3xl font-black text-foreground">2. Our Core Vision</h2>
                            <p className="text-muted-foreground text-lg leading-relaxed">
                                Our vision is to become Bharat's most trusted hyper-local ecosystem, where every neighborhood vendor is just a click away from their customers. We aim to create a future where tradition meets technology, preserving the charm of local commerce while embracing digital excellence.
                            </p>
                            <div className="flex items-center gap-4 text-accent font-bold">
                                <TrendingUp className="w-6 h-6" /> Empowering Bharat's Economy
                            </div>
                        </div>
                    </section>
                </div>

                {/* Section 2: How Shoppers Use BellBasket */}
                <section className="space-y-12">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl font-black text-foreground">2. How Shoppers Use BellBasket</h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">Everything you need, available instantly from the stores right around your corner. Here's how to get started:</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="glass rounded-[2rem] p-8 space-y-4 hover:border-primary/30 transition-all text-center">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto">
                                <MapPin className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">Set Location</h3>
                            <p className="text-sm text-muted-foreground">Pin your exact location or search your area to discover all the verified local stores near you.</p>
                        </div>

                        <div className="glass rounded-[2rem] p-8 space-y-4 hover:border-primary/30 transition-all text-center">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto">
                                <ShoppingCart className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">Fill Your Basket</h3>
                            <p className="text-sm text-muted-foreground">Browse through live catalogs of local stores, compare prices, and seamlessly add items to your cart.</p>
                        </div>

                        <div className="glass rounded-[2rem] p-8 space-y-4 hover:border-primary/30 transition-all text-center">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto">
                                <Truck className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">Fast Delivery/Pickup</h3>
                            <p className="text-sm text-muted-foreground">Choose secure payment options or cash on delivery and get your items delivered fast or pick them up yourself.</p>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <button
                            onClick={() => navigate('/browse')}
                            className="px-8 py-4 rounded-2xl gradient-primary text-white font-bold text-lg shadow-xl shadow-primary/20 hover:shadow-2xl hover:scale-105 transition-all"
                        >
                            Start Shopping Now
                        </button>
                    </div>
                </section>

                {/* Section 3: Vendor Empowerment */}
                <section className="bg-gradient-to-br from-primary/10 to-transparent rounded-[3rem] p-8 md:p-12 border border-primary/20 shadow-lg">
                    <div className="grid md:grid-cols-2 gap-12 items-center flex-row-reverse">
                        <div className="glass rounded-[2rem] p-8 border-2 border-white/50 order-2 md:order-1">
                            <img src="https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=800" alt="Store Owner" className="rounded-2xl object-cover h-64 w-full" />
                        </div>
                        <div className="space-y-6 order-1 md:order-2">
                            <h2 className="text-3xl font-black text-foreground">3. Empowering Local Vendors</h2>
                            <p className="text-muted-foreground text-lg leading-relaxed">
                                We provide a zero-hassle digital platform for shop owners. Within minutes, vendors can set up their digital storefront, upload products, set their timings, and start accepting online orders.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" /> <span className="font-medium">Easy Inventory Management</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" /> <span className="font-medium">Direct Customer Communication</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" /> <span className="font-medium">Secure Payments Tracking</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Section 4: Safety & Trust */}
                <section className="glass rounded-[3rem] p-8 md:p-12 text-center border overflow-hidden relative">
                    <div className="max-w-3xl mx-auto space-y-6 relative z-10">
                        <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-6">
                            <ShieldCheck className="w-10 h-10 text-blue-500" />
                        </div>
                        <h2 className="text-3xl font-black text-foreground">4. Built on Trust & Security</h2>
                        <p className="text-muted-foreground text-lg leading-relaxed">
                            Trust is the foundation of local commerce. BellBasket ensures that all vendors are verified, and all transactions are secured using industry-leading encryption. We maintain strict quality and moderation guidelines to ensure a safe shopping environment for everyone.
                        </p>
                    </div>
                </section>

                {/* Section 5: Growth & Support */}
                <section className="bg-secondary/30 rounded-[3rem] p-8 md:p-16 border border-border">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-black text-foreground mb-4">5. Continuous Growth & Support</h2>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Whether you are a customer needing assistance or a vendor looking to scale your business, we are here to help.</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        <div className="glass p-8 rounded-[2rem] flex items-start gap-4 hover:border-primary/30 transition-all">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <ShoppingCart className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-2">Shop Near You</h3>
                                <p className="text-sm text-muted-foreground mb-4">Discover hundreds of verified local stores in your area. Buy local, grow local!</p>
                                <div className="flex flex-wrap gap-2">
                                  {["Grocery", "Bakery", "Fruits", "Organic"].map(cat => (
                                    <Link key={cat} to={`/browse?q=${cat}`} className="text-[10px] font-black uppercase text-primary border border-primary/20 px-2 py-1 rounded-md hover:bg-primary/5">{cat}</Link>
                                  ))}
                                </div>
                            </div>
                        </div>
                        <div className="glass p-8 rounded-[2rem] flex items-start gap-4 hover:border-primary/30 transition-all">
                            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                                <TrendingUp className="w-6 h-6 text-orange-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-2">Vendor Success</h3>
                                <p className="text-sm text-muted-foreground mb-4">Advanced analytics and featured placements help our partner vendors double their sales volume in just months.</p>
                                <Link to="/auth?role=vendor" className="text-[10px] font-black uppercase text-orange-500 hover:underline">Grow Your Store</Link>
                            </div>
                        </div>
                        <div className="glass p-8 rounded-[2rem] flex items-start gap-4 hover:border-primary/30 transition-all md:col-span-2 lg:col-span-1">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                                <Headphones className="w-6 h-6 text-purple-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg mb-2">24/7 Support</h3>
                                <p className="text-sm text-muted-foreground mb-4">Dedicated local support in English, Hindi, and Telugu to resolve any order or account queries promptly.</p>
                                <a href="mailto:support@bellbasket.com" className="text-[10px] font-black uppercase text-purple-500 hover:underline">Contact Support</a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Call to Action for Vendors */}
                <section className="bg-foreground text-background rounded-[3rem] p-8 md:p-16 text-center relative overflow-hidden shadow-2xl">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
                    <div className="relative z-10 max-w-2xl mx-auto space-y-8">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
                            <Store className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black leading-tight">
                            Ready to take your store <span className="text-primary">online?</span>
                        </h2>
                        <p className="text-lg opacity-80">
                            Join thousands of smart local businesses scaling up with BellBasket today. Setup takes just 5 minutes.
                        </p>
                        <button
                            onClick={() => navigate('/auth?role=vendor')}
                            className="px-8 py-5 rounded-2xl bg-primary text-white font-black text-lg hover:scale-105 hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-3 mx-auto mt-8 w-full sm:w-auto"
                        >
                            Sign Up as Vendor
                            <ArrowRight className="w-6 h-6" />
                        </button>
                    </div>
                </section>

            </div>
        </div>
    );
};

export default About;
