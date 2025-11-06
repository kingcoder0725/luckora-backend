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
exports.deleteOne = exports.updateOne = exports.create = exports.label = exports.list = exports.getOne = exports.get = void 0;
const base_1 = require("../base");
const models_1 = require("../../models");
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.BonusEvent.find();
    res.json(result);
});
exports.get = get;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.BonusEvent.findOne({ _id: (0, base_1.ObjectId)(req.params.id) });
    res.json(result);
});
exports.getOne = getOne;
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { pageSize = null, page = null } = req.body;
    const query = {};
    const count = yield models_1.BonusEvent.countDocuments(query);
    if (!pageSize || !page) {
        const results = yield models_1.BonusEvent.find(query).sort({ createdAt: -1 });
        res.json({ results, count });
    }
    else {
        const results = yield models_1.BonusEvent.find(query)
            .limit(pageSize)
            .skip((page - 1) * pageSize)
            .sort({ createdAt: -1 });
        res.json({ results, count });
    }
});
exports.list = list;
const label = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield models_1.BonusEvent.find({ status: true });
    const result = data.map((e) => ({ label: `${e.title} (${e.type})`, type: e.type, value: e._id }));
    res.json(result);
});
exports.label = label;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.BonusEvent.create(req.body);
    res.json(result);
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.BonusEvent.findByIdAndUpdate((0, base_1.ObjectId)(req.params.id), req.body, { new: true });
    res.json(result);
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.BonusEvent.deleteOne({
        _id: (0, base_1.ObjectId)(req.params.id)
    });
    res.json(result);
    const bonuses = yield models_1.Bonus.find({ event: req.params.id });
    if (!bonuses.length)
        return;
    const ids = bonuses.map((bonus) => bonus._id);
    yield models_1.BonusHistories.updateMany({ bonusId: { $in: ids }, status: "active" }, { status: "canceled" });
    yield models_1.Bonus.deleteMany({ event: req.params.id });
});
exports.deleteOne = deleteOne;
