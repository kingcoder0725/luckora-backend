"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JourneyStats = void 0;
const mongoose_1 = require("mongoose");

const JourneyStatsSchema = new mongoose_1.Schema({
    campaignId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'journey_campaigns',
        required: true
    },
    campaignDuration: {
        type: Object
    },
    start_campaign: {
        type: Date,
        default: Date.now
    },
    dead_line_campaign: {
        type: Date
    },
    nodes: {
        type: Map,
        of: new mongoose_1.Schema({
            type: {
                type: String,
                required: true
            },
            stats: {
                type: Map,
                of: new mongoose_1.Schema({
                    count: { type: Number, default: 0 }, 
                    users: [{
                        userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Users' },
                        completionDate: { type: Date, default: Date.now }
                    }] 
                }),
                default: () => ({}) 
            }
        }),
        default: () => new Map() 
    }
}, { timestamps: true });


JourneyStatsSchema.pre('save', function(next) {
    if (this.campaignDuration && this.start_campaign && !this.dead_line_campaign) {
        const { value, unit } = this.campaignDuration;
        const durationMs = calculateDurationInMs(unit, value);
        this.dead_line_campaign = new Date(this.start_campaign.getTime() + durationMs);
    }
    next();
});


function calculateDurationInMs(unit, value) {
    const numValue = parseFloat(value) || 0;
    switch (unit.toLowerCase()) {
        case 'hours': return numValue * 60 * 60 * 1000;
        case 'days': return numValue * 24 * 60 * 60 * 1000;
        case 'weeks': return numValue * 7 * 24 * 60 * 60 * 1000;
        case 'months': return numValue * 30 * 24 * 60 * 60 * 1000;
        default: return 0;
    }
}

JourneyStatsSchema.index({ campaignId: 1 });
JourneyStatsSchema.index({ start_campaign: 1 });
JourneyStatsSchema.index({ dead_line_campaign: 1 }); 

exports.JourneyStats = (0, mongoose_1.model)('journey_stats', JourneyStatsSchema);