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
exports.getBettingStatus = void 0;
const base_1 = require("../base");
const filterStatistic = (statistics, teamId, key) => {
    return statistics.reduce((total, stat) => {
        var _a;
        const statistic = stat.statistics.find(e => e.type === key);
        if (!statistic)
            return total;
        if (teamId === "all")
            return total + Number(statistic.value);
        if (((_a = stat.team) === null || _a === void 0 ? void 0 : _a.id) === Number(teamId))
            return total + Number(statistic.value);
        return total;
    }, 0);
};
const getWinnerInSomeMin = (oddType, events, min, homeId, awayId, profit) => {
    const home_score = events.reduce((goal, event) => {
        var _a;
        if (event.time.elapsed < min && event.type === "Goal" && ((_a = event.team) === null || _a === void 0 ? void 0 : _a.id) === homeId)
            return goal + 1;
        return goal;
    }, 0);
    const away_score = events.reduce((goal, event) => {
        var _a;
        if (event.time.elapsed < min && event.type === "Goal" && ((_a = event.team) === null || _a === void 0 ? void 0 : _a.id) === awayId)
            return goal + 1;
        return goal;
    }, 0);
    if ((oddType === "home" && home_score > away_score) ||
        (oddType === "away" && away_score > home_score) ||
        (oddType === "draw" && home_score === away_score))
        return { profit, status: "WIN" };
    return { profit, status: "LOST" };
};
const getCorner = (oddType, compare_corder, home_corner, away_corner, profit, stake) => {
    if (home_corner >= compare_corder && away_corner >= compare_corder)
        return { profit: stake, status: "REFUND" };
    if ((oddType === "1" && home_corner >= compare_corder) ||
        (oddType === "2" && away_corner >= compare_corder) ||
        (oddType === "Neither" && home_corner < compare_corder && away_corner < compare_corder))
        return { profit, status: "WIN" };
    return { profit, status: "LOST" };
};
const getScoreOrMore = (oddType, events, goal, profit) => {
    const player_goals = events.filter((e) => { var _a; return e.type === "Goal" && ((_a = e.player) === null || _a === void 0 ? void 0 : _a.name) === oddType; });
    if (player_goals.length >= goal)
        return { profit, status: "WIN" };
    return { profit, status: "LOST" };
};
const getOverUnder = (oddType, score, handicap, profit, stake) => {
    const d_score = Math.floor(handicap);
    const over_under = d_score < 1 ? handicap : handicap % d_score;
    if ((over_under === 0.25 && oddType === "over" && score > d_score) ||
        (over_under === 0.25 && oddType === "under" && score < d_score) ||
        (over_under === 0.5 && oddType === "over" && score >= d_score) ||
        (over_under === 0.5 && oddType === "under" && score <= d_score) ||
        (over_under === 0.75 && oddType === "over" && score > (d_score + 1)) ||
        (over_under === 0.75 && oddType === "under" && score <= d_score) ||
        (over_under === 0 && oddType === "over" && score > d_score) ||
        (over_under === 0 && oddType === "under" && score < d_score))
        return { profit, status: "WIN" };
    if ((over_under === 0.25 && oddType === "under" && score === d_score) ||
        (over_under === 0.75 && oddType === "over" && score > (d_score + 1)))
        return { profit: (0, base_1.NumberFix)(profit / 2, 2), status: "HALF_WIN" };
    if ((over_under === 0.25 && oddType === "over" && score === d_score) ||
        (over_under === 0.75 && oddType === "under" && score === (d_score + 1)))
        return { profit: (0, base_1.NumberFix)((stake / 2), 2), status: "HALF_LOST" };
    if (over_under === 0 && oddType === "over" && score === d_score)
        return { profit: stake, status: "REFUND" };
    return { profit, status: "LOST" };
};
const getGoals = (oddName, events, goal, home_id, away_id) => {
    var _a, _b;
    const goals = events.filter((e) => e.type === "Goal");
    if ((oddName === "No goal" && goals.length < goal) ||
        (oddName === "1" && goals.length >= goal && ((_a = goals[goal - 1].team) === null || _a === void 0 ? void 0 : _a.id) === home_id) ||
        (oddName === "2" && goals.length >= goal && ((_b = goals[goal - 1].team) === null || _b === void 0 ? void 0 : _b.id) === away_id))
        return "WIN";
    return "LOST";
};
const getHandicap = (oddType, handicap, home_score, away_score, profit, stake) => {
    let d_score = 0;
    if (oddType === "home")
        d_score = home_score - away_score;
    if (oddType === "away")
        d_score = away_score - home_score;
    if ((handicap === 0 && d_score > 0) ||
        (handicap === 0.25 && d_score > 0) ||
        (handicap === 0.5 && d_score >= 0) ||
        (handicap === 0.75 && d_score >= 0) ||
        (handicap === 1 && d_score >= 0) ||
        (handicap === 1.25 && d_score >= 0) ||
        (handicap === 1.5 && d_score >= -1) ||
        (handicap === 1.75 && d_score >= -1) ||
        (handicap === 2 && d_score >= -1) ||
        (handicap === 2.25 && d_score >= -1) ||
        (handicap === 2.5 && d_score >= -2) ||
        (handicap === 2.75 && d_score >= -2) ||
        (handicap === 3 && d_score >= -2) ||
        (handicap === -0.25 && d_score > 0) ||
        (handicap === -0.5 && d_score > 0) ||
        (handicap === -0.75 && d_score >= 2) ||
        (handicap === -1 && d_score >= 2) ||
        (handicap === -1.25 && d_score >= 2) ||
        (handicap === -1.5 && d_score >= 2) ||
        (handicap === -1.75 && d_score >= 3) ||
        (handicap === -2 && d_score >= 3) ||
        (handicap === -2.25 && d_score >= 3) ||
        (handicap === -2.5 && d_score >= 3) ||
        (handicap === -2.75 && d_score >= 4) ||
        (handicap === -3 && d_score >= 4))
        return { profit, status: "WIN" };
    if ((handicap === 0.25 && d_score === 0) ||
        (handicap === 1.25 && d_score === -1) ||
        (handicap === 2.25 && d_score === -2) ||
        (handicap === -0.75 && d_score === 1) ||
        (handicap === -1.75 && d_score === 2) ||
        (handicap === -2.75 && d_score === 3))
        return { profit: (0, base_1.NumberFix)(profit / 2, 2), status: "HALF_WIN" };
    if ((handicap === 0.75 && d_score === -1) ||
        (handicap === 1.75 && d_score === -2) ||
        (handicap === 2.75 && d_score === -3) ||
        (handicap === -0.25 && d_score === 0) ||
        (handicap === -1.25 && d_score === 1) ||
        (handicap === -2.25 && d_score === 2))
        return { profit: (0, base_1.NumberFix)((stake / 2), 2), status: "HALF_LOST" };
    if ((handicap === 0 && d_score === 0) ||
        (handicap === 1 && d_score === -1) ||
        (handicap === 2 && d_score === -2) ||
        (handicap === 3 && d_score === -3) ||
        (handicap === -1 && d_score === 1) ||
        (handicap === -2 && d_score === 2) ||
        (handicap === -3 && d_score === 3))
        return { profit: stake, status: "REFUND" };
    return { profit, status: "LOST" };
}; // https://www.betshoot.com/betting-guides/asian-handicap-betting/
const getBettingStatus = (param) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30, _31, _32, _33, _34, _35, _36, _37, _38, _39, _40, _41, _42, _43, _44, _45, _46, _47, _48, _49, _50, _51, _52, _53;
    try {
        const { eventId, oddId, stake, odds, matchs, marketId, TimeStatus, oddName, oddData, oddType, handicap } = param;
        console.log(matchs.scores);
        const profit = (0, base_1.NumberFix)(stake * odds, 2);
        const market_id = Number(marketId);
        const statistics = matchs.stats.statistics;
        const players = matchs.stats.players;
        const f_score = matchs.f_score;
        const events = matchs.events;
        const home = matchs.home;
        const away = matchs.away;
        const home_score_half = ((_a = f_score === null || f_score === void 0 ? void 0 : f_score.halftime) === null || _a === void 0 ? void 0 : _a.home) || 0;
        const away_score_half = ((_b = f_score === null || f_score === void 0 ? void 0 : f_score.halftime) === null || _b === void 0 ? void 0 : _b.away) || 0;
        const home_score_full = ((_c = f_score === null || f_score === void 0 ? void 0 : f_score.fulltime) === null || _c === void 0 ? void 0 : _c.home) || 0;
        const away_score_full = ((_d = f_score === null || f_score === void 0 ? void 0 : f_score.fulltime) === null || _d === void 0 ? void 0 : _d.away) || 0;
        const home_score_penalty = ((_e = f_score === null || f_score === void 0 ? void 0 : f_score.penalty) === null || _e === void 0 ? void 0 : _e.home) || 0;
        const away_score_penalty = ((_f = f_score === null || f_score === void 0 ? void 0 : f_score.penalty) === null || _f === void 0 ? void 0 : _f.away) || 0;
        const home_score_extratime = ((_g = f_score === null || f_score === void 0 ? void 0 : f_score.extratime) === null || _g === void 0 ? void 0 : _g.home) || 0;
        const away_score_extratime = ((_h = f_score === null || f_score === void 0 ? void 0 : f_score.extratime) === null || _h === void 0 ? void 0 : _h.away) || 0;
        const total = Object.assign(Object.assign({}, matchs.scores), { total: home_score_full + away_score_full });
        if (TimeStatus === 1) {
            if (market_id === 1) { // Over/Under Extra Time
                const total_score = home_score_extratime + away_score_extratime;
                const result = getOverUnder(oddType, total_score, handicap, profit, stake);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            if (market_id === 2) { // 1x2 Extra Time
                if ((oddType === "home" && home_score_extratime > away_score_extratime) ||
                    (oddType === "away" && away_score_extratime > home_score_extratime) ||
                    (oddType === "draw" && home_score_extratime === away_score_extratime))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 3) { // Extra Time Asian Corners
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 4) { // Extra Time Total Corners (3 Ways) (1st Half)
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 5) { // Extra Time Double Result
                if (oddType === "1/1" && home_score_extratime > away_score_extratime && home_score_full > away_score_full ||
                    oddType === "1/X" && home_score_extratime > away_score_extratime && home_score_full === away_score_full ||
                    oddType === "1/2" && home_score_extratime > away_score_extratime && home_score_full < away_score_full ||
                    oddType === "X/1" && home_score_extratime === away_score_extratime && home_score_full > away_score_full ||
                    oddType === "X/X" && home_score_extratime === away_score_extratime && home_score_full === away_score_full ||
                    oddType === "X/2" && home_score_extratime === away_score_extratime && home_score_full < away_score_full ||
                    oddType === "2/1" && home_score_extratime < away_score_extratime && home_score_full > away_score_full ||
                    oddType === "2/X" && home_score_extratime < away_score_extratime && home_score_full === away_score_full ||
                    oddType === "2/2" && home_score_extratime < away_score_extratime && home_score_full < away_score_full)
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 6) { // Which team will score the 1st goal in extra time?
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 7) { // Extra Time Asian Corners (1st Half)
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 8) { // Method of Victory
                if ((oddName === "Win in 90 mins/1" && home_score_full > away_score_full) ||
                    (oddName === "Win in Extra Time/1" && home_score_extratime > away_score_extratime) ||
                    (oddName === "Win after Penalties/1" && home_score_penalty > away_score_penalty) ||
                    (oddName === "Win in 90 mins/2" && home_score_full < away_score_full) ||
                    (oddName === "Win in Extra Time/2" && home_score_extratime < away_score_extratime) ||
                    (oddName === "Win after Penalties/2" && home_score_penalty < away_score_penalty))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 9) { // Both Teams To Score (ET)
                if ((oddType === "yes" && home_score_extratime > 0 && away_score_extratime > 0) ||
                    (oddType === "no" && home_score_extratime > 0 || away_score_extratime > 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 10) { // To Qualify
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 11) { // Asian Handicap Extra Time
                const result = getHandicap(oddType, handicap, home_score_extratime, away_score_extratime, profit, stake);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            if (market_id === 12) { // 1x2 Extra Time (1st Half)
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 13) { // Extra Time Total Corners (3 Ways)
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 14) { // Over/Under Extra Time (1st Half)
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 16) { // How many goals will Away Team score?
                if ((oddName === "No goal" && away_score_full === 0) ||
                    (oddName === "1" && away_score_full === 1) ||
                    (oddName === "2" && away_score_full === 2) ||
                    (oddName === "3 or more" && away_score_full >= 3))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 17) { // Asian Handicap (1st Half)
                const result = getHandicap(oddType, handicap, home_score_half, away_score_half, profit, stake);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            if (market_id === 18) { // 1st Goal in Interval
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const goal_min = events.find((e) => e.type === "Goal");
                if (oddType === "no" && !goal_min)
                    return { profit, status: "WIN", scores: total };
                if ((oddType === "yes" && ((_j = goal_min === null || goal_min === void 0 ? void 0 : goal_min.time) === null || _j === void 0 ? void 0 : _j.elapsed) < handicap) ||
                    (oddType === "no" && ((_k = goal_min === null || goal_min === void 0 ? void 0 : goal_min.time) === null || _k === void 0 ? void 0 : _k.elapsed) > handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 19) { // 1x2 (1st Half)
                if ((oddType === "home" && home_score_half > away_score_half) ||
                    (oddType === "away" && away_score_half > home_score_half) ||
                    (oddType === "draw" && home_score_half === away_score_half))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 20) { // Match Corners
                if (!statistics.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const totalCorner = filterStatistic(statistics, "all", "Corner Kicks");
                if ((oddType === "over" && totalCorner > handicap) ||
                    (oddType === "under" && totalCorner < handicap) ||
                    (oddType === "exactly" && totalCorner === handicap)) {
                    return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 21) { // 3-Way Handicap
                if ((oddType === "home" && (home_score_full + handicap) > away_score_full) ||
                    (oddType === "draw" && (home_score_full + handicap) === away_score_full) ||
                    (oddType === "away" && (home_score_full + handicap) < away_score_full)) {
                    return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 22) { // 1x2 - 30 minutes
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const result = getWinnerInSomeMin(oddType, events, 30, home.id, away.id, profit);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            if (market_id === 23) { // Final Score
                const odd_home_goal = Number(oddType.split("-")[0]);
                const odd_away_goal = Number(oddType.split("-")[1]);
                if (odd_home_goal === home_score_full && odd_away_goal === away_score_full) {
                    return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 24) { // Over/Under Line (1st Half)
                const total_score = home_score_full + away_score_full;
                if ((oddType === "over" && total_score > handicap) ||
                    (oddType === "under" && total_score < handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 25) { // Match Goals
                const total_score = home_score_full + away_score_full;
                if ((oddType === "over" && total_score > handicap) ||
                    (oddType === "under" && total_score < handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 26) { // European Handicap (1st Half)
                if ((oddType === "home" && (home_score_half + handicap) > away_score_half) ||
                    (oddType === "away" && (home_score_half + handicap) < away_score_half) ||
                    (oddType === "draw" && (home_score_half + handicap) === away_score_half))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 27) { // Home Team Score a Goal (2nd Half)
                const home_score_2nd = home_score_full - home_score_half;
                if ((oddType === "yes" && home_score_2nd > 0) ||
                    (oddType === "no" && home_score_2nd === 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 28) { // Home Team  to Score in Both Halves
                const home_score_2nd = home_score_full - home_score_half;
                if ((oddType === "yes" && home_score_2nd > 0 && home_score_half > 0) ||
                    (oddType === "no" && home_score_2nd === 0 || home_score_half === 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 29) { // Result / Both Teams To Score
                if ((oddName === "Home/Yes" && home_score_full > away_score_full && away_score_full > 0) ||
                    (oddName === "Away/Yes" && home_score_full < away_score_full && home_score_full > 0) ||
                    (oddName === "Draw/Yes" && home_score_full === away_score_full && home_score_full > 0) ||
                    (oddName === "Home/No" && home_score_full > away_score_full && away_score_full === 0) ||
                    (oddName === "Away/No" && home_score_full < away_score_full && home_score_full === 0) ||
                    (oddName === "Draw/No" && home_score_full === away_score_full && home_score_full === 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 30) { // Both Teams To Score (1st Half)
                if ((oddName === "yes" && home_score_half > 0 && away_score_half > 0) ||
                    (oddName === "no" && home_score_half === 0 && away_score_half === 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 31) { // Total Corners (3way) (2nd Half)
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 32) { // Asian Corners
                if (!statistics.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const totalCorner = filterStatistic(statistics, "all", "Corner Kicks");
                if ((oddType === "over" && totalCorner > handicap) ||
                    (oddType === "under" && totalCorner < handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 33) { // Asian Handicap
                const result = getHandicap(oddType, handicap, home_score_full, away_score_full, profit, stake);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            if (market_id === 34) { // 1x2 - 40 minutes
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const result = getWinnerInSomeMin(oddType, events, 40, home.id, away.id, profit);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            if (market_id === 35) { // To Win 2nd Half
                const home_score_2nd = home_score_full - home_score_half;
                const away_score_2nd = away_score_full - away_score_half;
                if ((oddType === "home" && home_score_2nd > away_score_2nd) ||
                    (oddType === "away" && home_score_2nd < away_score_2nd) ||
                    (oddType === "draw" && home_score_2nd === away_score_2nd))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 36) { // Over/Under Line
                const total_score = home_score_full + away_score_full;
                const result = getOverUnder(oddType, total_score, handicap, profit, stake);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            if (market_id === 37) { // Total Corners
                if (!statistics.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const totalCorner = filterStatistic(statistics, "all", "Corner Kicks");
                if ((oddType === "over" && totalCorner > handicap) ||
                    (oddType === "under" && totalCorner < handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 38) { // Away Team to Score in Both Halves
                const away_score_2nd = away_score_full - away_score_half;
                if ((oddType === "yes" && away_score_2nd > 0 && away_score_half > 0) ||
                    (oddType === "no" && away_score_2nd === 0 || away_score_half === 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 39) { // Away Team Goals
                if ((oddType === "over" && away_score_full > handicap) ||
                    (oddType === "under" && away_score_full < handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 40) { // Total Corners (3 way) (1st Half)
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 41) { // 1x2 - 50 minutes
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const result = getWinnerInSomeMin(oddType, events, 50, home.id, away.id, profit);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            if (market_id === 42) { // Race to the 3rd corner?
                if (!statistics.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const home_corner = filterStatistic(statistics, home.id, "Corner Kicks");
                const away_corner = filterStatistic(statistics, away.id, "Corner Kicks");
                const result = getCorner(oddType, 3, home_corner, away_corner, profit, stake);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            ;
            if (market_id === 43) { // Both Teams To Score (2nd Half)
                const home_score_2nd = home_score_full - home_score_half;
                const away_score_2nd = away_score_full - away_score_half;
                if ((oddName === "yes" && home_score_2nd > 0 && away_score_2nd > 0) ||
                    (oddName === "no" && home_score_2nd === 0 && away_score_2nd === 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 44) { // Race to the 9th corner?
                if (!statistics.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const home_corner = filterStatistic(statistics, home.id, "Corner Kicks");
                const away_corner = filterStatistic(statistics, away.id, "Corner Kicks");
                const result = getCorner(oddType, 9, home_corner, away_corner, profit, stake);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            ;
            if (market_id === 45) { // Race to the 7th corner?
                if (!statistics.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const home_corner = filterStatistic(statistics, home.id, "Corner Kicks");
                const away_corner = filterStatistic(statistics, away.id, "Corner Kicks");
                const result = getCorner(oddType, 7, home_corner, away_corner, profit, stake);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            ;
            if (market_id === 46) { // Goal Scorer
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                if (oddName === "No 1st Goal") {
                    const players = oddData.map((e) => e.value);
                    const player_goal = events.find((e) => { var _a; return e.type === "Goal" && players.includes((_a = e.player) === null || _a === void 0 ? void 0 : _a.name); });
                    if (!player_goal) {
                        return { profit, status: "WIN", scores: total };
                    }
                }
                else {
                    const player_goals = events.filter((e) => { var _a; return e.type === "Goal" && ((_a = e.player) === null || _a === void 0 ? void 0 : _a.name) === oddName; });
                    if (player_goals.length >= handicap)
                        return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            ;
            if (market_id === 47) { // Away 1st Goal in Interval
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const goal_min = events.find((e) => { var _a; return e.type === "Goal" && ((_a = e.team) === null || _a === void 0 ? void 0 : _a.id) === away.id; });
                if (oddType === "no" && !goal_min)
                    return { profit, status: "WIN", scores: total };
                if ((oddType === "yes" && ((_l = goal_min === null || goal_min === void 0 ? void 0 : goal_min.time) === null || _l === void 0 ? void 0 : _l.elapsed) < handicap) ||
                    (oddType === "no" && ((_m = goal_min === null || goal_min === void 0 ? void 0 : goal_min.time) === null || _m === void 0 ? void 0 : _m.elapsed) > handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 48) { // Draw No Bet
                if ((oddType === "home" && home_score_full > away_score_full) ||
                    (oddType === "away" && home_score_full < away_score_full))
                    return { profit, status: "WIN", scores: total };
                if (home_score_full === away_score_full)
                    return { profit: stake, status: "REFUND", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 49) { // Over/Under (1st Half)
                const total_score = home_score_half + away_score_half;
                const result = getOverUnder(oddType, total_score, handicap, profit, stake);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            if (market_id === 50) { // 1x2 - 60 minutes
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const result = getWinnerInSomeMin(oddType, events, 60, home.id, away.id, profit);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            if (market_id === 52) { // 1x2 - 80 minutes
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const result = getWinnerInSomeMin(oddType, events, 80, home.id, away.id, profit);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            if (market_id === 53) { // To Score 2 or More
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const result = getScoreOrMore(oddType, events, 2, profit);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            ;
            if (market_id === 54) { // Home 1st Goal in Interval
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const goal_min = events.find((e) => { var _a; return e.type === "Goal" && ((_a = e.team) === null || _a === void 0 ? void 0 : _a.id) === home.id; });
                if (oddType === "no" && !goal_min)
                    return { profit, status: "WIN", scores: total };
                if ((oddType === "yes" && ((_o = goal_min === null || goal_min === void 0 ? void 0 : goal_min.time) === null || _o === void 0 ? void 0 : _o.elapsed) < handicap) ||
                    (oddType === "no" && ((_p = goal_min === null || goal_min === void 0 ? void 0 : goal_min.time) === null || _p === void 0 ? void 0 : _p.elapsed) > handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 55) { // Correct Score (1st Half)
                const odd_home_goal = Number(oddType.split("-")[0]);
                const odd_away_goal = Number(oddType.split("-")[1]);
                if (odd_home_goal === home_score_half && odd_away_goal === away_score_half) {
                    return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 56) { // 1x2 - 70 minutes
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const result = getWinnerInSomeMin(oddType, events, 70, home.id, away.id, profit);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            if (market_id === 57) { // Away Team Clean Sheet
                if ((oddType === "yes" && home_score_full === 0) ||
                    (oddType === "no" && home_score_full > 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 58) { // Home Team Goals
                if ((oddType === "over" && home_score_full > handicap) ||
                    (oddType === "under" && home_score_full < handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 59) { // Fulltime Result
                if ((oddType === "home" && home_score_full > away_score_full) ||
                    (oddType === "away" && away_score_full > home_score_full) ||
                    (oddType === "draw" && home_score_full === away_score_full))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            ;
            if (market_id === 60) { // To Score 3 or More
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const result = getScoreOrMore(oddType, events, 3, profit);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            ;
            if (market_id === 61) { // Race to the 5th corner?
                if (!statistics.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const home_corner = filterStatistic(statistics, home.id, "Corner Kicks");
                const away_corner = filterStatistic(statistics, away.id, "Corner Kicks");
                const result = getCorner(oddType, 5, home_corner, away_corner, profit, stake);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            ;
            if (market_id === 62) { // Last Team to Score (3 way)
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const goal_events = events.filter((e) => e.type === "Goal");
                if (oddName === "No goal" && !goal_events.length)
                    return { profit, status: "WIN", scores: total };
                if (goal_events.length) {
                    const last_team_id = ((_q = goal_events[goal_events.length - 1].team) === null || _q === void 0 ? void 0 : _q.id) || "";
                    if ((oddName === "1" && last_team_id === home.id) ||
                        (oddName === "2" && last_team_id === away.id))
                        return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            ;
            if (market_id === 63) { // Anytime Goal Scorer
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                if (oddName === "No 1st Goal") {
                    const players = oddData.map((e) => e.value);
                    const player_goal = events.find((e) => { var _a; return e.type === "Goal" && players.includes((_a = e.player) === null || _a === void 0 ? void 0 : _a.name); });
                    if (!player_goal) {
                        return { profit, status: "WIN", scores: total };
                    }
                }
                else {
                    const player_goal = events.find((e) => { var _a; return e.type === "Goal" && ((_a = e.player) === null || _a === void 0 ? void 0 : _a.name) === oddName; });
                    if (player_goal)
                        return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            ;
            if (market_id === 64) { // Half Time/Full Time
                if (oddType === "1/1" && home_score_half > away_score_half && home_score_full > away_score_full ||
                    oddType === "1/X" && home_score_half > away_score_half && home_score_full === away_score_full ||
                    oddType === "1/2" && home_score_half > away_score_half && home_score_full < away_score_full ||
                    oddType === "X/1" && home_score_half === away_score_half && home_score_full > away_score_full ||
                    oddType === "X/X" && home_score_half === away_score_half && home_score_full === away_score_full ||
                    oddType === "X/2" && home_score_half === away_score_half && home_score_full < away_score_full ||
                    oddType === "2/1" && home_score_half < away_score_half && home_score_full > away_score_full ||
                    oddType === "2/X" && home_score_half < away_score_half && home_score_full === away_score_full ||
                    oddType === "2/2" && home_score_half < away_score_half && home_score_full < away_score_full)
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 65) { // Next 10 Minutes Total
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 66) { // Home Team Clean Sheet
                if ((oddType === "yes" && away_score_full === 0) ||
                    (oddType === "no" && away_score_full > 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 67) { // How many goals will Home Team score?
                if ((oddName === "No goal" && home_score_full === 0) ||
                    (oddName === "1" && home_score_full === 1) ||
                    (oddName === "2" && home_score_full === 2) ||
                    (oddName === "3 or more" && home_score_full >= 3))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 68) { // Goals Odd/Even
                const total_goal = home_score_full + away_score_full;
                if ((oddName === "Odd" && total_goal % 2 === 1) ||
                    (oddName === "Even" && total_goal % 2 === 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 69) { // Both Teams To Score
                if ((oddName === "yes" && home_score_full > 0 && away_score_full > 0) ||
                    (oddName === "no" && home_score_full === 0 || away_score_full === 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 70) { // Away Team Score a Goal (2nd Half)
                const away_score_2nd = away_score_full - away_score_half;
                if ((oddType === "yes" && away_score_2nd > 0) ||
                    (oddType === "no" && away_score_2nd === 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 72) { // Double Chance
                if ((oddName === "Home or Draw" && home_score_full >= away_score_full) ||
                    (oddName === "Away or Draw" && home_score_full <= away_score_full) ||
                    (oddName === "Home or Away" && home_score_full !== away_score_full))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 73) { // Which team will score the 1st goal?
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const status = getGoals(oddName, events, 1, home.id, away.id);
                return { profit, status, scores: total };
            }
            if (market_id === 76) { // Corners European Handicap
                if (!statistics.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const home_corner = filterStatistic(statistics, home.id, "Corner Kicks");
                const away_corner = filterStatistic(statistics, away.id, "Corner Kicks");
                if ((oddType === "home" && (home_corner + handicap) > away_corner) ||
                    (oddType === "away" && (home_corner + handicap) < away_corner) ||
                    (oddType === "draw" && (home_corner + handicap) === away_corner))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 77) { // 1x2 - 10 minutes
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const result = getWinnerInSomeMin(oddType, events, 10, home.id, away.id, profit);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            if (market_id === 78) { // Corners 1x2
                if (!statistics.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const home_corner = filterStatistic(statistics, home.id, "Corner Kicks");
                const away_corner = filterStatistic(statistics, away.id, "Corner Kicks");
                if ((oddType === "home" && home_corner > away_corner) ||
                    (oddType === "away" && away_corner > home_corner) ||
                    (oddType === "draw" && home_corner === away_corner))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 79) { // 1x2 - 20 minutes
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const result = getWinnerInSomeMin(oddType, events, 20, home.id, away.id, profit);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            if (market_id === 80) { // Method of 1st Goal
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const first_goal = events.find((e) => e.type === "Goal");
                if (oddName === "No goal" && !first_goal)
                    return { profit, status: "WIN", scores: total };
                if (first_goal) {
                    if (!((_r = first_goal.team) === null || _r === void 0 ? void 0 : _r.id))
                        return { profit: stake, status: "REFUND", scores: total };
                    if ((oddName === "Shot" && first_goal.detail === "Normal Goal") ||
                        (oddName === "Penalty" && first_goal.detail === "Penalty") ||
                        (oddName === "Own goal" && first_goal.detail === "Own goal") ||
                        (oddName === "Header" && first_goal.detail === "Header") ||
                        (oddName === "Free kick" && first_goal.detail === "Free kick"))
                        return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 81) { // Method of Qualification
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 82) { // Game Won After Penalties Shootout
                if ((oddType === "yes" && (home_score_penalty > 0 || away_score_penalty > 0)) ||
                    (oddType === "no" && (home_score_penalty === 0 && away_score_penalty === 0)))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 83) { // Game Won In Extra Time
                if ((oddType === "yes" && (home_score_extratime > 0 || away_score_extratime > 0)) ||
                    (oddType === "no" && (home_score_extratime === 0 && away_score_extratime === 0)))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 85) { // Which team will score the 2nd goal?
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const status = getGoals(oddName, events, 2, home.id, away.id);
                return { profit, status, scores: total };
            }
            if (market_id === 90) { // 2nd Goal in Interval
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const goals = events.filter((e) => e.type === "Goal");
                if (oddType === "no" && goals.length < 2)
                    return { profit, status: "WIN", scores: total };
                if ((oddType === "yes" && goals.length >= 2 && ((_t = (_s = goals[1]) === null || _s === void 0 ? void 0 : _s.time) === null || _t === void 0 ? void 0 : _t.elapsed) < handicap) ||
                    (oddType === "no" && goals.length >= 2 && ((_v = (_u = goals[1]) === null || _u === void 0 ? void 0 : _u.time) === null || _v === void 0 ? void 0 : _v.elapsed) > handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 91) { // Away 2nd Goal in Interval
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const goals = events.filter((e) => { var _a; return e.type === "Goal" && ((_a = e.team) === null || _a === void 0 ? void 0 : _a.id) === away.id; });
                if ((oddType === "no" && goals.length < 2) ||
                    (oddType === "yes" && goals.length >= 2 && ((_x = (_w = goals[1]) === null || _w === void 0 ? void 0 : _w.time) === null || _x === void 0 ? void 0 : _x.elapsed) < handicap) ||
                    (oddType === "no" && goals.length >= 2 && ((_z = (_y = goals[1]) === null || _y === void 0 ? void 0 : _y.time) === null || _z === void 0 ? void 0 : _z.elapsed) > handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 92) { // Which team will score the 3rd goal?
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const status = getGoals(oddName, events, 3, home.id, away.id);
                return { profit, status, scores: total };
            }
            if (market_id === 94) { // 3rd Goal in Interval
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const goals = events.filter((e) => e.type === "Goal");
                if ((oddType === "no" && goals.length < 3) ||
                    (oddType === "yes" && goals.length >= 3 && ((_0 = goals[2].time) === null || _0 === void 0 ? void 0 : _0.elapsed) < handicap) ||
                    (oddType === "no" && goals.length >= 3 && ((_1 = goals[2].time) === null || _1 === void 0 ? void 0 : _1.elapsed) > handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 95) { // Home 2nd Goal in Interval
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const home_goals = events.filter((e) => { var _a; return e.type === "Goal" && ((_a = e.team) === null || _a === void 0 ? void 0 : _a.id) === home.id; });
                if (oddType === "no" && home_goals.length < 2)
                    return { profit, status: "WIN", scores: total };
                if ((oddType === "yes" && home_goals.length >= 2 && ((_2 = home_goals[1].time) === null || _2 === void 0 ? void 0 : _2.elapsed) < handicap) ||
                    (oddType === "no" && home_goals.length >= 2 && ((_3 = home_goals[1].time) === null || _3 === void 0 ? void 0 : _3.elapsed) > handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 96) { // Asian Handicap Converted Penaltie
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 97) { // Sudden Death
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 98) { // Away Penalty Shootout
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 99) { // Home Penalty Shootout
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 100) { // Home Total Converted Penalties
                if ((oddType === "over" && home_score_penalty > handicap) ||
                    (oddType === "under" && home_score_penalty < handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 101) { // Total Penalties in Shootout
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 102) { // Last Penalty Score/Miss
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 103) { // Correct Score in Shootouts
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 104) { // Total Converted Penalties
                const total_score_penalty = home_score_penalty + away_score_penalty;
                if ((oddType === "over" && total_score_penalty > handicap) ||
                    (oddType === "under" && total_score_penalty < handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 105) { // Total Converted Penalties - Goal Line
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 106) { // Away Total Converted Penalties
                if ((oddType === "over" && away_score_penalty > handicap) ||
                    (oddType === "under" && away_score_penalty < handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 107) { // Penalties Shootout Winner
                if ((oddType === "home" && home_score_penalty > away_score_penalty) ||
                    (oddType === "away" && away_score_penalty > home_score_penalty))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 109) { // Which team will score the 4th goal?
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const status = getGoals(oddName, events, 4, home.id, away.id);
                return { profit, status, scores: total };
            }
            if (market_id === 111) { // Last Penalty Scorer in Shootout
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 112) { // Which team will score the 5th goal?
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const status = getGoals(oddName, events, 5, home.id, away.id);
                return { profit, status, scores: total };
            }
            if (market_id === 113) { // Method of 2nd Goal
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const goals = events.filter((e) => e.type === "Goal");
                if (oddName === "No goal" && goals.length < 2)
                    return { profit, status: "WIN", scores: total };
                if (goals.length >= 2) {
                    if (!((_4 = goals[1].team) === null || _4 === void 0 ? void 0 : _4.id))
                        return { profit: stake, status: "REFUND", scores: total };
                    if ((oddName === "Shot" && goals[1].detail === "Normal Goal") ||
                        (oddName === "Penalty" && goals[1].detail === "Penalty") ||
                        (oddName === "Own goal" && goals[1].detail === "Own goal") ||
                        (oddName === "Header" && goals[1].detail === "Header") ||
                        (oddName === "Free kick" && goals[1].detail === "Free kick"))
                        return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 115) { // Player to be Booked
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const player_card = events.find((e) => { var _a; return e.type === "Card" && e.detail === "Yellow Card" && ((_a = e.player) === null || _a === void 0 ? void 0 : _a.name) === oddName; });
                if (player_card)
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 116) { // Action In Next 1 Minutes
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 117) { // First Action In Next 5 Minutes
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 118) { // Player to be Sent Off
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const player_card = events.find((e) => { var _a; return e.type === "Card" && e.detail === "Red Card" && ((_a = e.player) === null || _a === void 0 ? void 0 : _a.name) === oddName; });
                if (player_card)
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 119) { // Total Cards
                if (!statistics.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const yellow_cards = filterStatistic(statistics, "all", "Yellow Cards");
                const red_cards = filterStatistic(statistics, "all", "Red Cards");
                const total_cards = yellow_cards + red_cards;
                if ((oddType === "over" && total_cards > handicap) ||
                    (oddType === "under" && total_cards < handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 125) { // Home 3rd Goal in Interval
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const home_goals = events.filter((e) => { var _a; return e.type === "Goal" && ((_a = e.team) === null || _a === void 0 ? void 0 : _a.id) === home.id; });
                if ((oddType === "no" && home_goals.length < 3) ||
                    (oddType === "yes" && home_goals.length >= 3 && ((_5 = home_goals[2].time) === null || _5 === void 0 ? void 0 : _5.elapsed) < handicap) ||
                    (oddType === "no" && home_goals.length >= 3 && ((_6 = home_goals[2].time) === null || _6 === void 0 ? void 0 : _6.elapsed) > handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 127) { // Which team will score the 6th goal?
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const status = getGoals(oddName, events, 6, home.id, away.id);
                return { profit, status, scores: total };
            }
            if (market_id === 128) { // Away 3rd Goal in Interval
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const goals = events.filter((e) => { var _a; return e.type === "Goal" && ((_a = e.team) === null || _a === void 0 ? void 0 : _a.id) === away.id; });
                if ((oddType === "no" && goals.length < 3) ||
                    (oddType === "yes" && goals.length >= 3 && ((_8 = (_7 = goals[2]) === null || _7 === void 0 ? void 0 : _7.time) === null || _8 === void 0 ? void 0 : _8.elapsed) < handicap) ||
                    (oddType === "no" && goals.length >= 3 && ((_10 = (_9 = goals[2]) === null || _9 === void 0 ? void 0 : _9.time) === null || _10 === void 0 ? void 0 : _10.elapsed) > handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 129) { // Which team will score the 2nd goal in extra time?
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 130) { // Method of 3rd Goal
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const goals = events.filter((e) => e.type === "Goal");
                if (oddName === "No goal" && goals.length < 3)
                    return { profit, status: "WIN", scores: total };
                if (goals.length >= 3) {
                    if (!((_11 = goals[2].team) === null || _11 === void 0 ? void 0 : _11.id))
                        return { profit: stake, status: "REFUND", scores: total };
                    if ((oddName === "Shot" && goals[2].detail === "Normal Goal") ||
                        (oddName === "Penalty" && goals[2].detail === "Penalty") ||
                        (oddName === "Own goal" && goals[2].detail === "Own goal") ||
                        (oddName === "Header" && goals[2].detail === "Header") ||
                        (oddName === "Free kick" && goals[2].detail === "Free kick"))
                        return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 131) { // 4th Goal in Interval
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const goals = events.filter((e) => e.type === "Goal");
                if ((oddType === "no" && goals.length < 4) ||
                    (oddType === "yes" && goals.length >= 4 && ((_13 = (_12 = goals[3]) === null || _12 === void 0 ? void 0 : _12.time) === null || _13 === void 0 ? void 0 : _13.elapsed) < handicap) ||
                    (oddType === "no" && goals.length >= 4 && ((_15 = (_14 = goals[3]) === null || _14 === void 0 ? void 0 : _14.time) === null || _15 === void 0 ? void 0 : _15.elapsed) > handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 132) { // Which team will score the 7th goal?
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const status = getGoals(oddName, events, 7, home.id, away.id);
                return { profit, status, scores: total };
            }
            if (market_id === 134) { // Home 4th Goal in Interval
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const goals = events.filter((e) => { var _a; return e.type === "Goal" && ((_a = e.team) === null || _a === void 0 ? void 0 : _a.id) === home.id; });
                if ((oddType === "no" && goals.length < 4) ||
                    (oddType === "yes" && goals.length >= 4 && ((_17 = (_16 = goals[3]) === null || _16 === void 0 ? void 0 : _16.time) === null || _17 === void 0 ? void 0 : _17.elapsed) < handicap) ||
                    (oddType === "no" && goals.length >= 4 && ((_19 = (_18 = goals[3]) === null || _18 === void 0 ? void 0 : _18.time) === null || _19 === void 0 ? void 0 : _19.elapsed) > handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 135) { // Away 4th Goal in Interval
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const goals = events.filter((e) => { var _a; return e.type === "Goal" && ((_a = e.team) === null || _a === void 0 ? void 0 : _a.id) === away.id; });
                if ((oddType === "no" && goals.length < 4) ||
                    (oddType === "yes" && goals.length >= 4 && ((_21 = (_20 = goals[3]) === null || _20 === void 0 ? void 0 : _20.time) === null || _21 === void 0 ? void 0 : _21.elapsed) < handicap) ||
                    (oddType === "no" && goals.length >= 4 && ((_23 = (_22 = goals[3]) === null || _22 === void 0 ? void 0 : _22.time) === null || _23 === void 0 ? void 0 : _23.elapsed) > handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 136) { // 5th Goal in Interval
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const goals = events.filter((e) => e.type === "Goal");
                if ((oddType === "no" && goals.length < 5) ||
                    (oddType === "yes" && goals.length >= 5 && ((_25 = (_24 = goals[4]) === null || _24 === void 0 ? void 0 : _24.time) === null || _25 === void 0 ? void 0 : _25.elapsed) < handicap) ||
                    (oddType === "no" && goals.length >= 5 && ((_27 = (_26 = goals[4]) === null || _26 === void 0 ? void 0 : _26.time) === null || _27 === void 0 ? void 0 : _27.elapsed) > handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 137) { // Home 5th Goal in Interval
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const home_goals = events.filter((e) => { var _a; return e.type === "Goal" && ((_a = e.team) === null || _a === void 0 ? void 0 : _a.id) === home.id; });
                if ((oddType === "no" && home_goals.length < 5) ||
                    (oddType === "yes" && home_goals.length >= 5 && ((_28 = home_goals[4].time) === null || _28 === void 0 ? void 0 : _28.elapsed) < handicap) ||
                    (oddType === "no" && home_goals.length >= 5 && ((_29 = home_goals[4].time) === null || _29 === void 0 ? void 0 : _29.elapsed) > handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 138) { // Method of 4th Goal
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const goals = events.filter((e) => e.type === "Goal");
                if (oddName === "No goal" && goals.length < 4)
                    return { profit, status: "WIN", scores: total };
                if (goals.length >= 4) {
                    if (!((_30 = goals[3].team) === null || _30 === void 0 ? void 0 : _30.id))
                        return { profit: stake, status: "REFUND", scores: total };
                    if ((oddName === "Shot" && goals[3].detail === "Normal Goal") ||
                        (oddName === "Penalty" && goals[3].detail === "Penalty") ||
                        (oddName === "Own goal" && goals[3].detail === "Own goal") ||
                        (oddName === "Header" && goals[3].detail === "Header") ||
                        (oddName === "Free kick" && goals[3].detail === "Free kick"))
                        return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 139) { // Which team will score the 8th goal?
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const status = getGoals(oddName, events, 8, home.id, away.id);
                return { profit, status, scores: total };
            }
            if (market_id === 140) { // Which team will score the 9th goal?
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const status = getGoals(oddName, events, 9, home.id, away.id);
                return { profit, status, scores: total };
            }
            if (market_id === 144) { // 6th Goal in Interval
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const goals = events.filter((e) => e.type === "Goal");
                if ((oddType === "no" && goals.length < 6) ||
                    (oddType === "yes" && goals.length >= 6 && ((_32 = (_31 = goals[5]) === null || _31 === void 0 ? void 0 : _31.time) === null || _32 === void 0 ? void 0 : _32.elapsed) < handicap) ||
                    (oddType === "no" && goals.length >= 6 && ((_34 = (_33 = goals[5]) === null || _33 === void 0 ? void 0 : _33.time) === null || _34 === void 0 ? void 0 : _34.elapsed) > handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 145) { // Method of 5th Goal
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const goals = events.filter((e) => e.type === "Goal");
                if (oddName === "No goal" && goals.length < 5)
                    return { profit, status: "WIN", scores: total };
                if (goals.length >= 5) {
                    if (!((_35 = goals[4].team) === null || _35 === void 0 ? void 0 : _35.id))
                        return { profit: stake, status: "REFUND", scores: total };
                    if ((oddName === "Shot" && goals[4].detail === "Normal Goal") ||
                        (oddName === "Penalty" && goals[4].detail === "Penalty") ||
                        (oddName === "Own goal" && goals[4].detail === "Own goal") ||
                        (oddName === "Header" && goals[4].detail === "Header") ||
                        (oddName === "Free kick" && goals[4].detail === "Free kick"))
                        return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 146) { // Method of 6th Goal
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const goals = events.filter((e) => e.type === "Goal");
                if (oddName === "No goal" && goals.length < 6)
                    return { profit, status: "WIN", scores: total };
                if (goals.length >= 6) {
                    if (!((_36 = goals[5].team) === null || _36 === void 0 ? void 0 : _36.id))
                        return { profit: stake, status: "REFUND", scores: total };
                    if ((oddName === "Shot" && goals[5].detail === "Normal Goal") ||
                        (oddName === "Penalty" && goals[5].detail === "Penalty") ||
                        (oddName === "Own goal" && goals[5].detail === "Own goal") ||
                        (oddName === "Header" && goals[5].detail === "Header") ||
                        (oddName === "Free kick" && goals[5].detail === "Free kick"))
                        return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 148) { // Player Shots
                if (!players.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const player_name = oddName.split("/")[0];
                const odd = oddName.split("/")[1];
                const odd_type = odd.split(" ")[0];
                const odd_handicap = Number(odd.split(" ")[1]);
                let player_shots = 0;
                players.map((e) => {
                    if (player_shots === 0) {
                        const player = e.players.find((p) => { var _a; return ((_a = p.player) === null || _a === void 0 ? void 0 : _a.name) === player_name; });
                        if (player) {
                            player_shots = player.statistics.reduce((num, s) => {
                                var _a;
                                return num + (((_a = s.shots) === null || _a === void 0 ? void 0 : _a.total) || 0);
                            }, 0);
                        }
                    }
                });
                if ((odd_type === "over" && player_shots > odd_handicap) ||
                    (odd_type === "under" && player_shots < odd_handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 149) { // Total Shots
                if (!statistics.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const total_shots = filterStatistic(statistics, "all", "Total Shots");
                if ((oddType === "over" && total_shots > handicap) ||
                    (oddType === "under" && total_shots < handicap)) {
                    return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 150) { // Total shots on goal
                if (!statistics.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const total_shots_on_goal = filterStatistic(statistics, "all", "Shots on Goal");
                if ((oddType === "over" && total_shots_on_goal > handicap) ||
                    (oddType === "under" && total_shots_on_goal < handicap)) {
                    return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 151) { // Away Total Shots
                if (!statistics.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const total_shots = filterStatistic(statistics, away.id, "Total Shots");
                if ((oddType === "over" && total_shots > handicap) ||
                    (oddType === "under" && total_shots < handicap)) {
                    return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 152) { // Home Total Shots
                if (!statistics.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const total_shots = filterStatistic(statistics, home.id, "Total Shots");
                if ((oddType === "over" && total_shots > handicap) ||
                    (oddType === "under" && total_shots < handicap)) {
                    return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 153) { // Player Shots on Targets
                if (!players.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const player_name = oddName.split("/")[0];
                const odd = oddName.split("/")[1];
                const odd_type = odd.split(" ")[0];
                const odd_handicap = Number(odd.split(" ")[1]);
                let player_shots = 0;
                players.map((e) => {
                    if (player_shots === 0) {
                        const player = e.players.find((p) => { var _a; return ((_a = p.player) === null || _a === void 0 ? void 0 : _a.name) === player_name; });
                        if (player) {
                            player_shots = player.statistics.reduce((num, s) => {
                                var _a;
                                return num + (((_a = s.shots) === null || _a === void 0 ? void 0 : _a.on) || 0);
                            }, 0);
                        }
                    }
                });
                if ((odd_type === "over" && player_shots > odd_handicap) ||
                    (odd_type === "under" && player_shots < odd_handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 154) { // Home Total shots on goal
                if (!statistics.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const total_shots = filterStatistic(statistics, home.id, "Shots on Goal");
                if ((oddType === "over" && total_shots > handicap) ||
                    (oddType === "under" && total_shots < handicap)) {
                    return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 155) { // Player Assists
                if (!players.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const player_name = oddName.split("/")[0];
                const odd = oddName.split("/")[1];
                const odd_type = odd.split(" ")[0];
                const odd_handicap = Number(odd.split(" ")[1]);
                let player_assists = 0;
                players.map((e) => {
                    if (player_assists === 0) {
                        const player = e.players.find((p) => { var _a; return ((_a = p.player) === null || _a === void 0 ? void 0 : _a.name) === player_name; });
                        if (player) {
                            player_assists = player.statistics.reduce((num, s) => {
                                var _a;
                                return num + (((_a = s.goals) === null || _a === void 0 ? void 0 : _a.assists) || 0);
                            }, 0);
                        }
                    }
                });
                if ((odd_type === "over" && player_assists > odd_handicap) ||
                    (odd_type === "under" && player_assists < odd_handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 156) { // Away Total shots on goal
                if (!statistics.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const total_shots = filterStatistic(statistics, away.id, "Shots on Goal");
                if ((oddType === "over" && total_shots > handicap) ||
                    (oddType === "under" && total_shots < handicap)) {
                    return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 157) { // Method of 7th Goal
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const goals = events.filter((e) => e.type === "Goal");
                if (oddName === "No goal" && goals.length < 7)
                    return { profit, status: "WIN", scores: total };
                if (goals.length >= 7) {
                    if (!((_37 = goals[6].team) === null || _37 === void 0 ? void 0 : _37.id))
                        return { profit: stake, status: "REFUND", scores: total };
                    if ((oddName === "Shot" && goals[6].detail === "Normal Goal") ||
                        (oddName === "Penalty" && goals[6].detail === "Penalty") ||
                        (oddName === "Own goal" && goals[6].detail === "Own goal") ||
                        (oddName === "Header" && goals[6].detail === "Header") ||
                        (oddName === "Free kick" && goals[6].detail === "Free kick"))
                        return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 158) { // Method of 8th Goal
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const goals = events.filter((e) => e.type === "Goal");
                if (oddName === "No goal" && goals.length < 8)
                    return { profit, status: "WIN", scores: total };
                if (goals.length >= 8) {
                    if (!((_38 = goals[7].team) === null || _38 === void 0 ? void 0 : _38.id))
                        return { profit: stake, status: "REFUND", scores: total };
                    if ((oddName === "Shot" && goals[7].detail === "Normal Goal") ||
                        (oddName === "Penalty" && goals[7].detail === "Penalty") ||
                        (oddName === "Own goal" && goals[7].detail === "Own goal") ||
                        (oddName === "Header" && goals[7].detail === "Header") ||
                        (oddName === "Free kick" && goals[7].detail === "Free kick"))
                        return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 159) { // 7th Goal in Interval
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const goals = events.filter((e) => e.type === "Goal");
                if ((oddType === "no" && goals.length < 7) ||
                    (oddType === "yes" && goals.length >= 7 && ((_40 = (_39 = goals[6]) === null || _39 === void 0 ? void 0 : _39.time) === null || _40 === void 0 ? void 0 : _40.elapsed) < handicap) ||
                    (oddType === "no" && goals.length >= 7 && ((_42 = (_41 = goals[6]) === null || _41 === void 0 ? void 0 : _41.time) === null || _42 === void 0 ? void 0 : _42.elapsed) > handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 161) { // Away 5th Goal in Interval
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const goals = events.filter((e) => { var _a; return e.type === "Goal" && ((_a = e.team) === null || _a === void 0 ? void 0 : _a.id) === away.id; });
                if ((oddType === "no" && goals.length < 5) ||
                    (oddType === "yes" && goals.length >= 5 && ((_44 = (_43 = goals[4]) === null || _43 === void 0 ? void 0 : _43.time) === null || _44 === void 0 ? void 0 : _44.elapsed) < handicap) ||
                    (oddType === "no" && goals.length >= 5 && ((_46 = (_45 = goals[4]) === null || _45 === void 0 ? void 0 : _45.time) === null || _46 === void 0 ? void 0 : _46.elapsed) > handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 162) { // Which team will score the 3rd goal in extra time?
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 204) { // Corners Asian Handicap (1st Half)
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 250) { // Extra Time Over/Under Line
                const total_score = home_score_extratime + away_score_extratime;
                if ((oddType === "over" && total_score > handicap) ||
                    (oddType === "under" && total_score < handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
        }
        if (TimeStatus === 0) {
            if (market_id === 1) { // Match Winner
                if ((oddType === "home" && home_score_full > away_score_full) ||
                    (oddType === "away" && away_score_full > home_score_full) ||
                    (oddType === "draw" && home_score_full === away_score_full))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 2) { // Home/Away
                if ((oddType === "home" && home_score_full > away_score_full) ||
                    (oddType === "away" && away_score_full > home_score_full))
                    return { profit, status: "WIN", scores: total };
                if (away_score_full === home_score_full)
                    return { profit: stake, status: "REFUND", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 3) { // Second Half Winner
                const home_score_2nd = home_score_full - home_score_half;
                const away_score_2nd = away_score_full - away_score_half;
                if ((oddType === "home" && home_score_2nd > away_score_2nd) ||
                    (oddType === "away" && away_score_2nd > home_score_2nd) ||
                    (oddType === "draw" && home_score_2nd === away_score_2nd))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 4) { // Asian Handicap
                const odd_handicap = Number(oddName.split(" ")[1]);
                const result = getHandicap(oddType, odd_handicap, home_score_full, away_score_full, profit, stake);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            if (market_id === 5) { // Goals Over/Under
                const odd_handicap = Number(oddName.split(" ")[1]);
                const total_score = home_score_full + away_score_full;
                const result = getOverUnder(oddType, total_score, odd_handicap, profit, stake);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            if (market_id === 6) { // Goals Over/Under First Half
                const odd_handicap = Number(oddName.split(" ")[1]);
                const total_score_half = home_score_half + away_score_half;
                const result = getOverUnder(oddType, total_score_half, odd_handicap, profit, stake);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            if (market_id === 7) { // HT/FT Double
                if ((oddName === "Home/Draw" && home_score_half > away_score_half && home_score_full === away_score_full) ||
                    (oddName === "Home/Away" && home_score_half > away_score_half && home_score_full < away_score_full) ||
                    (oddName === "Draw/Away" && home_score_half === away_score_half && home_score_full < away_score_full) ||
                    (oddName === "Draw/Draw" && home_score_half === away_score_half && home_score_full === away_score_full) ||
                    (oddName === "Home/Home" && home_score_half > away_score_half && home_score_full > away_score_full) ||
                    (oddName === "Draw/Home" && home_score_half === away_score_half && home_score_full > away_score_full) ||
                    (oddName === "Away/Home" && home_score_half < away_score_half && home_score_full > away_score_full) ||
                    (oddName === "Away/Draw" && home_score_half < away_score_half && home_score_full === away_score_full) ||
                    (oddName === "Away/Away" && home_score_half < away_score_half && home_score_full < away_score_full))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 8) { // Both Teams Score
                if ((oddName === "yes" && home_score_full > 0 && away_score_full > 0) ||
                    (oddName === "no" && home_score_full === 0 || away_score_full === 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 9) { // Handicap Result
                const odd_handicap = Number(oddName.split(" ")[1]);
                if ((oddType === "home" && (home_score_full + odd_handicap) > away_score_full) ||
                    (oddType === "draw" && (home_score_full + odd_handicap) === away_score_full) ||
                    (oddType === "away" && (home_score_full + odd_handicap) < away_score_full))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 10) { // Exact Score
                const odd_home_goal = Number(oddName.split(":")[0]);
                const odd_away_goal = Number(oddName.split(":")[1]);
                if (odd_home_goal === home_score_full && odd_away_goal === away_score_full)
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 11) { // Highest Scoring Half
                const total_score_1st = home_score_half + away_score_half;
                const total_score_2nd = (home_score_full - home_score_half) + (away_score_full - away_score_half);
                if ((oddName === "Draw" && total_score_1st === total_score_2nd) ||
                    (oddName === "1st Half" && total_score_1st > total_score_2nd) ||
                    (oddName === "2nd Half" && total_score_1st < total_score_2nd))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 12) { // Double Chance
                if ((oddName === "Home/Draw" && home_score_full >= away_score_full) ||
                    (oddName === "Home/Away" && home_score_full !== away_score_full) ||
                    (oddName === "Draw/Away" && home_score_full <= away_score_full))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 13) { // First Half Winner
                if ((oddType === "home" && home_score_half > away_score_half) ||
                    (oddType === "draw" && home_score_half === away_score_half) ||
                    (oddType === "away" && home_score_half < away_score_half))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 14) { // Team To Score First
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const first_goal = events.find((e) => e.type === "Goal");
                if ((oddType === "draw" && !first_goal) ||
                    (oddType === "home" && first_goal && ((_47 = first_goal.team) === null || _47 === void 0 ? void 0 : _47.id) === home.id) ||
                    (oddType === "away" && first_goal && ((_48 = first_goal.team) === null || _48 === void 0 ? void 0 : _48.id) === away.id))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 15) { // Team To Score Last
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const goals = events.filter((e) => e.type === "Goal");
                if ((oddType === "draw" && !goals.length) ||
                    (oddType === "home" && goals.length && ((_49 = goals[goals.length - 1].team) === null || _49 === void 0 ? void 0 : _49.id) === home.id) ||
                    (oddType === "away" && goals.length && ((_50 = goals[goals.length - 1].team) === null || _50 === void 0 ? void 0 : _50.id) === away.id))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 16) { // Total - Home
                const odd_handicap = Number(oddName.split(" ")[1]);
                if ((oddType === "over" && home_score_full > odd_handicap) ||
                    (oddType === "under" && home_score_full < odd_handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 17) { // Total - Away
                const odd_handicap = Number(oddName.split(" ")[1]);
                if ((oddType === "over" && away_score_full > odd_handicap) ||
                    (oddType === "under" && away_score_full < odd_handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 18) { // Handicap Result - First Half
                const odd_handicap = Number(oddName.split(" ")[1]);
                if ((oddType === "home" && (home_score_half + odd_handicap) > away_score_half) ||
                    (oddType === "draw" && (home_score_half + odd_handicap) === away_score_half) ||
                    (oddType === "away" && (home_score_half + odd_handicap) < away_score_half))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 19) { // Asian Handicap First Half
                const odd_handicap = Number(oddName.split(" ")[1]);
                const result = getHandicap(oddType, odd_handicap, home_score_half, away_score_half, profit, stake);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            if (market_id === 20) { // Double Chance - First Half
                if ((oddName === "Home/Draw" && home_score_half >= away_score_half) ||
                    (oddName === "Home/Away" && home_score_half !== away_score_half) ||
                    (oddName === "Draw/Away" && home_score_half <= away_score_half))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 21) { // Odd/Even
                const total_goal = home_score_full + away_score_full;
                if ((oddName === "Odd" && total_goal % 2 === 1) ||
                    (oddName === "Even" && total_goal % 2 === 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 22) { // Odd/Even - First Half
                const total_goal = home_score_half + away_score_half;
                if ((oddName === "Odd" && total_goal % 2 === 1) ||
                    (oddName === "Even" && total_goal % 2 === 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 23) { // Home Odd/Even
                if ((oddName === "Odd" && home_score_full % 2 === 1) ||
                    (oddName === "Even" && home_score_full % 2 === 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 24) { // Results/Both Teams Score
                if ((oddName === "Home/Yes" && home_score_full > away_score_full && away_score_full > 0) ||
                    (oddName === "Away/Yes" && home_score_full < away_score_full && home_score_full > 0) ||
                    (oddName === "Draw/Yes" && home_score_full === away_score_full && home_score_full > 0) ||
                    (oddName === "Home/No" && home_score_full > away_score_full && away_score_full === 0) ||
                    (oddName === "Away/No" && home_score_full < away_score_full && home_score_full === 0) ||
                    (oddName === "Draw/No" && home_score_full === away_score_full && home_score_full === 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 25) { // Result/Total Goals
                const odd_result = oddName.split("/")[0];
                const odd = oddName.split("/")[1];
                const odd_type = odd.split(" ")[0];
                const odd_handicap = Number(odd.split(" ")[1]);
                const total_goals = home_score_full + away_score_full;
                if ((odd_result === "Home" && home_score_full > away_score_full && odd_type === "Over" && total_goals > odd_handicap) ||
                    (odd_result === "Home" && home_score_full > away_score_full && odd_type === "Under" && total_goals < odd_handicap) ||
                    (odd_result === "Draw" && home_score_full === away_score_full && odd_type === "Over" && total_goals > odd_handicap) ||
                    (odd_result === "Draw" && home_score_full === away_score_full && odd_type === "Under" && total_goals < odd_handicap) ||
                    (odd_result === "Away" && home_score_full < away_score_full && odd_type === "Over" && total_goals > odd_handicap) ||
                    (odd_result === "Away" && home_score_full < away_score_full && odd_type === "Under" && total_goals < odd_handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 26) { // Goals Over/Under - Second Half
                const odd_handicap = Number(oddName.split(" ")[1]);
                const home_score_2nd = home_score_full - home_score_half;
                const away_score_2nd = away_score_full - away_score_half;
                const total_goal_2nd = home_score_2nd + away_score_2nd;
                const result = getOverUnder(oddType, total_goal_2nd, odd_handicap, profit, stake);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            if (market_id === 27) { // Clean Sheet - Home
                if ((oddType === "yes" && away_score_full === 0) ||
                    (oddType === "no" && away_score_full > 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 28) { // Clean Sheet - Away
                if ((oddType === "yes" && home_score_full === 0) ||
                    (oddType === "no" && home_score_full > 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 31) { // Correct Score - First Half
                const odd_home_goal = Number(oddName.split(":")[0]);
                const odd_away_goal = Number(oddName.split(":")[1]);
                if (odd_home_goal === home_score_half && odd_away_goal === away_score_half)
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 32) { // Win Both Halves
                const home_score_2nd = home_score_full - home_score_half;
                const away_score_2nd = away_score_full - away_score_half;
                if ((oddType === "home" && home_score_half > away_score_half && home_score_2nd > away_score_2nd) ||
                    (oddType === "away" && home_score_half < away_score_half && home_score_2nd < away_score_2nd))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 34) { // Both Teams Score - First Half
                if ((oddName === "yes" && home_score_half > 0 && away_score_half > 0) ||
                    (oddName === "no" && home_score_half === 0 || away_score_half === 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 35) { // Both Teams To Score - Second Half
                const home_score_2nd = home_score_full - home_score_half;
                const away_score_2nd = away_score_full - away_score_half;
                if ((oddName === "yes" && home_score_2nd > 0 && away_score_2nd > 0) ||
                    (oddName === "no" && home_score_2nd === 0 || away_score_2nd === 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 36) { // Win To Nil
                if ((oddType === "home" && home_score_full > 0 && away_score_full === 0) ||
                    (oddType === "away" && away_score_full > 0 && home_score_full === 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 38) { // Exact Goals Number
                const total_goal = home_score_full + away_score_full;
                if (oddName === "more 7" && home_score_full >= 7)
                    return { profit, status: "WIN", scores: total };
                const odd_goal = Number(oddName);
                if (total_goal === odd_goal)
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 39) { // To Win Either Half
                if ((oddType === "home" && home_score_full > 0 && away_score_full === 0) ||
                    (oddType === "away" && away_score_full > 0 && home_score_full === 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 40) { // Home Team Exact Goals Number
                if (oddName === "more 3" && home_score_full >= 3)
                    return { profit, status: "WIN", scores: total };
                else {
                    const odd_goal = Number(oddName);
                    if (odd_goal === home_score_full)
                        return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 41) { // Away Team Exact Goals Number
                if (oddName === "more 3" && away_score_full >= 3)
                    return { profit, status: "WIN", scores: total };
                else {
                    const odd_goal = Number(oddName);
                    if (odd_goal === away_score_full)
                        return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 42) { // Second Half Exact Goals Number
                const home_score_2nd = home_score_full - home_score_half;
                const away_score_2nd = away_score_full - away_score_half;
                const total_score_2nd = home_score_2nd + away_score_2nd;
                if (oddName === "more 5" && total_score_2nd >= 5)
                    return { profit, status: "WIN", scores: total };
                else {
                    const odd_goal = Number(oddName);
                    if (odd_goal === total_score_2nd)
                        return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 45) { // Corners Over Under
                if (!statistics.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const odd_type = oddName.split(" ")[0];
                const odd_handicap = Number(oddName.split(" ")[1]);
                const total_corners = filterStatistic(statistics, "all", "Corner Kicks");
                if ((odd_type === "Over" && total_corners > odd_handicap) ||
                    (odd_type === "Under" && total_corners < odd_handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 46) { // Exact Goals Number - First Half
                const total_score_1st = home_score_half + away_score_half;
                if (oddName === "more 5" && total_score_1st >= 5)
                    return { profit, status: "WIN", scores: total };
                else {
                    const odd_goal = Number(oddName);
                    if (odd_goal === total_score_1st)
                        return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 47) { // Winning Margin
                if ((oddName === "Score Draw" && home_score_full === away_score_full && away_score_full > 0) ||
                    (oddName === "Draw" && home_score_full === away_score_full && away_score_full === 0))
                    return { profit, status: "WIN", scores: total };
                if (oddName.includes(" by ")) {
                    const team = oddName.split(" by ")[0];
                    const goal = oddName.split(" by ")[1];
                    const isOver = goal.includes("+");
                    const goal_num = Number(goal.replaceAll("+", ""));
                    let d_score = 0;
                    if (team === "1")
                        d_score = home_score_full - away_score_full;
                    if (team === "2")
                        d_score = away_score_full - home_score_full;
                    if ((!isOver && d_score === goal_num) ||
                        (isOver && d_score >= goal_num))
                        return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 48) { // To Score In Both Halves By Teams
                const home_score_2nd = home_score_full - home_score_half;
                const away_score_2nd = away_score_full - away_score_half;
                if ((oddType === "home" && home_score_half > 0 && home_score_2nd > 0) ||
                    (oddType === "away" && away_score_half > 0 && away_score_2nd > 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 49) { // Total Goals/Both Teams To Score
                const odd = oddName.split(" ")[0];
                const odd_goals = odd.split("/")[0];
                const odd_score = odd.split("/")[1];
                const odd_handicap = Number(oddName.split(" ")[1]);
                const total_goals = home_score_full + away_score_full;
                if ((odd_score === "yes" && home_score_full > 0 && away_score_full > 0 && odd_goals === "o" && total_goals > odd_handicap) ||
                    (odd_score === "yes" && home_score_full > 0 && away_score_full > 0 && odd_goals === "u" && total_goals < odd_handicap) ||
                    (oddType === "no" && (away_score_full === 0 || away_score_half === 0) && odd_goals === "o" && total_goals > odd_handicap) ||
                    (oddType === "no" && (away_score_full === 0 || away_score_half === 0) && odd_goals === "u" && total_goals < odd_handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 50) { // Goal Line
                const odd_handicap = Number(oddName.split(" ")[1]);
                const total_score = home_score_full + away_score_full;
                const result = getOverUnder(oddType, total_score, odd_handicap, profit, stake);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            if (market_id === 54) { // First 10 min Winner
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const result = getWinnerInSomeMin(oddType, events, 10, home.id, away.id, profit);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            if (market_id === 55) { // Corners 1x2
                if (!statistics.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const home_corner = filterStatistic(statistics, home.id, "Corner Kicks");
                const away_corner = filterStatistic(statistics, away.id, "Corner Kicks");
                if ((oddType === "home" && home_corner > away_corner) ||
                    (oddType === "away" && away_corner > home_corner) ||
                    (oddType === "draw" && home_corner === away_corner))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 56) { // Corners Asian Handicap
                if (!statistics.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const odd_handicap = Number(oddName.split(" ")[1]);
                const home_corner = filterStatistic(statistics, home.id, "Corner Kicks");
                const away_corner = filterStatistic(statistics, away.id, "Corner Kicks");
                if ((oddType === "home" && (home_corner + odd_handicap) > away_corner) ||
                    (oddType === "away" && (away_corner + odd_handicap) > home_corner))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 57) { // Home Corners Over/Under
                if (!statistics.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const odd_handicap = Number(oddName.split(" ")[1]);
                const home_corner = filterStatistic(statistics, home.id, "Corner Kicks");
                if ((oddType === "over" && home_corner > odd_handicap) ||
                    (oddType === "under" && home_corner < odd_handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 58) { // Away Corners Over/Under
                if (!statistics.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const odd_handicap = Number(oddName.split(" ")[1]);
                const away_corner = filterStatistic(statistics, away.id, "Corner Kicks");
                if ((oddType === "over" && away_corner > odd_handicap) ||
                    (oddType === "under" && away_corner < odd_handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 59) { // Own Goal
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const own_goal = events.some((e) => e.type === "Goal" && e.detail === "Own Goal");
                if ((oddType === "yes" && own_goal) ||
                    (oddType === "no" && !own_goal))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 60) { // Away Odd/Even
                if ((oddName === "Odd" && away_score_full % 2 === 1) ||
                    (oddName === "Even" && away_score_full % 2 === 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 61) { // To Qualify
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 63) { // Odd/Even - Second Half
                const home_score_2nd = home_score_full - home_score_half;
                const away_score_2nd = away_score_full - away_score_half;
                const total_score_2nd = home_score_2nd + away_score_2nd;
                if ((oddName === "Odd" && total_score_2nd % 2 === 1) ||
                    (oddName === "Even" && total_score_2nd % 2 === 0))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 72) { // Goal Line (1st Half)
                const odd_handicap = Number(oddName.split(" ")[1]);
                const total_score = home_score_half + away_score_half;
                const result = getOverUnder(oddType, total_score, odd_handicap, profit, stake);
                return Object.assign(Object.assign({}, result), { scores: total });
            }
            if (market_id === 77) { // Total Corners (1st Half)
                return { profit: stake, status: "REFUND", scores: total };
            }
            if (market_id === 78) { // RTG_H1
                const odd_type = oddName.split(" ")[0];
                const odd_handicap = Number(oddName.split(" ")[1]);
                const total_goals_half = home_score_half + away_score_half;
                if ((odd_type === "Draw/Over" && home_score_half === away_score_half && total_goals_half > odd_handicap) ||
                    (odd_type === "Away/Over" && home_score_half < away_score_half && total_goals_half > odd_handicap) ||
                    (odd_type === "Home/Over" && home_score_half > away_score_half && total_goals_half > odd_handicap) ||
                    (odd_type === "Home/Under" && home_score_half > away_score_half && total_goals_half < odd_handicap) ||
                    (odd_type === "Draw/Under" && home_score_half === away_score_half && total_goals_half < odd_handicap) ||
                    (odd_type === "Away/Under" && home_score_half < away_score_half && total_goals_half < odd_handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 79) { // Cards European Handicap
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const odd_handicap = Number(oddName.split(" ")[1]);
                const home_total_cards = events.filter((e) => { var _a; return e.type === "Card" && ((_a = e.team) === null || _a === void 0 ? void 0 : _a.id) === home.id; }).length;
                const away_total_cards = events.filter((e) => { var _a; return e.type === "Card" && ((_a = e.team) === null || _a === void 0 ? void 0 : _a.id) === away.id; }).length;
                if ((oddType === "home" && (home_total_cards + odd_handicap) > away_total_cards) ||
                    (oddType === "away" && (home_total_cards + odd_handicap) < away_total_cards) ||
                    (oddType === "draw" && (home_total_cards + odd_handicap) === away_total_cards))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 80) { // Cards Over/Under
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const odd_handicap = Number(oddName.split(" ")[1]);
                const total_cards = events.filter((e) => e.type === "Card");
                if ((oddType === "over" && total_cards.length > odd_handicap) ||
                    (oddType === "under" && total_cards.length < odd_handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 81) { // Cards Asian Handicap
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const odd_handicap = Number(oddName.split(" ")[1]);
                const home_total_cards = events.filter((e) => { var _a; return e.type === "Card" && ((_a = e.team) === null || _a === void 0 ? void 0 : _a.id) === home.id; }).length;
                const away_total_cards = events.filter((e) => { var _a; return e.type === "Card" && ((_a = e.team) === null || _a === void 0 ? void 0 : _a.id) === away.id; }).length;
                if ((oddType === "home" && (home_total_cards + odd_handicap) > away_total_cards) ||
                    (oddType === "away" && (away_total_cards + odd_handicap) > home_total_cards))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 82) { // Home Team Total Cards
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const odd_handicap = Number(oddName.split(" ")[1]);
                const home_total_cards = events.filter((e) => { var _a; return e.type === "Card" && ((_a = e.team) === null || _a === void 0 ? void 0 : _a.id) === home.id; }).length;
                if ((oddType === "over" && home_total_cards > odd_handicap) ||
                    (oddType === "under" && home_total_cards < odd_handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 83) { // Away Team Total Cards
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const odd_handicap = Number(oddName.split(" ")[1]);
                const away_total_cards = events.filter((e) => { var _a; return e.type === "Card" && ((_a = e.team) === null || _a === void 0 ? void 0 : _a.id) === away.id; }).length;
                if ((oddType === "over" && away_total_cards > odd_handicap) ||
                    (oddType === "under" && away_total_cards < odd_handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 85) { // Total Corners (3 way)
                if (!statistics.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const odd_handicap = Number(oddName.split(" ")[1]);
                const totalCorner = filterStatistic(statistics, "all", "Corner Kicks");
                if ((oddType === "over" && totalCorner > odd_handicap) ||
                    (oddType === "under" && totalCorner < odd_handicap) ||
                    (oddType === "exactly" && totalCorner === odd_handicap))
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 92) { // Anytime Goal Scorer
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const player_goal = events.some((e) => { var _a; return e.type === "Goal" && ((_a = e.player) === null || _a === void 0 ? void 0 : _a.name) === oddName; });
                if (player_goal)
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 93) { // First Goal Scorer
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const first_goal = events.find((e) => e.type === "Goal");
                if (first_goal && ((_51 = first_goal.player) === null || _51 === void 0 ? void 0 : _51.name) === oddName)
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 94) { // Last Goal Scorer
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const goals = events.filter((e) => e.type === "Goal");
                if (goals.length && ((_52 = goals[goals.length - 1].player) === null || _52 === void 0 ? void 0 : _52.name) === oddName)
                    return { profit, status: "WIN", scores: total };
                return { profit, status: "LOST", scores: total };
            }
            if (market_id === 97) { // First Goal Method
                if (!events.length)
                    return { profit: stake, status: "REFUND", scores: total };
                const first_goal = events.find((e) => e.type === "Goal");
                if (oddName === "Draw" && !first_goal)
                    return { profit, status: "WIN", scores: total };
                if (first_goal) {
                    if (!((_53 = first_goal.team) === null || _53 === void 0 ? void 0 : _53.id))
                        return { profit: stake, status: "REFUND", scores: total };
                    if ((oddName === "Shot" && first_goal.detail === "Normal Goal") ||
                        (oddName === "Penalty" && first_goal.detail === "Penalty") ||
                        (oddName === "OwnGoal" && first_goal.detail === "Own goal") ||
                        (oddName === "Header" && first_goal.detail === "Header") ||
                        (oddName === "FreeKick" && first_goal.detail === "Free kick"))
                        return { profit, status: "WIN", scores: total };
                }
                return { profit, status: "LOST", scores: total };
            }
            console.log('getBettingStatus null');
            return null;
        }
    }
    catch (error) {
        console.log('error getBettingStatus =>', error);
        return null;
    }
});
exports.getBettingStatus = getBettingStatus;
