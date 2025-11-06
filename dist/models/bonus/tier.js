"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tiers = void 0;
const mongoose_1 = require("mongoose");
const TiersSchema = new mongoose_1.Schema({
    title: {
        type: String,
    },
    amount_played: {
        type: Number,
        required: true
    },
    currency_played: {
        type: (Array),
    },
    cashback: {
        type: Number,
    },
    // amount_prize: {
    //     type: Number,
    // },
    // currency_prize: {
    //     type: String,
    //     ref: 'currencies'
    // },
    // freespin: {
    //     type: Number,
    // },
    // wager: {
    //     type: Number,
    // },
    // order: {
    //     type: Number,
    //     default: 99999,
    // },
    players: {
        type: Array,
        default: [],
    },
    // games: {
    //     type: Array,
    //     default: [],
    // },
    status: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });
exports.Tiers = (0, mongoose_1.model)('tiers', TiersSchema);
