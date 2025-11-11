const mongoose = require("mongoose");
const schema = mongoose.Schema
const CounterSchema = new schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
});
const Counter = mongoose.model('PlinkoGameCounter', CounterSchema);
const Schema = new schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    bet_amount: {
        type: Number,
        required: true,
    },
    token_img: {
        type: String,
        required: true,
    },
    token: {
        type: String,
        required: true,
    },
    bet_id: {
        type: String,
        default: "1",
        required: true,
    },
    rows: {
        type: Number,
        required: true,
    },
    path: {
        type: [Number],
    },
    risk: {
        type: Number,
        required: true,
    },
    chance: {
        type: Number,
        required: true,
    },
    seed_id: {
        type: Number,
        required: true,
    },
    payout: {
        type: Number,
        default: 0,
    },
    won: {
        type: Boolean,
        default: false,
    },
    profit: {
        type: Number,
        default: 0,
    },
    time: {
        type: Date,
        default: new Date(),
    },
    nonce: {
        type: Number,
        default: 0
    }
}, { timestamp : true})
Schema.pre('save', async function (next) {
    try {
        const counter = await Counter.findByIdAndUpdate({ _id: 'bet_id' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
        this.bet_id = (BigInt("500000") + BigInt(counter.seq)).toString();
        next();
    } catch (error) {
        return next(error);
    }
});
module.exports = mongoose.model('Plinko_gameV2', Schema)