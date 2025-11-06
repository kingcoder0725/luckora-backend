"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignLimits = void 0;
const mongoose_1 = require("mongoose");
const CampaignLimitsSchema = new mongoose_1.Schema({
    currency_code: {
        type: String,
        required: true,
    },
    game_code: {
        type: String,
        required: true,
        index: true,
    },
    vendor: {
        type: String
    },
    limits: {
        type: (Array),
        required: true,
    }
}, { timestamps: true });
CampaignLimitsSchema.index({ currency_code: 1, game_code: 1, });
exports.CampaignLimits = (0, mongoose_1.model)('campaign_limits', CampaignLimitsSchema);
