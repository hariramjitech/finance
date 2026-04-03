import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import {
    ShieldCheck, Bot, FileText, ArrowRight, Menu, X, ChevronRight, Play, Globe, Lock,
    Zap, Users, TrendingUp, PieChart, Target, Terminal, Calendar
} from 'lucide-react';
import Lenis from 'lenis';

/* -------------------------------------------------------------------------- */
/*                                  DATA                                      */
/* -------------------------------------------------------------------------- */

const METRICS = [
    { label: "Assets Tracked", value: "$4.2B+" },
    { label: "Active Users", value: "85k+" },
    { label: "Countries", value: "140+" },
];

const CORE_FEATURES = [
    {
        title: "AI Financial Advisor",
        description: "Meet FinBot. Context-aware chat that knows your balance and budgets. Use NLP to 'Spent 50 on Lunch' or scan receipts with Gemini Vision.",
        icon: Bot,
        color: "from-fuchsia-500 to-pink-500"
    },
    {
        title: "Live Investments",
        description: "Real-time stock & crypto tracking via Yahoo Finance. Auto-updates portfolio values and calculates profit/loss instantly.",
        icon: TrendingUp,
        color: "from-emerald-400 to-green-500"
    },
    {
        title: "Family Finance Sync",
        description: "Invite members to join shared goals. View unified analytics with currency normalization while maintaining individual privacy.",
        icon: Users,
        color: "from-orange-400 to-red-500"
    },
    {
        title: "Smart Budgeting",
        description: "AI analyzes 3-month spending history to suggest realistic limits. Real-time adherence tracking with 'Spent vs Limit' alerts.",
        icon: PieChart,
        color: "from-blue-400 to-indigo-500"
    },
];

const DETAILED_SOLUTIONS = [
    {
        title: "Advanced Authentication",
        desc: "JWT with Bcrypt hashing. Secure forgot-password flows and multi-currency profile management.",
        icon: Lock
    },
    {
        title: "Gamification Engine",
        desc: "Earn XP for transactions. Track daily streaks and compete on the global leaderboard.",
        icon: TrophyIcon
    },
    {
        title: "Recurring & Subs",
        desc: "Subscription Assassin detects patterns. Cron jobs auto-process payments at midnight.",
        icon: Calendar
    },
    {
        title: "Reports & Exports",
        desc: "Generate professional PDFs or export raw CSV data. Email reports with one click.",
        icon: FileText
    }
];

// Helper icon component since Lucide used directly above
function TrophyIcon(props) {
    return <Target {...props} />;
}

/* -------------------------------------------------------------------------- */
/*                              UI COMPONENTS                                 */
/* -------------------------------------------------------------------------- */

