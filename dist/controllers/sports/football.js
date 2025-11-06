'use strict';
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator['throw'](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, '__esModule', { value: true });
exports.getSoccerResult =
    exports.getSoccerEndedEvents =
    exports.getFootballMatchs =
    exports.getFootballBettingStatus =
    exports.getFootballLiveEnded =
    exports.getFootballPreOdds =
    exports.getFootballLiveOdds =
    exports.getFootballLiveMatch =
    exports.getFootballPreMatch =
    exports.getFootBallLeagues =
    exports.getPredictions =
        void 0;
const moment = require('moment');
const request = require('request');
const models_1 = require('../../models');
const sportsrealtime_1 = require('./sportsrealtime');
const footballresult_1 = require('./footballresult');
const { date } = require('joi');
const FOOTBALL_APIKEY = process.env.FOOTBALL_APIKEY;
const FOOTBALL_ENDPOINT = process.env.FOOTBALL_ENDPOINT;
const FOOTBALL_RAPIDAPI_ENDPOINT = process.env.FOOTBALL_RAPIDAPI_ENDPOINT;
const PREMATCH_STATUS = ['TBD', 'NS'];
const FIXED_STATUS = ['AWD', 'WO'];
const INPLAY_STATUS = ['1H', '2H', 'ET', 'BT', 'P', 'HT', 'LIVE'];
const FINISHED_STATUS = ['FT', 'AET', 'PEN'];
const getTimeStatus = (status) => {
    if (PREMATCH_STATUS.includes(status)) return 0;
    if (INPLAY_STATUS.includes(status)) return 1;
    if (FIXED_STATUS.includes(status)) return 2;
    if (FINISHED_STATUS.includes(status)) return 3;
    if (status === 'PST') return 4;
    if (status === 'CANC') return 5;
    if (status === 'INT') return 7;
    if (status === 'ABD') return 8;
    if (status === 'SUSP') return 10;
    return 3;
};
const getLiveTimeStatus = (status) => {
    if (status.blocked) return 10;
    if (status.finished) return 3;
    return 1;
};
const getApiData = ({ method, url, qs }, callback) => {
    const options = {
        method,
        url: `${FOOTBALL_ENDPOINT}/${url}`,
        qs,
        headers: {
            'x-rapidapi-host': FOOTBALL_RAPIDAPI_ENDPOINT,
            'x-rapidapi-key': FOOTBALL_APIKEY
        }
    };
    request(options, function (error, response, body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (error) {
                    console.error(error);
                    callback([]);
                    return;
                }
                const json = JSON.parse(body);
                if (json.errors.length) {
                    console.error(JSON.stringify(json.errors));
                    return callback([]);
                }
                if (!json.response.length) return callback([]);
                callback(json.response);
            } catch (err) {
                console.error(err);
                callback([]);
                return;
            }
        });
    });
};
const getPredictions = (req, res) => {
    try {
        const { id } = req.params;
        const param = {
            method: 'GET',
            url: 'predictions',
            qs: {
                fixture: id
            }
        };
        getApiData(param, (result) =>
            __awaiter(void 0, void 0, void 0, function* () {
                return res.json(result);
            })
        );
    } catch (error) {
        console.error('Error Predictions =>', error);
        return res.json([]);
    }
};
exports.getPredictions = getPredictions;
const getFootBallLeagues = (season, current) => {
    const _season = season || new Date().getFullYear();
    const url = `${FOOTBALL_ENDPOINT}/leagues`;
    console.log(url, '===>url<==');
    const param = {
        method: 'GET',
        url: 'leagues',
        qs: Object.assign({ season: _season }, current && { current })
    };
    getApiData(param, (result) =>
        __awaiter(void 0, void 0, void 0, function* () {
            for (const i in result) {
                const row = result[i];
                try {
                    const param = Object.assign(
                        Object.assign(
                            {},
                            (row === null || row === void 0 ? void 0 : row.league)
                                ? Object.assign(Object.assign({}, row === null || row === void 0 ? void 0 : row.league), {
                                      country: row.country
                                  })
                                : Object.assign({}, row)
                        ),
                        { sport_id: 1, status: true }
                    );
                    if (param.country.name === 'World') {
                        param.order = 10;
                    }
                    yield models_1.FootballLeagues.updateOne({ id: param.id, sport_id: param.sport_id }, param, {
                        new: true,
                        upsert: true
                    });
                } catch (error) {
                    console.error('getLeague => update', error);
                }
            }
        })
    );
};
exports.getFootBallLeagues = getFootBallLeagues;
const updateMatch = (row) =>
    __awaiter(void 0, void 0, void 0, function* () {
        try {
            const time_status = getTimeStatus(row.fixture.status.short);
            const id = row.fixture.id;
            const check = yield models_1.FootballLeagues.findOne({
                id: row.league.id,
                status: true
            });
            if (!check) return;
            console.log(row.statistics, "===>row.statistics=============");
            const param = {
                id,
                sport_id: 1,
                league: Object.assign(Object.assign({}, row.league), { cc: row.league.country }),
                home: row.teams.home,
                away: row.teams.away,
                ss: `${row.goals.home || 0}-${row.goals.away || 0}`,
                time: row.fixture.timestamp,
                time_status,
                scores: row.goals,
                extra: {
                    stadium_data: row.fixture.venue
                },
                f_status: row.fixture.status,
                f_score: row.score,
                events: row.events,
                stats: {
                    lineups: row.lineups,
                    players: row.players,
                    statistics: row.statistics
                }
            };
            console.log(param.id, '===>SportsMatchs Start Update One============');
            yield models_1.SportsMatchs.updateOne({ id: param.id, sport_id: param.sport_id }, param, {
                new: true,
                upsert: true
            }).then((result) => {
                console.log(param.id, '===>SportsMatchs Success Update One============');
            });
            if (time_status === 0 || time_status === 1)
                return yield models_1.SportsFixMatchs.deleteOne({ id: row.fixture.id, sport_id: param.sport_id });
            else yield updatedEvent(id, param);
        } catch (error) {
            console.error('getLeague => update', error);
        }
    });
