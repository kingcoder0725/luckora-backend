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
exports.deleteOne = exports.updateOne = exports.list = exports.create = exports.getOne = void 0;
const base_1 = require("../base");
const models_1 = require("../../models");
const mongoose_1 = require("mongoose");

const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
  try {
    const { id } = req.params;
    let result = yield models_1.MissionLevel.findOne({ _id: id });
    if (result) {
      return res.json({ ...result.toObject(), type: "level" });
    }
    result = yield models_1.MissionBadge.findOne({ _id: id });
    if (result) {
      return res.json({ ...result.toObject(), type: "badge" });
    }
    return res.status(404).json("Level or badge not found");
  } catch (error) {
    console.error("GetOne error:", error);
    return res.status(500).json("Internal server error");
  }
});
exports.getOne = getOne;

const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
  try {
    const { type, ...data } = req.body;
    const Model = type === "level" ? models_1.MissionLevel : models_1.MissionBadge;
    const result = yield Model.create(data);
    return res.json({ ...result.toObject(), type });
  } catch (error) {
    console.error("Create error:", error);
    return res.status(500).json("Internal server error");
  }
});
exports.create = create;

const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
  try {
    const { pageSize = null, page = null, search = "", type } = req.body;
    if (!type || !["level", "badge"].includes(type)) {
      return res.status(200).json("Invalid type: must be 'level' or 'badge'");
    }
    const Model = type === "level" ? models_1.MissionLevel : models_1.MissionBadge;
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          ...(mongoose_1.default.Types.ObjectId.isValid(search)
            ? [{ _id: new mongoose_1.default.Types.ObjectId(search) }]
            : []),
        ],
      };
    }
    const count = yield Model.countDocuments(query);
    let results = [];
    if (!pageSize || !page) {
      results = yield Model.find(query).sort({ createdAt: -1 });
    } else {
      results = yield Model.find(query)
        .limit(pageSize)
        .skip((page - 1) * pageSize)
        .sort({ createdAt: -1 });
    }
    return res.json({
      [type === "level" ? "levels" : "badges"]: results,
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
    const { type, ...data } = req.body;
    const Model = type === "level" ? models_1.MissionLevel : models_1.MissionBadge;
    const result = yield Model.findByIdAndUpdate(
      _id,
      data,
      { new: true, upsert: true }
    );
    if (!result) {
      return res.status(404).json("Level or badge not found");
    }
    return res.json({ ...result.toObject(), type });
  } catch (error) {
    console.error("UpdateOne error:", error);
    return res.status(500).json("Internal server error");
  }
});
exports.updateOne = updateOne;

const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
  try {
    const { _id } = req.params;
    let result = yield models_1.MissionLevel.deleteOne({ _id: _id });
    if (result.deletedCount > 0) {
      return res.json({ message: "Level deleted", type: "level" });
    }
    result = yield models_1.MissionBadge.deleteOne({ _id: _id });
    if (result.deletedCount > 0) {
      return res.json({ message: "Badge deleted", type: "badge" });
    }
    return res.status(404).json("Level or badge not found");
  } catch (error) {
    console.error("DeleteOne error:", error);
    return res.status(500).json("Internal server error");
  }
});
exports.deleteOne = deleteOne;