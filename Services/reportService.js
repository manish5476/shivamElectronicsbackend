const { Parser } = require('json2csv');
const Invoice = require('../Models/invoiceModel');
const Emi = require('../Models/emiModel'); // Assuming emiModel is available

const getWeeklySalesData = async (ownerId) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const sales = await Invoice.find({
        owner: ownerId,
        invoiceDate: { $gte: sevenDaysAgo }
    }).populate('buyer', 'fullname');

    return sales.map(inv => ({
        invoiceNumber: inv.invoiceNumber,
        date: inv.invoiceDate.toLocaleDateString(),
        customer: inv.buyer.fullname,
        amount: inv.totalAmount,
        status: inv.status
    }));
};

const getMonthlyOverdueData = async (ownerId) => {
    const today = new Date();
    const overdueEmis = await Emi.find({
        owner: ownerId,
        'installments.dueDate': { $lt: today },
        'installments.status': 'pending'
    }).populate('customer', 'fullname');

    const overdueData = [];
    overdueEmis.forEach(emi => {
        emi.installments.forEach(inst => {
            if (inst.status === 'pending' && inst.dueDate < today) {
                overdueData.push({
                    customer: emi.customer.fullname,
                    invoiceNumber: emi.invoiceNumber,
                    installmentAmount: inst.amount,
                    dueDate: inst.dueDate.toLocaleDateString(),
                });
            }
        });
    });
    return overdueData;
};

const convertToCSV = (data) => {
    if (!data || data.length === 0
