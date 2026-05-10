import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, MapPin, ShoppingCart, Store, ArrowRight, Sparkles, Smartphone, ChevronRight, Menu, X, Star, Zap, Users } from 'lucide-react';
const heroBg = '/assets/hero-bg.jpg';
import { useApp } from '@/context/AppContext';
import QRCodeWithLogo from '@/components/ui/qr-code-with-logo';
import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);



  return (
    <div className="min-h-screen gradient-warm">
      <Helmet>
        <title>BellBasket - The Top Neighborhood Marketplace for Local Stores & Shops</title>
        <meta name="description" content="BellBasket is the leading neighborhood marketplace connecting you with trusted local stores, near shops, and daily essentials. Discover the best neighborhood marketplace for fresh groceries and local shopping near you." />
        <meta name="keywords" content="neighborhood marketplace, neighborhood stores, neighborhood shops, near stores, near shops, local marketplace, hyper-local commerce, support local shops, marketplace near me, neighborhood commerce platform" />
        <meta property="og:title" content="BellBasket - Your Trusted Neighborhood Marketplace" />
        <meta property="og:description" content="Shop from your favorite neighborhood stores on India's top neighborhood marketplace. Supporting local vendors with a premium digital experience." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://bellbasket.com/" />
        <meta property="og:image" content="https://bellbasket.com/og-image.jpg" />
        <link rel="canonical" href="https://bellbasket.com/" />
        
        {/* Structured Data for SEO */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "BellBasket",
            "url": "https://bellbasket.com/",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://bellbasket.com/browse?q={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "BellBasket",
            "url": "https://bellbasket.com/",
            "logo": "https://bellbasket.com/logo.png",
            "sameAs": [
              "https://twitter.com/bellbasket",
              "https://instagram.com/bellbasket"
            ]
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "What is BellBasket?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "BellBasket is the top local commerce platform for neighborhood stores. It is a hyper-local marketplace that connects you with trusted stores and near shops in your neighborhood. We empower local vendors by giving them a digital storefront while providing customers with a convenient way to shop from nearby local marketplaces."
                }
              },
              {
                "@type": "Question",
                "name": "How do I order from a local store?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Simply set your location to discover stores near you. Browse their catalog, add items to your basket, and place your order. You can then pick up your items directly from the store at your convenience."
                }
              },
              {
                "@type": "Question",
                "name": "Can I become a vendor on BellBasket?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes! Any local store owner, home-based business, or vendor can join BellBasket. Click on 'Become a Vendor', set up your shop profile, and start listing your products to reach customers in your neighborhood."
                }
              }
            ]
          })}
        </script>
      </Helmet>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0">
          {/* @ts-expect-error React 18 types don't support fetchpriority lowercase, but DOM requires it */}
          <img src={heroBg} alt="Bustling Indian neighborhood market storefront with fresh groceries" fetchpriority="high" loading="eager" className="w-full h-full object-cover opacity-60 object-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/40 to-background/95" />
        </div>

        {/* Landing Header */}
        <div className="absolute top-0 left-0 right-0 z-50 p-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 glass px-4 py-2 rounded-full border border-white/20">
              <span className="text-xl font-black text-foreground tracking-tighter">BellBasket</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">


              {/* Desktop Menu */}
              <div className="hidden md:flex items-center gap-3">
                <Link to="/about" className="text-sm font-bold text-foreground/80 hover:text-foreground transition-colors glass px-4 py-2 rounded-full border border-white/20">
                  About
                </Link>
                <Link to="/careers" className="text-sm font-bold text-foreground/80 hover:text-foreground transition-colors glass px-4 py-2 rounded-full border border-white/20">
                  Careers
                </Link>
                {user ? (
                  <Link 
                    to={user.role === 'vendor' ? '/vendor' : '/browse'} 
                    className="text-sm font-bold text-primary-foreground transition-colors gradient-primary px-4 py-2 rounded-full shadow-sm hover:opacity-90"
                  >
                    Go to App
                  </Link>
                ) : (
                  <Link to="/auth" className="text-sm font-bold text-foreground/80 hover:text-foreground transition-colors glass px-4 py-2 rounded-full border border-white/20">
                    Sign In
                  </Link>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <button 
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl glass border border-white/20 text-foreground active:scale-95 transition-all"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu Drawer */}
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden mt-2 glass rounded-2xl overflow-hidden border border-white/20 max-w-[200px] ml-auto"
              >
                <div className="p-2 flex flex-col">
                  <Link to="/about" className="px-4 py-2.5 rounded-xl hover:bg-white/5 font-bold text-sm text-foreground transition-colors">About</Link>
                  <Link to="/careers" className="px-4 py-2.5 rounded-xl hover:bg-white/5 font-bold text-sm text-foreground transition-colors">Careers</Link>
                  {user ? (
                    <Link 
                      to={user.role === 'vendor' ? '/vendor' : '/browse'} 
                      className="mt-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs text-center uppercase tracking-widest"
                    >
                      Go to App
                    </Link>
                  ) : (
                    <Link to="/auth" className="mt-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs text-center uppercase tracking-widest">Sign In</Link>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 border border-white/20">
                <span className="text-xs font-bold text-primary uppercase tracking-widest">Find It. Grab It.</span>
              </div>
              <Link to="/careers" className="hidden sm:inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 border border-primary/20 hover:bg-primary/20 transition-all border-dashed">
                <span className="text-[10px] font-black uppercase tracking-widest">We're Hiring!</span>
              </Link>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-foreground leading-tight mb-6">
              Search <br />
              <span className="text-gradient">neighborhood stores</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg">
              Find neighborhood shops and near stores on BellBasket, the top local commerce platform for neighborhood stores. Discover the best neighborhood marketplaces for fresh groceries and daily essentials directly from your local vendors.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              {user ? (
                <button
                  onClick={() => navigate(user.role === 'vendor' ? '/vendor' : '/browse')}
                  className="gradient-primary text-primary-foreground px-8 py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  Go to App <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => navigate('/auth')}
                  onMouseEnter={() => import('@/pages/Auth')}
                  className="gradient-primary text-primary-foreground px-8 py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  Get Started <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => navigate('/auth?role=vendor')}
                onMouseEnter={() => import('@/pages/Auth')}
                className="glass text-foreground px-8 py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors"
              >
                <Store className="w-4 h-4" /> Become a Vendor
              </button>
            </div>

            {/* Live Stats Bar */}
            <div className="mt-8 flex items-center gap-6">
              <div className="flex items-center gap-2 glass px-4 py-2 rounded-full border border-white/10">
                <Store className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">
                  100+
                </span>
                <span className="text-xs text-muted-foreground">Stores</span>
              </div>
              <div className="flex items-center gap-2 glass px-4 py-2 rounded-full border border-white/10">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-foreground">
                  5K+
                </span>
                <span className="text-xs text-muted-foreground">Members</span>
              </div>
            </div>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              onClick={() => navigate('/download')}
              className="mt-8 flex items-center gap-2 text-sm font-bold text-foreground/60 hover:text-primary transition-colors group"
            >
              <Smartphone className="w-4 h-4" /> Download BellBasket App <ArrowRight className="w-4 h-4 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-foreground text-center mb-12"
          >
            How it works
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: MapPin, title: 'Set Location', desc: 'Pin your location and discover neighborhood stores & marketplaces within your reach.' },
              { icon: ShoppingCart, title: 'Fill Your Basket', desc: 'Browse near shops, add to cart and choose your preferred local payment method.' },
              { icon: Bell, title: 'Get Notified', desc: 'Track order status from neighborhood shops and pick up when fresh and ready.' },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="glass rounded-2xl p-8 text-center"
              >
                <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4">
                  <f.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Download App Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent to-primary/5">
        <div className="max-w-6xl mx-auto">
          <div className="glass rounded-[3rem] p-8 md:p-16 flex flex-col md:flex-row items-center justify-between gap-12 border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />

            <div className="flex-1 space-y-6 text-center md:text-left z-10">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm border border-primary/10">
                <Smartphone className="w-3.5 h-3.5" />
                Mobile App
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
                Shop on-the-go with <br />
                <span className="text-gradient">BellBasket Mobile</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-lg">
                Get the best neighborhood shopping experience. Scanning the QR code will take you directly to our download page.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <div className="gradient-primary text-white px-8 py-4 rounded-2xl font-black text-lg shadow-lg shadow-primary/30 flex items-center justify-center gap-3 cursor-default">
                  Coming Soon <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-6 z-10">
              <QRCodeWithLogo value="https://bellbasket.com/download" size={200} logoSize={45} />
              <div className="flex items-center gap-2 px-6 py-2 bg-white/10 text-foreground rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Scan to Go to Download Page
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Differentiation Section */}
      <section className="py-24 px-4 bg-white dark:bg-[#1a1a1a]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4">Why shop on BellBasket?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">We're digitizing your favorite local stores to bring the neighborhood market directly to your doorstep with guaranteed trust and speed.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                title: "Trusted Local Stores", 
                desc: "Every vendor on our platform is verified. Shop from the same trusted Kirana stores you've known for generations, now with digital convenience.",
                icon: Store
              },
              { 
                title: "Hyper-Local Delivery", 
                desc: "Since products are sourced from stores in your immediate neighborhood, enjoy lightning-fast delivery or quick pickup within minutes.",
                icon: Zap
              },
              { 
                title: "Empower Communities", 
                desc: "Every purchase you make directly supports local entrepreneurs. We help neighborhood stores compete effectively in the digital age.",
                icon: Sparkles
              }
            ].map((item, idx) => (
              <div key={idx} className="glass p-8 rounded-[2.5rem] border border-primary/10 hover:border-primary/30 transition-all group">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <item.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-4">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Block */}
      <section className="py-24 px-4 relative overflow-hidden bg-primary/5">
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
            <div className="max-w-xl">
              <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4 font-outfit uppercase tracking-tighter">Voices from the neighborhood</h2>
              <p className="text-muted-foreground">Hear from the store owners and customers who make the BellBasket community special.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="glass p-10 rounded-[3rem] border border-primary/20 relative">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center font-black text-2xl text-primary shadow-lg ring-4 ring-primary/10">S</div>
                <div>
                  <h4 className="font-bold text-lg">Srinivas Rao</h4>
                  <p className="text-xs text-primary font-black uppercase tracking-widest">SVR Supermarket Manager</p>
                </div>
              </div>
              <p className="text-lg italic text-foreground/80 leading-relaxed mb-6">
                "BellBasket has completely changed how I manage my inventory. I used to rely only on walk-in customers, but now I serve my entire neighborhood digitally. My sales have grown by 30% without any additional marketing!"
              </p>
              <div className="flex items-center gap-1 text-yellow-500">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
              </div>
            </div>

            <div className="glass p-10 rounded-[3rem] border border-primary/20 relative">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center font-black text-2xl text-primary shadow-lg ring-4 ring-primary/10">A</div>
                <div>
                  <h4 className="font-bold text-lg">Ananya Sharma</h4>
                  <p className="text-xs text-primary font-black uppercase tracking-widest">Neighborhood Customer</p>
                </div>
              </div>
              <p className="text-lg italic text-foreground/80 leading-relaxed mb-6">
                "I love being able to support my local Kirana store while having the convenience of an app. The pickup feature is a lifesaver—I order on my way home from work and my groceries are ready when I arrive!"
              </p>
              <div className="flex items-center gap-1 text-yellow-500">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marketplace Backlinks Section - Discover Stores */}
      <section className="py-20 px-4 bg-primary/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-black text-foreground">Discover Our Partner Stores</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Supporting local entrepreneurs and neighborhood kirana stores. Explore the best vendors in your community.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass p-8 rounded-[2.5rem] border border-primary/10 space-y-4 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Groceries & Essentials</h3>
              <p className="text-sm text-muted-foreground">Fresh daily needs, dairy, and snacks from your trusted local kiranas.</p>
              <Link to="/browse?q=grocery" className="inline-flex items-center gap-2 text-primary font-bold text-sm hover:underline pt-2">
                Explore Grocery Stores <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="glass p-8 rounded-[2.5rem] border border-blue-500/10 space-y-4 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Bakery & Sweets</h3>
              <p className="text-sm text-muted-foreground">Freshly baked bread, cakes, and traditional sweets from neighborhood bakeries.</p>
              <Link to="/browse?q=bakery" className="inline-flex items-center gap-2 text-blue-500 font-bold text-sm hover:underline pt-2">
                Explore Bakeries <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="glass p-8 rounded-[2.5rem] border border-green-500/10 space-y-4 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Fruits & Vegetables</h3>
              <p className="text-sm text-muted-foreground">Farm fresh organic produce delivered directly to your kitchen.</p>
              <Link to="/browse?q=vegetables" className="inline-flex items-center gap-2 text-green-500 font-bold text-sm hover:underline pt-2">
                Explore Fresh Markets <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Local Markets Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
            <div className="max-w-xl">
              <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">Shop by Area</h2>
              <p className="text-muted-foreground">Quickly find the best groceries and essentials in these popular local areas across South India and major metros.</p>
            </div>
            <Link to="/browse" className="text-primary font-bold flex items-center gap-2 hover:underline">
              View all stores <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Visakhapatnam", lat: 17.6868, lng: 83.2185 },
              { name: "Hyderabad", lat: 17.3850, lng: 78.4867 },
              { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
              { name: "Chennai", lat: 13.0827, lng: 80.2707 },
              { name: "Kochi", lat: 9.9312, lng: 76.2673 },
              { name: "Vijayawada", lat: 16.5062, lng: 80.6480 },
              { name: "Guntur", lat: 16.3067, lng: 80.4365 },
              { name: "Warangal", lat: 17.9689, lng: 79.5941 },
              { name: "Thiruvananthapuram", lat: 8.5241, lng: 76.9366 },
              { name: "Mysuru", lat: 12.2958, lng: 76.6394 },
              { name: "Coimbatore", lat: 11.0168, lng: 76.9558 },
              { name: "Madurai", lat: 9.9252, lng: 78.1198 },
              { name: "Mumbai", lat: 19.0760, lng: 72.8777 },
              { name: "Delhi", lat: 28.6139, lng: 77.2090 },
              { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
              { name: "Pune", lat: 18.5204, lng: 73.8567 }
            ].map(area => (
              <button
                key={area.name}
                onClick={() => {
                  localStorage.setItem('user_location_name', area.name);
                  localStorage.setItem('user_lat', area.lat.toString());
                  localStorage.setItem('user_lng', area.lng.toString());
                  navigate('/browse');
                }}
                className="glass p-6 rounded-2xl hover:border-primary/50 transition-all group text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">{area.name}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-primary/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-foreground mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Everything you need to know about BellBasket and how we support neighbor shopping.</p>
          </div>
          
          <div className="space-y-4">
            {[
              { 
                q: "What is BellBasket?", 
                a: "BellBasket is a hyper-local marketplace that connects you with trusted stores in your neighborhood. We empower local vendors by giving them a digital storefront while providing customers with a convenient way to shop from nearby shops." 
              },
              { 
                q: "How do I order from a local store?", 
                a: "Simply set your location to discover stores near you. Browse their catalog, add items to your basket, and place your order. You can then pick up your items directly from the store at your convenience." 
              },
              { 
                q: "Can I become a vendor on BellBasket?", 
                a: "Yes! Any local store owner, home-based business, or vendor can join BellBasket. Click on 'Become a Vendor', set up your shop profile, and start listing your products to reach customers in your neighborhood." 
              },
              { 
                q: "Is there a mobile app available?", 
                a: "We are currently in the final stages of launching our mobile app for both Android and iOS. You can shop using our progressive web app now, and scan the QR code in our 'Download' section to get notified when the native app goes live." 
              },
              { 
                q: "What payment methods do you support?", 
                a: "Currently, we only support Cash on Pickup. You can pay directly at the store when you collect your order. This ensures you only pay after verifying your items." 
              },
              {
                q: "Can I book services like plumbers or salons?",
                a: "Yes! BellBasket supports both products and services. You can find local service providers, check their availability, and book time slots directly through the platform."
              },
              {
                q: "How does BellBasket ensure shop quality?",
                a: "Every vendor undergoes a strict verification process. Combined with our community-driven review system, we ensure that you only shop from the most trusted and reliable local partners."
              }
            ].map((faq, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="glass rounded-2xl overflow-hidden border border-primary/10"
              >
                <details className="group">
                  <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                    <span className="text-lg font-bold text-foreground">{faq.q}</span>
                    <span className="transition-transform duration-300 group-open:rotate-180">
                      <ChevronRight className="w-5 h-5 text-primary" />
                    </span>
                  </summary>
                  <div className="px-6 pb-6 text-muted-foreground text-sm leading-relaxed">
                    {faq.a}
                  </div>
                </details>
              </motion.div>
            ))}
          </div>

          <div className="flex justify-center mt-12">
            <button 
              onClick={() => navigate('/faq')}
              className="group glass px-8 py-4 rounded-2xl border border-primary/20 font-black text-sm uppercase tracking-widest text-primary flex items-center gap-3 hover:bg-primary/5 transition-all"
            >
              View All FAQs <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>



      <footer className="py-12 md:py-20 px-4 border-t border-border bg-transparent">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-2 md:col-span-1 space-y-4">
            <span className="font-extrabold text-2xl text-foreground tracking-tighter">BellBasket</span>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your favorite neighborhood marketplace. Shopping local stores and near shops has never been easier.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-foreground mb-4">Top Stores & Areas</h3>
            <ul className="space-y-2">
              {[
                { name: "SVR Supermarket, VSP", path: "/browse?q=SVR" },
                { name: "Heritage Fresh, HYD", path: "/browse?q=Heritage" },
                { name: "Nilgiris, BLR", path: "/browse?q=Nilgiris" },
                { name: "Ratnadeep, HYD", path: "/browse?q=Ratnadeep" },
                { name: "Big Bazaar, VJW", path: "/browse?q=Bazaar" }
              ].map(store => (
                <li key={store.name}>
                  <Link to={store.path} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {store.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-foreground mb-4">Support</h3>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/careers" className="text-sm text-muted-foreground hover:text-primary transition-colors">Careers</Link></li>
              <li><Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms & Conditions</Link></li>
              <li><Link to="/auth" className="text-sm text-muted-foreground hover:text-primary transition-colors">Sign In</Link></li>
              <li><Link to="/auth?role=vendor" className="text-sm text-muted-foreground hover:text-primary transition-colors">Become a Vendor</Link></li>
              <li><Link to="/support" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact Us</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-foreground mb-4">Popular Searches</h3>
            <ul className="space-y-2">
              <li><Link to="/browse" className="text-xs text-muted-foreground hover:text-primary transition-colors">Neighborhood Marketplace</Link></li>
              <li><Link to="/browse" className="text-xs text-muted-foreground hover:text-primary transition-colors">Neighborhood Stores</Link></li>
              <li><Link to="/browse" className="text-xs text-muted-foreground hover:text-primary transition-colors">Neighborhood Shops</Link></li>
              <li><Link to="/browse" className="text-xs text-muted-foreground hover:text-primary transition-colors">Near Stores & Marketplaces</Link></li>
              <li><Link to="/browse" className="text-xs text-muted-foreground hover:text-primary transition-colors">Local Markets Near Me</Link></li>
              <li><Link to="/browse" className="text-xs text-muted-foreground hover:text-primary transition-colors">Kirana Stores Near Me</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-foreground mb-4">Newsletter</h3>
            <p className="text-xs text-muted-foreground mb-4">Get updates on new local stores in your area.</p>
            <div className="flex gap-2">
              <input type="email" placeholder="Email" aria-label="Newsletter email" className="bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-xs w-full focus:outline-none focus:ring-1 focus:ring-primary" />
              <button className="bg-primary text-white p-2 rounded-lg" aria-label="Subscribe to Newsletter"><ArrowRight className="w-4 h-4" aria-hidden="true" /></button>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-border/10">
          <p className="text-xs text-muted-foreground">© 2026 BellBasket. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Proudly Made in India</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;


