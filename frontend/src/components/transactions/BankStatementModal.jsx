import { useState } from "react";
import { X, Upload, Check, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "../ui/Button";
import { scanBankStatement, addBulkTransactions } from "../../api/api";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function BankStatementModal({ isOpen, onClose }) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scannedTransactions, setScannedTransactions] = useState([]);
    const [selectedIndices, setSelectedIndices] = useState([]);
    const [isImporting, setIsImporting] = useState(false);
    const queryClient = useQueryClient();

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            setPreview(URL.createObjectURL(selected));
            setScannedTransactions([]); // Reset previous scan
        }
    };

    const handleScan = async () => {
        if (!file) return;
        setIsScanning(true);
        try {
            const res = await scanBankStatement(file);
            // Ensure response is an array
            const data = Array.isArray(res.data) ? res.data : [];
            setScannedTransactions(data);
            // Select all by default
            setSelectedIndices(data.map((_, i) => i));
            toast.success(`Found ${data.length} transactions!`);
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.message || "Failed to scan statement. Try a clearer image.";
            toast.error(msg);
        } finally {
            setIsScanning(false);
        }
    };

    const toggleSelection = (index) => {
        setSelectedIndices(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    const handleEditChange = (index, field, value) => {
        setScannedTransactions(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleImport = async () => {
        const transactionsToImport = scannedTransactions.filter((_, i) => selectedIndices.includes(i));

        if (transactionsToImport.length === 0) {
            toast.error("Please select at least one transaction.");
            return;
        }

        setIsImporting(true);
        try {
            // Clean up data before sending
            const cleanData = transactionsToImport.map(t => {
                // Remove currency symbols or commas if present, just in case
                const cleanAmountString = String(t.amount).replace(/[^0-9.-]+/g, "");
                const amountVal = Number(cleanAmountString);

                return {
                    amount: isFinite(amountVal) ? amountVal : 0,
                    type: t.type?.toLowerCase() || 'expense', // Default to expense if missing
                    category: t.category || 'Uncategorized',
                    description: t.description || 'Imported Transaction',
                    date: t.date ? new Date(t.date) : new Date()
                };
            });

            await addBulkTransactions({ transactions: cleanData });

            toast.success(`Successfully imported ${cleanData.length} transactions!`);
            queryClient.invalidateQueries(["transactions"]);
            queryClient.invalidateQueries(["dashboard-analytics"]);
            onClose();
            // Reset state
            setFile(null);
            setPreview(null);
            setScannedTransactions([]);
        } catch (error) {
            console.error(error);
            toast.error("Import failed.");
        } finally {
            setIsImporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Import Bank Statement</h2>
                        <p className="text-sm text-gray-500">Upload an image of your bank statement to auto-extract transactions.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Upload Section */}
                    {!scannedTransactions.length && (
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-indigo-50/50 transition-colors group cursor-pointer relative">
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                                {preview ? (
                                    <img src={preview} alt="Preview" className="max-h-64 rounded-lg shadow-md object-contain" />
                                ) : (
                                    <>
                                        <div className="p-4 bg-indigo-100/50 text-indigo-600 rounded-full mb-4 group-hover:scale-110 transition-transform">
                                            <Upload size={32} />
                                        </div>
                                        <h3 className="font-semibold text-gray-900">Click to upload statement image</h3>
                                        <p className="text-sm text-gray-500 mt-1">Supports JPG, PNG</p>
                                    </>
                                )}
                            </div>

                            {file && (
                                <div className="flex justify-center">
                                    <Button onClick={handleScan} disabled={isScanning} className="w-full md:w-auto">
                                        {isScanning ? (
                                            <> <Loader2 className="animate-spin mr-2" /> Analyzing... </>
                                        ) : (
                                            <> <Check className="mr-2" /> Scan & Extract </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Results Section */}
                    {scannedTransactions.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-lg text-gray-900">Extracted Transactions ({scannedTransactions.length})</h3>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setScannedTransactions([])}>Re-scan</Button>
                                    <Button size="sm" onClick={handleImport} disabled={isImporting}>
                                        {isImporting ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2" />}
                                        Import Selected ({selectedIndices.length})
                                    </Button>
                                </div>
                            </div>

                            <div className="border rounded-xl overflow-hidden shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-100 text-gray-600 font-semibold uppercase tracking-wider text-xs">
                                        <tr>
                                            <th className="p-3 w-10 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIndices.length === scannedTransactions.length}
                                                    onChange={(e) => setSelectedIndices(e.target.checked ? scannedTransactions.map((_, i) => i) : [])}
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                            </th>
                                            <th className="p-3">Date</th>
                                            <th className="p-3">Description</th>
                                            <th className="p-3">Amount</th>
                                            <th className="p-3">Type</th>
                                            <th className="p-3">Category</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {scannedTransactions.map((t, index) => (
                                            <tr key={index} className={`hover:bg-gray-50 transition ${selectedIndices.includes(index) ? 'bg-indigo-50/30' : ''}`}>
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIndices.includes(index)}
                                                        onChange={() => toggleSelection(index)}
                                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="text"
                                                        value={t.date || ""}
                                                        onChange={(e) => handleEditChange(index, "date", e.target.value)}
                                                        className="w-full bg-transparent border-b border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:outline-none text-gray-600 font-medium text-sm transition-colors py-1"
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="text"
                                                        value={t.description || ""}
                                                        onChange={(e) => handleEditChange(index, "description", e.target.value)}
                                                        className="w-full bg-transparent border-b border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:outline-none text-gray-800 text-sm transition-colors py-1"
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="number"
                                                        value={t.amount || ""}
                                                        onChange={(e) => handleEditChange(index, "amount", e.target.value)}
                                                        className="w-24 bg-transparent border-b border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:outline-none font-bold text-gray-900 text-sm transition-colors py-1"
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <select
                                                        value={t.type || "expense"}
                                                        onChange={(e) => handleEditChange(index, "type", e.target.value)}
                                                        className={`bg-transparent border-b border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:outline-none text-xs font-bold uppercase py-1 ${t.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}
                                                    >
                                                        <option value="expense">Expense</option>
                                                        <option value="income">Income</option>
                                                    </select>
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="text"
                                                        value={t.category || ""}
                                                        onChange={(e) => handleEditChange(index, "category", e.target.value)}
                                                        className="w-full bg-transparent border-b border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:outline-none text-gray-600 text-sm transition-colors py-1"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                <AlertCircle size={12} />
                                Review the extracted data carefully before importing. You can uncheck incorrect rows.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
