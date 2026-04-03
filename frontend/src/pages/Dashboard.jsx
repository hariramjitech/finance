// src/pages/Dashboard.jsx
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign, TrendingUp, TrendingDown, Target, Plus,
  Zap, PieChart, CreditCard, ArrowUpRight, Activity, Calendar, Wallet, Layers
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

import { getDashboardAnalytics, getTransactions } from "../api/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import AddTransactionModal from "../components/transactions/AddTransactionModal";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import SpendingTrendChart from "../components/dashboard/SpendingTrendChart";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import EmailReportModal from "../components/analytics/EmailReportModal";
import { Mail } from "lucide-react";

export default function Dashboard() {
  const { formatCurrency } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [greeting, setGreeting] = useState("Hello");
  const queryClient = useQueryClient();

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  // Fetch consolidated analytics with auto-refresh (simulating realtime)
  const { data: analytics = {}, isLoading: loadingAnalytics } = useQuery({
    queryKey: ["dashboard-analytics"],
    queryFn: () => getDashboardAnalytics().then(res => res.data),
    refetchInterval: 30000,
  });

  const { data: recentTxs = [], isLoading: loadingTxs } = useQuery({
    queryKey: ["recent-transactions"],
    queryFn: () => getTransactions({ limit: 6 }).then(res => res.data),
    refetchInterval: 10000,
  });

  const summary = analytics.summary || {};

  // Stats Configuration
  const stats = [
    {
      title: "Net Balance",
      value: summary.balance ?? 0,
      icon: Wallet,
      color: "bg-blue-600",
      iconColor: "text-blue-600",
      bgFrom: "bg-white",
      desc: "Total savings"
    },
    {
      title: "Monthly Income",
      value: summary.monthlyIncome ?? 0,
      icon: TrendingUp,
      color: "bg-emerald-600",
      iconColor: "text-emerald-600",
      bgFrom: "bg-white",
      desc: "This month"
    },
    {
      title: "Monthly Expenses",
      value: summary.monthlyExpense ?? 0,
      icon: TrendingDown,
      color: "bg-rose-600",
      iconColor: "text-rose-600",
      bgFrom: "bg-white",
      desc: "This month"
    },
    {
      title: "Investments",
      value: summary.totalInvestment ?? 0,
      icon: PieChart,
      color: "bg-violet-600",
      iconColor: "text-violet-600",
      bgFrom: "bg-white",
      desc: "Portfolio value"
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-0 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{greeting}, User!</h1>
          <p className="text-gray-500 text-sm font-medium flex items-center gap-2 mt-1">
            <Calendar size={14} className="text-indigo-500" />
            {format(new Date(), "EEEE, MMMM do, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => setIsEmailModalOpen(true)}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm"
          >
            <Mail size={16} /> <span>Report</span>
          </Button>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={16} /> <span>Quick Add</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

        {/* Left Column: Stats & Activity (8 cols) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group relative"
              >
                {stat.title === "Net Balance" && (
                  <Link to="/analytics" className="absolute inset-0 z-10" />
                )}
                <div className={`w-10 h-10 rounded-xl ${stat.color} bg-opacity-10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <stat.icon size={20} className={stat.iconColor} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">{stat.title}</p>
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight mt-0.5 truncate" title={formatCurrency(stat.value)}>
                    {formatCurrency(stat.value)}
                  </h3>
                </div>
              </motion.div>
            ))}
          </div>


          {/* Spending Trend Chart */}
          <SpendingTrendChart />

          {/* Recent Activity Section */}
          <Card className="flex-1 bg-white border-gray-100 shadow-sm rounded-3xl p-6 min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-50 rounded-xl text-gray-900">
                  <Activity size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
                  <p className="text-xs text-gray-500 font-medium">Your latest financial movements</p>
                </div>
              </div>
              <Link to="/transactions" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors">
                View All
              </Link>
            </div>

            <div className="space-y-2">
              {loadingTxs ? (
                <LoadingSpinner />
              ) : recentTxs.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3 text-gray-300">
                    <Wallet size={24} />
                  </div>
                  <p className="text-gray-900 font-medium text-sm">No transactions yet</p>
                  <p className="text-gray-400 text-xs mt-1">Start by adding your first income or expense.</p>
                </div>
              ) : (
                recentTxs.map((t, i) => (
                  <motion.div
                    key={t._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-2xl transition-colors group cursor-pointer border border-transparent hover:border-gray-100"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105 ${t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                        }`}>
                        {t.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm group-hover:text-indigo-900 transition-colors">
                          {t.description || "Untitled Transaction"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span className="font-medium bg-gray-100 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
                            {t.category}
                          </span>
                          <span className="text-[10px]">•</span>
                          <span>{format(new Date(t.date), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`font-bold text-sm sm:text-base whitespace-nowrap ${t.type === 'income' ? 'text-emerald-600' : 'text-gray-900'
                      }`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </span>
                  </motion.div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: AI & Actions (4 cols) */}
        <div className="xl:col-span-4 space-y-6">

          {/* AI Score Card - Clean & Vertical */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl bg-[#0F172A] text-white shadow-2xl p-6 border border-slate-800"
          >
            {/* Subtle Gradient Blobs */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-fuchsia-600/20 rounded-full blur-3xl opacity-50"></div>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                <Zap size={12} className="fill-indigo-300" /> AI Financial Health
              </div>

              <div className="relative mb-6">
                <svg className="w-40 h-40 transform -rotate-90">
                  <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-800" />
                  <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent"
                    strokeDasharray={440}
                    strokeDashoffset={440 - (440 * (summary.financialScore ?? 50)) / 100}
                    className={`${(summary.financialScore ?? 50) >= 80 ? 'text-emerald-500' : (summary.financialScore ?? 50) >= 50 ? 'text-indigo-500' : 'text-rose-500'} transition-all duration-1000 ease-out`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                  <span className="text-4xl font-black text-white tracking-tighter">{summary.financialScore ?? 50}</span>
                  <span className={`text-xs font-medium ${(summary.financialScore ?? 50) >= 80 ? 'text-emerald-300' : (summary.financialScore ?? 50) >= 50 ? 'text-indigo-300' : 'text-rose-300'}`}>
                    {(summary.financialScore ?? 50) >= 80 ? 'EXCELLENT' : (summary.financialScore ?? 50) >= 50 ? 'GOOD' : 'NEEDS WORK'}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-300 font-light leading-relaxed mb-6">
                {summary.financialScore >= 80 ? "You're crushing your goals! Consider diversifying your portfolio." :
                  summary.financialScore >= 50 ? "Solid progress. Keep an eye on recurring expenses." :
                    "Let's focus on savings this month. Check the budget tab."}
              </p>

              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-center overflow-hidden">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold mb-1">Savings</p>
                  <p className="text-emerald-400 font-bold truncate" title={formatCurrency(summary.savings ?? 0)}>+{formatCurrency(summary.savings ?? 0)}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-center overflow-hidden">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold mb-1">Expenses</p>
                  <p className="text-rose-400 font-bold truncate" title={formatCurrency((summary.monthlyExpense ?? 0) + (summary.monthlyRecurring ?? 0))}>{formatCurrency((summary.monthlyExpense ?? 0) + (summary.monthlyRecurring ?? 0))}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Link to="/budget" className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 flex flex-col items-center justify-center text-center gap-2 group">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform"><Wallet size={20} /></div>
              <span className="text-xs font-bold text-gray-700">Budget</span>
            </Link>
            <Link to="/investments" className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 flex flex-col items-center justify-center text-center gap-2 group">
              <div className="p-2 bg-violet-50 text-violet-600 rounded-xl group-hover:scale-110 transition-transform"><PieChart size={20} /></div>
              <span className="text-xs font-bold text-gray-700">Invest</span>
            </Link>
            <Link to="/goals" className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 flex flex-col items-center justify-center text-center gap-2 group">
              <div className="p-2 bg-pink-50 text-pink-600 rounded-xl group-hover:scale-110 transition-transform"><Target size={20} /></div>
              <span className="text-xs font-bold text-gray-700">Goals</span>
            </Link>
            <button onClick={() => setIsModalOpen(true)} className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 flex flex-col items-center justify-center text-center gap-2 group">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform"><Plus size={20} /></div>
              <span className="text-xs font-bold text-indigo-700">Add New</span>
            </button>
          </div>

          {/* Tip Card */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Zap size={16} className="text-yellow-300 fill-yellow-300" />
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-100 uppercase tracking-wide mb-1">Pro Tip</p>
                <p className="text-xs font-medium leading-relaxed opacity-90">
                  Review your subscriptions under the <b>Recurring</b> tab to save ~15% monthly.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          queryClient.invalidateQueries(["dashboard-analytics"]);
          queryClient.invalidateQueries(["recent-transactions"]);
        }}
      />
      <EmailReportModal isOpen={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} />
    </div>
  );
}