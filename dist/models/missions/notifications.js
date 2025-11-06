"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionNotification = void 0;
const mongoose_1 = require("mongoose");

const MissionNotificationSchema = new mongoose_1.Schema({
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
        type: [String]
    },
    viewers: {
        type: [String]
    },
    auto: {
        type: Boolean,
        default: false
    },
    param: {
        type: Object
    },
    status: {
        type: Boolean,
        default: true
    },
    banner_path: {
        type: String,
        default: null
    }
}, { timestamps: true });

exports.MissionNotification = (0, mongoose_1.model)('missions_notifications', MissionNotificationSchema);