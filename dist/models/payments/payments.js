"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payments = void 0;
const mongoose_1 = require("mongoose");
const PaymentsSchema = new mongoose_1.Schema({
    paymentId: {
        type: String,
    },
    balanceId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'balances',
    },
    currencyId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'currencies',
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'users',
    },
    bonusId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'bonus',
    },
    address: {
        type: String,
    },
    amount: {
        type: Number,
    },
    actually_paid: {
        type: Number,
        default: 0,
    },
    amounti: {
        type: Number,
    },
    fiat_amount: {
        type: Number, // when crypto
    },
    currency: {
        type: String,
    },
    id: {
        type: String,
    },
    ipn_id: {
        type: String,
    },
    ipn_mode: {
        type: String,
    },
    ipn_type: {
        type: String,
        enum: ['deposit', 'withdrawal'],
        required: true,
    },
    merchant: {
        type: String,
    },
    status: {
        type: Number,
    },
    status_text: {
        type: String,
    },
    txn_id: {
        type: String,
    },
    method: {
        type: Number,
        default: 0,
    },
    payment_link: {
        type: String,
        default: '',
    },
    data: {
        type: String,
        default: '',
    },
    balance_updated: {
        type: Boolean,
        default: true,
    },
    isFiat: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });
exports.Payments = (0, mongoose_1.model)('payments', PaymentsSchema);
