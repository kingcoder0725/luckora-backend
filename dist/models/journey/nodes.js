"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JourneyNodes = void 0;
const mongoose_1 = require("mongoose");
const JourneyNodesSchema = new mongoose_1.Schema({
    campaignId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'journey_campaigns',
        required: true
    },
    id: {
        type: String,
        required: true
    },
    type: {
        type: String
    },
    value: {
        type: String
    },
    abTarget: {
        type: String
    },
    allowedHours: {
        from: {
            type: String
        },
        to: {
            type: String
        }
    },
    funnelId: {
        type: String
    },
    title: {
        type: String
    },
    provider: {
        type: String
    },
    note: {
        type: String
    },
    deliveryTimeout: {
        type: String
    },
    popupMessage: {
        type: String
    },
    message: {
        type: String
    },
    link: {
        type: String
    },
    eventToWait: {
        type: String
    },
    maxTime: {
        type: String
    },
    timeUnit: {
        type: String
    },
    conditions: {
        type: Array
    },
    node: {
        type: Object
    },
    finished: {
        type: Boolean,
        default: false
    },
    date: {
        type: Number
    },
    happenedUsers: [{
        userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Users' },
        startTime: { type: Date },
        deadline: { type: Date }
    }],
    timeoutUsers: [{
        userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Users' },
        startTime: { type: Date },
        deadline: { type: Date }
    }],
}, { timestamps: true });
JourneyNodesSchema.index({ id: 1, type: 1, position: 1 });
exports.JourneyNodes = (0, mongoose_1.model)('journey_nodes', JourneyNodesSchema);
