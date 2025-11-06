"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameProviders = void 0;
const mongoose_1 = require("mongoose");
const GameProvidersSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true
    },
    code: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    api_type: {
        type: String,
        default: "nexusggr"
    },
    icon: {
        type: String,
    },
    order: {
        type: Number,
        required: true,
        default: 0
    },
    status: {
        type: Boolean,
        required: true,
        default: true
    }
}, { timestamps: true });
GameProvidersSchema.index({ code: 1, api_type: 1, order: 1, status: 1, });
exports.GameProviders = (0, mongoose_1.model)('game_providers', GameProvidersSchema);
