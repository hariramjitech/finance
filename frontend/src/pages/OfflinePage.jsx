import React from 'react';
import { WifiOff, Home, RefreshCw, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const OfflinePage = ({ onContinueOffline }) => {
    const navigate = useNavigate();

    const handleRetry = () => {
        window.location.reload();
    };

    const handleContinue = () => {
        if (onContinueOffline) {
            onContinueOffline();
        }
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
                <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
            </div>

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "outBack" }}
                className="bg-white/80 backdrop-blur-xl p-8 md:p-12 rounded-3xl shadow-2xl border border-white/50 max-w-md w-full relative z-10"
            >
                <div className="relative w-24 h-24 mx-auto mb-8">
                    <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute inset-0 bg-rose-100 rounded-full flex items-center justify-center"
                    >
                    </motion.div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <WifiOff size={48} className="text-rose-500" />
                    </div>
                </div>

                <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">You're Offline</h1>
                <p className="text-slate-500 mb-10 leading-relaxed text-lg">
                    Internet connection lost. <br />
                    <span className="text-sm">Don't worry, your data is safe!</span>
                </p>

                <div className="space-y-4">
                    <button
                        onClick={handleRetry}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3 text-lg"
                    >
                        <RefreshCw size={22} />
                        Retry Connection
                    </button>

                    <button
                        onClick={handleContinue}
                        className="w-full py-4 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-2xl border-2 border-slate-200 hover:border-slate-300 transition-all flex items-center justify-center gap-3 text-lg group"
                    >
                        <Home size={22} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                        Use Offline Mode
                        <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all text-slate-400" />
                    </button>
                </div>

                <div className="mt-10 pt-8 border-t border-slate-200/60">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4">Available Features</p>
                    <div className="flex justify-center gap-6 text-slate-600 font-medium text-sm">
                        <span className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full">
                            <span>📊</span> Cached Data
                        </span>
                        <span className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full">
                            <span>👀</span> Read-only Mode
                        </span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default OfflinePage;
