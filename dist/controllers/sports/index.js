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
exports.sportsResettle = exports.sportsBetResult = exports.sportsBetCashOut = exports.getMarkets = exports.getBettingHistory = exports.getBetHistory = exports.SportsBet = exports.getSportTemas = exports.getSportMatchs = exports.getSportsMatchs = exports.getSportsOdds = exports.getSportsLists = void 0;
const md5 = require("md5");
const moment = require("moment");
const request = require("request");
const sportsrealtime_1 = require("./sportsrealtime");
const sportsbets_1 = require("./sportsbets");
const sportsresult_1 = require("./sportsresult");
const base_1 = require("../base");
const models_1 = require("../../models");
const football_1 = require("./football");
const utils_1 = require("../../utils");
const translate_1 = require("../../utils/translate");
let defaultMarkets = [];
let otherMarkets = {};
const getMarket = () => __awaiter(void 0, void 0, void 0, function* () {
    const _markets = yield models_1.Markets_Group.aggregate([
        {
            $lookup: {
                from: "sports_market_lists",
                localField: "id",
                foreignField: "groupId",
                as: "items",
            },
        },
        {
            $project: { "items.description": 0, 'items.sportId': 0, 'items.createdAt': 0, 'items.updatedAt': 0 }
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
const getSportsLists = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { EventStatus, lang } = req.body;
    const query1 = {};
    const query2 = {};
    const gte = Math.floor(Date.now().valueOf() / 1000);
    if (EventStatus) {
        query1.time_status = 0;
    }
    if (EventStatus === 'ALL') {
        const sportslist = yield models_1.SportsLists.aggregate([
            { $match: { status: true } },
            {
                $lookup: {
                    from: 'sports_leagues',
                    localField: 'SportId',
                    foreignField: 'sport_id',
                    as: 'leagues'
                }
            },
            {
                $unwind: '$leagues'
            },
            {
                $match: { 'leagues.status': true }
            },
            {
                $group: {
                    _id: {
                        icon: '$_id',
                        SportId: '$SportId',
                        SportName: '$SportName',
                        color: '$color',
                        status: '$status',
                        live: '$live',
                        upcoming: '$upcoming',
                        id: '$_id',
                        order: '$order',
                        img: '$img'
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: {
                    '_id.order': 1
                }
            },
            {
                $match: { '_id.status': true }
            },
            {
                $project: {
                    _id: '$_id.id',
                    icon: '$_id.icon',
                    color: '$_id.color',
                    SportId: '$_id.SportId',
                    SportName: '$_id.SportName',
                    live: '$_id.live',
                    upcoming: '$_id.upcoming',
                    img: '$_id.img',
                    count: '$count'
                }
            }
        ]);
        return res.json(sportslist);
    }
    if (EventStatus === 'LIVE') {
        query1.time_status = 1;
        query2.live = true;
    }
    if (EventStatus === 'HOUR') {
        const lte = Math.floor(moment().add(1, 'hours').valueOf() / 1000);
        query1.time = { $gte: gte, $lte: lte };
        query2.upcoming = true;
    }
    if (EventStatus === 'TODAY') {
        const lte = Math.floor(moment().add(1, 'days').valueOf() / 1000);
        query1.time = { $gte: gte, $lte: lte };
        query2.upcoming = true;
    }
    if (EventStatus === 'PRE') {
        query1.time = { $gte: gte };
        query2.upcoming = true;
    }
    query1.astatus = true;
    query1.odds = { $nin: [{}, [], null] };
    const data = yield models_1.SportsMatchs.aggregate([
        {
            $match: query1
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
            $group: {
                _id: {
                    icon: '$sport.icon',
                    SportId: '$sport.SportId',
                    SportName: '$sport.SportName',
                    color: '$sport.color',
                    status: '$sport.status',
                    live: '$sport.live',
                    upcoming: '$sport.upcoming',
                    id: '$sport._id',
                    order: '$sport.order',
                    img: '$sport.img'
                },
                count: { $sum: 1 }
            }
        },
        {
            $sort: {
                '_id.order': 1
            }
        },
        {
            $match: { '_id.status': true }
        },
        {
            $project: {
                _id: '$_id.id',
                icon: '$_id.icon',
                color: '$_id.color',
                SportId: '$_id.SportId',
                SportName: '$_id.SportName',
                live: '$_id.live',
                upcoming: '$_id.upcoming',
                img: '$_id.img',
                count: '$count'
            }
        },
        {
            $match: query2
        }
    ]);
    let result = data;
    if (lang && lang !== "en" && data.length) {
        const names = result.map((e) => e.SportName);
        const translatedTexts = yield (0, translate_1.translateText)(names, lang);
        if (translatedTexts.length > 0) {
            result = result.map((e, i) => (Object.assign(Object.assign({}, e), { SportName: translatedTexts[i].text })));
        }
    }
    return res.json(result);
});
exports.getSportsLists = getSportsLists;
const getSportsOdds = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id, lang } = req.body;
        let event = yield models_1.SportsMatchs.findOne({
            $and: [{ time_status: { $ne: 3 } }, { time_status: { $ne: 2 } }, { id }]
        });
        if (event) {
            const activeSports = yield models_1.SportsLists.findOne({
                SportId: event.sport_id
            });
            if (lang && lang !== "en") {
                let names = [event.home.name, event.away.name];
                if (event.sport_id === 1 && event.time_status === 1) {
                    const markets = event.odds.map((e) => !utils_1.NOT_TRANSLATE.includes(e.name) ? e.name : "1");
                    names = [...names, ...markets];
                }
                if (event.sport_id === 1 && event.time_status === 0) {
                    const markets = (((_a = event.odds[0]) === null || _a === void 0 ? void 0 : _a.bets) || []).map((e) => !utils_1.NOT_TRANSLATE.includes(e.name) ? e.name : "1");
                    names = [...names, ...markets];
                }
                const translatedTexts = yield (0, translate_1.translateText)(names, lang);
                if (translatedTexts.length > 0) {
                    event.home.name = translatedTexts[0].text;
                    event.away.name = translatedTexts[1].text;
                    if (event.sport_id === 1) {
                        event.odds = event.odds.map((odd, index) => (Object.assign(Object.assign(Object.assign({}, odd), (((event === null || event === void 0 ? void 0 : event.time_status) === 1 && !utils_1.NOT_TRANSLATE.includes(odd.name)) && {
                            name: translatedTexts[index + 2].text.replaceAll("поворота", "угловой").replaceAll("virage", "corner"),
                            name_en: odd.name,
                        })), ((event === null || event === void 0 ? void 0 : event.time_status) === 0 && {
                            bets: odd.bets.map((bet, i) => (Object.assign(Object.assign({}, bet), { name: utils_1.NOT_TRANSLATE.includes(bet.name) ? bet.name : translatedTexts[i + 2].text, name_en: bet.name })))
                        }))));
                    }
                }
            }
            return res.json({ state: true, event, activeSports });
        }
        return res.json({ state: false });
    }
    catch (error) {
        console.error("Error Get Sports Odds", error);
        return res.status(402).json("Internal Server Error");
    }
});
exports.getSportsOdds = getSportsOdds;
const getSportsMatchs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { EventStatus, SportId, lang } = req.body;
    const gte = Math.floor(Date.now().valueOf() / 1000);
    let query = {}, squery = {};
    if (EventStatus === 'LIVE') {
        query = {
            sport_id: Number(SportId),
            time_status: Number(1)
        };
        squery = {
            'sport.status': true,
            'sport.live': true
        };
    }
    else if (EventStatus === 'HOUR') {
        const lte = Math.floor(moment().add(1, 'hours').valueOf() / 1000);
        query = {
            sport_id: Number(SportId),
            time_status: Number(0),
            time: { $gte: gte, $lte: lte }
        };
        squery = {
            'sport.status': true,
            'sport.upcoming': true
        };
    }
    else if (EventStatus === 'TODAY') {
        const lte = Math.floor(moment().add(1, 'days').valueOf() / 1000);
        query = {
            sport_id: Number(SportId),
            time_status: Number(0),
            time: { $gte: gte, $lte: lte }
        };
        squery = {
            'sport.status': true,
            'sport.upcoming': true
        };
    }
    else if (EventStatus === 'PRE') {
        query = {
            sport_id: Number(SportId),
            time_status: Number(0),
            time: { $gte: gte }
        };
        squery = {
            'sport.status': true,
            'sport.upcoming': true
        };
    }
    else {
        return res.json([]);
    }
    let result = [];
    if (query.sport_id === 1) {
        result = yield (0, football_1.getFootballMatchs)(query, squery);
    }
    else {
        result = yield (0, exports.getSportMatchs)(query, squery, EventStatus);
    }
    if (lang && lang !== "en" && result.length) {
        const names = [];
        const teams = result.reduce((ary, row) => {
            names.push(row.LeagueName);
            const temp = row.events.reduce((a, e) => {
                var _a, _b, _c, _d;
                const r = [...a, e.home.name, e.away.name];
                if (e.sport_id === 1) {
                    if (query.time_status === 1) {
                        r.push(e.f_status.long);
                    }
                    if (query.time_status === 0 && ((_b = (_a = e.odds[0]) === null || _a === void 0 ? void 0 : _a.bets) === null || _b === void 0 ? void 0 : _b.length)) {
                        r.push((_d = (_c = e.odds[0]) === null || _c === void 0 ? void 0 : _c.bets[0]) === null || _d === void 0 ? void 0 : _d.name);
                    }
                }
                return r;
            }, []);
            return [...ary, ...temp];
        }, []);
        const param = [...names, ...teams];
        const translatedTexts = yield (0, translate_1.translateText)(param, lang);
        if (translatedTexts.length > 0) {
            let num = names.length;
            result = result.reduce((ary, row, index) => {
                const temp = row.events.map((e) => {
                    var _a;
                    const tEvent = e;
                    tEvent.home.name = translatedTexts[num].text;
                    tEvent.away.name = translatedTexts[num + 1].text;
                    if (e.sport_id === 1) {
                        if (query.time_status === 1) {
                            tEvent.f_status.long = translatedTexts[num + 2].text;
                            num += 3;
                        }
                        else if (query.time_status === 0 && ((_a = tEvent.odds[0].bets) === null || _a === void 0 ? void 0 : _a.length)) {
                            tEvent.odds[0].bets[0].name = translatedTexts[num + 2].text;
                            num += 3;
                        }
                    }
                    else {
                        num += 2;
                    }
                    return tEvent;
                });
                const _row = Object.assign(Object.assign({}, row), { LeagueName: translatedTexts[index].text, events: temp });
                return [...ary, _row];
            }, []);
        }
    }
    console.log(result.length, '===>SportsMatchs Count============');
    return res.json(result);
});
exports.getSportsMatchs = getSportsMatchs;
const getSportMatchs = (query, squery, EventStatus) => __awaiter(void 0, void 0, void 0, function* () {
    query.astatus = true;
    query.odds = { $ne: {} };
    const results = yield models_1.SportsMatchs.aggregate([
        {
            $match: query
        },
        {
            $sort: {
                time: 1
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
            $match: squery
        },
        {
            $group: {
                _id: {
                    LeagueId: '$league.id',
                    LeagueName: '$league.name'
                },
                events: {
                    $push: {
                        _id: '$_id',
                        id: '$id',
                        sport_id: '$sport_id',
                        league: '$league',
                        home: '$home',
                        away: '$away',
                        odds: '$odds',
                        bet365_odds: '$bet365_odds',
                        teams: '$teams',
                        ss: '$ss',
                        scores: '$scores',
                        points: '$points',
                        time: '$time',
                        timer: '$timer',
                        time_status: '$time_status'
                    }
                }
            }
        },
        {
            $lookup: {
                from: 'sports_leagues',
                localField: '_id.LeagueId',
                foreignField: 'id',
                as: 'league'
            }
        },
        {
            $unwind: '$league'
        },
        {
            $match: {
                'league.status': true
            }
        },
        {
            $sort: {
                'league.order': 1,
                'events.time': 1,
                '_id.LeagueName': 1
            }
        },
        {
            $project: {
                _id: 0,
                LeagueId: '$_id.LeagueId',
                LeagueName: '$_id.LeagueName',
                events: '$events'
            }
        }
    ]);
    // return results;
    return results.map((row) => {
        const events = row.events.map((event) => {
            let num = Object.keys((event === null || event === void 0 ? void 0 : event.odds) || {}).length;
            // if (EventStatus === 'LIVE')
            //     return { ...event, bet365_odds: {}, markets: num }
            // num = Object.keys(event?.bet365_odds || {}).reduce((num, key) => {
            //     return num += Object.keys(event.bet365_odds[key]).reduce((n, k) => {
            //         if (event.bet365_odds[key][k]?.odds && event.bet365_odds[key][k].odds.length) {
            //             n += 1;
            //         }
            //         return n;
            //     }, 0);
            // }, num);
            return Object.assign(Object.assign({}, event), { markets: num });
        });
        return Object.assign(Object.assign({}, row), { events });
    });
});
exports.getSportMatchs = getSportMatchs;
const getSportTemas = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // const { SportId } = req.body;
    // const options = {
    //     method: 'GET',
    //     url: process.env.TEAM_ENDPOINT as string,
    //     headers: { 'Content-Type': 'application/json' },
    //     qs: { token: process.env.SPORTSBOOK_APIKEY, sport_id: SportId },
    //     json: true
    // };
    // request(options, async (error: Error, response: IncomingMessage, body: ApiResponse<OddsData>) => {
    //     if (error) {
    //         res.status(400).json("BetsAPI error!");
    //     } else {
    //         if (body && body.success && body.results && body.results.odds) {
    //             const newOdds = await filterOdds(body.results.odds);
    //             if (odds?.id !== newOdds[odds.marketId]?.id) {
    //                 resolve(true);
    //             } else {
    //                 resolve(false);
    //             }
    //         }
    //     }
    // })
});
exports.getSportTemas = getSportTemas;
const saveBet = (data, isFreeBet, selectedFreeBet) =>
    __awaiter(void 0, void 0, void 0, function* () {
        try {
            const sportsBets = new models_1.SportsBets(data);
            const bets = data.bets;
            for (const i in bets) {
                bets[i].betId = sportsBets._id;
                bets[i].stake = sportsBets.stake;
                bets[i].profit = (0, base_1.NumberFix)(sportsBets.odds * sportsBets.stake, 2);
                if(selectedFreeBet) {
                    bets[i].profit = sportsBets.profit;
                    bets[i].isFreeBet = isFreeBet;
                    bets[i].selectedFreeBet = selectedFreeBet;
                }
            }
            yield sportsBets.save();
            yield models_1.SportsBetting.insertMany(bets);
        } catch (error) {
            console.error(`Error Saving Betting => `, error);
        }
    });
