// src/pages/EMI.jsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getEMIs, addEMI, deleteEMI } from "../api/api";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Calendar, DollarSign, Percent, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";

import { useAuth } from "../context/AuthContext";

export default function EMI() {
    const { formatCurrency } = useAuth();
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        loanName: "",
        amount: "",
        interestRate: "",
        dueDate: new Date().toISOString().split("T")[0],
    });

    const { data: emis = [], isLoading } = useQuery({
        queryKey: ["emis"],
        queryFn: async () => {
            const res = await getEMIs();
            return res.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: addEMI,
        onSuccess: () => {
            queryClient.invalidateQueries(["emis"]);
            queryClient.invalidateQueries(["dashboard-analytics"]);
            setIsModalOpen(false);
            setFormData({ loanName: "", amount: "", interestRate: "", dueDate: new Date().toISOString().split("T")[0] });
            toast.success("EMI added successfully!");
        },
        onError: () => toast.error("Failed to add EMI"),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteEMI,
        onSuccess: () => {
            queryClient.invalidateQueries(["emis"]);
            queryClient.invalidateQueries(["dashboard-analytics"]);
            toast.success("EMI deleted");
        },
        onError: () => toast.error("Failed to delete EMI"),
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        createMutation.mutate({ ...formData, amount: Number(formData.amount), interestRate: Number(formData.interestRate) });
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900">EMI Tracker</h1>
                    <p className="text-gray-600 mt-1">Manage your loans and monthly installments</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
                    <Plus size={20} /> Add Loan
                </Button>
            </div>

            {isLoading ? (
                <div className="text-center py-12">Loading EMIs...</div>
            ) : emis.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                    <p className="text-gray-500 text-lg">No EMIs found. Add one to track your loans!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {emis.map((emi, index) => (
                            <motion.div
                                key={emi._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="hover:shadow-xl transition-all border-l-4 border-l-indigo-500 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition z-10">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm(`Delete loan "${emi.loanName}"?`)) {
                                                    deleteMutation.mutate(emi._id);
                                                }
                                            }}
                                            className="p-2 bg-white text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg shadow-sm transition"
                                            title="Delete Loan"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-1">{emi.loanName}</h3>
                                    <div className="space-y-3 mt-4">
                                        <div className="flex items-center justify-between text-gray-600">
                                            <span className="flex items-center gap-2"><DollarSign size={16} /> Amount</span>
                                            <span className="font-semibold text-gray-900">{formatCurrency(emi.amount)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-gray-600">
                                            <span className="flex items-center gap-2"><Percent size={16} /> Interest</span>
                                            <span className="font-semibold text-gray-900">{emi.interestRate}%</span>
                                        </div>
                                        <div className="flex items-center justify-between text-gray-600">
                                            <span className="flex items-center gap-2"><Calendar size={16} /> Due Date</span>
                                            <span className="font-semibold text-indigo-600">
                                                {new Date(emi.dueDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Add Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                    >
                        <div className="p-6">
                            <h2 className="text-2xl font-bold mb-6">Add New Loan</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Loan Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.loanName}
                                        onChange={e => setFormData({ ...formData, loanName: e.target.value })}
                                        placeholder="e.g., Home Loan"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">EMI Amount</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.amount}
                                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        required
                                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.interestRate}
                                        onChange={e => setFormData({ ...formData, interestRate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Next Due Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.dueDate}
                                        onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="flex-1">
                                        Save Loan
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
