const cron = require("node-cron");
const notificationService = require("./Services/notificationService");
const ReportSubscription = require("./Models/reportSubscriptionModel");
const { generateReport } = require("./Services/reportService");

const startScheduledTasks = () => {
    // --- Daily Check for Overdue Invoices ---
    // Runs at 9:00 AM India Standard Time
    cron.schedule(
        "0 9 * * *",
        async () => {
            console.log("Running daily check for overdue invoices...");
            try {
                await notificationService.sendOverdueInvoiceAlerts();
            } catch (error) {
                console.error("Error during overdue invoice check:", error);
            }
        },
        { scheduled: true, timezone: "Asia/Kolkata" },
    );

    // --- Daily Check for Low-Stock Products ---
    // Runs at 10:00 AM India Standard Time
    cron.schedule(
        "0 10 * * *",
        async () => {
            console.log("Running daily check for low-stock products...");
            try {
                await notificationService.sendLowStockAlerts();
            } catch (error) {
                console.error("Error during low-stock product check:", error);
            }
        },
        { scheduled: true, timezone: "Asia/Kolkata" },
    );

    // --- Daily Check for Overdue EMIs ---
    // Runs at 8:00 AM India Standard Time
    cron.schedule(
        "0 8 * * *",
        async () => {
            console.log("Running daily check for overdue EMIs...");
            try {
                await notificationService.sendOverdueEmiReminders();
            } catch (error) {
                console.error("Error during overdue EMI check:", error);
            }
        },
        { scheduled: true, timezone: "Asia/Kolkata" },
    );

    // --- Daily Check for Scheduled Reports ---
    // Runs at 7:00 AM India Standard Time
    cron.schedule(
        "0 7 * * *",
        async () => {
            console.log("Checking for and sending scheduled reports...");
            const today = new Date();
            const dayOfWeek = today.getDay(); // Sunday = 0, Monday = 1
            const dayOfMonth = today.getDate();

            try {
                const subscriptions = await ReportSubscription.find({
                    isActive: true,
                }).populate('owner', 'email');

                for (const sub of subscriptions) {
                    if (!sub.owner) continue;

                    let shouldSend = false;
                    if (sub.schedule === "WEEKLY" && dayOfWeek === 1) { // Send weekly reports on Monday
                        shouldSend = true;
                    }
                    if (sub.schedule === "MONTHLY" && dayOfMonth === 1) { // Send monthly reports on the 1st
                        shouldSend = true;
                    }

                    if (shouldSend) {
                        const report = await generateReport(sub);
                        if (report.csv) {
                            await notificationService.sendReportEmail(report);
                            sub.lastSent = new Date();
                            await sub.save();
                        }
                    }
                }
            } catch (error) {
                console.error("Error processing scheduled reports:", error);
            }
        },
        { scheduled: true, timezone: "Asia/Kolkata" },
    );

    console.log(
        "✅ All proactive notification and reporting tasks have been scheduled.",
    );
};

module.exports = { startScheduledTasks };

// const cron = require("node-cron");
// const notificationService = require("./Services/notificationService");
// const ReportSubscription = require("./Models/reportSubscriptionModel");
// const { generateReport } = require("./Services/reportService");
// const Invoice = require("./Models/invoiceModel");
// const Product = require("./Models/productModel");

// const startScheduledTasks = () => {
//     // --- Daily Check for Overdue Invoices ---
//     // Runs at 9:00 AM India Standard Time
//     cron.schedule(
//         "0 9 * * *",
//         async () => {
//             console.log("Running daily check for overdue invoices...");
//             try {
//                 await notificationService.sendOverdueInvoiceAlerts();
//             } catch (error) {
//                 console.error("Error during overdue invoice check:", error);
//             }
//         },
//         { scheduled: true, timezone: "Asia/Kolkata" },
//     );

//     // --- Daily Check for Low-Stock Products ---
//     // Runs at 10:00 AM India Standard Time
//     cron.schedule(
//         "0 10 * * *",
//         async () => {
//             console.log("Running daily check for low-stock products...");
//             try {
//                 await notificationService.sendLowStockAlerts();
//             } catch (error) {
//                 console.error("Error during low-stock product check:", error);
//             }
//         },
//         { scheduled: true, timezone: "Asia/Kolkata" },
//     );

//     // --- Daily Check for Overdue EMIs ---
//     // Runs at 8:00 AM India Standard Time
//     cron.schedule(
//         "0 8 * * *",
//         async () => {
//             console.log("Running daily check for overdue EMIs...");
//             try {
//                 await notificationService.sendOverdueEmiReminders();
//             } catch (error) {
//                 console.error("Error during overdue EMI check:", error);
//             }
//         },
//         { scheduled: true, timezone: "Asia/Kolkata" },
//     );

//     // --- Daily Check for Scheduled Reports ---
//     // Runs at 7:00 AM India Standard Time
//     cron.schedule(
//         "0 7 * * *",
//         async () => {
//             console.log("Checking for and sending scheduled reports...");
//             const today = new Date();
//             const dayOfWeek = today.getDay(); // Sunday = 0, Monday = 1
//             const dayOfMonth = today.getDate();

//             try {
//                 const subscriptions = await ReportSubscription.find({
//                     isActive: true,
//                 });

//                 for (const sub of subscriptions) {
//                     let shouldSend = false;
//                     if (sub.schedule === "WEEKLY" && dayOfWeek === 1) {
//                         // Send weekly reports on Monday
//                         shouldSend = true;
//                     }
//                     if (sub.schedule === "MONTHLY" && dayOfMonth === 1) {
//                         // Send monthly reports on the 1st
//                         shouldSend = true;
//                     }

