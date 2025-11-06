"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BonusHistories = void 0;
const mongoose_1 = require("mongoose");
const BonusHistorySchema = new mongoose_1.Schema({
    bonusId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'bonus',
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'users',
    },
    paymentsId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'payments',
    },
    amount: {
        // bonus amount
        type: Number,
    },
    wager_amount: {
        type: Number,
        default: 0,
    },
    isSpend: {
        type: Number,
        default: 0,
    },
    isDeposit: {
        // deposit amount
        type: Number,
        default: 0,
    },
    added_bonus: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['active', 'processing', 'finished', 'expired', 'canceled'],
        default: 'active',
    },
    daily: {
        type: String,
        enum: ['daily_wheel','usual_bonus'],
        default: 'usual_bonus',
    },
    startProcessingDate: {
        type: Date,
        default: null,
    },
    expireProcessingDate: {
        type: Date,
        default: null,
    },
}, { timestamps: true });
BonusHistorySchema.pre('findOneAndUpdate', function () {
    this.populate('bonusId');
});
BonusHistorySchema.pre('find', function () {
    this.populate('bonusId');
});
BonusHistorySchema.pre('findOne', function () {
    this.populate('bonusId');
});
exports.BonusHistories = (0, mongoose_1.model)('bonushistories', BonusHistorySchema);
