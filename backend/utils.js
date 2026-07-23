const jwt = require('jsonwebtoken');
const config = require('./config');
const nodemailer = require('nodemailer');
const { User, Transaction, Budget, Investment, EMI, Analytics, Family, Notification, RecurringTransaction } = require('./models');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const yahooFinance = require('yahoo-finance2').default;
const cron = require('node-cron');
const fs = require('fs');
const fsPromises = require('fs').promises;
const Tesseract = require('tesseract.js');
const Jimp = require('jimp');

// --- Configuration ---
const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;
let model = null;

if (apiKey) {
    try {
        genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        console.log("✨ Gemini AI Initialized");
    } catch (error) {
        console.error("Gemini Init Error:", error.message);
    }
} else {
    console.warn("⚠️ GEMINI_API_KEY is missing. AI features will be disabled.");
}

// --- Helper Functions ---

/**
 * Calculate User Balance (Total Income - Total Expense)
 */
const getBalance = async (userId) => {
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

// --- Generate JWT ---
const generateToken = (id) => {
    return jwt.sign({ id }, config.JWT_SECRET, {
        expiresIn: config.JWT_EXPIRE,
    });
};

// --- Email Helper ---
const sendEmail = async (options) => {
    // If no real credentials, fallback to mock to prevent crashes
    if (config.EMAIL_USER === 'test@example.com') {
        console.log(`[EMAIL MOCK] To: ${options.email}, Subject: ${options.subject}`);
        return true;
    }

    const transporter = nodemailer.createTransport({
        service: config.EMAIL_SERVICE,
        auth: {
            user: config.EMAIL_USER,
            pass: config.EMAIL_PASS,
        },
    });

    const message = {
        from: `${process.env.FROM_NAME || 'Finance Tracker'} <${config.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html, // Support HTML
        attachments: options.attachments // Support Attachments
    };

    try {
        const info = await transporter.sendMail(message);
        console.log('Email sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error("Email API Error:", error);
        return false;
    }
};

/**
 * Chat with the Finance AI
 */
const chatWithFinanceBot = async (userQuery, context) => {
    if (!model) return "I'm currently offline (API Key missing). Please check settings.";

    try {
        // Calculate "Potential Savings" (Income - Expense) to give context on ability to save
        // even if goal.savedAmount is 0.
        const availableSavings = context.totalIncome - context.totalExpense;

        const prompt = `
            You are "FinBot", a smart, encouraging, and strategic Financial Advisor.
            Your goal is to help the user achieve financial freedom with positive reinforcement and clear, actionable steps.

            === USER CONTEXT ===
            Currency: ${context.currency}
            
            1. 💰 **Cash Flow**:
               - Monthly Income: ${context.totalIncome}
               - Monthly Expense: ${context.totalExpense}
               - Available Surplus (Potential Savings): ${availableSavings}
               - Net Savings: ${context.savings} (Saved ${((context.savings / context.totalIncome) * 100).toFixed(1)}% of income)

            2. 📊 **Recent Transactions**:
               ${JSON.stringify(context.recentTransactions)}

            3. 📉 **Budgets**:
               ${JSON.stringify(context.budgets)}

            4. 🚀 **Wealth**:
               - Total Invested: ${context.totalInvestment}
               - Net Worth: ${context.netWorth}
               - Portfolio: ${JSON.stringify(context.investments)}

            5. 🎯 **Goals**:
               ${JSON.stringify(context.goals)}
               *Note: 'saved' amount in goals is manual. If a goal has $0 saved but User has 'Available Surplus', advise them to allocate funds!*

            6. 💳 **Liabilities**:
               - active Loans: ${JSON.stringify(context.loans)}
               - Subscriptions: ${JSON.stringify(context.recurring)}

            === USER QUERY ===
            "${userQuery}"

            === INSTRUCTIONS ===
            1.  **Be Encouraging but Real**: If they are behind, say "We can fix this!" instead of just pointing out the failure.
            2.  **Specific Action**: Give 1 concrete step (e.g., "Move $50 to your Vacation goal today").
            3.  **Tone**: Professional, friendly, and motivating.
            4.  **Formatting**: 
                - Use **bold** for key numbers.
                - Keep it under 4 sentences.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("AI Chat Error Details:", JSON.stringify(error, null, 2));
        return "I'm having trouble connecting to the AI brain right now. You can check the logs for more info.";
    }
};

/**
 * Helper to encode file to base64 for Gemini
 */
function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(path)).toString("base64"),
            mimeType
        },
    };
}

