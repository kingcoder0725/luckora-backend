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
exports.deleteOne = exports.updateOne = exports.create = exports.csv = exports.list = exports.getOne = exports.get = void 0;
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
        $unwind: '$user',
    },
    {
        $unwind: '$currency',
    },
    {
        $project: {
            'currency.abi': 0,
        },
    },
];
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const results = yield models_1.Balances.aggregate(aggregateQuery);
    res.json(results);
});
exports.get = get;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Balances.aggregate([
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
        const { pageSize = null, page = null, userId = null, currency = null, date = null, sort = null, column = null, hide = null, search = null, } = req.body;
        let query = {};
        const query2 = {};
        let sortQuery = { createdAt: 1 };
        if (hide) {
            query.balance = { $ne: 0 };
        }
        if (column) {
            sortQuery = { [column]: sort ? sort : 1 };
        }
        if (userId) {
            query.userId = (0, base_1.ObjectId)(userId);
        }
        if (currency) {
            query.currency = (0, base_1.ObjectId)(currency);
        }
        if (date && date[0] && date[1]) {
            query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
        }
        if (search) {
            query = Object.assign(Object.assign({}, query), { $or: [
                    { userId: { $regex: search, $options: 'i' } },
                    { currency: { $regex: search, $options: 'i' } },
                    // Check for valid ObjectId before searching in `_id`
                    ...(mongoose_1.default.Types.ObjectId.isValid(search) ? [{ _id: new mongoose_1.default.Types.ObjectId(search) }] : []),
                ] });
        }
        let count = 0;
        let results = [];
        if (req.user && req.user.rolesId.type === 'agent') {
            query2['user.creatorId'] = req.user._id;
            results = yield models_1.Balances.aggregate([{ $match: query }, ...aggregateQuery, { $match: query2 }]);
            count = results.length;
        }
        else {
            count = yield models_1.Balances.countDocuments(query);
            if (!pageSize || !page) {
                results = yield models_1.Balances.aggregate([{ $match: query }, ...aggregateQuery, { $match: query2 }, { $sort: sortQuery }]);
            }
            else {
                results = yield models_1.Balances.aggregate([
                    { $match: query },
                    ...aggregateQuery,
                    { $match: query2 },
                    { $sort: sortQuery },
                    { $skip: (page - 1) * pageSize },
                    { $limit: pageSize },
                ]);
            }
        }
        if (results.length)
            results = yield Promise.all(results.map((row) => __awaiter(void 0, void 0, void 0, function* () {
                if (row.bonus > 0) {
                    const activeBonus = yield models_1.BonusHistories.findOne({
                        userId: row.userId,
                        status: 'active',
                    });
                    return Object.assign(Object.assign({}, row), { activeBonus });
                }
                return row;
            })));
        return res.json({ results, count });
    }
    catch (error) {
        console.error('Error getting balance list => ', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.list = list;
const csv = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId = null, currency = null, date = null, sort = null, column = null, hide = null } = req.body;
    const query = {};
    const query2 = {};
    let sortQuery = {};
    if (hide) {
        query.balance = { $ne: 0 };
    }
    if (column) {
        sortQuery = { [column]: sort ? sort : 1 };
    }
    else {
        sortQuery = { createdAt: 1 };
    }
    if (userId) {
        query.userId = (0, base_1.ObjectId)(userId);
    }
    if (currency) {
        query.currency = (0, base_1.ObjectId)(currency);
    }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    if (req.user && req.user.rolesId.type === 'agent') {
        query2['user.creatorId'] = req.user._id;
    }
    const results = yield models_1.Balances.aggregate([
        { $match: query },
        ...aggregateQuery,
        { $match: query2 },
        { $sort: sortQuery },
        {
            $project: {
                _id: 0,
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
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Balances.create(req.body);
    res.json(result);
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = { _id: (0, base_1.ObjectId)(req.params.id) };
    yield models_1.Balances.updateOne(query, req.body);
    const result = yield models_1.Balances.aggregate([{ $match: query }, ...aggregateQuery]);
    res.json(result[0]);
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Balances.deleteOne({ _id: (0, base_1.ObjectId)(req.params.id) });
    res.json(result);
});
exports.deleteOne = deleteOne;
