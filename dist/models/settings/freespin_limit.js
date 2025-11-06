"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FreeSpinLimits = void 0;
const mongoose_1 = require("mongoose");
const freeSpinLimitsSchema = new mongoose_1.Schema({
    currency: {
        type: String,
        required: true,
    },
    game_code: {
        type: String,
        required: true,
    },
    max_bet: {
        type: Number,
        required: true,
    }
}, { timestamps: true });
exports.FreeSpinLimits = (0, mongoose_1.model)('freespin_limits', freeSpinLimitsSchema);