//                     if (shouldSend) {
//                         const report = await generateReport(sub);
//                         if (report.csv) {
//                             await notificationService.sendReportEmail(report);
//                             sub.lastSent = new Date();
//                             await sub.save();
//                         }
//                     }
//                 }
//             } catch (error) {
//                 console.error("Error processing scheduled reports:", error);
//             }
//         },
//         { scheduled: true, timezone: "Asia/Kolkata" },
//     );

//     console.log(
//         "✅ All proactive notification and reporting tasks have been scheduled.",
//     );
// };

// module.exports = { startScheduledTasks };

// // const cron = require("node-cron");
// // const Invoice = require("./Models/invoiceModel");
// // const Product = require("./Models/productModel");
// // const notificationService = require("./Services/notificationService");
// // const Emi = require("./Models/emiModel");
// // const ReportSubscription = require("./Models/reportSubscriptionModel");
// // const { generateReport } = require("./Services/reportService");

// // /**
// //  * @description A scheduled task that runs daily to find overdue invoices and send email alerts.
// //  */
// // const checkOverdueInvoices = () => {
// //     // Schedule to run once every day at 9:00 AM
// //     cron.schedule("0 9 * * *", async () => {
// //         console.log("Running daily check for overdue invoices...");
// //         try {
// //             const today = new Date();
// //             const overdueInvoices = await Invoice.find({
// //                 status: { $in: ["unpaid", "partially paid"] },
// //                 dueDate: { $lt: today },
// //             })
// //                 .populate("owner")
// //                 .populate("buyerDetails");

// //             if (overdueInvoices.length > 0) {
// //                 console.log(
// //                     `Found ${overdueInvoices.length} overdue invoices. Sending alerts...`,
// //                 );
// //                 for (const invoice of overdueInvoices) {
// //                     await notificationService.sendOverdueInvoiceAlert(invoice);
// //                 }
// //             } else {
// //                 console.log("No overdue invoices found.");
// //             }
// //         } catch (error) {
// //             console.error("Error during overdue invoice check:", error);
// //         }
// //     });
// // };

// // const checkLowStockProducts = () => {
// //     // Schedule to run once every day at 10:00 AM
// //     cron.schedule("0 10 * * *", async () => {
// //         console.log("Running daily check for low-stock products...");
// //         try {
// //             const lowStockProducts = await Product.find({
// //                 stock: { $lt: 10 }, // Using the same threshold as your dashboard
// //             }).populate("owner");

// //             if (lowStockProducts.length > 0) {
// //                 console.log(
// //                     `Found ${lowStockProducts.length} low-stock products. Sending alerts...`,
// //                 );
// //                 for (const product of lowStockProducts) {
// //                     await notificationService.sendLowStockAlert(product);
// //                 }
// //             } else {
// //                 console.log("No low-stock products found.");
// //             }
// //         } catch (error) {
// //             console.error("Error during low-stock product check:", error);
// //         }
// //     });
// // };

// // const startScheduledTasks = () => {
// //     // Daily check for overdue EMIs and low stock (runs at 8 AM India Standard Time)
// //     cron.schedule(
// //         "0 8 * * *",
// //         async () => {
// //             console.log(
// //                 "Running daily checks for overdue EMIs and low stock...",
// //             );
// //             try {
// //                 await notificationService.sendOverdueEmiReminders();
// //                 // You can add the low stock check here as well if needed
// //             } catch (error) {
// //                 console.error("Error during daily scheduled tasks:", error);
// //             }
// //         },
// //         {
// //             scheduled: true,
// //             timezone: "Asia/Kolkata",
// //         },
// //     );

// //     // --- NEW: Daily check for scheduled reports (runs at 7 AM India Standard Time) ---
// //     cron.schedule(
// //         "0 7 * * *",
// //         async () => {
// //             console.log("Checking for and sending scheduled reports...");
// //             const today = new Date();
// //             const dayOfWeek = today.getDay(); // Sunday = 0, Monday = 1
// //             const dayOfMonth = today.getDate();

// //             try {
// //                 const subscriptions = await ReportSubscription.find({
// //                     isActive: true,
// //                 });

// //                 for (const sub of subscriptions) {
// //                     let shouldSend = false;
// //                     if (sub.schedule === "WEEKLY" && dayOfWeek === 1) {
// //                         // Send weekly reports on Monday
// //                         shouldSend = true;
// //                     }
// //                     if (sub.schedule === "MONTHLY" && dayOfMonth === 1) {
// //                         // Send monthly reports on the 1st
// //                         shouldSend = true;
// //                     }

// //                     if (shouldSend) {
// //                         const report = await generateReport(sub);
// //                         if (report.csv) {
// //                             await notificationService.sendReportEmail(report);
// //                             sub.lastSent = new Date();
// //                             await sub.save();
// //                         }
// //                     }
// //                 }
// //             } catch (error) {
// //                 console.error("Error processing scheduled reports:", error);
// //             }
// //         },
// //         {
// //             scheduled: true,
// //             timezone: "Asia/Kolkata",
// //         },
// //     );

// //     console.log(
// //         "✅ Proactive notification and reporting tasks have been scheduled.",
// //     );
// // };

// // module.exports = { startScheduledTasks };

// // exports.startScheduledTasks = () => {
// //     checkOverdueInvoices();
// //     checkLowStockProducts();
// //     console.log("✅ Proactive notification tasks have been scheduled.");
// // };
