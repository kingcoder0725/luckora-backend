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
exports.allActive = exports.updateLeagues = exports.deleteOne = exports.updateOne = exports.create = exports.list = exports.getOne = exports.get = void 0;
const mongoose_1 = require("mongoose");
const base_1 = require("../base");
const sportsrealtime_1 = require("./sportsrealtime");
const football_1 = require("./football");
const models_1 = require("../../models");
const aggregateQuery = [
    {
        $lookup: {
            from: 'sports_lists',
            localField: 'sport_id',
            foreignField: 'SportId',
            as: 'sport',
        },
    },
    {
        $unwind: '$sport',
    },
    {
        $sort: {
            'sport.order': 1,
            status: -1,
            order: 1,
            cc: -1,
            name: 1,
        },
    },
];
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsLeagues.aggregate(aggregateQuery);
    return res.json(result);
});
exports.get = get;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsLeagues.aggregate([
        {
            $match: { _id: (0, base_1.ObjectId)(req.params.id) },
        },
        ...aggregateQuery,
    ]);
    return res.json(result[0]);
});
exports.getOne = getOne;
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { pageSize = null, page = null, SportId, status, has_toplist, has_leaguetable, country, q, search = '' } = req.body;
    let query = {};
    if (SportId !== '' && SportId !== undefined) {
        query.sport_id = SportId;
    }
    if (has_toplist !== '' && has_toplist !== undefined) {
        query.has_toplist = has_toplist.toString();
    }
    if (has_leaguetable !== '' && has_leaguetable !== undefined) {
        query.has_leaguetable = has_leaguetable.toString();
    }
    if (status !== '' && status !== undefined) {
        query.status = status;
    }
    if (country !== '' && country !== undefined) {
        query.cc = country.toLowerCase();
    }
    if (q !== '' && q !== undefined) {
        query.name = { $regex: q, $options: 'i' };
    }
    if (search) {
        query = Object.assign(Object.assign({}, query), { $or: [
                { name: { $regex: search, $options: 'i' } },
                { cc: { $regex: search, $options: 'i' } },
                ...(mongoose_1.default.Types.ObjectId.isValid(search) ? [{ _id: new mongoose_1.default.Types.ObjectId(search) }] : []),
            ] });
    }
    const count = yield models_1.SportsLeagues.countDocuments(query);
    if (!pageSize || !page) {
        const results = yield models_1.SportsLeagues.aggregate([{ $match: query }, ...aggregateQuery]);
        return res.json({ results, count });
    }
    else {
        const results = yield models_1.SportsLeagues.aggregate([
            { $match: query },
            ...aggregateQuery,
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize },
        ]);
        return res.json({ results, count });
    }
});
exports.list = list;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsLeagues.create(req.body);
    return res.json(result);
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = { _id: (0, base_1.ObjectId)(req.params.id) };
    yield models_1.SportsLeagues.updateOne(query, req.body);
    const result = yield models_1.SportsLeagues.aggregate([{ $match: query }, ...aggregateQuery]);
    return res.json(result[0]);
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsLeagues.deleteOne({
        _id: (0, base_1.ObjectId)(req.params.id),
    });
    return res.json(result);
});
exports.deleteOne = deleteOne;
const updateLeagues = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sportslist = yield models_1.SportsLists.find();
    for (const key in sportslist) {
        (0, sportsrealtime_1.getLeaguePage)(sportslist[key].SportId);
    }
    (0, football_1.getFootBallLeagues)();
    return res.json({ status: true });
});
exports.updateLeagues = updateLeagues;
const allActive = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { query, update } = req.body;
    const result = yield models_1.SportsLeagues.updateMany(query, update);
    return res.json(result);
});
exports.allActive = allActive;
