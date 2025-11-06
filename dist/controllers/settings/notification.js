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
exports.read = exports.get = exports.getNotification = exports.deleteOne = exports.updateOne = exports.create = exports.list = exports.getOne = void 0;
const base_1 = require("../base");
const models_1 = require("../../models");
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Notification.findOne({ _id: (0, base_1.ObjectId)(req.params.id) });
    res.json(result);
});
exports.getOne = getOne;
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { pageSize = null, page = null, status, country } = req.body;
    const query = {};
    if (status !== '' && status !== undefined) {
        query.status = status;
    }
    if (country !== '' && country !== undefined) {
        query.country = country;
    }
    const count = yield models_1.Notification.countDocuments(query);
    if (!pageSize || !page) {
        const results = yield models_1.Notification.find(query).sort({ type: -1, country: 1, createdAt: -1 });
        res.json({ results, count });
    }
    else {
        const results = yield models_1.Notification.find(query)
            .limit(pageSize)
            .skip((page - 1) * pageSize)
            .sort({ type: -1, country: 1, createdAt: -1 });
        res.json({ results, count });
    }
});
exports.list = list;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Notification.create(Object.assign(Object.assign({}, req.body), { auto: false }));
    res.json(result);
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Notification.findByIdAndUpdate((0, base_1.ObjectId)(req.params.id), Object.assign(Object.assign({}, req.body), { viewers: [] }), { new: true });
    res.json(result);
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Notification.deleteOne({
        _id: (0, base_1.ObjectId)(req.params.id)
    });
    res.json(result);
});
exports.deleteOne = deleteOne;
const getNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Notification.find({ status: true }).sort({ order: 1 }).select({
        _id: 0,
        icon: 1,
        link: 1,
        name: 1
    });
    res.json(result);
});
exports.getNotification = getNotification;
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const ip = (0, base_1.getIPAddress)(req);
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const query = { status: true };
        const query_user = [
            { players: { $in: ["all"] } },
            { players: { $in: [String(userId)] } }
        ];
        if (ip === null || ip === void 0 ? void 0 : ip.country)
            query.$or = [
                { country: { $in: ["all"] }, $or: query_user },
                { country: { $in: [ip.country] }, $or: query_user }
            ];
        else
            query.$or = query_user;
        const result = yield models_1.Notification.find(query).sort({ createdAt: -1 });
        const data = result.map((e) => (Object.assign(Object.assign({}, e.toObject()), { isUnRead: !e.viewers.includes(userId), viewers: null, players: null, country: null })));
        return res.json(data);
    }
    catch (error) {
        return res.status(400).json("Internal Server Error!");
    }
});
exports.get = get;
const read = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    try {
        const ip = (0, base_1.getIPAddress)(req);
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
        const { id } = req.body;
        const query = { status: true };
        const query_user = [
            { players: { $in: ["all"] }, viewers: { $nin: [String(userId)] }, },
            { players: { $in: [String(userId)] }, viewers: { $nin: [String(userId)] }, }
        ];
        if (ip === null || ip === void 0 ? void 0 : ip.country)
            query.$or = [
                { country: { $in: ["all"] }, $or: query_user },
                { country: { $in: [ip.country] }, $or: query_user }
            ];
        else
            query.$or = query_user;
        yield models_1.Notification.updateMany(query, { $push: { viewers: String(userId) } });
        res.json("success");
    }
    catch (error) {
        return res.status(400).json("Internal Server Error!");
    }
});
exports.read = read;
