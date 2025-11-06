"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SportsLists = void 0;
const mongoose_1 = require("mongoose");
const SportsListsSchema = new mongoose_1.Schema({
    SportId: {
        type: Number,
        required: true,
        unique: true
    },
    SportName: {
        type: String,
        required: true,
        unique: true
    },
    icon: {
        type: String,
        default: ''
    },
    color: {
        type: String,
        default: ''
    },
    draw: {
        type: Boolean,
        default: false
    },
    live: {
        type: Boolean,
        default: true
    },
    upcoming: {
        type: Boolean,
        default: true
    },
    match_day: {
        type: Number,
        default: 4
    },
    status: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        required: true
    },
    img: {
        type: String
    }
}, { timestamps: true });
SportsListsSchema.index({ id: 1, order: 1, status: 1, });
exports.SportsLists = (0, mongoose_1.model)('sports_lists', SportsListsSchema);
