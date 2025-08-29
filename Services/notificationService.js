const Emi = require("../Models/emiModel");
const Invoice = require("../Models/invoiceModel");
const Product = require("../Models/productModel");
const sendEmail = require("../Utils/email");

// --- Overdue EMI Reminders ---
exports.sendOverdueEmiReminders = async () => {
    const today = new Date();
    const overdueEmis = await Emi.find({
        "installments.dueDate": { $lt: today },
        "installments.status": "pending",
    })
        .populate("owner", "email name")
        .populate("customer", "fullname");

    const ownerNotifications = {};
    overdueEmis.forEach((emi) => {
        if (!emi.owner) return; // Skip if owner is not populated
        if (!ownerNotifications[emi.owner._id]) {
            ownerNotifications[emi.owner._id] = {
                email: emi.owner.email,
                name: emi.owner.name,
                overdueInstallments: [],
            };
        }
        const overdueInstallments = emi.installments.filter(
            (inst) => inst.status === "pending" && inst.dueDate < today,
        );
        overdueInstallments.forEach((inst) => {
            ownerNotifications[emi.owner._id].overdueInstallments.push(
                `- Customer: ${emi.customer.fullname}, Invoice: ${emi.invoiceNumber}, Amount: ${inst.amount.toFixed(2)}, Due: ${inst.dueDate.toLocaleDateString()}`,
            );
        });
    });

    for (const ownerId in ownerNotifications) {
        const notification = ownerNotifications[ownerId];
        if (notification.overdueInstallments.length > 0) {
            const message = `Hi ${notification.name},\n\nYou have ${notification.overdueInstallments.length} overdue EMI installment(s) that need attention:\n\n${notification.overdueInstallments.join("\n")}\n\nPlease log in to your dashboard to view more details.\n\nThank you,\nYour Automated Assistant`;
            await sendEmail({
                email: notification.email,
                subject: "Daily Overdue EMI Summary",
                message: message,
            });
        }
    }
};

// --- Scheduled Reports ---
exports.sendReportEmail = async ({ recipients, subject, csv, filename }) => {
    await sendEmail({
        email: recipients.join(","),
        subject: subject,
        message: "Please find your scheduled report attached.",
        html: `<p>Please find your scheduled report attached to this email.</p>`,
        attachments: [
            {
                filename: filename,
                content: csv,
                contentType: "text/csv",
            },
        ],
    });
};

// --- Overdue Invoice Alerts ---
exports.sendOverdueInvoiceAlerts = async () => {
    const today = new Date();
    const overdueInvoices = await Invoice.find({
        status: { $in: ["unpaid", "partially paid"] },
        dueDate: { $lt: today },
    })
        .populate("owner", "email name")
        .populate("buyer", "fullname");

    const ownerNotifications = {};
    overdueInvoices.forEach((invoice) => {
        if (!invoice.owner) return;
        if (!ownerNotifications[invoice.owner._id]) {
            ownerNotifications[invoice.owner._id] = {
                email: invoice.owner.email,
                name: invoice.owner.name,
                invoices: [],
            };
        }
        ownerNotifications[invoice.owner._id].invoices.push(
            `- Invoice #${invoice.invoiceNumber} for ${invoice.buyer.fullname}, Amount: ${invoice.totalAmount.toFixed(2)}, Due: ${invoice.dueDate.toLocaleDateString()}`,
        );
    });

    for (const ownerId in ownerNotifications) {
        const notification = ownerNotifications[ownerId];
        if (notification.invoices.length > 0) {
            const message = `Hi ${notification.name},\n\nYou have ${notification.invoices.length} overdue invoice(s):\n\n${notification.invoices.join("\n")}\n\nPlease log in to your dashboard to review them.\n\nThank you,\nYour Automated Assistant`;
            await sendEmail({
                email: notification.email,
                subject: "Daily Overdue Invoice Summary",
                message: message,
            });
        }
    }
};

