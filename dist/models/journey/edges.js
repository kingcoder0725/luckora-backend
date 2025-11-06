"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JourneyEdges = void 0;
const mongoose_1 = require("mongoose");
const JourneyEdgesSchema = new mongoose_1.Schema({
    campaignId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'journey_campaigns',
        required: true
    },
    id: {
        type: String,
    },
    from: {
        type: String,
    },
    to: {
        type: String,
    },
    label: {
        type: String,
    },
    data: {
        type: Object,
    },
}, { timestamps: true });
JourneyEdgesSchema.index({ campaignId: 1 });
JourneyEdgesSchema.index({ from: 1 });
JourneyEdgesSchema.index({ to: 1 });
JourneyEdgesSchema.index({ label: 1 });
exports.JourneyEdges = (0, mongoose_1.model)('journey_edges', JourneyEdgesSchema);
