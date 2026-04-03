const express = require('express');
const router = express.Router();
const { protect } = require('../middleware');
const { EMI } = require('../models');
const { convertCurrency } = require('../utils');

// @desc    Get EMIs
// @route   GET /api/emis
router.get('/', protect, async (req, res) => {
    const emis = await EMI.find({ userId: req.user._id }).lean();

    // Currency Conversion
    const userCurrency = req.user.currency || 'INR';
    const convertedEmis = emis.map(e => ({
        ...e,
        amount: convertCurrency(e.amount, 'INR', userCurrency),
        totalLoanAmount: e.totalLoanAmount ? convertCurrency(e.totalLoanAmount, 'INR', userCurrency) : undefined
    }));

    res.json(convertedEmis);
});

// @desc    Add EMI
// @route   POST /api/emis
router.post('/', protect, async (req, res) => {
    const { loanName, amount, dueDate, interestRate } = req.body;

    // Currency Conversion
    const userCurrency = req.user.currency || 'INR';
    const amountInBase = convertCurrency(amount, userCurrency, 'INR');

    const emi = await EMI.create({
        userId: req.user._id,
        loanName,
        amount: amountInBase,
        dueDate,
        interestRate
    });
    res.status(201).json(emi);
});

// @desc    Delete EMI
// @route   DELETE /api/emis/:id
router.delete('/:id', protect, async (req, res) => {
    const emi = await EMI.findById(req.params.id);
    if (emi && emi.userId.toString() === req.user._id.toString()) {
        await emi.deleteOne();
        res.json({ message: 'EMI removed' });
    } else {
        res.status(404).json({ message: 'EMI not found' });
    }
});

module.exports = router;
