import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from "../context/AuthContext";
import { getDashboardAnalytics, getTransactions, getForecast, downloadReportPDF, emailReport, getWealthDetails, getTrends } from '../api/api';

// --- Visualizations ---
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import ReactECharts from 'echarts-for-react';
import highchartsAccessibility from 'highcharts/modules/accessibility';

// Initialize accessibility module
if (typeof highchartsAccessibility === 'function') {
    highchartsAccessibility(Highcharts);
} else if (typeof highchartsAccessibility === 'object' && highchartsAccessibility.default) {
    highchartsAccessibility.default(Highcharts);
}

// --- Utils ---
import numbro from 'numbro';
import dayjs from 'dayjs';
import _ from 'lodash';
import { FileDown, Mail, Calendar, Loader2, TrendingUp, TrendingDown, Wallet, Activity, Zap, Target } from 'lucide-react';
import toast from '../components/ui/Toast';
import { motion } from 'framer-motion';
import DataStory from '../components/analytics/DataStory';
import TimeTravelSimulator from '../components/analytics/TimeTravelSimulator';
import EmailReportModal from '../components/analytics/EmailReportModal';

// --- Highcharts Theme ---
Highcharts.setOptions({
    colors: ['#2563eb', '#10b981', '#f43f5e', '#8b5cf6', '#f59e0b', '#06b6d4'],
    chart: {
        backgroundColor: 'transparent',
        style: { fontFamily: 'Inter, sans-serif' }
    },
    title: { style: { color: '#1e293b', fontWeight: 'bold' } },
    legend: { itemStyle: { color: '#475569' } },
    xAxis: {
        gridLineWidth: 0,
        labels: { style: { color: '#64748b' } },
        lineColor: '#cbd5e1',
        tickColor: '#cbd5e1'
    },
    yAxis: {
        gridLineDashStyle: 'Dash',
        gridLineColor: '#e2e8f0',
        labels: { style: { color: '#64748b' } },
        title: { style: { color: '#64748b' } }
    },
    tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e2e8f0',
        borderRadius: 8,
        shadow: true,
        style: { color: '#1e293b' },
        valueDecimals: 2
    },
    credits: { enabled: false }
});

