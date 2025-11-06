"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Market_List = void 0;
const mongoose_1 = require("mongoose");
const Markets = new mongoose_1.Schema({
    sportId: [{
            type: Number
        }],
    order: {
        type: Number,
        default: 0
    },
    groupId: {
        type: String,
        default: ''
    },
    id: {
        type: String,
        default: ''
    },
    name: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    status: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });
exports.Market_List = (0, mongoose_1.model)('sports_market_lists', Markets);
