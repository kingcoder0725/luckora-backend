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
exports.checkFix = exports.checkBet = exports.filterOdds = exports.getEnds = exports.getEndedEvents = exports.getEndedDate = exports.getLeaguePage = exports.Ends3 = exports.Ends2 = exports.Ends1 = exports.Odds3 = exports.Odds2 = exports.Odds1 = exports.Matchs3 = exports.Matchs2 = exports.Matchs1 = void 0;
const moment = require("moment");
const request = require("request");
const cron_1 = require("cron");
const models_1 = require("../../models");
const football_1 = require("./football");
const token = process.env.SPORTSBOOK_APIKEY;
let count = 0;
let ecount = 0;
let ecount1 = 0;
let scount = 0;
let defaultMarkets = [];
let otherMarkets = {};
const getMarket = () => __awaiter(void 0, void 0, void 0, function* () {
    const _markets = yield models_1.Markets_Group.aggregate([
        {
            $lookup: {
                from: 'sports_market_lists',
                localField: 'id',
                foreignField: 'groupId',
                as: 'items'
            }
        },
        {
            $project: { 'items.description': 0, 'items.sportId': 0, 'items.createdAt': 0, 'items.updatedAt': 0 }
        }
    ]);
    for (let i in _markets) {
        if (_markets[i].id === 'default') {
            for (let j in _markets[i].items) {
                let item = _markets[i].items[j];
                if (item.status) {
                    defaultMarkets.push({ _id: item._id, id: item.id, name: item.name });
                }
            }
        }
        else {
            let items = {};
            let id = _markets[i].id.split('_odds')[0];
            for (let j in _markets[i].items) {
                let item = _markets[i].items[j];
                if (item.status) {
                    items[item.id] = { _id: item._id, id: item.id, name: item.name, status: item.status };
                }
            }
            otherMarkets[id] = { items: items, id: id, name: _markets[i].name, status: _markets[i].status };
        }
    }
});
getMarket();
const Matchs1 = () => {
    try {
        console.log('server on: matchs1');
        getEvents1();
        const job1 = new cron_1.CronJob(process.env.LIVE_TIME, () => {
            getEvents1();
            console.log(moment().format('YYYY-MM-DD hh:mm:ss'), count, ecount, ecount1, scount);
        });
        job1.start();
    }
    catch (error) {
        console.log(`matchs1 server error`, error);
    }
};
exports.Matchs1 = Matchs1;
const Matchs2 = () => {
    try {
        console.log('server on: matchs2');
        getEvents2();
        (0, football_1.getFootballPreMatch)(); // football
        const job2 = new cron_1.CronJob(process.env.UPCOMIN_TIME, () => {
            getEvents2();
            (0, football_1.getFootballPreMatch)(); // football
            console.log(moment().format('YYYY-MM-DD hh:mm:ss'), count, ecount, ecount1, scount);
        });
        job2.start();
    }
    catch (error) {
        console.log(`matchs2 server error`, error);
    }
};
exports.Matchs2 = Matchs2;
const Matchs3 = () => {
    try {
        console.log('server on: matchs3');
        getEvents3();
        const job3 = new cron_1.CronJob(process.env.PRE_TIME, () => {
            getEvents3();
            console.log(moment().format('YYYY-MM-DD hh:mm:ss'), count, ecount, ecount1, scount);
        });
        job3.start();
    }
    catch (error) {
        console.log(`matchs3 server error`, error);
    }
};
exports.Matchs3 = Matchs3;
const Odds1 = () => {
    try {
        console.log('server on: odds1');
        getOdd1();
        const job1 = new cron_1.CronJob(process.env.LIVE_TIME, () => {
            getOdd1();
            console.log(moment().format('YYYY-MM-DD hh:mm:ss'), count, ecount, ecount1, scount);
        });
        job1.start();
    }
    catch (error) {
        console.log(`odds1 server error`, error);
    }
};
exports.Odds1 = Odds1;
const Odds2 = () => {
    try {
        console.log('server on: odds2');
        getOdd2();
        const job2 = new cron_1.CronJob(process.env.UPCOMIN_TIME, () => {
            getOdd2();
            console.log(moment().format('YYYY-MM-DD hh:mm:ss'), count, ecount, ecount1, scount);
        });
        job2.start();
    }
    catch (error) {
        console.log(`odds2 server error`, error);
    }
};
exports.Odds2 = Odds2;
const Odds3 = () => {
    try {
        console.log('server on: odds3');
        getOdd3();
        const job3 = new cron_1.CronJob(process.env.PRE_TIME, () => {
            getOdd3();
            console.log(moment().format('YYYY-MM-DD hh:mm:ss'), count, ecount, ecount1, scount);
        });
        job3.start();
    }
    catch (error) {
        console.log(`odds3 server error`, error);
    }
};
exports.Odds3 = Odds3;
const Ends1 = () => {
    try {
        console.log('server on: ends1');
        getEnds1();
        (0, football_1.getFootballLiveEnded)();
        const job1 = new cron_1.CronJob(process.env.LIVE_TIME, () => {
            getEnds1();
            (0, football_1.getFootballLiveEnded)();
            console.log(moment().format('YYYY-MM-DD hh:mm:ss'), count, ecount, ecount1, scount);
        });
        job1.start();
    }
    catch (error) {
        console.log(`ends1 server error`, error);
    }
};
exports.Ends1 = Ends1;
const Ends2 = () => {
    try {
        console.log('server on: ends2');
        getEnds2();
        const job2 = new cron_1.CronJob(process.env.UPCOMIN_TIME, () => {
            getEnds2();
            console.log(moment().format('YYYY-MM-DD hh:mm:ss'), count, ecount, ecount1, scount);
        });
        job2.start();
    }
    catch (error) {
        console.log(`ends2 server error`, error);
    }
};
exports.Ends2 = Ends2;
const Ends3 = () => {
    try {
        console.log('server on: ends3');
        getEnds3();
        const job3 = new cron_1.CronJob(process.env.PRE_TIME, () => {
            getEnds3();
            console.log(moment().format('YYYY-MM-DD hh:mm:ss'), count, ecount, ecount1, scount);
        });
        job3.start();
    }
    catch (error) {
        console.log(`ends3 server error`, error);
    }
};
exports.Ends3 = Ends3;
const getLeaguePage = (sport_id) => {
    const options = {
        method: 'GET',
        url: process.env.LEAGUE_ENDPOINT,
        qs: { token, sport_id, skip_esports: 'Esports' },
        headers: { 'Content-Type': 'application/json' },
        body: { page: 1, skip_markets: 1 },
        json: true
    };
    request(options, (error, response, body) => {
        console.log(body === null || body === void 0 ? void 0 : body.pager, '===>getLeaguePage');
        if (error) {
            ecount++;
        }
        else {
            count++;
            const data = body;
            if (data && data.pager) {
                const pager = data.pager;
                const page = Math.ceil(pager.total / pager.per_page);
                for (let i = 0; i < page; i++) {
                    getLeague(sport_id, i + 1);
                }
            }
        }
    });
};
exports.getLeaguePage = getLeaguePage;
const getEndedDate = (event_id) => {
    return new Promise((resolve, reject) => {
        const options = {
            method: 'GET',
            url: process.env.ENDED_ENDPOINT,
            headers: { 'Content-Type': 'application/json' },
            qs: { token, event_id, skip_esports: 'Esports' },
            json: true
        };
        request(options, (error, response, body) => __awaiter(void 0, void 0, void 0, function* () {
            console.log(body);
            if (error) {
                reject(error);
            }
            else {
                if (body && body.success && body.results && body.results.length) {
                    const result = body.results[0];
                    if (Number(result.time_status) !== 3) {
                        return reject(body);
                    }
                    const data = {};
                    if (result.time_status) {
                        data.time_status = Number(result.time_status);
                    }
                    if (result.time) {
                        data.time = Number(result.time);
                    }
                    if (result.scores) {
                        data.scores = result.scores;
                    }
                    if (result.events) {
                        data.events = result.events;
                    }
                    if (result.extra) {
                        data.extra = result.extra;
                    }
                    if (result.stats) {
                        data.stats = result.stats;
                    }
                    if (result.ss) {
                        data.ss = result.ss;
                    }
                    try {
                        yield models_1.SportsEndMatchs.updateOne({ id: Number(result.id) }, data);
                    }
                    catch (error) {
                        reject(error);
                    }
                    resolve(result);
                }
                else {
                    reject(body);
                }
            }
        }));
    });
};
exports.getEndedDate = getEndedDate;
const getEndedEvents = (event_id) => {
    const options = {
        method: 'GET',
        url: process.env.ENDED_ENDPOINT,
        headers: { 'Content-Type': 'application/json' },
        qs: { token, event_id, skip_esports: 'Esports' },
        json: true
    };
    request(options, (error, response, body) => __awaiter(void 0, void 0, void 0, function* () {
        if (error) {
            ecount++;
        }
        else {
            count++;
            if (body && body.success && body.results && body.results.length) {
                const results = body.results.filter((event) => Number(event.time_status) === 3);
                for (const i in results) {
                    yield updateEndedEvents(results[i]);
                }
            }
        }
    }));
};
exports.getEndedEvents = getEndedEvents;
// const name = async () => {
//     getEndedEvents('6528522');
// };
// name();
const getEvents1 = () => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, football_1.getFootballLiveMatch)(); // football
    const sportslist = yield models_1.SportsLists.find({ SportId: { $ne: 1 }, status: true }).sort({ order: 1 });
    for (const key in sportslist) {
        getInplayPage(sportslist[key].SportId);
    }
});
const getEvents2 = () => __awaiter(void 0, void 0, void 0, function* () {
    const sportslist = yield models_1.SportsLeagues.aggregate([
        {
            $match: {
                status: true,
                sport_id: { $ne: 1 }
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
            $match: { 'sport.status': true }
        },
        {
            $sort: {
                order: 1,
                'sport.order': 1
            }
        }
    ]);
    for (const key in sportslist) {
        yield getUpcomingPage(sportslist[key].sport_id, sportslist[key].id, moment().format('YYYYMMDD'));
    }
});
const getEvents3 = () => __awaiter(void 0, void 0, void 0, function* () {
    const sportslist = yield models_1.SportsLeagues.aggregate([
        {
            $match: {
                status: true,
                sport_id: { $ne: 1 }
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
            $match: { 'sport.status': true }
        },
        {
            $sort: {
                order: 1,
                'sport.order': 1
            }
        }
    ]);
    console.log(sportslist.length, '==.sportslist.length');
    for (const key in sportslist) {
        for (let index = 0; index < sportslist[key].sport.match_day; index++) {
            // for (let index = 0; index < 4; index++) {
            yield getUpcomingPage(sportslist[key].sport_id, sportslist[key].id, moment().add(index, 'days').format('YYYYMMDD'));
        }
    }
});
const getOdd1 = () => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, football_1.getFootballLiveOdds)();
    const sportsmatchs = yield models_1.SportsMatchs.aggregate([
        {
            $match: {
                time_status: 1,
                sport_id: { $ne: 1 }
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
            $match: {
                'sport.status': true,
                'sport.live': true
            }
        }
    ]);
    for (const key in sportsmatchs) {
        yield getOdds(sportsmatchs[key].id, true);
        if (sportsmatchs[key].bet365_id)
            yield getOddsBet365(sportsmatchs[key].bet365_id, true);
    }
});
const getOdd2 = () => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, football_1.getFootballPreOdds)();
    const lte = Math.floor(moment().add(1, 'days').valueOf() / 1000);
    const sportsmatchs = yield models_1.SportsMatchs.aggregate([
        {
            $match: {
                sport_id: { $ne: 1 },
                time_status: 0,
                time: { $lte: lte }
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
            $match: {
                'sport.status': true,
                'sport.upcoming': true
            }
        }
    ]);
    for (const key in sportsmatchs) {
        yield getOdds(sportsmatchs[key].id, false);
        if (sportsmatchs[key].bet365_id)
            yield getOddsBet365(sportsmatchs[key].bet365_id, false);
    }
});
const getOdd3 = () => __awaiter(void 0, void 0, void 0, function* () {
    const gte = Math.floor(moment().add(1, 'days').valueOf() / 1000);
    const sportsmatchs = yield models_1.SportsMatchs.aggregate([
        {
            $match: {
                sport_id: { $ne: 1 },
                time_status: 0,
                time: { $gte: gte }
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
            $match: {
                'sport.status': true,
                'sport.upcoming': true
            }
        }
    ]);
    for (const key in sportsmatchs) {
        yield getOdds(sportsmatchs[key].id, false, 100);
        if (sportsmatchs[key].bet365_id)
            yield getOddsBet365(sportsmatchs[key].bet365_id, false, 100);
    }
});
const getEnds1 = () => __awaiter(void 0, void 0, void 0, function* () {
    const sportsmatchs = yield models_1.SportsMatchs.find({
        sport_id: { $ne: 1 },
        time_status: 1
    }).select({
        id: 1,
        _id: 0
    });
    const matchIds = sportsmatchs.map((e) => e.id);
    const id_count = 10;
    const pages = Math.ceil(matchIds.length / id_count);
    const sendEventIds = [];
    for (let i = 0; i < pages; i++) {
        let matchId = [];
        if (i === 0) {
            matchId = matchIds.slice(0, i + 1 * id_count);
        }
        else {
            matchId = matchIds.slice(i * id_count, (i + 1) * id_count);
        }
        sendEventIds.push(matchId.join(','));
    }
    for (const i in sendEventIds) {
        (0, exports.getEndedEvents)(sendEventIds[i]);
    }
});
const getEnds2 = () => __awaiter(void 0, void 0, void 0, function* () {
    const lte = Math.floor(moment().add(1, 'days').valueOf() / 1000);
    const sportsmatchs = yield models_1.SportsMatchs.find({
        sport_id: { $ne: 1 },
        time_status: { $ne: 1 },
        time: { $lte: lte }
    }).select({ id: 1, _id: 0 });
    const matchIds = sportsmatchs.map((e) => e.id);
    const id_count = 10;
    const pages = Math.ceil(matchIds.length / id_count);
    const sendEventIds = [];
    for (let i = 0; i < pages; i++) {
        let matchId = [];
        if (i === 0) {
            matchId = matchIds.slice(0, i + 1 * id_count);
        }
        else {
            matchId = matchIds.slice(i * id_count, (i + 1) * id_count);
        }
        sendEventIds.push(matchId.join(','));
    }
    for (const i in sendEventIds) {
        (0, exports.getEndedEvents)(sendEventIds[i]);
    }
});
const getEnds3 = () => __awaiter(void 0, void 0, void 0, function* () {
    const gte = Math.floor(moment().add(1, 'days').valueOf() / 1000);
    const sportsmatchs = yield models_1.SportsMatchs.find({
        sport_id: { $ne: 1 },
        time_status: { $ne: 1 },
        time: { $gte: gte }
    }).select({ id: 1, _id: 0 });
    const matchIds = sportsmatchs.map((e) => e.id);
    const id_count = 10;
    const pages = Math.ceil(matchIds.length / id_count);
    const sendEventIds = [];
    for (let i = 0; i < pages; i++) {
        let matchId = [];
        if (i === 0) {
            matchId = matchIds.slice(0, i + 1 * id_count);
        }
        else {
            matchId = matchIds.slice(i * id_count, (i + 1) * id_count);
        }
        sendEventIds.push(matchId.join(','));
    }
    for (const i in sendEventIds) {
        (0, exports.getEndedEvents)(sendEventIds[i]);
    }
});
const getEnds = () => __awaiter(void 0, void 0, void 0, function* () {
    const sportsmatchs = yield models_1.SportsBetting.aggregate([
        {
            $match: {
                status: 'BET',
                SportId: { $ne: 1 }
            }
        },
        { $group: { _id: '$eventId' } }
    ]);
    const matchIds = sportsmatchs.map((e) => e._id);
    const id_count = 10;
    const pages = Math.ceil(matchIds.length / id_count);
    const sendEventIds = [];
    for (let i = 0; i < pages; i++) {
        let matchId = [];
        if (i === 0) {
            matchId = matchIds.slice(0, i + 1 * id_count);
        }
        else {
            matchId = matchIds.slice(i * id_count, (i + 1) * id_count);
        }
        sendEventIds.push(matchId.join(','));
    }
    for (const i in sendEventIds) {
        (0, exports.getEndedEvents)(sendEventIds[i]);
    }
});
exports.getEnds = getEnds;
const filterOdds = (data) => {
    const odds = {};
    for (const i in data) {
        if (data[i] && data[i].length) {
            odds[i] = data[i].sort((a, b) => Number(b.add_time) - Number(a.add_time))[0];
        }
    }
    return odds;
};
exports.filterOdds = filterOdds;
const filterLiveOdds = (odds, oldOdds) => {
    var _a, _b, _c;
    if (!odds) {
        return {};
    }
    for (const i in odds) {
        if (!oldOdds) {
            odds[i].notUpdate = 0;
        }
        else {
            try {
                let notUpdate = oldOdds[i] && oldOdds[i] && ((_a = oldOdds[i]) === null || _a === void 0 ? void 0 : _a.notUpdate) ? oldOdds[i].notUpdate : 0;
                if (((_b = odds[i]) === null || _b === void 0 ? void 0 : _b.time_str) && odds[i].time_str != oldOdds[i].time_str) {
                    notUpdate = 0;
                }
                else if (((_c = odds[i]) === null || _c === void 0 ? void 0 : _c.add_time) && odds[i].add_time != oldOdds[i].add_time) {
                    notUpdate = 0;
                }
                else {
                    notUpdate = (notUpdate || 0) + 1;
                }
                odds[i].notUpdate = notUpdate;
            }
            catch (error) {
                odds[i].notUpdate = 0;
            }
        }
    }
    return odds;
};
const getOdds = (event_id, isLive, time = 20) => {
    return new Promise((resolve, reject) => {
        if (event_id == 0)
            return resolve('error');
        setTimeout(() => {
            resolve(event_id);
        }, time);
        const options = {
            method: 'GET',
            url: process.env.ODDS_ENDPOINT,
            headers: { 'Content-Type': 'application/json' },
            qs: { event_id, token, skip_esports: 'Esports' },
            json: true
        };
        request(options, (error, response, body) => __awaiter(void 0, void 0, void 0, function* () {
            if (error) {
                ecount++;
            }
            else {
                count++;
                if (body && body.success && body.results && body.results.odds) {
                    try {
                        const newOdds = (0, exports.filterOdds)(body.results.odds);
                        if (isLive) {
                            const sportsMatchs = yield models_1.SportsMatchs.findOne({
                                id: event_id
                            });
                            const odds = filterLiveOdds(newOdds, sportsMatchs === null || sportsMatchs === void 0 ? void 0 : sportsMatchs.odds);
                            yield models_1.SportsMatchs.updateOne({ id: event_id }, { odds });
                        }
                        else {
                            yield models_1.SportsMatchs.updateOne({ id: event_id }, { odds: newOdds });
                        }
                        scount++;
                    }
                    catch (error) {
                        console.log(`getOdds update error`, error);
                        ecount1++;
                    }
                }
            }
        }));
    });
};
const getOddsBet365 = (bet365_id, isLive, time = 20) => {
    return new Promise((resolve, reject) => {
        if (bet365_id == 0)
            return resolve('error');
        setTimeout(() => {
            resolve(bet365_id);
        }, time);
        const options = {
            method: 'GET',
            url: process.env.ODDS_ENDPOINT_BET365,
            headers: { 'Content-Type': 'application/json' },
            qs: { token, FI: bet365_id },
            json: true
        };
        request(options, (error, response, body) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            if (error) {
                ecount++;
            }
            else {
                count++;
                if (body && body.success && ((_a = body.results) === null || _a === void 0 ? void 0 : _a.length)) {
                    try {
                        const results = body.results[0];
                        let bet365_odds = {};
                        for (let marketid in otherMarkets) {
                            if (((_b = results[marketid]) === null || _b === void 0 ? void 0 : _b.sp) && otherMarkets[marketid].status) {
                                bet365_odds[`${marketid}_odds`] = {};
                                for (let marketItemId in otherMarkets[marketid].items) {
                                    if (((_c = results[marketid]) === null || _c === void 0 ? void 0 : _c.sp[marketItemId]) &&
                                        ((_d = results[marketid]) === null || _d === void 0 ? void 0 : _d.sp[marketItemId].odds.length) &&
                                        results[marketid]) {
                                        bet365_odds[`${marketid}_odds`] = Object.assign(Object.assign({}, bet365_odds[`${marketid}_odds`]), { key: (_e = results[marketid]) === null || _e === void 0 ? void 0 : _e.key, updated_at: (_f = results[marketid]) === null || _f === void 0 ? void 0 : _f.updated_at, [marketItemId]: (_g = results[marketid]) === null || _g === void 0 ? void 0 : _g.sp[marketItemId] });
                                    }
                                }
                            }
                        }
                        yield models_1.SportsMatchs.updateOne({ bet365_id }, { bet365_odds });
                        scount++;
                    }
                    catch (error) {
                        console.log(`getOdds update error`, error);
                        ecount1++;
                    }
                }
            }
        }));
    });
};
const getLeague = (sport_id, page) => {
    const options = {
        method: 'GET',
        url: process.env.LEAGUE_ENDPOINT,
        headers: { 'Content-Type': 'application/json' },
        qs: { token, sport_id, skip_esports: 'Esports' },
        body: { page },
        json: true
    };
    request(options, (error, response, body) => __awaiter(void 0, void 0, void 0, function* () {
        if (error) {
            ecount++;
        }
        else {
            count++;
            if (body && body.success && body.results && body.results.length) {
                const results = body.results;
                for (const i in results) {
                    const result = results[i];
                    result.sport_id = sport_id;
                    try {
                        yield models_1.SportsLeagues.updateOne({ id: result.id }, result, {
                            upsert: true
                        });
                    }
                    catch (error) {
                        console.log('getLeague => update', error);
                    }
                }
            }
        }
    }));
};
const getInplayPage = (sport_id) => {
    const options = {
        method: 'GET',
        url: process.env.LIVE_ENDPOINT,
        qs: { token, sport_id, skip_esports: 'Esports' },
        headers: { 'Content-Type': 'application/json' },
        body: { page: 1, skip_markets: 1 },
        json: true
    };
    request(options, (error, response, body) => {
        if (error) {
            ecount++;
        }
        else {
            count++;
            const data = body;
            if (!data || !(data === null || data === void 0 ? void 0 : data.pager))
                return console.log(data);
            const pager = data.pager;
            const page = Math.ceil(pager.total / pager.per_page);
            for (let i = 0; i < page; i++) {
                getInplayEvents(sport_id, i + 1);
            }
        }
    });
};
const getInplayEvents = (sport_id, page) => {
    const options = {
        method: 'GET',
        url: process.env.LIVE_ENDPOINT,
        headers: { 'Content-Type': 'application/json' },
        qs: { token, sport_id, skip_esports: 'Esports' },
        body: { page },
        json: true
    };
    request(options, (error, response, body) => __awaiter(void 0, void 0, void 0, function* () {
        if (error) {
            ecount++;
        }
        else {
            count++;
            if (body && body.success && body.results && body.results.length) {
                const results = body.results;
                for (const i in results) {
                    const result = results[i];
                    const time_status = Number(result.time_status);
                    if (result.away && result.home && result.time && time_status !== 2 && time_status !== 3) {
                        try {
                            const sportsLeagues = yield models_1.SportsLeagues.findOne({
                                id: result.league.id
                            });
                            if (sportsLeagues === null || sportsLeagues === void 0 ? void 0 : sportsLeagues.status) {
                                const exists = yield models_1.SportsFixMatchs.findOne({
                                    id: result.id
                                });
                                if (!exists) {
                                    yield models_1.SportsMatchs.updateOne({ id: result.id }, result, {
                                        upsert: true
                                    });
                                    scount++;
                                }
                            }
                        }
                        catch (error) {
                            ecount1++;
                        }
                    }
                    else if (result.time && result.sport_id === '2' && time_status !== 2 && time_status !== 3) {
                        try {
                            const sportsLeagues = yield models_1.SportsLeagues.findOne({
                                id: result.league.id
                            });
                            if (sportsLeagues === null || sportsLeagues === void 0 ? void 0 : sportsLeagues.status) {
                                const exists = yield models_1.SportsFixMatchs.findOne({
                                    id: result.id
                                });
                                if (!exists) {
                                    yield models_1.SportsMatchs.updateOne({ id: result.id }, result, {
                                        upsert: true
                                    });
                                    scount++;
                                }
                            }
                        }
                        catch (error) {
                            ecount1++;
                        }
                    }
                }
            }
        }
    }));
};
const updateUpcomingEvents = (results) => __awaiter(void 0, void 0, void 0, function* () {
    for (const i in results) {
        const result = results[i];
        const time_status = Number(result.time_status);
        if (result.away && result.home && result.time && time_status !== 2 && time_status !== 3) {
            try {
                const exists = yield models_1.SportsFixMatchs.findOne({
                    id: result.id
                });
                if (!exists) {
                    yield models_1.SportsMatchs.updateOne({
                        time_status: { $ne: 3 },
                        id: result.id
                    }, result, { upsert: true });
                }
                scount++;
            }
            catch (error) {
                ecount1++;
            }
        }
        else if (result.time && result.sport_id === '2' && time_status !== 2 && time_status !== 3) {
            try {
                const exists = yield models_1.SportsFixMatchs.findOne({
                    id: result.id
                });
                if (!exists) {
                    yield models_1.SportsMatchs.updateOne({
                        time_status: { $ne: 3 },
                        id: result.id
                    }, result, { upsert: true });
                }
                scount++;
            }
            catch (error) {
                ecount1++;
            }
        }
    }
});
const getUpcomingPage = (sport_id, league_id, day) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve('success');
        }, 8500);
        const options = {
            method: 'GET',
            url: process.env.PRE_ENDPOINT,
            qs: { token, sport_id, league_id, skip_esports: 'Esports' },
            headers: { 'Content-Type': 'application/json' },
            body: { page: 1, skip_markets: 1, day },
            json: true
        };
        request(options, (error, response, body) => {
            if (error) {
                ecount++;
            }
            else {
                count++;
                if (body && body.pager && body.results) {
                    const pager = body.pager;
                    const page = Math.ceil(pager.total / pager.per_page);
                    if (page === 1) {
                        if (body && body.success && body.results.length) {
                            updateUpcomingEvents(body.results);
                        }
                    }
                    else if (page > 1) {
                        for (let i = 0; i < page; i++) {
                            getUpcomingEvents(sport_id, league_id, i + 1, day);
                        }
                    }
                }
            }
        });
    });
};
const getUpcomingEvents = (sport_id, league_id, page, day) => {
    const options = {
        method: 'GET',
        url: process.env.PRE_ENDPOINT,
        headers: { 'Content-Type': 'application/json' },
        qs: { token, sport_id, league_id, skip_esports: 'Esports' },
        body: { page, day },
        json: true
    };
    request(options, (error, response, body) => __awaiter(void 0, void 0, void 0, function* () {
        if (error) {
            ecount++;
        }
        else {
            count++;
            if (body && body.success && body.results && body.results.length) {
                updateUpcomingEvents(body.results);
            }
        }
    }));
};
const checkBet = (eventId) => __awaiter(void 0, void 0, void 0, function* () {
    const isbet = yield models_1.SportsBetting.findOne({ eventId, status: 'BET' });
    if (isbet)
        return true;
    return false;
});
exports.checkBet = checkBet;
const checkFix = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const is = yield models_1.SportsFixMatchs.findOne({ id });
    if (is)
        return true;
    return false;
});
exports.checkFix = checkFix;
const updateEndedEvents = (result) => {
    return new Promise((resolve, reject) => {
        if (!result)
            return resolve('error');
        setTimeout(() => {
            resolve('success');
        }, 20);
        try {
            const time_status = Number(result.time_status);
            models_1.SportsLists.findOne({
                SportId: Number(result.sport_id)
            }).then((sportslist) => __awaiter(void 0, void 0, void 0, function* () {
                if (!result.id && !sportslist) {
                    return console.log(`result.id => null ${result.id}`);
                }
                else if (time_status === 0 || time_status === 1) {
                    const id = Number(result.id);
                    const exists = yield (0, exports.checkFix)(id);
                    if (exists) {
                        yield models_1.SportsFixMatchs.deleteOne({ id, sport_id: Number(result.sport_id) });
                        yield models_1.SportsMatchs.updateOne({ id, sport_id: Number(result.sport_id) }, result, {
                            upsert: true
                        });
                    }
                    else {
                        yield models_1.SportsMatchs.updateOne({ id, sport_id: Number(result.sport_id) }, result);
                    }
                }
                else {
                    const id = Number(result.id);
                    const isbet = yield (0, exports.checkBet)(id);
                    yield models_1.SportsMatchs.deleteOne({ id, sport_id: Number(result.sport_id) });
                    const exists = yield (0, exports.checkFix)(id);
                    if (!isbet || (exists && time_status !== 3)) {
                        return;
                    }
                    else if (time_status === 2) {
                        yield models_1.SportsFixMatchs.updateOne({ id, sport_id: Number(result.sport_id) }, result, {
                            upsert: true
                        });
                        scount++;
                    }
                    else if (time_status === 3) {
                        if (result.ss == null) {
                            yield models_1.SportsFixMatchs.updateOne({ id, sport_id: Number(result.sport_id) }, result, {
                                upsert: true
                            });
                            scount++;
                        }
                        else {
                            const isDraw = result.ss.split('-')[0] === result.ss.split('-')[1];
                            if (isDraw && !sportslist.draw) {
                                yield models_1.SportsFixMatchs.updateOne({ id, sport_id: Number(result.sport_id) }, result, {
                                    upsert: true
                                });
                                scount++;
                            }
                            else if (time_status === 3) {
                                if (exists) {
                                    yield models_1.SportsFixMatchs.deleteOne({ id, sport_id: Number(result.sport_id) });
                                }
                                yield models_1.SportsEndMatchs.updateOne({ id, sport_id: Number(result.sport_id) }, result, {
                                    upsert: true
                                });
                                scount++;
                            }
                        }
                    }
                    else if (time_status === 4 ||
                        time_status === 5 ||
                        time_status === 6 ||
                        time_status === 7 ||
                        time_status === 8 ||
                        time_status === 9 ||
                        time_status === 10 ||
                        time_status === 99) {
                        yield models_1.SportsFixMatchs.updateOne({ id, sport_id: Number(result.sport_id) }, result, {
                            upsert: true
                        });
                        scount++;
                    }
                    else {
                        console.log(`updateEndedEvents result`, result);
                    }
                }
            }));
        }
        catch (error) {
            console.log(`updateEndedEvents error`, error);
            ecount1++;
        }
    });
};
