"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Exchanges = void 0;
const mongoose_1 = require("mongoose");
const ExchangesSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'users'
    },
    "id": {
        type: String,
        required: true,
    },
    "status": {
        type: String,
        required: true,
    },
    "from_currency_id": {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'currencies'
    },
    "from_currency": {
        type: String,
        required: true,
    },
    "to_currency": {
        type: String,
        required: true,
    },
    "to_currency_id": {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'currencies'
    },
    "from_amount": {
        type: Number,
        default: 0,
    },
    "to_amount": {
        type: Number,
        default: 0,
    },
    "created_at": {
        type: String,
        required: true,
    },
    "updated_at": {
        type: String,
        required: true,
    },
});
exports.Exchanges = (0, mongoose_1.model)('exchanges', ExchangesSchema);
