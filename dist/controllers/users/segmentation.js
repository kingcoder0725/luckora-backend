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
exports.get = exports.getSegmentations = exports.deleteOne = exports.updateOne = exports.create = exports.list = exports.getOne = void 0;
const mongoose_1 = require("mongoose");
const base_1 = require("../base");
const models_1 = require("../../models");
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Segmentations.findOne({ _id: (0, base_1.ObjectId)(req.params.id) });
    res.json(result);
});
exports.getOne = getOne;
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { pageSize = null, page = null, status, country, search = '' } = req.body;
        let query = {};
        if (status !== '' && status !== undefined)
            query.status = status;
        if (country !== '' && country !== undefined)
            query.country = country;
        if (search) {
            query = Object.assign(Object.assign({}, query), { $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { gender: { $regex: search, $options: 'i' } },
                    // Check for valid ObjectId before searching in `_id`
                    ...(mongoose_1.default.Types.ObjectId.isValid(search) ? [{ _id: new mongoose_1.default.Types.ObjectId(search) }] : []),
                ] });
        }
        const count = yield models_1.Segmentations.countDocuments(query);
        if (!pageSize || !page) {
            const results = yield models_1.Segmentations.find(query).sort({ _id: -1 });
            return res.json({ results, count });
        }
        const results = yield models_1.Segmentations.find(query)
            .limit(pageSize)
            .skip((page - 1) * pageSize)
            .sort({ _id: -1 });
        return res.json({ results, count });
    }
    catch (error) {
        console.error('Error getList segmentation ==> ', error);
        return res.json('Internal Server Error');
    }
});
exports.list = list;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = req.body;
        if ((query === null || query === void 0 ? void 0 : query.tier) === '' || (query === null || query === void 0 ? void 0 : query.tier) === null)
            delete query.tier;
        const result = yield models_1.Segmentations.create(query);
        return res.json(result);
    }
    catch (error) {
        console.error('Error Create segmentation ==> ', error);
        return res.json('Internal Server Error');
    }
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const result = yield models_1.Segmentations.findByIdAndUpdate((0, base_1.ObjectId)(req.params.id), Object.assign(Object.assign({}, req.body), (((_a = req.body) === null || _a === void 0 ? void 0 : _a.tier) === '' && {
            tier: null,
        })), { new: true });
        return res.json(result);
    }
    catch (error) {
        console.error('Error updateOne segmentation ==> ', error);
        return res.json('Internal Server Error');
    }
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.Segmentations.deleteOne({
            _id: (0, base_1.ObjectId)(req.params.id),
        });
        return res.json(result);
    }
    catch (error) {
        console.error('Error deleteOne segmentation ==> ', error);
        return res.json('Internal Server Error');
    }
});
exports.deleteOne = deleteOne;
const getSegmentations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.Segmentations.find({ status: true }).sort({ order: 1 }).select({
            _id: 0,
            icon: 1,
            link: 1,
            name: 1,
        });
        res.json(result);
    }
    catch (error) {
        console.error('Error getSegmentations ==> ', error);
        return res.json('Internal Server Error');
    }
});
exports.getSegmentations = getSegmentations;
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { players } = req.body;
        const result = yield models_1.Segmentations.find({ status: true });
        if (!players)
            return res.json(result);
        const pResult = result.map((row) => (Object.assign(Object.assign({}, row.toObject()), { countPlayers: 0 })));
        const users = yield models_1.Users.find({ status: true });
        for (const key in users) {
            const user = users[key];
            const balance = yield models_1.Balances.findOne({ userId: user._id, status: true });
            if (!balance) {
                continue;
            }
            balance.userId = user;
            for (const k2 in pResult) {
                const segmentation = pResult[k2];
                const checked = yield (0, base_1.checkSegmentationPlayer)(segmentation, balance);
                if (checked) {
                    pResult[k2].countPlayers += 1;
                }
            }
        }
        return res.json(pResult);
    }
    catch (error) {
        console.error('Error get segmentation ==> ', error);
        return res.status(400).json('Internal Server Error!');
    }
});
exports.get = get;
