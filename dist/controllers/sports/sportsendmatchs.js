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
exports.deleteOne = exports.deleteAll = exports.updateOne = exports.create = exports.list = exports.getOne = exports.get = void 0;
const base_1 = require("../base");
const models_1 = require("../../models");
const aggregateQuery = [
    {
        $lookup: {
            from: 'sports_lists',
            localField: 'sport_id',
            foreignField: 'SportId',
            as: 'sport'
        }
    },
    {
        $unwind: '$sport'
    },
    {
        $sort: {
            'sport.order': 1,
            time_status: -1,
            time: 1
        }
    }
];
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsEndMatchs.aggregate(aggregateQuery);
    res.json(result);
});
exports.get = get;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsEndMatchs.aggregate([{ $match: { _id: (0, base_1.ObjectId)(req.params.id) } }, ...aggregateQuery]);
    res.json(result[0]);
});
exports.getOne = getOne;
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { eventId = null, SportId = null, date = null, timeStatus, pageSize = null, page = null } = req.body;
    const query = {};
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
            $lte: new Date(date[1]).valueOf() / 1000
        };
    }
    const count = yield models_1.SportsEndMatchs.countDocuments(query);
    if (!pageSize || !page) {
        const results = yield models_1.SportsEndMatchs.aggregate([{ $match: query }, ...aggregateQuery]);
        res.json({ results, count });
    }
    else {
        const results = yield models_1.SportsEndMatchs.aggregate([
            { $match: query },
            ...aggregateQuery,
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize }
        ]);
        res.json({ results, count });
    }
});
exports.list = list;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsEndMatchs.create(req.body);
    res.json(result);
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = { _id: (0, base_1.ObjectId)(req.params.id) };
    yield models_1.SportsEndMatchs.updateOne(query, req.body);
    const result = yield models_1.SportsEndMatchs.aggregate([{ $match: query }, ...aggregateQuery]);
    res.json(result[0]);
});
exports.updateOne = updateOne;
const deleteAll = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsEndMatchs.deleteMany();
    res.json(result);
});
exports.deleteAll = deleteAll;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsEndMatchs.deleteOne({
        _id: (0, base_1.ObjectId)(req.params.id)
    });
    res.json(result);
});
exports.deleteOne = deleteOne;
