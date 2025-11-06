"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionMiniGames = void 0;
const mongoose_1 = require("mongoose");

const MissionMiniGamesSchema = new mongoose_1.Schema(
  {
    scratch_cost: {
      type: Number,
      required: true,
      min: 0,
    },
    wheel_50_cost: {
      type: Number,
      required: true,
      min: 0,
    },
    wheel_100_cost: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

exports.MissionMiniGames = (0, mongoose_1.model)("missions_mini_games", MissionMiniGamesSchema);