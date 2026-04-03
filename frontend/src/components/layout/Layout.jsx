import { useState } from "react";
import { Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import AIChatBox from "../ai/AIChatBox";
import Notifications from "./Notifications";
import InstallPrompt from "../ui/InstallPrompt";

export default function Layout({ children }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <main className={`flex-1 flex flex-col min-h-screen transition-all duration-300 md:ml-64 ml-0 relative`}>
                {/* Top Navigation Bar */}
                <div className="h-16 px-4 md:px-8 flex items-center justify-between md:justify-end gap-6 bg-white/70 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-30 transition-all duration-300">

                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                    >
                        <Menu size={24} />
                    </button>

                    <div className="flex items-center gap-4">
                        <Notifications />
                    </div>
                </div>

                {/* Page Content */}
                <div className="p-4 md:p-8 pb-6 flex-1">
                    <div className="max-w-7xl mx-auto">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        >
                            {children}
                        </motion.div>
                    </div>
                </div>


                <AIChatBox />
                <InstallPrompt />
            </main>
        </div>
    );
}