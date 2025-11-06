"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionMiniScratchHistories = void 0;
const mongoose_1 = require("mongoose");

const MissionMiniScratchHistoriesSchema = new mongoose_1.Schema(
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
    vendors: {
      type: [String],
      default: [],
    },
    games: {
      type: [String],
      default: [],
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
    minigameId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: 'missions_mini_games',
      required: true,
    },
    grid: {
      type: [{
        _id: { type: mongoose_1.Schema.Types.ObjectId, ref: 'missions_mini_scratch' },
        eraze: { type: Boolean, default: false },
      }],
      required: true,
    },
  },
  { timestamps: true }
);

MissionMiniScratchHistoriesSchema.index({ userId: 1, minigameId: 1 });
MissionMiniScratchHistoriesSchema.index({ status: 1 });

exports.MissionMiniScratchHistories = (0, mongoose_1.model)('minigames_scratch_histories', MissionMiniScratchHistoriesSchema);