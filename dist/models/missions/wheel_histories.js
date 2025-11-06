"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionMiniWheelHistories = void 0;
const mongoose_1 = require("mongoose");

const MissionMiniWheelHistoriesSchema = new mongoose_1.Schema(
  {
    userId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
    },
    type_pay: {
      type: String,
      required: true,
      enum: ['fiat', 'points'],
    },
    cost: {
      type: Number,
      required: true,
      min: 0,
    },
    payout: {
      type: Number,
      required: true,
      min: 0,
    },
    game_code: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      required: true,
      enum: ['paid', 'not_paid'],
    },
    activate: {
      type: Boolean,
      required: true,
      default: true,
    },
    currencies: {
      type: [
        {
          currency: {
            type: String,
            required: true,
            trim: true,
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
            required: function () { return this.type === 'free_spin'; },
            default: function () { return this.type === 'free_spin' ? undefined : []; },
          },
        },
      ],
      required: function () { return this.type === 'free_spin'; },
      default: function () { return this.type === 'free_spin' ? undefined : []; },
    },
    minigameId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: 'missions_mini_games',
      required: true,
    },
  },
  { timestamps: true }
);

MissionMiniWheelHistoriesSchema.index({ userId: 1, minigameId: 1 });
MissionMiniWheelHistoriesSchema.index({ status: 1 });

exports.MissionMiniWheelHistories = (0, mongoose_1.model)('minigames_wheel_histories', MissionMiniWheelHistoriesSchema);