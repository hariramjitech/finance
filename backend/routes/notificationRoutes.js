const express = require('express');
const router = express.Router();
const { protect } = require('../middleware');
const { Notification } = require('../models');

// @desc    Get notifications
// @route   GET /api/notifications
router.get('/', protect, async (req, res) => {
    const notifications = await Notification.find({ userId: req.user._id }).sort({ date: -1 });
    res.json(notifications);
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
router.put('/:id/read', protect, async (req, res) => {
    const notification = await Notification.findById(req.params.id);
    if (notification && notification.userId.toString() === req.user._id.toString()) {
        notification.read = true;
        await notification.save();
        res.json(notification);
    } else {
        res.status(404).json({ message: 'Notification not found' });
    }
});

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
router.delete('/:id', protect, async (req, res) => {
    const notification = await Notification.findById(req.params.id);
    if (notification && notification.userId.toString() === req.user._id.toString()) {
        await notification.deleteOne();
        res.json({ message: 'Notification removed' });
    } else {
        res.status(404).json({ message: 'Notification not found' });
    }
});

// @desc    Clear all notifications
// @route   DELETE /api/notifications
router.delete('/', protect, async (req, res) => {
    await Notification.deleteMany({ userId: req.user._id });
    res.json({ message: 'All notifications cleared' });
});

module.exports = router;