const Analytics = () => {
    const { user, formatCurrency } = useAuth();
    const [dateRange, setDateRange] = useState({
        startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
        endDate: dayjs().endOf('month').format('YYYY-MM-DD')
    });
    const [emailLoading, setEmailLoading] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isStoryOpen, setIsStoryOpen] = useState(false);
    const [targetEmail, setTargetEmail] = useState(user?.email || "");

    useEffect(() => {
        if (user?.email) setTargetEmail(user.email);
    }, [user]);

    // --- Queries ---
    const { data: analyticsData, isLoading } = useQuery({
        queryKey: ['analyticsData', dateRange],
        queryFn: async () => {
            const [dashRes, txRes, forecastRes, wealthRes, trendsRes] = await Promise.all([
                getDashboardAnalytics(),
                getTransactions(),
                getForecast(),
                getWealthDetails(),
                getTrends()
            ]);
            return {
                dashboard: dashRes.data,
                transactions: txRes.data,
                forecast: forecastRes.data,
                wealth: wealthRes.data,
                trends: trendsRes.data
            };
        }
    });

    const processedData = useMemo(() => {
        if (!analyticsData?.transactions) return { dailySeries: [], categoryData: [], totals: {} };

        const { transactions, wealth, trends } = analyticsData;

        // Filter by Date Range
        const filtered = transactions.filter(t => {
            const d = dayjs(t.date);
            return d.isAfter(dayjs(dateRange.startDate).subtract(1, 'day')) &&
                d.isBefore(dayjs(dateRange.endDate).add(1, 'day'));
        });

        // 1. Totals
        const totalIncome = _.sumBy(_.filter(filtered, { type: 'income' }), 'amount');
        const totalExpense = _.sumBy(_.filter(filtered, { type: 'expense' }), 'amount');
        const netSavings = totalIncome - totalExpense;

        // 2. Highcharts Timeline
        const groupedByDay = _.groupBy(filtered, t => dayjs(t.date).format('YYYY-MM-DD'));
        const daySeries = [];
        let currDate = dayjs(dateRange.startDate);
        const lastDate = dayjs(dateRange.endDate);

        while (currDate.isBefore(lastDate) || currDate.isSame(lastDate)) {
            const dateStr = currDate.format('YYYY-MM-DD');
            const dayTxs = groupedByDay[dateStr] || [];
            daySeries.push({
                date: dateStr,
                income: _.sumBy(_.filter(dayTxs, { type: 'income' }), 'amount'),
                expense: _.sumBy(_.filter(dayTxs, { type: 'expense' }), 'amount'),
                savings: _.sumBy(_.filter(dayTxs, { type: 'income' }), 'amount') - _.sumBy(_.filter(dayTxs, { type: 'expense' }), 'amount')
            });
            currDate = currDate.add(1, 'day');
        }

        // 3. Category Data
        const expenseTxs = filtered.filter(t => t.type === 'expense');
        const categoryGroups = _.groupBy(expenseTxs, 'category');
        const categoryData = Object.keys(categoryGroups).map(cat => ({
            name: cat,
            value: _.sumBy(categoryGroups[cat], 'amount')
        })).sort((a, b) => b.value - a.value);

        return {
            dailySeries: daySeries,
            categoryData,
            totals: { totalIncome, totalExpense, netSavings },
            filtered,
            wealth,
            trends
        };
    }, [analyticsData, dateRange]);

    // --- Chart Configs ---

    // 1. Wealth Breakdown (Donut)
    const wealthOption = {
        tooltip: { trigger: 'item' },
        series: [{
            name: 'Assets',
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
            label: { show: false, position: 'center' },
            emphasis: { label: { show: true, fontSize: 20, fontWeight: 'bold' } },
            data: processedData.wealth ? [
                { value: processedData.wealth.assets.cash, name: 'Cash' },
                { value: processedData.wealth.assets.investments, name: 'Investments' },
                { value: processedData.wealth.assets.goals, name: 'Goals' }
            ] : []
        }]
    };

    // 2. Evolution
    const evolutionOptions = {
        chart: { type: 'areaspline', height: 350 },
        title: { text: null },
        xAxis: { categories: processedData.dailySeries.map(d => dayjs(d.date).format('MMM D')) },
        yAxis: { title: { text: null } },
        tooltip: { shared: true },
        plotOptions: { areaspline: { fillOpacity: 0.1 } },
        series: [{
            name: 'Income', data: processedData.dailySeries.map(d => d.income), color: '#10b981'
        }, {
            name: 'Expenses', data: processedData.dailySeries.map(d => d.expense), color: '#f43f5e'
        }, {
            name: 'Net Flow', type: 'spline', data: processedData.dailySeries.map(d => d.savings), color: '#3b82f6', dashStyle: 'ShortDot'
        }]
    };

    // 3. Trends (Savings Rate)
    const trendsOptions = {
        chart: { type: 'column', height: 300 },
        title: { text: null },
        xAxis: { categories: processedData.trends?.map(t => t.month) || [] },
        yAxis: [{ title: { text: 'Amount' } }, { title: { text: 'Savings Rate (%)' }, opposite: true }],
        tooltip: { shared: true },
        series: [{
            name: 'Income', type: 'column', data: processedData.trends?.map(t => t.income) || [], color: '#10b981', yAxis: 0
        }, {
            name: 'Expense', type: 'column', data: processedData.trends?.map(t => t.expense) || [], color: '#f43f5e', yAxis: 0
        }, {
            name: 'Savings Rate', type: 'spline', data: processedData.trends?.map(t => t.savingsRate) || [], color: '#f59e0b', yAxis: 1, tooltip: { valueSuffix: '%' }
        }]
    };

    // 4. Forecast
    const forecastOptions = {
        chart: { type: 'spline', height: 300 },
        title: { text: null },
        xAxis: {
            categories: analyticsData?.forecast?.map(d => d.month) || [],
            plotBands: [{ from: 0, to: 5, color: 'rgba(240, 249, 255, 0.5)', label: { text: 'Projection' } }]
        },
        yAxis: { title: { text: null } },
        series: [{
            name: 'Projected Balance', data: analyticsData?.forecast?.map(d => d.balance) || [], color: '#8b5cf6'
        }]
    };

    const handleDownloadPDF = async () => {
        // Implementation
        try {
            setIsDownloading(true);
            const response = await downloadReportPDF(dateRange.startDate, dateRange.endDate);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'Report.pdf');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Downloaded!");
        } catch (e) { toast.error("Failed"); } finally { setIsDownloading(false); }
    };

    // Helper needed for report download state
    const [isDownloading, setIsDownloading] = useState(false);

    if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

    const netWorth = processedData.wealth?.netWorth || 0;

    return (
        <div className="p-6 bg-slate-50 min-h-screen font-sans">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900">Financial Intelligence</h1>
                    <p className="text-slate-500 mt-2">Your economic situation at a glance</p>
                </div>
                {/* Date Controls */}
                <div className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
                    <Calendar size={20} className="text-indigo-500 ml-2" />
                    <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} className="outline-none text-sm text-slate-600 bg-transparent font-medium" />
                    <span className="text-slate-300">→</span>
                    <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} className="outline-none text-sm text-slate-600 bg-transparent font-medium" />
                </div>
            </div>

            {/* WEALTH SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                <motion.div
                    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5"><Wallet size={200} /></div>
                    <div className="relative z-10">
                        <p className="text-slate-400 font-medium uppercase tracking-wider mb-2">Net Worth</p>
                        <h2 className="text-6xl font-black tracking-tighter mb-8 pl-1">
                            {formatCurrency(netWorth)}
                        </h2>

                        <div className="grid grid-cols-3 gap-8 border-t border-slate-700/50 pt-8">
                            <div>
                                <p className="text-slate-400 text-sm mb-1">Total Assets</p>
                                <p className="text-2xl font-bold text-emerald-400">
                                    {formatCurrency((processedData.wealth?.assets?.cash || 0) + (processedData.wealth?.assets?.investments || 0) + (processedData.wealth?.assets?.goals || 0))}
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm mb-1">Total Liabilities</p>
                                <p className="text-2xl font-bold text-rose-400">
                                    {formatCurrency(processedData.wealth?.liabilities?.total || 0)}
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm mb-1">Cash on Hand</p>
                                <p className="text-2xl font-bold text-blue-400">
                                    {formatCurrency(processedData.wealth?.assets?.cash || 0)}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Asset Allocation</h3>
                    <div className="flex-1">
                        <ReactECharts option={wealthOption} style={{ height: '100%', width: '100%' }} />
                    </div>
                </div>
            </div>

            <div className="mb-10">
                <button onClick={() => setIsStoryOpen(true)} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3">
                    <Zap className="fill-yellow-300 text-yellow-300" /> Open Meaningful Stories
                </button>
            </div>

            {/* TRENDS & FORECAST */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Financial Trends (L12M)</h3>
                    <HighchartsReact highcharts={Highcharts} options={trendsOptions} />
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Future Forecast</h3>
                    <HighchartsReact highcharts={Highcharts} options={forecastOptions} />
                </div>
            </div>

            {/* TIME TRAVEL SIMULATOR */}
            <TimeTravelSimulator
                currentMonthlySavings={processedData.totals.netSavings > 0 ? processedData.totals.netSavings : 0}
                currentValidNetWorth={netWorth > 0 ? netWorth : 0}
            />

            {/* DETAILED EVOLUTION */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-10">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Cash Flow Evolution</h3>
                <HighchartsReact highcharts={Highcharts} options={evolutionOptions} />
            </div>

            {/* DATA STORY & MODALS */}
            <DataStory isOpen={isStoryOpen} onClose={() => setIsStoryOpen(false)} data={processedData} userName={user?.name} />
            <EmailReportModal isOpen={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} />

            <div className="flex justify-end gap-4">
                <button onClick={() => setIsEmailModalOpen(true)} className="px-6 py-3 bg-white text-indigo-600 border border-indigo-200 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-50 transition-colors">
                    <Mail size={20} /> Email Report
                </button>
                <button onClick={handleDownloadPDF} disabled={isDownloading} className="px-6 py-3 bg-slate-200 text-slate-800 rounded-xl font-bold flex items-center gap-2">
                    {isDownloading ? <Loader2 className="animate-spin" size={20} /> : <FileDown size={20} />} Download Report
                </button>
            </div>
        </div>
    );
};

// --- Sub-components ---
const KPICard = ({ title, value, icon, color = "text-slate-600", bg = "bg-slate-100", formatter }) => {
    // Basic number formatting fallbacks
    const formatted = formatter ? formatter(value) : numbro(value).format({ thousandSeparated: true, mantissa: 2 });

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
        >
            <div className={`w-12 h-12 rounded-xl ${bg} ${color} flex items-center justify-center mb-4`}>
                {icon}
            </div>
            <p className="text-slate-500 text-sm font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatted}</h3>
        </motion.div>
    );
};

export default Analytics;
