"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionBadge = void 0;
const mongoose_1 = require("mongoose");

const MissionBadgeSchema = new mongoose_1.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    min_level: {
      type: Number,
      required: true,
      default: 0,
    },
    banner_path: {
      type: String,
      required: true,
    },
    players: {
      type: [String],
      default: [],
    },
    status: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);


MissionBadgeSchema.index({ name: 1, min_level: 1 });
MissionBadgeSchema.index({ status: 1 });

exports.MissionBadge = (0, mongoose_1.model)("mission_badges", MissionBadgeSchema);