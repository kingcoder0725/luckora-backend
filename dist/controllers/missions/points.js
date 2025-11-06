"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOne = exports.updateOne = exports.list = exports.create = void 0;
const models_1 = require("../../models");


const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
  try {
    const data = req.body;
    if (data.priority) {
      const existingPriority = yield models_1.MissionPointsCost.findOne({ priority: true });
      if (existingPriority) {
        return res.status(200).json("A priority points cost already exists. Only one record can have priority: true.");
      }
    }
    const result = yield models_1.MissionPointsCost.create(data);
    return res.json(result.toObject());
  } catch (error) {
    console.error("Create error:", error);
    return res.status(500).json("Internal server error");
  }
});
exports.create = create;


const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
  try {
    const { pageSize = null, page = null } = req.body;
    let query = {};

    const count = yield models_1.MissionPointsCost.countDocuments(query);
    let results = [];
    if (!pageSize || !page) {
      results = yield models_1.MissionPointsCost.find(query).sort({ createdAt: -1 });
    } else {
      results = yield models_1.MissionPointsCost.find(query)
        .limit(pageSize)
        .skip((page - 1) * pageSize)
        .sort({ createdAt: -1 });
    }

    return res.json({
      results: results,
      count,
    });
  } catch (error) {
    console.error("List error:", error);
    return res.status(500).json({ error: "Internal server error", details: error.message });
  }
});
exports.list = list;

const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
  try {
    const { _id } = req.params;
    const data = req.body;

    if (data.currencyId) {
      const currencyExists = yield models_1.Currencies.findById(data.currencyId);
      if (!currencyExists) {
        return res.status(200).json("Currency not found");
      }
    }

    if (data.priority) {
      const existingPriority = yield models_1.MissionPointsCost.findOne({ priority: true, _id: { $ne: _id } });
      if (existingPriority) {
        return res.status(200).json("Another record with priority: true already exists.");
      }
    }

    const result = yield models_1.MissionPointsCost.findByIdAndUpdate(
      _id,
      data,
      { new: true }
    );
    if (!result) {
      return res.status(404).json("Points cost not found");
    }
    return res.json(result.toObject());
  } catch (error) {
    console.error("UpdateOne error:", error);
    return res.status(500).json("Internal server error");
  }
});
exports.updateOne = updateOne;

const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
  try {
    const { _id } = req.params;
    const result = yield models_1.MissionPointsCost.deleteOne({ _id: _id });
    if (result.deletedCount === 0) {
      return res.status(404).json("Points cost not found");
    }
    return res.json({ message: "Points cost deleted" });
  } catch (error) {
    console.error("DeleteOne error:", error);
    return res.status(500).json("Internal server error");
  }
});
exports.deleteOne = deleteOne;