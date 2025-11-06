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
exports.deleteMatchs = exports.deleteOne = exports.updateOne = exports.create = exports.label = exports.list = exports.getOne = exports.get = void 0;
const mongoose_1 = require("mongoose");
const moment = require("moment-timezone");
const base_1 = require("../base");
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
            time_status: -1,
            time: 1,
        },
    },
];
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsMatchs.aggregate(aggregateQuery);
    res.json(result);
});
exports.get = get;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsMatchs.aggregate([{ $match: { _id: (0, base_1.ObjectId)(req.params.id) } }, ...aggregateQuery]);
    res.json(result[0]);
});
exports.getOne = getOne;
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { eventId = null, SportId = null, date = null, timeStatus, pageSize = null, page = null, search = '' } = req.body;
    let query = {};
    if (eventId) {
        query.id = Number(eventId);
    }
    if (SportId) {
        query.sport_id = SportId;
    }
    if (timeStatus !== '' && timeStatus !== undefined) {
        query.time_status = timeStatus;
    }
    if (date && date[0] && date[1]) {
        query.time = {
            $gte: new Date(date[0]).valueOf() / 1000,
            $lte: new Date(date[1]).valueOf() / 1000,
        };
    }
    if (search) {
        query = Object.assign(Object.assign({}, query), { $or: [
                { 'league.name': { $regex: search, $options: 'i' } },
                { 'home.name': { $regex: search, $options: 'i' } },
                { 'away.name': { $regex: search, $options: 'i' } },
                ...(mongoose_1.default.Types.ObjectId.isValid(search) ? [{ _id: new mongoose_1.default.Types.ObjectId(search) }] : []),
            ] });
    }
    const count = yield models_1.SportsMatchs.countDocuments(query);
    if (!pageSize || !page) {
        const results = yield models_1.SportsMatchs.aggregate([{ $match: query }, ...aggregateQuery]);
        res.json({ results, count });
    }
    else {
        const results = yield models_1.SportsMatchs.aggregate([
            { $match: query },
            ...aggregateQuery,
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize },
        ]);
        res.json({ results, count });
    }
});
exports.list = list;
const label = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { timeStatus } = req.body;
        const query = {};
        if (timeStatus !== '' && timeStatus !== undefined) {
            query.time_status = timeStatus;
        }
        query.time = {
            $gte: new Date().valueOf() / 1000,
        };
        const result = yield models_1.SportsMatchs.aggregate([
            { $match: query },
            ...aggregateQuery,
            {
                $project: {
                    label: { $concat: ['$sport.SportName', '/', '$league.name', ' (', '$home.name', '-vs-', '$away.name', ')'] },
                    league: '$league',
                    sport: '$sport',
                    value: '$id',
                },
            },
        ]);
        res.json(result);
    }
    catch (error) {
        console.error(error);
        res.status(500).json('Internal server error');
    }
});
exports.label = label;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsMatchs.create(req.body);
    res.json(result);
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = { _id: (0, base_1.ObjectId)(req.params.id) };
    yield models_1.SportsMatchs.updateOne(query, req.body);
    const result = yield models_1.SportsMatchs.aggregate([{ $match: query }, ...aggregateQuery]);
    res.json(result[0]);
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsMatchs.deleteOne({
        _id: (0, base_1.ObjectId)(req.params.id),
    });
    res.json(result);
});
exports.deleteOne = deleteOne;
const deleteMatchs = () => __awaiter(void 0, void 0, void 0, function* () {
    const date = moment().subtract(1, 'days').valueOf() / 1000;
    const result = yield models_1.SportsMatchs.deleteMany({ time: { $lte: date } });
    result;
});
exports.deleteMatchs = deleteMatchs;
