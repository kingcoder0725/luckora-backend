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
exports.getCProfit = exports.removeSports = exports.removeTest = exports.getUserProfit = exports.getProfits = exports.report = void 0;
const moment = require("moment");
const base_1 = require("../base");
const models_1 = require("../../models");
const filter = (data) => (data ? data : 0);
const addDays = (days, dates) => {
    const date = new Date(dates.valueOf());
    date.setDate(date.getDate() + days);
    return date;
};
const getDates = (startDate, stopDate) => {
    const dateArray = [];
    let currentDate = startDate;
    while (currentDate <= stopDate) {
        dateArray.push(new Date(currentDate));
        currentDate = addDays(1, currentDate);
    }
    return dateArray;
};
const getChartData = (qdate, req) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    const dateMatch = {
        $match: {
            createdAt: {
                $gte: new Date(qdate[0]),
                $lte: new Date(qdate[1]),
            },
        },
    };
    const groupBy = {
        $group: {
            _id: {
                year: { $year: '$_id' },
                month: { $month: '$_id' },
                day: { $dayOfMonth: '$_id' },
            },
            Total: { $sum: 1 },
        },
    };
    const projectQuery = {
        $project: {
            _id: 0,
            Total: 1,
            name: {
                $concat: [
                    { $convert: { input: '$_id.year', to: 'string' } },
                    '-',
                    { $convert: { input: '$_id.month', to: 'string' } },
                    '-',
                    { $convert: { input: '$_id.day', to: 'string' } },
                ],
            },
        },
    };
    const query1 = [];
    const query2 = [];
    if (req.user && req.user.rolesId.type === 'agent') {
        query2.push({
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user',
            },
        });
        query2.push({ $unwind: '$user' });
        query2.push({ $match: { ['user.creatorId']: req.user._id } });
        query1.push({ $match: { creatorId: req.user._id } });
    }
    const cUsers = yield models_1.Users.aggregate([dateMatch, groupBy, ...query1, projectQuery]);
    const cSportsBets = yield models_1.SportsBets.aggregate([dateMatch, groupBy, ...query2, projectQuery]);
    const cBets = yield models_1.GameHistories.aggregate([dateMatch, groupBy, ...query2, projectQuery]);
    const cPayments = yield models_1.Payments.aggregate([
        { $match: { $and: [{ status: { $ne: 0 } }, { status: { $ne: -1 } }] } },
        dateMatch,
        groupBy,
        ...query2,
        projectQuery,
    ]);
    const cLoginHistories = yield models_1.LoginHistories.aggregate([dateMatch, groupBy, ...query2, projectQuery]);
    const cData = [
        {
            count: cBets.length,
            value: cBets,
        },
        {
            count: cUsers.length,
            value: cUsers,
        },
        {
            count: cSportsBets.length,
            value: cSportsBets,
        },
        {
            count: cPayments.length,
            value: cPayments,
        },
        {
            count: cLoginHistories.length,
            value: cLoginHistories,
        },
    ].sort((a, b) => b.count - a.count)[0];
    const date = cData.value.map((item) => item.name);
    const charts = [];
    for (const i in date) {
        const user = (_a = cUsers.find((e) => e.name === date[i])) === null || _a === void 0 ? void 0 : _a.Total;
        const bet1 = (_b = cSportsBets.find((e) => e.name === date[i])) === null || _b === void 0 ? void 0 : _b.Total;
        const bet2 = (_c = cBets.find((e) => e.name === date[i])) === null || _c === void 0 ? void 0 : _c.Total;
        const payment = (_d = cPayments.find((e) => e.name === date[i])) === null || _d === void 0 ? void 0 : _d.Total;
        const login = (_e = cLoginHistories.find((e) => e.name === date[i])) === null || _e === void 0 ? void 0 : _e.Total;
        const result = {
            user: filter(user),
            bet: filter(bet1) + filter(bet2),
            payment: filter(payment),
            login: filter(login),
            name: date[i],
        };
        charts.push(result);
    }
    charts.sort((a, b) => new Date(a.name).valueOf() - new Date(b.name).valueOf());
    return charts;
});
const getPlayerData = (qdate, req) => __awaiter(void 0, void 0, void 0, function* () {
    const query1 = {};
    const query2 = [];
    if (req.user && req.user.rolesId.type === 'agent') {
        query1.creatorId = req.user._id;
        query2.push({
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user',
            },
        });
        query2.push({ $unwind: '$user' });
        query2.push({ $match: { ['user.creatorId']: req.user._id } });
    }
    const role = yield models_1.Roles.findOne({ type: 'player' });
    const players = yield models_1.Users.aggregate([
        {
            $match: Object.assign(Object.assign({}, query1), { rolesId: role._id, createdAt: { $gte: new Date(qdate[0]), $lte: new Date(qdate[1]) } }),
        },
    ]);
    const login = yield models_1.LoginHistories.aggregate([
        {
            $match: { createdAt: { $gte: new Date(qdate[0]), $lte: new Date(qdate[1]) } },
        },
        ...query2,
    ]);
    const logined = yield models_1.Sessions.aggregate([
        {
            $match: { createdAt: { $gte: new Date(qdate[0]), $lte: new Date(qdate[1]) } },
        },
        ...query2,
    ]);
    const bets = yield models_1.SportsBets.aggregate([
        {
            $match: { createdAt: { $gte: new Date(qdate[0]), $lte: new Date(qdate[1]) } },
        },
        ...query2,
    ]);
    const games = yield models_1.GameHistories.aggregate([
        {
            $match: { createdAt: { $gte: new Date(qdate[0]), $lte: new Date(qdate[1]) } },
        },
        ...query2,
    ]);
    let total_ggr = {};
    bets.forEach((bet) => {
        if (total_ggr[bet.currency]) {
            total_ggr[bet.currency] += bet.stake || 0;
        }
        else {
            total_ggr[bet.currency] = bet.stake || 0;
        }
    });
    games.forEach((game) => {
        if (total_ggr[game.currency]) {
            total_ggr[game.currency] += game.bet_money || 0;
        }
        else {
            total_ggr[game.currency] = game.bet_money || 0;
        }
    });
    return { players: players.length, login: login.length, logined: logined.length, bets: bets.length, games: games.length, total_ggr };
});
const getSportsBetData = (qdate, req) => __awaiter(void 0, void 0, void 0, function* () {
    const query2 = [];
    if (req.user && req.user.rolesId.type === 'agent') {
        query2.push({
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user',
            },
        });
        query2.push({ $unwind: '$user' });
        query2.push({ $match: { ['user.creatorId']: req.user._id } });
    }
    const balances = yield models_1.Balances.aggregate([
        {
            $lookup: {
                from: 'currencies',
                localField: 'currency',
                foreignField: '_id',
                as: 'currency',
            },
        },
        {
            $unwind: '$currency',
        },
        ...query2,
        {
            $group: {
                _id: {
                    currency: '$currency',
                },
                balance: { $sum: '$balance' },
                count: { $sum: 1 },
            },
        },
        {
            $project: {
                balance: 1,
                count: 1,
                _id: 0,
                currency: '$_id.currency.symbol',
                order: '$_id.currency.order',
                usd: {
                    $multiply: ['$balance', '$_id.currency.price'],
                },
            },
        },
        {
            $sort: {
                order: 1,
            },
        },
    ]);
    const payments = yield models_1.Payments.aggregate([
        {
            $match: {
                $and: [
                    { status: { $ne: 0 } },
                    { status: { $ne: -1 } },
                    {
                        createdAt: {
                            $gte: new Date(qdate[0]),
                            $lte: new Date(qdate[1]),
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: 'balances',
                localField: 'balanceId',
                foreignField: '_id',
                as: 'balance',
            },
        },
        {
            $unwind: '$balance',
        },
        {
            $lookup: {
                from: 'currencies',
                localField: 'balance.currency',
                foreignField: '_id',
                as: 'currency',
            },
        },
        {
            $unwind: '$currency',
        },
        ...query2,
        {
            $group: {
                _id: {
                    status: '$ipn_type',
                    currency: '$currency',
                },
                amount: { $sum: '$amount' },
                count: { $sum: 1 },
            },
        },
        {
            $project: {
                amount: 1,
                usd: { $multiply: ['$amount', '$_id.currency.price'] },
                count: 1,
                _id: 0,
                currency: '$_id.currency.symbol',
                order: '$_id.currency.order',
                status: '$_id.status',
            },
        },
        {
            $sort: {
                order: 1,
                status: 1,
            },
        },
    ]);
    const sportsBets = yield models_1.SportsBets.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: new Date(qdate[0]),
                    $lte: new Date(qdate[1]),
                },
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
            $unwind: '$currency',
        },
        ...query2,
        {
            $group: {
                _id: {
                    status: '$status',
                    currency: '$currency',
                },
                stake: { $sum: '$stake' },
                profit: { $sum: '$profit' },
                count: { $sum: 1 },
            },
        },
        {
            $project: {
                stake: 1,
                profit: 1,
                count: 1,
                revenue: { $subtract: ['$profit', '$stake'] },
                _id: 0,
                currency: '$_id.currency.symbol',
                order: '$_id.currency.order',
                status: '$_id.status',
            },
        },
        {
            $sort: {
                order: 1,
            },
        },
    ]);
    const currencies = yield models_1.Currencies.aggregate([
        {
            $match: {
                status: true,
                isFiat: true,
            },
        },
        {
            $project: {
                _id: 0,
                order: '$order',
                currency: '$symbol',
                icon: '$icon',
                price: '$price',
            },
        },
    ]);
    const data = [];
    for (const i in currencies) {
        const sportsbet = sportsBets.filter((e) => e.currency === currencies[i].currency);
        const balance = balances.find((e) => e.currency === currencies[i].currency);
        const deposit = payments.find((e) => e.currency === currencies[i].currency && e.status === 'deposit');
        const withdrawal = payments.find((e) => e.currency === currencies[i].currency && e.status === 'withdrawal');
        let win = 0;
        let winstake = 0;
        let lost = 0;
        let refund = 0;
        let profit = 0;
        let bet = 0;
        let activebet = 0;
        let count = 0;
        for (const j in sportsbet) {
            const status = sportsbet[j].status;
            if (status === 'WIN' || status === 'HALF_WIN') {
                win += sportsbet[j].profit;
                winstake += sportsbet[j].stake;
            }
            else if (status === 'LOST' || status === 'HALF_LOST') {
                lost += sportsbet[j].profit * -1;
            }
            else if (status === 'REFUND' || status === 'CANCEL') {
                refund += sportsbet[j].stake;
            }
            else if (status === 'BET') {
                activebet += sportsbet[j].stake;
            }
            bet += sportsbet[j].stake;
            count += sportsbet[j].count;
        }
        profit = lost - (win - winstake);
        const _balance = filter(balance === null || balance === void 0 ? void 0 : balance.balance);
        if (_balance > 0 || bet > 0)
            data.push({
                icon: currencies[i].icon,
                order: currencies[i].order,
                currency: currencies[i].currency,
                price: currencies[i].price,
                balance: _balance,
                deposit: filter(deposit === null || deposit === void 0 ? void 0 : deposit.amount),
                withdrawal: filter(withdrawal === null || withdrawal === void 0 ? void 0 : withdrawal.amount),
                count,
                win,
                lost,
                profit,
                bet,
                activebet,
                refund,
            });
    }
    data.sort((a, b) => a.order - b.order);
    return data;
});
const getCasinoBetData = (qdate, req) => __awaiter(void 0, void 0, void 0, function* () {
    const query2 = [];
    if (req.user && req.user.rolesId.type === 'agent') {
        query2.push({
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user',
            },
        });
        query2.push({ $unwind: '$user' });
        query2.push({ $match: { ['user.creatorId']: req.user._id } });
    }
    const games = yield models_1.GameHistories.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: new Date(qdate[0]),
                    $lte: new Date(qdate[1]),
                },
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
            $unwind: '$currency',
        },
        ...query2,
        {
            $group: {
                _id: {
                    // status: '$status',
                    currency: '$currency',
                },
                amount: { $sum: '$bet_money' },
                profit: { $sum: '$win_money' },
                refund: { $sum: '$refund_money' },
                count: { $sum: 1 },
            },
        },
        {
            $project: {
                amount: 1,
                profit: 1,
                refund: 1,
                count: 1,
                revenue: { $subtract: ['$profit', '$amount'] },
                _id: 0,
                currency: '$_id.currency.symbol',
                order: '$_id.currency.order',
                status: '$_id.status',
            },
        },
        {
            $sort: {
                order: 1,
            },
        },
    ]);
    const currencies = yield models_1.Currencies.aggregate([
        {
            $match: { status: true, isFiat: true },
        },
        {
            $project: {
                _id: 1,
                order: '$order',
                currency: '$symbol',
                icon: '$icon',
                price: '$price',
            },
        },
    ]);
    const data = [];
    for (const i in currencies) {
        const casinogames = games.filter((e) => e.currency === currencies[i].currency);
        if (casinogames.length) {
            const total_bet = yield models_1.GameHistories.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: new Date(qdate[0]),
                            $lte: new Date(qdate[1]),
                        },
                        currency: currencies[i]._id,
                    },
                },
                {
                    $group: {
                        _id: '$round_id',
                        count: { $sum: 1 },
                    },
                },
            ]);
            let win = yield models_1.GameHistories.countDocuments({
                createdAt: {
                    $gte: new Date(qdate[0]),
                    $lte: new Date(qdate[1]),
                },
                currency: currencies[i]._id,
            });
            let lost = total_bet.length - win;
            let refund = 0;
            let profit = 0;
            let bet = 0;
            let activebet = 0;
            let count = total_bet.length;
            for (const j in casinogames) {
                profit += casinogames[j].profit - casinogames[j].amount + casinogames[j].refund;
                refund += casinogames[j].refund;
                activebet += casinogames[j].amount;
                bet += casinogames[j].amount - casinogames[j].refund;
                // count += casinogames[j].count;
            }
            if (count) {
                const profits = yield (0, base_1.getProfit)(currencies[i]._id, qdate);
                data.push({
                    icon: currencies[i].icon,
                    currency: currencies[i].currency,
                    order: currencies[i].order,
                    price: currencies[i].price,
                    rtp: profits.percent ? profits.percent : 0,
                    count,
                    win,
                    lost,
                    profit,
                    bet,
                    activebet,
                    refund,
                });
            }
        }
    }
    data.sort((a, b) => a.order - b.order);
    return data;
});
const report = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { date } = req.body;
    const players = yield getPlayerData(date, req);
    const charts = yield getChartData(date, req);
    const data = yield getSportsBetData(date, req);
    const casino = yield getCasinoBetData(date, req);
    res.json(Object.assign(Object.assign({}, players), { data, casino, charts }));
});
exports.report = report;
const getProfits = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const date = new Date();
        let firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        if (new Date().getDate() > 15) {
            firstDay = new Date(firstDay.getTime() + 806400000);
        }
        const lastDay = new Date(firstDay.getTime() + 864000000);
        const sportsBets = yield models_1.SportsBets.aggregate([
            {
                $match: {
                    updatedAt: { $gte: firstDay, $lte: lastDay },
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
                $unwind: '$currency',
            },
            {
                $group: {
                    _id: {
                        status: '$status',
                        currency: '$currency',
                    },
                    stake: { $sum: '$stake' },
                    profit: { $sum: '$profit' },
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    stake: 1,
                    profit: 1,
                    count: 1,
                    revenue: { $subtract: ['$profit', '$stake'] },
                    _id: 0,
                    currency: '$_id.currency.symbol',
                    order: '$_id.currency.order',
                    status: '$_id.status',
                },
            },
            {
                $sort: {
                    order: 1,
                },
            },
        ]);
        const currencies = yield models_1.Currencies.aggregate([
            {
                $match: { status: true },
            },
            {
                $project: {
                    _id: 0,
                    order: '$order',
                    currency: '$symbol',
                    icon: '$icon',
                    price: '$price',
                },
            },
        ]);
        const mbt = currencies.find((e) => e.currency === process.env.DEFAULT_CURRENCY);
        let profit = 0;
        for (const i in currencies) {
            const sportsbet = sportsBets.filter((e) => e.currency === currencies[i].currency);
            let win = 0;
            let winstake = 0;
            let lost = 0;
            for (const j in sportsbet) {
                const status = sportsbet[j].status;
                if (status === 'WIN' || status === 'HALF_WIN') {
                    win += sportsbet[j].profit;
                    winstake += sportsbet[j].stake;
                }
                else if (status === 'LOST' || status === 'HALF_LOST') {
                    lost += sportsbet[j].profit * -1;
                }
            }
            profit += (lost - (win - winstake)) * currencies[i].price;
        }
        return res.json({
            profit: (0, base_1.toNumber)((profit / (mbt === null || mbt === void 0 ? void 0 : mbt.price)) * 0.1, 2),
            icon: mbt.icon,
        });
    }
    catch (error) {
        console.error('Error => getting Report : ', error);
        res.status(402).json('Internal Server Error');
    }
});
exports.getProfits = getProfits;
const getUserProfit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _f, _g, _h, _j;
    try {
        const userId = (0, base_1.ObjectId)(req.body.userId);
        const createdAt = {
            $gte: new Date(req.body.date[0]),
            $lte: new Date(req.body.date[1]),
        };
        const logined = yield models_1.LoginHistories.countDocuments({ userId, createdAt });
        const balances = yield models_1.Balances.aggregate([
            {
                $match: { userId },
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
                $unwind: '$currency',
            },
            // {
            //     $group: {
            //         _id: {
            //             currency: '$currency'
            //         },
            //         balance: { $sum: '$balance' },
            //         count: { $sum: 1 }
            //     }
            // },
            {
                $project: {
                    balance: 1,
                    count: 1,
                    bonus: 1,
                    deposit_count: 1,
                    deposit_amount: 1,
                    withdraw_count: 1,
                    withdraw_amount: 1,
                    _id: 0,
                    // currency: '$_id.currency.symbol',
                    // order: '$_id.currency.order',
                    // usd: {
                    //     $multiply: ['$balance', '$_id.currency.price']
                    // }
                    currency: '$currency.symbol',
                    icon: '$currency.icon',
                    order: '$currency.order',
                    usd: {
                        $multiply: ['$balance', '$currency.price'],
                    },
                },
            },
            {
                $sort: {
                    order: 1,
                },
            },
        ]);
        const payments = yield models_1.Payments.aggregate([
            {
                $match: {
                    $and: [{ status: { $ne: 0 } }, { status: { $ne: -1 } }, { userId, createdAt }],
                },
            },
            {
                $lookup: {
                    from: 'balances',
                    localField: 'balanceId',
                    foreignField: '_id',
                    as: 'balance',
                },
            },
            {
                $unwind: '$balance',
            },
            {
                $lookup: {
                    from: 'currencies',
                    localField: 'balance.currency',
                    foreignField: '_id',
                    as: 'currency',
                },
            },
            {
                $unwind: '$currency',
            },
            {
                $group: {
                    _id: {
                        status: '$ipn_type',
                        currency: '$currency',
                    },
                    amount: { $sum: '$amount' },
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    amount: 1,
                    usd: { $multiply: ['$amount', '$_id.currency.price'] },
                    count: 1,
                    _id: 0,
                    currency: '$_id.currency.symbol',
                    order: '$_id.currency.order',
                    status: '$_id.status',
                },
            },
            {
                $sort: {
                    order: 1,
                    status: 1,
                },
            },
        ]);
        const sportsBets = yield models_1.SportsBets.aggregate([
            {
                $match: {
                    userId,
                    createdAt,
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
                $unwind: '$currency',
            },
            {
                $group: {
                    _id: {
                        status: '$status',
                        currency: '$currency',
                    },
                    stake: { $sum: '$stake' },
                    profit: { $sum: '$profit' },
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    stake: 1,
                    profit: 1,
                    count: 1,
                    revenue: { $subtract: ['$profit', '$stake'] },
                    _id: 0,
                    currency: '$_id.currency.symbol',
                    order: '$_id.currency.order',
                    status: '$_id.status',
                },
            },
            {
                $sort: {
                    order: 1,
                },
            },
        ]);
        const currencies = yield models_1.Currencies.aggregate([
            {
                $match: { status: true },
            },
            {
                $project: {
                    _id: 1,
                    order: '$order',
                    currency: '$symbol',
                    icon: '$icon',
                    price: '$price',
                },
            },
        ]);
        const data = [];
        for (const i in currencies) {
            const sportsbet = sportsBets.filter((e) => e.currency === currencies[i].currency);
            const balance = balances.find((e) => e.currency === currencies[i].currency);
            const deposit = payments.find((e) => e.currency === currencies[i].currency && e.status === 'deposit');
            const withdrawal = payments.find((e) => e.currency === currencies[i].currency && e.status === 'withdrawal');
            let win = 0;
            let winstake = 0;
            let lost = 0;
            let refund = 0;
            let profit = 0;
            let bet = 0;
            let activebet = 0;
            let count = 0;
            for (const j in sportsbet) {
                const status = sportsbet[j].status;
                if (status === 'WIN' || status === 'HALF_WIN') {
                    win += sportsbet[j].profit;
                    winstake += sportsbet[j].stake;
                }
                else if (status === 'LOST' || status === 'HALF_LOST') {
                    lost += sportsbet[j].profit * -1;
                }
                else if (status === 'REFUND' || status === 'CANCEL') {
                    refund += sportsbet[j].stake;
                }
                else if (status === 'BET') {
                    activebet += sportsbet[j].stake;
                }
                bet += sportsbet[j].stake;
                count += sportsbet[j].count;
            }
            profit = win - lost - winstake;
            const result = {
                icon: currencies[i].icon,
                currency: currencies[i].currency,
                order: currencies[i].order,
                price: currencies[i].price,
                balance: (balance === null || balance === void 0 ? void 0 : balance.balance) ? balance.balance : 0,
                deposit: (deposit === null || deposit === void 0 ? void 0 : deposit.amount) ? deposit.amount : 0,
                withdrawal: (withdrawal === null || withdrawal === void 0 ? void 0 : withdrawal.amount) ? withdrawal.amount : 0,
                count,
                win,
                lost,
                profit,
                bet,
                activebet,
                refund,
            };
            if (result.balance ||
                result.deposit ||
                result.withdrawal ||
                result.count ||
                result.win ||
                result.lost ||
                result.profit ||
                result.bet ||
                result.activebet ||
                result.refund) {
                data.push(result);
            }
        }
        data.sort((a, b) => a.order - b.order);
        const query = [
            {
                $match: {
                    userId,
                    createdAt,
                },
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$_id' },
                        month: { $month: '$_id' },
                        day: { $dayOfMonth: '$_id' },
                    },
                    Total: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    Total: 1,
                    name: {
                        $concat: [
                            { $convert: { input: '$_id.year', to: 'string' } },
                            '-',
                            { $convert: { input: '$_id.month', to: 'string' } },
                            '-',
                            { $convert: { input: '$_id.day', to: 'string' } },
                        ],
                    },
                },
            },
        ];
        const cSportsBets = yield models_1.SportsBets.aggregate(query);
        // const cGamesBets = await Games.aggregate(query);
        const cGamesBets = yield models_1.GameHistories.aggregate(query);
        const cPayments = yield models_1.Payments.aggregate([{ $match: { $and: [{ status: { $ne: 0 } }, { status: { $ne: -1 } }] } }, ...query]);
        const cLoginHistories = yield models_1.LoginHistories.aggregate(query);
        const cData = [
            {
                count: cSportsBets.length,
                value: cSportsBets,
            },
            {
                count: cGamesBets.length,
                value: cGamesBets,
            },
            {
                count: cPayments.length,
                value: cPayments,
            },
            {
                count: cLoginHistories.length,
                value: cLoginHistories,
            },
        ].sort((a, b) => b.count - a.count)[0];
        const date = cData.value.map((item) => item.name);
        const charts = [];
        for (const i in date) {
            const bet1 = (_f = cSportsBets.find((e) => e.name === date[i])) === null || _f === void 0 ? void 0 : _f.Total;
            const bet2 = (_g = cGamesBets.find((e) => e.name === date[i])) === null || _g === void 0 ? void 0 : _g.Total;
            const payment = (_h = cPayments.find((e) => e.name === date[i])) === null || _h === void 0 ? void 0 : _h.Total;
            const login = (_j = cLoginHistories.find((e) => e.name === date[i])) === null || _j === void 0 ? void 0 : _j.Total;
            const result = {
                bet: filter(bet1) + filter(bet2),
                payment: filter(payment),
                login: filter(login),
                name: date[i],
            };
            charts.push(result);
        }
        charts.sort((a, b) => new Date(a.name).valueOf() - new Date(b.name).valueOf());
        const user = yield models_1.Users.findById(userId);
        const games = yield models_1.GameHistories.aggregate([
            {
                $match: {
                    userId,
                    createdAt,
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
                $unwind: '$currency',
            },
            {
                $group: {
                    _id: {
                        // status: '$status',
                        currency: '$currency',
                    },
                    amount: { $sum: '$bet_money' },
                    profit: { $sum: '$win_money' },
                    refund: { $sum: '$refund_money' },
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    amount: 1,
                    profit: 1,
                    refund: 1,
                    count: 1,
                    revenue: { $subtract: ['$profit', '$amount'] },
                    _id: 0,
                    currency: '$_id.currency.symbol',
                    order: '$_id.currency.order',
                    status: '$_id.status',
                },
            },
            {
                $sort: {
                    order: 1,
                },
            },
        ]);
        const data1 = [];
        for (const i in currencies) {
            // const casinogames = games.filter((e) => e.currency === currencies[i].currency);
            // let win = 0;
            // let lost = 0;
            // let refund = 0;
            // let profit = 0;
            // let bet = 0;
            // let activebet = 0;
            // let count = 0;
            // for (const j in casinogames) {
            //     profit += casinogames[j].revenue;
            //     const status = casinogames[j].status;
            //     if (status === 'WIN') {
            //         win += casinogames[j].profit;
            //     } else if (status === 'LOST') {
            //         lost += casinogames[j].amount - casinogames[j].profit;
            //     } else if (status === 'DRAW') {
            //         refund += casinogames[j].amount;
            //     } else if (status === 'BET') {
            //         activebet += casinogames[j].amount;
            //     }
            //     bet += casinogames[j].amount;
            //     count += casinogames[j].count;
            // }
            const casinogames = games.filter((e) => e.currency === currencies[i].currency);
            if (casinogames.length) {
                const total_bet = yield models_1.GameHistories.aggregate([
                    {
                        $match: {
                            userId,
                            createdAt,
                            currency: currencies[i]._id,
                        },
                    },
                    {
                        $group: {
                            _id: '$round_id',
                            count: { $sum: 1 },
                        },
                    },
                ]);
                let win = yield models_1.GameHistories.countDocuments({
                    userId,
                    createdAt,
                    currency: currencies[i]._id,
                    win_money: { $gt: 0 },
                });
                let lost = total_bet.length - win;
                let refund = 0;
                let profit = 0;
                let bet = 0;
                let activebet = 0;
                let count = total_bet.length;
                for (const j in casinogames) {
                    profit += casinogames[j].profit - casinogames[j].amount + casinogames[j].refund;
                    refund += casinogames[j].refund;
                    activebet += casinogames[j].amount;
                    bet += casinogames[j].amount - casinogames[j].refund;
                    // count += casinogames[j].count;
                }
                if (count)
                    data1.push({
                        icon: currencies[i].icon,
                        order: currencies[i].order,
                        currency: currencies[i].currency,
                        price: currencies[i].price,
                        count,
                        win,
                        lost,
                        profit,
                        bet,
                        activebet,
                        refund,
                    });
            }
        }
        data1.sort((a, b) => a.order - b.order);
        return res.json({
            logined,
            data,
            charts,
            user: Object.assign(Object.assign({}, user.toObject()), { balances }),
            casino: data1,
        });
    }
    catch (error) {
        console.error('Error getting User Profit : ', error);
        return res.status(402).json('Internal Server Error');
    }
});
exports.getUserProfit = getUserProfit;
const removeTest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = (0, base_1.ObjectId)(req.body.userId);
    yield models_1.LoginHistories.deleteMany({ userId });
    yield models_1.BalanceHistories.deleteMany({ userId });
    yield models_1.Payments.deleteMany({ userId });
    yield models_1.Games.deleteMany({ userId });
    const sportsbets = yield models_1.SportsBets.find({ userId });
    for (const i in sportsbets) {
        yield models_1.SportsBets.deleteOne({ _id: sportsbets[i]._id });
        yield models_1.SportsBetting.deleteMany({ betId: sportsbets[i]._id });
    }
    res.json({ status: true });
});
exports.removeTest = removeTest;
const removeSports = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = (0, base_1.ObjectId)(req.body.userId);
    const sportsbets = yield models_1.SportsBets.find({ userId });
    for (const i in sportsbets) {
        yield models_1.SportsBets.deleteOne({ _id: sportsbets[i]._id });
        yield models_1.SportsBetting.deleteMany({ betId: sportsbets[i]._id });
    }
    res.json({ status: true });
});
exports.removeSports = removeSports;
const getCProfit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const createdAt = {
        $gte: new Date(req.body.date[0]),
        $lte: new Date(req.body.date[1]),
    };
    const query2 = {};
    if (req.user && req.user.rolesId.type === 'agent') {
        query2['user.creatorId'] = req.user._id;
    }
    const result1 = yield models_1.SportsBets.aggregate([
        {
            $match: Object.assign({ $or: [{ status: 'WIN' }, { status: 'HALF_WIN' }], createdAt }, query2),
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
            $unwind: '$currency',
        },
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user',
            },
        },
        {
            $unwind: '$user',
        },
        {
            $match: query2,
        },
        {
            $group: {
                _id: {
                    year: { $year: '$_id' },
                    month: { $month: '$_id' },
                    day: { $dayOfMonth: '$_id' },
                },
                total: { $sum: 1 },
                profit: {
                    $sum: {
                        $subtract: [{ $multiply: ['$stake', '$currency.price'] }, { $multiply: ['$profit', '$currency.price'] }],
                    },
                },
            },
        },
        {
            $project: {
                _id: 0,
                total: 1,
                profit: 1,
                name: {
                    $concat: [
                        { $convert: { input: '$_id.year', to: 'string' } },
                        '-',
                        { $convert: { input: '$_id.month', to: 'string' } },
                        '-',
                        { $convert: { input: '$_id.day', to: 'string' } },
                    ],
                },
            },
        },
    ]);
    const result2 = yield models_1.SportsBets.aggregate([
        {
            $match: { $or: [{ status: 'LOST' }, { status: 'HALF_LOST' }] },
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
            $unwind: '$currency',
        },
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user',
            },
        },
        {
            $unwind: '$user',
        },
        {
            $match: query2,
        },
        {
            $group: {
                _id: {
                    year: { $year: '$_id' },
                    month: { $month: '$_id' },
                    day: { $dayOfMonth: '$_id' },
                },
                total: { $sum: 1 },
                profit: {
                    $sum: {
                        $multiply: ['$profit', '$currency.price'],
                    },
                },
            },
        },
        {
            $project: {
                _id: 0,
                total: 1,
                profit: 1,
                name: {
                    $concat: [
                        { $convert: { input: '$_id.year', to: 'string' } },
                        '-',
                        { $convert: { input: '$_id.month', to: 'string' } },
                        '-',
                        { $convert: { input: '$_id.day', to: 'string' } },
                    ],
                },
            },
        },
    ]);
    const result3 = yield models_1.GameHistories.aggregate([
        // {
        //     $match: { $or: [{ status: 'LOST' }, { status: 'WIN' }] }
        // },
        {
            $lookup: {
                from: 'currencies',
                localField: 'currency',
                foreignField: '_id',
                as: 'currency',
            },
        },
        {
            $unwind: '$currency',
        },
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user',
            },
        },
        {
            $unwind: '$user',
        },
        {
            $match: query2,
        },
        {
            $group: {
                _id: {
                    year: { $year: '$_id' },
                    month: { $month: '$_id' },
                    day: { $dayOfMonth: '$_id' },
                },
                total: { $sum: 1 },
                profit: {
                    $sum: {
                        $subtract: [{ $multiply: ['$bet_money', '$currency.price'] }, { $multiply: ['$win_money', '$currency.price'] }],
                    },
                },
            },
        },
        {
            $project: {
                _id: 0,
                total: 1,
                profit: 1,
                name: {
                    $concat: [
                        { $convert: { input: '$_id.year', to: 'string' } },
                        '-',
                        { $convert: { input: '$_id.month', to: 'string' } },
                        '-',
                        { $convert: { input: '$_id.day', to: 'string' } },
                    ],
                },
            },
        },
    ]);
    const dates = getDates(createdAt.$gte, createdAt.$lte);
    const result = [];
    for (const key in dates) {
        const date = moment(dates[key]).format('YYYY-M-D');
        const win = result1.find((e) => e.name === date);
        const lost = result2.find((e) => e.name === date);
        const profits = result3.find((e) => e.name === date);
        if (win || lost || profits) {
            const total = ((win === null || win === void 0 ? void 0 : win.total) ? win.total : 0) + ((lost === null || lost === void 0 ? void 0 : lost.total) ? lost.total : 0);
            const profit = ((win === null || win === void 0 ? void 0 : win.profit) ? win.profit : 0) + ((lost === null || lost === void 0 ? void 0 : lost.profit) ? lost.profit * -1 : 0) + ((profits === null || profits === void 0 ? void 0 : profits.profit) ? profits.profit : 0);
            result.push({ total, profit, date, win, lost });
        }
    }
    res.json(result);
});
exports.getCProfit = getCProfit;