// --- Low Stock Alerts ---
exports.sendLowStockAlerts = async () => {
    const lowStockProducts = await Product.find({
        stock: { $lt: 10 },
    }).populate("owner", "email name");

    const ownerNotifications = {};
    lowStockProducts.forEach((product) => {
        if (!product.owner) return;
        if (!ownerNotifications[product.owner._id]) {
            ownerNotifications[product.owner._id] = {
                email: product.owner.email,
                name: product.owner.name,
                products: [],
            };
        }
        ownerNotifications[product.owner._id].products.push(
            `${product.title} (SKU: ${product.sku}) - Current Stock: ${product.stock}`,
        );
    });

    for (const ownerId in ownerNotifications) {
        const notification = ownerNotifications[ownerId];
        if (notification.products.length > 0) {
            const message = `Hi ${notification.name},\n\nThe following products are running low on stock:\n\n${notification.products.join("\n")}\n\nPlease reorder soon to avoid stockouts.\n\nThank you,\nYour Automated Assistant`;
            await sendEmail({
                email: notification.email,
                subject: "Daily Low Stock Summary",
                message: message,
            });
        }
    }
};

// const Emi = require("../Models/emiModel");
// const Invoice = require("../Models/invoiceModel");
// const Product = require("../Models/productModel");
// const sendEmail = require("../Utils/email");

// // --- Overdue EMI Reminders ---
// exports.sendOverdueEmiReminders = async () => {
//     const today = new Date();
//     const overdueEmis = await Emi.find({
//         "installments.dueDate": { $lt: today },
//         "installments.status": "pending",
//     })
//         .populate("owner", "email")
//         .populate("customer", "fullname");

//     const ownerNotifications = {};
//     overdueEmis.forEach((emi) => {
//         if (!ownerNotifications[emi.owner._id]) {
//             ownerNotifications[emi.owner._id] = {
//                 email: emi.owner.email,
//                 overdueInstallments: [],
//             };
//         }
//         const overdueInstallments = emi.installments.filter(
//             (inst) => inst.status === "pending" && inst.dueDate < today,
//         );
//         overdueInstallments.forEach((inst) => {
//             ownerNotifications[emi.owner._id].overdueInstallments.push(
//                 `- Customer: ${emi.customer.fullname}, Invoice: ${emi.invoiceNumber}, Amount: ${inst.amount.toFixed(2)}, Due: ${inst.dueDate.toLocaleDateString()}`,
//             );
//         });
//     });

//     for (const ownerId in ownerNotifications) {
//         const notification = ownerNotifications[ownerId];
//         if (notification.overdueInstallments.length > 0) {
//             const message = `You have ${notification.overdueInstallments.length} overdue EMI installment(s) that need attention:\n\n${notification.overdueInstallments.join("\n")}\n\nPlease log in to your dashboard to view more details.`;
//             await sendEmail({
//                 email: notification.email,
//                 subject: "Daily Overdue EMI Summary",
//                 message: message,
//             });
//         }
//     }
// };

// // --- Scheduled Reports ---
// exports.sendReportEmail = async ({ recipients, subject, csv, filename }) => {
//     await sendEmail({
//         email: recipients.join(","),
//         subject: subject,
//         message: "Please find your scheduled report attached.",
//         html: `<p>Please find your scheduled report attached to this email.</p>`,
//         attachments: [
//             {
//                 filename: filename,
//                 content: csv,
//                 contentType: "text/csv",
//             },
//         ],
//     });
// };

// // --- Overdue Invoice Alerts ---
// exports.sendOverdueInvoiceAlerts = async () => {
//     const today = new Date();
//     const overdueInvoices = await Invoice.find({
//         status: { $in: ["unpaid", "partially paid"] },
//         dueDate: { $lt: today },
//     })
//         .populate("owner", "email")
//         .populate("buyer", "fullname");

