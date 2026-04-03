const express = require('express');
const router = express.Router();
const { protect } = require('../middleware');
const { Transaction, Investment, Goal, RecurringTransaction, Budget } = require('../models');
const { convertCurrency, predictFinancials, processDueRecurringTransactions } = require('../utils');

// @desc    Get financial dashboard data
// @route   GET /api/analytics/dashboard
router.get('/dashboard', protect, async (req, res) => {
    // Ensure recurring transactions are up to date
    await processDueRecurringTransactions(req.user._id);

    const transactions = await Transaction.find({ userId: req.user._id });
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    const savings = totalIncome - totalExpense;

    // Monthly Calculation
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyIncome = transactions
        .filter(t => t.type === 'income' && t.date.getMonth() === currentMonth && t.date.getFullYear() === currentYear)
        .reduce((acc, curr) => acc + curr.amount, 0);
    const monthlyExpense = transactions
        .filter(t => t.type === 'expense' && t.date.getMonth() === currentMonth && t.date.getFullYear() === currentYear)
        .reduce((acc, curr) => acc + curr.amount, 0);

    const investments = await Investment.find({ userId: req.user._id });
    const totalInvestment = investments.reduce((acc, curr) => acc + curr.amount, 0);

    const goals = await Goal.find({ userId: req.user._id });
    const totalGoalSaved = goals.reduce((acc, curr) => acc + curr.savedAmount, 0);

    const recurring = await RecurringTransaction.find({ userId: req.user._id });
    const monthlyRecurring = recurring
        .filter(r => r.type === 'expense')
        .reduce((acc, curr) => {
            if (curr.frequency === 'daily') return acc + (curr.amount * 30);
            if (curr.frequency === 'weekly') return acc + (curr.amount * 4);
            if (curr.frequency === 'yearly') return acc + (curr.amount / 12);
            return acc + curr.amount; // monthly
        }, 0);

    const predictions = predictFinancials(transactions);

    let score = 50;
    if (savings > 0) score += 20;
    if (savings > totalIncome * 0.2) score += 20;
    if (totalExpense > totalIncome) score -= 20;
    if (totalInvestment > 0) score += 10;
    if (totalGoalSaved > 0) score += 10;

    const budgets = await Budget.find({ userId: req.user._id, month: new Date().getMonth() + 1 });
    if (budgets.length > 0) {
        let adhered = 0;
        for (const budget of budgets) {
            const catExpense = transactions.filter(t => t.category === budget.category && t.type === 'expense').reduce((a, b) => a + b.amount, 0);
            if (catExpense <= budget.limit) adhered++;
        }
        if ((adhered / budgets.length) === 1) score += 10;
    }

    score = Math.min(100, Math.max(0, score));

    // Currency Conversion (Base INR -> User Currency)
    const userCurrency = req.user.currency || 'INR';

    res.json({
        summary: {
            totalIncome: convertCurrency(totalIncome, 'INR', userCurrency),
            totalExpense: convertCurrency(totalExpense, 'INR', userCurrency),
            monthlyIncome: convertCurrency(monthlyIncome, 'INR', userCurrency),
            monthlyExpense: convertCurrency(monthlyExpense, 'INR', userCurrency),
            savings: convertCurrency(savings, 'INR', userCurrency),
            balance: convertCurrency(savings, 'INR', userCurrency),
            financialScore: score,
            totalInvestment: convertCurrency(totalInvestment, 'INR', userCurrency),
            totalGoalSaved: convertCurrency(totalGoalSaved, 'INR', userCurrency),
            monthlyRecurring: convertCurrency(monthlyRecurring, 'INR', userCurrency)
        },
        predictions
    });
});

// @desc    Get spending breakdown by category
// @route   GET /api/analytics/breakdown
router.get('/breakdown', protect, async (req, res) => {
    const breakdown = await Transaction.aggregate([
        { $match: { userId: req.user._id, type: 'expense' } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } }
    ]);

    const userCurrency = req.user.currency || 'INR';
    const convertedBreakdown = breakdown.map(item => ({
        ...item,
        total: convertCurrency(item.total, 'INR', userCurrency)
    }));

    res.json(convertedBreakdown);
});

// @desc    Export transactions as CSV
// @route   GET /api/reports/export  (Note: Frontend calls /api/reports/export)
// We will mount this under /api/reports probably? Or analytics?
// Existing: /api/reports/export. If we mount analytics at /api/analytics, this doesn't match.
// I should make a reportsRoutes.js or just put it here and mount appropriately.
// Let's put it here but I need to handle mounting carefully or rename.
// I'll make a separate reportsRoutes.js to be clean.

// @desc    Get detailed monthly comparison (This Month vs Last Month)
// @route   GET /api/analytics/monthly-comparison
router.get('/monthly-comparison', protect, async (req, res) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const transactions = await Transaction.find({ userId: req.user._id });

    const calculateTotal = (month, year, type) => {
        return transactions
            .filter(t => t.type === type && t.date.getMonth() === month && t.date.getFullYear() === year)
            .reduce((acc, curr) => acc + curr.amount, 0);
    };

    const thisMonthIncome = calculateTotal(currentMonth, currentYear, 'income');
    const thisMonthExpense = calculateTotal(currentMonth, currentYear, 'expense');

    const lastMonthIncome = calculateTotal(lastMonth, lastMonthYear, 'income');
    const lastMonthExpense = calculateTotal(lastMonth, lastMonthYear, 'expense');

    const userCurrency = req.user.currency || 'INR';

    res.json({
        thisMonth: {
            income: convertCurrency(thisMonthIncome, 'INR', userCurrency),
            expense: convertCurrency(thisMonthExpense, 'INR', userCurrency)
        },
        lastMonth: {
            income: convertCurrency(lastMonthIncome, 'INR', userCurrency),
            expense: convertCurrency(lastMonthExpense, 'INR', userCurrency)
        }
    });
});

