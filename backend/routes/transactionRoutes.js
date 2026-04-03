const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect, asyncHandler } = require('../middleware');
const { Transaction, Budget, Notification, User } = require('../models');
const { convertCurrency, autoCategorize, detectFraud, getBalance } = require('../utils');

const validate = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));
        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }
        res.status(400).json({ errors: errors.array() });
    };
};

// @desc    Get all transactions with filters
// @route   GET /api/transactions
router.get('/', protect, asyncHandler(async (req, res) => {
    const { startDate, endDate, category, type, limit } = req.query;

    let query = { userId: req.user._id };

    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
    }

    if (category) {
        query.category = category;
    }

    if (type) {
        query.type = type;
    }

    let dbQuery = Transaction.find(query).sort({ date: -1 });

    if (limit) {
        dbQuery = dbQuery.limit(parseInt(limit));
    }

    const transactions = await dbQuery.lean();

    // Currency Conversion (Base INR -> User Currency)
    const userCurrency = req.user.currency || 'INR';
    const convertedTransactions = transactions.map(t => ({
        ...t,
        amount: convertCurrency(t.amount, 'INR', userCurrency)
    }));

    res.json(convertedTransactions);
}));

// @desc    Add transaction
// @route   POST /api/transactions
router.post('/', protect, validate([
    body('amount').isNumeric().withMessage('Amount must be a number'),
    body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense')
]), asyncHandler(async (req, res) => {
    const { type, category, amount, description, date } = req.body;

    // Currency Conversion (User Currency -> Base INR)
    const userCurrency = req.user.currency || 'INR';
    const amountInBase = convertCurrency(amount, userCurrency, 'INR');

    // Check Balance logic (Optional: Could add warning, but don't block)
    // Removed strict blocking to allow negative balances (Credit/Debt scenarios)
    const currentBalance = await getBalance(req.user._id);
    let balanceWarning = null;
    if (type === 'expense' && currentBalance < amountInBase) {
        balanceWarning = 'Warning: This expense puts your tracked balance below zero.';
    }

    // AI: Auto-categorize if not provided
    const finalCategory = category || autoCategorize(description || '');

    // AI: Fraud Detection
    const pastTransactions = await Transaction.find({ userId: req.user._id }).sort({ date: -1 }).limit(50);
    const isFraud = detectFraud(amountInBase, pastTransactions);

    // Check Budget Exceeded
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const budget = await Budget.findOne({
        userId: req.user._id,
        category: { $regex: new RegExp(`^${finalCategory}$`, 'i') },
        month: currentMonth,
        year: currentYear
    });

    let alertMessage = null;
    if (budget) {
        const currentSpending = await Transaction.aggregate([
            {
                $match: {
                    userId: req.user._id,
                    category: { $regex: new RegExp(`^${finalCategory}$`, 'i') },
                    type: 'expense',
                    date: {
                        $gte: new Date(currentYear, currentMonth - 1, 1),
                        $lt: new Date(currentYear, currentMonth, 1)
                    }
                }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const totalSpent = (currentSpending[0]?.total || 0) + amountInBase;

        if (totalSpent > budget.limit) {
            alertMessage = `Alert: You have exceeded your ${finalCategory} budget of ${budget.limit}!`;

            // Create Notification
            await Notification.create({
                userId: req.user._id,
                type: 'alert',
                message: alertMessage
            });
        }
    }

    const transaction = await Transaction.create({
        userId: req.user._id,
        type,
        category: finalCategory,
        amount: amountInBase,
        description,
        date: date || Date.now(),
        autoCategorized: !category,
        isFraudSuspect: isFraud
    });

    // Gamification: Add XP for adding a transaction
    await User.findByIdAndUpdate(req.user._id, { $inc: { xp: 5 } });

    res.status(201).json({ ...transaction.toObject(), alertMessage, balanceWarning });
}));

// @desc    Update transaction
// @route   PUT /api/transactions/:id
router.put('/:id', protect, asyncHandler(async (req, res) => {
    const { amount, category, date, description, type } = req.body;
    const transaction = await Transaction.findById(req.params.id);

    if (transaction && transaction.userId.toString() === req.user._id.toString()) {
        const userCurrency = req.user.currency || 'INR';

        // Update fields if provided
        if (amount !== undefined) {
            // Currency Conversion (User Currency -> Base INR)
            transaction.amount = convertCurrency(amount, userCurrency, 'INR');
        }
        if (category) transaction.category = category;
        if (date) transaction.date = date;
        if (description) transaction.description = description;
        if (type) transaction.type = type;

        const updatedTransaction = await transaction.save();

        // Convert back for response
        const responseTx = updatedTransaction.toObject();
        responseTx.amount = convertCurrency(updatedTransaction.amount, 'INR', userCurrency);

        res.json(responseTx);
    } else {
        res.status(404);
        throw new Error('Transaction not found or unauthorized');
    }
}));

// @desc    Add multiple transactions (Bulk Import)
// @route   POST /api/transactions/bulk
router.post('/bulk', protect, asyncHandler(async (req, res) => {
    const { transactions } = req.body; // Array of { type, category, amount, description, date }

    if (!Array.isArray(transactions) || transactions.length === 0) {
        res.status(400);
        throw new Error('No transactions provided');
    }

    const userCurrency = req.user.currency || 'INR';
    const processedTransactions = [];

    for (const t of transactions) {
        // Validation (Basic)
        if (!t.amount || !t.type) continue;

        // Currency Conversion (User Currency -> Base INR)
        const amountInBase = convertCurrency(t.amount, userCurrency, 'INR');

        // AI: Auto-categorize if needed
        const finalCategory = t.category || autoCategorize(t.description || '');

        processedTransactions.push({
            userId: req.user._id,
            type: t.type,
            category: finalCategory,
            amount: amountInBase,
            description: t.description || 'Imported Transaction',
            date: t.date || Date.now(),
            autoCategorized: !t.category,
            isFraudSuspect: false // Skip heavy fraud check for bulk import for speed
        });
    }

    if (processedTransactions.length > 0) {
        await Transaction.insertMany(processedTransactions);

        // Gamification: Add XP for bulk import
        await User.findByIdAndUpdate(req.user._id, { $inc: { xp: processedTransactions.length * 2 } });
    }

    res.status(201).json({ message: `Successfully imported ${processedTransactions.length} transactions.` });
}));

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
router.delete('/:id', protect, asyncHandler(async (req, res) => {
    const transaction = await Transaction.findById(req.params.id);

    if (transaction && transaction.userId.toString() === req.user._id.toString()) {
        await transaction.deleteOne();
        res.json({ message: 'Transaction removed' });
    } else {
        res.status(404);
        throw new Error('Transaction not found or unauthorized');
    }
}));

module.exports = router;