const updatedEvent = (id, param) =>
    __awaiter(void 0, void 0, void 0, function* () {
        const isbet = yield (0, sportsrealtime_1.checkBet)(id);
        const time_status = param.time_status;
        yield models_1.SportsMatchs.deleteOne({ id, sport_id: param.sport_id });
        const exists = yield (0, sportsrealtime_1.checkFix)(id);
        if (!isbet || (exists && time_status !== 3)) return;
        if (time_status === 2)
            return yield models_1.SportsFixMatchs.updateOne({ id, sport_id: param.sport_id }, param, {
                upsert: true
            });
        if (time_status === 3) {
            if (param.scores.home == null) {
                return yield models_1.SportsFixMatchs.updateOne({ id, sport_id: param.sport_id }, param, {
                    upsert: true
                });
            }
            if (exists) yield models_1.SportsFixMatchs.deleteOne({ id, sport_id: param.sport_id });
            return yield models_1.SportsEndMatchs.updateOne({ id, sport_id: param.sport_id }, param, {
                upsert: true
            });
        }
        if (time_status === 4 || time_status === 5 || time_status === 7 || time_status === 8 || time_status === 10 || time_status === 99) {
            return yield models_1.SportsFixMatchs.updateOne({ id, sport_id: param.sport_id }, param, {
                upsert: true
            });
        }
        console.log(`updateEndedEvents result`, param);
    });
// Get Sports Pre Match
const getSportsPreMatch = (league) =>
    __awaiter(void 0, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve('success');
            }, 8500);
            const season = new Date().getFullYear();
            const from = moment().format('YYYY-MM-DD');
            const to = moment().add(7, 'd').format('YYYY-MM-DD');
            console.log(from, to, '----date---');
            const param = {
                method: 'GET',
                url: 'fixtures',
                qs: { league: league.id, season, from, to }
            };
            getApiData(param, (result) =>
                __awaiter(void 0, void 0, void 0, function* () {
                    console.log(result.length, '====>Pre Match Count======league=>', league.id);
                    for (const i in result) {
                        const row = result[i];
                        yield updateMatch(row);
                    }
                })
            );
        });
    });
// Get Sports Pre Match
const getSportsPreOdds = (id) =>
    __awaiter(void 0, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve('success');
            }, 8500);
            const param = {
                method: 'GET',
                url: 'odds',
                qs: { fixture: id, bookmaker: 8 } // Bet365
            };
            getApiData(param, (result) =>
                __awaiter(void 0, void 0, void 0, function* () {
                    console.log(result.length, '====>Pre Odds Count======id=>', id);
                    for (const i in result) {
                        const row = result[i];
                        if (!row.bookmakers.length) continue;
                        yield models_1.SportsMatchs.updateOne({ id: id }, { odds: row.bookmakers });
                    }
                })
            );
        });
    });