//     const ownerNotifications = {};
//     overdueInvoices.forEach((invoice) => {
//         if (!ownerNotifications[invoice.owner._id]) {
//             ownerNotifications[invoice.owner._id] = {
//                 email: invoice.owner.email,
//                 invoices: [],
//             };
//         }
//         ownerNotifications[invoice.owner._id].invoices.push(
//             `- Invoice #${invoice.invoiceNumber} for ${invoice.buyer.fullname}, Amount: ${invoice.totalAmount.toFixed(2)}, Due: ${invoice.dueDate.toLocaleDateString()}`,
//         );
//     });

//     for (const ownerId in ownerNotifications) {
//         const notification = ownerNotifications[ownerId];
//         if (notification.invoices.length > 0) {
//             const message = `You have ${notification.invoices.length} overdue invoice(s):\n\n${notification.invoices.join("\n")}\n\nPlease log in to your dashboard to review them.`;
//             await sendEmail({
//                 email: notification.email,
//                 subject: "Daily Overdue Invoice Summary",
//                 message: message,
//             });
//         }
//     }
// };

// // --- Low Stock Alerts ---
// exports.sendLowStockAlerts = async () => {
//     const lowStockProducts = await Product.find({
//         stock: { $lt: 10 },
//     }).populate("owner", "email");

//     const ownerNotifications = {};
//     lowStockProducts.forEach((product) => {
//         if (!ownerNotifications[product.owner._id]) {
//             ownerNotifications[product.owner._id] = {
//                 email: product.owner.email,
//                 products: [],
//             };
//         }
//         ownerNotifications[product.owner._id].products.push(
//             `${product.title} (SKU: ${product.sku}) - Current Stock: ${product.stock}`,
//         );
//     });

//     for (const ownerId in ownerNotifications) {
//         const notification = ownerNotifications[ownerId];
//         if (notification.products.length > 0) {
//             const message = `The following products are running low on stock:\n\n${notification.products.join("\n")}\n\nPlease reorder soon to avoid stockouts.`;
//             await sendEmail({
//                 email: notification.email,
//                 subject: "Daily Low Stock Summary",
//                 message: message,
//             });
//         }
//     }
// };

// // const sendEmail = require("../Utils/email");
// // const User = require("../Models/UserModel");

// // /**
// //  * @description Sends an email notification for an overdue invoice.
// //  * @param {object} invoice - The overdue invoice object.
// //  */
// // exports.sendOverdueInvoiceAlert = async (invoice) => {
// //     try {
// //         const owner = await User.findById(invoice.owner);
// //         if (!owner) return;

// //         await sendEmail({
// //             email: owner.email,
// //             subject: `Invoice Overdue: ${invoice.invoiceNumber}`,
// //             message: `Hi ${owner.name},\n\nThis is a reminder that invoice #${invoice.invoiceNumber} for ${invoice.buyerDetails.fullname} was due on ${new Date(invoice.dueDate).toLocaleDateString()}.\n\nAmount: ${invoice.totalAmount}\nStatus: ${invoice.status}\n\nPlease follow up with the customer.\n\nThank you,\nYour Automated Assistant`,
// //         });
// //         console.log(
// //             `Sent overdue invoice alert for ${invoice.invoiceNumber} to ${owner.email}`,
// //         );
// //     } catch (error) {
// //         console.error("Failed to send overdue invoice alert:", error);
// //     }
// // };

// // /**
// //  * @description Sends an email alert for low product stock.
// //  * @param {object} product - The product with low stock.
// //  */
// // exports.sendLowStockAlert = async (product) => {
// //     try {
// //         const owner = await User.findById(product.owner);
// //         if (!owner) return;

// //         await sendEmail({
// //             email: owner.email,
// //             subject: `Low Stock Alert: ${product.title}`,
// //             message: `Hi ${owner.name},\n\nThe stock for your product "${product.title}" (SKU: ${product.sku}) is running low.\n\nCurrent Stock: ${product.stock}\n\nPlease reorder soon to avoid stockouts.\n\nThank you,\nYour Automated Assistant`,
// //         });
// //         console.log(
// //             `Sent low stock alert for ${product.title} to ${owner.email}`,
// //         );
// //     } catch (error) {
// //         console.error("Failed to send low stock alert:", error);
// //     }
// // };
