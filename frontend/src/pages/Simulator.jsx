import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calculator, TrendingUp, DollarSign, Calendar, Info } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

const Simulator = () => {
    const [principal, setPrincipal] = useState(1000);
    const [monthly, setMonthly] = useState(500);
    const [rate, setRate] = useState(8);
    const [years, setYears] = useState(10);

    const data = useMemo(() => {
        const result = [];
        let balance = principal;
        let invested = principal;
        const monthlyRate = rate / 100 / 12;
        const totalMonths = years * 12;

        for (let i = 0; i <= totalMonths; i++) {
            if (i % 12 === 0) { // Only store yearly points for cleaner chart
                result.push({
                    year: `Year ${i / 12}`,
                    invested: Math.round(invested),
                    balance: Math.round(balance),
                    interest: Math.round(balance - invested)
                });
            }
            balance += monthly;
            balance *= (1 + monthlyRate);
            invested += monthly;
        }
        return result;
    }, [principal, monthly, rate, years]);

    const finalAmount = data[data.length - 1].balance;
    const totalInvested = data[data.length - 1].invested;
    const totalGrowth = finalAmount - totalInvested;

    return (
        <div className="p-6 md:p-10 min-h-screen bg-slate-50 text-slate-800">
            <Helmet>
                <title>Time Travel Simulator | FinancePro</title>
            </Helmet>

            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900">
                    <Calculator className="text-indigo-600" />
                    Time Travel Simulator
                </h1>
                <p className="text-slate-500 mt-2">Visualize how your money grows over time with compound interest.</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Controls */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-4 space-y-6 bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100"
                >
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-semibold text-slate-600 flex justify-between">
                                Initial Investment
                                <span className="text-indigo-600">${principal}</span>
                            </label>
                            <div className="relative mt-2">
                                <DollarSign size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="number"
                                    value={principal}
                                    onChange={(e) => setPrincipal(Number(e.target.value))}
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100000"
                                step="100"
                                value={principal}
                                onChange={(e) => setPrincipal(Number(e.target.value))}
                                className="w-full mt-3 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-slate-600 flex justify-between">
                                Monthly Contribution
                                <span className="text-indigo-600">${monthly}</span>
                            </label>
                            <div className="relative mt-2">
                                <DollarSign size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="number"
                                    value={monthly}
                                    onChange={(e) => setMonthly(Number(e.target.value))}
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="10000"
                                step="50"
                                value={monthly}
                                onChange={(e) => setMonthly(Number(e.target.value))}
                                className="w-full mt-3 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-slate-600 flex justify-between">
                                Annual Return Rate
                                <span className="text-emerald-600">{rate}%</span>
                            </label>
                            <div className="relative mt-2">
                                <TrendingUp size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="number"
                                    value={rate}
                                    onChange={(e) => setRate(Number(e.target.value))}
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <div className="flex justify-between text-xs text-slate-400 mt-1 px-1">
                                <span>Conservative (4%)</span>
                                <span>Aggressive (12%)</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="20"
                                step="0.5"
                                value={rate}
                                onChange={(e) => setRate(Number(e.target.value))}
                                className="w-full mt-3 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-slate-600 flex justify-between">
                                Time Horizon
                                <span className="text-indigo-600">{years} Years</span>
                            </label>
                            <div className="relative mt-2">
                                <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="number"
                                    value={years}
                                    onChange={(e) => setYears(Number(e.target.value))}
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                />
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="50"
                                step="1"
                                value={years}
                                onChange={(e) => setYears(Number(e.target.value))}
                                className="w-full mt-3 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Results & Chart */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-8 space-y-6"
                >
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-lg shadow-indigo-200">
                            <p className="text-indigo-200 text-sm font-medium mb-1">Total Future Value</p>
                            <h2 className="text-3xl font-bold">${finalAmount.toLocaleString()}</h2>
                        </div>
                        <div className="bg-white text-slate-800 p-6 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100">
                            <p className="text-slate-500 text-sm font-medium mb-1">Total Invested</p>
                            <h2 className="text-3xl font-bold text-slate-700">${totalInvested.toLocaleString()}</h2>
                        </div>
                        <div className="bg-emerald-50 text-emerald-900 p-6 rounded-2xl shadow-lg shadow-emerald-100/50 border border-emerald-100">
                            <p className="text-emerald-600 text-sm font-medium mb-1">Total Interest Earned</p>
                            <h2 className="text-3xl font-bold text-emerald-700">+${totalGrowth.toLocaleString()}</h2>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 h-[400px]">
                        <h3 className="font-bold text-lg text-slate-800 mb-6">Wealth Projection</h3>
                        <ResponsiveContainer width="100%" height="90%">
                            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `$${value / 1000}k`}
                                />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                    }}
                                    formatter={(value) => [`$${value.toLocaleString()}`, '']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="balance"
                                    name="Projected Value"
                                    stroke="#4f46e5"
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                    strokeWidth={3}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="invested"
                                    name="Principal Invested"
                                    stroke="#94a3b8"
                                    fillOpacity={1}
                                    fill="url(#colorInvested)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Simulator;