// Get Sports Pre Match
const getSportsEventStatus = (ids) =>
    __awaiter(void 0, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve('success');
            }, 8500);
            const param = {
                method: 'GET',
                url: 'fixtures',
                qs: { ids }
            };
            getApiData(param, (result) =>
                __awaiter(void 0, void 0, void 0, function* () {
                    console.log(result.length, '====>Ended_Status====');
                    for (const i in result) {
                        const row = result[i];
                        yield updateMatch(row);
                    }
                })
            );
        });
    });
const getFootballPreMatch = () =>
    __awaiter(void 0, void 0, void 0, function* () {
        const from = moment().format('YYYY-MM-DD');
        const to = moment().add(5, 'd').format('YYYY-MM-DD'); // 5 day
        console.log(from, to, '=========>fetching fixtures for date range');

        for (let date = from; date <= to; date = moment(date).add(1, 'days').format('YYYY-MM-DD')) {
            const param = {
                method: 'GET',
                url: 'fixtures',
                qs: { date: date }
            };
            getApiData(param, (result) =>
                __awaiter(void 0, void 0, void 0, function* () {
                    console.log(result.length, '====>Pre Match Count======date=>', date);
                    for (const i in result) {
                        const row = result[i];
                        yield updateMatch(row);
                    }
                })
            );
        }
    });
exports.getFootballPreMatch = getFootballPreMatch;
const getFootballLiveMatch = () =>
    __awaiter(void 0, void 0, void 0, function* () {
        const param = {
            method: 'GET',
            url: 'fixtures',
            qs: { live: 'all' }
        };
        getApiData(
            param,
            (result) => console.log(result.length, '===>Live Match Count============'),
            __awaiter(void 0, void 0, void 0, function* () {
                for (const i in result) {
                    const row = result[i];
                    yield updateMatch(row);
                }
            })
        );
    });
exports.getFootballLiveMatch = getFootballLiveMatch;
const getFootballLiveOdds = () =>
    __awaiter(void 0, void 0, void 0, function* () {
        const param = {
            method: 'GET',
            url: 'odds/live',
            qs: {}
        };
        getApiData(param, (result) =>
            __awaiter(void 0, void 0, void 0, function* () {
                if (!result.length) return;
                console.log(result.length, '===>Live Odds');
                for (const i in result) {
                    const row = result[i];
                    const param = {
                        odds: row.odds,
                        // time_status: getLiveTimeStatus(row.status),
                        ss: `${row.teams.home.goals || 0}-${row.teams.away.goals || 0}`,
                        'f_status.long': row.fixture.status.long,
                        'f_status.elapsed': row.fixture.status.elapsed
                    };
                    yield models_1.SportsMatchs.updateOne({ id: row.fixture.id, sport_id: 1 }, param);
                }
                const liveOdds = result.map((row) => row.fixture.id);
                yield models_1.SportsMatchs.updateMany(
                    {
                        id: { $nin: liveOdds },
                        sport_id: 1,
                        time_status: 1,
                        odds: { $nin: [{}, null, []] }
                    },
                    { odds: [] }
                );
            })
        );
    });
