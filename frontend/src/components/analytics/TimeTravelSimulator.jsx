import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Play, RotateCcw, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const TimeTravelSimulator = ({ currentMonthlySavings, currentValidNetWorth }) => {
    const { formatCurrency } = useAuth();

    // Simulation State
    const [years, setYears] = useState(5);
    const [monthlyContribution, setMonthlyContribution] = useState(currentMonthlySavings > 0 ? currentMonthlySavings : 500);
    const [returnRate, setReturnRate] = useState(8); // Default 8% market return
    const [inflationRate, setInflationRate] = useState(3);

    // Calculate Projection
    const projectionData = useMemo(() => {
        const data = [];
        let balance = currentValidNetWorth; // Starting point
        let invested = currentValidNetWorth;

        const monthlyRate = returnRate / 100 / 12;

        for (let m = 0; m <= years * 12; m++) {
            // Apply growth first
            balance = balance * (1 + monthlyRate);

            // Add contribution
            balance += monthlyContribution;

            // Track "Principal Invested" for comparison
            invested += monthlyContribution;

            // Sample every 6 months for chart clarity
            if (m % 6 === 0) {
                const date = new Date();
                date.setMonth(date.getMonth() + m);

                data.push({
                    month: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
                    balance: Math.round(balance),
                    invested: Math.round(invested)
                });
            }
        }
        return data;
    }, [years, monthlyContribution, returnRate, currentValidNetWorth]);

    // Chart Config
    // Chart Config
    const options = {
        chart: { type: 'areaspline', backgroundColor: 'transparent', height: 350, fontFamily: 'Inter, sans-serif' },
        title: { text: null },
        xAxis: {
            categories: projectionData.map(d => d.month),
            lineColor: 'transparent',
            tickColor: 'transparent',
            labels: { style: { color: '#94a3b8', fontSize: '11px' } }
        },
        yAxis: {
            title: { text: null },
            gridLineDashStyle: 'Dash',
            gridLineColor: 'rgba(226, 232, 240, 0.4)',
            labels: { style: { color: '#94a3b8' } }
        },
        tooltip: {
            shared: true,
            useHTML: true,
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 12,
            shadow: true,
            padding: 0,
            formatter: function () {
                let s = `<div class="p-3 font-sans"><div class="text-slate-400 text-xs mb-2 font-medium border-b border-white/10 pb-1">${this.x}</div>`;
                this.points.forEach(point => {
                    const color = point.series.color;
                    const name = point.series.name;
                    const val = formatCurrency(point.y);
                    s += `<div class="flex items-center gap-2 mb-1">
                            <div class="w-2 h-2 rounded-full" style="background-color: ${color}"></div>
                            <span class="text-slate-300 text-xs">${name}:</span>
                            <span class="text-white text-sm font-bold ml-auto">${val}</span>
                          </div>`;
                });
                s += '</div>';
                return s;
            }
        },
        plotOptions: {
            areaspline: {
                marker: { enabled: false, symbol: 'circle', radius: 4 },
                lineWidth: 3,
                states: { hover: { lineWidth: 4 } }
            }
        },
        series: [
            {
                name: 'Projected Wealth',
                data: projectionData.map(d => d.balance),
                color: {
                    linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
                    stops: [
                        [0, 'rgba(139, 92, 246, 0.5)'], // Violet-500 equivalent
                        [1, 'rgba(139, 92, 246, 0.0)']
                    ]
                },
                lineColor: '#8b5cf6',
                fillOpacity: 1
            },
            {
                name: 'Principal Invested',
                data: projectionData.map(d => d.invested),
                color: '#cbd5e1', // Lighter slate
                fillColor: 'transparent',
                lineColor: '#94a3b8',
                dashStyle: 'ShortDot',
                lineWidth: 2,
                marker: { enabled: false }
            }
        ],
        credits: { enabled: false }
    };

    const projectedAmount = projectionData.length > 0 ? projectionData[projectionData.length - 1].balance : 0;
    const gain = projectedAmount - (projectionData.length > 0 ? projectionData[projectionData.length - 1].invested : 0);

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mt-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-violet-100 text-violet-600 rounded-xl">
                    <RotateCcw size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800">Time Travel Simulator</h3>
                    <p className="text-slate-500 text-sm">Visualize the future impact of your financial decisions today.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Controls */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2 flex justify-between">
                            <span>Time Horizon</span>
                            <span className="text-violet-600">{years} Years</span>
                        </label>
                        <input
                            type="range" min="1" max="30" step="1"
                            value={years} onChange={(e) => setYears(Number(e.target.value))}
                            className="w-full accent-violet-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2 flex justify-between">
                            <span>Monthly Investment</span>
                            <span className="text-violet-600">${monthlyContribution}</span>
                        </label>
                        <input
                            type="range" min="0" max="10000" step="100"
                            value={monthlyContribution} onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                            className="w-full accent-violet-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2 flex justify-between">
                            <span>Expected Return Rate</span>
                            <span className="text-emerald-600">{returnRate}%</span>
                        </label>
                        <input
                            type="range" min="1" max="20" step="0.5"
                            value={returnRate} onChange={(e) => setReturnRate(Number(e.target.value))}
                            className="w-full accent-emerald-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                            <span>Conservative (4%)</span>
                            <span>Market Avg (8%)</span>
                            <span>Aggressive (12%)</span>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-sm text-slate-500 mb-1">Projected Wealth in {years} Years</p>
                        <p className="text-3xl font-black text-slate-900">{formatCurrency(projectedAmount)}</p>
                        <p className="text-sm font-medium text-emerald-600 mt-1 flex items-center gap-1">
                            <TrendingUp size={14} /> +{formatCurrency(gain)} growth
                        </p>
                    </div>
                </div>

                {/* Chart */}
                <div className="lg:col-span-2">
                    <HighchartsReact highcharts={Highcharts} options={options} />
                    <p className="text-center text-xs text-slate-400 mt-4">
                        *Projection assumes monthly compounding at {returnRate}% annual return. Past performance does not guarantee future results.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TimeTravelSimulator;
