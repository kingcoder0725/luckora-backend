"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Markets_Group = void 0;
const mongoose_1 = require("mongoose");
const MarketsSchema = new mongoose_1.Schema({
    order: {
        type: Number,
        default: 0
    },
    id: {
        type: String,
        default: ''
    },
    name: {
        type: String,
        default: ''
    },
    status: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });
exports.Markets_Group = (0, mongoose_1.model)('sports_markets', MarketsSchema);
