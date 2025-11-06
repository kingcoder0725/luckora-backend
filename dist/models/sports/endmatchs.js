"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SportsEndMatchs = void 0;
const mongoose_1 = require("mongoose");
const SportsEndMatchsSchema = new mongoose_1.Schema({
    id: {
        type: Number,
        unique: true
    },
    sport_id: {
        type: Number
    },
    time: {
        type: Number
    },
    time_status: {
        type: Number
    },
    league: {
        id: {
            type: Number
        },
        name: {
            type: String
        },
        cc: {
            type: String
        }
    },
    home: {
        id: {
            type: Number
        },
        name: {
            type: String
        },
        image_id: {
            type: Number
        },
        cc: {
            type: String
        }
    },
    away: {
        id: {
            type: Number
        },
        name: {
            type: String
        },
        image_id: {
            type: Number
        },
        cc: {
            type: String
        }
    },
    ss: {
        type: String
    },
    points: {
        type: String
    },
    playing_indicator: {
        type: String
    },
    scores: {
        type: Object
    },
    stats: {
        type: Object
    },
    extra: {
        type: Object
    },
    events: {
        type: Object
    },
    timer: {
        type: Object
    },
    has_lineup: {
        type: Number
    },
    inplay_created_at: {
        type: Number
    },
    inplay_updated_at: {
        type: Number
    },
    confirmed_at: {
        type: Number
    },
    odds: {
        type: Object
    },
    bet365_id: {
        type: Number
    },
    f_status: {
        type: Object,
        default: null
    },
    f_score: {
        type: Object,
        default: null
    },
}, { timestamps: true });
SportsEndMatchsSchema.index({ id: 1, sport_id: 1, time: 1, time_status: 1, ss: 1 });
exports.SportsEndMatchs = (0, mongoose_1.model)('sports_end_matchs', SportsEndMatchsSchema);
