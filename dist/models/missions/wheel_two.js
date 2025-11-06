"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionMiniWheelTwo = void 0;
const mongoose_1 = require("mongoose");


const MissionMiniWheelTwoSchema = new mongoose_1.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    num: {
      type: Number,
      required: true,
      min: 0,
    },
    procent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    desc: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: Boolean,
      required: true,
      default: false,
    },
    type: {
      type: String,
      required: true,
      enum: ["free_spin", "bonus_balance", "points"],
    },
    reward: {
      type: Number,
      required: true,
      min: 0,
    },
     vendors: {
      type: [String],
      default: [],
    },
    minigameId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: "missions_mini_games",
      required: true,
    },
  },
  { timestamps: true }
);

MissionMiniWheelTwoSchema.index({ name: 1, type: 1 });

exports.MissionMiniWheelTwo= (0, mongoose_1.model)("missions_mini_wheel_two", MissionMiniWheelTwoSchema);