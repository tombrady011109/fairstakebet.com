const mongoose = require("mongoose");
const schema = mongoose.Schema;

const CCPaymentDepositSchema = new schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    amount: {
        type: Number,
        required: true,
    },
    amountUSD: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    paymentUrl: {
        type: String,

    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date,
    },
    metadata: {
        type: Object,
        default: {}
    }
}, { timestamps: true });

module.exports = mongoose.model('ccpayment_deposit', CCPaymentDepositSchema);
