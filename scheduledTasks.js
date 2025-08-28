const cron = require("node-cron");
const Invoice = require("./Models/invoiceModel");
const Product = require("./Models/productModel");
const notificationService = require("./Services/notificationService");

/**
 * @description A scheduled task that runs daily to find overdue invoices and send email alerts.
 */
const checkOverdueInvoices = () => {
    // Schedule to run once every day at 9:00 AM
    cron.schedule("0 9 * * *", async () => {
        console.log("Running daily check for overdue invoices...");
        try {
            const today = new Date();
            const overdueInvoices = await Invoice.find({
                status: { $in: ["unpaid", "partially paid"] },
                dueDate: { $lt: today },
            })
                .populate("owner")
                .populate("buyerDetails");

            if (overdueInvoices.length > 0) {
                console.log(
                    `Found ${overdueInvoices.length} overdue invoices. Sending alerts...`,
                );
                for (const invoice of overdueInvoices) {
                    await notificationService.sendOverdueInvoiceAlert(invoice);
                }
            } else {
                console.log("No overdue invoices found.");
            }
        } catch (error) {
            console.error("Error during overdue invoice check:", error);
        }
    });
};

/**
 * @description A scheduled task that runs daily to find low-stock products and send alerts.
 */
const checkLowStockProducts = () => {
    // Schedule to run once every day at 10:00 AM
    cron.schedule("0 10 * * *", async () => {
        console.log("Running daily check for low-stock products...");
        try {
            const lowStockProducts = await Product.find({
                stock: { $lt: 10 }, // Using the same threshold as your dashboard
            }).populate("owner");

            if (lowStockProducts.length > 0) {
                console.log(
                    `Found ${lowStockProducts.length} low-stock products. Sending alerts...`,
                );
                for (const product of lowStockProducts) {
                    await notificationService.sendLowStockAlert(product);
                }
            } else {
                console.log("No low-stock products found.");
            }
        } catch (error) {
            console.error("Error during low-stock product check:", error);
        }
    });
};

/**
 * @description Initializes and starts all scheduled tasks for the application.
 */
exports.startScheduledTasks = () => {
    checkOverdueInvoices();
    checkLowStockProducts();
    console.log("✅ Proactive notification tasks have been scheduled.");
};
