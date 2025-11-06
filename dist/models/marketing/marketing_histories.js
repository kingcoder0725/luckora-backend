"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketingHistory = void 0;
const mongoose_1 = require("mongoose");
const MarketingHisSchema = new mongoose_1.Schema({
    marketingId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'marketings',
        required: true
    },
    sender: {
        type: String,
        required: true
    },
    receivers: {
        type: Array,
        required: true
    },
    templateId: {
        type: String,
    },
    last_sent: {
        type: Date,
        default: Date.now()
    },
    open: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });
MarketingHisSchema.pre('findOneAndUpdate', function () {
    this.populate('marketingId', ['title', "event"]);
});
MarketingHisSchema.pre('findOne', function () {
    this.populate('marketingId', ['title', "event"]);
});
MarketingHisSchema.pre('find', function () {
    this.populate('marketingId', ['title', "event"]);
});
exports.MarketingHistory = (0, mongoose_1.model)('marketing_histories', MarketingHisSchema);
