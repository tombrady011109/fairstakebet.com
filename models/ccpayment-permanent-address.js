const mongoose = require("mongoose");
const schema = mongoose.Schema;

const CCPaymentPermanentAddressSchema = new schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    referenceId: {
        type: String,
        required: true,
        unique: true
    },
    chain: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    memo: {
        type: String,
        default: ""
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    isFlagged: {
        type: Boolean,
        default: false
    },
    flaggedAt: {
        type: Date
    },
    metadata: {
        type: Object,
        default: {}
    }
}, { timestamps: true });

// Compound index for user_id and chain to quickly find addresses for a user on a specific chain
CCPaymentPermanentAddressSchema.index({ user_id: 1, chain: 1 });

module.exports = mongoose.model('ccpayment_permanent_address', CCPaymentPermanentAddressSchema);
