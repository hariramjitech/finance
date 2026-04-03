import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTransactions, exportTransactions, deleteTransaction } from "../api/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { format, subDays } from "date-fns";
import { Download, Plus, Search, Trash2, ArrowUpRight, ArrowDownRight, Filter, Upload, Pencil } from "lucide-react";
import AddTransactionModal from "../components/transactions/AddTransactionModal";
import BankStatementModal from "../components/transactions/BankStatementModal";
import ConfirmModal from "../components/ui/ConfirmModal";
import toast from "../components/ui/Toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";

export default function Transactions() {
    const { formatCurrency } = useAuth();
    const queryClient = useQueryClient();

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);

    // Delete Confirmation State
    const [deleteId, setDeleteId] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Editing State
    const [editTx, setEditTx] = useState(null);

    // Filters
    const [search, setSearch] = useState("");
    const [dateFilter, setDateFilter] = useState("all"); // all, week, month, year
    const [filterType, setFilterType] = useState("all");

    const { data: transactions = [] } = useQuery({
        queryKey: ['transactions'],
        queryFn: async () => {
            const res = await getTransactions();
            return res.data;
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries(['transactions']);
            toast.success("Transaction deleted");
            setDeleteId(null);
        },
        onError: () => toast.error("Failed to delete transaction")
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

    const handleEdit = (tx) => {
        setEditTx(tx);
        setIsModalOpen(true);
    };

    const filteredTxs = useMemo(() => {
        return transactions.filter(t => {
            const matchesSearch = (t.description || "").toLowerCase().includes(search.toLowerCase()) ||
                (t.category || "").toLowerCase().includes(search.toLowerCase());
            const matchesType = filterType === "all" || t.type === filterType;

            // Date Filter
            const txDate = new Date(t.date);
            let matchesDate = true;
            const today = new Date();

            if (dateFilter === 'week') {
                matchesDate = txDate >= subDays(today, 7);
            } else if (dateFilter === 'month') {
                matchesDate = txDate >= subDays(today, 30);
            } else if (dateFilter === 'year') {
                matchesDate = txDate >= subDays(today, 365);
            }

            return matchesSearch && matchesType && matchesDate;
        }).sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            // If dates are different (ignoring time if it's just date strings, but here we compare full Date objects)
            // If the time diff is significant (more than a second?), use date.
            // Actually, best to just compare valueof.
            if (dateA.getTime() !== dateB.getTime()) {
                return dateB - dateA;
            }
            // Secondary sort: CreatedAt desc
            const createdA = new Date(a.createdAt || 0);
            const createdB = new Date(b.createdAt || 0);
            return createdB - createdA;
        });
    }, [transactions, search, filterType, dateFilter]);

    const stats = useMemo(() => {
        const income = filteredTxs.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
        const expense = filteredTxs.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
        return { income, expense, balance: income - expense };
    }, [filteredTxs]);

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Transactions</h1>
                    <p className="text-gray-500 mt-1">Manage and track your financial history</p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={() => setIsBankModalOpen(true)} variant="outline" className="flex items-center gap-2 bg-white border-gray-200 text-gray-700 hover:bg-gray-50">
                        <Upload size={16} /> <span className="hidden sm:inline">Scan Statement</span>
                    </Button>
                    <Button onClick={() => { setEditTx(null); setIsModalOpen(true); }} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 transition-all hover:scale-105 active:scale-95">
                        <Plus size={16} /> <span>Add Transaction</span>
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 border-0 shadow-sm bg-indigo-50 text-indigo-900 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Filter size={64} /></div>
                    <p className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-1">Net Flow</p>
                    <h3 className="text-3xl font-bold">{formatCurrency(stats.balance)}</h3>
                </Card>
                <Card className="p-6 border-0 shadow-sm bg-emerald-50 text-emerald-900 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><ArrowUpRight size={64} /></div>
                    <p className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Income</p>
                    <h3 className="text-3xl font-bold">{formatCurrency(stats.income)}</h3>
                </Card>
                <Card className="p-6 border-0 shadow-sm bg-rose-50 text-rose-900 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><ArrowDownRight size={64} /></div>
                    <p className="text-sm font-bold text-rose-600 uppercase tracking-wider mb-1">Total Expenses</p>
                    <h3 className="text-3xl font-bold">{formatCurrency(stats.expense)}</h3>
                </Card>
            </div>

            {/* Filter Bar */}
            <Card className="overflow-hidden border-0 shadow-xl">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col xl:flex-row gap-4 justify-between items-center">

                    {/* Search */}
                    <div className="relative w-full xl:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Filters Group */}
                    <div className="flex flex-wrap gap-3 items-center justify-center xl:justify-end w-full">

                        {/* Type Filter */}
                        <div className="flex bg-gray-200/50 p-1 rounded-xl">
                            {['all', 'income', 'expense'].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${filterType === type
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>

                        <div className="w-px h-8 bg-gray-300 hidden sm:block"></div>

                        {/* Date Filter */}
                        <div className="flex bg-gray-200/50 p-1 rounded-xl">
                            {[
                                { id: 'all', label: 'All Time' },
                                { id: 'week', label: '7 Days' },
                                { id: 'month', label: '30 Days' },
                                { id: 'year', label: 'Year' }
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setDateFilter(item.id)}
                                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${dateFilter === item.id
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                    </div>
                </div>

                {/* Desktop View (Table) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="text-right py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            <AnimatePresence mode="popLayout">
                                {filteredTxs.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-12">
                                            <div className="flex flex-col items-center justify-center text-gray-400">
                                                <Search className="w-12 h-12 mb-3 opacity-20" />
                                                <p>No transactions found matching your criteria.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTxs.map((t) => (
                                        <motion.tr
                                            key={t._id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                                            onClick={() => handleEdit(t)}
                                        >
                                            <td className="py-4 px-6 text-sm text-gray-600 whitespace-nowrap">
                                                {format(new Date(t.date), 'MMM dd, yyyy')}
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="font-semibold text-gray-900">{t.description || "—"}</div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                    {t.category}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <div className={`text-sm font-bold flex items-center gap-1 ${t.type === 'income' ? 'text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg w-fit' : 'text-gray-900'
                                                    }`}>
                                                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEdit(t); }}
                                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                        title="Edit"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => confirmDelete(t._id)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {/* Mobile View (Cards) */}
                <div className="md:hidden space-y-4 p-4">
                    <AnimatePresence mode="popLayout">
                        {filteredTxs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-gray-400 py-12">
                                <Search className="w-12 h-12 mb-3 opacity-20" />
                                <p>No transactions found.</p>
                            </div>
                        ) : (
                            filteredTxs.map((t) => (
                                <motion.div
                                    key={t._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm active:scale-95 transition-transform"
                                    onClick={() => handleEdit(t)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-gray-900 text-base">{t.description || "Untitled"}</h4>
                                            <p className="text-xs text-gray-500">{format(new Date(t.date), 'MMM dd, yyyy')}</p>
                                        </div>
                                        <div className={`text-sm font-bold px-2 py-1 rounded-lg ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'text-gray-900'
                                            }`}>
                                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-3">
                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                                            {t.category}
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEdit(t); }}
                                                className="p-2 text-gray-400 hover:text-indigo-600 active:bg-indigo-50 rounded-lg transition"
                                                title="Edit"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); confirmDelete(t._id); }}
                                                className="p-2 text-gray-400 hover:text-red-500 active:bg-red-50 rounded-lg transition"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </Card>

            <AddTransactionModal
                key={editTx ? editTx._id : 'new'}
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditTx(null); }}
                initialData={editTx}
            />

            <BankStatementModal
                isOpen={isBankModalOpen}
                onClose={() => setIsBankModalOpen(false)}
            />

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Delete Transaction"
                message="Are you sure you want to delete this transaction? This action cannot be undone."
                confirmText="Delete"
                isDanger={true}
            />
        </div>
    );
}