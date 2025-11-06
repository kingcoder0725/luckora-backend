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
exports.deleteOne = exports.updateOne = exports.create = exports.list = exports.getOne = exports.get = exports.getEvents = void 0;
const request = require("request");
const mongoose_1 = require("mongoose");
const base_1 = require("../base");
const models_1 = require("../../models");
const aggregateQuery = [
    {
        $lookup: {
            from: 'sports_lists',
            localField: 'SportId',
            foreignField: 'SportId',
            as: 'sport',
        },
    },
    {
        $lookup: {
            from: 'sports_bets',
            localField: 'betId',
            foreignField: '_id',
            as: 'bet',
        },
    },
    {
        $unwind: '$bet',
    },
    {
        $lookup: {
            from: 'currencies',
            localField: 'bet.currency',
            foreignField: '_id',
            as: 'currency',
        },
    },
    {
        $lookup: {
            from: 'users',
            localField: 'bet.userId',
            foreignField: '_id',
            as: 'user',
        },
    },
    {
        $unwind: '$user',
    },
    {
        $unwind: '$currency',
    },
    {
        $project: { 'currency.abi': 0 },
    },
    {
        $sort: { createdAt: -1 },
    },
];
const getEvent = (eventId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        return new Promise((resolve, reject) => {
            const options = {
                method: 'GET',
                url: process.env.ENDED_ENDPOINT,
                headers: { 'Content-Type': 'application/json' },
                qs: { token: process.env.SPORTSBOOK_APIKEY, event_id: eventId },
                json: true,
            };
            request(options, (error, response, body) => __awaiter(void 0, void 0, void 0, function* () {
                if (error) {
                    resolve({ status: false, result: {} });
                }
                else {
                    if (body && body.success && body.results && body.results.length) {
                        const result = body.results[0];
                        resolve({ status: true, result });
                    }
                    else {
                        resolve({ status: false, result: {} });
                    }
                }
            }));
        });
    }
    catch (error) {
        console.error(error);
        return { status: false, result: {} };
    }
});
const getEvents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { eventId } = req.body;
        const event = yield models_1.SportsMatchs.findOne({ id: eventId });
        if (!event)
            return res.status(402).json('Event not Found');
        if (event.sport_id === 1)
            return res.json({ status: false });
        const result = yield getEvent(eventId);
        if (!result.status)
            return res.status(402).json('Internal Server Error');
        return res.json(result);
    }
    catch (error) {
        console.error('Error getEvents', error);
        return res.status(402).json('Internal Server Error');
    }
});
exports.getEvents = getEvents;
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsBetting.aggregate(aggregateQuery);
    res.json(result);
});
exports.get = get;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsBetting.aggregate([{ $match: { _id: (0, base_1.ObjectId)(req.params.id) } }, ...aggregateQuery]);
    res.json(result[0]);
});
exports.getOne = getOne;
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { betId = null, eventId = null, SportId = null, oddType = null, status = null, timeStatus = null, date = null, sort = null, column = null, pageSize = null, page = null, search = '', } = req.body;
    let query = {};
    const query2 = {};
    let sortQuery = { createdAt: -1 };
    if (eventId) {
        query.eventId = Number(eventId);
    }
    if (betId) {
        query.betId = (0, base_1.ObjectId)(betId);
    }
    if (SportId) {
        query.SportId = SportId;
    }
    if (oddType) {
        query.oddType = oddType;
    }
    if (timeStatus || timeStatus === 0) {
        query.TimeStatus = String(timeStatus);
    }
    if (status) {
        query.status = status;
    }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    if (column) {
        sortQuery = { [column]: sort ? sort : 1 };
    }
    if (search) {
        query = Object.assign(Object.assign({}, query), { $or: [
                { eventId: { $regex: search, $options: 'i' } },
                { SportName: { $regex: search, $options: 'i' } },
                { LeagueId: { $regex: search, $options: 'i' } },
                { LeagueName: { $regex: search, $options: 'i' } },
                { AwayTeam: { $regex: search, $options: 'i' } },
                { HomeTeam: { $regex: search, $options: 'i' } },
                { marketName: { $regex: search, $options: 'i' } },
                { oddName: { $regex: search, $options: 'i' } },
                { status: { $regex: search, $options: 'i' } },
                // Check for valid ObjectId before searching in `_id`
                ...(mongoose_1.default.Types.ObjectId.isValid(search) ? [{ _id: new mongoose_1.default.Types.ObjectId(search) }] : []),
            ] });
    }
    let count = 0;
    if (req.user && req.user.rolesId.type === 'agent') {
        query2['user.creatorId'] = req.user._id;
        const results = yield models_1.SportsBetting.aggregate([{ $match: query }, ...aggregateQuery, { $match: query2 }]);
        count = results.length;
    }
    else {
        count = yield models_1.SportsBetting.countDocuments(query);
    }
    if (!pageSize || !page) {
        const results = yield models_1.SportsBetting.aggregate([{ $match: query }, ...aggregateQuery, { $match: query2 }, { $sort: sortQuery }]);
        res.json({ results, count });
    }
    else {
        const results = yield models_1.SportsBetting.aggregate([
            { $match: query },
            ...aggregateQuery,
            { $match: query2 },
            { $sort: sortQuery },
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize },
        ]);
        res.json({ results, count });
    }
});
exports.list = list;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsBetting.create(req.body);
    res.json(result);
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = { _id: (0, base_1.ObjectId)(req.params.id) };
    yield models_1.SportsBetting.updateOne(query, req.body);
    const result = yield models_1.SportsBetting.aggregate([{ $match: query }, ...aggregateQuery]);
    res.json(result[0]);
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsBetting.deleteOne({
        _id: (0, base_1.ObjectId)(req.params.id),
    });
    res.json(result);
});
exports.deleteOne = deleteOne;
