"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionLevel = void 0;
const mongoose_1 = require("mongoose");

const MissionLevelSchema = new mongoose_1.Schema(
  {
    banner_path: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    num: {
      type: Number,
      required: true,
      default: 0,
    },
    min_points: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);


MissionLevelSchema.index({ name: 1, num: 1 });
MissionLevelSchema.index({ status: 1 });

exports.MissionLevel = (0, mongoose_1.model)("mission_levels", MissionLevelSchema);