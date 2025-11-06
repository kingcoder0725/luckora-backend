"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BonusEvent = void 0;
const mongoose_1 = require("mongoose");
const BonusEventSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true
    },
    value: {
        type: String,
        required: true,
        unique: true,
    },
    type: {
        type: String,
        enum: ["sports", 'casino', "tournament"],
        required: true
    },
    status: {
        type: String,
    }
}, { timestamps: true });
exports.BonusEvent = (0, mongoose_1.model)('bonus_events', BonusEventSchema);