const getOdds = (event_id, odds) => {
    return new Promise((resolve, reject) => {
        const options = {
            method: 'GET',
            url: process.env.ODDS_ENDPOINT,
            headers: { 'Content-Type': 'application/json' },
            qs: { token: process.env.SPORTSBOOK_APIKEY, event_id },
            json: true
        };
        request(options, (error, response, body) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            if (error) {
                resolve(true);
            }
            else {
                if (body && body.success && body.results && body.results.odds) {
                    const newOdds = yield (0, sportsrealtime_1.filterOdds)(body.results.odds);
                    if ((odds === null || odds === void 0 ? void 0 : odds.id) !== ((_a = newOdds[odds.marketId]) === null || _a === void 0 ? void 0 : _a.id)) {
                        resolve(true);
                    }
                    else {
                        resolve(false);
                    }
                }
            }
        }));
    });
};
const getOddsBet365 = (bet365_id, odds) => {
    return new Promise((resolve, reject) => {
        const options = {
            method: 'GET',
            url: process.env.ODDS_ENDPOINT_BET365,
            headers: { 'Content-Type': 'application/json' },
            qs: { token: process.env.SPORTSBOOK_APIKEY, FI: bet365_id },
            json: true
        };
        request(options, (error, response, body) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            if (error) {
                resolve(true);
            }
            else {
                if (body && body.success && ((_a = body.results) === null || _a === void 0 ? void 0 : _a.length)) {
                    try {
                        const newOdds = body.results[0];
                        if (newOdds[odds.pId] && ((_b = newOdds[odds.pId]) === null || _b === void 0 ? void 0 : _b.sp[odds.marketId]) && ((_c = newOdds[odds.pId]) === null || _c === void 0 ? void 0 : _c.sp[odds.marketId].odds.length)) {
                            console.log((_d = newOdds[odds.pId]) === null || _d === void 0 ? void 0 : _d.sp[odds.marketId].odds, "------", odds);
                            const odd = (_e = newOdds[odds.pId]) === null || _e === void 0 ? void 0 : _e.sp[odds.marketId].odds.find((row) => row.id === odds.id && row.odds === odds.odds);
                            if (odd) {
                                resolve(false);
                            }
                            else {
                                resolve(true);
                            }
                        }
                        else {
                            resolve(true);
                        }
                        let bet365_odds = {};
                        for (let marketid in otherMarkets) {
                            if (((_f = newOdds[marketid]) === null || _f === void 0 ? void 0 : _f.sp) && otherMarkets[marketid].status) {
                                bet365_odds[`${marketid}_odds`] = {};
                                for (let marketItemId in otherMarkets[marketid].items) {
                                    if (((_g = newOdds[marketid]) === null || _g === void 0 ? void 0 : _g.sp[marketItemId]) && ((_h = newOdds[marketid]) === null || _h === void 0 ? void 0 : _h.sp[marketItemId].odds.length) && newOdds[marketid]) {
                                        bet365_odds[`${marketid}_odds`] = Object.assign(Object.assign({}, bet365_odds[`${marketid}_odds`]), { key: (_j = newOdds[marketid]) === null || _j === void 0 ? void 0 : _j.key, updated_at: (_k = newOdds[marketid]) === null || _k === void 0 ? void 0 : _k.updated_at, [marketItemId]: (_l = newOdds[marketid]) === null || _l === void 0 ? void 0 : _l.sp[marketItemId] });
                                    }
                                }
                            }
                        }
                        yield models_1.SportsMatchs.updateOne({ bet365_id }, { bet365_odds });
                    }
                    catch (error) {
                        console.log(`getOdds update error`, error);
                        resolve(true);
                    }
                }
            }
        }));
    });
};
const getEndedEvents = (event_id, odds, bet) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        const options = {
            method: 'GET',
            url: process.env.ENDED_ENDPOINT,
            headers: { 'Content-Type': 'application/json' },
            qs: { token: process.env.SPORTSBOOK_APIKEY, event_id },
            json: true
        };
        request(options, (error, response, body) => __awaiter(void 0, void 0, void 0, function* () {
            if (error) {
                return resolve(2);
            }
            if (body && body.success && body.results && body.results[0]) {
                const result = body.results[0];
                const time_status = Number(result.time_status);
                if (time_status === 0) {
                    if (Number(result.time) * 1000 > Date.now()) {
                        return resolve(0);
                    }
                    else {
                        return resolve(3);
                    }
                }
                else if (time_status === 1) {
                    const update = !bet.isBet365 ?
                        yield getOdds(event_id, odds) :
                        yield getOddsBet365(bet.bet365Id, odds);
                    ;
                    if (update) {
                        return resolve(4);
                    }
                    if (bet.oddType === 'over') {
                        const settled = yield (0, sportsresult_1.bettingSettled)({
                            data: result,
                            bet
                        });
                        console.log('============settled============');
                        console.log(settled);
                        console.log('============settled============');
                        if (settled.status !== 'LOST') {
                            return resolve(4);
                        }
                    }
                    return resolve(1);
                }
                else {
                    return resolve(2);
                }
            }
            else {
                return resolve(2);
            }
        }));
    });
});
const SportsBet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { type, userId, currency, stake, isFreeBet, selectedFreeBet } = req.body;

    if(!isFreeBet && stake <= 0){
        return res.status(402).json("Stake amount not puted correclty");
    }

    if (isFreeBet && !selectedFreeBet ) {
        return res.status(402).json('Please select frebet option');
    }
 
    const betsId = md5(Date.now().toString());
    const betlimit = yield (0, base_1.checkBetLimit)(userId);
    if (!betlimit)
        return res.status(403).json("Your Bet limited !");
    if (type === 'multi') {
        const betsData = [];
        const bets = req.body.data.bets;
        for (const i in bets) {
            const finished = yield getEndedEvents(bets[i].eventId, bets[i].oddData, bets[i]);
            if (finished === 4) {
                bets[i].updated = true;
                console.log(`userId`, userId, bets[i].eventId);
            }
            else if (finished === 2 || finished === 3) {
                bets[i].finished = true;
            }
            else if (finished === 1) {
                const sportsList = yield models_1.SportsLists.findOne({
                    SportId: bets[i].SportId,
                    status: true,
                    live: true
                });
                if (!sportsList) {
                    bets[i].finished = true;
                    console.log(`finished-live`, userId);
                }
                else {
                    const { eventId, marketId, oddId } = bets[i];
                    bets[i].betStatus = "live";
                    const item = yield models_1.SportsMatchs.findOne({
                        id: eventId,
                        [`odds.${marketId}.id`]: oddId
                    });
                    if (!item) {
                        bets[i].updated = true;
                    }
                    else {
                        if (item.odds[marketId].notUpdate > 11) {
                            bets[i].updated = true;
                        }
                    }
                }
            }
            else if (finished === 0) {
                const sportsList = yield models_1.SportsLists.findOne({
                    SportId: bets[i].SportId,
                    status: true,
                    upcoming: true
                });
                if (!sportsList) {
                    bets[i].finished = true;
                    console.log(`finished-upcoming`, userId);
                }
            }
            if (finished === 3) {
                console.log(`bet`, userId);
            }
            betsData.push(bets[i]);
        }
        const data = betsData.filter((e) => e.finished !== true && e.updated !== true);
        const ufData = betsData.filter((e) => e.finished === true || e.updated === true);
        req.body.data.bets = data;
        if (ufData.length > 0)
            return res.status(400).json('Bet rejected. Odds changed.');

        if(stake > 0){
            const isBet = yield (0, base_1.getActiveBet)({
                userId,
                currency,
                amount: stake
            });
            const checked = yield (0, base_1.checkBalance)({
                userId,
                currency,
                amount: stake
            });
            if (!checked)
                return res.status(400).json('Balances not enough!');
            if (!isBet)
                return res.status(400).json('Max bet limit has been reached. Please wait until your active bets are settled.');
            console.log(data, "==>data.multi");
            yield (0, base_1.handleBet)({
                req,
                currency,
                userId,
                amount: stake * -1,
                type: 'sports-multi-bet',
                status: false,
                info: (0, base_1.generatInfo)()
            });
            yield models_1.Users.updateOne({ _id: userId }, { last_bet: new Date(), last_game: "sports" });
            req.body.data.potential = (0, base_1.fShortNumber)(data.reduce((sum, { odds }) => (sum *= Number(odds)), Number(stake)), 5);
            req.body.data.odds = (0, base_1.fShortNumber)(data.reduce((sum, { odds }) => (sum *= Number(odds)), 1), 5);
            yield (0, base_1.checkSportsBonus)({
                userId,
                amount: stake, type: "multi",
                odds: req.body.data.odds,
                bets: data
            });
        }

        if (isFreeBet && selectedFreeBet) {
            const missionhis = yield models_1.MissionShopsHistories.findById(selectedFreeBet);
            if(!missionhis)
                return res.status(402).json('Freebet option not found');

            req.body.data.odds = (0, base_1.fShortNumber)(data.reduce((sum, { odds }) => (sum *= Number(odds)), 1), 5);
            req.body.data.profit = (0, base_1.NumberFix)(missionhis.payout * req.body.data.odds, 2);
            
            missionhis.activate = true;
            missionhis.status = 'activated';
            yield missionhis.save();
        }
            
        req.body.data.betsId = betsId;
        yield saveBet(req.body.data, isFreeBet, selectedFreeBet);
        req.body.data.bets = data;
        return res.json({ data: req.body, betsId });
    }
    else {
        const betsData = [];
        for (const i in req.body.data) {
            const data = req.body.data[i];
            const finished = data.betType === 1 ?
                yield (0, football_1.getSoccerEndedEvents)(data.bets[0].eventId, data.bets[0].oddData, data.bets[0]) :
                yield getEndedEvents(data.bets[0].eventId, data.bets[0].oddData, data.bets[0]);
            console.log('finished => ', finished);
            if (finished === 4) {
                data.bets[0].updated = true;
                console.log(`userId`, userId, data.bets[0].eventId);
            }
            else if (finished === 2 || finished === 3) {
                data.bets[0].finished = true;
            }
            else if (finished === 1) {
                const sportsList = yield models_1.SportsLists.findOne({
                    SportId: data.bets[0].SportId,
                    status: true,
                    live: true
                });
                if (!sportsList) {
                    data.bets[0].finished = true;
                    console.log(`finished-live`, userId);
                }
                else if (data.bets[0].SportId !== 1) {
                    const { eventId, marketId, oddId } = data.bets[0];
                    data.bets[0].betStatus = "live";
                    const item = yield models_1.SportsMatchs.findOne({
                        id: eventId,
                        [`odds.${marketId}.id`]: oddId
                    });
                    if (!item) {
                        data.bets[0].updated = true;
                    }
                    else {
                        if (item.odds[marketId].notUpdate > 11) {
                            data.bets[0].updated = true;
                        }
                    }
                }
            }
            else if (finished === 0) {
                const sportsList = yield models_1.SportsLists.findOne({
                    SportId: data.bets[0].SportId,
                    status: true,
                    upcoming: true
                });
                if (!sportsList) {
                    data.bets[0].finished = true;
                    console.log(`finished-upcoming`, userId);
                }
            }
            if (finished === 3) {
                console.log(`bet`, userId);
            }
            data.betsId = betsId;
            betsData.push(data);
        }
        req.body.data = betsData;
        const data = betsData.filter((e) => e.bets[0].finished !== true && e.bets[0].updated !== true);
        if (data.length === 0) {
            console.log("The Event Finished!");
            return res.json({ data: req.body, status: false });
        }

        if(!isFreeBet && stake > 0 ){
            const tstake = data.reduce((sum, { stake }) => (sum += Number(stake)), 0);
            const isBet = yield (0, base_1.getActiveBet)({
                userId,
                currency,
                amount: tstake
            });
            const checked = yield (0, base_1.checkBalance)({
                userId,
                currency,
                amount: tstake
            });
            if (!checked)
                return res.status(402).json('Balances not enough!');
            if (!isBet)
                return res.status(402).json('Max bet limit has been reached. Please wait until your active bets are settled.');
            console.log(data, "==>data");
            yield (0, base_1.handleBet)({
                req,
                currency,
                userId,
                amount: tstake * -1,
                type: 'sports-single-bet',
                info: (0, base_1.generatInfo)()
            });
            yield (0, base_1.checkSportsBonus)({
                userId,
                amount: tstake, type: "single",
                odds: data[0].odds,
                bets: data[0].bets
            });
        }
        
        if(isFreeBet && selectedFreeBet){
            const missionhis = yield models_1.MissionShopsHistories.findById(selectedFreeBet);
            if(!missionhis)
            return res.status(402).json('Freebet option not found');

            data[0].profit = (0, base_1.NumberFix)(missionhis.payout * data[0].odds, 2);
            
            missionhis.activate = true;
            missionhis.status = 'activated';
            yield missionhis.save();
        }
        
        yield models_1.Users.updateOne({ _id: userId }, { last_bet: new Date(), last_game: "sports" });
        for (const i in data) {
            yield saveBet(data[i], isFreeBet, selectedFreeBet);
        }
        return res.json({ data: req.body, betsId });
    }
});
exports.SportsBet = SportsBet;
const getBetHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { betsId } = req.body;
    const data = yield models_1.SportsBets.aggregate([
        {
            $match: { betsId }
        },
        {
            $lookup: {
                from: 'sports_lists',
                localField: 'betType',
                foreignField: 'SportId',
                as: 'sport'
            }
        },
        {
            $lookup: {
                from: 'sports_bettings',
                localField: '_id',
                foreignField: 'betId',
                as: 'bettings'
            }
        },
        {
            $lookup: {
                from: 'currencies',
                localField: 'currency',
                foreignField: '_id',
                as: 'currency'
            }
        },
        {
            $unwind: '$currency'
        },
        {
            $project: {
                'currency.abi': 0
            }
        },
        {
            $sort: { createdAt: -1 }
        }
    ]);
    if (!data.length) {
        res.status(400).json('The URL is invalid.');
    }
    else {
        const type = data[0].type;
        let count = 0;
        const user = yield models_1.Users.findById((0, base_1.ObjectId)(data[0].userId)).select({
            username: 1,
            _id: 0,
            rolesId: 0
        });
        if (type == 'multi') {
            count = data[0].bettings.length;
        }
        else {
            count = data.length;
        }
        const total = data.reduce((t, { bettings }) => (t += bettings.reduce((s, { odds }) => (s *= Number(odds)), 1)), 0);
        res.json({ data, username: `${user.username.slice(0, 2)}*****`, type, count, total });
    }
});
exports.getBetHistory = getBetHistory;
const getBettingHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, status } = req.body;
    const qurey = {
        userId: (0, base_1.ObjectId)(userId)
    };
    if (status === 'Active') {
        qurey.status = 'BET';
    }
    else if (status === 'Settled') {
        qurey.status = { $ne: 'BET' };
    }
    const sportsBets = yield models_1.SportsBets.aggregate([
        {
            $match: qurey
        },
        {
            $lookup: {
                from: 'sports_lists',
                localField: 'betType',
                foreignField: 'SportId',
                as: 'sport'
            }
        },
        {
            $lookup: {
                from: 'sports_bettings',
                localField: '_id',
                foreignField: 'betId',
                as: 'bettings'
            }
        },
        {
            $lookup: {
                from: 'currencies',
                localField: 'currency',
                foreignField: '_id',
                as: 'currency'
            }
        },
        {
            $unwind: '$currency'
        },
        {
            $project: {
                'currency.abi': 0
            }
        },
        {
            $sort: { createdAt: -1 }
        }
    ]);
    res.json(sportsBets);
});
exports.getBettingHistory = getBettingHistory;
const getMarkets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const _markets = yield models_1.Markets_Group.aggregate([
        {
            $match: {
                status: true,
            }
        },
        {
            $lookup: {
                from: "sports_market_lists",
                let: { mainId: "$id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$groupId", "$$mainId"] },
                                    { $eq: ["$status", true] }
                                ]
                            }
                        }
                    },
                    {
                        $sort: { "order": 1 }
                    }
                ],
                as: "items"
            }
        }, {
            $sort: {
                'order': 1,
            }
        }
    ]);
    res.json(_markets);
});
exports.getMarkets = getMarkets;
const sportsBetCashOut = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c;
    const { betId } = req.body;
    const sportsBets = yield models_1.SportsBets.findOneAndUpdate({
        _id: (0, base_1.ObjectId)(betId),
        status: { $ne: 'SETTLED' }
    }, { status: 'SETTLED' }, { new: true });
    if (sportsBets) {
        const result = yield (0, base_1.handleBet)({
            req,
            userId: (_b = sportsBets.userId) === null || _b === void 0 ? void 0 : _b._id,
            currency: (_c = sportsBets.currency) === null || _c === void 0 ? void 0 : _c._id,
            amount: Number(sportsBets.stake) * 0.95,
            type: 'sports-bet-cashout',
            status: false,
            info: sportsBets._id
        });
        res.json(result);
    }
    else {
        res.status(400).json(`Not found betId.`);
    }
});
exports.sportsBetCashOut = sportsBetCashOut;
const sportsBetResult = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { _id, status } = req.body;
    const bet = yield models_1.SportsBetting.findById((0, base_1.ObjectId)(_id));
    let profit = 0;
    if (bet) {
        if (status === 'WIN') {
            profit = bet.stake * bet.odds;
        }
        else if (status === 'LOST') {
            profit = bet.stake * -1;
        }
        else if (status === 'REFUND' || status === 'CANCEL') {
            profit = bet.stake;
        }
        else if (status === 'HALF_WIN') {
            profit = (bet.stake * bet.odds) / 2 + bet.stake / 2;
        }
        else if (status === 'HALF_LOST') {
            profit = (bet.stake / 2) * -1;
        }
        const data = yield models_1.SportsBetting.findByIdAndUpdate((0, base_1.ObjectId)(bet._id), { status, profit }, { new: true });
        res.json({ status: true, data });
    }
    else {
        res.status(400).json(`Not found betId.`);
    }
});
exports.sportsBetResult = sportsBetResult;
const sportsResettle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const _id = (0, base_1.ObjectId)(req.params.id);
    const bet = yield models_1.SportsBets.findOneAndUpdate({ _id, status: { $ne: 'BET' } }, { status: 'BET', profit: 0 });
    if (!bet) {
        res.status(400).json(`Not found betId.`);
    }
    else {
        if (bet.status !== 'LOST' && bet.status !== 'HALF_LOST') {
            yield (0, base_1.handleBet)({
                req,
                userId: bet.userId,
                currency: bet.currency,
                amount: bet.profit * -1,
                type: 'sports-resettle',
                info: bet._id
            });
        }
        yield models_1.SportsBetting.updateMany({ betId: _id }, { status: 'BET', profit: 0 });
        const result = yield models_1.SportsBets.aggregate([{ $match: { _id } }, ...sportsbets_1.aggregateQuery]);
        res.json(result[0]);
    }
});
exports.sportsResettle = sportsResettle;
