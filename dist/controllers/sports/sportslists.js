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
const mongoose_1 = require("mongoose");
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsLists.find().sort({ order: 1 });
    res.json(result);
});
exports.get = get;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsLists.findOne({ _id: (0, base_1.ObjectId)(req.params.id) });
    res.json(result);
});
exports.getOne = getOne;
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { pageSize = null, page = null, search = '' } = req.body;
    let query = {};
    if (search) {
        query = Object.assign(Object.assign({}, query), { $or: [
                { SportId: { $regex: search, $options: 'i' } },
                { SportName: { $regex: search, $options: 'i' } },
                ...(mongoose_1.default.Types.ObjectId.isValid(search) ? [{ _id: new mongoose_1.default.Types.ObjectId(search) }] : []),
            ] });
    }
    const count = yield models_1.SportsLists.countDocuments(query);
    if (!pageSize || !page) {
        const results = yield models_1.SportsLists.find(query).sort({ order: 1 });
        res.json({ results, count });
    }
    else {
        const results = yield models_1.SportsLists.find(query)
            .limit(pageSize)
            .skip((page - 1) * pageSize)
            .sort({ order: 1 });
        res.json({ results, count });
    }
});
exports.list = list;
const label = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const results = yield models_1.SportsLists.aggregate([
        {
            $sort: {
                order: 1,
            },
        },
        {
            $project: {
                label: '$SportName',
                value: '$SportId',
                icon: {
                    icon: '$icon',
                    color: '$color',
                },
                _id: 0,
            },
        },
    ]);
    res.json(results);
});
exports.label = label;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsLists.create(req.body);
    res.json(result);
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsLists.findByIdAndUpdate((0, base_1.ObjectId)(req.params.id), req.body, { new: true });
    res.json(result);
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsLists.deleteOne({
        _id: (0, base_1.ObjectId)(req.params.id),
    });
    res.json(result);
});
exports.deleteOne = deleteOne;
