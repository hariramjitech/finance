import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProfile, updateProfile, uploadProfilePicture } from "../api/api";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { User, Mail, DollarSign, Award, Briefcase, Calendar, Save, Loader2, Camera } from "lucide-react";
import toast from "react-hot-toast";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../context/AuthContext";
import EmailReportModal from "../components/analytics/EmailReportModal";

export default function Profile() {
    const { updateUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [formData, setFormData] = useState({});
    const queryClient = useQueryClient();

    const { data: user, isLoading } = useQuery({
        queryKey: ["profile"],
        queryFn: () => getProfile().then((res) => res.data),
        onSuccess: (data) => {
            setFormData({
                name: data.name,
                email: data.email,
                currency: data.currency,
                occupation: data.profileInfo?.occupation || "",
                age: data.profileInfo?.age || ""
            });
        }
    });

    const updateMutation = useMutation({
        mutationFn: updateProfile,
        onSuccess: (response) => {
            queryClient.invalidateQueries(["profile"]);
            updateUser(response.data);
            toast.success("Profile updated successfully!");
            setIsEditing(false);
        },
        onError: () => toast.error("Failed to update profile"),
    });

    const uploadImageMutation = useMutation({
        mutationFn: uploadProfilePicture,
        onSuccess: () => {
            queryClient.invalidateQueries(["profile"]);
            toast.success("Profile picture updated!");
        },
        onError: () => toast.error("Failed to upload image"),
    });

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            uploadImageMutation.mutate(file);
        }
    };

    const handleSave = () => {
        updateMutation.mutate({
            name: formData.name,
            currency: formData.currency,
            profileInfo: {
                occupation: formData.occupation,
                age: formData.age
            }
        });
    };

    if (isLoading) return (
        <div className="flex justify-center items-center h-[50vh]">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <Helmet>
                <title>{user?.name || 'Profile'} | FinanceHub</title>
                <meta name="description" content="Manage your personal profile, currency settings, and view your gamification progress." />
            </Helmet>

            {/* Header Section with Profile Picture and Actions */}
            <div className="relative mb-24 md:mb-20">
                {/* Cover Background */}
                <div className="h-48 md:h-64 bg-gradient-to-r from-indigo-600 to-purple-700 rounded-3xl shadow-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                </div>

                {/* Profile Card Overlay */}
                <Card className="absolute top-32 left-4 right-4 md:left-8 md:right-8 p-6 md:p-8 flex flex-col md:flex-row items-center md:items-end gap-6 shadow-xl border-0">
                    <div className="relative shrink-0">
                        <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-full p-1.5 shadow-2xl relative -mt-16 md:-mt-20">
                            {user.profilePicture ? (
                                <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover rounded-full border-4 border-white" />
                            ) : (
                                <div className="w-full h-full bg-indigo-100 rounded-full flex items-center justify-center text-5xl font-bold text-indigo-600 border-4 border-white">
                                    {user.name?.[0]}
                                </div>
                            )}
                            {uploadImageMutation.isPending && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                                    <Loader2 className="animate-spin text-white" />
                                </div>
                            )}
                        </div>
                        <label className="absolute bottom-2 right-2 p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition cursor-pointer hover:scale-105 active:scale-95">
                            <Camera size={18} />
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-2">
                        <h1 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">{user.name}</h1>
                        <p className="text-gray-500 font-medium flex items-center justify-center md:justify-start gap-2">
                            <Mail size={16} /> {user.email}
                        </p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2">
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">
                                {user.role || 'Member'}
                            </span>
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider">
                                {user.currency || 'INR'}
                            </span>
                        </div>
                    </div>

                    <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
                        {isEditing ? (
                            <>
                                <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                                <Button onClick={handleSave} isLoading={updateMutation.isPending} className="shadow-lg shadow-indigo-200">
                                    <Save size={18} className="mr-2" />
                                    Save
                                </Button>
                            </>
                        ) : (
                            <>
                                <>
                                    <Button onClick={() => setIsEmailModalOpen(true)} variant="ghost" className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold shadow-sm">
                                        <Mail size={18} className="mr-2" /> Report
                                    </Button>
                                    <Button onClick={() => {
                                        setFormData({
                                            name: user.name,
                                            email: user.email,
                                            currency: user.currency,
                                            occupation: user.profileInfo?.occupation || "",
                                            age: user.profileInfo?.age || ""
                                        });
                                        setIsEditing(true);
                                    }} variant="outline" className="border-2 font-semibold">Edit Profile</Button>
                                </>
                            </>
                        )}
                    </div>
                </Card>
            </div>

            {/* Spacer to push content down below the absolute card */}
            <div className="h-48 md:h-24 hidden md:block"></div>
            {/* Mobile spacer */}
            <div className="h-64 md:hidden"></div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-4 md:px-0">
                {/* Stats Column */}
                <div className="space-y-6">
                    <Card className="bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 text-white border-none shadow-xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                                    <Award className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="font-bold text-lg">Gamification</h3>
                            </div>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-5xl font-black">{user.level || 1}</span>
                                <span className="text-lg font-medium opacity-80">Level</span>
                            </div>
                            <div className="flex justify-between text-sm opacity-90 mb-2 font-medium">
                                <span>{user.xp || 0} XP</span>
                                <span>Next Level: {(user.level || 1) * 1000} XP</span>
                            </div>
                            <div className="w-full bg-black/20 rounded-full h-3 backdrop-blur-sm overflow-hidden">
                                <div
                                    className="bg-white h-full rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${Math.min(((user.xp || 0) / ((user.level || 1) * 1000)) * 100, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </Card>

                    <Card className="border-gray-100 shadow-md">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <span>🏅</span> Achievements
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {user.badges?.length > 0 ? (
                                user.badges.map((badge, i) => (
                                    <span key={i} className="px-3 py-1.5 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-xl border border-yellow-100 flex items-center gap-1">
                                        ✨ {badge}
                                    </span>
                                ))
                            ) : (
                                <div className="text-center w-full py-6 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <Award className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">No badges yet. Keep saving!</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Details Column */}
                <div className="lg:col-span-2">
                    <Card className="border-gray-100 shadow-md h-full">
                        <div className="flex items-center gap-3 mb-8 border-b border-gray-100 pb-4">
                            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                                <User size={20} />
                            </div>
                            <h3 className="font-bold text-gray-900 text-xl">Personal Information</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    Full Name
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition font-medium text-gray-900"
                                        value={formData.name || ""}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                ) : (
                                    <p className="text-lg font-semibold text-gray-900 bg-gray-50/50 p-3 rounded-xl border border-transparent">{user.name}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    Email Address
                                </label>
                                <p className="text-lg font-semibold text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100 cursor-not-allowed">{user.email}</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    Occupation
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition font-medium text-gray-900"
                                        value={formData.occupation || ""}
                                        placeholder="e.g. Software Engineer"
                                        onChange={e => setFormData({ ...formData, occupation: e.target.value })}
                                    />
                                ) : (
                                    <p className="text-lg font-semibold text-gray-900 bg-gray-50/50 p-3 rounded-xl border border-transparent">{user.profileInfo?.occupation || "Not set"}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <DollarSign size={14} /> Currency
                                </label>
                                {isEditing ? (
                                    <div className="relative">
                                        <select
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none font-medium text-gray-900"
                                            value={formData.currency || "INR"}
                                            onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                        >
                                            <option value="INR">INR (₹)</option>

                                            <option value="EUR">EUR (€)</option>
                                            <option value="GBP">GBP (£)</option>
                                            <option value="JPY">JPY (¥)</option>
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-lg font-semibold text-gray-900 bg-gray-50/50 p-3 rounded-xl border border-transparent">{user.currency || "INR"}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    Age
                                </label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition font-medium text-gray-900"
                                        value={formData.age || ""}
                                        placeholder="e.g. 25"
                                        onChange={e => setFormData({ ...formData, age: e.target.value })}
                                    />
                                ) : (
                                    <p className="text-lg font-semibold text-gray-900 bg-gray-50/50 p-3 rounded-xl border border-transparent">{user.profileInfo?.age || "Not set"}</p>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
            <EmailReportModal isOpen={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} />
        </div>
    );
}
