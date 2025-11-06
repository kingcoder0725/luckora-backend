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
exports.betSettled = exports.deleteOne = exports.deleteAll = exports.updateOne = exports.create = exports.list = exports.getOne = exports.get = void 0;
const base_1 = require("../base");
const sportsresult_1 = require("./sportsresult");
const models_1 = require("../../models");
const aggregateQuery = [
    {
        $lookup: {
            from: 'sports_bettings',
            localField: 'id',
            foreignField: 'eventId',
            as: 'bettings'
        }
    },
    {
        $match: { 'bettings.status': 'BET' }
    },
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
    },
    {
        $project: {
            id: 1,
            sport_id: 1,
            sport: 1,
            time: 1,
            time_status: 1,
            league: 1,
            home: 1,
            away: 1,
            ss: 1,
            points: 1,
            playing_indicator: 1,
            scores: 1,
            stats: 1,
            extra: 1,
            events: 1,
            timer: 1,
            has_lineup: 1,
            inplay_created_at: 1,
            inplay_updated_at: 1,
            confirmed_at: 1,
            odds: 1,
            status: 1,
            count: {
                $size: '$bettings'
            }
        }
    }
];
const aggregateQuery1 = [
    {
        $lookup: {
            from: 'sports_bettings',
            localField: 'id',
            foreignField: 'eventId',
            as: 'bettings'
        }
    },
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
    },
    {
        $project: {
            id: 1,
            sport_id: 1,
            sport: 1,
            time: 1,
            time_status: 1,
            league: 1,
            home: 1,
            away: 1,
            ss: 1,
            points: 1,
            playing_indicator: 1,
            scores: 1,
            stats: 1,
            extra: 1,
            events: 1,
            timer: 1,
            has_lineup: 1,
            inplay_created_at: 1,
            inplay_updated_at: 1,
            confirmed_at: 1,
            odds: 1,
            status: 1,
            count: {
                $size: '$bettings'
            }
        }
    }
];
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsFixMatchs.aggregate(aggregateQuery);
    res.json(result);
});
exports.get = get;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsFixMatchs.aggregate([{ $match: { _id: (0, base_1.ObjectId)(req.params.id) } }, ...aggregateQuery]);
    res.json(result[0]);
});
exports.getOne = getOne;
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { eventId = null, SportId = null, date = null, hide = null, timeStatus, pageSize = null, page = null } = req.body;
    const query = {};
    let match = {};
    if (hide) {
        match = { count: { $ne: 0 } };
    }
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
    if (hide) {
        const sportsFixMatchs = yield models_1.SportsFixMatchs.aggregate([{ $match: query }, ...aggregateQuery, { $match: match }]);
        const count = sportsFixMatchs.length;
        if (!pageSize || !page) {
            res.json({ results: sportsFixMatchs, count });
        }
        else {
            const results = yield models_1.SportsFixMatchs.aggregate([
                { $match: query },
                ...aggregateQuery,
                { $match: match },
                { $skip: (page - 1) * pageSize },
                { $limit: pageSize }
            ]);
            res.json({ results, count });
        }
    }
    else {
        const sportsFixMatchs = yield models_1.SportsFixMatchs.aggregate([{ $match: query }, ...aggregateQuery1, { $match: match }]);
        const count = sportsFixMatchs.length;
        if (!pageSize || !page) {
            res.json({ results: sportsFixMatchs, count });
        }
        else {
            const results = yield models_1.SportsFixMatchs.aggregate([
                { $match: query },
                ...aggregateQuery1,
                { $match: match },
                { $skip: (page - 1) * pageSize },
                { $limit: pageSize }
            ]);
            res.json({ results, count });
        }
    }
});
exports.list = list;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsFixMatchs.create(req.body);
    res.json(result);
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = { _id: (0, base_1.ObjectId)(req.params.id) };
    yield models_1.SportsFixMatchs.updateOne(query, req.body);
    const result = yield models_1.SportsFixMatchs.aggregate([{ $match: query }, ...aggregateQuery]);
    res.json(result[0]);
});
exports.updateOne = updateOne;
const deleteAll = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsFixMatchs.deleteMany();
    res.json(result);
});
exports.deleteAll = deleteAll;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.SportsFixMatchs.deleteOne({
        _id: (0, base_1.ObjectId)(req.params.id)
    });
    res.json(result);
});
exports.deleteOne = deleteOne;
const betSettled = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const eventId = Number(req.params.id);
    const sportsBets = yield models_1.SportsBetting.aggregate([
        {
            $match: { status: 'BET', eventId }
        },
        {
            $lookup: {
                from: 'sports_fix_matchs',
                localField: 'eventId',
                foreignField: 'id',
                as: 'matchs'
            }
        },
        {
            $unwind: '$matchs'
        },
        {
            $match: {
                'matchs.status': true
            }
        }
    ]);
    if (sportsBets.length) {
        for (const i in sportsBets) {
            const bet = sportsBets[i];
            if (bet.matchs.time_status === 3) {
                const reuslt = yield (0, sportsresult_1.bettingSettled)({ bet, data: bet.matchs });
                if (reuslt.state) {
                    yield models_1.SportsBetting.updateOne({ _id: (0, base_1.ObjectId)(bet._id) }, reuslt);
                }
            }
            else if (bet.matchs.time_status === 101) {
                yield models_1.SportsBetting.updateOne({ _id: (0, base_1.ObjectId)(bet._id) }, { status: 'REFUND', profit: bet.stake });
            }
        }
        yield models_1.SportsFixMatchs.updateOne({ id: eventId }, { time_status: 10 });
        res.json({ status: true });
    }
    else {
        res.status(400).json(`Not found betId.`);
    }
});
exports.betSettled = betSettled;
