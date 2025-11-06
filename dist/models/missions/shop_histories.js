'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.MissionShopsHistories = void 0;
const mongoose_1 = require('mongoose');

const MissionShopsHistoriesSchema = new mongoose_1.Schema(
  {
    shopId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: 'missions_shops',
      required: true
    },
    userId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: 'users',
      required: true
    },
    type_pay: {
      type: String,
      required: true,
      enum: ['fiat', 'points']
    },
    cost: {
      type: Number,
      required: true,
      min: 0
    },
    payout: {
      type: Number,
      required: true,
      min: 0
    },
    type_gift: {
      type: String,
      required: true,
      enum: ['free_spins', 'cash_bonus', 'free_bet']
    },
    games: {
      type: [
        {
          game: {
            type: String,
            required: true,
            trim: true,
          },
          max_bet: {
            type: Number,
            required: true,
            min: 0,
          },
        },
      ],
      required: function () { return this.type_gift === 'free_spins'; },
      default: function () { return this.type_gift === 'free_spins' ? undefined : []; },
    },
    maxodds: {
      type: Number,
      default: 0,
      min: 0
    },
    leagueId: {
      type: Number,
      required: function () { return this.type_gift === 'free_bet'; },
    },
    matchId: {
      type: Number,
      required: function () { return this.type_gift === 'free_bet'; },
    },
    status: {
      type: String,
      required: true,
      enum: ['paid', 'not_paid', 'activated']
    },
    activate: {
      type: Boolean,
      required: true,
      default: true
    }
  },
  { timestamps: true }
);

MissionShopsHistoriesSchema.index({ shopId: 1, userId: 1 });
MissionShopsHistoriesSchema.index({ status: 1 });

exports.MissionShopsHistories = (0, mongoose_1.model)('missions_shops_histories', MissionShopsHistoriesSchema);
