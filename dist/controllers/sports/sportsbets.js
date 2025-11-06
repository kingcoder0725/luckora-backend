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
exports.deleteOne = exports.updateOne = exports.create = exports.label = exports.csv = exports.list = exports.getOne = exports.get = exports.aggregateQuery = void 0;
const mongoose_1 = require("mongoose");
const base_1 = require("../base");
const models_1 = require("../../models");
exports.aggregateQuery = [
    {
        $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
        },
    },
    {
        $lookup: {
            from: 'sports_lists',
            localField: 'betType',
            foreignField: 'SportId',
            as: 'sport',
        },
    },
    {
        $lookup: {
            from: 'sports_bettings',
            localField: '_id',
            foreignField: 'betId',
            as: 'bettings',
        },
    },
    {
        $lookup: {
            from: 'currencies',
            localField: 'currency',
            foreignField: '_id',
            as: 'currency',
        },
    },
    {
        $unwind: '$currency',
    },
    {
        $unwind: '$user',
    },
    {
        $project: { 'currency.abi': 0 },
    },
    {
        $sort: { createdAt: -1 },
    },
];
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsBets.aggregate(exports.aggregateQuery);
    res.json(result);
});
exports.get = get;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsBets.aggregate([{ $match: { _id: (0, base_1.ObjectId)(req.params.id) } }, ...exports.aggregateQuery]);
    res.json(result[0]);
});
exports.getOne = getOne;
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { betId = null, userId = null, SportId = null, currency = null, type = null, status = null, sort = null, column = null, date = null, page = null, pageSize = null, search = '', } = req.body;
    let query = {};
    const query2 = {};
    let sortQuery = { createdAt: -1 };
    if (betId) {
        query._id = (0, base_1.ObjectId)(betId);
    }
    if (userId) {
        query.userId = (0, base_1.ObjectId)(userId);
    }
    if (type) {
        query.type = type;
    }
    if (status) {
        query.status = status;
    }
    if (currency) {
        query.currency = (0, base_1.ObjectId)(currency);
    }
    if (SportId || SportId === 0) {
        query.betType = SportId;
    }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    if (column) {
        sortQuery = { [column]: sort ? sort : 1 };
    }
    if (search) {
        query = Object.assign(Object.assign({}, query), { $or: [
                { type: { $regex: search, $options: 'i' } },
                { status: { $regex: search, $options: 'i' } },
                ...(mongoose_1.default.Types.ObjectId.isValid(search) ? [{ _id: new mongoose_1.default.Types.ObjectId(search) }] : []),
            ] });
    }
    let count = 0;
    if (req.user && req.user && req.user.rolesId.type === 'agent') {
        query2['user.creatorId'] = req.user._id;
        const results = yield models_1.SportsBets.aggregate([{ $match: query }, ...exports.aggregateQuery, { $match: query2 }]);
        count = results.length;
    }
    else {
        count = yield models_1.SportsBets.countDocuments(query);
    }
    if (!pageSize || !page) {
        const results = yield models_1.SportsBets.aggregate([{ $match: query }, ...exports.aggregateQuery, { $match: query2 }, { $sort: sortQuery }]);
        res.json({ results, count });
    }
    else {
        const results = yield models_1.SportsBets.aggregate([
            { $match: query },
            ...exports.aggregateQuery,
            { $match: query2 },
            { $sort: sortQuery },
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize },
        ]);
        res.json({ results, count });
    }
});
exports.list = list;
const csv = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { betId = null, userId = null, type = null, status = null, currency = null, date = null, SportId = null } = req.body;
    const query = {};
    const query2 = {};
    if (betId) {
        query._id = (0, base_1.ObjectId)(betId);
    }
    if (userId) {
        query.userId = (0, base_1.ObjectId)(userId);
    }
    if (type) {
        query.type = type;
    }
    if (status) {
        query.status = status;
    }
    if (currency) {
        query.currency = (0, base_1.ObjectId)(currency);
    }
    if (SportId || SportId === 0) {
        query.betType = SportId;
    }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    if (req.user && req.user && req.user.rolesId.type === 'agent') {
        query2['user.creatorId'] = req.user._id;
    }
    const results = yield models_1.SportsBets.aggregate([
        { $match: query },
        ...exports.aggregateQuery,
        { $match: query2 },
        {
            $project: {
                _id: 0,
                BetId: '$_id',
                Username: '$user.username',
                Email: '$user.email',
                Sports: {
                    $substr: [
                        {
                            $reduce: {
                                input: '$bettings.SportName',
                                initialValue: '',
                                in: { $concat: ['$$this', ', ', '$$value'] },
                            },
                        },
                        0,
                        {
                            $subtract: [
                                {
                                    $strLenCP: {
                                        $reduce: {
                                            input: '$bettings.SportName',
                                            initialValue: '',
                                            in: {
                                                $concat: ['$$this', ', ', '$$value'],
                                            },
                                        },
                                    },
                                },
                                2,
                            ],
                        },
                    ],
                },
                Stake: {
                    $concat: [{ $convert: { input: '$stake', to: 'string' } }, ' ', '$currency.symbol'],
                },
                Potential: {
                    $concat: [{ $convert: { input: '$potential', to: 'string' } }, ' ', '$currency.symbol'],
                },
                Type: '$type',
                Status: '$status',
                Time: '$createdAt',
            },
        },
    ]);
    res.json(results);
});
exports.csv = csv;
const label = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = [];
    if (req.user && req.user && req.user.rolesId.type === 'agent') {
        query.push({
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user',
            },
        });
        query.push({ $unwind: '$user' });
        query.push({ $match: { ['user.creatorId']: req.user._id } });
    }
    const results = yield models_1.SportsBets.aggregate([
        ...query,
        {
            $project: {
                label: '$_id',
                value: '$_id',
                _id: 0,
            },
        },
    ]);
    res.json(results);
});
exports.label = label;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsBets.create(req.body);
    res.json(result);
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = { _id: (0, base_1.ObjectId)(req.params.id) };
    yield models_1.SportsBets.updateOne(query, req.body);
    const result = yield models_1.SportsBets.aggregate([{ $match: query }, ...exports.aggregateQuery]);
    res.json(result[0]);
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsBets.deleteOne({ _id: (0, base_1.ObjectId)(req.params.id) });
    res.json(result);
});
exports.deleteOne = deleteOne;