exports.getFootballLiveOdds = getFootballLiveOdds;
const getFootballPreOdds = () =>
    __awaiter(void 0, void 0, void 0, function* () {
        // const matchs = yield models_1.SportsMatchs.find({
        //     sport_id: 1,
        //     time_status: 0
        // });
        // console.log(matchs.length, '====>Pre Odds Count');
        // for (const key in matchs) {
        //     getSportsPreOdds(matchs[key].id);
        // }
        const from = moment().format('YYYY-MM-DD');
        const to = moment().add(5, 'd').format('YYYY-MM-DD'); // 5 day
        console.log(from, to, '=========>fetching odds for date range');

        for (let date = from; date <= to; date = moment(date).add(1, 'days').format('YYYY-MM-DD')) {
            // First, get the first page to know total pages
            const firstParam = {
                method: 'GET',
                url: 'odds',
                qs: { date: date, page: 1, bookmaker: 8 } // Bet365
            };

            request(
                {
                    method: firstParam.method,
                    url: `${FOOTBALL_ENDPOINT}/${firstParam.url}`,
                    qs: firstParam.qs,
                    headers: {
                        'x-rapidapi-host': FOOTBALL_RAPIDAPI_ENDPOINT,
                        'x-rapidapi-key': FOOTBALL_APIKEY
                    }
                },
                function (error, response, body) {
                    return __awaiter(this, void 0, void 0, function* () {
                        try {
                            if (error) {
                                console.error(error);
                                return;
                            }
                            const json = JSON.parse(body);
                            if (json.errors && json.errors.length) {
                                console.error(JSON.stringify(json.errors));
                                return;
                            }

                            const totalPages = json.paging ? json.paging.total : 1;
                            console.log(`Date: ${date}, Total Pages: ${totalPages}`);

                            // Process first page
                            if (json.response && json.response.length) {
                                for (const row of json.response) {
                                    if (!row.bookmakers || !row.bookmakers.length) continue;
                                    yield models_1.SportsMatchs.updateOne({ id: row.fixture.id, sport_id: 1 }, { odds: row.bookmakers });
                                }
                                console.log(`Processed page 1 of ${totalPages} for date ${date}, count: ${json.response.length}`);
                            }

                            // Fetch remaining pages
                            for (let page = 2; page <= totalPages; page++) {
                                const param = {
                                    method: 'GET',
                                    url: 'odds',
                                    qs: { date: date, page: page, bookmaker: 8 }
                                };

                                getApiData(param, (result) =>
                                    __awaiter(void 0, void 0, void 0, function* () {
                                        console.log(`Processed page ${page} of ${totalPages} for date ${date}, count: ${result.length}`);
                                        for (const row of result) {
                                            if (!row.bookmakers || !row.bookmakers.length) continue;
                                            yield models_1.SportsMatchs.updateOne(
                                                { id: row.fixture.id, sport_id: 1 },
                                                { odds: row.bookmakers }
                                            );
                                        }
                                    })
                                );
                            }
                        } catch (err) {
                            console.error(err);
                        }
                    });
                }
            );
        }
    });
exports.getFootballPreOdds = getFootballPreOdds;
const getFootballLiveEnded = () =>
    __awaiter(void 0, void 0, void 0, function* () {
        const matchs = yield models_1.SportsMatchs.find({
            sport_id: 1,
            time_status: 1
        }).select({
            id: 1,
            _id: 0
        });
        if (!matchs.length) return;
        for (let index = 0; index <= parseInt(String(matchs.length / 20)); index++) {
            const from = index * 20;
            const to = from + 20;
            const ids = matchs
                .slice(from, to)
                .map((item) => item.id)
                .join('-');
            yield getSportsEventStatus(ids);
        }
    });
exports.getFootballLiveEnded = getFootballLiveEnded;
const getFootballBettingStatus = () =>
    __awaiter(void 0, void 0, void 0, function* () {
        const matchs = yield models_1.SportsBetting.find({ status: 'BET', SportId: 1 });
        if (!matchs.length) return;
        for (let index = 0; index <= parseInt(String(matchs.length / 20)); index++) {
            const from = index * 20;
            const to = from + 20;
            const ids = matchs
                .slice(from, to)
                .map((item) => item.eventId)
                .join('-');
            yield getSportsEventStatus(ids);
        }
    });
