// src/pages/Goals.jsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getGoals, createGoal, addFundsToGoal, deleteGoal, redeemGoal } from "../api/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Target, Plus, TrendingUp, Calendar, Trophy, Share2, Trash2, PartyPopper, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useAuth } from "../context/AuthContext";
import ConfirmModal from "../components/ui/ConfirmModal";

export default function Goals() {
    const { formatCurrency, user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [fundModalOpen, setFundModalOpen] = useState(false);
    const [redeemModalOpen, setRedeemModalOpen] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState(null);
    const [fundAmount, setFundAmount] = useState("");

    // Delete Confirmation State
    const [deleteId, setDeleteId] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const [newGoal, setNewGoal] = useState({
        title: "",
        targetAmount: "",
        deadline: "",
        shared: false
    });

    const queryClient = useQueryClient();

    const { data: goals = [], isLoading } = useQuery({
        queryKey: ["goals"],
        queryFn: () => getGoals().then((res) => res.data),
    });

    const createMutation = useMutation({
        mutationFn: createGoal,
        onSuccess: () => {
            queryClient.invalidateQueries(["goals"]);
            queryClient.invalidateQueries(["dashboard-analytics"]);
            toast.success("Goal set successfully!");
            setIsModalOpen(false);
            setNewGoal({ title: "", targetAmount: "", deadline: "", shared: false });
        },
        onError: (err) => toast.error(err.response?.data?.message || "Failed to create goal"),
    });

    const addFundsMutation = useMutation({
        mutationFn: ({ id, amount }) => addFundsToGoal(id, { amount: Number(amount) }),
        onSuccess: (data) => {
            queryClient.invalidateQueries(["goals"]);
            queryClient.invalidateQueries(["dashboard-analytics"]);
            toast.success("Funds added!");
            setFundModalOpen(false);
            setFundAmount("");

            // Check if goal is completed to trigger confetti
            if (data.data.savedAmount >= data.data.targetAmount) {
                triggerConfetti();
                toast('🎉 Goal Reached! Congratulations!', { icon: '🏆' });
            }
        },
        onError: (err) => toast.error(err.response?.data?.message || "Failed to add funds"),
    });

    const redeemMutation = useMutation({
        mutationFn: (id) => redeemGoal(id),
        onSuccess: () => {
            queryClient.invalidateQueries(["goals"]);
            queryClient.invalidateQueries(["dashboard-analytics"]);
            queryClient.invalidateQueries(["transactions"]); // Refresh balance
            queryClient.invalidateQueries(["budgets"]); // New budget created
            toast.success("Funds redeemed to Balance!");
            setRedeemModalOpen(false);
            triggerConfetti();
        },
        onError: (err) => toast.error(err.response?.data?.message || "Failed to redeem goal"),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteGoal,
        onSuccess: () => {
            queryClient.invalidateQueries(["goals"]);
            queryClient.invalidateQueries(["dashboard-analytics"]);
            toast.success("Goal deleted");
            setDeleteId(null);
        },
        onError: (err) => toast.error("Failed to delete goal")
    });

    const confirmDelete = (id) => {
        setDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = () => {
        if (deleteId) {
            deleteMutation.mutate(deleteId);
        }
    };

    const triggerConfetti = () => {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const random = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: random(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: random(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    };

    const handleCreate = () => {
        if (!newGoal.title || !newGoal.targetAmount) {
            toast.error("Please fill in title and amount");
            return;
        }
        createMutation.mutate({
            ...newGoal,
            targetAmount: Number(newGoal.targetAmount)
        });
    };

    const handleAddFunds = () => {
        if (!fundAmount || Number(fundAmount) <= 0) return toast.error("Enter a valid amount");
        addFundsMutation.mutate({ id: selectedGoal._id, amount: fundAmount });
    };

    // Calculate overall progress
    const activeGoals = goals.filter(g => !g.redeemed);
    const totalTarget = activeGoals.reduce((acc, g) => acc + g.targetAmount, 0);
    const totalSaved = activeGoals.reduce((acc, g) => acc + g.savedAmount, 0);
    const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                        <Trophy className="w-10 h-10 text-yellow-500" />
                        Financial Goals
                    </h1>
                    <p className="text-gray-600 mt-1">Dream big and track your progress</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="shadow-lg shadow-indigo-200">
                    <Plus className="w-5 h-5 mr-2" /> Set New Goal
                </Button>
            </div>

            {/* Overall Progress Card */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                        <div className="md:col-span-2 space-y-4">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Target className="w-6 h-6 text-indigo-200" /> Overall Progress
                            </h2>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium text-indigo-100">
                                    <span>Total Saved: {formatCurrency(totalSaved)}</span>
                                    <span>Target: {formatCurrency(totalTarget)}</span>
                                </div>
                                <div className="h-4 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full relative"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${overallProgress}%` }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                    >
                                        <div className="absolute top-0 right-0 bottom-0 w-1 bg-white/50"></div>
                                    </motion.div>
                                </div>
                            </div>
                            <p className="text-indigo-100/80 text-sm max-w-lg">
                                You are {overallProgress.toFixed(1)}% of the way to achieving all your financial dreams. Keep going!
                            </p>
                        </div>
                        <div className="flex justify-center md:justify-end">
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-center border border-white/20 min-w-[150px]">
                                <p className="text-indigo-200 text-sm font-bold uppercase tracking-wider mb-1">Active Goals</p>
                                <p className="text-4xl font-extrabold">{activeGoals.length}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Goals Grid */}
            {isLoading ? (
                <div className="text-center py-20 flex flex-col items-center">
                    <Trophy className="w-10 h-10 text-gray-300 animate-pulse mb-4" />
                    <p className="text-gray-500">Loading your goals...</p>
                </div>
            ) : activeGoals.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Target className="w-10 h-10 text-indigo-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Active Goals</h3>
                    <p className="text-gray-500 max-w-sm mx-auto mb-6">Start saving for a car, house, or vacation.</p>
                    <Button onClick={() => setIsModalOpen(true)}>Create First Goal</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {activeGoals.map((goal, idx) => {
                            const progress = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
                            const isCompleted = progress >= 100;

                            return (
                                <motion.div
                                    key={goal._id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.1 }}
                                >
                                    <Card className={`relative h-full flex flex-col hover:shadow-xl transition-all duration-300 group ${isCompleted ? 'border-2 border-yellow-400 bg-yellow-50/30' : ''}`}>
                                        {isCompleted && (
                                            <div className="absolute top-0 right-0 p-2 bg-yellow-400 text-yellow-900 font-bold text-xs rounded-bl-xl shadow-sm z-10 flex items-center gap-1">
                                                <Trophy size={12} /> COMPLETED
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">{goal.title}</h3>
                                                {(goal.isFamily || goal.familyId) && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] uppercase font-bold rounded-md">
                                                            <Share2 size={10} /> Shared
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] uppercase font-bold rounded-md border border-rose-200">
                                                            FAMILY
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => confirmDelete(goal._id)}
                                                className="text-gray-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>

                                        <div className="mb-6 space-y-2">
                                            <div className="flex justify-between items-end">
                                                <span className="text-3xl font-bold text-gray-900">{formatCurrency(goal.savedAmount)}</span>
                                                <span className="text-sm font-medium text-gray-500">of {formatCurrency(goal.targetAmount)}</span>
                                            </div>

                                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                                <motion.div
                                                    className={`h-full rounded-full ${isCompleted ? 'bg-yellow-500' : 'bg-indigo-600'}`}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progress}%` }}
                                                    transition={{ duration: 1 }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-xs font-bold text-gray-500">
                                                <span className={isCompleted ? 'text-yellow-600' : 'text-indigo-600'}>{progress.toFixed(0)}% Done</span>
                                                {goal.deadline && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={12} /> {new Date(goal.deadline).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-4 border-t border-gray-100">
                                            <Button
                                                className={`w-full ${isCompleted ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200' : ''}`}
                                                variant={isCompleted ? "default" : "outline"}
                                                onClick={() => {
                                                    if (isCompleted) {
                                                        setSelectedGoal(goal);
                                                        setRedeemModalOpen(true);
                                                    } else {
                                                        setSelectedGoal(goal);
                                                        setFundModalOpen(true);
                                                    }
                                                }}
                                            >
                                                {isCompleted ? (
                                                    <span className="flex items-center gap-2"><CheckCircle size={16} /> Redeem & Spend</span>
                                                ) : "Add Funds"}
                                            </Button>
                                        </div>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Create Goal Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-100 bg-gray-50">
                                <h2 className="text-2xl font-bold text-gray-900">Set New Goal</h2>
                                <p className="text-gray-500 text-sm">Define your financial target</p>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Goal Title</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                        placeholder="e.g. Dream Vacation"
                                        value={newGoal.title}
                                        onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Target Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                                            {user?.currency === "INR" ? "₹" : user?.currency === "EUR" ? "€" : user?.currency === "GBP" ? "£" : user?.currency === "JPY" ? "¥" : "$"}
                                        </span>
                                        <input
                                            type="number"
                                            className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition font-medium"
                                            placeholder="5000"
                                            value={newGoal.targetAmount}
                                            onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Target Date (Optional)</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                        value={newGoal.deadline}
                                        onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 cursor-pointer" onClick={() => setNewGoal({ ...newGoal, shared: !newGoal.shared })}>
                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${newGoal.shared ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>
                                        {newGoal.shared && <Share2 size={12} className="text-white" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">Share with Family</p>
                                        <p className="text-xs text-gray-500">Allow family members to view and contribute</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-4">
                                <Button variant="outline" className="flex-1 py-3 h-auto" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button className="flex-1 py-3 h-auto shadow-lg shadow-indigo-200" onClick={handleCreate}>Create Goal</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Add Funds Modal */}
            <AnimatePresence>
                {fundModalOpen && selectedGoal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-100 bg-gray-50">
                                <h2 className="text-xl font-bold text-gray-900">Add Funds</h2>
                                <p className="text-gray-500 text-sm">Contributing to <span className="font-bold text-indigo-700">{selectedGoal.title}</span></p>
                            </div>
                            <div className="p-6">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Amount to Add</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                                        {user?.currency === "INR" ? "₹" : user?.currency === "EUR" ? "€" : user?.currency === "GBP" ? "£" : user?.currency === "JPY" ? "¥" : "$"}
                                    </span>
                                    <input
                                        type="number"
                                        className="w-full pl-8 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:border-indigo-500 outline-none transition font-bold text-xl text-gray-900"
                                        value={fundAmount}
                                        onChange={(e) => setFundAmount(e.target.value)}
                                        autoFocus
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="mt-4 flex justify-between text-xs text-gray-500">
                                    <span>Current: {formatCurrency(selectedGoal.savedAmount)}</span>
                                    <span>Target: {formatCurrency(selectedGoal.targetAmount)}</span>
                                </div>
                            </div>
                            <div className="p-6 pt-0 flex gap-3">
                                <Button variant="outline" className="flex-1" onClick={() => setFundModalOpen(false)}>Cancel</Button>
                                <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200" onClick={handleAddFunds}>Confirm</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Redeem Modal */}
            <AnimatePresence>
                {redeemModalOpen && selectedGoal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-100 bg-gray-50">
                                <h2 className="text-xl font-bold text-gray-900">Redeem & Budget</h2>
                                <p className="text-gray-500 text-sm">You did it! Time to enjoy the rewards.</p>
                            </div>
                            <div className="p-6 text-center space-y-4">
                                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                                    <Trophy className="w-8 h-8 text-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-gray-600">This action will:</p>
                                    <ul className="text-sm text-left text-gray-500 mt-2 space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                        <li className="flex gap-2 items-center"><CheckCircle size={14} className="text-green-500" /> Move <b>{formatCurrency(selectedGoal.savedAmount)}</b> to Income</li>
                                        <li className="flex gap-2 items-center"><CheckCircle size={14} className="text-green-500" /> Create budget for <b>"{selectedGoal.title}"</b></li>
                                        <li className="flex gap-2 items-center"><CheckCircle size={14} className="text-green-500" /> Mark goal as completed</li>
                                    </ul>
                                </div>
                            </div>
                            <div className="p-6 pt-0 flex gap-3">
                                <Button variant="outline" className="flex-1" onClick={() => setRedeemModalOpen(false)}>Cancel</Button>
                                <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200" onClick={() => redeemMutation.mutate(selectedGoal._id)}>
                                    Confirm Redeem
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Delete Goal"
                message="Are you sure you want to delete this goal? This action cannot be undone."
                confirmText="Delete"
                isDanger={true}
            />
        </div>
    );
}
