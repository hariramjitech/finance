// src/pages/Recurring.jsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRecurring, createRecurring, deleteRecurring } from "../api/api";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Repeat, Calendar, DollarSign, Activity, Trash2, Radio } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import ConfirmModal from "../components/ui/ConfirmModal";

import { useAuth } from "../context/AuthContext";

export default function Recurring() {
    const { formatCurrency, user } = useAuth();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Scan State
    const [scanning, setScanning] = useState(false);
    const [suggestions, setSuggestions] = useState([]);

    // Delete Confirmation State
    const [deleteId, setDeleteId] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const [formData, setFormData] = useState({
        type: "expense",
        category: "",
        amount: "",
        frequency: "monthly",
        description: "",
        startDate: new Date().toISOString().split("T")[0],
    });

    const { data: recurrings = [], isLoading } = useQuery({
        queryKey: ["recurring"],
        queryFn: async () => {
            const res = await getRecurring();
            return res.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: createRecurring,
        onSuccess: () => {
            queryClient.invalidateQueries(["recurring"]);
            queryClient.invalidateQueries(["dashboard-analytics"]);
            setIsModalOpen(false);
            setFormData({
                type: "expense",
                category: "",
                amount: "",
                frequency: "monthly",
                description: "",
                startDate: new Date().toISOString().split("T")[0],
            });
            toast.success("Recurring transaction added!");
        },
        onError: () => toast.error("Failed to add recurring transaction"),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteRecurring,
        onSuccess: () => {
            queryClient.invalidateQueries(["recurring"]);
            queryClient.invalidateQueries(["dashboard-analytics"]);
            toast.success("Recurring transaction deleted");
            setDeleteId(null);
        },
        onError: () => toast.error("Failed to delete recurring transaction"),
    });

    const confirmDelete = (rec) => {
        setDeleteId(rec._id);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = () => {
        if (deleteId) {
            deleteMutation.mutate(deleteId);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        createMutation.mutate({ ...formData, amount: Number(formData.amount) });
    };

    const handleScan = async () => {
        setScanning(true);
        const toastId = toast.loading("AI is scanning your history for subscriptions...", { style: { minWidth: '300px' } });
        try {
            const { scanRecurringSubscriptions } = await import("../api/api");
            const res = await scanRecurringSubscriptions();

            if (res.data && res.data.length > 0) {
                setSuggestions(res.data);
                toast.success(`Found ${res.data.length} potential subscriptions!`, { id: toastId });
                // We show suggestions inline, no need to open modal immediately
            } else {
                toast("No new subscriptions detected.", { icon: "🤷‍♂️", id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error("Scan failed.", { id: toastId });
        } finally {
            setScanning(false);
        }
    };

    const confirmSuggestion = (sugg) => {
        createMutation.mutate({
            type: 'expense',
            category: 'Subscription',
            amount: sugg.amount,
            frequency: sugg.frequency || 'monthly',
            description: sugg.name,
            startDate: new Date().toISOString().split('T')[0]
        });
        setSuggestions(prev => prev.filter(s => s.name !== sugg.name));
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                        <Repeat className="w-10 h-10 text-indigo-600" />
                        Recurring Payments
                    </h1>
                    <p className="text-gray-600 mt-1">Automate your subscriptions and regular income</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleScan} disabled={scanning} variant="outline" className={`flex items-center gap-2 ${scanning ? 'animate-pulse' : ''}`}>
                        {scanning ? "Scanning..." : "🤖 AI Scan"}
                    </Button>
                    <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 shadow-lg shadow-indigo-200">
                        <Plus size={20} /> Add New
                    </Button>
                </div>
            </div>

            {/* Suggestions Area */}
            {suggestions.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-indigo-50 border border-indigo-100 rounded-3xl mb-8">
                    <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
                        <span>✨ AI Suggestions</span>
                        <span className="text-xs font-normal text-indigo-600 bg-white px-2 py-1 rounded-full">One-click Add</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {suggestions.map((s, i) => (
                            <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-indigo-100 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-gray-900">{s.name}</p>
                                    <p className="text-xs text-gray-500">{formatCurrency(s.amount)} / {s.frequency}</p>
                                </div>
                                <button onClick={() => confirmSuggestion(s)} className="p-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-600 hover:text-white transition">
                                    <Plus size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {isLoading ? (
                <div className="text-center py-20 flex flex-col items-center">
                    <Repeat className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                    <p className="text-gray-500">Loading recurring transactions...</p>
                </div>
            ) : recurrings.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Calendar className="w-10 h-10 text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Recurring Payments</h3>
                    <p className="text-gray-500 max-w-sm mx-auto mb-6">Easily track subscriptions like Netflix, Spotify, or your Salary.</p>
                    <Button onClick={() => setIsModalOpen(true)}>Set Up Now</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {recurrings.map((rec, index) => (
                            <motion.div
                                key={rec._id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className={`relative overflow-hidden hover:shadow-2xl transition-all duration-300 border-l-4 ${rec.type === 'income' ? 'border-l-emerald-500 bg-emerald-50/10' : 'border-l-rose-500 bg-rose-50/10'}`}>
                                    <div className="absolute top-0 right-0 p-3 opacity-10">
                                        {rec.type === 'income' ? <DollarSign className="w-24 h-24 text-emerald-600" /> : <Activity className="w-24 h-24 text-rose-600" />}
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="pr-8">
                                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">{rec.description || rec.category}</h3>
                                                <span className="inline-block mt-1 text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                                    {rec.category}
                                                </span>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    confirmDelete(rec);
                                                }}
                                                className="text-gray-300 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-xl transition"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-500 font-medium">Amount</span>
                                                <span className={`text-2xl font-bold ${rec.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {rec.type === 'income' ? '+' : '-'}{formatCurrency(rec.amount)}
                                                </span>
                                            </div>

                                            <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Frequency</p>
                                                    <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 capitalize">
                                                        <Repeat size={14} className="text-indigo-500" />
                                                        {rec.frequency}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Next Payment</p>
                                                    <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                                                        <Calendar size={14} className="text-indigo-500" />
                                                        {new Date(rec.nextRunDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`absolute bottom-0 left-0 w-full h-1 ${rec.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'} opacity-20`}></div>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Add Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative"
                        >
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                                <h2 className="text-2xl font-bold text-gray-900">Add Recurring</h2>
                                <p className="text-gray-500 text-sm">Automate income or expenses.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                <div className="p-1 bg-gray-100 rounded-xl flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'expense' })}
                                        className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 ${formData.type === 'expense'
                                            ? 'bg-white text-rose-600 shadow-md transform scale-105'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        Expense
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'income' })}
                                        className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 ${formData.type === 'income'
                                            ? 'bg-white text-emerald-600 shadow-md transform scale-105'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        Income
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Description</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition font-medium"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="e.g. Netflix Premium"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Category</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                            placeholder="Entertainment"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Amount ({user?.currency === "INR" ? "₹" : user?.currency === "EUR" ? "€" : user?.currency === "GBP" ? "£" : user?.currency === "JPY" ? "¥" : "$"})</label>
                                        <input
                                            type="number"
                                            required
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition font-bold"
                                            value={formData.amount}
                                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Frequency</label>
                                        <div className="relative">
                                            <select
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-medium"
                                                value={formData.frequency}
                                                onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                                            >
                                                <option value="daily">Daily</option>
                                                <option value="weekly">Weekly</option>
                                                <option value="monthly">Monthly</option>
                                                <option value="yearly">Yearly</option>
                                            </select>
                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Start Date</label>
                                        <input
                                            type="date"
                                            required
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition font-medium"
                                            value={formData.startDate}
                                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 h-auto">
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="flex-1 py-3 h-auto shadow-lg shadow-indigo-200">
                                        Confirm
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Delete Recurring Payment"
                message="Are you sure you want to stop this recurring payment? Future occurrences will be removed."
                confirmText="Stop Payment"
                isDanger={true}
            />
        </div>
    );
}
