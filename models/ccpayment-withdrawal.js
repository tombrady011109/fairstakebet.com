const mongoose = require("mongoose");
const schema = mongoose.Schema;

const CCPaymentWithdrawalSchema = new schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    withdrawalId: {
        type: String,
        required: true,
        unique: true
    },
    recordId: {
        type: String,
        sparse: true,
        index: true
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
    address: {
        type: String,
        required: true,
    },
    networkFee: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
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

module.exports = mongoose.model('ccpayment_withdrawal', CCPaymentWithdrawalSchema);
