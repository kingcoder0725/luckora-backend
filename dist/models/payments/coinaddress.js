"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoinAddress = void 0;
const mongoose_1 = require("mongoose");
const CoinAddressSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'users'
    },
    symbol: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        unique: true,
        required: true,
    },
    amount: {
        type: Number,
        default: 0,
    },
    qr_code: {
        type: String,
        required: true,
    },
    label: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ["active", "expired"],
        default: "active"
    }
}, { timestamps: true });
CoinAddressSchema.pre('findOneAndUpdate', function () {
    this.populate('userId');
});
CoinAddressSchema.pre('find', function () {
    this.populate('userId');
});
CoinAddressSchema.pre('findOne', function () {
    this.populate('userId');
});
exports.CoinAddress = (0, mongoose_1.model)('coinaddress', CoinAddressSchema);
