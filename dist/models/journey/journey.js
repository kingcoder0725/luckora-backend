"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Journeys = void 0;
const mongoose_1 = require("mongoose");
const JourneysSchema = new mongoose_1.Schema({
    campaignName: {
        type: String
    },
    campaignCategory: {
        type: String
    },
    operatorNotes: {
        type: String
    },
    entryMode: {
        type: String
    },
    campaignDuration: {
        type: Object
    },
    controlGroup: {
        type: String
    },
    keepUserInControl: {
        type: Boolean
    },
    entryTrigger: {
        type: String,
    },
    selectedSegment: {
        type: String
    },
    conditions: {
        type: Array
    },
    status: {
        type: Boolean,
        default: true
    },
    completedUsers: { type: [mongoose_1.Schema.Types.ObjectId], default: [] },
    activeJourneys: [{
        userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Users' },
        startTime: { type: Date, required: true },
        durationEndTime: { type: Date, required: true }
    }],
    processedRecords: [{
        userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Users' },
        lastProcessedTime: { type: Date, required: true },
        processedRecordIds: [{ type: mongoose_1.Schema.Types.ObjectId }]
    }],
    completed: { type: Boolean, default: false },
    processing: { type: Boolean, default: false },
    start_time_segment: { 
        type: Date,
        default: Date.now
    }
}, { timestamps: true });
JourneysSchema.index({ status: 1, completed: 1, processing: 1 });
JourneysSchema.index({ completedUsers: 1 });
JourneysSchema.index({ 'activeJourneys.userId': 1 });
exports.Journeys = (0, mongoose_1.model)('journey_campaigns', JourneysSchema);
