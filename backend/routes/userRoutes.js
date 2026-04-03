const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { protect, asyncHandler } = require('../middleware');
const { User } = require('../models');
const { generateToken } = require('../utils');

// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
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

// @desc    Get user profile
// @route   GET /api/users/profile
router.get('/profile', protect, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            xp: user.xp,
            streaks: user.streaks,
            profileInfo: user.profileInfo,
            profilePicture: user.profilePicture,
            familyId: user.familyId
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
}));

// @desc    Update user profile
// @route   PUT /api/users/profile
router.put('/profile', protect, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.currency = req.body.currency || user.currency;
        if (req.body.profileInfo) {
            user.profileInfo = {
                occupation: req.body.profileInfo.occupation || user.profileInfo?.occupation,
                age: req.body.profileInfo.age || user.profileInfo?.age,
                financialGoals: user.profileInfo?.financialGoals
            };
        }
        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            currency: updatedUser.currency,
            token: generateToken(updatedUser._id),
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
}));

// @desc    Upload Profile Picture
// @route   POST /api/users/profile-picture
router.post('/profile-picture', protect, upload.single('image'), asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('No image uploaded');
    }

    try {
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'finance_tracker_profiles',
            width: 500,
            crop: "scale"
        });

        // Cleanup local file
        fs.unlinkSync(req.file.path);

        const user = await User.findById(req.user._id);
        if (user) {
            user.profilePicture = result.secure_url;
            await user.save();
            res.json({
                message: 'Profile picture updated',
                profilePicture: result.secure_url
            });
        } else {
            res.status(404);
            throw new Error('User not found');
        }
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        // Re-throw to let global handler handle it, or send manually if specific handling needed
        res.status(500);
        throw new Error(error.message || 'Image upload failed');
    }
}));

// @desc    Get leaderboard (Top 10 users by XP)
// @route   GET /api/users/leaderboard
router.get('/leaderboard', protect, asyncHandler(async (req, res) => {
    const leaderboard = await User.find({})
        .sort({ xp: -1 })
        .limit(10)
        .select('name xp streaks profileInfo.occupation');
    res.json(leaderboard);
}));

module.exports = router;