/**
 * Analyze a receipt image and extract details (OCR)
 */
const analyzeReceipt = async (imagePath, mimeType) => {
    if (!model) throw new Error("AI Service Unavailable");

    try {
        const prompt = `
            Analyze this receipt image. Extract the following details in JSON format:
            {
                "merchant": "Name of store/merchant",
                "date": "YYYY-MM-DD",
                "amount": 0.00 (number),
                "category": "Best fitting category like Food, Transport, Shopping, etc."
            }
            Return ONLY the JSON.
        `;
        const imagePart = fileToGenerativePart(imagePath, mimeType);
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (error) {
        console.error("AI Receipt Error:", error);
        throw new Error("Failed to analyze receipt");
    }
};

/**
 * Analyze a bank statement image and extract transactions (OCR using Tesseract.js)
 */
const analyzeBankStatement = async (imagePath, mimeType) => {
    try {
        console.log(`Starting OCR on ${imagePath}...`);

        // 1. Pre-process Image with Jimp for better OCR
        const image = await Jimp.read(imagePath);

        // Greyscale + Contrast + Resize (upscale for better text recognition)
        image.greyscale().contrast(1).scale(2);

        const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

        // 2. Perform OCR
        const { data: { text } } = await Tesseract.recognize(processedBuffer, 'eng', {
            logger: m => console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
        });

        console.log("OCR Complete. Raw Text Length:", text.length);
        // console.log("Raw Text Sample:", text.substring(0, 500)); 

        // 3. Parse the raw text to find transactions
        const transactions = parseOCRText(text);

        return transactions;
    } catch (error) {
        console.error("OCR Error:", error);
        throw new Error("Failed to extract data from statement. Ensure the image is clear.");
    }
};

/**
 * Heuristic Parser for OCR Text
 * Looks for lines with Date ... Amount patterns
 */
const parseOCRText = (text) => {
    const lines = text.split(/\r?\n/);
    const transactions = [];

    // Improved Regex for Dates
    // Matches: 25/12/2023, 25-12-23, 2023-12-25, 25 Dec 2023, 25 DEC
    const dateRegex = /(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4})|(\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})|(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(\s+\d{2,4})?)/i;

    // Improved Regex for Amounts
    // Matches: 1,234.56 or 1234.00 or 1,234.56Cr or 1234.56 Dr
    // Captures: (Number) (Cr/Dr/suffix)
    const amountRegex = /([\d,]+\.?\d{2})\s*(Cr|Dr|Credit|Debit)?\s*$/i;

    for (const line of lines) {
        let trimmed = line.trim();
        // Remove common noise characters
        trimmed = trimmed.replace(/[|\[\]{}*]/g, '');

        if (!trimmed) continue;
        if (trimmed.length < 10) continue; // Skip very short lines

        // 1. Check for Date
        const dateMatch = trimmed.match(dateRegex);
        if (!dateMatch) continue;

        // 2. Check for Amount
        const amountMatch = trimmed.match(amountRegex);
        if (!amountMatch) continue;

        const dateStr = dateMatch[0];
        const amountStr = amountMatch[1];
        const typeMarker = amountMatch[2];

        // 3. Extract Description
        // Everything between Date and Amount
        let description = trimmed
            .replace(dateStr, '')
            .replace(amountMatch[0], '') // Use full match to remove amount + suffix
            .trim();

        // Cleanup description
        description = description.replace(/^[-\/.,:;\s]+|[-\/.,:;\s]+$/g, '');
        if (description.length < 2) description = "Transaction";

        // 4. Parse Date
        const stdDate = parseDate(dateStr);

        // 5. Parse Amount
        let amount = parseFloat(amountStr.replace(/,/g, ''));
        if (isNaN(amount)) continue;

        // 6. Determine Type
        let type = 'expense';
        if (typeMarker) {
            const marker = typeMarker.toLowerCase();
            if (marker.includes('cr') || marker.includes('credit')) type = 'income';
        }

        // Keywords Override
        if (/credit|deposit|received|refund|salary/i.test(description)) type = 'income';
        if (/debit|withdrawal|spent/i.test(description)) type = 'expense';

        transactions.push({
            date: stdDate,
            description: description,
            amount: amount,
            type: type,
            category: "Uncategorized"
        });
    }

    return transactions;
};