const Spotlight = () => {
    const mouseX = useSpring(0, { stiffness: 500, damping: 100 });
    const mouseY = useSpring(0, { stiffness: 500, damping: 100 });

    useEffect(() => {
        const handleMouseMove = ({ clientX, clientY }) => {
            mouseX.set(clientX);
            mouseY.set(clientY);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [mouseX, mouseY]);

    return (
        <motion.div
            className="fixed top-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none z-0"
            style={{ x: mouseX, y: mouseY, translateX: '-50%', translateY: '-50%' }}
        />
    );
};

const TiltCard = ({ children, className = "" }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
    const mouseY = useSpring(y, { stiffness: 500, damping: 100 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["7deg", "-7deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-7deg", "7deg"]);

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className={`transition-all duration-200 ease-out ${className}`}
        >
            <div style={{ transform: "translateZ(20px)" }}>
                {children}
            </div>
        </motion.div>
    );
};

const TextReveal = ({ text, className = "", delay = 0 }) => {
    // Split text into words, then characters for precise control
    const words = text.split(" ");

    return (
        <span className={className}>
            {words.map((word, i) => (
                <span key={i} className="inline-block whitespace-nowrap mr-[0.25em] overflow-hidden align-bottom">
                    <motion.span
                        initial={{ y: "100%" }}
                        whileInView={{ y: 0 }}
                        viewport={{ once: true }}
                        transition={{
                            duration: 0.5,
                            delay: delay + (i * 0.05),
                            ease: [0.33, 1, 0.68, 1] // Cubic bezier for smoothness
                        }}
                        className="inline-block"
                    >
                        {word}
                    </motion.span>
                </span>
            ))}
        </span>
    );
};

const MagneticButton = ({ children, className = "", onClick }) => {
    const ref = React.useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const handleMouse = (e) => {
        const { clientX, clientY } = e;
        const { left, top, width, height } = ref.current.getBoundingClientRect();
        const middleX = clientX - (left + width / 2);
        const middleY = clientY - (top + height / 2);
        setPosition({ x: middleX * 0.15, y: middleY * 0.15 });
    };

    const reset = () => {
        setPosition({ x: 0, y: 0 });
    };

    return (
        <motion.button
            ref={ref}
            onMouseMove={handleMouse}
            onMouseLeave={reset}
            animate={{ x: position.x, y: position.y }}
            transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
            className={className}
            onClick={onClick}
        >
            {children}
        </motion.button>
    );
};

const Navbar = () => {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            setIsMenuOpen(false);
        }
    };

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-slate-950/90 backdrop-blur-xl border-b border-white/5 py-4' : 'bg-transparent py-8'}`}>
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                <div onClick={() => navigate('/')} className="flex items-center gap-3 cursor-pointer group">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all">
                        <span className="text-white font-bold font-mono text-xl">F</span>
                    </div>
                </div>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-10 bg-white/5 px-8 py-3 rounded-full border border-white/5 backdrop-blur-sm">
                    {[
                        { name: 'Platform', id: 'features' },
                        { name: 'Solutions', id: 'solutions' },
                        { name: 'Developers', id: 'developers' }
                    ].map((item) => (
                        <button
                            key={item.name}
                            onClick={() => scrollToSection(item.id)}
                            className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                        >
                            {item.name}
                        </button>
                    ))}
                </div>

                <div className="hidden md:flex items-center gap-4">
                    <button onClick={() => navigate('/login')} className="text-sm font-medium text-white hover:text-indigo-300 transition-colors">Log In</button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate('/register')} className="bg-white text-slate-950 hover:bg-indigo-50 text-sm font-semibold py-2.5 px-6 rounded-full transition-all">
                        Get Started
                    </motion.button>
                </div>

                {/* Mobile Menu Toggle */}
                <button className="md:hidden text-white p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    {isMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Nav */}
            <div className={`md:hidden absolute top-full left-0 right-0 bg-slate-950 border-b border-slate-800 transition-all duration-300 ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="flex flex-col p-6 gap-4">
                    {['platform', 'solutions', 'developers'].map((item) => (
                        <button
                            key={item}
                            onClick={() => scrollToSection(item === 'platform' ? 'features' : item)}
                            className="text-left text-slate-300 hover:text-white py-3 border-b border-slate-800 capitalize"
                        >
                            {item}
                        </button>
                    ))}
                    <button onClick={() => navigate('/login')} className="text-left text-slate-300 hover:text-white py-3">Log In</button>
                    <button onClick={() => navigate('/register')} className="bg-indigo-600 text-white font-semibold py-4 rounded-xl text-center mt-2">Get Started</button>
                </div>
            </div>
        </nav>
    );
};

const useCountUp = (end, duration = 2) => {
    const [count, setCount] = useState(0);
    const countMotion = useSpring(0, { duration: duration * 1000 });

    useEffect(() => {
        countMotion.set(parseInt(end.replace(/[^0-9]/g, '')));
        const unsubscribe = countMotion.on("change", (latest) => {
            setCount(Math.floor(latest));
        });
        return () => unsubscribe();
    }, [end, countMotion]);

    return count;
};

const ScrollProgress = () => {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    return (
        <motion.div
            className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 origin-left z-[100]"
            style={{ scaleX }}
        />
    );
};

const Hero = () => {
    const navigate = useNavigate();
    const { scrollY } = useScroll();
    const opacity = useTransform(scrollY, [0, 300], [1, 0]);
    const y = useTransform(scrollY, [0, 300], [0, 100]);
    const rotate = useTransform(scrollY, [0, 300], [0, 5]);

    return (
        <section className="relative min-h-screen flex items-center pt-20 overflow-hidden perspective-1000">
            {/* Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{ duration: 8, repeat: Infinity }}
                    className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px]"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{ duration: 10, repeat: Infinity, delay: 1 }}
                    className="absolute bottom-[10%] left-[5%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px]"
                />
            </div>

            <motion.div style={{ opacity, y, rotateX: rotate }} className="container mx-auto px-6 relative z-10 font-sans">
                <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1, ease: "circOut" }}
                        className="relative z-20"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-900/30 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-medium uppercase tracking-widest mb-6">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            System v2.0 Online
                        </div>

                        <h1 className="text-6xl md:text-9xl font-bold text-white tracking-tighter mb-8 leading-[0.9]">
                            <TextReveal text="Beyond" className="block text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" delay={0.1} />
                            <TextReveal text="Nature." className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 drop-shadow-[0_0_25px_rgba(168,85,247,0.4)]" delay={0.4} />
                        </h1>

                        <p className="text-xl text-slate-400 mb-10 max-w-xl mx-auto font-light leading-relaxed">
                            Financial intelligence that evolves. <span className="text-slate-200 font-medium">Liquid. Reactive. Eternal.</span>
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <MagneticButton
                                onClick={() => navigate('/register')}
                                className="group relative bg-white text-black px-10 py-5 rounded-full font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(99,102,241,0.6)] hover:shadow-[0_0_60px_-15px_rgba(99,102,241,0.8)]"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    Initialize <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                            </MagneticButton>

                            <MagneticButton className="px-10 py-5 rounded-full font-bold text-white border border-white/10 hover:bg-white/5 backdrop-blur-sm transition-all flex items-center justify-center gap-2 group text-lg">
                                <Play className="w-4 h-4 fill-white/80 group-hover:fill-white transition-colors" /> Demo Protocol
                            </MagneticButton>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </section>
    );
};

const FeatureCard = ({ feature, index }) => {
    const mouseX = useSpring(0, { stiffness: 500, damping: 100 });
    const mouseY = useSpring(0, { stiffness: 500, damping: 100 });

    function onMouseMove({ currentTarget, clientX, clientY }) {
        const { left, top, width, height } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    return (
        <TiltCard className="h-full">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onMouseMove={onMouseMove}
                className="group relative bg-slate-900 border border-slate-800 p-8 rounded-3xl overflow-hidden hover:border-indigo-500/50 transition-colors h-full"
            >
                <motion.div
                    className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-300 group-hover:opacity-100"
                    style={{
                        background: useTransform(
                            [mouseX, mouseY],
                            ([x, y]) => `radial-gradient(400px circle at ${x}px ${y}px, rgba(99,102,241,0.15), transparent 80%)`
                        ),
                    }}
                />

                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${feature.color} opacity-10 blur-3xl group-hover:opacity-20 transition-opacity duration-500`} />

                <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 text-white border border-slate-700 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg relative z-10">
                    <feature.icon className="w-7 h-7" />
                </div>

                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-300 transition-colors relative z-10">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed font-light relative z-10">{feature.description}</p>
            </motion.div>
        </TiltCard>
    );
};

