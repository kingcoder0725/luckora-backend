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
exports.read = exports.get = exports.getMissionNotification = exports.deleteOne = exports.updateOne = exports.create = exports.list = exports.getOne = void 0;
const base_1 = require("../base");
const models_1 = require("../../models");

const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.MissionNotification.findOne({ _id: (0, base_1.ObjectId)(req.params.id) });
        if (!result) {
            return res.status(404).json({ message: "Not found" });
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Internal Error" });
    }
});
exports.getOne = getOne;

const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { pageSize = null, page = null, status, country } = req.body;
        const query = {};
        if (status !== '' && status !== undefined) {
            query.status = status;
        }
        if (country !== '' && country !== undefined) {
            query.country = { $in: [country, "all"] };
        }
        const count = yield models_1.MissionNotification.countDocuments(query);
        if (!pageSize || !page) {
            const results = yield models_1.MissionNotification.find(query).sort({ createdAt: -1 });
            res.json({ results, count });
        } else {
            const results = yield models_1.MissionNotification.find(query)
                .limit(pageSize)
                .skip((page - 1) * pageSize)
                .sort({ createdAt: -1 });
            res.json({ results, count });
        }
    } catch (error) {
        res.status(500).json({ message: "Internal Error" });
    }
});
exports.list = list;

const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.MissionNotification.create({
            ...req.body,
            auto: false,
            banner_path: req.body.banner_path || null
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Error via creating mission_notification" });
    }
});
exports.create = create;

const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.MissionNotification.findByIdAndUpdate(
            (0, base_1.ObjectId)(req.params.id),
            {
                ...req.body,
                banner_path: req.body.banner_path || null,
                viewers: []
            },
            { new: true }
        );
        if (!result) {
            return res.status(404).json({ message: "Not found" });
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Error via updating mission_notification" });
    }
});
exports.updateOne = updateOne;

const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.MissionNotification.deleteOne({
            _id: (0, base_1.ObjectId)(req.params.id)
        });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Not found" });
        }
        res.json({ message: "Was deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error via deleting mission_notification" });
    }
});
exports.deleteOne = deleteOne;

const getMissionNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.MissionNotification.find({ status: true })
            .sort({ createdAt: -1 })
            .select({
                _id: 0,
                title: 1,
                description: 1,
                banner_path: 1
            });
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Internal error" });
    }
});
exports.getMissionNotification = getMissionNotification;


//for user
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
        if (ip === null || ip === void 0 ? void 0 : ip.country) {
            query.$or = [
                { country: { $in: ["all"] }, $or: query_user },
                { country: { $in: [ip.country] }, $or: query_user }
            ];
        } else {
            query.$or = query_user;
        }
        const result = yield models_1.MissionNotification.find(query).sort({ createdAt: -1 });
        const data = result.map((e) => ({
            ...e.toObject(),
            isUnRead: !e.viewers.includes(userId),
            banner_path: e.banner_path || null,
            viewers: null,
            players: null,
            country: null
        }));
        return res.json(data);
    } catch (error) {
        return res.status(500).json({ message: "Internal error" });
    }
});
exports.get = get;

const read = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const ip = (0, base_1.getIPAddress)(req);
        const userId = req.user ? req.user._id : null;
        const { id } = req.body;

        const query = { status: true };
        const query_user = [
            { players: { $in: ["all"] }, viewers: { $nin: [String(userId)] } },
            { players: { $in: [String(userId)] }, viewers: { $nin: [String(userId)] } }
        ];

        if (ip && ip.country) {
            query.$or = [
                { country: { $in: ["all"] }, $or: query_user },
                { country: { $in: [ip.country] }, $or: query_user }
            ];
        } else {
            query.$or = query_user;
        }

        if (id === 'all') {
            yield models_1.MissionNotification.updateMany(
                query,
                { $push: { viewers: String(userId) } }
            );
        } else {
            const result = yield models_1.MissionNotification.updateOne(
                { _id: (0, base_1.ObjectId)(id), ...query },
                { $push: { viewers: String(userId) } }
            );
            if (result.matchedCount === 0) {
                return res.status(404).json({ message: "Notification not found or already read" });
            }
        }

        res.json("success");
    } catch (error) {
        return res.status(200).json({ message: "Internal error" });
    }
});
exports.read = read;