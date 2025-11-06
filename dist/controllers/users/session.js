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
exports.deleteOne = exports.deleteAll = exports.updateOne = exports.create = exports.csv = exports.list = exports.getOne = exports.get = void 0;
const mongoose_1 = require("mongoose");
const base_1 = require("../base");
const models_1 = require("../../models");
const aggregateQuery = [
    {
        $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
        },
    },
    {
        $unwind: '$user',
    },
    {
        $sort: {
            socketId: -1,
            createdAt: -1,
        },
    },
];
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Sessions.aggregate(aggregateQuery);
    res.json(result);
});
exports.get = get;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Sessions.aggregate([
        {
            $match: { _id: (0, base_1.ObjectId)(req.params.id) },
        },
        ...aggregateQuery,
    ]);
    res.json(result[0]);
});
exports.getOne = getOne;
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { pageSize = null, page = null, userId = null, date = null, search = '' } = req.body;
    let query = {};
    const query2 = {};
    if (userId) {
        query.userId = (0, base_1.ObjectId)(userId);
    }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    // if (req.user && req.user.rolesId.type === 'agent') {
    //     query2['user.creatorId'] = req.user._id;
    // }
    if (search) {
        query = Object.assign(Object.assign({}, query), { $or: [
                { socketId: { $regex: search, $options: 'i' } },
                { ip: { $regex: search, $options: 'i' } },
                { country: { $regex: search, $options: 'i' } },
                // Check for valid ObjectId before searching in `_id`
                ...(mongoose_1.default.Types.ObjectId.isValid(search) ? [{ _id: new mongoose_1.default.Types.ObjectId(search) }] : []),
            ] });
    }
    let count = 0;
    if (req.user && req.user.rolesId.type === 'agent') {
        // query2['user.creatorId'] = req.user._id;
        const results = yield models_1.Sessions.aggregate([{ $match: query }, ...aggregateQuery, { $match: query2 }]);
        count = results.length;
    }
    else {
        count = yield models_1.Sessions.countDocuments(query);
    }
    if (!pageSize || !page) {
        const results = yield models_1.Sessions.aggregate([{ $match: query }, ...aggregateQuery, { $match: query2 }]);
        res.json({ results, count });
    }
    else {
        const results = yield models_1.Sessions.aggregate([
            { $match: query },
            ...aggregateQuery,
            { $match: query2 },
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize },
        ]);
        res.json({ results, count });
    }
});
exports.list = list;
const csv = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId = null, date = null } = req.body;
    const query = {};
    const query2 = {};
    if (userId) {
        query.userId = (0, base_1.ObjectId)(userId);
    }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    // if (req.user && req.user.rolesId.type === 'agent') {
    //     query2['user.creatorId'] = req.user._id;
    // }
    const results = yield models_1.Sessions.aggregate([
        { $match: query },
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user',
            },
        },
        {
            $unwind: '$user',
        },
        { $match: query2 },
        {
            $project: {
                _id: 0,
                Email: '$user.email',
                Username: '$user.username',
                IP: '$ip',
                CreatedAt: '$createdAt',
            },
        },
    ]);
    res.json(results);
});
exports.csv = csv;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Sessions.create(req.body);
    res.json(result);
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = { _id: (0, base_1.ObjectId)(req.params.id) };
    yield models_1.Sessions.updateOne(query, req.body);
    const result = yield models_1.Sessions.aggregate([{ $match: query }, ...aggregateQuery]);
    res.json(result[0]);
});
exports.updateOne = updateOne;
const deleteAll = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield models_1.Sessions.find();
    const result = yield models_1.Sessions.deleteMany();
    for (const i in data) {
        req.app.get('io').to(data[i].socketId).emit('logout');
    }
    res.json(result);
});
exports.deleteAll = deleteAll;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Sessions.findByIdAndDelete((0, base_1.ObjectId)(req.params.id));
    req.app.get('io').to(result.socketId).emit('logout');
    res.json(result);
});
exports.deleteOne = deleteOne;
