"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Missions = void 0;
const mongoose_1 = require("mongoose");

const MissionsSchema = new mongoose_1.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    steps: {
      type: [String],
      required: true,
      default: [],
    },
    banner_path: {
      type: String,
      trim: true,
      required: false,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'others',
        'sport',
        'casino',
        'live_casino',
        'casino_provider',
        'casino_daily',
        'live_casino_daily',
        'wins',
        'deposit',
        'login_daily',
        'shop',
      ],
    },
    num: {
      type: Number,
      required: true,
      min: 1,
    },
    reward: {
      type: Number,
      required: true,
      min: 0,
    },
    min_level: {
      type: Number,
      required: true,
      min: 0,
    },
    count_bets: {
      type: Number,
      min: 0,
      required: false,
    },
    min_bet: {
      type: Number,
      min: 0,
      required: false,
    },
    min_stake: {
      type: Number,
      min: 0,
      required: false,
    },
    min_odds: {
      type: Number,
      min: 0,
      required: false,
    },
    matchId: {
      type: Number,
      min: 0,
      required: false,
    },
    leagueId: {
      type: Number,
      min: 0,
      required: false,
    },
    min_deposit: {
      type: Number,
      min: 0,
      required: false,
    },
    type_deposit: {
      type: String,
      enum: ['fixed', 'percentage'],
      required: false,
    },
    win: {
      type: Number,
      min: 0,
      required: false,
    },
    type_win: {
      type: String,
      enum: ['fixed', 'percentage'],
      required: false,
    },
    games: {
      type: [String],
      default: [],
      required: false,
    },
    vendors: {
      type: [String],
      default: [],
      required: false,
    },
    originalgames: {
      type: [String],
      default: [],
      required: false,
    },
    missions: {
      type: [mongoose_1.Schema.Types.ObjectId],
      ref: 'missions_missions',
      default: [],
      required: false,
    },
    shops: {
      type: [mongoose_1.Schema.Types.ObjectId],
      ref: 'shops',
      default: [],
      required: false,
    },
    count_shops: {
      type: Number,
      min: 0,
      default: 0,
      required: false,
    },
    count_others: {
      type: Number,
      min: 0,
      default: 0,
      required: false,
    },
    count_days: {
      type: Number,
      min: 0,
      required: false,
    },
    count_login: {
      type: Number,
      min: 0,
      required: false,
    },
    temp_mission: {
      type: Boolean,
      required: true,
      default: false,
    },
    start_date: {
      type: String,
      required: false,
    },
    expire_date: {
      type: String,
      required: false,
    },
    private_mission: {
      type: Boolean,
      required: true,
      default: false,
    },
    eligible_users: {
      type: mongoose_1.Schema.Types.Mixed,
      required: true,
      default: 'ALL',
      validate: {
        validator: (value) => {
          return (
            value === 'ALL' ||
            (Array.isArray(value) &&
              value.every(v => mongoose_1.Types.ObjectId.isValid(v)))
          );
        },
        message: "eligible_users must be 'ALL' or an array of valid ObjectIds",
      },
    },
    status: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { timestamps: true }
);


MissionsSchema.index({ type: 1, status: 1 });
MissionsSchema.index({ title: 'text', description: 'text' });

exports.Missions = (0, mongoose_1.model)('missions_missions', MissionsSchema);