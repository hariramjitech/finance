const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// --- User Schema ---
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    currency: { type: String, default: 'INR' }, // Multi-currency support (Default: INR for India context)
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family' }, // Family/Shared finance
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    badges: [{ type: String }], // e.g., 'Saver', 'Investor', 'Streak Master'
    streaks: { type: Number, default: 0 },
    profileInfo: {
        age: Number,
        occupation: String,
        financialGoals: [String]
    },
    profilePicture: { type: String, default: '' },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    lastLogin: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Match password method
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Cascading Delete: When User is deleted, delete all their data
userSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    console.log(`Cascading delete for user ${this._id}`);
    await mongoose.model('Transaction').deleteMany({ userId: this._id });
    await mongoose.model('Budget').deleteMany({ userId: this._id });
    await mongoose.model('Investment').deleteMany({ userId: this._id });
    await mongoose.model('Goal').deleteMany({ userId: this._id });
    await mongoose.model('EMI').deleteMany({ userId: this._id });
    await mongoose.model('Notification').deleteMany({ userId: this._id });
    await mongoose.model('RecurringTransaction').deleteMany({ userId: this._id });
    // Remove from Family
    if (this.familyId) {
        const family = await mongoose.model('Family').findById(this.familyId);
        if (family) {
            family.members = family.members.filter(id => id.toString() !== this._id.toString());
            if (family.members.length === 0) await family.deleteOne();
            else await family.save();
        }
    }
    next();
});

// --- Transaction Schema ---
const transactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, required: true }, // e.g., 'salary', 'food', 'rent'
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    description: String,
    autoCategorized: { type: Boolean, default: false },
    isFraudSuspect: { type: Boolean, default: false }
}, { timestamps: true });

// Indexes for performance
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ userId: 1, category: 1 });

// --- Budget Schema ---
const budgetSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, required: true },
    limit: { type: Number, required: true },
    month: { type: Number, required: true }, // 1-12
    year: { type: Number, required: true },
    alertsSent: { type: Boolean, default: false }
});

// --- Investment Schema ---
const investmentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['stocks', 'mutualfund', 'crypto', 'realestate', 'bonds', 'etf', 'gold', 'other'], required: true },
    name: { type: String, required: true }, // e.g., "Apple Stock", "Bitcoin"
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    currentValue: { type: Number }, // For tracking returns
    returns: { type: Number, default: 0 }, // Percentage or absolute
    risk: { type: String, enum: ['low', 'medium', 'high'], default: 'medium', set: v => typeof v === 'string' ? v.toLowerCase() : v },
    maturityDate: Date
});

// --- EMI Schema ---
const emiSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    loanName: { type: String, required: true },
    amount: { type: Number, required: true }, // Monthly amount
    totalLoanAmount: { type: Number },
    interestRate: { type: Number },
    dueDate: { type: Date, required: true }, // Changed to Date to support full date strings
    paid: { type: Boolean, default: false },
    nextPaymentDate: Date
});

// --- Analytics Schema ---
const analyticsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    totalIncome: { type: Number, default: 0 },
    totalExpense: { type: Number, default: 0 },
    savings: { type: Number, default: 0 },
    financialScore: { type: Number, default: 0 }, // 0-100
    budgetAdherence: { type: Number, default: 0 }, // Percentage
    lastUpdated: { type: Date, default: Date.now }
});

// --- Family Schema ---
const familySchema = new mongoose.Schema({
    name: { type: String, required: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    inviteCode: { type: String, unique: true }
});

// Cascading Delete: When Family is deleted, cleanup
familySchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    console.log(`Cascading delete for family ${this._id}`);
    // Delete Family Goals
    await mongoose.model('Goal').deleteMany({ familyId: this._id });

    // Unlink Users
    await mongoose.model('User').updateMany(
        { familyId: this._id },
        { $unset: { familyId: "" } }
    );
    next();
});

// --- Notification Schema ---
const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['alert', 'info', 'success'], default: 'info' },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    date: { type: Date, default: Date.now }
});

// --- Goal Schema ---
const goalSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family' }, // Link to family if shared
    title: { type: String, required: true },
    targetAmount: { type: Number, required: true },
    savedAmount: { type: Number, default: 0 },
    deadline: Date,
    color: { type: String, default: '#4CAF50' }, // For UI
    completed: { type: Boolean, default: false },
    redeemed: { type: Boolean, default: false },
    isFamily: { type: Boolean, default: false }
});

// --- Recurring Transaction Schema ---
const recurringTransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], required: true },
    startDate: { type: Date, default: Date.now },
    nextRunDate: { type: Date, required: true },
    description: String,
    active: { type: Boolean, default: true }
});

const User = mongoose.model('User', userSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const Budget = mongoose.model('Budget', budgetSchema);
const Investment = mongoose.model('Investment', investmentSchema);
const EMI = mongoose.model('EMI', emiSchema);
const Analytics = mongoose.model('Analytics', analyticsSchema);
const Family = mongoose.model('Family', familySchema);
const Notification = mongoose.model('Notification', notificationSchema);
const Goal = mongoose.model('Goal', goalSchema);
const RecurringTransaction = mongoose.model('RecurringTransaction', recurringTransactionSchema);

module.exports = {
    User,
    Transaction,
    Budget,
    Investment,
    EMI,
    Analytics,
    Family,
    Notification,
    Goal,
    RecurringTransaction
};
