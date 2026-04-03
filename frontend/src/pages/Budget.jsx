// src/pages/Budget.jsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBudgets, recommendBudget, setBudget, deleteBudget, addTransaction } from "../api/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import toast from "react-hot-toast";
import { PieChart, Plus, Wallet, AlertTriangle, CheckCircle, Trash2, TrendingUp, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useAuth } from "../context/AuthContext";

export default function Budget() {
  const { formatCurrency, user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [newBudget, setNewBudget] = useState({ category: "", limit: "" });

  const [showSpendModal, setShowSpendModal] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [spendAmount, setSpendAmount] = useState("");
  const [spendDescription, setSpendDescription] = useState("");

  const queryClient = useQueryClient();

  const { data: budgets = [] } = useQuery({
    queryKey: ["budgets"],
    queryFn: () => getBudgets().then((res) => res.data),
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ["budget-recommendations"],
    queryFn: async () => {
      try {
        const res = await recommendBudget();
        return Array.isArray(res.data) ? res.data : [];
      } catch (e) {
        return [];
      }
    },
  });

  const mutation = useMutation({
    mutationFn: setBudget,
    onSuccess: () => {
      queryClient.invalidateQueries(["budgets"]);
      queryClient.invalidateQueries(["dashboard-analytics"]);
      toast.success("Budget created successfully!");
      setShowModal(false);
      setNewBudget({ category: "", limit: "" });
    },
    onError: () => toast.error("Failed to create budget"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries(["budgets"]);
      queryClient.invalidateQueries(["dashboard-analytics"]);
      toast.success("Budget deleted");
    },
    onError: () => toast.error("Failed to delete budget"),
  });

  const spendMutation = useMutation({
    mutationFn: (data) => addTransaction(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries(["budgets"]);
      queryClient.invalidateQueries(["dashboard-analytics"]);
      queryClient.invalidateQueries(["transactions"]);

      if (data.data.alertMessage) {
        toast(data.data.alertMessage, {
          icon: '⚠️',
          duration: 5000,
          style: {
            background: '#FEF2F2',
            color: '#991B1B',
            border: '1px solid #F87171'
          }
        });
      } else {
        toast.success("Expense recorded!");
      }

      setShowSpendModal(false);
      setSpendAmount("");
      setSpendDescription("");
      setSelectedBudget(null);
    },
    onError: () => toast.error("Failed to record expense"),
  });

  const handleOpenSpendModal = (budget) => {
    setSelectedBudget(budget);
    setSpendAmount("");
    setSpendDescription(`Spending on ${budget.category}`);
    setShowSpendModal(true);
  };

  const handleSpendSubmit = () => {
    if (!spendAmount || Number(spendAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    spendMutation.mutate({
      type: 'expense',
      category: selectedBudget.category,
      amount: Number(spendAmount),
      description: spendDescription,
      date: new Date().toISOString().split('T')[0]
    });
  };

  const applyRecommendation = (category, suggestedLimit) => {
    mutation.mutate({
      category,
      limit: Number(suggestedLimit),
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    });
  };

  const createCustomBudget = () => {
    if (!newBudget.category || Number(newBudget.limit) <= 0) {
      toast.error("Please provide a valid category and limit");
      return;
    }
    mutation.mutate({
      category: newBudget.category,
      limit: Number(newBudget.limit),
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    });
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  const totalUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Wallet className="w-10 h-10 text-indigo-600" />
            Budget Master
          </h1>
          <p className="text-gray-600 mt-1">Plan smarter, save more. Your financial blueprint.</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="shadow-lg shadow-indigo-200">
          <Plus className="w-5 h-5 mr-2" /> Make New Budget
        </Button>
      </div>

      {/* Summary Stat */}
      {budgets.length > 0 && (
        <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <p className="text-gray-400 mb-1 font-medium">Monthly Total Budget</p>
              <h2 className="text-4xl font-bold">{formatCurrency(totalBudget)}</h2>
              <div className="flex items-center gap-2 mt-4 text-sm bg-white/10 px-3 py-1.5 rounded-full w-fit">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Spent <span className="font-bold text-white">{formatCurrency(totalSpent)}</span> so far</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right hidden md:block">
                <p className="text-3xl font-bold">{Math.round(totalUtilization)}%</p>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Utilization</p>
              </div>
              <div className="w-32 h-32 relative">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-700" />
                  <circle cx="64" cy="64" r="56" stroke="#6366f1" strokeWidth="12" fill="transparent" strokeDasharray="351.86" strokeDashoffset={351.86 - (Math.min(totalUtilization, 100) / 100) * 351.86} strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* AI Recommendations */}
      <AnimatePresence>
        {recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 rounded-2xl p-6 shadow-xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-24 opacity-20 bg-white blur-3xl transform rotate-45 translate-x-10 -translate-y-10"></div>

              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md shadow-inner">
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">AI Smart Suggestions</h3>
                  <p className="text-indigo-200 text-sm">Based on your recent spending habits</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                {recommendations.map((rec, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/20 transition group flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold truncate max-w-[100px]" title={rec.category}>{rec.category}</h4>
                      <span className="text-xs bg-black/20 px-2 py-0.5 rounded text-indigo-100 whitespace-nowrap">Avg: {formatCurrency(rec.averageMonthlySpend)}</span>
                    </div>
                    <div className="flex flex-col gap-2 mt-4">
                      <div>
                        <p className="text-xs text-indigo-200 opacity-80 uppercase font-semibold">Suggested</p>
                        <p className="text-xl md:text-2xl font-bold truncate" title={formatCurrency(rec.suggestedLimit)}>{formatCurrency(rec.suggestedLimit)}</p>
                      </div>
                      <button
                        onClick={() => applyRecommendation(rec.category, rec.suggestedLimit)}
                        className="bg-white text-indigo-600 px-3 py-2 rounded-lg text-xs font-bold shadow hover:shadow-lg hover:scale-105 active:scale-95 transition w-full"
                      >
                        Apply
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Budget Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Wallet className="w-10 h-10 text-indigo-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Budgets Set</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-8">Take control of your finances by setting spending limits for different categories.</p>
            <Button size="lg" onClick={() => setShowModal(true)}>Set Your First Budget</Button>
          </div>
        ) : (
          budgets.map((b) => {
            const spent = b.spent || 0;
            const percent = b.limit > 0 ? (spent / b.limit) * 100 : 0;
            const isExceeded = percent > 100;
            const remaining = Math.max(0, b.limit - spent);

            // Dynamic color assignment
            let color = "indigo";
            if (percent > 100) color = "rose";
            else if (percent > 85) color = "orange";
            else if (percent > 50) color = "blue";
            else color = "emerald";

            const uiPercent = Math.min(percent, 100);
            const radius = 70;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (uiPercent / 100) * circumference;

            // Map color names to Tailwind types for template literals (a bit hacky but works for valid distinct colors)
            const colorClasses = {
              rose: { text: 'text-rose-600', bg: 'bg-rose-50', stroke: 'text-rose-500', bar: 'bg-rose-500' },
              orange: { text: 'text-orange-600', bg: 'bg-orange-50', stroke: 'text-orange-500', bar: 'bg-orange-500' },
              blue: { text: 'text-blue-600', bg: 'bg-blue-50', stroke: 'text-blue-500', bar: 'bg-blue-500' },
              emerald: { text: 'text-emerald-600', bg: 'bg-emerald-50', stroke: 'text-emerald-500', bar: 'bg-emerald-500' },
              indigo: { text: 'text-indigo-600', bg: 'bg-indigo-50', stroke: 'text-indigo-500', bar: 'bg-indigo-500' },
            };
            const c = colorClasses[color] || colorClasses.indigo;

            return (
              <motion.div
                key={b._id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -5 }}
                className="h-full"
              >
                <Card className="h-full relative overflow-hidden group border border-gray-100 hover:border-indigo-100 dark:hover:border-indigo-900">
                  <div className="absolute top-0 right-0 w-full h-1 bg-gray-100">
                    <div className={`h-full ${c.bar}`} style={{ width: `${uiPercent}%` }}></div>
                  </div>

                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 tracking-tight">{b.category}</h3>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Monthly Limit: {formatCurrency(b.limit)}</p>
                    </div>
                    <div className={`p-2 rounded-xl ${c.bg} ${c.text}`}>
                      {isExceeded ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center relative mb-8">
                    <div className="relative w-44 h-44">
                      <svg className="w-full h-full -rotate-90 transform drop-shadow-sm">
                        <circle cx="88" cy="88" r={radius} stroke="currentColor" strokeWidth="10" fill="transparent" className="text-gray-100" />
                        <circle
                          cx="88"
                          cy="88"
                          r={radius}
                          stroke="currentColor"
                          strokeWidth="10"
                          fill="transparent"
                          strokeDasharray={circumference}
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                          className={`${c.stroke} transition-all duration-1000 ease-out`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-4xl font-extrabold ${c.text}`}>
                          {Math.round(percent)}%
                        </span>
                        <span className="text-xs uppercase font-bold text-gray-400 tracking-widest mt-1">Used</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50/80 rounded-xl p-4 space-y-3 mb-6">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <span className="text-sm text-gray-500 font-medium">Spent</span>
                      <span className={`text-base font-bold ${c.text}`}>{formatCurrency(spent)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 font-medium">Remaining</span>
                      <span className="text-base font-bold text-gray-900">{formatCurrency(remaining)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-semibold"
                      onClick={() => handleOpenSpendModal(b)}
                    >
                      + Expense
                    </Button>
                    <button
                      onClick={() => {
                        if (window.confirm("Delete this budget?")) deleteMutation.mutate(b._id);
                      }}
                      className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-gray-200 transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">New Budget</h2>
                    <p className="text-sm text-gray-500">Set limits to save effectively.</p>
                  </div>
                  <div className="bg-indigo-50 p-2 rounded-full">
                    <Wallet className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Category Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. Shopping, Groceries"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition font-medium"
                        value={newBudget.category}
                        onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Monthly Limit</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                        {user?.currency === "INR" ? "₹" : user?.currency === "EUR" ? "€" : user?.currency === "GBP" ? "£" : user?.currency === "JPY" ? "¥" : "$"}
                      </span>
                      <input
                        type="number"
                        placeholder="500"
                        className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition font-bold text-lg"
                        value={newBudget.limit}
                        onChange={(e) => setNewBudget({ ...newBudget, limit: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button variant="outline" className="flex-1 py-3 h-auto text-base" onClick={() => setShowModal(false)}>
                      Cancel
                    </Button>
                    <Button className="flex-1 py-3 h-auto text-base bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200" onClick={createCustomBudget}>
                      Create Budget
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Spend Modal */}
      <AnimatePresence>
        {showSpendModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 bg-gray-50">
                <h2 className="text-xl font-bold text-gray-900">Add Expense</h2>
                <p className="text-gray-500 text-sm">Recording transaction for <span className="font-bold text-indigo-600">{selectedBudget?.category}</span></p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-900 font-bold text-lg">
                      {user?.currency === "INR" ? "₹" : user?.currency === "EUR" ? "€" : user?.currency === "GBP" ? "£" : user?.currency === "JPY" ? "¥" : "$"}
                    </span>
                    <input
                      type="number"
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 bg-white border-2 border-indigo-100 rounded-xl focus:border-indigo-500 outline-none transition font-bold text-2xl text-gray-900"
                      value={spendAmount}
                      onChange={(e) => setSpendAmount(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="What did you buy?"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    value={spendDescription}
                    onChange={(e) => setSpendDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowSpendModal(false)}>
                    Cancel
                  </Button>
                  <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-200" onClick={handleSpendSubmit}>
                    Confirm
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}