// @desc    Get projection/forecast data (Next 6 Months)
// @route   GET /api/analytics/forecast
router.get('/forecast', protect, async (req, res) => {
    // Simple projection: Average monthly savings over last 3 months extrapolated
    const transactions = await Transaction.find({ userId: req.user._id });
    const userCurrency = req.user.currency || 'INR';

    // Group by month YYYY-MM
    const monthlyStats = {};
    transactions.forEach(t => {
        const key = `${t.date.getFullYear()}-${t.date.getMonth()}`;
        if (!monthlyStats[key]) monthlyStats[key] = { income: 0, expense: 0 };
        if (t.type === 'income') monthlyStats[key].income += t.amount;
        if (t.type === 'expense') monthlyStats[key].expense += t.amount;
    });

    // Calculate Average Savings
    let totalSavings = 0;
    let count = 0;
    Object.values(monthlyStats).forEach(stat => {
        totalSavings += (stat.income - stat.expense);
        count++;
    });
    const avgSavings = count > 0 ? totalSavings / count : 0;
    const currentBalance = (transactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0) -
        transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0));

    // Generate 6 Month Lookahead
    const forecast = [];
    let projectedBalance = currentBalance;
    const today = new Date();

    for (let i = 1; i <= 6; i++) {
        projectedBalance += avgSavings;
        const futureDate = new Date(today);
        futureDate.setMonth(today.getMonth() + i);

        forecast.push({
            month: futureDate.toLocaleString('default', { month: 'short', year: '2-digit' }),
            balance: convertCurrency(projectedBalance, 'INR', userCurrency),
            saved: convertCurrency(projectedBalance - currentBalance, 'INR', userCurrency)
        });
    }

    res.json(forecast);
});

// @desc    Get Wealth Composition & Net Worth
// @route   GET /api/analytics/wealth
router.get('/wealth', protect, async (req, res) => {
    const user = req.user;
    const userCurrency = user.currency || 'INR';

    // 1. Calculate Cash on Hand (Total Income - Total Expense)
    // Note: In a real app, this should be a stored "Wallet Balance" or synced from banks. 
    // Here we derive it from transaction history.
    const transactions = await Transaction.find({ userId: user._id });
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
    const cashOnHand = totalIncome - totalExpense;

    // 2. Investments Assets
    const investments = await Investment.find({ userId: user._id });
    const totalInvested = investments.reduce((acc, curr) => acc + curr.amount, 0);

    // Group Investments by Type
    const investmentBreakdown = {};
    investments.forEach(inv => {
        if (!investmentBreakdown[inv.type]) investmentBreakdown[inv.type] = 0;
        investmentBreakdown[inv.type] += inv.amount;
    });

    // 3. Goal Assets (Saved Amount)
    const goals = await Goal.find({ userId: user._id });
    const totalGoalSaved = goals.reduce((acc, curr) => acc + curr.savedAmount, 0);

    // 4. Liabilities (Loans/EMIs)
    // Assuming 'totalLoanAmount' is the initial loan. We should subtract repaid amount ideally.
    // For now, let's just sum relevant EMI contexts if available, or just use EMI monthly * remaining tenure?
    // Let's stick to totalLoanAmount from EMI schema if available, else 0.
    const emis = await require('../models').EMI.find({ userId: user._id });
    const totalLiabilities = emis.reduce((acc, curr) => acc + (curr.totalLoanAmount || 0), 0);

    // Net Worth
    const netWorth = (cashOnHand + totalInvested + totalGoalSaved) - totalLiabilities;

    res.json({
        netWorth: convertCurrency(netWorth, 'INR', userCurrency),
        assets: {
            cash: convertCurrency(cashOnHand, 'INR', userCurrency),
            investments: convertCurrency(totalInvested, 'INR', userCurrency),
            goals: convertCurrency(totalGoalSaved, 'INR', userCurrency),
            breakdown: Object.keys(investmentBreakdown).map(k => ({
                type: k,
                amount: convertCurrency(investmentBreakdown[k], 'INR', userCurrency)
            }))
        },
        liabilities: {
            total: convertCurrency(totalLiabilities, 'INR', userCurrency),
            loans: emis.map(e => ({ name: e.loanName, amount: convertCurrency(e.totalLoanAmount || 0, 'INR', userCurrency) }))
        },
        currency: userCurrency
    });
});

// @desc    Get Financial Trends (Last 12 Months)
// @route   GET /api/analytics/trends
router.get('/trends', protect, async (req, res) => {
    const transactions = await Transaction.find({ userId: req.user._id });
    const userCurrency = req.user.currency || 'INR';

    // Group by Month (Last 12)
    const months = [];
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push({
            label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
            month: d.getMonth(),
            year: d.getFullYear(),
            income: 0,
            expense: 0
        });
    }

    transactions.forEach(t => {
        const tDate = new Date(t.date);
        const match = months.find(m => m.month === tDate.getMonth() && m.year === tDate.getFullYear());
        if (match) {
            if (t.type === 'income') match.income += t.amount;
            if (t.type === 'expense') match.expense += t.amount;
        }
    });

    // Formatting
    const data = months.map(m => ({
        month: m.label,
        income: convertCurrency(m.income, 'INR', userCurrency),
        expense: convertCurrency(m.expense, 'INR', userCurrency),
        savingsRate: m.income > 0 ? ((m.income - m.expense) / m.income) * 100 : 0
    }));

    res.json(data);
});

module.exports = router;
