"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionsHistories = void 0;
const mongoose_1 = require("mongoose");

const MissionsHistoriesSchema = new mongoose_1.Schema(
  {
    missionId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: 'missions_missions',
      required: true,
    },
    userId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
    },
    reward: {
      type: Number,
      required: true,
      min: 0,
    },
    progress: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      required: true,
      enum: ['notcompleted','claimable','completed'],
      default: 'notcompleted',
    },
    optIn: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  { timestamps: true }
);

MissionsHistoriesSchema.index({ missionId: 1, userId: 1 }, { unique: true });
MissionsHistoriesSchema.index({ userId: 1, status: 1 });

exports.MissionsHistories = (0, mongoose_1.model)('missions_histories', MissionsHistoriesSchema);