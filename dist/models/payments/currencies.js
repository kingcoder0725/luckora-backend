"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Currencies = void 0;
const mongoose_1 = require("mongoose");
const CurrenciesSchema = new mongoose_1.Schema({
    id: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    symbol: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        required: true
    },
    payment: {
        type: String
    },
    buyUrl: {
        type: String
    },
    coingecko: {
        type: String
    },
    price: {
        type: Number,
        default: 0
    },
    minDeposit: {
        type: Number,
        default: 0
    },
    minWithdraw: {
        type: Number,
        default: 0
    },
    minBet: {
        type: Number,
        default: 0
    },
    maxBet: {
        type: Number,
        default: 0
    },
    decimals: {
        type: Number,
        default: 18
    },
    betLimit: {
        type: Number,
        default: 0
    },
    adminAddress: {
        type: String,
        default: ''
    },
    contractAddress: {
        type: String,
        default: ''
    },
    network: {
        type: String,
        default: ''
    },
    abi: {
        type: Array,
        default: []
    },
    type: {
        type: Number,
    },
    status: {
        type: Boolean,
        default: true
    },
    deposit: {
        type: Boolean,
        default: true
    },
    withdrawal: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number
    },
    officialLink: {
        type: String,
        default: ''
    },
    isFiat: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });
exports.Currencies = (0, mongoose_1.model)('currencies', CurrenciesSchema);
