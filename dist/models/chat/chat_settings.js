"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatSettings = void 0;
const mongoose_1 = require("mongoose");
const ChatSettingsSchema = new mongoose_1.Schema({
    key: {
        type: String,
        required: true,
        unique: true
    },
    value: {
        type: mongoose_1.Schema.Types.Mixed,
        required: true
    }
}, { timestamps: true });
exports.ChatSettings = (0, mongoose_1.model)('chat_settings', ChatSettingsSchema);
