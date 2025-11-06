"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalanceHistories = void 0;
const mongoose_1 = require("mongoose");
const BalanceHistoriesSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'users'
    },
    currency: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'currencies'
    },
    amount: {
        type: Number,
        default: 0
    },
    currentBalance: {
        type: Number,
        default: 0
    },
    beforeBalance: {
        type: Number,
        default: 0
    },
    bonus: {
        type: Number,
        default: 0
    },
    points: {
        type: Number,
        default: 0
    },
    type: {
        type: String
    },
    info: {
        type: String
    },
    isBonusPlay: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });
BalanceHistoriesSchema.pre('findOneAndUpdate', function () {
    this.populate('currency');
});
BalanceHistoriesSchema.pre('find', function () {
    this.populate('currency');
});
BalanceHistoriesSchema.pre('findOne', function () {
    this.populate('currency');
});
exports.BalanceHistories = (0, mongoose_1.model)('balancehistories', BalanceHistoriesSchema);
