"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopGameLists = void 0;
const mongoose_1 = require("mongoose");

const TopGameListsSchema = new mongoose_1.Schema({
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

TopGameListsSchema.index({ game_code: 1, number: 1 });

exports.TopGameLists = (0, mongoose_1.model)('top_game_lists', TopGameListsSchema);