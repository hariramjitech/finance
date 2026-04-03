const express = require('express');
const router = express.Router();
const { protect } = require('../middleware');
const { Budget, Transaction, Notification } = require('../models');
const { convertCurrency, getBalance } = require('../utils');

// @desc    Get Smart Budget Recommendations (AI-Driven)
// @route   GET /api/budgets/recommend
router.get('/recommend', protect, async (req, res) => {
    try {
        // 1. Analyze last 3 months entirely
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const expenses = await Transaction.aggregate([
            {
                $match: {
                    userId: req.user._id,
                    type: 'expense',
                    date: { $gte: threeMonthsAgo }
                }
            },
            {
                $group: {
                    _id: '$category',
                    totalSpent: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const recommendations = expenses.map(cat => {
            const monthlyAvg = cat.totalSpent / 3;
            // Suggest 5% less than average to encourage saving
            const suggestedLimit = Math.ceil((monthlyAvg * 0.95) / 10) * 10;

            return {
                category: cat._id,
                averageMonthlySpend: Math.round(monthlyAvg),
                suggestedLimit: suggestedLimit,
                reason: `You spend avg ${Math.round(monthlyAvg)} on ${cat._id}. Try cutting down by 5%.`
            };
        });

        res.json(recommendations);
    } catch (error) {
        res.status(500).json({ message: 'Failed to generate recommendations' });
    }
});

// @desc    Get budgets
// @route   GET /api/budgets
router.get('/', protect, async (req, res) => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const budgets = await Budget.find({
        userId: req.user._id,
        month: currentMonth,
        year: currentYear
    });

    // Calculate spent amount for each budget
    const budgetWithSpent = await Promise.all(budgets.map(async (budget) => {
        const transactions = await Transaction.aggregate([
            {
                $match: {
                    userId: req.user._id,
                    type: 'expense',
                    // Case-insensitive match for category
                    category: { $regex: new RegExp(`^${budget.category}$`, 'i') },
                    date: {
                        $gte: new Date(currentYear, currentMonth - 1, 1),
                        $lt: new Date(currentYear, currentMonth, 1) // First day of next month
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalSpent: { $sum: '$amount' }
                }
            }
        ]);

        return {
            ...budget.toObject(),
            limit: convertCurrency(budget.limit, 'INR', req.user.currency || 'INR'),
            spent: convertCurrency(transactions[0]?.totalSpent || 0, 'INR', req.user.currency || 'INR')
        };
    }));

    res.json(budgetWithSpent);
});

// @desc    Set budget
// @route   POST /api/budgets
router.post('/', protect, async (req, res) => {
    const { category, limit, month, year } = req.body;

    // Currency Conversion (User Currency -> Base INR)
    const userCurrency = req.user.currency || 'INR';
    const limitInBase = convertCurrency(limit, userCurrency, 'INR');

    // 1. Calculate Current Balance (Income - Expense) in Base Currency
    const currentBalance = await getBalance(req.user._id);

    // 2. Calculate Total Existing Budget Limits for this month in Base Currency
    const existingBudgets = await Budget.find({
        userId: req.user._id,
        month,
        year
    });
    const totalBudgeted = existingBudgets.reduce((sum, b) => sum + b.limit, 0);

    // 3. Check if new limit exceeds available funds
    // Note: This logic assumes you cannot budget more than what you HAVE.
    // Some users budget against *expected* income. But for strict control, this is okay.
    // We compare apples to apples (Base Currency)
    if ((totalBudgeted + limitInBase) > currentBalance) {
        // Convert back significantly for error message display
        const readableBalance = convertCurrency(currentBalance, 'INR', userCurrency);
        const readableBudgeted = convertCurrency(totalBudgeted, 'INR', userCurrency);

        return res.status(400).json({
            message: `Budget creation failed. Exceeds wallet balance. Available: ${readableBalance.toFixed(2)}, Allocating: ${limit}, Already Budgeted: ${readableBudgeted.toFixed(2)}`
        });
    }

    const budget = await Budget.create({
        userId: req.user._id,
        category,
        limit: limitInBase,
        month,
        year
    });
    res.status(201).json(budget);
});

// @desc    Delete budget
// @route   DELETE /api/budgets/:id
router.delete('/:id', protect, async (req, res) => {
    const budget = await Budget.findById(req.params.id);
    if (budget && budget.userId.toString() === req.user._id.toString()) {
        await budget.deleteOne();
        res.json({ message: 'Budget removed' });
    } else {
        res.status(404).json({ message: 'Budget not found' });
    }
});

module.exports = router;
