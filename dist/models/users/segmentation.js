"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Segmentations = void 0;
const mongoose_1 = require("mongoose");
const SegmentationsSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    gender: {
        type: String
    },
    registration_date: {
        type: (Array)
    },
    deposit_count_from: {
        type: Number
    },
    deposit_count_to: {
        type: Number
    },
    deposit_amount_from: {
        type: Number
    },
    deposit_amount_to: {
        type: Number
    },
    kyc_status: {
        type: String,
        default: 'all'
    },
    active_status: {
        type: String,
        default: 'all'
    },
    // last_bet_date: {
    //     type: Array<Date>,
    //     default: null
    // },
    country: {
        type: (Array)
    },
    last_games: {
        type: (Array)
    },
    currency: {
        type: (Array),
    },
    netlose_from: {
        type: Number,
        default: 0,
    },
    netlose_to: {
        type: Number,
        default: 0,
    },
    calculation_period: {
        type: Number,
        default: 0,
    },
    reg_date: {
        type: Number,
        default: 0,
    },
    reg_date_type: {
        type: String,
        enum: ['==', '<', '>', '<=', '>='],
        default: "==",
    },
    ftd_amount: {
        type: Number,
        default: 0,
    },
    ftd_amount_type: {
        type: String,
        enum: ['==', '<', '>', '<=', '>='],
        default: "==",
    },
    ftd_date: {
        type: Number,
        default: 0,
    },
    ftd_date_type: {
        type: String,
        enum: ['==', '<', '>', '<=', '>='],
        default: "==",
    },
    ltd_amount: {
        type: Number,
        default: 0,
    },
    ltd_amount_type: {
        type: String,
        enum: ['==', '<', '>', '<=', '>='],
        default: "==",
    },
    ltd_date: {
        type: Number,
        default: 0,
    },
    ltd_date_type: {
        type: String,
        enum: ['==', '<', '>', '<=', '>='],
        default: "==",
    },
    last_withdraw_amount: {
        type: Number,
        default: 0,
    },
    last_withdraw_amount_type: {
        type: String,
        enum: ['==', '<', '>', '<=', '>='],
        default: "==",
    },
    last_withdraw_date: {
        type: Number,
        default: 0,
    },
    last_withdraw_date_type: {
        type: String,
        enum: ['==', '<', '>', '<=', '>='],
        default: "==",
    },
    current_balance: {
        type: Number,
        default: 0,
    },
    current_balance_type: {
        type: String,
        enum: ['==', '<', '>', '<=', '>='],
        default: "==",
    },
    total_withdraw_amount: {
        type: Number,
        default: 0,
    },
    total_withdraw_amount_type: {
        type: String,
        enum: ['==', '<', '>', '<=', '>='],
        default: "==",
    },
    total_withdraw_count: {
        type: Number,
        default: 0,
    },
    total_withdraw_count_type: {
        type: String,
        enum: ['==', '<', '>', '<=', '>='],
        default: "==",
    },
    last_bet_date_casino: {
        type: Number,
        default: 0,
    },
    last_bet_date_casino_type: {
        type: String,
        enum: ['==', '<', '>', '<=', '>='],
        default: "==",
    },
    last_bet_date_sports: {
        type: Number,
        default: 0,
    },
    last_bet_date_sports_type: {
        type: String,
        enum: ['==', '<', '>', '<=', '>='],
        default: "==",
    },
    last_login_date: {
        type: Number,
        default: 0,
    },
    last_login_date_type: {
        type: String,
        enum: ['==', '<', '>', '<=', '>='],
        default: "==",
    },
    birthday_date: {
        type: Number,
        default: 0,
    },
    birthday_date_type: {
        type: String,
        enum: ['==', '<', '>', '<=', '>='],
        default: "==",
    },
    tier: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'tiers',
        default: null
    },
    status: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });
exports.Segmentations = (0, mongoose_1.model)('segmentations', SegmentationsSchema);
