const express = require('express');
const router = express.Router();
const { protect } = require('../middleware');
const { getStockPrice, searchSymbol, getStockRecommendations } = require('../utils');

// @desc    Search Stock/Crypto Symbols
// @route   GET /api/stocks/search
router.get('/search', protect, async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ message: 'Query required' });
    const results = await searchSymbol(query);
    res.json(results);
});

// @desc    Get Stock Recommendations (AI)
// @route   GET /api/stocks/recommendations
router.get('/recommendations', protect, async (req, res) => {
    try {
        const recommendations = await getStockRecommendations();
        res.json(recommendations);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch recommendations' });
    }
});

// @desc    Get Stock Price
// @route   GET /api/stocks/:symbol
router.get('/:symbol', protect, async (req, res) => {
    try {
        const data = await getStockPrice(req.params.symbol);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch stock data' });
    }
});

module.exports = router;
