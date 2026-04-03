// src/pages/Investments.jsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getInvestments, addInvestment, searchStocks, getStockDetail, deleteInvestment, sellInvestment, getStockRecommendations } from "../api/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Plus, Search, Loader2, Trash2, ArrowRight, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import ConfirmModal from "../components/ui/ConfirmModal";

export default function Investments() {
    const { formatCurrency, user } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    const [newInv, setNewInv] = useState({
        name: "",
        type: "stocks",
        amount: "",
        risk: "medium"
    });

    const [showSellModal, setShowSellModal] = useState(false);
    const [selectedInvForSell, setSelectedInvForSell] = useState(null);
    const [sellAmount, setSellAmount] = useState("");

    // Delete Confirmation State
    const [deleteId, setDeleteId] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const queryClient = useQueryClient();

    const { data: investments = [], isLoading } = useQuery({
        queryKey: ["investments"],
        queryFn: () => getInvestments().then((res) => res.data),
    });

    const { data: recommendations = [], isLoading: recsLoading } = useQuery({
        queryKey: ["stock-recommendations"],
        queryFn: () => getStockRecommendations().then((res) => res.data),
        enabled: showModal, // Only fetch when modal is open
        staleTime: 1000 * 60 * 60, // Cache for 1 hour
    });

    const mutation = useMutation({
        mutationFn: addInvestment,
        onSuccess: () => {
            queryClient.invalidateQueries(["investments"]);
            toast.success("Investment added successfully!");
            setShowModal(false);
            setNewInv({ name: "", type: "stocks", amount: "", risk: "medium" });
            setSearchQuery("");
            setSearchResults([]);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to add investment");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteInvestment,
        onSuccess: () => {
            queryClient.invalidateQueries(["investments"]);
            queryClient.invalidateQueries(["dashboard-analytics"]);
            toast.success("Investment deleted");
            setDeleteId(null);
        },
        onError: () => toast.error("Failed to delete investment"),
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

    const sellMutation = useMutation({
        mutationFn: ({ id, sellAmount }) => sellInvestment(id, { sellAmount }),
        onSuccess: (data) => {
            queryClient.invalidateQueries(["investments"]);
            queryClient.invalidateQueries(["dashboard-analytics"]);
            queryClient.invalidateQueries(["transactions"]);
            toast.success(data.data.message || "Investment sold successfully!");
            setShowSellModal(false);
            setSellAmount("");
            setSelectedInvForSell(null);
        },
        onError: (err) => toast.error("Failed to sell investment"),
    });

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery) return;
        setSearching(true);
        try {
            const res = await searchStocks(searchQuery);
            setSearchResults(res.data.bestMatches || res.data || []);
        } catch (err) {
            toast.error("Search failed");
        } finally {
            setSearching(false);
        }
    };

    const selectStock = async (symbol) => {
        setNewInv({ ...newInv, name: symbol, type: 'stocks' });
        setSearchResults([]);
        setSearchQuery("");
        try {
            const res = await getStockDetail(symbol);
            if (res.data && res.data.price) {
                toast.success(`Current price for ${symbol}: $${res.data.price}`);
            }
        } catch (e) { /* ignore */ }
    };

    const handleAdd = () => {
        if (!newInv.name || !newInv.amount) {
            toast.error("Please fill required fields (Name & Amount)");
            return;
        }
        mutation.mutate({
            ...newInv,
            amount: Number(newInv.amount),
        });
    };

    const totalValue = investments.reduce((sum, i) => sum + (i.amount || 0), 0);
    const totalReturns = investments.reduce((sum, i) => sum + (i.returns || 0), 0);
    const avgGrowth = investments.length ? (totalReturns / investments.length) : 0;

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                        <TrendingUp className="w-10 h-10 text-indigo-600" />
                        Investment Portfolio
                    </h1>
                    <p className="text-gray-600 mt-1">Track your wealth and market performance</p>
                </div>
                <Button onClick={() => setShowModal(true)} className="shadow-lg shadow-indigo-200">
                    <Plus className="w-5 h-5 mr-2" /> Add New Asset
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-0 shadow-2xl overflow-hidden relative group h-full">
                        <div className="absolute top-0 right-0 p-8 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl group-hover:bg-white/20 transition duration-500"></div>
                        <div className="relative z-10">
                            <p className="text-indigo-100 font-medium mb-1">Total Portfolio Value</p>
                            <h2 className="text-4xl font-extrabold tracking-tight">{formatCurrency(totalValue)}</h2>
                        </div>
                        <div className="absolute bottom-6 left-6 right-6">
                            <div className="flex items-center gap-2 text-sm bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm w-fit">
                                <BarChart3 className="w-4 h-4 text-indigo-200" />
                                <span>{investments.length} Active Assets</span>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Card className="bg-white border-white shadow-xl h-full relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-2xl -mr-10 -mt-10 opacity-50 group-hover:opacity-100 transition"></div>
                        <p className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-2">Overall Returns</p>
                        <div className={`text-4xl font-extrabold flex items-center gap-2 ${avgGrowth >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {avgGrowth >= 0 ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
                            {Math.abs(avgGrowth).toFixed(2)}%
                        </div>
                        <p className="text-sm text-gray-400 mt-4 font-medium">Weighted average across portfolio</p>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <button
                        className="w-full h-full min-h-[160px] flex flex-col items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
                        onClick={() => setShowModal(true)}
                    >
                        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-md transition duration-300">
                            <Plus className="w-8 h-8 text-indigo-600" />
                        </div>
                        <p className="font-bold text-gray-700 group-hover:text-indigo-700">Add New Asset</p>
                        <p className="text-xs text-gray-400 mt-1">Stocks, Crypto, Real Estate</p>
                    </button>
                </motion.div>
            </div>

            {/* Investment List */}
            {isLoading ? (
                <div className="text-center py-20 flex flex-col items-center">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                    <p className="text-gray-500">Loading your portfolio...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {investments.map((inv, idx) => (
                            <motion.div
                                key={inv._id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                <Card className={`relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-t-4 ${inv.returns >= 0 ? 'border-t-emerald-500' : 'border-t-rose-500'
                                    }`}>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-700 font-bold text-lg shadow-inner">
                                                {inv.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900 leading-tight">{inv.name}</h3>
                                                <span className="inline-block px-2 py-0.5 mt-1 bg-gray-100 text-gray-500 text-[10px] uppercase font-bold tracking-wider rounded-md">
                                                    {inv.type}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${inv.returns >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                                            {inv.returns >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                            {Math.abs(inv.returns)}%
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="p-3 bg-gray-50 rounded-xl">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Invested</p>
                                            <p className="text-lg font-bold text-gray-900">{formatCurrency(inv.amount)}</p>
                                        </div>
                                        <div className="p-3 bg-indigo-50 rounded-xl">
                                            <p className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider mb-1">Current Value</p>
                                            <p className="text-lg font-bold text-indigo-700">{formatCurrency(inv.currentValue || inv.amount)}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-4 px-1">
                                        <span>Risk Profile</span>
                                        <span className={`px-2 py-0.5 rounded-full uppercase text-[10px] ${inv.risk === 'high' ? 'bg-orange-100 text-orange-700' :
                                            inv.risk === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>{inv.risk}</span>
                                    </div>

                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        <Button
                                            variant="outline"
                                            className="flex-1 h-9 text-xs border-gray-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedInvForSell(inv);
                                                setSellAmount(inv.currentValue ? inv.currentValue : inv.amount);
                                                setShowSellModal(true);
                                            }}
                                        >
                                            <DollarSign size={14} className="mr-1" /> Sell
                                        </Button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                confirmDelete(inv._id);
                                            }}
                                            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Sell Investment Modal */}
            <AnimatePresence>
                {showSellModal && selectedInvForSell && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-100 bg-gray-50">
                                <h2 className="text-xl font-bold text-gray-900">Sell Asset</h2>
                                <p className="text-gray-500 text-sm">Liquidating <span className="font-bold text-gray-900">{selectedInvForSell.name}</span></p>
                            </div>
                            <div className="p-6">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total Sale Amount</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                                        {user?.currency === "INR" ? "₹" : user?.currency === "EUR" ? "€" : user?.currency === "GBP" ? "£" : user?.currency === "JPY" ? "¥" : "$"}
                                    </span>
                                    <input
                                        type="number"
                                        className="w-full pl-8 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:border-emerald-500 outline-none transition font-bold text-xl text-gray-900"
                                        value={sellAmount}
                                        onChange={(e) => setSellAmount(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="mt-4 flex justify-between text-xs text-gray-500 px-1">
                                    <span>Initial Investment:</span>
                                    <span className="font-bold text-gray-900">{formatCurrency(selectedInvForSell.amount)}</span>
                                </div>
                            </div>
                            <div className="p-6 pt-0 flex gap-3">
                                <Button variant="outline" className="flex-1" onClick={() => setShowSellModal(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200"
                                    onClick={() => sellMutation.mutate({ id: selectedInvForSell._id, sellAmount })}
                                >
                                    Confirm Sale
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Add Investment Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b border-gray-100 bg-gray-50">
                                <h2 className="text-2xl font-bold text-gray-900">Add New Asset</h2>
                                <p className="text-gray-500 text-sm">Search via API or add manually</p>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar">
                                {/* Search Section */}
                                <div className="mb-6 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                                    <label className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2 block flex items-center gap-1">
                                        <Search size={12} /> Search Stock Symbol
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="e.g. MSFT, BTC-USD"
                                            className="flex-1 px-4 py-2.5 rounded-xl border-2 border-indigo-100 focus:border-indigo-500 outline-none transition bg-white"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                                        />
                                        <Button onClick={handleSearch} disabled={searching} className="rounded-xl px-4">
                                            {searching ? <Loader2 className="animate-spin" /> : <ArrowRight size={18} />}
                                        </Button>
                                    </div>

                                    {/* Search Results */}
                                    <AnimatePresence>
                                        {searchResults.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="mt-3 bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden"
                                            >
                                                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                    {searchResults.map((result, i) => (
                                                        <div
                                                            key={i}
                                                            role="button"
                                                            tabIndex={0}
                                                            className="px-4 py-3 hover:bg-indigo-50 cursor-pointer text-sm flex justify-between items-center border-b border-gray-50 last:border-0 transition-colors focus:bg-indigo-50 focus:outline-none"
                                                            onClick={() => selectStock(result["1. symbol"] || result.symbol)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    selectStock(result["1. symbol"] || result.symbol);
                                                                }
                                                            }}
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-gray-900">{result["1. symbol"] || result.symbol}</span>
                                                                <span className="text-xs text-indigo-500 font-medium">{result.exchDisp || result.type}</span>
                                                            </div>
                                                            <span className="text-gray-500 truncate max-w-[120px] text-right text-xs">{result["2. name"] || result.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* AI Recommendations */}
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Sparkles className="w-4 h-4 text-purple-600" />
                                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">AI Market Picks</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {recsLoading ? (
                                            <div className="col-span-2 text-center py-4 text-gray-400 text-xs">
                                                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                                                Analyzing market trends...
                                            </div>
                                        ) : (
                                            recommendations.map((rec, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: i * 0.1 }}
                                                    className="p-3 border border-gray-100 rounded-xl hover:shadow-md hover:border-purple-200 cursor-pointer transition-all bg-white group"
                                                    onClick={() => selectStock(rec.symbol)}
                                                >
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{rec.symbol}</span>
                                                        <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded font-bold ${rec.risk === 'High' ? 'bg-orange-100 text-orange-700' :
                                                            rec.risk === 'Low' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                                            }`}>{rec.risk}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 line-clamp-2">{rec.reason}</p>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Asset Name</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                            value={newInv.name}
                                            onChange={(e) => setNewInv({ ...newInv, name: e.target.value })}
                                            placeholder="e.g. Apple Inc."
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Type</label>
                                            <div className="relative">
                                                <select
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                                                    value={newInv.type}
                                                    onChange={(e) => setNewInv({ ...newInv, type: e.target.value })}
                                                >
                                                    <option value="stocks">Stocks</option>
                                                    <option value="mutualfund">Mutual Fund</option>
                                                    <option value="crypto">Crypto</option>
                                                    <option value="realestate">Real Estate</option>
                                                    <option value="gold">Gold</option>
                                                    <option value="bonds">Bonds</option>
                                                    <option value="other">Other</option>
                                                </select>
                                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                                                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Risk Level</label>
                                            <div className="relative">
                                                <select
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                                                    value={newInv.risk}
                                                    onChange={(e) => setNewInv({ ...newInv, risk: e.target.value })}
                                                >
                                                    <option value="low">Low</option>
                                                    <option value="medium">Medium</option>
                                                    <option value="high">High</option>
                                                </select>
                                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                                                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Amount Invested</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                                                {user?.currency === "INR" ? "₹" : user?.currency === "EUR" ? "€" : user?.currency === "GBP" ? "£" : user?.currency === "JPY" ? "¥" : "$"}
                                            </span>
                                            <input
                                                type="number"
                                                className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition font-medium"
                                                value={newInv.amount}
                                                onChange={(e) => setNewInv({ ...newInv, amount: e.target.value })}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-4">
                                <Button variant="outline" className="flex-1 py-3 h-auto" onClick={() => setShowModal(false)}>
                                    Cancel
                                </Button>
                                <Button className="flex-1 py-3 h-auto shadow-lg shadow-indigo-200 bg-indigo-600 hover:bg-indigo-700" onClick={handleAdd}>
                                    Confirm Asset
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
                title="Delete Investment"
                message="Are you sure you want to remove this asset from your portfolio? This cannot be undone."
                confirmText="Delete"
                isDanger={true}
            />
        </div>
    );
}

