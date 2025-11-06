"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Vendors = void 0;
const mongoose_1 = require("mongoose");

const VendorsSchema = new mongoose_1.Schema(
  {
    value: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: { text: true },
    },
  },
  { timestamps: true }
);

VendorsSchema.index({ value: 1, name: 'text' });

exports.Vendors = (0, mongoose_1.model)('games_vendors', VendorsSchema);