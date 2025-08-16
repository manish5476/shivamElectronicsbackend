
const Invoice = require('../../Models/invoiceModel');
const Product = require('../../Models/productModel');
const Customer = require('../../Models/customerModel');
const Payment = require('../../Models/paymentModel');
const Review = require('../../Models/ReviewModel');
const fs = require('fs').promises; // For async file operations
const path = require('path');
const catchAsync = require('../../Utils/catchAsyncModule');
const AppError = require('../../Utils/appError');


exports.getSystemLogs = catchAsync(async (req, res, next) => {
    const logFileName = req.query.file || 'combined.log'; // Allow selection of log file
    const logFilePath = path.join(__dirname, '..', 'logs', logFileName);
    try {
        await fs.access(logFilePath, fs.constants.R_OK);
        let logsContent = await fs.readFile(logFilePath, 'utf8');
        const logLines = logsContent.split('\n').filter(line => line.trim() !== '');
        const parsedLogs = logLines.map(line => {
            try {
                return JSON.parse(line);
            } catch (e) {
                return { raw: line, error: 'JSON parsing failed' };
            }
        });

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 50;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedLogs = parsedLogs.slice(startIndex, endIndex);

        res.status(200).json({
            status: 'success',
            results: paginatedLogs.length,
            totalLogs: parsedLogs.length,
            page,
            limit,
            data: paginatedLogs,
        });

    } catch (error) {
        if (error.code === 'ENOENT') { // File not found
            return next(new AppError(`Log file ${logFileName} not found.`, 404));
        }
        console.error("Error reading log file:", error);
        return next(new AppError('Failed to retrieve logs.', 500));
    }
});