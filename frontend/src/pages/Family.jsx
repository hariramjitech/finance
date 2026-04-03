// src/pages/Family.jsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFamily, joinFamily, getFamilyMembers, leaveFamily, getFamilyAnalytics, getProfile, deleteGoal } from "../api/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Users, UserPlus, Shield, Copy, Check, LogOut, TrendingUp, Target, Trash2, Crown, Sparkles, Heart, Trophy, Medal } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";

export default function Family() {
    const { formatCurrency } = useAuth();
    const [inviteCodeInput, setInviteCodeInput] = useState("");
    const [newFamilyName, setNewFamilyName] = useState("");
    const [activeTab, setActiveTab] = useState("create"); // create, join
    const [copied, setCopied] = useState(false);

    const queryClient = useQueryClient();

    const { data: userProfile } = useQuery({
        queryKey: ["profile"],
        queryFn: () => getProfile().then((res) => res.data),
    });

    const { data: familyData, isError } = useQuery({
        queryKey: ["family"],
        queryFn: () => getFamilyMembers().then((res) => res.data),
        retry: false
    });

    const { data: analytics } = useQuery({
        queryKey: ["family-analytics"],
        queryFn: () => getFamilyAnalytics().then((res) => res.data),
        enabled: !!familyData
    });

    const createMutation = useMutation({
        mutationFn: createFamily,
        onSuccess: () => {
            queryClient.invalidateQueries(["family"]);
            toast.success("Family created successfully!");
        },
        onError: (err) => toast.error(err.response?.data?.message || "Failed to create family"),
    });

    const joinMutation = useMutation({
        mutationFn: joinFamily,
        onSuccess: () => {
            queryClient.invalidateQueries(["family"]);
            toast.success("Joined family successfully!");
        },
        onError: (err) => {
            const msg = err.response?.data?.message || "Failed to join family";
            toast.error(msg);
            if (msg.includes("Already")) {
                toast("You are already in a family. Leave it first.");
            }
        },
    });

    const leaveMutation = useMutation({
        mutationFn: leaveFamily,
        onSuccess: () => {
            queryClient.invalidateQueries(["family"]);
            toast.success("Left family successfully");
        },
        onError: (err) => toast.error("Failed to leave family"),
    });

    const deleteGoalMutation = useMutation({
        mutationFn: deleteGoal,
        onSuccess: () => {
            queryClient.invalidateQueries(["family-analytics"]);
            queryClient.invalidateQueries(["dashboard-analytics"]);
            toast.success("Goal deleted");
        },
        onError: (err) => toast.error(err.response?.data?.message || "Failed to delete goal"),
    });

    const handleCreate = () => {
        if (!newFamilyName) return toast.error("Enter a family name");
        createMutation.mutate({ name: newFamilyName });
    };

    const handleJoin = () => {
        if (!inviteCodeInput) return toast.error("Enter an invite code");
        joinMutation.mutate({ inviteCode: inviteCodeInput.toUpperCase() });
    };

    const copyToClipboard = (code) => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        toast.success("Invite code copied!");
        setTimeout(() => setCopied(false), 2000);
    };

    const getMemberName = (id) => {
        const member = familyData?.members?.find(m => m._id === id);
        return member ? member.name : 'Unknown';
    };

    if (!isError && familyData) {
        // Find leader
        const sortedMembers = [...(familyData.members || [])].sort((a, b) => (b.xp || 0) - (a.xp || 0));
        const leaderId = sortedMembers[0]?._id;

        // Has Family
        return (
            <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative rounded-[2rem] overflow-hidden bg-[#0F172A] shadow-2xl"
                >
                    <div className="absolute top-0 right-0 p-40 bg-indigo-600/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <div className="absolute bottom-0 left-0 p-32 bg-purple-600/20 rounded-full blur-3xl -ml-16 -mb-16"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 backdrop-blur-[1px]"></div>

                    <div className="relative z-10 px-8 py-12 flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="text-white text-center md:text-left space-y-2">
                            <div className="flex items-center justify-center md:justify-start gap-4">
                                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                                    <Heart className="w-8 h-8 text-pink-400 fill-pink-400" />
                                </div>
                                <h1 className="text-4xl md:text-5xl font-black tracking-tight">{familyData.name}</h1>
                            </div>
                            <p className="text-indigo-200 text-lg font-medium max-w-lg">Building wealth together, one step at a time. Track shared expenses and compete on savings.</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                            <button
                                className="group flex items-center justify-center gap-3 bg-white text-indigo-900 px-6 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:bg-indigo-50 transition-all active:scale-95"
                                onClick={() => copyToClipboard(familyData.inviteCode)}
                            >
                                <div className="text-left">
                                    <span className="block text-[10px] uppercase tracking-wider text-indigo-400 font-extrabold">Invite Code</span>
                                    <span className="text-xl font-mono tracking-widest">{familyData.inviteCode}</span>
                                </div>
                                {copied ? <Check className="w-6 h-6 text-green-500" /> : <Copy className="w-6 h-6 text-indigo-400 group-hover:text-indigo-600" />}
                            </button>
                            <button
                                onClick={() => {
                                    if (window.confirm("Are you sure you want to leave this family?")) {
                                        leaveMutation.mutate();
                                    }
                                }}
                                className="flex items-center justify-center gap-2 px-6 py-4 bg-red-500/10 backdrop-blur-md text-red-200 hover:bg-red-500/20 rounded-2xl transition border border-red-500/20 hover:border-red-500/40 font-semibold"
                                title="Leave Family"
                            >
                                <LogOut size={20} />
                                <span>Leave</span>
                            </button>
                        </div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Members Section */}
                        <section>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                <span className="bg-indigo-100 p-2 rounded-xl text-indigo-600"><Users size={24} /></span>
                                <span>Family Members</span>
                                <span className="text-sm bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-bold">{familyData.members?.length}</span>
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {familyData.members?.map((member, index) => {
                                    const isLeader = member._id === leaderId;

                                    return (
                                        <motion.div
                                            key={member._id}
                                            whileHover={{ y: -4 }}
                                            className={`relative overflow-hidden rounded-[2rem] p-6 transition-all duration-300 ${isLeader ? 'bg-gradient-to-br from-amber-50 to-white border-2 border-amber-200 shadow-xl shadow-amber-100' : 'bg-white border border-gray-100 shadow-lg shadow-gray-100'}`}
                                        >
                                            {isLeader && (
                                                <div className="absolute top-0 right-0 p-2 bg-amber-100 rounded-bl-2xl">
                                                    <Crown className="w-5 h-5 text-amber-500 fill-amber-500" />
                                                </div>
                                            )}

                                            <div className="flex items-center gap-4 mb-4">
                                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner ${isLeader ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                    {member.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{member.name}</h3>
                                                    <p className="text-xs text-gray-400 font-medium truncate max-w-[120px]">{member.email}</p>
                                                    {member._id === familyData.adminId && <span className="inline-block mt-1 text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-bold uppercase tracking-wide">Admin</span>}
                                                </div>
                                            </div>

                                            <div className="flex items-end justify-between">
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Contribution</p>
                                                    <div className="text-indigo-900 font-black text-2xl flex items-baseline gap-1">
                                                        {member.xp || 0}
                                                        <span className="text-xs font-bold text-indigo-400">XP</span>
                                                    </div>
                                                </div>
                                                {isLeader ? <Trophy className="w-8 h-8 text-amber-300 mb-1" /> : (
                                                    <Medal className="w-6 h-6 text-gray-200 mb-1" />
                                                )}
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </section>

                        {/* Shared Goals Section */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                    <span className="bg-pink-100 p-2 rounded-xl text-pink-600"><Target size={24} /></span>
                                    <span>Shared Goals</span>
                                </h2>
                            </div>

                            {analytics?.activeGoals?.length > 0 ? (
                                <div className="space-y-5">
                                    {analytics.activeGoals.map((goal) => {
                                        const progress = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
                                        const isMyGoal = userProfile && goal.userId === userProfile._id;

                                        return (
                                            <motion.div
                                                key={goal._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                            >
                                                <Card className="p-0 overflow-hidden border-0 shadow-lg shadow-gray-200/50 hover:shadow-xl transition-all duration-300 rounded-[2rem]">
                                                    <div className="p-8 bg-white relative">
                                                        <div className="flex justify-between items-start mb-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                                                                    <Sparkles size={24} />
                                                                </div>
                                                                <div>
                                                                    <h3 className="font-extrabold text-2xl text-gray-900 tracking-tight">{goal.title}</h3>
                                                                    <p className="text-sm text-gray-500 font-medium mt-1">
                                                                        Started by <span className="text-indigo-600 font-bold">{getMemberName(goal.userId)}</span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            {isMyGoal && (
                                                                <button
                                                                    onClick={() => {
                                                                        if (window.confirm("Delete this goal?")) deleteGoalMutation.mutate(goal._id)
                                                                    }}
                                                                    className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition"
                                                                >
                                                                    <Trash2 size={20} />
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-end">
                                                                <div className="space-y-1">
                                                                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Saved</p>
                                                                    <span className="text-3xl font-black text-gray-900">{formatCurrency(goal.savedAmount)}</span>
                                                                </div>
                                                                <div className="text-right space-y-1">
                                                                    <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Target</span>
                                                                    <p className="text-xl font-bold text-gray-600">{formatCurrency(goal.targetAmount)}</p>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                                                                    <motion.div
                                                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg shadow-indigo-200"
                                                                        initial={{ width: 0 }}
                                                                        animate={{ width: `${progress}%` }}
                                                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                                                    />
                                                                </div>
                                                                <div className="flex justify-between text-xs font-bold px-1">
                                                                    <span className="text-indigo-600">{progress.toFixed(0)}% Funded</span>
                                                                    {goal.deadline && (
                                                                        <span className="text-gray-400">{new Date(goal.deadline).toLocaleDateString()} Deadline</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-16 text-center bg-white rounded-[2rem] border-2 border-dashed border-gray-200 hover:border-indigo-200 transition-colors group">
                                    <div className="w-20 h-20 bg-gray-50 group-hover:bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors">
                                        <Target className="w-10 h-10 text-gray-300 group-hover:text-indigo-300 transition-colors" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Shared Goals Yet</h3>
                                    <p className="text-gray-500 font-medium max-w-sm mx-auto">Create a goal in your Goals page and check "Share with Family" to see it here.</p>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Analytics Sidebar */}
                    <div className="space-y-6">
                        {analytics ? (
                            <>
                                <Card className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-indigo-900 text-white relative overflow-hidden border-0 shadow-2xl p-6 rounded-3xl">
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-4 text-indigo-200">
                                            <TrendingUp className="w-5 h-5" />
                                            <span className="text-xs font-bold uppercase tracking-wider">Monthly Spend</span>
                                        </div>
                                        <p className="text-3xl md:text-5xl font-black mb-2 tracking-tight break-all" title={formatCurrency(analytics.totalFamilyMonthExpense)}>
                                            {formatCurrency(analytics.totalFamilyMonthExpense)}
                                        </p>
                                        <p className="text-sm text-indigo-300/80 font-medium">Combined expenses this month</p>
                                    </div>
                                    <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl"></div>
                                </Card>

                                <Card className="rounded-3xl shadow-lg border-gray-100 p-6">
                                    <h3 className="font-bold text-gray-900 mb-6 text-sm uppercase tracking-wide flex items-center gap-2">
                                        <span>🏆</span> Top Spenders
                                    </h3>
                                    <div className="space-y-5">
                                        {analytics.memberStats?.sort((a, b) => b.spent - a.spent).slice(0, 4).map((stat, i) => (
                                            <div key={i} className="group">
                                                <div className="flex justify-between items-center text-sm mb-2">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-700' :
                                                            i === 1 ? 'bg-gray-100 text-gray-600' :
                                                                'bg-orange-50 text-orange-700'
                                                            }`}>
                                                            {i === 0 ? '🥇' : stat.name[0]}
                                                        </div>
                                                        <span className="font-bold text-gray-700 truncate">{stat.name}</span>
                                                    </div>
                                                    <span className="font-bold text-gray-900 shrink-0 ml-2" title={formatCurrency(stat.spent)}>{formatCurrency(stat.spent)}</span>
                                                </div>
                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden ml-11">
                                                    <div className="h-full bg-indigo-500 rounded-full opacity-60 group-hover:opacity-100 transition duration-300" style={{ width: `${analytics.totalFamilyMonthExpense > 0 ? (stat.spent / analytics.totalFamilyMonthExpense * 100) : 0}%` }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>

                                <Card className="bg-emerald-50 border-emerald-100 rounded-3xl p-6">
                                    <div className="flex items-center gap-2 mb-6 text-emerald-800">
                                        <div className="p-1.5 bg-emerald-100 rounded-lg">
                                            <Target className="w-4 h-4" />
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-wider">Total Impact</span>
                                    </div>
                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-xs text-emerald-600 uppercase font-bold mb-1">Total Saved</p>
                                            <p className="text-3xl font-black text-emerald-800 tracking-tight">{formatCurrency(analytics.goalsSummary?.totalSaved)}</p>
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <p className="text-xs text-emerald-600 uppercase font-bold">Goal Completion</p>
                                                <span className="text-xs font-bold text-emerald-700">{analytics.goalsSummary?.completion}%</span>
                                            </div>
                                            <div className="flex-1 bg-emerald-200/50 h-3 rounded-full overflow-hidden">
                                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(analytics.goalsSummary?.completion || 0, 100)}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </>
                        ) : (
                            <div className="animate-pulse space-y-4">
                                <div className="h-32 bg-gray-200 rounded-3xl"></div>
                                <div className="h-48 bg-gray-200 rounded-3xl"></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // No Family State
    return (
        <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 relative overflow-hidden pb-32">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-200/30 rounded-full blur-[100px]"></div>
                <div className="absolute top-[30%] right-[0%] w-[40%] h-[40%] bg-purple-200/30 rounded-full blur-[100px]"></div>
            </div>

            <div className="text-center space-y-6 mb-16 max-w-3xl">
                <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="w-24 h-24 bg-white shadow-xl shadow-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-indigo-50 rotate-3 transform hover:rotate-6 transition-transform duration-500"
                >
                    <Users className="w-12 h-12 text-indigo-600" />
                </motion.div>
                <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tighter">Financial Harmony</h1>
                <p className="text-xl md:text-2xl text-gray-500 font-medium">Collaborate with your family or partner. Track shared expenses, compete on savings, and achieve goals together.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl px-4">
                {/* Create Card */}
                <motion.div whileHover={{ scale: 1.02 }} className="h-full">
                    <Card
                        className={`h-full cursor-pointer transition-all duration-300 border-2 rounded-[2rem] overflow-hidden group ${activeTab === 'create' ? 'border-indigo-600 shadow-2xl ring-4 ring-indigo-50' : 'border-transparent bg-white/80 backdrop-blur-sm hover:border-gray-200 hover:shadow-xl'}`}
                        onClick={() => setActiveTab('create')}
                    >
                        <div className="p-6 md:p-10 flex flex-col h-full">
                            <div className="flex items-center gap-4 mb-4 md:mb-6">
                                <div className="p-3 md:p-4 bg-indigo-50 rounded-2xl group-hover:bg-indigo-600 transition-colors duration-300">
                                    <Users className="w-6 h-6 md:w-8 md:h-8 text-indigo-600 group-hover:text-white transition-colors duration-300" />
                                </div>
                                <h3 className="text-xl md:text-2xl font-bold text-gray-900">Create Family Group</h3>
                            </div>
                            <p className="text-gray-500 mb-6 md:mb-10 leading-relaxed font-medium text-sm md:text-base flex-1">Start a new group. You will become the admin and get a unique invite code to share with your members.</p>

                            <AnimatePresence>
                                {activeTab === 'create' && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4">
                                        <input
                                            type="text"
                                            placeholder="Family Name (e.g. The Smiths)"
                                            className="w-full px-5 py-3 md:px-6 md:py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition font-medium text-base md:text-lg"
                                            value={newFamilyName}
                                            onChange={(e) => setNewFamilyName(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <Button className="w-full py-3 md:py-4 text-base md:text-lg rounded-xl shadow-xl shadow-indigo-200 bg-indigo-600 hover:bg-indigo-700" onClick={(e) => { e.stopPropagation(); handleCreate(); }}>
                                            Create & Start
                                        </Button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </Card>
                </motion.div>

                {/* Join Card */}
                <motion.div whileHover={{ scale: 1.02 }} className="h-full">
                    <Card
                        className={`h-full cursor-pointer transition-all duration-300 border-2 rounded-[2rem] overflow-hidden group ${activeTab === 'join' ? 'border-purple-600 shadow-2xl ring-4 ring-purple-50' : 'border-transparent bg-white/80 backdrop-blur-sm hover:border-gray-200 hover:shadow-xl'}`}
                        onClick={() => setActiveTab('join')}
                    >
                        <div className="p-6 md:p-10 flex flex-col h-full">
                            <div className="flex items-center gap-4 mb-4 md:mb-6">
                                <div className="p-3 md:p-4 bg-purple-50 rounded-2xl group-hover:bg-purple-600 transition-colors duration-300">
                                    <UserPlus className="w-6 h-6 md:w-8 md:h-8 text-purple-600 group-hover:text-white transition-colors duration-300" />
                                </div>
                                <h3 className="text-xl md:text-2xl font-bold text-gray-900">Join Existing Family</h3>
                            </div>
                            <p className="text-gray-500 mb-6 md:mb-10 leading-relaxed font-medium text-sm md:text-base flex-1">Have an invite code? Enter it here to join your family's financial hub instantly.</p>

                            <AnimatePresence>
                                {activeTab === 'join' && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4">
                                        <input
                                            type="text"
                                            placeholder="Enter 6-Digit Code"
                                            className="w-full px-5 py-3 md:px-6 md:py-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none font-mono tracking-[0.5em] text-center text-lg md:text-xl uppercase font-bold"
                                            maxLength={6}
                                            value={inviteCodeInput}
                                            onChange={(e) => setInviteCodeInput(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <Button className="w-full py-3 md:py-4 text-base md:text-lg rounded-xl bg-purple-600 hover:bg-purple-700 shadow-xl shadow-purple-200" onClick={(e) => { e.stopPropagation(); handleJoin(); }}>
                                            Join Family
                                        </Button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
