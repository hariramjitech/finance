const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware');
const { chatWithFinanceBot, analyzeBankStatement, analyzeReceipt, seedDatabase } = require('../utils');
const rateLimit = require('express-rate-limit');
const { Transaction, Investment, Budget, Goal, EMI, RecurringTransaction } = require('../models'); // Needed for context gathering in chat
const { convertCurrency } = require('../utils');

const aiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // Strict limit for AI endpoints
    message: 'AI service busy, please try again in a minute.'
});

// Configure Multer for Image Uploads
const storage = multer.diskStorage({
    destination(req, file, cb) {
        const uploadPath = 'uploads/';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
    },
    filename(req, file, cb) {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    },
});

const upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    },
});

function checkFileType(file, cb) {
    const filetypes = /jpg|jpeg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb('Images only!');
    }
}

// @desc    Chat with AI Financial Advisor
// @route   POST /api/ai/chat
router.post('/chat', protect, aiLimiter, async (req, res) => {
    const { message } = req.body;

    // Gather context
    // Gather context
    // 1. Calculate Total Income and Expense from ALL transactions
    const stats = await Transaction.aggregate([
        { $match: { userId: req.user._id } },
        {
            $group: {
                _id: null,
                totalIncome: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
                totalExpense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } }
            }
        }
    ]);
    const { totalIncome, totalExpense } = stats[0] || { totalIncome: 0, totalExpense: 0 };

    // 2. Fetch Recent Transactions for Context
    const recentTransactions = await Transaction.find({ userId: req.user._id })
        .sort({ date: -1 })
        .limit(10);

    const budgets = await Budget.find({ userId: req.user._id, month: new Date().getMonth() + 1, year: new Date().getFullYear() });
    const goals = await Goal.find({ userId: req.user._id, completed: false });
    const loans = await EMI.find({ userId: req.user._id, paid: false });
    const recurring = await RecurringTransaction.find({ userId: req.user._id, active: true });


    const investments = await Investment.find({ userId: req.user._id });
    const totalInvestment = investments.reduce((acc, curr) => acc + curr.amount, 0);

    // Currency Conversion (Base INR -> User Currency)
    const userCurrency = req.user.currency || 'INR';

    const context = {
        currency: userCurrency,
        totalIncome: convertCurrency(totalIncome, 'INR', userCurrency),
        totalExpense: convertCurrency(totalExpense, 'INR', userCurrency),
        savings: convertCurrency(totalIncome - totalExpense, 'INR', userCurrency),
        totalInvestment: convertCurrency(totalInvestment, 'INR', userCurrency),
        netWorth: convertCurrency((totalIncome - totalExpense) + totalInvestment, 'INR', userCurrency),
        investments: investments.map(i => ({
            name: i.name,
            amount: convertCurrency(i.amount, 'INR', userCurrency),
            type: i.type
        })),
        recentTransactions: recentTransactions.map(t => ({
            amount: convertCurrency(t.amount, 'INR', userCurrency),
            category: t.category,
            type: t.type,
            date: t.date.toISOString().split('T')[0]
        })),
        budgets: budgets.map(b => ({
            category: b.category,
            limit: convertCurrency(b.limit, 'INR', userCurrency)
        })),
        goals: goals.map(g => ({
            title: g.title,
            target: convertCurrency(g.targetAmount, 'INR', userCurrency),
            saved: convertCurrency(g.savedAmount, 'INR', userCurrency),
            deadline: g.deadline ? g.deadline.toISOString().split('T')[0] : 'N/A'
        })),
        loans: loans.map(l => ({
            name: l.loanName,
            monthlyAmount: convertCurrency(l.amount, 'INR', userCurrency),
            dueDate: l.dueDate ? l.dueDate.toISOString().split('T')[0] : 'N/A'
        })),
        recurring: recurring.map(r => ({
            name: r.category,
            amount: convertCurrency(r.amount, 'INR', userCurrency),
            frequency: r.frequency
        }))
    };

    const response = await chatWithFinanceBot(message, context);
    res.json({ reply: response });
});

// @desc    Scan Bank Statement (OCR for multiple transactions)
// @route   POST /api/ai/scan-statement
router.post('/scan-statement', protect, aiLimiter, upload.single('statement'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Please upload an image' });
    }

    try {
        const transactions = await analyzeBankStatement(req.file.path, req.file.mimetype);

        // Cleanup uploaded file
        fs.unlinkSync(req.file.path);

        res.json(transactions);
    } catch (error) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); // Ensure cleanup on error
        console.error("Statement Scan Error:", error);
        res.status(500).json({ message: error.message || 'Failed to analyze statement' });
    }
});

// @desc    Scan Receipt (OCR)
// @route   POST /api/ai/scan-receipt
router.post('/scan-receipt', protect, aiLimiter, upload.single('receipt'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Please upload an image' });
    }

    try {
        const result = await analyzeReceipt(req.file.path, req.file.mimetype);

        // Cleanup uploaded file
        fs.unlinkSync(req.file.path);

        res.json(result);
    } catch (error) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); // Ensure cleanup on error
        res.status(500).json({ message: 'Failed to analyze receipt' });
    }
});

// @desc    Process Voice/Text Command
// @route   POST /api/ai/command
router.post('/command', protect, aiLimiter, async (req, res) => {
    const { command } = req.body;
    if (!command) return res.status(400).json({ message: 'Command is required' });

    try {
        const userCurrency = req.user.currency || 'INR';
        const parsedTransaction = await require('../utils').parseVoiceCommand(command, userCurrency);

        // We don't save it automatically, we return it for confirmation (UI UX best practice)
        res.json(parsedTransaction);
    } catch (error) {
        console.error("Command Error:", error);
        res.status(500).json({ message: error.message || 'Failed to process command' });
    }
});

module.exports = router;
