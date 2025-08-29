const { Parser } = require('json2csv');
const Invoice = require('../Models/invoiceModel');
const Emi = require('../Models/emiModel');

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
        customer: inv.buyer ? inv.buyer.fullname : 'N/A',
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
                    customer: emi.customer ? emi.customer.fullname : 'N/A',
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
    if (!data || data.length === 0) {
        return null;
    }
    const json2csvParser = new Parser();
    return json2csvParser.parse(data);
};

exports.generateReport = async (subscription) => {
    let data;
    let filename = `${subscription.reportType}-${new Date().toISOString().split('T')[0]}.csv`;

    switch (subscription.reportType) {
        case 'WEEKLY_SALES':
            data = await getWeeklySalesData(subscription.owner);
            break;
        case 'MONTHLY_OVERDUE':
            data = await getMonthlyOverdueData(subscription.owner);
            break;
        default:
            return { recipients: subscription.recipients, subject: 'Unknown Report Type', csv: null, filename: '' };
    }

    const csv = convertToCSV(data);
    const subject = `${subscription.schedule} ${subscription.reportType.replace('_', ' ')} Report`;

    return { recipients: subscription.recipients, subject, csv, filename };
};
