import { useQuery } from "@tanstack/react-query";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, isSameDay } from "date-fns";
import { getTransactions } from "../../api/api";
import { Loader2, TrendingUp } from "lucide-react";

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-xl">
                <p className="text-slate-400 text-xs font-medium mb-2 border-b border-white/10 pb-2">{label}</p>
                {payload.map((p, index) => (
                    <div key={index} className="flex items-center gap-2 mb-1 min-w-[120px]">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></div>
                        <span className="text-slate-300 text-xs flex-1">{p.name}</span>
                        <span className="text-white text-sm font-bold">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(p.value)}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export default function SpendingTrendChart() {
    // ... existing query ...
    const { data: transactions = [], isLoading } = useQuery({
        queryKey: ["transactions-trend"],
        queryFn: () => getTransactions({
            startDate: subDays(new Date(), 30).toISOString(),
            endDate: new Date().toISOString()
        }).then(res => res.data),
    });

    // ... existing data processing ...
    const data = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
        const date = subDays(today, i);
        const dayTransactions = transactions.filter(t => isSameDay(new Date(t.date), date));
        const income = dayTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
        const expense = dayTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);

        data.push({
            date: format(date, 'MMM dd'),
            fullDate: format(date, 'MMM dd, yyyy'),
            income,
            expense
        });
    }

    const totalIncome = data.reduce((acc, item) => acc + item.income, 0);
    const totalExpense = data.reduce((acc, item) => acc + item.expense, 0);
    const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

    if (isLoading) {
        return (
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-[400px] flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-[400px] flex flex-col">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp size={18} className="text-indigo-600" />
                        Financial Analysis
                    </h3>
                    <p className="text-xs text-gray-500 font-medium mt-1">Income vs Expenses (Last 30 Days)</p>
                </div>
                {/* Savings Rate Badge */}
                <div className="text-right hidden sm:block">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${savingsRate >= 20 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        Savings Rate: {savingsRate}%
                    </span>
                </div>
            </div>

            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9CA3AF', fontSize: 11 }}
                            dy={10}
                            minTickGap={30}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9CA3AF', fontSize: 11 }}
                            tickFormatter={(value) => `${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                            width={35}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Area
                            type="monotone"
                            dataKey="income"
                            name="Income"
                            stroke="#10B981"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorIncome)"
                            animationDuration={1500}
                        />
                        <Area
                            type="monotone"
                            dataKey="expense"
                            name="Expense"
                            stroke="#EF4444"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorExpense)"
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
