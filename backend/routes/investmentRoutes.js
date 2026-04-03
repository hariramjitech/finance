const express = require('express');
const router = express.Router();
const { protect } = require('../middleware');
const { Investment, Transaction } = require('../models');
const { convertCurrency, getStockPrice, searchSymbol, getStockRecommendations, getBalance } = require('../utils');

// @desc    Get investments with real-time value
// @route   GET /api/investments
router.get('/', protect, async (req, res) => {
    const investments = await Investment.find({ userId: req.user._id });

    // Enrich with Real-Time Data if possible
    const enrichedInvestments = await Promise.all(investments.map(async (inv) => {
        // 1. Try to get Real-Time Data for Stocks/Crypto
        if ((inv.type === 'stocks' || inv.type === 'crypto') && inv.name) {
            try {
                const stockData = await getStockPrice(inv.name);
                const changeP = parseFloat(stockData.change || 0);
                const currentValue = inv.amount * (1 + changeP / 100);

                return {
                    ...inv.toObject(),
                    amount: convertCurrency(inv.amount, 'INR', req.user.currency || 'INR'),
                    currentMarketPrice: stockData.price,
                    marketChange: stockData.change,
                    currentValue: convertCurrency(currentValue, 'INR', req.user.currency || 'INR'),
                    returns: changeP
                };
            } catch (e) {
                // Ignore error, fall through to default handling below
            }
        }

        // 2. Default Handling (Non-stocks OR API failed)
        const userCurr = req.user.currency || 'INR';
        const convertedInv = inv.toObject();
        convertedInv.amount = convertCurrency(convertedInv.amount, 'INR', userCurr);

        if (convertedInv.currentValue) {
            convertedInv.currentValue = convertCurrency(convertedInv.currentValue, 'INR', userCurr);
        } else {
            convertedInv.currentValue = convertedInv.amount;
        }

        return convertedInv;
    }));

    res.json(enrichedInvestments);
});

// @desc    Add investment
// @route   POST /api/investments
router.post('/', protect, async (req, res) => {
    const { type, name, amount, risk } = req.body;

    // Currency Conversion (User Currency -> Base INR)
    const userCurrency = req.user.currency || 'INR';
    const amountInBase = convertCurrency(amount, userCurrency, 'INR');

    // 1. Validation: Check if user has enough balance in BASE CURRENCY
    const currentBalance = await getBalance(req.user._id);

    // Check if balance is sufficient (allow a small buffer for float precision if needed, but strict is safer)
    if (currentBalance < amountInBase) {
        return res.status(400).json({
            message: `Investment Failed: You need ${amountInBase.toFixed(2)} INR (approx) but only have ${currentBalance.toFixed(2)} INR.`
        });
    }

    // 2. Create Investment
    const investment = await Investment.create({
        userId: req.user._id,
        type,
        name,
        amount: amountInBase,
        risk
    });

    // 3. Create Corresponding Expense Transaction (Sync Logic)
    // This ensures money is deducted from the "spendable" balance.
    await Transaction.create({
        userId: req.user._id,
        type: 'expense',
        category: 'Investments',
        amount: amountInBase,
        description: `Investment Check-out: ${name}`,
        date: Date.now(),
        autoCategorized: true
    });

    res.status(201).json(investment);
});

// @desc    Search Stock/Crypto Symbols
// @route   GET /api/stocks/search (NOTE: This path needs to be handled carefully in index.js or here. 
// If we mount this router at /api/investments, this becomes /api/investments/stocks/search which is wrong.
// We should probably separate stock routes or Handle it.
// Actually, let's keep stocks in a separate stockRoutes or include here but we'll need to update frontend or mount at /api/investments and change frontend call.
// BUT existing frontend calls /api/stocks/search. So I should probably make a stockRoutes.js or handle it in index.js
// Let's make stockRoutes.js for cleaner separation, OR just put them here and I'll mount this file at /api (and use full paths) or split.
// Splitting is better. I'll make stockRoutes.js separately.

// @desc    Delete investment
// @route   DELETE /api/investments/:id
router.delete('/:id', protect, async (req, res) => {
    const investment = await Investment.findById(req.params.id);
    if (investment && investment.userId.toString() === req.user._id.toString()) {
        await investment.deleteOne();
        res.json({ message: 'Investment removed' });
    } else {
        res.status(404).json({ message: 'Investment not found' });
    }
});

// @desc    Sell/Liquidate Investment (Adds to Transactions)
// @route   POST /api/investments/:id/sell
router.post('/:id/sell', protect, async (req, res) => {
    const { sellAmount } = req.body; // Total amount received from sale
    const investment = await Investment.findById(req.params.id);

    if (investment && investment.userId.toString() === req.user._id.toString()) {
        const userCurrency = req.user.currency || 'INR';
        const sellAmountBase = convertCurrency(Number(sellAmount), userCurrency, 'INR');

        const profit = sellAmountBase - investment.amount;

        // 1. Create Income Transaction (Principal + Profit)
        await Transaction.create({
            userId: req.user._id,
            type: 'income',
            category: 'Investments',
            amount: sellAmountBase,
            description: `Sold ${investment.name}`,
            date: Date.now(),
            autoCategorized: true
        });

        // 2. Remove the investment (it's sold)
        await investment.deleteOne();

        res.json({
            message: `Investment sold. ${profit > 0 ? 'Profit' : 'Loss'} of ${profit} recorded.`
        });
    } else {
        res.status(404).json({ message: 'Investment not found' });
    }
});

module.exports = router;
