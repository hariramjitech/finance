const express = require('express');
const router = express.Router();
const { protect } = require('../middleware');
const { Family, User, Transaction, Goal } = require('../models');
const { convertCurrency } = require('../utils');

// @desc    Create a family
// @route   POST /api/family/create
router.post('/create', protect, async (req, res) => {
    const { name } = req.body;
    const inviteCode = Math.random().toString(36).substring(7).toUpperCase();

    const family = await Family.create({
        name,
        adminId: req.user._id,
        members: [req.user._id],
        inviteCode
    });

    await User.findByIdAndUpdate(req.user._id, { familyId: family._id });

    res.status(201).json(family);
});

// @desc    Join a family
// @route   POST /api/family/join
router.post('/join', protect, async (req, res) => {
    const { inviteCode } = req.body;
    const family = await Family.findOne({ inviteCode });

    if (!family) {
        return res.status(404).json({ message: 'Invalid invite code' });
    }

    if (req.user.familyId) {
        return res.status(400).json({ message: 'You are already in a family. Leave it first.' });
    }

    if (family.members.includes(req.user._id)) {
        return res.status(400).json({ message: 'Already a member' });
    }

    family.members.push(req.user._id);
    await family.save();

    await User.findByIdAndUpdate(req.user._id, { familyId: family._id });

    res.json({ message: 'Joined family successfully', family });
});

// @desc    Get family members
// @route   GET /api/family/members
router.get('/members', protect, async (req, res) => {
    if (!req.user.familyId) {
        return res.status(400).json({ message: 'Not part of a family' });
    }
    const family = await Family.findById(req.user.familyId).populate('members', 'name email xp');
    res.json(family);
});

// @desc    Get family financial analytics
// @route   GET /api/family/analytics
router.get('/analytics', protect, async (req, res) => {
    if (!req.user.familyId) {
        return res.status(400).json({ message: 'Not part of a family' });
    }

    const family = await Family.findById(req.user.familyId);
    if (!family) return res.status(404).json({ message: "Family not found" });

    const memberIds = family.members;

    // 1. Get Member Currencies
    const memberUsers = await User.find({ _id: { $in: memberIds } });
    const memberCurrencyMap = {};
    const memberNames = {};
    memberUsers.forEach(u => {
        memberCurrencyMap[u._id.toString()] = u.currency || 'USD';
        memberNames[u._id.toString()] = u.name;
    });

    const myCurrency = req.user.currency || 'USD';

    // 2. Fetch Transactions & Normalize Currency
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const transactions = await Transaction.find({
        userId: { $in: memberIds },
        type: 'expense',
        date: { $gte: startOfMonth }
    });

    let totalFamilyMonthExpense = 0;
    const memberSpendMap = {};

    transactions.forEach(t => {
        const tUserCurrency = memberCurrencyMap[t.userId.toString()] || 'USD';
        const normalizedAmount = convertCurrency(t.amount, tUserCurrency, myCurrency);

        totalFamilyMonthExpense += normalizedAmount;

        if (!memberSpendMap[t.userId.toString()]) memberSpendMap[t.userId.toString()] = 0;
        memberSpendMap[t.userId.toString()] += normalizedAmount;
    });

    const memberStats = Object.keys(memberSpendMap).map(uid => ({
        name: memberNames[uid] || 'Unknown',
        spent: Math.round(memberSpendMap[uid])
    }));

    // 3. Family Goals Overview (Normalize Currency)
    const goals = await Goal.find({ userId: { $in: memberIds }, isFamily: true });

    let totalTarget = 0;
    let totalSaved = 0;

    goals.forEach(g => {
        const gUserCurrency = memberCurrencyMap[g.userId.toString()] || 'USD';
        totalTarget += convertCurrency(g.targetAmount, gUserCurrency, myCurrency);
        totalSaved += convertCurrency(g.savedAmount, gUserCurrency, myCurrency);
    });

    res.json({
        totalFamilyMonthExpense: Math.round(totalFamilyMonthExpense),
        memberStats,
        goalsSummary: {
            totalGoals: goals.length,
            totalTarget: Math.round(totalTarget),
            totalSaved: Math.round(totalSaved),
            completion: totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0
        },
        activeGoals: goals // Send all for now
    });
});

// @desc    Leave family
// @route   POST /api/family/leave
router.post('/leave', protect, async (req, res) => {
    if (!req.user.familyId) {
        return res.status(400).json({ message: 'Not part of a family' });
    }

    const family = await Family.findById(req.user.familyId);
    if (!family) {
        // Data inconsistency fix - ensure user is freed even if family is gone
        await User.findByIdAndUpdate(req.user._id, { $unset: { familyId: "" } });
        return res.json({ message: 'Left family successfully' });
    }

    // Remove user from family members
    family.members = family.members.filter(id => id.toString() !== req.user._id.toString());

    if (family.members.length === 0) {
        // If no members left, delete the family
        await family.deleteOne();
    } else {
        await family.save();
    }

    // Update User to remove family association
    await User.findByIdAndUpdate(req.user._id, { $unset: { familyId: "" } });

    res.json({ message: 'Left family successfully' });
});

// @desc    Delete family (Admin only)
// @route   DELETE /api/family/delete
router.delete('/delete', protect, async (req, res) => {
    if (!req.user.familyId) {
        return res.status(400).json({ message: 'Not part of a family' });
    }

    const family = await Family.findById(req.user.familyId);
    if (!family) {
        return res.status(404).json({ message: "Family not found" });
    }

    if (family.adminId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Only admin can delete the family" });
    }

    // This will trigger the pre('deleteOne') hook in models.js
    // which cleans up goals and unlinks members
    await family.deleteOne();

    res.json({ message: 'Family dissolved successfully' });
});

module.exports = router;