const FeatureGrid = () => {
    return (
        <section id="features" className="py-24 relative z-10">
            <div className="container mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight"
                    >
                        Features that <span className="text-indigo-400">redefine</span> control.
                    </motion.h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {CORE_FEATURES.map((feature, idx) => (
                        <FeatureCard key={idx} feature={feature} index={idx} />
                    ))}
                </div>
            </div>
        </section>
    );
};

const BentonContent = () => {
    return (
        <section id="solutions" className="py-24 relative z-10 border-t border-slate-900/50">
            <div className="container mx-auto px-6">
                <div className="mb-16">
                    <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Complete Financial Ecosystem</h2>
                    <p className="text-slate-400 text-lg font-light max-w-xl">From scanning receipts to predicting your Future Balance.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-fr">
                    {/* Large Card - Analytics */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-10 relative overflow-hidden group min-h-[300px]"
                    >
                        <div className="relative z-10 max-w-md">
                            <h3 className="text-3xl font-bold text-white mb-4">Predictive Analytics</h3>
                            <p className="text-slate-400 text-lg font-light leading-relaxed">
                                Linear regression models forecast your 6-month balance. Get "Warning" alerts if your expense trend outweighs your income growth.
                            </p>
                        </div>
                        <div className="absolute right-0 bottom-0 w-1/2 h-full bg-indigo-500/5 backdrop-blur-sm p-4 transition-transform group-hover:scale-[1.02] duration-500">
                            <div className="w-full h-full relative overflow-hidden flex items-end">
                                <div className="w-full flex items-end gap-2 h-32 px-4 pb-4">
                                    {[30, 45, 35, 60, 50, 75, 90].map((h, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ height: 0 }}
                                            whileInView={{ height: `${h}%` }}
                                            viewport={{ once: true }}
                                            transition={{ duration: 1, delay: i * 0.1, type: "spring" }}
                                            className="flex-1 bg-indigo-500/40 rounded-t-sm hover:bg-indigo-500/60 transition-colors"
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Small Card - Fraud Detection */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden hover:border-red-500/30 transition-colors group">
                        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 text-red-400 group-hover:rotate-12 transition-transform duration-500 border border-red-500/20">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Fraud Guard</h3>
                        <p className="text-slate-400 font-light leading-relaxed">AI heuristic checks block anomalies &gt; 5x deviation.</p>
                    </div>

                    {/* Grid of smaller solutions */}
                    {DETAILED_SOLUTIONS.map((sol, i) => (
                        <div key={i} className="bg-slate-900/40 border border-slate-800/50 rounded-3xl p-6 hover:bg-slate-800/60 transition-colors">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-2 bg-slate-800 rounded-lg text-indigo-400">
                                    <sol.icon size={20} />
                                </div>
                                <h3 className="font-bold text-white">{sol.title}</h3>
                            </div>
                            <p className="text-sm text-slate-400">{sol.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

const DeveloperSection = () => {
    return (
        <section id="developers" className="py-24 relative z-10 bg-slate-950">
            <div className="container mx-auto px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-8">
                        <Terminal size={12} />
                        Built for Scale
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-12">Robust Server Architecture</h2>
                    <div className="grid md:grid-cols-3 gap-8 text-left">
                        {[
                            { title: "Rate Limiting", desc: "Brute-force protection on Auth (30 req/15m) and AI endpoints (10 req/1m)." },
                            { title: "Secure Headers", desc: "Full HPP (Parameter Pollution) protection and CSP implementation." },
                            { title: "Bulk Operations", desc: "Optimized POST /bulk endpoints for importing massive datasets." }
                        ].map((item, i) => (
                            <div key={i} className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 hover:border-indigo-500/30 transition-colors">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 mb-4">
                                    <CheckIcon />
                                </div>
                                <h4 className="text-white font-bold mb-2">{item.title}</h4>
                                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

// Helper for check icon
function CheckIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    )
}

const HowItWorks = () => {
    return (
        <section className="py-24 relative z-10">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Master your money in <span className="text-indigo-400">3 steps</span></h2>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        { step: "01", title: "Connect", desc: "Link your accounts or upload statements securely.", color: "from-blue-600 to-indigo-600" },
                        { step: "02", title: "Analyze", desc: "AI scans transactions for patterns, subs, and fraud.", color: "from-indigo-500 to-cyan-500" },
                        { step: "03", title: "Optimize", desc: "Get actionable insights to grow your wealth instantly.", color: "from-cyan-500 to-blue-500" }
                    ].map((item, i) => (
                        <TiltCard key={i} className="h-full relative z-10">
                            <div className="relative h-full">
                                {/* Connector Line - Old Style but Visible */}
                                {i !== 2 && (
                                    <div className="hidden md:block absolute top-1/2 -right-12 w-24 h-[1px] bg-gradient-to-r from-indigo-500/50 to-transparent z-0 pointer-events-none" />
                                )}

                                <motion.div
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.2, duration: 0.8, type: "spring", bounce: 0.3 }}
                                    className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl overflow-hidden group hover:border-indigo-500/50 transition-all h-full shadow-2xl"
                                >
                                    <div className={`absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br ${item.color} blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity duration-500`} />

                                    {/* Number - Exactly Old Style (Big & Corner) but Great (White & Glowing) */}
                                    <span className="text-6xl font-bold text-white absolute top-6 right-8 select-none drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] opacity-90 group-hover:opacity-100 transition-opacity">{item.step}</span>

                                    <div className="relative z-10 mt-16">
                                        <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-indigo-300 transition-colors">{item.title}</h3>
                                        <p className="text-slate-400 group-hover:text-slate-200 transition-colors leading-relaxed">{item.desc}</p>
                                    </div>
                                </motion.div>
                            </div>
                        </TiltCard>
                    ))}
                </div>
            </div>
        </section>
    );
};

const Testimonials = () => {
    const testimonials = [
        { name: "Alex R.", role: "Freelancer", text: "The AI receipt scanner is a lifesaver for my taxes. Unbelievably accurate." },
        { name: "Sarah K.", role: "Product Manager", text: "Finally, a dashboard that makes sense. The forecasting tool is spot on." },
        { name: "James L.", role: "Crypto Trader", text: "Love the live portfolio tracking. Integrating Yahoo Finance was a genius move." },
        { name: "Emily W.", role: "Student", text: "Helped me save for my tuition fees. The gamification makes saving actually fun." },
        { name: "Michael T.", role: "Small Business", text: "The security features give me peace of mind. Best finance app I've used." },
        { name: "Lisa M.", role: "Accountant", text: "I recommend this to all my clients. The export features are perfect." }
    ];

    return (
        <section className="py-24 relative z-10 overflow-hidden">
            <div className="container mx-auto px-6 mb-12 text-center">
                <h2 className="text-3xl font-bold text-white">Trusted by early adopters</h2>
            </div>

            <div className="flex overflow-hidden mask-linear-gradient">
                <motion.div
                    className="flex gap-6 pr-6"
                    animate={{ x: "-50%" }}
                    transition={{
                        duration: 20,
                        ease: "linear",
                        repeat: Infinity
                    }}
                    style={{ width: "fit-content" }}
                >
                    {[...testimonials, ...testimonials, ...testimonials].map((t, idx) => (
                        <div key={idx} className="w-[350px] flex-shrink-0 bg-white/5 backdrop-blur-lg border border-white/10 p-6 rounded-2xl whitespace-normal hover:bg-white/10 transition-colors relative group">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                            <p className="text-slate-300 mb-6 italic relative z-10">"{t.text}"</p>
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                                    {t.name[0]}
                                </div>
                                <div>
                                    <h4 className="text-white font-bold text-sm">{t.name}</h4>
                                    <p className="text-slate-400 text-xs">{t.role}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};



const CTA = () => {
    return (
        <section className="py-32 relative z-10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 via-slate-900 to-slate-950 z-0" />
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px] z-0" />
            <div className="absolute rounded-full w-96 h-96 bg-indigo-600/30 blur-[120px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse-slow" />

            <div className="container mx-auto px-6 relative text-center z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7 }}
                    className="max-w-4xl mx-auto"
                >
                    <h2 className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tighter">
                        Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 animate-gradient-x">master</span> <br />
                        <span className="text-indigo-400">control</span>?
                    </h2>
                    <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto font-light">
                        Join thousands of high-growth individuals who have already made the switch to FinanceHub's intelligent platform.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <button onClick={() => window.location.href = '/register'} className="bg-white text-slate-950 px-10 py-5 rounded-2xl font-bold hover:bg-slate-100 transition-all shadow-2xl hover:scale-105 active:scale-95 text-lg">
                            Start 14-day Free Trial
                        </button>
                        <button className="px-10 py-5 rounded-2xl font-bold text-white border border-slate-700 hover:bg-slate-800/50 backdrop-blur-sm transition-all text-lg">
                            Contact Sales
                        </button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

const Footer = () => {
    return (
        <footer className="bg-slate-950 border-t border-slate-900 py-20 relative z-10 text-slate-400 font-light">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-10 mb-16">
                    <div className="col-span-2 lg:col-span-2">
                        <div className="flex items-center gap-2 mb-6">
                            <span className="text-white font-bold text-2xl tracking-tight">Finance<span className="text-indigo-500">Hub</span></span>
                        </div>
                        <p className="max-w-xs mb-8 text-slate-500">The next generation of financial management. Secure, intelligent, and designed for growth.</p>
                        <div className="flex gap-4">
                            {['tw', 'li', 'gh'].map((social, i) => (
                                <div key={i} className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all cursor-pointer border border-slate-800">
                                    <span className="uppercase text-xs font-bold">{social}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6">Product</h4>
                        <ul className="space-y-4">
                            {['Features', 'Pricing', 'Security', 'Roadmap', 'Changelog'].map(item => (
                                <li key={item}><a href="#" className="hover:text-indigo-400 transition-colors">{item}</a></li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6">Company</h4>
                        <ul className="space-y-4">
                            {['About', 'Careers', 'Blog', 'Contact', 'Partners'].map(item => (
                                <li key={item}><a href="#" className="hover:text-indigo-400 transition-colors">{item}</a></li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6">Resources</h4>
                        <ul className="space-y-4">
                            {['Documentation', 'API Reference', 'Status', 'Help Center'].map(item => (
                                <li key={item}><a href="#" className="hover:text-indigo-400 transition-colors">{item}</a></li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6">Legal</h4>
                        <ul className="space-y-4">
                            {['Privacy', 'Terms', 'Cookie Policy', 'Licenses'].map(item => (
                                <li key={item}><a href="#" className="hover:text-indigo-400 transition-colors">{item}</a></li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6 text-sm">
                    <div>© 2025 FinanceHub Inc. All rights reserved.</div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-emerald-500 font-medium">All Systems Operational</span>
                        </div>
                        <div className="flex gap-4">
                            <a href="#" className="hover:text-white transition-colors">Privacy</a>
                            <a href="#" className="hover:text-white transition-colors">Terms</a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default function Landing() {
    useEffect(() => {
        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            direction: 'vertical',
            gestureDirection: 'vertical',
            smooth: true,
            mouseMultiplier: 1,
            smoothTouch: false,
            touchMultiplier: 2,
        });

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);

        return () => {
            lenis.destroy();
        };
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30 selection:text-indigo-100 font-sans relative overflow-x-hidden bg-grid-white/[0.02]">
            <div className="fixed inset-0 bg-slate-950/80 pointer-events-none z-[-1]" />
            <ScrollProgress />
            {/* <LandingScene /> */}
            <Spotlight />
            <Navbar />
            <main>
                <Hero />
                <FeatureGrid />
                <BentonContent />
                <HowItWorks />
                <DeveloperSection />
                <Testimonials />
                <CTA />
            </main>
            <Footer />
        </div>
    );
}
