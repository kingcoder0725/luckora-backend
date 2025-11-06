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
exports.deleteOne = exports.updateOne = exports.create = exports.label = exports.csv = exports.list = exports.getOne = exports.get = void 0;
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
        $lookup: {
            from: 'currencies',
            localField: 'currency',
            foreignField: '_id',
            as: 'currency',
        },
    },
    {
        $lookup: {
            from: 'game_providers',
            localField: 'provider_code',
            foreignField: 'code',
            as: 'provider',
        },
    },
    {
        $lookup: {
            from: 'game_lists',
            localField: 'game_code',
            foreignField: 'game_code',
            as: 'game',
        },
    },
    {
        $unwind: '$user',
    },
    {
        $unwind: '$game',
    },
    {
        $unwind: '$currency',
    },
    {
        $unwind: '$provider',
    },
    {
        $project: {
            'currency.abi': 0,
        },
    },
    {
        $sort: { createdAt: -1 },
    },
];
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const results = yield models_1.GameHistories.aggregate(aggregateQuery);
    res.json(results);
});
exports.get = get;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.GameHistories.aggregate([
        {
            $match: { _id: (0, base_1.ObjectId)(req.params.id) },
        },
        ...aggregateQuery,
    ]);
    res.json(result[0]);
});
exports.getOne = getOne;
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { pageSize = null, page = null, userId = null, currency = null, status = null, gameId = null, providerId = null, date = null, sort = null, column = null, search = '', } = req.body;
        let query = {};
        const query2 = {};
        let sortQuery = { round_id: -1, createdAt: -1 };
        if (column) {
            sortQuery = { [column]: sort ? sort : 1 };
        }
        if (userId) {
            query.userId = (0, base_1.ObjectId)(userId);
        }
        if (currency) {
            query.currency = (0, base_1.ObjectId)(currency);
        }
        if (gameId) {
            query.gameId = (0, base_1.ObjectId)(gameId);
        }
        if (providerId) {
            query.providerId = (0, base_1.ObjectId)(providerId);
        }
        if (status) {
            // query.status = status;
            query.isBonusPlay = status === 'bonus';
        }
        if (date && date[0] && date[1]) {
            query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
        }
        if (req.user && req.user.rolesId.type === 'agent') {
            query2['user.creatorId'] = req.user._id;
        }
        if (search) {
            query = Object.assign(Object.assign({}, query), { $or: [
                    { game_code: { $regex: search, $options: 'i' } },
                    { provider_code: { $regex: search, $options: 'i' } },
                    { txn_type: { $regex: search, $options: 'i' } },
                    { round_id: { $regex: search, $options: 'i' } },
                    // Check for valid ObjectId before searching in `_id`
                    ...(mongoose_1.default.Types.ObjectId.isValid(search) ? [{ _id: new mongoose_1.default.Types.ObjectId(search) }] : []),
                ] });
        }
        let count = 0;
        if (req.user && req.user.rolesId.type === 'agent') {
            query2['user.creatorId'] = req.user._id;
            const results = yield models_1.GameHistories.aggregate([{ $match: query }, ...aggregateQuery, { $match: query2 }], {
                allowDiskUse: true,
            });
            count = results.length;
        }
        else {
            count = yield models_1.GameHistories.countDocuments(query);
        }
        if (!pageSize || !page) {
            const results = yield models_1.GameHistories.aggregate([{ $match: query }, ...aggregateQuery, { $match: query2 }, { $sort: sortQuery }], {
                allowDiskUse: true,
            });
            // const data = await Promise.all(results.map(async (item) => {
            //     const game = await GameLists.findOne({ provider_code: item.provider_code, game_code: item.game_code });
            //     return {
            //         ...item,
            //         game: game ? game : null
            //     }
            // }));
            return res.json({ results: results, count });
        }
        const results = yield models_1.GameHistories.aggregate([
            { $match: query },
            ...aggregateQuery,
            { $match: query2 },
            { $sort: sortQuery },
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize },
        ], { allowDiskUse: true });
        return res.json({ results, count });
    }
    catch (error) {
        return res.status(500).json('Internal Server Error!');
    }
});
exports.list = list;
const csv = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { betId = null, userId = null, currency = null, status = null, gameId = null, providerId = null, date = null, sort = null, column = null, } = req.body;
    const query = {};
    const query2 = {};
    let sortQuery = { round_id: -1, createdAt: -1 };
    if (column) {
        sortQuery = { [column]: sort ? sort : 1 };
    }
    if (betId) {
        query._id = (0, base_1.ObjectId)(betId);
    }
    if (userId) {
        query.userId = (0, base_1.ObjectId)(userId);
    }
    if (currency) {
        query.currency = (0, base_1.ObjectId)(currency);
    }
    if (gameId) {
        query.gameId = (0, base_1.ObjectId)(gameId);
    }
    if (providerId) {
        query.providerId = (0, base_1.ObjectId)(providerId);
    }
    if (status) {
        query.status = status;
    }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    if (req.user && req.user.rolesId.type === 'agent') {
        query2['user.creatorId'] = req.user._id;
    }
    const results = yield models_1.GameHistories.aggregate([
        { $match: query },
        ...aggregateQuery,
        { $match: query2 },
        { $sort: sortQuery },
        {
            $project: {
                Username: '$user.username',
                Email: '$user.email',
                Balance: {
                    $concat: [{ $convert: { input: '$balance', to: 'string' } }, ' ', '$currency.symbol'],
                },
            },
        },
    ]);
    res.json(results);
});
exports.csv = csv;
const label = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = [];
    if (req.user && req.user.rolesId.type === 'agent') {
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
    const results = yield models_1.GameHistories.aggregate([
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
    const result = yield models_1.GameHistories.create(req.body);
    res.json(result);
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = { _id: (0, base_1.ObjectId)(req.params.id) };
    yield models_1.GameHistories.updateOne(query, req.body);
    const result = yield models_1.GameHistories.aggregate([{ $match: query }, ...aggregateQuery]);
    res.json(result[0]);
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.GameHistories.deleteOne({ _id: (0, base_1.ObjectId)(req.params.id) });
    res.json(result);
});
exports.deleteOne = deleteOne;
