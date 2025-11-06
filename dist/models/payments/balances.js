"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Balances = void 0;
const mongoose_1 = require("mongoose");
const BalancesSchema = new mongoose_1.Schema({
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
    balance: {
        type: Number,
        default: 0,
        required: true
    },
    deposit_count: {
        type: Number,
        default: 0,
    },
    deposit_amount: {
        type: Number,
        default: 0,
    },
    withdraw_count: {
        type: Number,
        default: 0,
    },
    withdraw_amount: {
        type: Number,
        default: 0,
    },
    bonus: {
        type: Number,
        default: 0,
    },
    points: {
        type: Number,
        default: 0,
    },
    isBonusPlay: {
        type: Boolean,
        default: false
    },
    isFreespinPlay: {
        type: Boolean,
        default: false
    },
    status: {
        type: Boolean,
        default: false
    },
    disabled: {
        type: Boolean,
        default: false,
        required: true
    }
}, { timestamps: true });

BalancesSchema.pre('save', function (next) {
    if (this.isModified('balance')) {
        this.balance = Number(this.balance.toFixed(2));
    }
    if (this.isModified('bonus')) {
        this.bonus = Number(this.bonus.toFixed(2));
    }
    next();
});


BalancesSchema.pre('findOneAndUpdate', function (next) {
    const update = this.getUpdate();
    if (update.$set && update.$set.balance !== undefined) {
        update.$set.balance = Number(Number(update.$set.balance).toFixed(2));
    }
    if (update.$set && update.$set.bonus !== undefined) {
        update.$set.bonus = Number(Number(update.$set.bonus).toFixed(2));
    }
    if (update.$inc && update.$inc.balance !== undefined) {
        update.$inc.balance = Number(Number(update.$inc.balance).toFixed(2));
    }
    if (update.$inc && update.$inc.bonus !== undefined) {
        update.$inc.bonus = Number(Number(update.$inc.bonus).toFixed(2));
    }
    if (update.balance !== undefined) {
        this.setUpdate({ $set: { balance: Number(Number(update.balance).toFixed(2)) } });
    }
    if (update.bonus !== undefined) {
        this.setUpdate({ $set: { bonus: Number(Number(update.bonus).toFixed(2)) } });
    }
    this.populate('currency');
    next();
});

BalancesSchema.pre('findOneAndUpdate', function () {
    this.populate('currency');
});
BalancesSchema.pre('find', function () {
    this.populate('currency');
});
BalancesSchema.pre('findOne', function () {
    this.populate('currency');
});
exports.Balances = (0, mongoose_1.model)('balances', BalancesSchema);
