"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FootballLeagues = exports.DB_NAME_FOOTBALL_LEAGUES = void 0;
const mongoose_1 = require("mongoose");
exports.DB_NAME_FOOTBALL_LEAGUES = "sports_football_leagues";
const footballLeaguesSchema = new mongoose_1.Schema({
    id: {
        type: Number,
    },
    sport_id: {
        type: Number
    },
    name: {
        type: String
    },
    type: {
        type: String
    },
    logo: {
        type: String
    },
    order: {
        type: Number,
        default: 99999
    },
    country: {
        type: Object,
        default: null
    },
    status: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });
footballLeaguesSchema.index({ id: 1, sport_id: 1, order: 1, status: 1, });
exports.FootballLeagues = (0, mongoose_1.model)(exports.DB_NAME_FOOTBALL_LEAGUES, footballLeaguesSchema);
