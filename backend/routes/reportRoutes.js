const express = require('express');
const router = express.Router();
const { protect } = require('../middleware');
const { Transaction } = require('../models');

// @desc    Export transactions as CSV
// @route   GET /api/reports/export
router.get('/export', protect, async (req, res) => {
    const transactions = await Transaction.find({ userId: req.user._id }).sort({ date: -1 });

    const fields = ['date', 'type', 'category', 'amount', 'description'];
    const csvHeader = fields.join(',') + '\n';
    const csvBody = transactions.map(t => {
        return fields.map(field => {
            if (field === 'date') return t[field].toISOString().split('T')[0];
            return `"${t[field]}"`;
        }).join(',');
    }).join('\n');

    const csvContent = csvHeader + csvBody;

    res.header('Content-Type', 'text/csv');
    res.attachment('transactions.csv');
    res.send(csvContent);
});

const { generateFinancialReportPDF } = require('../reportGenerator');
const { sendEmail, getBalance } = require('../utils');
const dayjs = require('dayjs');

// @desc    Download Financial Report as PDF
// @route   GET /api/reports/download-pdf
router.get('/download-pdf', protect, async (req, res) => {
    try {
        const { startDate, endDate } = req.query; // Optional filters

        const query = { userId: req.user._id };
        if (startDate && endDate) {
            query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        } else {
            // Default to current month
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            query.date = { $gte: startOfMonth };
        }

        const transactions = await Transaction.find(query).sort({ date: -1 });

        // Calculate Summary Stats
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        const savings = totalIncome - totalExpense;

        const reportData = {
            transactions,
            summary: {
                totalIncome,
                totalExpense,
                savings,
                currency: req.user.currency || 'INR',
                financialScore: req.user.profileInfo?.financialScore || 75 // Placeholder if not calc
            },
            period: startDate ? `${dayjs(startDate).format('MMM DD, YYYY')} - ${dayjs(endDate).format('MMM DD, YYYY')}` : dayjs().format('MMMM YYYY')
        };

        const pdfBuffer = await generateFinancialReportPDF(req.user, reportData);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=Finance_Report_${Date.now()}.pdf`,
            'Content-Length': pdfBuffer.length
        });

        res.send(pdfBuffer);
    } catch (error) {
        console.error("PDF Generation Error:", error);
        res.status(500).json({ message: "Failed to generate PDF report" });
    }
});

// @desc    Email Financial Report PDF
// @route   POST /api/reports/email-report
router.post('/email-report', protect, async (req, res) => {
    try {
        const { startDate, endDate, targetEmail: customEmail, email } = req.body;
        const targetEmail = email || customEmail || req.user.email;

        // Date Range Logic
        const query = { userId: req.user._id };
        if (startDate && endDate) {
            query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        } else {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            query.date = { $gte: startOfMonth };
        }

        // Fetch Data
        const transactions = await Transaction.find(query).sort({ date: -1 });
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        const savings = totalIncome - totalExpense;

        // Prepare Report Data
        const reportData = {
            transactions,
            summary: {
                totalIncome,
                totalExpense,
                savings,
                currency: req.user.currency || 'INR',
                financialScore: 80
            },
            period: startDate ? `${dayjs(startDate).format('MMM DD, YYYY')} - ${dayjs(endDate).format('MMM DD, YYYY')}` : dayjs().format('MMMM YYYY')
        };

        // Generate PDF
        const pdfBuffer = await generateFinancialReportPDF(req.user, reportData);

        // Send Email using updated utils.js sendEmail with attachment
        const emailSent = await sendEmail({
            email: targetEmail,
            subject: `Your Financial Report - ${reportData.period}`,
            message: `Please find attached your financial report for ${reportData.period}.`,
            attachments: [
                {
                    filename: `Finance_Report_${dayjs().format('YYYY-MM')}.pdf`,
                    content: pdfBuffer
                }
            ]
        });

        if (emailSent) {
            res.json({ message: `Report sent successfully to ${targetEmail}` });
        } else {
            res.status(500).json({ message: "Failed to send email. Check server logs." });
        }

    } catch (error) {
        console.error("Email Report Error:", error);
        res.status(500).json({ message: "Failed to email report" });
    }
});

module.exports = router;
