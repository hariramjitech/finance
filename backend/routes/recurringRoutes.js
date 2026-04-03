const express = require('express');
const router = express.Router();
const { protect } = require('../middleware');
const { RecurringTransaction } = require('../models');
const { convertCurrency } = require('../utils');

// @desc    Get recurring transactions
// @route   GET /api/recurring
router.get('/', protect, async (req, res) => {
    const recurring = await RecurringTransaction.find({ userId: req.user._id }).lean();

    
    const userCurrency = req.user.currency || 'INR';
    const convertedRecurring = recurring.map(r => ({
        ...r,
        amount: convertCurrency(r.amount, 'INR', userCurrency)
    }));

    res.json(convertedRecurring);
});

// @desc    Create recurring transaction
// @route   POST /api/recurring
router.post('/', protect, async (req, res) => {
    const { type, category, amount, frequency, description, startDate } = req.body;

    let nextRun = new Date(startDate || Date.now());
    if (frequency === 'daily') nextRun.setDate(nextRun.getDate() + 1);
    if (frequency === 'weekly') nextRun.setDate(nextRun.getDate() + 7);
    if (frequency === 'monthly') nextRun.setMonth(nextRun.getMonth() + 1);
    if (frequency === 'yearly') nextRun.setFullYear(nextRun.getFullYear() + 1);

    // Currency Conversion
    const userCurrency = req.user.currency || 'INR';
    const amountInBase = convertCurrency(amount, userCurrency, 'INR');

    const recurring = await RecurringTransaction.create({
        userId: req.user._id,
        type,
        category,
        amount: amountInBase,
        frequency,
        startDate: startDate || Date.now(),
        nextRunDate: nextRun,
        description
    });
    res.status(201).json(recurring);
});

// @desc    Delete recurring transaction
// @route   DELETE /api/recurring/:id
router.delete('/:id', protect, async (req, res) => {
    const recurring = await RecurringTransaction.findById(req.params.id);
    if (recurring && recurring.userId.toString() === req.user._id.toString()) {
        await recurring.deleteOne();
        res.json({ message: 'Recurring transaction removed' });
    } else {
        res.status(404).json({ message: 'Recurring transaction not found' });
    }
});

// @desc    Scan for subscription suggestions (AI)
// @route   POST /api/recurring/scan
router.post('/scan', protect, async (req, res) => {
    try {
        const { Transaction } = require('../models');
        const { detectSubscriptions } = require('../utils');

        // Look at last 6 months of transactions
        const transactions = await Transaction.find({
            userId: req.user._id,
            type: 'expense'
        }).sort({ date: -1 }).limit(100);

        const suggestions = await detectSubscriptions(transactions);
        res.json(suggestions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to scan for subscriptions" });
    }
});

module.exports = router;
