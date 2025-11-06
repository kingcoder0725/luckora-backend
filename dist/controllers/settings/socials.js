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
exports.getSocials = exports.deleteOne = exports.updateOne = exports.create = exports.list = exports.getOne = exports.get = void 0;
const base_1 = require("../base");
const models_1 = require("../../models");
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Socials.find();
    res.json(result);
});
exports.get = get;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Socials.findOne({ _id: (0, base_1.ObjectId)(req.params.id) });
    res.json(result);
});
exports.getOne = getOne;
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { pageSize = null, page = null } = req.body;
    const query = {};
    const count = yield models_1.Socials.countDocuments(query);
    if (!pageSize || !page) {
        const results = yield models_1.Socials.find(query);
        res.json({ results, count });
    }
    else {
        const results = yield models_1.Socials.find(query)
            .limit(pageSize)
            .skip((page - 1) * pageSize);
        res.json({ results, count });
    }
});
exports.list = list;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Socials.create(req.body);
    res.json(result);
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Socials.findByIdAndUpdate((0, base_1.ObjectId)(req.params.id), req.body, { new: true });
    res.json(result);
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Socials.deleteOne({
        _id: (0, base_1.ObjectId)(req.params.id)
    });
    res.json(result);
});
exports.deleteOne = deleteOne;
const getSocials = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Socials.find({ status: true }).sort({ order: 1 }).select({
        _id: 0,
        icon: 1,
        link: 1,
        name: 1
    });
    res.json(result);
});
exports.getSocials = getSocials;
