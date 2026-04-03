import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Trophy, TrendingUp, TrendingDown, Star, Zap } from "lucide-react";
import confetti from "canvas-confetti";
import numbro from "numbro";
import dayjs from "dayjs";

const DataStory = ({ isOpen, onClose, data, userName = "User" }) => {
    const [currentSlide, setCurrentSlide] = useState(0);



    // --- Insight Logic ---
    const { totals, categoryData, dailySeries } = data;

    // Top Category
    const topCategory = categoryData.length > 0 ? categoryData[0] : { name: "Nothing", value: 0 };

    // Peak Spending Day
    const peakDay = dailySeries.reduce((max, day) => (day.expense > max.expense ? day : max), { expense: 0, date: "" });

    // Health Score (Mock logic based on savings rate)
    const savingsRate = totals.totalIncome > 0 ? (totals.netSavings / totals.totalIncome) * 100 : 0;
    let score = 50;
    if (savingsRate > 20) score = 85;
    if (savingsRate > 40) score = 95;
    if (savingsRate < 0) score = 30;

    const slides = [
        {
            id: "intro",
            bg: "bg-gradient-to-br from-indigo-900 to-violet-900",
            content: (
                <div className="text-center px-6">
                    <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm"
                    >
                        <Zap size={48} className="text-yellow-400" />
                    </motion.div>
                    <h2 className="text-3xl font-bold text-white mb-4">Your Monthly Pulse</h2>
                    <p className="text-indigo-200 text-lg">Hi {userName}, let's see how you did this month.</p>
                </div>
            )
        },
        {
            id: "flow",
            bg: "bg-gradient-to-br from-emerald-900 to-teal-900",
            content: (
                <div className="text-center px-6">
                    <h3 className="text-emerald-200 uppercase tracking-widest text-sm font-semibold mb-8">Cash Flow</h3>
                    <div className="mb-8">
                        <p className="text-emerald-100 mb-2">You earned</p>
                        <h2 className="text-4xl font-black text-white">{numbro(totals.totalIncome).formatCurrency({ mantissa: 0 })}</h2>
                    </div>
                    <div className="w-px h-12 bg-white/20 mx-auto mb-8"></div>
                    <div>
                        <p className="text-rose-200 mb-2">And spent</p>
                        <h2 className="text-4xl font-black text-rose-400">{numbro(totals.totalExpense).formatCurrency({ mantissa: 0 })}</h2>
                    </div>
                </div>
            )
        },
        {
            id: "category",
            bg: "bg-gradient-to-br from-rose-900 to-orange-900",
            content: (
                <div className="text-center px-6">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                        className="mb-8"
                    >
                        <span className="text-6xl">🍕</span>
                    </motion.div>
                    <h3 className="text-orange-200 text-xl mb-4">You really like</h3>
                    <h1 className="text-5xl font-black text-white mb-6 leading-tight">{topCategory.name}</h1>
                    <p className="text-white/60">
                        Totaling <span className="text-white font-bold">{numbro(topCategory.value).formatCurrency({ mantissa: 0 })}</span>
                    </p>
                </div>
            )
        },
        {
            id: "peak",
            bg: "bg-gradient-to-br from-blue-900 to-cyan-900",
            content: (
                <div className="text-center px-6">
                    <h3 className="text-cyan-200 mb-6">Busiest Day</h3>
                    <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-md border border-white/20">
                        <h1 className="text-4xl font-bold text-white mb-2">{dayjs(peakDay.date).format("dddd")}</h1>
                        <p className="text-cyan-100 text-xl">{dayjs(peakDay.date).format("MMMM D")}</p>
                    </div>
                    <p className="mt-8 text-white/70">
                        You spent <span className="text-white font-bold">{numbro(peakDay.expense).formatCurrency({ mantissa: 0 })}</span> in one day. wild.
                    </p>
                </div>
            )
        },
        {
            id: "score",
            bg: "bg-gradient-to-br from-violet-900 to-fuchsia-900",
            content: (
                <div className="text-center px-6">
                    <h3 className="text-fuchsia-200 mb-8">Financial Health Score</h3>
                    <div className="relative w-40 h-40 mx-auto mb-8 flex items-center justify-center">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1, rotate: 360 }}
                            transition={{ duration: 0.8, type: "spring" }}
                            className="absolute inset-0 border-8 border-white rounded-full opacity-20"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-6xl font-black text-white"
                        >
                            {Math.round(score)}
                        </motion.div>
                    </div>
                    <p className="text-fuchsia-100 text-lg">
                        {score > 80 ? "You're a financial wizard! 🧙‍♂️" : score > 50 ? "Doing good, keep it up! 👍" : "Let's focus on savings next month! 💪"}
                    </p>
                </div>
            )
        }
    ];

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(curr => curr + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentSlide > 0) {
            setCurrentSlide(curr => curr - 1);
        }
    };

    // Auto-confetti on score slide
    useEffect(() => {
        if (slides[currentSlide].id === 'score' && score > 70) {
            confetti({
                zIndex: 9999,
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
    }, [currentSlide, score]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black"
                >
                    {/* Background Layer */}
                    <motion.div
                        key={currentSlide}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className={`absolute inset-0 ${slides[currentSlide].bg}`}
                    />

                    {/* Content Container */}
                    <div className="relative z-10 w-full max-w-md h-full md:h-[800px] flex flex-col">

                        {/* Progress Bar */}
                        <div className="flex gap-2 p-4 pt-8 md:pt-4">
                            {slides.map((_, idx) => (
                                <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: "0%" }}
                                        animate={{ width: idx <= currentSlide ? "100%" : "0%" }}
                                        className="h-full bg-white"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Close Button */}
                        <button _onClick={onClose} className="absolute top-8 right-4 md:top-4 text-white/50 hover:text-white z-20" onClick={onClose}>
                            <X size={24} />
                        </button>

                        {/* Slide Content */}
                        <div className="flex-1 flex flex-col justify-center items-center relative overflow-hidden">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentSlide}
                                    initial={{ x: 100, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -100, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    className="w-full"
                                >
                                    {slides[currentSlide].content}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Controls */}
                        <div className="h-32 flex items-center justify-between px-6 pb-6">
                            <button onClick={handlePrev} disabled={currentSlide === 0} className={`p-4 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-opacity ${currentSlide === 0 ? 'opacity-0' : 'opacity-100'}`}>
                                <ChevronLeft size={24} />
                            </button>

                            <button onClick={handleNext} className="px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-lg hover:bg-opacity-90 transition-transform active:scale-95 flex items-center gap-2">
                                {currentSlide === slides.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={20} />
                            </button>
                        </div>

                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DataStory;