const parseDate = (dateStr) => {
    try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        return new Date().toISOString().split('T')[0];
    } catch (e) {
        return new Date().toISOString().split('T')[0];
    }
};

/**
 * Parse Natural Language/Voice Command to Transaction JSON
 */
const parseVoiceCommand = async (command, currency = 'USD') => {
    if (!model) throw new Error("AI Service Unavailable");

    try {
        const prompt = `
            Parse this natural language financial command into a structured JSON transaction object.
            
            Command: "${command}"
            Currency Context: ${currency}
            Today's Date: ${new Date().toISOString().split('T')[0]}

            RULES:
            1. **Intelligent Category Inference**: If not specified, guess the category based on context (e.g., "Starbucks" -> "Food", "Uber" -> "Transport").
            2. **Complex Dates**: Handle "yesterday", "last friday", "25th of last month".
            3. **Multi-Step**: If the user says "spent 50 on food and 20 on taxi", return the *first* or *most significant* transaction only (limitation). *Better*: If you can, prioritize the largest amount.

            Output JSON Schema:
            {
                "type": "income" | "expense",
                "amount": number,
                "category": "Food" | "Transport" | "Housing" | "Entertainment" | "Utilities" | "Shopping" | "Health" | "Education" | "Salary" | "Investment" | "Other",
                "description": "Short, clear description (e.g. 'McDonalds Lunch', 'Uber to Work')",
                "date": "YYYY-MM-DD"
            }
            Return ONLY the valid JSON object. No Markdown.
            Return ONLY the JSON.
        `;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (error) {
        console.error("AI Voice Command Error:", error);
        throw new Error("Failed to parse command");
    }
};

/**
 * Detect Subscriptions from Transaction History
 */
const detectSubscriptions = async (transactions) => {
    if (!model) return [];

    try {
        const prompt = `
            Analyze this transaction history to find *recurring* payment patterns that look like subscriptions.
            Transactions: ${JSON.stringify(transactions.slice(0, 50))} 
            
            Rules:
            - Look for repeated merchants (e.g. Netflix, Spotify, AWS, Gym).
            - Look for regular intervals (roughly same day each month).
            - Ignore one-off purchases (like grocery or random shopping).
            - **Confidence Threshold**: Only list if you are >80% sure.

            Return a JSON array:
            [
                {
                    "name": "Subscription Name (Capitalized)",
                    "amount": 0.00,
                    "frequency": "monthly" | "yearly" | "weekly"
                }
            ]
            Return ONLY the JSON array. If none, return [].
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (error) {
        console.error("AI Subscription Detect Error:", error);
        return [];
    }
};

// Predict future income/expenses based on history (Simple Linear Regression / Moving Average)
const predictFinancials = (transactions) => {
    if (!transactions || transactions.length === 0) {
        return {
            predictedIncomeNextMonth: 0,
            predictedExpenseNextMonth: 0,
            suggestion: "Start adding transactions to get AI predictions."
        };
    }

    // Group by month
    const monthlyStats = {};
    transactions.forEach(t => {
        const date = new Date(t.date);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        if (!monthlyStats[key]) monthlyStats[key] = { income: 0, expense: 0 };
        if (t.type === 'income') monthlyStats[key].income += t.amount;
        if (t.type === 'expense') monthlyStats[key].expense += t.amount;
    });

    const months = Object.keys(monthlyStats).sort();
    if (months.length < 2) {
        const lastMonth = monthlyStats[months[0]];
        return {
            predictedIncomeNextMonth: Math.round(lastMonth.income),
            predictedExpenseNextMonth: Math.round(lastMonth.expense),
            suggestion: "Keep tracking! We need more data for accurate predictions."
        };
    }

    // Calculate average growth/decline
    let totalIncomeChange = 0;
    let totalExpenseChange = 0;
    let count = 0;

    for (let i = 1; i < months.length; i++) {
        const prev = monthlyStats[months[i - 1]];
        const curr = monthlyStats[months[i]];
        totalIncomeChange += (curr.income - prev.income);
        totalExpenseChange += (curr.expense - prev.expense);
        count++;
    }

    const avgIncomeChange = totalIncomeChange / count;
    const avgExpenseChange = totalExpenseChange / count;

    const lastMonthStats = monthlyStats[months[months.length - 1]];
    const predictedIncome = Math.max(0, lastMonthStats.income + avgIncomeChange);
    const predictedExpense = Math.max(0, lastMonthStats.expense + avgExpenseChange);

    let suggestion = "";
    if (predictedExpense > predictedIncome) {
        suggestion = "Warning: Your predicted expenses might exceed your income next month. Review your budget.";
    } else if (predictedIncome - predictedExpense > 1000) {
        suggestion = "Great! You are projected to have significant savings next month. Consider investing.";
    } else {
        suggestion = "You are on track. Maintain your current spending habits.";
    }

    return {
        predictedIncomeNextMonth: Math.round(predictedIncome),
        predictedExpenseNextMonth: Math.round(predictedExpense),
        suggestion
    };
};

// Auto-categorize transaction based on description
const autoCategorize = (description) => {
    const desc = description.toLowerCase();
    const categories = {
        'Food': ['grocery', 'food', 'restaurant', 'cafe', 'dinner', 'lunch', 'breakfast', 'snack', 'pizza', 'burger', 'coffee'],
        'Transport': ['uber', 'fuel', 'bus', 'train', 'metro', 'taxi', 'cab', 'flight', 'airline', 'parking', 'gas'],
        'Entertainment': ['netflix', 'spotify', 'movie', 'cinema', 'game', 'concert', 'event', 'hulu', 'prime', 'disney'],
        'Utilities': ['electricity', 'water', 'bill', 'internet', 'wifi', 'phone', 'mobile', 'recharge', 'broadband'],
        'Shopping': ['amazon', 'flipkart', 'myntra', 'clothes', 'shoe', 'electronics', 'mall', 'store'],
        'Health': ['doctor', 'hospital', 'medicine', 'pharmacy', 'gym', 'fitness', 'yoga'],
        'Education': ['course', 'book', 'udemy', 'coursera', 'school', 'college', 'tuition', 'fee'],
        'Rent': ['rent', 'house', 'apartment'],
        'Income': ['salary', 'freelance', 'bonus', 'interest', 'dividend', 'refund']
    };
    for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => desc.includes(keyword))) {
            return category;
        }
    }
    return 'Uncategorized';
};

// Detect fraud/anomalies
const detectFraud = (amount, transactions) => {
    if (!transactions || transactions.length < 5) return false;
    const expenses = transactions.filter(t => t.type === 'expense').map(t => t.amount);
    if (expenses.length === 0) return false;
    const mean = expenses.reduce((a, b) => a + b, 0) / expenses.length;
    return amount > mean * 5; // Simplified
};

// ... predictFinancials and other utils remain ...

// ...

// ... 

// --- Stocks / Crypto ---

const getStockPrice = async (symbol) => {
    try {
        const quote = await yahooFinance.quote(symbol, { modules: ['price'] });
        if (!quote) throw new Error("No data found");
        return {
            symbol: quote.symbol,
            price: quote.regularMarketPrice,
            currency: quote.currency,
            change: quote.regularMarketChangePercent
        };
    } catch (error) {
        console.error(`Error fetching stock ${symbol}:`, error.message);
        throw new Error("Failed to fetch stock data");
    }
};

const searchSymbol = async (query) => {
    try {
        // Attempt to use yahooFinance first
        const result = await yahooFinance.search(query);
        if (result.quotes && result.quotes.length > 0) {
            return result.quotes
                .filter(q => q.isYahooFinance !== false) // Filter invalid quotes
                .map(q => ({
                    symbol: q.symbol,
                    name: q.shortname || q.longname || q.symbol,
                    type: q.quoteType,
                    exchDisp: q.exchDisp // Exchange display name
                }));
        }
    } catch (error) {
        console.warn("Yahoo Finance Search Error (Enhancement Fallback):", error.message);
    }

    // Fallback: Return dummy suggestions for common tickers if API fails
    // This ensures "Search Stock Symbol" works even if API is flaky
    const commonTickers = [
        { symbol: "AAPL", name: "Apple Inc.", type: "EQUITY", exchDisp: "NASDAQ" },
        { symbol: "MSFT", name: "Microsoft Corporation", type: "EQUITY", exchDisp: "NASDAQ" },
        { symbol: "GOOGL", name: "Alphabet Inc.", type: "EQUITY", exchDisp: "NASDAQ" },
        { symbol: "AMZN", name: "Amazon.com Inc.", type: "EQUITY", exchDisp: "NASDAQ" },
        { symbol: "TSLA", name: "Tesla Inc.", type: "EQUITY", exchDisp: "NASDAQ" },
        { symbol: "BTC-USD", name: "Bitcoin USD", type: "CRYPTOCURRENCY", exchDisp: "CCY" },
        { symbol: "ETH-USD", name: "Ethereum USD", type: "CRYPTOCURRENCY", exchDisp: "CCY" },
    ];

    return commonTickers.filter(t =>
        t.symbol.toLowerCase().includes(query.toLowerCase()) ||
        t.name.toLowerCase().includes(query.toLowerCase())
    );
};

// Simple Currency Converter (Base: INR)
// Rates as of User Request: 1 USD = 90.06 INR
const convertCurrency = (amount, fromCurrency, toCurrency) => {
    // Rates relative to INR (base)
    // 1 USD = 90.06 INR
    // 1 EUR = 97.50 INR (approx)
    // 1 GBP = 114.00 INR (approx)
    // 1 JPY = 0.60 INR (approx)
    const ratesToINR = {
        'INR': 1,
        'USD': 90.06,
        'EUR': 97.50,
        'GBP': 114.00,
        'JPY': 0.60
    };

    const fromRate = ratesToINR[fromCurrency] || 1; // Default to 1 if unknown (e.g. INR to INR)
    const toRate = ratesToINR[toCurrency] || 1;

    // Convert FROM currency TO INR (Base)
    const amountInINR = amount * fromRate;

    // Convert FROM INR (Base) TO Target Currency
    // If target is USD, we divide by 90.06
    return amountInINR / toRate;
};

const getStockRecommendations = async () => {
    // Fallback static recommendations
    return [
        { symbol: "AAPL", name: "Apple Inc.", reason: "Strong tech leader with consistent growth.", risk: "Medium" },
        { symbol: "VOO", name: "Vanguard S&P 500 ETF", reason: "Diversified exposure to the US market.", risk: "Low" },
        { symbol: "BTC-USD", name: "Bitcoin", reason: "High potential return digital asset.", risk: "High" },
        { symbol: "NVDA", name: "NVIDIA Corp", reason: "AI sector dominant player.", risk: "High" }
    ];
};

// --- Recurring Transactions Logic ---
const processDueRecurringTransactions = async (userId = null) => {
    console.log(`Processing Recurring Transactions${userId ? ` for user ${userId}` : ' for ALL users'}...`);
    try {
        const today = new Date();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        const query = {
            nextRunDate: { $lte: endOfDay },
            active: true
        };
        if (userId) query.userId = userId;

        const dueTransactions = await RecurringTransaction.find(query);

        console.log(`Found ${dueTransactions.length} due transactions.`);

        for (const recurring of dueTransactions) {
            // Check Balance for Expenses (Strict Enforcement)
            if (recurring.type === 'expense') {
                const currentBalance = await getBalance(recurring.userId);
                if (currentBalance < recurring.amount) {
                    console.log(`Recurring transaction ${recurring.category} skipped due to insufficient funds.`);
                    await Notification.create({
                        userId: recurring.userId,
                        type: 'alert',
                        message: `Failed to process recurring ${recurring.category} of ${recurring.amount}: Insufficient Balance.`
                    });

                    // Reschedule for next day to retry? Or just skip to next cycle?
                    // Strategy: Retry tomorrow.
                    const retryDate = new Date();
                    retryDate.setDate(retryDate.getDate() + 1);
                    recurring.nextRunDate = retryDate;
                    await recurring.save();
                    continue; // Skip creation
                }
            }

            await Transaction.create({
                userId: recurring.userId,
                type: recurring.type,
                category: recurring.category,
                amount: recurring.amount,
                description: `Recurring: ${recurring.description || recurring.category}`,
                date: new Date(),
                autoCategorized: false
            });

            let nextRun = new Date(recurring.nextRunDate);
            while (nextRun <= new Date()) {
                if (recurring.frequency === 'daily') nextRun.setDate(nextRun.getDate() + 1);
                if (recurring.frequency === 'weekly') nextRun.setDate(nextRun.getDate() + 7);
                if (recurring.frequency === 'monthly') nextRun.setMonth(nextRun.getMonth() + 1);
                if (recurring.frequency === 'yearly') nextRun.setFullYear(nextRun.getFullYear() + 1);
            }
            recurring.nextRunDate = nextRun;
            await recurring.save();

            await Notification.create({
                userId: recurring.userId,
                type: 'info',
                message: `Auto-processed recurring transaction: ${recurring.category}`
            });
        }
    } catch (error) {
        console.error('Error in Recurring Transaction Processing:', error);
    }
};

// --- Cron Jobs for Recurring Transactions ---
const initCronJobs = () => {
    // Run everyday at Midnight (00:00) for Recurring Transactions
    cron.schedule('0 0 * * *', async () => {
        await processDueRecurringTransactions();
    });

    // Run everyday at 9:00 AM for Daily Briefing & Engagement
    cron.schedule('0 9 * * *', async () => {
        console.log("☀️ Sending Daily Briefing...");
        try {
            const users = await User.find({});
            for (const user of users) {
                // Get yesterday's expense
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                yesterday.setHours(0, 0, 0, 0);
                const endYesterday = new Date(yesterday);
                endYesterday.setHours(23, 59, 59, 999);

                const yesterdayTx = await Transaction.aggregate([
                    { $match: { userId: user._id, type: 'expense', date: { $gte: yesterday, $lte: endYesterday } } },
                    { $group: { _id: null, total: { $sum: "$amount" } } }
                ]);

                const spentYesterday = yesterdayTx[0]?.total || 0;

                if (spentYesterday > 0) {
                    await Notification.create({
                        userId: user._id,
                        type: 'info',
                        message: `☀️ Morning Brief: You spent ${user.currency === 'INR' ? '₹' : '$'}${spentYesterday} yesterday. stay on track today!`,
                        date: new Date()
                    });
                } else if (user.streaks > 3) {
                    await Notification.create({
                        userId: user._id,
                        type: 'success',
                        message: `🔥 You're on a ${user.streaks}-day streak! Log a transaction today to keep it going.`,
                        date: new Date()
                    });
                }
            }
            console.log("✅ Daily Briefing Sent.");
        } catch (error) {
            console.error("Daily Briefing Error:", error);
        }
    });

    console.log('Cron Jobs Initialized.');
};

