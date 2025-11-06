"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bonus = void 0;
const mongoose_1 = require("mongoose");

const BonusSchema = new mongoose_1.Schema({
    lang: {
        type: Array,
    },
    event: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'bonus_events',
        required: true
    },
    day: {
        type: Array,
    },
    from_date: {
        type: Date,
    },
    to_date: {
        type: Date,
    },
    activate_day: {
        type: Number,
    },
    wager_day: {
        type: Number,
    },
    currencies: [{
        currency: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            min: 0,
            required: true
        },
        amount_type: {
            type: String,
            required: true
        },
        deposit_amount_from: {
            type: Number,
            min: 0,
            required: true
        },
        deposit_amount_to: {
            type: Number,
            min: 0,
            required: true
        },
        spend_amount: {
            type: Number,
            min: 0
        },
        up_to_amount: {
            type: Number,
            min: 0
        },
        games: {
            type: Array,
            default: []
        },
        free_games: {
            type: Array,
            default: []
        },
        wager: {
            type: Number,
            min: 0,
            required: true
        },
        max_bet_free_spin: {
            type: Number,
            min: 0
        },
        max_bet_bonus_amount: {
            type: Number,
            min: 0
        },
        free_spin: {
            type: Number,
            min: 0
        },
        free_spin_up_to_amt: {
            type: Number,
            min: 0
        },
        free_spin_type: {
            type: String
        },
        player_type: {
            type: String,
            enum: ["segmentation", "player"],
            required: true
        },
        players: {
            type: Array,
            default: []
        },
        segmentation: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'segmentations',
            default: null
        }
    }],
    min_odds: {
        type: Number,
    },
    max_odds: {
        type: Number,
    },
    reward: {
        type: String,
    },
    sports_bet_type: {
        type: String,
    },
    sports_event_type: {
        type: String,
    },
    sports_type: {
        type: Array,
    },
    sports_leagues: {
        type: Array,
    },
    sports_matchs: {
        type: Array,
    },
    netlose_from: {
        type: Number,
    },
    netlose_to: {
        type: Number,
    },
    calculation_period: {
        type: Number,
    },
    cashback_date: {
        type: String,
    },
    button_link: {
        type: String,
        default: ""
    },
    order: {
        type: Number,
        default: 0
    },
    display: {
        type: Boolean,
        default: false
    },
    daily: {
        type: String,
        default: "promotion"
    },
    status: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

BonusSchema.pre('findOneAndUpdate', function () {
    this.populate('event');
});
BonusSchema.pre('find', function () {
    this.populate('event');
});
BonusSchema.pre('findOne', function () {
    this.populate('event');
});

exports.Bonus = (0, mongoose_1.model)('bonus', BonusSchema);
// CampaignCashBonus   spend amount (cash back) %
// CampaignFreeBet :deposit and spend amount all on sports
// CampaignFreeSpin :deposit and spend amount all on casino
// CampaignWagerBonus   bonus that you cant withdraw in casino (give certain money) one time
// CampaignWagerSport   bonus that you cant withdraw in sportbook (give certain money) one time
// CashBackBonus  cash back bonus on spend (fixd amount)
// FreeSpinBonus   deposit and spend amount all player will get free bet
// SignupRealBonus  get bonus when you register
// Bonus birthday
