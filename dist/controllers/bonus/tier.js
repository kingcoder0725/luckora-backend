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
    try {
        const currencies = yield models_1.Currencies.find({ isFiat: true });
        const result = yield models_1.Tiers.find({ status: true }).sort({ order: 1 });
        const data = result.map((row) => {
            const currency = currencies.filter(c => row.currency_played.includes(String(c._id)));
            return Object.assign(Object.assign({}, row.toObject()), { currencies: currency });
        });
        return res.json(data);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json("Internal Server Error");
    }
});
exports.get = get;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.Tiers.findOne({ _id: (0, base_1.ObjectId)(req.params.id) });
        return res.json(result);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json("Internal Server Error");
    }
});
exports.getOne = getOne;
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { pageSize = null, page = null } = req.body;
        const query = {};
        const count = yield models_1.Tiers.countDocuments(query);
        if (!pageSize || !page) {
            const results = yield models_1.Tiers.find(query).sort({ order: 1, createdAt: -1 });
            return res.json({ results, count });
        }
        const results = yield models_1.Tiers.find(query)
            .limit(pageSize)
            .skip((page - 1) * pageSize)
            .sort({ order: 1, createdAt: -1 });
        return res.json({ results, count });
    }
    catch (error) {
        console.error("Error get tier list => ", error);
        return res.json(500).json("Internal Server Error");
    }
});
exports.list = list;
const label = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield models_1.Tiers.find({ status: true });
        const result = data.map((e) => ({ label: e.title, value: e._id }));
        return res.json(result);
    }
    catch (error) {
        console.error("Error get tier label => ", error);
        return res.json(500).json("Internal Server Error");
    }
});
exports.label = label;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Tiers.create(req.body);
    res.json(result);
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Tiers.findByIdAndUpdate((0, base_1.ObjectId)(req.params.id), req.body, { new: true });
    res.json(result);
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Tiers.deleteOne({
        _id: (0, base_1.ObjectId)(req.params.id)
    });
    res.json(result);
});
exports.deleteOne = deleteOne;
