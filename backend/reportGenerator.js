const PDFDocument = require('pdfkit');
const dayjs = require('dayjs');

/**
 * Generates a PDF report for a user's financial data.
 * @param {Object} userData - User details (name, email)
 * @param {Object} reportData - Object containing { transactions, summary, period }
 * @returns {Buffer} PDF Buffer
 */
const generateFinancialReportPDF = (userData, reportData) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 40, bufferPages: true, size: 'A4', layout: 'portrait' });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));

            // --- Theme Constants ---
            const THEME = {
                primary: '#4338ca',    // Indigo-700
                primaryLight: '#4f46e5', // Indigo-600
                secondary: '#334155',  // Slate-700
                accent: '#10b981',     // Emerald-500
                danger: '#ef4444',     // Red-500
                textMain: '#1e293b',   // Slate-800
                textLight: '#64748b',  // Slate-500
                bgLight: '#f8fafc',    // Slate-50
                bgDark: '#0f172a',     // Slate-900
                border: '#e2e8f0'      // Slate-200
            };

            const MARGIN = 40;
            const WIDTH = doc.page.width - (MARGIN * 2);

            // --- Helpers ---
            const formatMoney = (amount) => {
                const currency = reportData.summary.currency || 'USD';
                return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            };

            const drawDivider = (y) => {
                doc.moveTo(MARGIN, y).lineTo(doc.page.width - MARGIN, y).strokeColor(THEME.border).lineWidth(1).stroke();
            };

            // --- 1. Header Section (Premium Dark) ---
            doc.rect(0, 0, doc.page.width, 160).fill(THEME.bgDark);

            // Decorative Accent Line
            doc.rect(0, 0, doc.page.width, 6).fill(THEME.accent);

            // Logo Text
            doc.font('Helvetica-Bold').fontSize(24).fillColor('#FFFFFF').text('Financial Access', MARGIN, 50);
            doc.font('Helvetica').fontSize(10).fillColor('#94a3b8').text('ADVANCED ANALYTICS SUITE', MARGIN, 80, { characterSpacing: 2 });

            // Report Info Box (Right Aligned)
            const infoBoxX = doc.page.width - 240;
            doc.roundedRect(infoBoxX, 40, 200, 90, 8).fill('#1e293b');

            doc.fillColor('#94a3b8').fontSize(9).text('REPORT PERIOD', infoBoxX + 15, 55);
            doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold').text(reportData.period, infoBoxX + 15, 70);

            doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text('PREPARED FOR', infoBoxX + 15, 95);
            doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold').text(userData.name || 'Valued User', infoBoxX + 15, 110);


            // --- 2. Executive Summary (KPI Cards) ---
            let yPos = 190;
            doc.font('Helvetica-Bold').fontSize(16).fillColor(THEME.textMain).text('Executive Summary', MARGIN, yPos);
            yPos += 30;

            const cardCount = 4;
            const gap = 15;
            const cardWidth = (WIDTH - ((cardCount - 1) * gap)) / cardCount;
            const cardHeight = 80;

            const kpis = [
                { label: 'Total Income', value: reportData.summary.totalIncome, color: THEME.accent },
                { label: 'Total Expenses', value: reportData.summary.totalExpense, color: THEME.danger },
                { label: 'Net Savings', value: reportData.summary.savings, color: reportData.summary.savings >= 0 ? THEME.primary : THEME.danger },
                { label: 'Avg. Daily Spend', value: reportData.summary.totalExpense / 30, color: THEME.textMain } // approx
            ];

            kpis.forEach((kpi, index) => {
                const x = MARGIN + (index * (cardWidth + gap));

                // Card Bg
                doc.roundedRect(x, yPos, cardWidth, cardHeight, 8).fill(THEME.bgLight);
                doc.roundedRect(x, yPos, cardWidth, cardHeight, 8).strokeColor(THEME.border).lineWidth(1).stroke();

                // Top Line Accent
                doc.path(`M ${x} ${yPos} L ${x + cardWidth} ${yPos}`).strokeColor(kpi.color).lineWidth(4).stroke();

                // Content
                doc.fillColor(THEME.textLight).fontSize(8).font('Helvetica-Bold').text(kpi.label.toUpperCase(), x + 10, yPos + 15);
                doc.fillColor(THEME.textMain).fontSize(13).font('Helvetica-Bold').text(formatMoney(kpi.value).replace('USD ', '$'), x + 10, yPos + 35);

                if (index === 2) {
                    const savingsRate = reportData.summary.totalIncome > 0 ? ((kpi.value / reportData.summary.totalIncome) * 100).toFixed(0) : 0;
                    doc.fontSize(9).fillColor(kpi.value >= 0 ? THEME.accent : THEME.danger).text(`${savingsRate}% Rate`, x + 10, yPos + 60);
                }
            });

            yPos += 110;

            // --- 3. Spending Analysis (Visual Charts) ---

            // Calculate Top Categories
            const expenses = reportData.transactions.filter(t => t.type === 'expense');
            const categoryMap = {};
            expenses.forEach(t => {
                // Ensure category exists
                const cat = t.category || 'Uncategorized';
                categoryMap[cat] = (categoryMap[cat] || 0) + t.amount;
            });
            const sortedCategories = Object.entries(categoryMap)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5); // Start with top 5

            // Two Columns: Chart & Info
            const col1Width = WIDTH * 0.6;
            const col2X = MARGIN + col1Width + 30;

            doc.font('Helvetica-Bold').fontSize(14).fillColor(THEME.textMain).text('Top Spending Categories', MARGIN, yPos);
            yPos += 25;

            const chartStartY = yPos;
            const maxVal = sortedCategories.length > 0 ? sortedCategories[0].value : 1;

            sortedCategories.forEach((cat, i) => {
                const barHeight = 25;
                const barY = yPos + (i * 45);

                // Label
                doc.fontSize(10).fillColor(THEME.textMain).font('Helvetica').text(cat.name, MARGIN, barY - 12);

                // Value Label (Right aligned to bar end area)
                const pct = ((cat.value / reportData.summary.totalExpense) * 100).toFixed(1);
                doc.fontSize(10).font('Helvetica-Bold').text(`${formatMoney(cat.value)} (${pct}%)`, MARGIN + col1Width - 100, barY - 12, { width: 100, align: 'right' });

                // Background Track
                doc.roundedRect(MARGIN, barY, col1Width, 8, 4).fill(THEME.bgLight);

                // Foreground Bar
                const barWidth = (cat.value / maxVal) * col1Width;
                doc.roundedRect(MARGIN, barY, Math.max(barWidth, 5), 8, 4).fill(THEME.primaryLight);
            });

            // Right Column: Financial Health
            const healthScore = reportData.summary.financialScore || 0;
            doc.font('Helvetica-Bold').fontSize(14).fillColor(THEME.textMain).text('Financial Health', col2X, chartStartY - 25);

            // Score Display
            const circleCenterY = chartStartY + 60;
            const circleCenterX = col2X + 60;

            // Outer Ring
            doc.lineWidth(8).strokeColor(THEME.bgLight)
                .circle(circleCenterX, circleCenterY, 40).stroke();

            // Score Ring
            // We can't do partial arcs easily in standard pdfkit without paths, but we can color the whole circle for now 
            // or just use text representation to be safe and clean.
            doc.lineWidth(8).strokeColor(healthScore > 70 ? THEME.accent : (healthScore > 40 ? '#f59e0b' : THEME.danger))
                .circle(circleCenterX, circleCenterY, 40).stroke();

            doc.fillColor(THEME.textMain).fontSize(20).font('Helvetica-Bold').text(healthScore, circleCenterX - 20, circleCenterY - 8, { width: 40, align: 'center' });
            doc.fillColor(THEME.textLight).fontSize(9).font('Helvetica').text('SCORE', circleCenterX - 20, circleCenterY + 15, { width: 40, align: 'center' });

            // Insights Text
            doc.fontSize(10).fillColor(THEME.textLight).text(
                `Your financial health is ${healthScore > 70 ? 'Excellent' : 'Fair'}. You have saved ${((reportData.summary.savings / reportData.summary.totalIncome) * 100).toFixed(0)}% of your income this period.`,
                col2X, circleCenterY + 60, { width: (WIDTH - col1Width - 30), align: 'left' }
            );


            yPos += (sortedCategories.length * 45) + 40;


            // --- 4. Transaction Ledger ---
            doc.addPage();
            doc.rect(0, 0, doc.page.width, 20).fill(THEME.primary); // Mini header strip

            let tableY = 60;
            doc.font('Helvetica-Bold').fontSize(16).fillColor(THEME.textMain).text('Detailed Transactions', MARGIN, tableY);
            tableY += 30;

            // Table Header
            const cols = [
                { id: 'date', label: 'DATE', width: 80, x: MARGIN },
                { id: 'desc', label: 'DESCRIPTION', width: 220, x: MARGIN + 80 },
                { id: 'cat', label: 'CATEGORY', width: 100, x: MARGIN + 300 },
                { id: 'type', label: 'TYPE', width: 60, x: MARGIN + 400 },
                { id: 'amt', label: 'AMOUNT', width: 90, x: MARGIN + 460, align: 'right' }
            ];

            // Header Row BG
            doc.roundedRect(MARGIN, tableY, WIDTH, 24, 4).fill(THEME.bgLight);

            cols.forEach(col => {
                doc.fillColor(THEME.textLight).fontSize(8).font('Helvetica-Bold')
                    .text(col.label, col.x + 5, tableY + 8, { width: col.width, align: col.align || 'left' });
            });

            tableY += 35;

            // Rows
            if (reportData.transactions.length === 0) {
                doc.font('Helvetica-Oblique').fontSize(10).fillColor(THEME.textLight)
                    .text('No transactions found.', MARGIN, tableY);
            } else {
                doc.font('Helvetica').fontSize(9);

                reportData.transactions.forEach((tx, i) => {
                    // Page Break Logic
                    if (tableY > doc.page.height - 60) {
                        doc.addPage();
                        tableY = 50;
                        // Reprint Header
                        doc.roundedRect(MARGIN, tableY, WIDTH, 24, 4).fill(THEME.bgLight);
                        cols.forEach(col => {
                            doc.fillColor(THEME.textLight).fontSize(8).font('Helvetica-Bold')
                                .text(col.label, col.x + 5, tableY + 8, { width: col.width, align: col.align || 'left' });
                        });
                        tableY += 35;
                        doc.font('Helvetica').fontSize(9);
                    }

                    const isIncome = tx.type === 'income';
                    const amountColor = isIncome ? THEME.accent : THEME.textMain;

                    // Row Line
                    doc.moveTo(MARGIN, tableY + 15).lineTo(doc.page.width - MARGIN, tableY + 15).strokeColor(THEME.border).lineWidth(0.5).stroke();

                    doc.fillColor(THEME.textMain).text(dayjs(tx.date).format('MMM DD, YYYY'), cols[0].x + 5, tableY);
                    doc.text(tx.description, cols[1].x + 5, tableY, { width: cols[1].width - 10, ellipsis: true });

                    // Category Badge
                    // doc.roundedRect(cols[2].x, tableY - 2, 80, 14, 7).fill(THEME.bgLight); // Badge bg
                    doc.fillColor(THEME.textLight).text(tx.category || 'Other', cols[2].x + 5, tableY);

                    // Type
                    doc.fillColor(isIncome ? THEME.accent : THEME.textLight).text(isIncome ? 'Income' : 'Expense', cols[3].x + 5, tableY);

                    // Amount
                    doc.font('Helvetica-Bold').fillColor(amountColor)
                        .text(formatMoney(tx.amount), cols[4].x, tableY, { width: cols[4].width, align: 'right' });

                    doc.font('Helvetica'); // Reset font

                    tableY += 28;
                });
            }

            // --- Footer (Global) ---
            const ranges = doc.bufferedPageRange();
            for (let i = 0; i < ranges.count; i++) {
                doc.switchToPage(i);

                // Elegant Footer
                doc.moveTo(MARGIN, doc.page.height - 40).lineTo(doc.page.width - MARGIN, doc.page.height - 40)
                    .strokeColor(THEME.border).lineWidth(1).stroke();

                doc.fontSize(8).fillColor(THEME.textLight)
                    .text('Financial Access • Confidential Report', MARGIN, doc.page.height - 30);

                doc.text(`Page ${i + 1} of ${ranges.count}`, 0, doc.page.height - 30,
                    { align: 'right', width: doc.page.width - MARGIN });
            }

            doc.end();

        } catch (error) {
            console.error("PDF Generation Error:", error);
            reject(error);
        }
    });
};

module.exports = { generateFinancialReportPDF };
