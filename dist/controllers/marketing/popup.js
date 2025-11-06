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
exports.deleteOne = exports.updateOne = exports.create = exports.list = exports.getOne = exports.get = void 0;
const base_1 = require("../base");
const models_1 = require("../../models");
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.MarketingPopup.find().select('-__v');
        return res.json(result);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.get = get;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.MarketingPopup.findOne({ _id: (0, base_1.ObjectId)(req.params.id) }).select('-__v');
        return res.json(result);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.getOne = getOne;
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { pageSize = null, page = null } = req.body;
    const query = {};
    const count = yield models_1.MarketingPopup.countDocuments(query);
    if (!pageSize || !page) {
        const results = yield models_1.MarketingPopup.find(query).sort({ createdAt: -1 }).select('-__v');
        res.json({ results, count });
    }
    else {
        const results = yield models_1.MarketingPopup.find(query)
            .limit(pageSize)
            .skip((page - 1) * pageSize)
            .sort({ createdAt: -1 })
            .select('-__v');
        res.json({ results, count });
    }
});
exports.list = list;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield models_1.MarketingPopup.create(req.body);
        return res.json(data);
    }
    catch (error) {
        console.error('Error Create MarketingPopup => ', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.MarketingPopup.findByIdAndUpdate((0, base_1.ObjectId)(req.params.id), req.body, { new: true });
        res.json(result);
    }
    catch (error) {
        console.error('Error updateOne MarketingPopup => ', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.MarketingPopup.findByIdAndDelete((0, base_1.ObjectId)(req.params.id));
        res.json(result);
    }
    catch (error) {
        console.error('Error deleteOne MarketingPopup => ', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.deleteOne = deleteOne;
