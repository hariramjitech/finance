const express = require('express');
const router = express.Router();
const { protect } = require('../middleware');
const { Goal, Family, Notification, Transaction, User, Budget } = require('../models');
const { convertCurrency } = require('../utils');

const getBalanceLocal = async (userId) => {
    const stats = await Transaction.aggregate([
        { $match: { userId: userId } },
        {
            $group: {
                _id: null,
                totalIncome: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
                totalExpense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } }
            }
        }
    ]);
    const { totalIncome, totalExpense } = stats[0] || { totalIncome: 0, totalExpense: 0 };
    return totalIncome - totalExpense;
};

// @desc    Get goals (Personal and Family)
// @route   GET /api/goals
router.get('/', protect, async (req, res) => {
    let query = { userId: req.user._id };

    if (req.user.familyId) {
        query = {
            $or: [
                { userId: req.user._id },
                { familyId: req.user.familyId }
            ]
        };
    }

    // Use .lean() to get plain JS objects we can modify
    let goals = await Goal.find(query).lean();

    // Currency Conversion for ALL goals (Personal & Shared)
    const userCurrency = req.user.currency || 'INR';
    goals = goals.map(goal => ({
        ...goal,
        targetAmount: convertCurrency(goal.targetAmount, 'INR', userCurrency),
        savedAmount: convertCurrency(goal.savedAmount, 'INR', userCurrency)
    }));

    res.json(goals);
});

// @desc    Create goal
// @route   POST /api/goals
router.post('/', protect, async (req, res) => {
    const { title, targetAmount, deadline, color, isFamily, shared } = req.body;

    const isShared = isFamily || shared || false;

    // Currency Conversion (User -> Base INR)
    const userCurrency = req.user.currency || 'INR';
    const targetInBase = convertCurrency(targetAmount, userCurrency, 'INR');

    let goalData = {
        userId: req.user._id,
        title,
        targetAmount: targetInBase,
        deadline,
        color,
        isFamily: isShared
    };

    if (isShared && req.user.familyId) {
        goalData.familyId = req.user.familyId;

        // Notify other family members
        const family = await Family.findById(req.user.familyId);
        if (family) {
            const otherMembers = family.members.filter(m => m.toString() !== req.user._id.toString());
            for (const memberId of otherMembers) {
                await Notification.create({
                    userId: memberId,
                    type: 'info',
                    message: `${req.user.name} added a new family goal: ${title}. Check it out!`
                });
            }
        }
    }

    const goal = await Goal.create(goalData);
    res.status(201).json(goal);
});

// @desc    Add funds to goal
// @route   PUT /api/goals/:id/add
router.put('/:id/add', protect, async (req, res) => {
    const { amount } = req.body;
    const goal = await Goal.findById(req.params.id);

    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    // Check permission: Owner OR Family Member
    const isOwner = goal.userId.toString() === req.user._id.toString();
    const isFamilyGoal = goal.familyId && req.user.familyId && goal.familyId.toString() === req.user.familyId.toString();

    if (isOwner || isFamilyGoal) {
        // Currency Conversion (User -> Base INR)
        const userCurrency = req.user.currency || 'INR';
        const contributionAmount = convertCurrency(Number(amount), userCurrency, 'INR');

        // 1. Check Balance
        const currentBalance = await getBalanceLocal(req.user._id);
        if (currentBalance < contributionAmount) {
            return res.status(400).json({ message: 'Contribution Failed: Insufficient funds in your account.' });
        }

        // 2. Update Goal
        goal.savedAmount += contributionAmount;
        // If family goal, notify other members about the contribution
        if (goal.familyId) {
            const family = await Family.findById(goal.familyId);
            if (family) {
                // Filter out the contributor so they don't notify themselves
                const otherMembers = family.members.filter(m => m.toString() !== req.user._id.toString());

                for (const memberId of otherMembers) {
                    await Notification.create({
                        userId: memberId,
                        type: 'info',
                        message: `${req.user.name} added ${userCurrency} ${amount} to family goal: ${goal.title}`
                    });
                }

                // If completed, notify everyone (including contributor potentially, or handled above)
                if (goal.savedAmount >= goal.targetAmount) {
                    // Note: We might want to send a specific "Completed" notification distinct from the "Contribution" one
                    // The existing logic below handles the "Completed" notification for ALL members
                }
            }
        }

        if (goal.savedAmount >= goal.targetAmount) {
            goal.completed = true;
            await User.findByIdAndUpdate(req.user._id, { $addToSet: { badges: 'Goal Crusher' } }); // Award badge to contributor

            // If family goal completed, notify everyone
            if (goal.familyId) {
                const family = await Family.findById(goal.familyId);
                if (family) {
                    for (const memberId of family.members) {
                        await Notification.create({
                            userId: memberId,
                            type: 'success',
                            message: `Family Goal Completed: ${goal.title}!`
                        });
                    }
                }
            }
        }
        await goal.save();

        // 3. Create Expense Transaction (Account for the money moved to savings)
        await Transaction.create({
            userId: req.user._id,
            type: 'expense',
            category: 'Savings', // or 'Goal Contribution'
            amount: contributionAmount,
            description: `Contributed to Goal: ${goal.title}`,
            date: Date.now(),
            autoCategorized: true
        });

        res.json(goal);
    } else {
        res.status(401).json({ message: 'Not authorized to contribute to this goal' });
    }
});

// @desc    Redeem/Complete goal (Move to income)
// @route   POST /api/goals/:id/redeem
router.post('/:id/redeem', protect, async (req, res) => {
    const goal = await Goal.findById(req.params.id);

    if (!goal) return res.status(404).json({ message: 'Goal not found' });
    if (goal.userId.toString() !== req.user._id.toString()) return res.status(401).json({ message: 'Not authorized' });
    if (goal.redeemed) return res.status(400).json({ message: 'Goal is already redeemed' });

    // 1. Mark as Redeemed (soft-archive)
    goal.redeemed = true;
    goal.completed = true;
    await goal.save();

    // 2. Create Income Transaction (Return money to flow)
    const transaction = await Transaction.create({
        userId: req.user._id,
        type: 'income',
        category: 'Goal Redemption',
        amount: goal.savedAmount,
        description: `Redeemed Goal: ${goal.title}`,
        date: Date.now(),
        autoCategorized: true
    });

    // 3. Create a Budget for this item (Optional but requested)
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const existingBudget = await Budget.findOne({
        userId: req.user._id,
        category: goal.title,
        month: currentMonth,
        year: currentYear
    });

    let budget = null;
    if (!existingBudget) {
        budget = await Budget.create({
            userId: req.user._id,
            category: goal.title, // Category matches goal name
            limit: goal.savedAmount, // Limit matches saved amount
            month: currentMonth,
            year: currentYear
        });
    }

    res.json({
        message: 'Goal redeemed successfully',
        transaction,
        budget
    });
});

// @desc    Delete goal
// @route   DELETE /api/goals/:id
router.delete('/:id', protect, async (req, res) => {
    const goal = await Goal.findById(req.params.id);

    if (!goal) return res.status(404).json({ message: 'Goal not found' });

    const isOwner = goal.userId.toString() === req.user._id.toString();
    const isFamilyGoal = goal.familyId && req.user.familyId && goal.familyId.toString() === req.user.familyId.toString();

    if (isOwner || isFamilyGoal) {
        await goal.deleteOne();
        res.json({ message: 'Goal removed' });
    } else {
        res.status(401).json({ message: 'Not authorized to delete this goal' });
    }
});

module.exports = router;
