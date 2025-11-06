"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Games = void 0;
const mongoose_1 = require("mongoose");
const GamesSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'users',
        require: true
    },
    currency: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'currencies',
        require: true
    },
    providerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'game_providers',
        require: true
    },
    gameId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'game_lists',
        require: true
    },
    odds: {
        type: Number,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    profit: {
        type: Number,
        default: 0,
        require: true
    },
    betting: {
        type: Object
    },
    aBetting: {
        type: Object
    },
    status: {
        type: String,
        default: 'BET',
        enum: ['BET', 'DRAW', 'LOST', 'WIN'],
        require: true
    }
}, { timestamps: true });
GamesSchema.index({ userId: 1, currency: 1, providerId: 1, gameId: 1, status: 1 });
exports.Games = (0, mongoose_1.model)('games', GamesSchema);
