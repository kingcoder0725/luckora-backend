"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SportsLeagues = void 0;
const mongoose_1 = require("mongoose");
const SportsLeaguesSchema = new mongoose_1.Schema({
    id: {
        type: Number,
        unique: true,
    },
    sport_id: {
        type: Number
    },
    name: {
        type: String
    },
    cc: {
        type: String
    },
    has_toplist: {
        type: String
    },
    has_leaguetable: {
        type: String
    },
    order: {
        type: Number,
        default: 99999
    },
    match_day: {
        type: Number,
        default: 7
    },
    status: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });
SportsLeaguesSchema.index({ id: 1, sport_id: 1, order: 1, status: 1 });
exports.SportsLeagues = (0, mongoose_1.model)('sports_leagues', SportsLeaguesSchema);
