import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", isDanger = false }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
                    />

                    {/* Modal Panel */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl border border-gray-100 z-10"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-full ${isDanger ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                <AlertTriangle size={24} />
                            </div>
                            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <h3 className="text-xl font-bold leading-6 text-gray-900">
                            {title}
                        </h3>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500">
                                {message}
                            </p>
                        </div>

                        <div className="mt-6 flex gap-3 justify-end">
                            <button
                                type="button"
                                className="inline-flex justify-center rounded-xl border border-transparent bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                                onClick={onClose}
                            >
                                {cancelText}
                            </button>
                            <button
                                type="button"
                                className={`inline-flex justify-center rounded-xl border border-transparent px-4 py-2.5 text-sm font-medium text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all transform active:scale-95 ${isDanger
                                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 shadow-red-200'
                                    : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 shadow-indigo-200'
                                    }`}
                                onClick={() => {
                                    onConfirm();
                                    onClose();
                                }}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmModal;
