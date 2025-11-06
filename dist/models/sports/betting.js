"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SportsBetting = void 0;
const mongoose_1 = require("mongoose");
const SportsBettingSchema = new mongoose_1.Schema(
    {
        betId: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'sports_bets'
        },
        eventId: {
            type: Number,
            require: true
        },
        bet365Id: {
            type: Number
        },
        stake: {
            type: Number,
            require: true
        },
        profit: {
            type: Number,
            default: 0,
            require: true
        },
        SportId: {
            type: Number,
            require: true
        },
        SportName: {
            type: String,
            require: true
        },
        LeagueId: {
            type: Number,
            require: true
        },
        LeagueName: {
            type: String,
            require: true
        },
        TimeStatus: {
            type: Number,
            require: true
        },
        Time: {
            type: Date,
            require: true
        },
        AwayTeam: {
            type: String,
            require: true
        },
        HomeTeam: {
            type: String,
            require: true
        },
        marketId: {
            type: String,
            require: true
        },
        marketName: {
            type: String,
            require: true
        },
        oddId: {
            type: String,
            require: true
        },
        oddName: {
            type: String,
            require: true
        },
        oddType: {
            type: String,
            require: true
        },
        odds: {
            type: Number,
            require: true
        },
        handicap: {
            type: Number
        },
        oddData: {
            type: Object,
            require: true
        },
        scores: {
            type: Object,
            default: {
                home: 0,
                away: 0,
                total: 0
            }
        },
        isFreeBet: {
            type: Boolean,
            default: false
        },
        selectedFreeBet: {
            type: String,
            default: ''
        },
        isBet365: {
            type: Boolean
        },
        status: {
            type: String,
            default: 'BET',
            enum: ['BET', 'SETTLED', 'LOST', 'WIN', 'HALF_WIN', 'HALF_LOST', 'REFUND', 'CANCEL'],
            require: true
        }
    },
    { timestamps: true }
);
SportsBettingSchema.index({ betId: 1, eventId: 1, SportId: 1, status: 1 });
exports.SportsBetting = (0, mongoose_1.model)('sports_bettings', SportsBettingSchema);
