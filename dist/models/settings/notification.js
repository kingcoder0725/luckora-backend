"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = void 0;
const mongoose_1 = require("mongoose");
const NotificationSchema = new mongoose_1.Schema({
    title: {
        type: String
    },
    description: {
        type: String
    },
    players: {
        type: [String]
    },
    country: {
        type: Array,
    },
    viewers: {
        type: Array,
    },
    auto: {
        type: Boolean,
        default: false
    },
    param: {
        type: Object,
    },
    status: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });
exports.Notification = (0, mongoose_1.model)('notifications', NotificationSchema);