// --- Seeder Function & Misc ---
const seedDatabase = async () => {
    const mongoose = require('mongoose');
    try {
        await mongoose.connect(config.MONGO_URI);
        console.log('MongoDB Connected for Seeding...');

        // Clear existing data
        await User.deleteMany();
        await Transaction.deleteMany();
        await Budget.deleteMany();
        await Investment.deleteMany();
        await EMI.deleteMany();
        // Removed Resource.deleteMany()

        console.log('Old Data Cleared.');

        // Create Users
        const adminUser = await User.create({
            name: 'Admin User',
            email: 'admin@example.com',
            password: 'password123',
            role: 'admin'
        });

        const regularUser = await User.create({
            name: 'John Doe',
            email: 'john@example.com',
            password: 'password123',
            role: 'user',
            profileInfo: { age: 30, occupation: 'Engineer', financialGoals: ['Buy House', 'Retire Early'] }
        });

        console.log('Users Created.');

        // Create Transactions
        await Transaction.create([
            { userId: regularUser._id, type: 'income', category: 'Salary', amount: 5000, description: 'Monthly Salary', autoCategorized: true },
            { userId: regularUser._id, type: 'expense', category: 'Food', amount: 150, description: 'Grocery Store', autoCategorized: true },
            { userId: regularUser._id, type: 'expense', category: 'Transport', amount: 45, description: 'Uber Ride', autoCategorized: true },
        ]);

        // Create Budgets
        await Budget.create({
            userId: regularUser._id,
            category: 'Food',
            limit: 500,
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear()
        });

        // Create Investments
        await Investment.create({
            userId: regularUser._id,
            type: 'stocks',
            name: 'AAPL',
            amount: 1500,
            risk: 'high'
        });

        // Removed Resource creation

        console.log('Data Imported Successfully!');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const checkStreak = async (user) => {
    const today = new Date();
    const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
    if (lastLogin) {
        const diffTime = Math.abs(today - lastLogin);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) user.streaks += 1;
        else if (diffDays > 1) user.streaks = 1;
    } else {
        user.streaks = 1;
    }
    user.lastLogin = today;
    await user.save();
};

module.exports = {
    generateToken,
    sendEmail,
    predictFinancials,
    autoCategorize,
    detectFraud,
    // recommendResources removed
    seedDatabase,
    checkStreak,
    chatWithFinanceBot,
    analyzeReceipt,
    analyzeBankStatement,
    getStockPrice,
    searchSymbol,
    getStockRecommendations,
    convertCurrency,
    initCronJobs,
    processDueRecurringTransactions,
    getBalance,
    parseVoiceCommand,
    detectSubscriptions
};
