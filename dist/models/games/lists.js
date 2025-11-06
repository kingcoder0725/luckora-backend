"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameLists = void 0;
const mongoose_1 = require("mongoose");
const GameListsSchema = new mongoose_1.Schema({
    game_code: {
        type: String,
        required: true,
    },
    game_name: {
        type: String,
        required: true,
    },
    banner: {
        type: String,
        required: true,
    },
    provider_code: {
        type: String,
        required: true,
    },
    order: {
        type: Number,
        default: 999999,
    },
    status: {
        type: Boolean,
        default: false
    },
    api_type: {
        type: String,
        default: "timelesstech"
    },
    details: {
        type: Object,
    },
}, { timestamps: true });
GameListsSchema.index({ game_code: 1, game_name: 1, order: 1, });
exports.GameLists = (0, mongoose_1.model)('game_lists', GameListsSchema);
