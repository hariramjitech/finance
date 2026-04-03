// src/components/ai/AIChatBox.jsx
import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, RefreshCcw, Lock, Unlock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { aiChat } from "../../api/api";
import { Button } from "../ui/Button";

export default function AIChatBox() {
    const [isOpen, setIsOpen] = useState(false);
    const [hasPermission, setHasPermission] = useState(() => {
        return localStorage.getItem("ai_permission") === "true";
    });
    const [messages, setMessages] = useState([
        { role: "bot", text: "Hello! I'm FinBot, your upgraded financial assistant. I can now analyze your Budgets, Goals, and Loans to give you smarter advice." }
    ]);
    const [input, setInput] = useState("");
    const messagesEndRef = useRef(null);

    useEffect(() => {
        localStorage.setItem("ai_permission", hasPermission);
    }, [hasPermission]);

    const mutation = useMutation({
        mutationFn: aiChat,
        onSuccess: (data) => {
            setMessages((prev) => [...prev, { role: "bot", text: data.data.reply }]);
        },
        onError: () => {
            setMessages((prev) => [...prev, { role: "bot", text: "Sorry, I couldn't process that. Try again later." }]);
        }
    });

    const handleSend = () => {
        if (!input.trim()) return;
        const userMsg = input;
        setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
        setInput("");
        mutation.mutate({ message: userMsg });
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="bg-white w-80 sm:w-96 h-[500px] rounded-2xl shadow-2xl flex flex-col border border-gray-200 mb-4 animate-in slide-in-from-bottom-5 fade-in duration-300">
                    {/* Header */}
                    <div className="p-4 bg-indigo-600 text-white rounded-t-2xl flex justify-between items-center shadow-md">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                <Bot size={18} />
                            </div>
                            <h3 className="font-bold">FinBot AI</h3>
                        </div>
                        <div className="flex items-center gap-1">
                            {hasPermission && (
                                <button
                                    onClick={() => setMessages([{ role: "bot", text: "Hello! I'm FinBot, your upgraded financial assistant. I can now analyze your Budgets, Goals, and Loans to give you smarter advice." }])}
                                    className="hover:bg-white/20 p-1.5 rounded-full transition"
                                    title="New Chat"
                                >
                                    <RefreshCcw size={16} />
                                </button>
                            )}
                            <button
                                onClick={() => setHasPermission(!hasPermission)}
                                className="hover:bg-white/20 p-1.5 rounded-full transition"
                                title={hasPermission ? "Revoke Access" : "Grant Access"}
                            >
                                {hasPermission ? <Unlock size={16} /> : <Lock size={16} />}
                            </button>
                            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded-full transition ml-1">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Permission Gate */}
                    {!hasPermission ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gray-50 space-y-4">
                            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-2">
                                <Bot size={32} />
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg">Allow AI Access?</h3>
                            <p className="text-sm text-gray-500">
                                To give you the best advice, FinBot needs to analyze your current balance, expenses, and portfolio.
                            </p>
                            <div className="flex gap-3 w-full mt-2">
                                <Button
                                    className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300"
                                    onClick={() => setHasPermission(false)} // Or handle 'Deny' logic (e.g. close or generic mode)
                                >
                                    Deny
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={() => setHasPermission(true)}
                                >
                                    Allow Access
                                </Button>
                            </div>
                            {!hasPermission && (
                                <p className="text-xs text-red-400 mt-2">
                                    * Chat features are limited without access.
                                </p>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                        <div
                                            className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === "user"
                                                ? "bg-indigo-600 text-white rounded-br-none"
                                                : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                                                }`}
                                        >
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {mutation.isPending && (
                                    <div className="flex justify-start">
                                        <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-gray-200 shadow-sm">
                                            <div className="flex gap-1">
                                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-3 bg-white border-t border-gray-100 rounded-b-2xl">
                                <form
                                    className="flex gap-2"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleSend();
                                    }}
                                >
                                    <input
                                        type="text"
                                        placeholder="Ask about your finances..."
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-gray-50 focus:bg-white transition"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                    />
                                    <Button
                                        type="submit"
                                        size="icon"
                                        className="rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:scale-105 transition"
                                        disabled={mutation.isPending || !input.trim()}
                                    >
                                        <Send size={18} className={mutation.isPending ? "opacity-50" : ""} />
                                    </Button>
                                </form>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 group flex items-center justify-center"
                >
                    <MessageCircle size={28} className="group-hover:rotate-12 transition duration-300" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></span>
                </button>
            )}
        </div>
    );
}
