"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JourneyProcess = void 0;
const mongoose_1 = require("mongoose");
const JourneyProcessSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    event: {
        type: String,
        required: true
    },
    action: {
        type: String
    },
    finished: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });
JourneyProcessSchema.index({ userId: 1, event: 1 });
exports.JourneyProcess = (0, mongoose_1.model)('journey_process', JourneyProcessSchema);
