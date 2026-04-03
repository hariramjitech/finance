import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Loader2 } from 'lucide-react';
import { emailReport } from '../../api/api';
import toast from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import dayjs from 'dayjs';

const EmailReportModal = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [email, setEmail] = useState(user?.email || "");
    const [loading, setLoading] = useState(false);

    const handleSend = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Default to current month for the report if generic
            const startDate = dayjs().startOf('month').format('YYYY-MM-DD');
            const endDate = dayjs().endOf('month').format('YYYY-MM-DD');

            await emailReport({ email, startDate, endDate });
            toast.success(`Report sent to ${email}`);
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Failed to send email");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 m-auto w-full max-w-md h-fit bg-white rounded-3xl p-6 shadow-2xl z-50 border border-slate-100"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                                    <Mail size={20} />
                                </div>
                                Email PDF Report
                            </h3>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSend} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Recipient Email</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                />
                            </div>

                            <p className="text-xs text-slate-500">
                                This will send a comprehensive financial report for the current month including income, expenses, and net worth analysis.
                            </p>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <Mail size={20} />}
                                {loading ? "Sending..." : "Send Report"}
                            </button>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default EmailReportModal;
