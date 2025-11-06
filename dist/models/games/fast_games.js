"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FastGameLists = void 0;
const mongoose_1 = require("mongoose");

const FastGameListsSchema = new mongoose_1.Schema({
    number: {
        type: Number,
        required: true,
        unique: true,
    },
    game_code: {
        type: String,
        required: true,
    },
}, { timestamps: true });

FastGameListsSchema.index({ game_code: 1, number: 1 });

exports.FastGameLists = (0, mongoose_1.model)('fast_game_lists', FastGameListsSchema);