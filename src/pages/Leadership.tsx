import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Github, Twitter, Linkedin, ArrowLeft, Mail, Sparkles, Code2, Palette, Globe, Zap } from 'lucide-react';
import { Helmet } from 'react-helmet';

const TEAM_MEMBERS = [
    {
        name: 'Pradeep Abburi',
        role: 'Founder, CEO & CTO',
        bio: 'The driving force behind our technical architecture and strategic vision. Dedicated to building high-performance systems that empower neighborhood vendors across Bharat.',
        image: '/assets/team/pradeep.png',
        icon: Zap,
        color: 'bg-amber-500',
        linkedin: 'https://www.linkedin.com/in/pradeep-abburi-a88929252/',
        x: 'https://x.com/'
    },
    {
        name: 'Md. Afrid Basha',
        role: 'Co-Founder & CMO',
        bio: 'Strategic lead for market expansion and brand growth. Focused on building a hyper-local ecosystem that connects millions of customers with local creators.',
        icon: Code2,
        color: 'bg-blue-500',
        linkedin: 'https://www.linkedin.com/in/mohammed-afrid-basha-a47876292/',
        x: 'https://x.com/'
    }
];

const Leadership = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen gradient-warm">
            <Helmet>
                <title>Leadership - BellBasket</title>
                <meta name="description" content="Meet the leadership team driving BellBasket's hyper-local marketplace mission." />
            </Helmet>

            <div className="pt-8 pb-32 px-4 max-w-4xl mx-auto space-y-16">
                {/* Back Button */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors glass px-4 py-2 rounded-full border border-white/20"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>
                    <div className="text-xl font-black text-foreground tracking-tighter glass px-4 py-2 rounded-full border border-white/20">
                        BellBasket
                    </div>
                </div>

                {/* Header */}
                <div className="text-center space-y-6 max-w-2xl mx-auto">
                    <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 border border-primary/20 bg-primary/5 text-primary">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-widest">Leadership • Big Mission</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-foreground leading-tight">
                        Our <span className="text-gradient">Leadership</span> Team
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        We are a dedicated group of innovators passionate about empowering local vendors and simplifying neighborhood shopping across Bharat.
                    </p>
                </div>

                {/* Team Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                    {TEAM_MEMBERS.map((member, i) => (
                        <motion.div
                            key={member.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="glass rounded-3xl p-8 space-y-6 border border-white/40 hover:border-primary/30 transition-all group relative overflow-hidden"
                        >
                            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                            
                            <div className="flex flex-col items-center gap-6 relative z-10">
                                {member.image ? (
                                    <div className="w-32 h-32 md:w-48 md:h-48 relative">
                                        <img src={member.image} alt={member.name} className="w-full h-full object-contain relative z-10" />
                                        <div className={`absolute inset-0 ${member.color} opacity-20 blur-3xl rounded-full`} />
                                    </div>
                                ) : (
                                    <div className={`w-32 h-32 md:w-40 md:h-40 rounded-3xl ${member.color} flex items-center justify-center text-white shadow-2xl border-4 border-white/50`}>
                                        <member.icon className="w-16 h-16 md:w-20 md:h-20" />
                                    </div>
                                )}
                                <div className="text-center">
                                    <h3 className="text-2xl font-black text-foreground leading-tight">{member.name}</h3>
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-primary mt-1">{member.role}</p>
                                </div>
                            </div>

                            <p className="text-muted-foreground text-sm leading-relaxed relative z-10">
                                {member.bio}
                            </p>

                            <div className="flex items-center gap-4 pt-2 relative z-10">
                                {member.linkedin && (
                                    <button 
                                        onClick={() => window.open(member.linkedin, '_blank')}
                                        className="p-2 rounded-xl bg-secondary hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                                    >
                                        <Linkedin className="w-4 h-4" />
                                    </button>
                                )}
                                {member.x && (
                                    <button 
                                        onClick={() => window.open(member.x, '_blank')}
                                        className="p-2 rounded-xl bg-secondary hover:bg-primary/10 hover:text-primary transition-colors h-8 w-8 flex items-center justify-center"
                                    >
                                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Support Box */}
                <div className="glass rounded-[2rem] p-8 text-center border-dashed border-2 border-primary/20 bg-primary/5">
                    <p className="text-sm font-bold text-muted-foreground">
                        Interested in joining our mission? <span 
                            onClick={() => navigate('/careers')}
                            className="text-primary hover:underline cursor-pointer"
                        >
                            Explore our Careers Page!
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Leadership;
