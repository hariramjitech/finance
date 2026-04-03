import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
    return (
        <section className="h-screen w-full bg-[#fcfcfc] flex items-center justify-center relative overflow-hidden font-inter selection:bg-indigo-500 selection:text-white">

            {/* Background Decor - Animated Gradient Blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-purple-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
                <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] bg-indigo-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] bg-pink-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
            </div>

            {/* Main Content Container - Glassmorphism */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-full max-w-5xl mx-4 md:mx-auto bg-white/60 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-[600px]"
            >

                {/* Left Side: Visual/GIF */}
                <div className="w-full md:w-1/2 bg-white flex items-center justify-center p-8 relative overflow-hidden group">
                    {/* Subtle grid background for the image area */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                    <motion.div
                        className="relative z-10 w-full max-w-sm"
                        whileHover={{ scale: 1.05, rotate: -2 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                        <img
                            src="https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif"
                            alt="Lost in Space"
                            className="w-full h-auto object-contain drop-shadow-2xl rounded-2xl grayscale-[20%] group-hover:grayscale-0 transition-all duration-500"
                        />
                        {/* Floating '404' Badge */}
                        <div className="absolute -bottom-6 -right-6 bg-gray-900 text-white text-xl font-bold px-6 py-2 rounded-full shadow-xl rotate-12 border-4 border-white">
                            Error 404
                        </div>
                    </motion.div>
                </div>

                {/* Right Side: Content */}
                <div className="w-full md:w-1/2 p-10 md:p-14 flex flex-col justify-center text-left relative">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                    >
                        <h4 className="text-indigo-600 font-bold uppercase tracking-widest text-sm mb-2">System Malfunction</h4>
                        <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-6 leading-tight tracking-tight">
                            Houston, we have a <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">problem.</span>
                        </h1>
                        <p className="text-gray-500 text-lg mb-10 leading-relaxed max-w-md">
                            It seems you've ventured into the void. The page you are looking for has been abducted by aliens or never existed.
                        </p>

                        <div className="flex flex-wrap gap-4">
                            <Link
                                to="/dashboard"
                                className="group relative px-8 py-4 bg-gray-900 text-white font-semibold rounded-xl overflow-hidden shadow-lg hover:shadow-indigo-500/30 transition-all hover:-translate-y-1"
                            >
                                <span className="absolute inset-0 w-full h-full bg-indigo-600 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out"></span>
                                <span className="relative flex items-center gap-2">
                                    <Home size={18} />
                                    Return to Base
                                </span>
                            </Link>

                            <button
                                onClick={() => window.history.back()}
                                className="px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2 hover:-translate-y-1"
                            >
                                <ArrowLeft size={18} />
                                Go Back
                            </button>
                        </div>
                    </motion.div>

                    {/* Bottom Decorative Code Snippet */}
                    <div className="absolute bottom-6 right-6 opacity-10 font-mono text-xs text-right hidden md:block select-none pointer-events-none">
                        <p>{`{`}</p>
                        <p className="pl-4">{`"error": "not_found",`}</p>
                        <p className="pl-4">{`"code": 404,`}</p>
                        <p className="pl-4">{`"message": "void_entry_detected"`}</p>
                        <p>{`}`}</p>
                    </div>
                </div>

            </motion.div>
        </section>
    );
};

export default NotFound;
