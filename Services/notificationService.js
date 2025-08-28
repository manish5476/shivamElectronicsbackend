const sendEmail = require("../Utils/email");
const User = require("../Models/UserModel");

/**
 * @description Sends an email notification for an overdue invoice.
 * @param {object} invoice - The overdue invoice object.
 */
exports.sendOverdueInvoiceAlert = async (invoice) => {
    try {
        const owner = await User.findById(invoice.owner);
        if (!owner) return;

        await sendEmail({
            email: owner.email,
            subject: `Invoice Overdue: ${invoice.invoiceNumber}`,
            message: `Hi ${owner.name},\n\nThis is a reminder that invoice #${invoice.invoiceNumber} for ${invoice.buyerDetails.fullname} was due on ${new Date(invoice.dueDate).toLocaleDateString()}.\n\nAmount: ${invoice.totalAmount}\nStatus: ${invoice.status}\n\nPlease follow up with the customer.\n\nThank you,\nYour Automated Assistant`,
        });
        console.log(
            `Sent overdue invoice alert for ${invoice.invoiceNumber} to ${owner.email}`,
        );
    } catch (error) {
        console.error("Failed to send overdue invoice alert:", error);
    }
};

/**
 * @description Sends an email alert for low product stock.
 * @param {object} product - The product with low stock.
 */
exports.sendLowStockAlert = async (product) => {
    try {
        const owner = await User.findById(product.owner);
        if (!owner) return;

        await sendEmail({
            email: owner.email,
            subject: `Low Stock Alert: ${product.title}`,
            message: `Hi ${owner.name},\n\nThe stock for your product "${product.title}" (SKU: ${product.sku}) is running low.\n\nCurrent Stock: ${product.stock}\n\nPlease reorder soon to avoid stockouts.\n\nThank you,\nYour Automated Assistant`,
        });
        console.log(
            `Sent low stock alert for ${product.title} to ${owner.email}`,
        );
    } catch (error) {
        console.error("Failed to send low stock alert:", error);
    }
};
