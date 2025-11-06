"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionMiniScratch = void 0;
const mongoose_1 = require("mongoose");

const MissionMiniScratchSchema = new mongoose_1.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    banner_path: {
      type: String,
      trim: true,
    },
    procent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    type: {
      type: String,
      required: true,
      enum: ["nothing", "store", "points"],
    },
    store_reward: {
      type: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "missions_shops" }],
      default: [],
    },
    points: {
      type: Number,
      default: 0,
      min: 0,
    },
    minigameId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "missions_mini_games",
      required: true,
    },
  },
  { timestamps: true }
);

MissionMiniScratchSchema.index({ name: 1, type: 1 });

exports.MissionMiniScratch = (0, mongoose_1.model)("missions_mini_scratch", MissionMiniScratchSchema);