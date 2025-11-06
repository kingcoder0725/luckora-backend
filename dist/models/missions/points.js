"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionPointsCost = void 0;
const mongoose_1 = require("mongoose");

const MissionPointsCostSchema = new mongoose_1.Schema(
  {
    value: {
      type: Number,
      required: true,
      default: 1,
    },
    fiatValue: {
      type: Number,
      required: true,
      default: 1,
    },
    currencyId: {
      type: mongoose_1.Schema.Types.ObjectId,
      ref: 'currencies',
      required: true,
    },
    priority: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  { timestamps: true } 
);

MissionPointsCostSchema.pre('findOneAndUpdate', function () {
  this.populate('currencyId');
});

MissionPointsCostSchema.pre('find', function () {
  this.populate('currencyId');
});

MissionPointsCostSchema.pre('findOne', function () {
  this.populate('currencyId');
});

exports.MissionPointsCost = (0, mongoose_1.model)('missions_points', MissionPointsCostSchema);