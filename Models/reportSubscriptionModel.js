const mongoose = require('mongoose');
const { Schema } = mongoose;

const reportSubscriptionSchema = new Schema({
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reportType: {
        type: String,
        required: true,
        enum: ['WEEKLY_SALES_SUMMARY', 'MONTHLY_OVERDUE_INVOICES']
    },
    schedule: {
        type: String,
        required: true,
        enum: ['WEEKLY', 'MONTHLY'],
        default: 'WEEKLY'
    },
    recipients: {
        type: [String],
        required: true,
        validate: {
            validator: function(emails) {
                return emails.every(email => /.+\@.+\..+/.test(email));
            },
            message: 'Please provide a list of valid email addresses.'
        }
    },
    lastSent: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const ReportSubscription = mongoose.model('ReportSubscription', reportSubscriptionSchema);

module.exports = ReportSubscription;
