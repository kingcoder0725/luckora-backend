"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameHistories = void 0;
const mongoose_1 = require("mongoose");
const GamesHistorySchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'users',
        require: true
    },
    currency: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'currencies',
        require: true
    },
    user_balance: {
        type: Number,
    },
    user_bonus: {
        type: Number,
    },
    game_type: {
        type: String,
    },
    provider_code: {
        type: String,
    },
    game_code: {
        type: String,
        index: true,
    },
    bet_money: {
        type: Number,
    },
    win_money: {
        type: Number,
    },
    refund_money: {
        type: Number,
    },
    txn_id: {
        type: String,
    },
    txn_type: {
        type: String,
    },
    round_id: {
        type: String,
    },
    canceled: {
        type: Boolean,
        default: false,
    },
    isBonusPlay: {
        type: Boolean,
        default: false,
    },
    other: {
        type: String,
    },
}, { timestamps: true });
GamesHistorySchema.index({ userId: 1, currency: 1, round_id: 1, isBonusPlay: 1, });
exports.GameHistories = (0, mongoose_1.model)('gamehistories', GamesHistorySchema);