exports.getFootballBettingStatus = getFootballBettingStatus;
const getFootballMatchs = (query, squery) =>
    __awaiter(void 0, void 0, void 0, function* () {
        query.astatus = true;
        // Don't filter by odds if sport_id is 1 AND it's a live match
        const isFootballLive = query.sport_id === 1 && query.time_status === 1;
        if (!isFootballLive) {
            query.odds = { $nin: [{}, null, []] };
        }
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
                        LeagueName: '$league.name',
                        LeagueLogo: '$league.logo'
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
                            f_status: '$f_status',
                            teams: '$teams',
                            ss: '$ss',
                            scores: '$scores',
                            points: '$points',
                            time: '$time',
                            timer: '$timer',
                            time_status: '$time_status',
                            events: '$events',
                            stats:'$stats'
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: models_1.DB_NAME_FOOTBALL_LEAGUES,
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
                    LeagueLogo: '$_id.LeagueLogo',
                    events: '$events'
                }
            }
        ]);
        return results.map((row) => {
            const events = row.events.map((event) => {
                const num =
                    event === null || event === void 0
                        ? 0
                        : (event.odds === null || event.odds === void 0 || !Array.isArray(event.odds) || event.odds.length === 0)
                        ? 0
                        : event.odds.reduce((n, row) => {
                              var _a;
                              if (query.time_status === 0) {
                                  return (n +=
                                      (_a = row.bets) === null || _a === void 0
                                          ? void 0
                                          : _a.reduce((_n, k) => {
                                                if (k.values.length) _n += 1;
                                                return _n;
                                            }, 0));
                              }
                              return (n += 1);
                          }, 0);
                return Object.assign(Object.assign({}, event), { markets: num });
            });
            return Object.assign(Object.assign({}, row), { events });
        });
    });
exports.getFootballMatchs = getFootballMatchs;
const checkOddsChanged = (event_id, marketId, odd) => {
    return new Promise((resolve, reject) => {
        const param = {
            method: 'GET',
            url: 'odds/live',
            qs: { fixture: event_id } // Bet365
        };
        getApiData(param, (result) =>
            __awaiter(void 0, void 0, void 0, function* () {
                if (!result.length) return resolve(false);
                for (const i in result) {
                    const event = result[i];
                    if (!event.odds.length) return resolve(true);
                    const newMarket = event.odds.find((e) => e.id === marketId);
                    if (!newMarket) return resolve(true);
                    const newOdd = newMarket.values.find((e) => e.value === odd.value && e.handicap === odd.handicap);
                    console.log(newOdd, '==>newOdd', odd);
                    if (!newOdd || newOdd.suspended) return resolve(true);
                    if (newOdd.odd !== odd.odd) return resolve(true);
                    return resolve(false);
                }
            })
        );
    });
};
const getSoccerEndedEvents = (event_id, odds, bet) =>
    __awaiter(void 0, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const param = {
                method: 'GET',
                url: 'fixtures',
                qs: { id: event_id }
            };
            getApiData(param, (result) =>
                __awaiter(void 0, void 0, void 0, function* () {
                    if (!result.length) return resolve(2);
                    for (const i in result) {
                        const event = result[i];
                        const time_status = getTimeStatus(event.fixture.status.short);
                        console.log('---------Check--------', time_status, event.fixture.status);
                        const time = event.fixture.timestamp;
                        if (time_status === 0) {
                            if (Number(time) * 1000 > Date.now()) return resolve(0);
                            return resolve(3);
                        }
                        if (time_status === 1) {
                            const update = yield checkOddsChanged(event_id, Number(bet.marketId), odds);
                            if (update) return resolve(4);
                            //  if (bet.oddType === 'over') {
                            //     const settled = await bettingSettled({
                            //         data: result,
                            //         bet
                            //     });
                            //     console.log('============settled============');
                            //     console.log(settled);
                            //     console.log('============settled============');
                            //     if (settled.status !== 'LOST') {
                            //         return resolve(4);
                            //     }
                            // }
                            return resolve(1);
                        }
                        return resolve(2);
                    }
                })
            );
        });
    });
exports.getSoccerEndedEvents = getSoccerEndedEvents;
const getSoccerResult = () =>
    __awaiter(void 0, void 0, void 0, function* () {
        try {
            const sportsBettngs = yield models_1.SportsBetting.aggregate([
                {
                    $match: {
                        status: 'BET',
                        SportId: 1
                    }
                },
                {
                    $lookup: {
                        from: 'sports_end_matchs',
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
                        'matchs.time_status': 3
                    }
                }
            ]);
            console.log(sportsBettngs.length, '==>sportsBettngs');
            if (!sportsBettngs.length) return;
            for (const key in sportsBettngs) {
                const row = sportsBettngs[key];
                const result = yield (0, footballresult_1.getBettingStatus)(row);
                console.log(result, '==.result=>TimeStatus=>', row.TimeStatus, row._id);
                if (result) yield models_1.SportsBetting.updateOne({ _id: row._id }, result);
            }
        } catch (error) {
            console.error(`Error Soccer Betting Checking =>`, error);
        }
    });
exports.getSoccerResult = getSoccerResult;
