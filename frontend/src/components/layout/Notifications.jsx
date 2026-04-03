import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Trash2 } from "lucide-react";
import { getNotifications, markNotificationRead, deleteNotification, clearNotifications } from "../../api/api";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function Notifications() {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const [filter, setFilter] = useState("all"); // all, unread, alert

    const { data: notifications = [] } = useQuery({
        queryKey: ["notifications"],
        queryFn: async () => {
            const res = await getNotifications();
            return res.data;
        },
        refetchInterval: 15000,
    });

    const unreadCount = notifications.filter(n => !n.read).length;

    const filteredNotifications = notifications.filter(n => {
        if (filter === "unread") return !n.read;
        if (filter === "alert") return n.type === "alert";
        return true;
    });

    const readMutation = useMutation({
        mutationFn: markNotificationRead,
        onSuccess: () => queryClient.invalidateQueries(["notifications"])
    });

    const deleteMutation = useMutation({
        mutationFn: deleteNotification,
        onSuccess: () => queryClient.invalidateQueries(["notifications"])
    });

    const clearAllMutation = useMutation({
        mutationFn: clearNotifications,
        onSuccess: () => queryClient.invalidateQueries(["notifications"])
    });

    const handleMarkRead = (id) => readMutation.mutate(id);
    const handleDelete = (e, id) => {
        e.stopPropagation();
        deleteMutation.mutate(id);
    };

    // Mark all visible as read
    const handleMarkAllRead = () => {
        notifications.filter(n => !n.read).forEach(n => readMutation.mutate(n._id));
    };

    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getIcon = (type) => {
        switch (type) {
            case "alert": return <div className="p-2 bg-red-100 text-red-600 rounded-full"><Bell size={16} /></div>;
            case "success": return <div className="p-2 bg-green-100 text-green-600 rounded-full"><Check size={16} /></div>;
            default: return <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><Bell size={16} /></div>;
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2.5 rounded-xl hover:bg-gray-100 transition text-gray-500 hover:text-indigo-600"
            >
                <Bell size={22} className={unreadCount > 0 ? "animate-pulse-slow text-indigo-600" : ""} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50 origin-top-right ring-1 ring-black/5"
                    >
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-gray-50 bg-white">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg text-gray-900">Notifications</h3>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded-lg transition"
                                    >
                                        Mark all read
                                    </button>
                                )}
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
                                {['all', 'unread', 'alert'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setFilter(tab)}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${filter === tab
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* List */}
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar bg-gray-50/50">
                            {filteredNotifications.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                        <Bell size={24} />
                                    </div>
                                    <p className="text-gray-900 font-medium">All caught up!</p>
                                    <p className="text-xs text-gray-400 mt-1">No new notifications to show</p>
                                </div>
                            ) : (
                                <div>
                                    {filteredNotifications.map((notif) => (
                                        <div
                                            key={notif._id}
                                            onClick={() => !notif.read && handleMarkRead(notif._id)}
                                            className={`p-4 border-b border-gray-100 hover:bg-white transition cursor-pointer group relative ${!notif.read ? 'bg-white' : 'bg-transparent'}`}
                                        >
                                            <div className="flex gap-4">
                                                <div className="mt-1">
                                                    {getIcon(notif.type)}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <p className={`text-sm leading-snug ${!notif.read ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                                                            {notif.message}
                                                        </p>
                                                        {!notif.read && <div className="w-2 h-2 bg-indigo-500 rounded-full shrink-0 ml-2 mt-1.5"></div>}
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-medium">
                                                        {format(new Date(notif.date || notif.createdAt || Date.now()), "MMM d, h:mm a")}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Hover Action */}
                                            <button
                                                onClick={(e) => handleDelete(e, notif._id)}
                                                className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="p-2 border-t border-gray-100 bg-white">
                                <button
                                    onClick={() => clearAllMutation.mutate()}
                                    className="w-full py-2 text-xs font-bold text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={14} /> Clear all history
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
