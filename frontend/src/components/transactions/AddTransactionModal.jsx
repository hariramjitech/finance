import { useState } from 'react';
import { X, Calendar, Tag, Camera, Upload } from 'lucide-react';
import { addTransaction, scanReceipt } from '../../api/api';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';

const categories = {
    expense: ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Other"],
    income: ["Salary", "Freelance", "Investment", "Gift", "Other"]
};

import { useAuth } from "../../context/AuthContext";

import { updateTransaction } from '../../api/api';

export default function AddTransactionModal({ isOpen, onClose, initialData = null }) {
    const { user } = useAuth();
    const [form, setForm] = useState({
        type: initialData?.type || 'expense',
        category: initialData?.category || '',
        amount: initialData?.amount || '',
        description: initialData?.description || '',
        date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    const [scanning, setScanning] = useState(false);

    const queryClient = useQueryClient();

    // Reset form when modal opens/closes or initialData changes
    // But we need to be careful not to reset while typing.
    // Ideally put this in useEffect or use key on the Modal component

    if (!isOpen) return null;

    const handleSubmit = async () => {
        try {
            const data = { ...form, amount: Number(form.amount) };

            if (initialData) {
                await updateTransaction(initialData._id, data);
                toast.success("Transaction updated successfully!");
            } else {
                const res = await addTransaction(data);
                toast.success("Transaction added successfully!");
                if (res.data.alertMessage) {
                    toast(res.data.alertMessage, {
                        icon: '⚠️',
                        duration: 5000,
                        style: { background: '#FEF2F2', color: '#991B1B', border: '1px solid #F87171' }
                    });
                }
            }

            queryClient.invalidateQueries(['transactions']);
            queryClient.invalidateQueries(['dashboard-analytics']);
            queryClient.invalidateQueries(['budgets']);

            onClose();
        } catch (err) {
            toast.error(initialData ? "Failed to update transaction" : "Failed to add transaction");
        }
    };



    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setScanning(true);
        const toastId = toast.loading("Scanning receipt...");

        try {
            const res = await scanReceipt(file);
            const { amount, date, category, merchant } = res.data;

            setForm(prev => ({
                ...prev,
                amount: amount || prev.amount,
                date: date ? new Date(date).toISOString().split('T')[0] : prev.date,
                category: category || prev.category,
                description: merchant || prev.description,
                type: 'expense' // Receipt usually means expense
            }));

            toast.success("Receipt scanned!", { id: toastId });
        } catch (error) {
            toast.error("Process failed", { id: toastId });
        } finally {
            setScanning(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Add Transaction</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                            <X size={24} />
                        </button>
                    </div>

                    {/* AI Tools Section */}
                    <div className="flex gap-3 mb-6">
                        {/* Scan Button */}
                        <label className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition text-gray-600 font-medium text-xs sm:text-sm group">
                            <Camera className="w-4 h-4 group-hover:scale-110 transition" />
                            <span>{scanning ? "Scanning..." : "Scan Receipt"}</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={scanning} />
                        </label>
                    </div>



                    <div className="space-y-4">
                        {/* Type Toggle */}
                        <div className="flex p-1 bg-gray-100 rounded-xl">
                            <button
                                onClick={() => setForm({ ...form, type: 'expense', category: '' })}
                                className={`flex-1 py-2 rounded-lg font-medium transition text-sm ${form.type === 'expense'
                                    ? 'bg-white text-red-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Expense
                            </button>
                            <button
                                onClick={() => setForm({ ...form, type: 'income', category: '' })}
                                className={`flex-1 py-2 rounded-lg font-medium transition text-sm ${form.type === 'income'
                                    ? 'bg-white text-green-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Income
                            </button>
                        </div>

                        {/* Category */}
                        <div>
                            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                                Category
                            </label>
                            <select
                                value={form.category}
                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
                                required
                            >
                                <option value="">Select category</option>
                                {categories[form.type].map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Amount & Date */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1 block">Amount</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3 text-gray-400">
                                        {user?.currency === "INR" ? "₹" : user?.currency === "EUR" ? "€" : user?.currency === "GBP" ? "£" : user?.currency === "JPY" ? "¥" : "$"}
                                    </span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                        className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1 block">Date</label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1 block">Description</label>
                            <input
                                type="text"
                                placeholder="What's this for?"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            />
                        </div>

                        <Button
                            onClick={handleSubmit}
                            disabled={!form.category || !form.amount || scanning}
                            className="w-full py-4 mt-2"
                        >
                            {initialData ? "Update Transaction" : "Confirm Transaction"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}