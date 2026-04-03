const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const transactionRoutes = require('./transactionRoutes');
const budgetRoutes = require('./budgetRoutes');
const investmentRoutes = require('./investmentRoutes');
const stockRoutes = require('./stockRoutes');
const emiRoutes = require('./emiRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const familyRoutes = require('./familyRoutes');
const goalRoutes = require('./goalRoutes');
const recurringRoutes = require('./recurringRoutes');
const notificationRoutes = require('./notificationRoutes');
const aiRoutes = require('./aiRoutes');
const reportRoutes = require('./reportRoutes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/transactions', transactionRoutes);
router.use('/budgets', budgetRoutes);
router.use('/investments', investmentRoutes);
router.use('/stocks', stockRoutes);
router.use('/emis', emiRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/family', familyRoutes);
router.use('/goals', goalRoutes);
router.use('/recurring', recurringRoutes);
router.use('/notifications', notificationRoutes);
router.use('/ai', aiRoutes);
router.use('/reports', reportRoutes);

module.exports = router;
