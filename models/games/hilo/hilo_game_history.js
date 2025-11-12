const mongoose = require("mongoose");
const schema = mongoose.Schema

const Schema = new schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    bet_id: {
        type: Number,
        required: true,
    },
    bet_amount: {
        type: Number,
        required: true,
    },
    token_img: {
        type: String,
     
    },
    token: {
        type: String,
     
    },
    won: {
        type: Boolean,
        required: true,
    },
    payout: {
        type: Number,
        required: true,
    },
    time: {
        type: Date,
        default: new Date()
    }
}, { timestamp : true})

module.exports = mongoose.model('Hilo_game_history', Schema)