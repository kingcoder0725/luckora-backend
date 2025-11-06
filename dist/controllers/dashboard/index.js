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
exports.get_financial_activity = exports.get_bonus_activity = exports.get_users_by_country = exports.getDeposits = void 0;
const base_1 = require("../base");
const models_1 = require("../../models");
const coinremitter_1 = require("../../utils/coinremitter");
const fiatConverter_1 = require("../../utils/fiatConverter");
const utils_1 = require("../../utils");
const moment = require("moment");


//Total deposit
const getDeposits = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { filters } = req.body;
        if (!filters || !filters.range) {
            return res.status(400).json({ error: "Filters with range are required" });
        }

        const { range, dates } = filters;
        let startDate, endDate;

        const now = moment();
        switch (range) {
            case "all_time":
                startDate = new Date(0); 
                endDate = now.clone().endOf("day").toDate();
                break;
            case "daily":
                startDate = now.clone().startOf("day").toDate();
                endDate = now.clone().endOf("day").toDate();
                break;
            case "weekly":
                startDate = now.clone().subtract(6, "days").startOf("day").toDate();
                endDate = now.clone().endOf("day").toDate();
                break;
            case "monthly":
                startDate = now.clone().subtract(29, "days").startOf("day").toDate();
                endDate = now.clone().endOf("day").toDate();
                break;
            case "custom":
                if (!dates || !dates.start || !dates.end) {
                    return res.status(400).json({ error: "Custom range requires start and end dates" });
                }
                startDate = moment(dates.start).startOf("day").toDate();
                endDate = moment(dates.end).endOf("day").toDate();
                if (startDate > endDate) {
                    return res.status(400).json({ error: "Start date cannot be after end date" });
                }
                break;
            default:
                return res.status(400).json({ error: "Invalid range value" });
        }

        const deposits = yield models_1.Payments.find({
            ipn_type: "deposit",
            status_text: { $in: ["confirmed", "approved"] },
            createdAt: { $gte: startDate, $lte: endDate },
        });

        const totalCount = deposits.length;

        const breakdownByDate = deposits.reduce((acc, deposit) => {
            const date = moment(deposit.createdAt).format("YYYY-MM-DD");
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});

        res.json({
            count: totalCount,
            breakdown: Object.entries(breakdownByDate).map(([date, count]) => ({
                date,
                count,
            })),
        });
    } catch (error) {
        console.error("Error in getDeposits:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.getDeposits = getDeposits;


//Bonus activities 
const get_bonus_details = (startDate, endDate, type, provider_code, game_code) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const wagerQuery = {
            status: 'finished',
            added_bonus: { $gt: 0 },
            createdAt: { $gte: startDate, $lte: endDate },
        };

        const bonusHistories = yield models_1.BonusHistories.find(wagerQuery)
            .populate({
                path: 'bonusId',
                populate: { path: 'event' }
            })
            .populate('userId');

        const givingQuery = {
            status: { $in: ['active', 'finished'] },
            amount: { $gt: 0 },
            createdAt: { $gte: startDate, $lte: endDate },
        };

        const bonusGivingHistories = yield models_1.BonusHistories.find(givingQuery)
            .populate({
                path: 'bonusId',
                populate: { path: 'event' }
            })
            .populate('userId');

        const details = {
            name: type === 'casino' ? 'Casino Bonus' : type === 'sports' ? 'Sports Bonus' : 'All Bonuses',
            bonusWager: 0,
            bonusGiving: 0,
            rtp: 0,
            margin: 0,
        };

        const currencyCache = new Map(); 
        const conversionCache = new Map();

        for (const history of bonusHistories) {
            if (!history.bonusId || !history.bonusId.event) {
                console.warn(`DEBUG: Skipping bonus history ${history._id} due to missing bonusId or event`);
                continue;
            }

            if (type && history.bonusId.event.type !== type) {
                continue;
            }

            if (type === 'casino' && (provider_code || game_code)) {
                const gamesMatch = !game_code || history.bonusId.games.includes(game_code);
                const providerMatch = !provider_code || history.bonusId.games.some(gameId => {
                    return models_1.GameLists.findOne({ game_code: gameId, provider_code });
                });
                if (!gamesMatch || !providerMatch) {
                    continue;
                }
            }

            if (!history.userId) {
                console.warn(`DEBUG: Skipping bonus history ${history._id} due to missing userId`);
                continue;
            }

            let balance = yield models_1.Balances.findOne({
                userId: history.userId._id,
                status: true,
                disabled: false
            }).populate('currency');

            if (!balance || !balance.currency) {
                console.warn(`DEBUG: Skipping bonus history ${history._id} due to missing valid balance or currency`);
                continue;
            }

            const currencyId = balance.currency._id.toString();
            if (!currencyCache.has(currencyId)) {
                currencyCache.set(currencyId, balance.currency.symbol);
            }
            const currencySymbol = currencyCache.get(currencyId);

            let addedBonusUsd = history.added_bonus || 0;
            if (currencySymbol !== 'USD' && currencySymbol !== 'USDT') {
                if (!conversionCache.has(currencySymbol)) {
                    try {
                        const rate = yield fiatConverter_1.convertFiatCurrency(currencySymbol, 'USD', 1);
                        conversionCache.set(currencySymbol, rate);
                    } catch (error) {
                        console.error(`DEBUG: Failed to convert ${currencySymbol} to USD for bonus ${history._id}:`, error.message);
                        continue;
                    }
                }
                addedBonusUsd = (history.added_bonus || 0) * (conversionCache.get(currencySymbol) || 1);
            }

            details.bonusWager += addedBonusUsd;
        }

        for (const history of bonusGivingHistories) {
            if (!history.bonusId || !history.bonusId.event) {
                console.warn(`DEBUG: Skipping bonus giving history ${history._id} due to missing bonusId or event`);
                continue;
            }

            if (type && history.bonusId.event.type !== type) {
                continue;
            }

            if (type === 'casino' && (provider_code || game_code)) {
                const gamesMatch = !game_code || history.bonusId.games.includes(game_code);
                const providerMatch = !provider_code || history.bonusId.games.some(gameId => {
                    return models_1.GameLists.findOne({ game_code: gameId, provider_code });
                });
                if (!gamesMatch || !providerMatch) {
                    continue;
                }
            }

            if (!history.userId) {
                console.warn(`DEBUG: Skipping bonus giving history ${history._id} due to missing userId`);
                continue;
            }

            let balance = yield models_1.Balances.findOne({
                userId: history.userId._id,
                status: true,
                disabled: false
            }).populate('currency');

            if (!balance || !balance.currency) {
                console.warn(`DEBUG: Skipping bonus giving history ${history._id} due to missing valid balance or currency`);
                continue;
            }

            const currencyId = balance.currency._id.toString();
            if (!currencyCache.has(currencyId)) {
                currencyCache.set(currencyId, balance.currency.symbol);
            }
            const currencySymbol = currencyCache.get(currencyId);

            let givingUsd = history.amount || 0;
            if (currencySymbol !== 'USD' && currencySymbol !== 'USDT') {
                if (!conversionCache.has(currencySymbol)) {
                    try {
                        const rate = yield fiatConverter_1.convertFiatCurrency(currencySymbol, 'USD', 1);
                        conversionCache.set(currencySymbol, rate);
                    } catch (error) {
                        console.error(`DEBUG: Failed to convert ${currencySymbol} to USD for bonus giving ${history._id}:`, error.message);
                        continue;
                    }
                }
                givingUsd = (history.amount || 0) * (conversionCache.get(currencySymbol) || 1);
            }

            details.bonusGiving += givingUsd;
        }

        let totalBet = 0;
        let totalWin = 0;

        if (!type || type === 'casino') {
            const gameQuery = {
                createdAt: { $gte: startDate, $lte: endDate },
                txn_type: { $in: ['BET', 'WIN'] },
                canceled: false,
            };
            if (game_code) gameQuery.game_code = game_code;
            if (provider_code) gameQuery.provider_code = provider_code;

            const gameHistories = yield models_1.GameHistories.find(gameQuery).populate('currency');

            for (const game of gameHistories) {
                const gameCurrencyId = game.currency?._id?.toString();
                let gameCurrencySymbol = 'USD';
                if (gameCurrencyId && !currencyCache.has(gameCurrencyId)) {
                    currencyCache.set(gameCurrencyId, game.currency.symbol);
                }
                gameCurrencySymbol = gameCurrencyId ? currencyCache.get(gameCurrencyId) : 'USD';

                let amountUsd = 0;
                if (gameCurrencySymbol !== 'USD' && gameCurrencySymbol !== 'USDT') {
                    if (!conversionCache.has(gameCurrencySymbol)) {
                        try {
                            const rate = yield fiatConverter_1.convertFiatCurrency(gameCurrencySymbol, 'USD', 1);
                            conversionCache.set(gameCurrencySymbol, rate);
                        } catch (error) {
                            console.error(`DEBUG: Failed to convert ${gameCurrencySymbol} to USD for game ${game._id}:`, error.message);
                            continue;
                        }
                    }
                    amountUsd = (game.txn_type === 'BET' ? game.bet_money || 0 : game.win_money || 0) * (conversionCache.get(gameCurrencySymbol) || 1);
                } else {
                    amountUsd = game.txn_type === 'BET' ? game.bet_money || 0 : game.win_money || 0;
                }

                if (game.txn_type === 'BET') {
                    totalBet += amountUsd;
                } else if (game.txn_type === 'WIN') {
                    totalWin += amountUsd;
                }
            }
        }
        if ((!type || type === 'sports') && !game_code) {
            const sportsQuery = {
                createdAt: { $gte: startDate, $lte: endDate },
            };

            const sportsBets = yield models_1.SportsBets.find(sportsQuery).populate('currency');

            for (const bet of sportsBets) {
                const betCurrencyId = bet.currency?._id?.toString();
                let betCurrencySymbol = 'USD';
                if (betCurrencyId && !currencyCache.has(betCurrencyId)) {
                    currencyCache.set(betCurrencyId, bet.currency.symbol);
                }
                betCurrencySymbol = betCurrencyId ? currencyCache.get(betCurrencyId) : 'USD';

                let stakeUsd = bet.stake || 0;
                let profitUsd = bet.profit || 0;
                if (betCurrencySymbol !== 'USD' && betCurrencySymbol !== 'USDT') {
                    if (!conversionCache.has(betCurrencySymbol)) {
                        try {
                            const rate = yield fiatConverter_1.convertFiatCurrency(betCurrencySymbol, 'USD', 1);
                            conversionCache.set(betCurrencySymbol, rate);
                        } catch (error) {
                            console.error(`DEBUG: Failed to convert ${betCurrencySymbol} to USD for bet ${bet._id}:`, error.message);
                            continue;
                        }
                    }
                    stakeUsd = (bet.stake || 0) * (conversionCache.get(betCurrencySymbol) || 1);
                    profitUsd = (bet.profit || 0) * (conversionCache.get(betCurrencySymbol) || 1);
                }

                totalBet += stakeUsd;
                totalWin += profitUsd;
            }
        }

        details.rtp = totalBet > 0 ? (totalWin / totalBet) * 100 : 0;
        details.margin = 100 - details.rtp;

        console.log('DEBUG: Bonus details:', JSON.stringify(details, null, 2));
        return [details];
    } catch (error) {
        console.error('ERROR: get_bonus_details failed:', error.message);
        throw error;
    }
});


const get_bonus_per_players = (startDate, endDate, type, provider_code, game_code, search = '', page = 1, page_size = 100) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const conversionCache = new Map(); 
        const currencySymbolCache = new Map();

        const users = yield models_1.Users.find({});

        
        const usersWithGGR = yield Promise.all(users.map(user => __awaiter(void 0, void 0, void 0, function* () {
            const gameQuery = {
                userId: user._id,
                createdAt: { $gte: startDate, $lte: endDate },
                canceled: false,
                txn_type: 'BET',
            };
            if (type === 'casino') {
                gameQuery.provider_code = provider_code || { $exists: true };
                if (game_code) gameQuery.game_code = game_code;
            } else if (type === 'sports') {
                gameQuery.provider_code = { $exists: false };
            }

            const bets = yield models_1.GameHistories.find(gameQuery).populate('currency');
            let ggr = 0;

            for (const bet of bets) {
                const betCurrencyId = bet.currency?._id?.toString();
                const betCurrencySymbol = betCurrencyId ? (currencySymbolCache.get(betCurrencyId) || bet.currency.symbol || 'USD') : 'USD';

                let betUsd = bet.bet_money || 0;
                if (betCurrencySymbol !== 'USD' && betCurrencySymbol !== 'USDT') {
                    if (!conversionCache.has(betCurrencySymbol)) {
                        try {
                            const rate = yield fiatConverter_1.convertFiatCurrency(betCurrencySymbol, 'USD', 1);
                            conversionCache.set(betCurrencySymbol, rate);
                            console.log('DEBUG: Conversion rate for', betCurrencySymbol, 'to USD:', rate);
                        } catch (error) {
                            console.error(`DEBUG: Failed to convert ${betCurrencySymbol} to USD for bet ${bet._id}:`, error.message);
                            continue;
                        }
                    }
                    betUsd = (bet.bet_money || 0) * (conversionCache.get(betCurrencySymbol) || 1);
                }
                ggr += betUsd;
            }

            return { user, ggr };
        })));

        const filteredUsers = usersWithGGR.filter(({ user }) => {
            if (!search) return true;
            const searchLower = search.toLowerCase();
            const searchNumber = parseFloat(search);
            const isSearchNumber = !isNaN(searchNumber);

            return (
                user.username.toLowerCase().includes(searchLower) ||
                (user.email && user.email.toLowerCase().includes(searchLower)) ||
                (isSearchNumber && user._id.toString().includes(search))
            );
        }).sort((a, b) => b.ggr - a.ggr);

        const total_count = filteredUsers.length;
        const total_pages = Math.ceil(total_count / page_size);
        const skip = (page - 1) * page_size;
        const paginatedUsers = filteredUsers.slice(skip, skip + page_size).map(item => item.user);

        const results = [];

        for (const user of paginatedUsers) {
            const balance = yield models_1.Balances.findOne({
                userId: user._id,
                status: true,
                disabled: false
            }).populate('currency');

            if (!balance || !balance.currency) {
                console.warn(`DEBUG: Skipping user ${user._id} due to missing balance or currency`);
                continue;
            }

            const currencyId = balance.currency._id.toString();
            const currencySymbol = balance.currency.symbol || 'USD';
            currencySymbolCache.set(currencyId, currencySymbol);

            const gameQuery = {
                userId: user._id,
                createdAt: { $gte: startDate, $lte: endDate },
                canceled: false,
            };
            if (type === 'casino') {
                gameQuery.provider_code = provider_code || { $exists: true };
                if (game_code) gameQuery.game_code = game_code;
            } else if (type === 'sports') {
                gameQuery.provider_code = { $exists: false };
            }

            const betsQuery = { ...gameQuery, txn_type: 'BET' };
            const winsQuery = { ...gameQuery, txn_type: 'WIN' };
            const gameHistories = yield models_1.GameHistories.find({
                $or: [betsQuery, winsQuery],
            }).populate('currency');

            let ggr = 0;
            let totalBet = 0;
            let totalWin = 0;
            let bonusBetSum = 0;
            let bonusWinSum = 0;
            let totalBetCount = 0;
            let totalWinSum = 0;

            for (const game of gameHistories) {
                const gameCurrencyId = game.currency?._id?.toString();
                const gameCurrencySymbol = gameCurrencyId ? currencySymbolCache.get(gameCurrencyId) || 'USD' : 'USD';

                let amountUsd = 0;
                if (gameCurrencySymbol !== 'USD' && gameCurrencySymbol !== 'USDT') {
                    if (!conversionCache.has(gameCurrencySymbol)) {
                        try {
                            const rate = yield fiatConverter_1.convertFiatCurrency(gameCurrencySymbol, 'USD', 1);
                            conversionCache.set(gameCurrencySymbol, rate);
                            console.log('DEBUG: Conversion rate for', gameCurrencySymbol, 'to USD:', rate);
                        } catch (error) {
                            console.error(`DEBUG: Failed to convert ${gameCurrencySymbol} to USD for game ${game._id}:`, error.message);
                            continue;
                        }
                    }
                    amountUsd = (game.txn_type === 'BET' ? game.bet_money || 0 : game.win_money || 0) * (conversionCache.get(gameCurrencySymbol) || 1);
                } else {
                    amountUsd = game.txn_type === 'BET' ? game.bet_money || 0 : game.win_money || 0;
                }

                if (game.txn_type === 'BET') {
                    ggr += amountUsd;
                    totalBet += amountUsd;
                    totalBetCount += 1;
                    if (game.isBonusPlay) {
                        bonusBetSum += amountUsd;
                    }
                } else if (game.txn_type === 'WIN') {
                    totalWin += amountUsd;
                    if (game.isBonusPlay) {
                        bonusWinSum += amountUsd;
                    } else {
                        totalWinSum += amountUsd;
                    }
                }
            }

            const bonusQuery = {
                userId: user._id,
                status: 'finished',
                added_bonus: { $gt: 0 },
                createdAt: { $gte: startDate, $lte: endDate },
            };
            const bonusHistories = yield models_1.BonusHistories.find(bonusQuery).populate('userId');

            let bonusWageringAmount = 0;
            for (const history of bonusHistories) {
                if (!history.userId) {
                    console.warn(`DEBUG: Skipping bonus history ${history._id} due to missing userId`);
                    continue;
                }
                const userBalance = yield models_1.Balances.findOne({
                    userId: history.userId._id,
                    status: true,
                    disabled: false,
                }).populate('currency');

                if (!userBalance || !userBalance.currency) {
                    console.warn(`DEBUG: Skipping bonus history ${history._id} due to missing valid balance or currency`);
                    continue;
                }

                const bonusCurrencyId = userBalance.currency._id.toString();
                const bonusCurrencySymbol = currencySymbolCache.get(bonusCurrencyId) || 'USD';

                let addedBonusUsd = history.added_bonus || 0;
                if (bonusCurrencySymbol !== 'USD' && bonusCurrencySymbol !== 'USDT') {
                    if (!conversionCache.has(bonusCurrencySymbol)) {
                        try {
                            const rate = yield fiatConverter_1.convertFiatCurrency(bonusCurrencySymbol, 'USD', 1);
                            conversionCache.set(bonusCurrencySymbol, rate);
                        } catch (error) {
                            console.error(`DEBUG: Failed to convert ${bonusCurrencySymbol} to USD for bonus ${history._id}:`, error.message);
                            continue;
                        }
                    }
                    addedBonusUsd = (history.added_bonus || 0) * (conversionCache.get(bonusCurrencySymbol) || 1);
                }
                bonusWageringAmount += addedBonusUsd;
            }

            const rtp = totalBet > 0 ? (totalWin / totalBet) * 100 : 0;
            const margin = 100 - rtp;

            const playerData = {
                nameUser: user.username || '',
                provider: gameHistories.find(game => game.provider_code)?.provider_code || '',
                currency: currencySymbol,
                ggr,
                margin,
                rtp,
                bonusBetSum,
                bonusWinSum,
                totalBetCount,
                totalWinSum,
                bonusWageringAmount,
            };


            if (search) {
                const searchLower = search.toLowerCase();
                const searchNumber = parseFloat(search);
                const isSearchNumber = !isNaN(searchNumber);

                const matchesSearch =
                    playerData.nameUser.toLowerCase().includes(searchLower) ||
                    (user.email && user.email.toLowerCase().includes(searchLower)) ||
                    playerData.currency.toLowerCase().includes(searchLower) ||
                    (isSearchNumber && (
                        playerData.ggr.toString().includes(search) ||
                        playerData.margin.toString().includes(search) ||
                        playerData.rtp.toString().includes(search) ||
                        playerData.bonusBetSum.toString().includes(search) ||
                        playerData.bonusWinSum.toString().includes(search) ||
                        playerData.totalBetCount.toString().includes(search) ||
                        playerData.totalWinSum.toString().includes(search) ||
                        playerData.bonusWageringAmount.toString().includes(search)
                    ));

                if (!matchesSearch) {
                    continue;
                }
            }

            results.push(playerData);
        }

        console.log('DEBUG: Bonus per players results:', JSON.stringify({
            total_count,
            total_pages,
            page,
            page_size,
            data: results
        }, null, 2));

        return {
            total_count,
            total_pages,
            page,
            page_size,
            data: results
        };
    } catch (error) {
        console.error('ERROR: get_bonus_per_players failed:', error.message);
        throw error;
    }
});

const get_bonus_performance = (startDate, endDate, type, provider_code, game_code, search = '', page = 1, page_size = 5) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('DEBUG: get_bonus_performance called with:', { startDate, endDate, type, provider_code, game_code, search, page, page_size });
    try {
        const conversionCache = new Map();
        const currencySymbolCache = new Map();

        const bonusQuery = {
            status: { $in: ['active', 'finished'] },
            createdAt: { $gte: startDate, $lte: endDate },
        };

        const bonusHistories = yield models_1.BonusHistories.find(bonusQuery)
            .populate({
                path: 'bonusId',
                populate: { path: 'event' }
            })
            .populate('userId');

        const bonusPerformanceMap = new Map();

        for (const history of bonusHistories) {
            if (!history.bonusId || !history.bonusId.event) {
                console.warn(`DEBUG: Skipping bonus history ${history._id} due to missing bonusId or event`);
                continue;
            }

            if (type && history.bonusId.event.type !== type) {
                continue;
            }

            if (type === 'casino' && (provider_code || game_code)) {
                const gamesMatch = !game_code || history.bonusId.games.includes(game_code);
                const providerMatch = !provider_code || history.bonusId.games.some(gameId => {
                    return models_1.GameLists.findOne({ game_code: gameId, provider_code });
                });
                if (!gamesMatch || !providerMatch) {
                    continue;
                }
            }

            if (!history.userId) {
                console.warn(`DEBUG: Skipping bonus history ${history._id} due to missing userId`);
                continue;
            }

            const balance = yield models_1.Balances.findOne({
                userId: history.userId._id,
                status: true,
                disabled: false
            }).populate('currency');

            if (!balance || !balance.currency) {
                console.warn(`DEBUG: Skipping bonus history ${history._id} due to missing valid balance or currency`);
                continue;
            }

            const currencyId = balance.currency._id.toString();
            if (!currencySymbolCache.has(currencyId)) {
                currencySymbolCache.set(currencyId, balance.currency.symbol);
            }
            const currencySymbol = currencySymbolCache.get(currencyId);

            let amountUsd = history.amount || 0;
            let addedBonusUsd = history.added_bonus || 0;
            let bonusAmountUsd = history.bonusId.amount || 0;

            if (currencySymbol !== 'USD' && currencySymbol !== 'USDT') {
                if (!conversionCache.has(currencySymbol)) {
                    try {
                        const rate = yield fiatConverter_1.convertFiatCurrency(currencySymbol, 'USD', 1);
                        conversionCache.set(currencySymbol, rate);
                    } catch (error) {
                        console.error(`DEBUG: Failed to convert ${currencySymbol} to USD for bonus ${history._id}:`, error.message);
                        continue;
                    }
                }
                amountUsd = (history.amount || 0) * (conversionCache.get(currencySymbol) || 1);
                addedBonusUsd = (history.added_bonus || 0) * (conversionCache.get(currencySymbol) || 1);
                bonusAmountUsd = (history.bonusId.amount || 0) * (conversionCache.get(currencySymbol) || 1);
            }

            const bonusId = history.bonusId._id.toString();
            if (!bonusPerformanceMap.has(bonusId)) {
                let bonusName = 'Unknown Bonus';
                if (history.bonusId.lang && Array.isArray(history.bonusId.lang)) {
                    const enLang = history.bonusId.lang.find(lang => lang.lang === 'en');
                    if (enLang && enLang.title) {
                        bonusName = enLang.title;
                    } else {
                        const anyLang = history.bonusId.lang[0];
                        if (anyLang && anyLang.title) {
                            bonusName = anyLang.title;
                        }
                    }
                }

                bonusPerformanceMap.set(bonusId, {
                    bonusName,
                    countAcceptedBonusPerPlayer: 0,
                    sum: 0,
                    wageringToRealMoney: 0,
                    realiseIssues: 0,
                    bonusAmount: bonusAmountUsd,
                });
            }

            const performance = bonusPerformanceMap.get(bonusId);
            performance.countAcceptedBonusPerPlayer += 1;
            performance.sum += amountUsd;
            performance.wageringToRealMoney += addedBonusUsd;
        }

        let performanceResults = Array.from(bonusPerformanceMap.values()).map(performance => {
            const realiseIssues = performance.bonusAmount > 0
                ? (performance.wageringToRealMoney / performance.sum) * 100
                : 0;

            return {
                bonusName: performance.bonusName,
                countAcceptedBonusPerPlayer: performance.countAcceptedBonusPerPlayer,
                sum: performance.sum,
                wageringToRealMoney: performance.wageringToRealMoney,
                realiseIssues,
            };
        });

      
        if (search) {
            const searchLower = search.toLowerCase();
            const searchNumber = parseFloat(search);
            const isSearchNumber = !isNaN(searchNumber);

            performanceResults = performanceResults.filter(item => (
                item.bonusName.toLowerCase().includes(searchLower) ||
                (isSearchNumber && (
                    item.countAcceptedBonusPerPlayer.toString().includes(search) ||
                    item.sum.toString().includes(search) ||
                    item.wageringToRealMoney.toString().includes(search) ||
                    item.realiseIssues.toString().includes(search)
                ))
            ));
        }

       
        performanceResults.sort((a, b) => a.wageringToRealMoney - b.wageringToRealMoney);

     
        const total_count = performanceResults.length;
        const total_pages = Math.ceil(total_count / page_size);
        const skip = (page - 1) * page_size;
        const paginatedResults = performanceResults.slice(skip, skip + page_size);

        const response = {
            total_count,
            total_pages,
            page,
            page_size,
            data: paginatedResults
        };

        console.log('DEBUG: Bonus performance response:', JSON.stringify(response, null, 2));
        return response;
    } catch (error) {
        console.error('ERROR: get_bonus_performance failed:', error.message);
        throw error;
    }
});

const get_bonus_activity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("DEBUG: Entering get_bonus_activity");
    try {
        const { filters } = req.body;

        if (!filters || !filters.range) {
            return res.status(400).json({ error: "Filters with range are required" });
        }

        const { range, dates, type, provider_code, game_code, search, page, page_size } = filters;
        let startDate, endDate;
        const now = moment();

        switch (range) {
            case "all_time":
                startDate = new Date(0);
                endDate = now.clone().endOf("day").toDate();
                break;
            case "daily":
                startDate = now.clone().startOf("day").toDate();
                endDate = now.clone().endOf("day").toDate();
                break;
            case "weekly":
                startDate = now.clone().subtract(6, "days").startOf("day").toDate();
                endDate = now.clone().endOf("day").toDate();
                break;
            case "monthly":
                startDate = now.clone().subtract(29, "days").startOf("day").toDate();
                endDate = now.clone().endOf("day").toDate();
                break;
            case "custom":
                if (!dates || !dates.start || !dates.end) {
                    return res.status(400).json({ error: "Custom range requires start and end dates" });
                }
                startDate = moment(dates.start).startOf("day").toDate();
                endDate = moment(dates.end).endOf("day").toDate();
                if (startDate > endDate) {
                    return res.status(400).json({ error: "Start date cannot be after end date" });
                }
                break;
            default:
                return res.status(400).json({ error: "Invalid range value" });
        }

        const details = yield get_bonus_details(startDate, endDate, type, provider_code, game_code);
        const perPlayer = yield get_bonus_per_players(startDate, endDate, type, provider_code, game_code, search || '', page || 1, page_size || 100);
        const performance = yield get_bonus_performance(
            startDate,
            endDate,
            type,
            provider_code,
            game_code,
            filters.performance_search || '',
            filters.performance_page || 1,
            filters.performance_page_size || 5
          );

        const response = {
            details,
            per_player: perPlayer,
            performance,
        };

        console.log('DEBUG: Bonus activity response:', JSON.stringify(response, null, 2));
        res.json(response);
        console.log('DEBUG: Bonus activity response sent successfully');
    } catch (error) {
        console.error('ERROR: get_bonus_activity failed:', error.message);
        console.error('ERROR: Stack trace:', error.stack);
        res.status(500).json({ error: 'Internal server error' });
    }
});

exports.get_bonus_activity = get_bonus_activity;



//user country map
const get_users_by_country = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { filters } = req.body;

        if (!filters || !filters.range) {
            return res.status(400).json({ error: "Filters with range are required" });
        }

        const { range, dates } = filters;
        let startDate, endDate;
        const now = moment();

        switch (range) {
            case "all_time":
                startDate = new Date(0);
                endDate = now.clone().endOf("day").toDate();
                break;
            case "daily":
                startDate = now.clone().startOf("day").toDate();
                endDate = now.clone().endOf("day").toDate();
                break;
            case "weekly":
                startDate = now.clone().subtract(6, "days").startOf("day").toDate();
                endDate = now.clone().endOf("day").toDate();
                break;
            case "monthly":
                startDate = now.clone().subtract(29, "days").startOf("day").toDate();
                endDate = now.clone().endOf("day").toDate();
                break;
            case "custom":
                if (!dates || !dates.start || !dates.end) {
                    return res.status(400).json({ error: "Custom range requires start and end dates" });
                }
                startDate = moment(dates.start).startOf("day").toDate();
                endDate = moment(dates.end).endOf("day").toDate();
                if (startDate > endDate) {
                    return res.status(400).json({ error: "Start date cannot be after end date" });
                }
                break;
            default:
                return res.status(400).json({ error: "Invalid range value" });
        }

        const users = yield models_1.Users.find({
            createdAt: { $gte: startDate, $lte: endDate },
        });

        const countryCounts = users.reduce((acc, user) => {
            const country = user.country_reg;
            if (country) {
                acc[country] = (acc[country] || 0) + 1;
            }
            return acc;
        }, {});

        const countryData = Object.entries(countryCounts).map(([country, count]) => ({
            country,
            count,
        }));

        const totalCount = users.length;

        res.json({
            total_count: totalCount,
            countries: countryData,
        });
        // console.log('DEBUG: Users by country response sent successfully');
    } catch (error) {
        console.error('ERROR: get_users_by_country failed:', error.message);
        console.error('ERROR: Stack trace:', error.stack);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.get_users_by_country = get_users_by_country;


//financial activity
const get_balance_reports = (startDate, endDate) => __awaiter(void 0, void 0, void 0, function* () {
    let balances = [];
    if (startDate && endDate) {
        const balanceHistories = yield models_1.BalanceHistories.find({
            createdAt: { $lte: endDate },
        }).populate('currency').sort({ createdAt: -1 });

        const latestBalances = {};
        for (const history of balanceHistories) {
            if (!history.currency || !history.currency._id) continue; 
            const key = `${history.userId.toString()}-${history.currency._id.toString()}`;
            if (!latestBalances[key]) {
                latestBalances[key] = {
                    userId: history.userId,
                    currency: history.currency,
                    balance: history.currentBalance,
                    createdAt: history.createdAt,
                };
            }
        }
        balances = Object.values(latestBalances);
    } else {
        balances = yield models_1.Balances.find({
            status: true,
            disabled: false,
        }).populate('currency');
    }

    const balanceByCurrency = balances.reduce((acc, balance) => {
        const currency = balance.currency.symbol;
        if (!acc[currency]) {
            acc[currency] = {
                totalBalance: 0,
                isFiat: balance.currency.isFiat,
            };
        }
        acc[currency].totalBalance += balance.balance;
        return acc;
    }, {});

    const balanceReports = [
        { name: 'Fiat', value: 0, eur: 0, usd: 0 },
        { name: 'USDT', value: 0, eur: 0, usd: 0 },
        {
            name: 'Crypto',
            value: 'Other',
            usd: 0,
            eur: 0,
            cryptoDetails: [
                { name: 'USDT', value: 0, usd: 0 },
                { name: 'BTC', value: 0, usd: 0 },
                { name: 'ETH', value: 0, usd: 0 },
                { name: 'BNB', value: 0, usd: 0 },
            ],
        },
    ];

    let totalEur = 0;
    let totalUsd = 0;

    for (const [currency, data] of Object.entries(balanceByCurrency)) {
        let usdRate = 1;
        let eurRate = currency === 'EUR' ? 1 : 0;

        try {
            if (currency === 'USDT') {
                balanceReports.find((report) => report.name === 'USDT').value = data.totalBalance;
                balanceReports.find((report) => report.name === 'USDT').usd = data.totalBalance;
                totalUsd += data.totalBalance;
                const eurConverted = yield fiatConverter_1.convertFiatCurrency('USD', 'EUR', data.totalBalance);
                balanceReports.find((report) => report.name === 'USDT').eur = eurConverted;
                totalEur += eurConverted;
            } else if (data.isFiat) {
                if (currency !== 'USD') {
                    usdRate = yield fiatConverter_1.convertFiatCurrency(currency, 'USD', 1);
                }
                if (currency !== 'EUR') {
                    eurRate = yield fiatConverter_1.convertFiatCurrency(currency, 'EUR', 1);
                }
                balanceReports.find((report) => report.name === 'Fiat').value += data.totalBalance * eurRate;
                balanceReports.find((report) => report.name === 'Fiat').eur += data.totalBalance * eurRate;
                balanceReports.find((report) => report.name === 'Fiat').usd += data.totalBalance * usdRate;
                totalUsd += data.totalBalance * usdRate;
                totalEur += data.totalBalance * eurRate;
            } else {
                const coinremitterCurrency = utils_1.COINREMITTER_COINS.find((coin) => coin.symbol === currency);
                if (coinremitterCurrency) {
                    const fiatRate = yield coinremitter_1.getFiatToCryptoRate(coinremitterCurrency, 'USD', 1);
                    if (!fiatRate) {
                        console.error(`DEBUG: Failed to fetch fiat rate for ${currency}`);
                        continue;
                    }
                    usdRate = 1 / fiatRate.crypto_amount;
                    const eurFiatRate = yield coinremitter_1.getFiatToCryptoRate(coinremitterCurrency, 'EUR', 1);
                    eurRate = eurFiatRate ? 1 / eurFiatRate.crypto_amount : 0;
                    const usdValue = data.totalBalance * usdRate;
                    const eurValue = data.totalBalance * eurRate;
                    totalUsd += usdValue;
                    totalEur += eurValue;
                    const cryptoDetail = balanceReports.find((r) => r.name === 'Crypto').cryptoDetails.find((d) => d.name === currency);
                    if (cryptoDetail) {
                        cryptoDetail.value = data.totalBalance;
                        cryptoDetail.usd = usdValue;
                    }
                }
            }
        } catch (apiError) {
            console.error('DEBUG: Failed to fetch exchange rate for', currency, apiError.message);
            continue;
        }
    }

    const cryptoCurrencies = ['BTC', 'ETH', 'BNB'];
    for (const crypto of cryptoCurrencies) {
        const coinremitterCurrency = utils_1.COINREMITTER_COINS.find((coin) => coin.symbol === crypto);
        if (!coinremitterCurrency) {
            console.error(`DEBUG: Coinremitter currency not found for ${crypto}`);
            continue;
        }
        try {
            const usdRateResult = yield coinremitter_1.getFiatToCryptoRate(coinremitterCurrency, 'USD', totalUsd);
            if (!usdRateResult) {
                console.error(`DEBUG: Failed to fetch USD rate for ${crypto}`);
                continue;
            }
            const cryptoAmount = parseFloat(usdRateResult.crypto_amount);
            const cryptoDetail = balanceReports.find((r) => r.name === 'Crypto').cryptoDetails.find((d) => d.name === crypto);
            if (cryptoDetail) {
                cryptoDetail.value = cryptoAmount;
                cryptoDetail.usd = totalUsd;
            }
        } catch (apiError) {
            console.error(`DEBUG: Failed to convert total USD to ${crypto}:`, apiError.message);
            continue;
        }
    }

    const usdtDetail = balanceReports.find((r) => r.name === 'Crypto').cryptoDetails.find((d) => d.name === 'USDT');
    if (usdtDetail) {
        usdtDetail.value = totalUsd;
        usdtDetail.usd = totalUsd;
    }

    balanceReports.find((report) => report.name === 'USDT').value = totalUsd;
    balanceReports.find((report) => report.name === 'USDT').usd = totalUsd;
    balanceReports.find((report) => report.name === 'USDT').eur = yield fiatConverter_1.convertFiatCurrency('USD', 'EUR', totalUsd);

    return { balanceReports, totalUsd, totalEur };
});

const get_total_deposits = (startDate, endDate) => __awaiter(void 0, void 0, void 0, function* () {
    const deposits = yield models_1.Payments.find({
        ipn_type: "deposit",
        status_text: { $in: ["confirmed", "approved"] },
        createdAt: { $gte: startDate, $lte: endDate },
    }).populate('currencyId');

    const totalCount = deposits.length;

    const depositByCurrency = deposits.reduce((acc, deposit) => {
        if (!deposit.currencyId || !deposit.currencyId._id) return acc;
        const currencyId = deposit.currencyId._id.toString();
        if (!acc[currencyId]) {
            acc[currencyId] = {
                totalAmount: 0,
                totalFiatAmount: 0,
                isFiat: deposit.currencyId.isFiat,
                symbol: deposit.currencyId.symbol,
            };
        }
        acc[currencyId].totalAmount += deposit.amount || 0;
        acc[currencyId].totalFiatAmount += deposit.fiat_amount || deposit.amount || 0;
        return acc;
    }, {});

    const depositReports = [
        { name: 'Count', value: 0, usd: 0, eur: 0, count: totalCount },
        { name: 'Fiat', value: 0, eur: 0, usd: 0 },
        {
            name: 'Crypto',
            value: 'Other',
            usd: 0,
            eur: 0,
            cryptoDetails: [
                { name: 'BTC', value: 0, usd: 0 },
                { name: 'ETH', value: 0, usd: 0 },
                { name: 'BNB', value: 0, usd: 0 },
                { name: 'USDT (TRC20)', value: 0, usd: 0 },
                { name: 'USDT (ERC20)', value: 0, usd: 0 },
            ],
        },
    ];

    let totalFiatEur = 0;
    let totalFiatUsd = 0;
    let totalCryptoUsd = 0;

    for (const [currencyId, data] of Object.entries(depositByCurrency)) {
        try {
            if (data.isFiat) {
                let usdRate = 1;
                let eurRate = data.symbol === 'EUR' ? 1 : 0;
                if (data.symbol !== 'USD') {
                    usdRate = yield fiatConverter_1.convertFiatCurrency(data.symbol, 'USD', 1);
                }
                if (data.symbol !== 'EUR') {
                    eurRate = yield fiatConverter_1.convertFiatCurrency(data.symbol, 'EUR', 1);
                }
                depositReports.find((report) => report.name === 'Fiat').value += data.totalAmount * eurRate;
                depositReports.find((report) => report.name === 'Fiat').eur += data.totalAmount * eurRate;
                depositReports.find((report) => report.name === 'Fiat').usd += data.totalAmount * usdRate;
                totalFiatUsd += data.totalAmount * usdRate;
                totalFiatEur += data.totalAmount * eurRate;
            } else {
                let cryptoName = data.symbol;
                if (data.symbol === 'USDTTRC20') cryptoName = 'USDT (TRC20)';
                if (data.symbol === 'USDTERC20') cryptoName = 'USDT (ERC20)';
                const cryptoDetail = depositReports.find((r) => r.name === 'Crypto').cryptoDetails.find((d) => d.name === cryptoName);
                if (cryptoDetail) {
                    cryptoDetail.value = data.totalAmount;
                    cryptoDetail.usd = data.totalFiatAmount;
                    totalCryptoUsd += data.totalFiatAmount;
                }
            }
        } catch (apiError) {
            console.error('DEBUG: Failed to fetch exchange rate for', data.symbol, apiError.message);
            continue;
        }
    }

    depositReports.find((report) => report.name === 'Crypto').usd = totalCryptoUsd;

    return depositReports;
});

const get_total_withdrawals = (startDate, endDate) => __awaiter(void 0, void 0, void 0, function* () {
    const withdrawals = yield models_1.Payments.find({
        ipn_type: "withdrawal",
        status_text: { $in: ["confirmed", "approved"] },
        createdAt: { $gte: startDate, $lte: endDate },
    }).populate('currencyId');

    const totalCount = withdrawals.length;

    const withdrawalByCurrency = withdrawals.reduce((acc, withdrawal) => {
        if (!withdrawal.currencyId || !withdrawal.currencyId._id) return acc;
        const currencyId = withdrawal.currencyId._id.toString();
        if (!acc[currencyId]) {
            acc[currencyId] = {
                totalAmount: 0,
                totalFiatAmount: 0,
                isFiat: withdrawal.currencyId.isFiat,
                symbol: withdrawal.currencyId.symbol,
                data: withdrawal.data,
            };
        }
        acc[currencyId].totalAmount += withdrawal.amount || 0;
        acc[currencyId].totalFiatAmount += withdrawal.fiat_amount || withdrawal.amount || 0;
        return acc;
    }, {});

    const withdrawalReports = [
        { name: 'Count', value: 0, usd: 0, eur: 0, count: totalCount },
        { name: 'Fiat', value: 0, eur: 0, usd: 0 },
        {
            name: 'Crypto',
            value: 'Other',
            usd: 0,
            eur: 0,
            cryptoDetails: [
                { name: 'USDT (TRC20)', value: 0, usd: 0 },
                { name: 'USDT (ERC20)', value: 0, usd: 0 },
            ],
        },
    ];

    let totalFiatEur = 0;
    let totalFiatUsd = 0;
    let totalCryptoUsd = 0;

    for (const [currencyId, data] of Object.entries(withdrawalByCurrency)) {
        try {
            if (data.isFiat) {
                let usdRate = 1;
                let eurRate = data.symbol === 'EUR' ? 1 : 0;
                if (data.symbol !== 'USD') {
                    usdRate = yield fiatConverter_1.convertFiatCurrency(data.symbol, 'USD', 1);
                }
                if (data.symbol !== 'EUR') {
                    eurRate = yield fiatConverter_1.convertFiatCurrency(data.symbol, 'EUR', 1);
                }
                withdrawalReports.find((report) => report.name === 'Fiat').value += data.totalAmount * eurRate;
                withdrawalReports.find((report) => report.name === 'Fiat').eur += data.totalAmount * eurRate;
                withdrawalReports.find((report) => report.name === 'Fiat').usd += data.totalAmount * usdRate;
                totalFiatUsd += data.totalAmount * usdRate;
                totalFiatEur += data.totalAmount * eurRate;
            } else {
                const parsedData = data.data ? JSON.parse(data.data) : { currency: data.symbol };
                const cryptoSymbol = parsedData.currency || data.symbol;
                let reportName = cryptoSymbol;
                if (cryptoSymbol === 'USDTTRC20') reportName = 'USDT (TRC20)';
                if (cryptoSymbol === 'USDTERC20') reportName = 'USDT (ERC20)';
                const cryptoDetail = withdrawalReports.find((r) => r.name === 'Crypto').cryptoDetails.find((d) => d.name === reportName);
                if (cryptoDetail) {
                    cryptoDetail.value = data.totalAmount;
                    cryptoDetail.usd = data.totalFiatAmount;
                    totalCryptoUsd += data.totalFiatAmount;
                }
            }
        } catch (apiError) {
            console.error('DEBUG: Failed to fetch exchange rate for', data.symbol, apiError.message);
            continue;
        }
    }

    withdrawalReports.find((report) => report.name === 'Crypto').usd = totalCryptoUsd;

    return withdrawalReports;
});

const get_financial_activity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { filters } = req.body;

        if (!filters || !filters.range) {
            return res.status(400).json({ error: "Filters with range are required" });
        }

        const { range, dates } = filters;

        let startDate, endDate;
        const now = moment();

        switch (range) {
            case "all_time":
                startDate = new Date(0); 
                endDate = now.clone().endOf("day").toDate();
                break;
            case "daily":
                startDate = now.clone().startOf("day").toDate();
                endDate = now.clone().endOf("day").toDate();
                break;
            case "weekly":
                startDate = now.clone().subtract(6, "days").startOf("day").toDate();
                endDate = now.clone().endOf("day").toDate();
                break;
            case "monthly":
                startDate = now.clone().subtract(29, "days").startOf("day").toDate();
                endDate = now.clone().endOf("day").toDate();
                break;
            case "custom":
                if (!dates || !dates.start || !dates.end) {
                    return res.status(400).json({ error: "Custom range requires start and end dates" });
                }
                startDate = moment(dates.start).startOf("day").toDate();
                endDate = moment(dates.end).endOf("day").toDate();
                if (startDate > endDate) {
                    return res.status(400).json({ error: "Start date cannot be after end date" });
                }
                break;
            default:
                return res.status(400).json({ error: "Invalid range value" });
        }

        const { balanceReports, totalUsd, totalEur } = yield get_balance_reports(range === 'custom' || range === 'all_time' ? startDate : null, range === 'custom' || range === 'all_time' ? endDate : null);
        const depositReports = yield get_total_deposits(startDate, endDate);
        const withdrawalReports = yield get_total_withdrawals(startDate, endDate);

        res.json({
            financial_activity_details: {
                balance_reports: balanceReports,
                total_deposits: depositReports,
                total_withdrawals: withdrawalReports,
            },
            total_usd: totalUsd,
            total_eur: totalEur,
        });
        // console.log('DEBUG: Response sent successfully');
    } catch (error) {
        console.error('ERROR: get_financial_activity failed:', error.message);
        console.error('ERROR: Stack trace:', error.stack);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.get_financial_activity = get_financial_activity;



//gaming activity
const get_ggr_gaming = (startDate, endDate, type, provider_code, game_code) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let totalCount = 0;
        let fiatEur = 0;
        let fiatUsd = 0;
        let usdtValue = 0;
        let usdtUsd = 0;

       
        const conversionCache = new Map();

      
        if (!type || type === 'casino') {
            const casinoQuery = {
                txn_type: "BET",
                canceled: false,
                createdAt: { $gte: startDate, $lte: endDate },
            };
            if (provider_code) casinoQuery.provider_code = provider_code;
            if (game_code) casinoQuery.game_code = game_code;

            const casinoBets = yield models_1.GameHistories.find(casinoQuery).populate('currency');
            totalCount += casinoBets.length;

            console.log('DEBUG: Casino bets count:', casinoBets.length);
            console.log('DEBUG: Sample casino bet:', casinoBets[0] ? JSON.stringify({
                _id: casinoBets[0]._id,
                currency: casinoBets[0].currency?.symbol,
                bet_money: casinoBets[0].bet_money
            }, null, 2) : 'No casino bets');

            for (const bet of casinoBets) {
                if (!bet.currency || !bet.currency._id) {
                    console.warn('DEBUG: Skipping casino bet with missing currency:', bet._id);
                    continue;
                }
                const currencySymbol = bet.currency.symbol || 'UNKNOWN';
                if (currencySymbol === 'UNKNOWN') {
                    console.warn('DEBUG: Skipping casino bet with UNKNOWN currency:', bet._id);
                    continue;
                }

                let betUsd = bet.bet_money || 0;
                let betEur = bet.bet_money || 0;

                if (currencySymbol !== 'USD' || currencySymbol !== 'EUR') {
                    if (!conversionCache.has(currencySymbol)) {
                        try {
                            const usdRate = currencySymbol === 'USD' ? 1 : yield fiatConverter_1.convertFiatCurrency(currencySymbol, 'USD', 1);
                            const eurRate = currencySymbol === 'EUR' ? 1 : yield fiatConverter_1.convertFiatCurrency(currencySymbol, 'EUR', 1);
                            conversionCache.set(currencySymbol, { usd: usdRate, eur: eurRate });
                            console.log('DEBUG: Conversion rates for', currencySymbol, ': USD:', usdRate, 'EUR:', eurRate);
                        } catch (error) {
                            console.error('DEBUG: Failed to convert', currencySymbol, 'for bet', bet._id, ':', error.message);
                            continue;
                        }
                    }
                    const rates = conversionCache.get(currencySymbol);
                    betUsd = (bet.bet_money || 0) * rates.usd;
                    betEur = (bet.bet_money || 0) * rates.eur;
                }

                if (currencySymbol === 'USDT') {
                    usdtValue += bet.bet_money || 0;
                    usdtUsd += bet.bet_money || 0;
                } else {
                    fiatUsd += betUsd;
                    fiatEur += betEur;
                }

                console.log('DEBUG: Casino bet', bet._id, 'amount:', bet.bet_money, currencySymbol, '-> USD:', betUsd, 'EUR:', betEur);
            }
        }

      
        if (!type || type === 'sport') {
            const sportsQuery = {
                createdAt: { $gte: startDate, $lte: endDate },
                stake: { $gt: 0 },
            };

            const sportsBets = yield models_1.SportsBets.find(sportsQuery).populate('currency');
            totalCount += sportsBets.length;

            console.log('DEBUG: Sports bets count:', sportsBets.length);
            console.log('DEBUG: Sample sports bet:', sportsBets[0] ? JSON.stringify({
                _id: sportsBets[0]._id,
                currency: sportsBets[0].currency?.symbol,
                stake: sportsBets[0].stake
            }, null, 2) : 'No sports bets');

            for (const bet of sportsBets) {
                if (!bet.currency || !bet.currency._id) {
                    console.warn('DEBUG: Skipping sports bet with missing currency:', bet._id);
                    continue;
                }
                const currencySymbol = bet.currency.symbol || 'UNKNOWN';
                if (currencySymbol === 'UNKNOWN') {
                    console.warn('DEBUG: Skipping sports bet with UNKNOWN currency:', bet._id);
                    continue;
                }

                let stakeUsd = bet.stake || 0;
                let stakeEur = bet.stake || 0;

                if (currencySymbol !== 'USD' || currencySymbol !== 'EUR') {
                    if (!conversionCache.has(currencySymbol)) {
                        try {
                            const usdRate = currencySymbol === 'USD' ? 1 : yield fiatConverter_1.convertFiatCurrency(currencySymbol, 'USD', 1);
                            const eurRate = currencySymbol === 'EUR' ? 1 : yield fiatConverter_1.convertFiatCurrency(currencySymbol, 'EUR', 1);
                            conversionCache.set(currencySymbol, { usd: usdRate, eur: eurRate });
                            console.log('DEBUG: Conversion rates for', currencySymbol, ': USD:', usdRate, 'EUR:', eurRate);
                        } catch (error) {
                            console.error('DEBUG: Failed to convert', currencySymbol, 'for bet', bet._id, ':', error.message);
                            continue;
                        }
                    }
                    const rates = conversionCache.get(currencySymbol);
                    stakeUsd = (bet.stake || 0) * rates.usd;
                    stakeEur = (bet.stake || 0) * rates.eur;
                }

                if (currencySymbol === 'USDT') {
                    usdtValue += bet.stake || 0;
                    usdtUsd += bet.stake || 0; 
                } else {
                    fiatUsd += stakeUsd;
                    fiatEur += stakeEur;
                }

                console.log('DEBUG: Sports bet', bet._id, 'stake:', bet.stake, currencySymbol, '-> USD:', stakeUsd, 'EUR:', stakeEur);
            }
        }

        const total_usd = fiatUsd + usdtUsd;

        console.log('DEBUG: GGR results:', {
            count: totalCount,
            fiat: { eur: fiatEur, usd: fiatUsd },
            usdt: { value: usdtValue, usd: usdtUsd },
            total_usd: total_usd
        });

        return {
            count: totalCount,
            fiat: {
                eur: fiatEur,
                usd: fiatUsd
            },
            usdt: {
                value: usdtValue,
                usd: usdtUsd
            },
            total_usd: total_usd
        };
    } catch (error) {
        console.error('ERROR: get_ggr_gaming failed:', error.message);
        throw error;
    }
});



const get_total_wins_gaming = (startDate, endDate, type, provider_code, game_code) => __awaiter(void 0, void 0, void 0, function* () {
    let totalCount = 0;
    let winByCurrency = {};


    if (!type || type === 'casino') {
        const casinoQuery = {
            txn_type: "WIN",
            win_money: { $gt: 0 },
            canceled: false,
            createdAt: { $gte: startDate, $lte: endDate },
        };
        if (provider_code) casinoQuery.provider_code = provider_code;
        if (game_code) casinoQuery.game_code = game_code;

        const casinoWins = yield models_1.GameHistories.find(casinoQuery).populate('currency');
        totalCount += casinoWins.length;

        // console.log('DEBUG: Casino wins count:', casinoWins.length);
        // console.log('DEBUG: Sample casino win:', casinoWins[0] ? JSON.stringify({
        //     _id: casinoWins[0]._id,
        //     currency: casinoWins[0].currency,
        //     win_money: casinoWins[0].win_money
        // }, null, 2) : 'No casino wins');

        const casinoWinByCurrency = casinoWins.reduce((acc, win) => {
            if (!win.currency || !win.currency._id) {
                console.warn('DEBUG: Skipping casino win with missing currency:', win._id);
                return acc;
            }
            if (win.currency.symbol === 'USDT') {
                // console.log('DEBUG: Found USDT casino win:', win._id, 'amount:', win.win_money);
            }
            const currencyId = win.currency._id.toString();
            if (!acc[currencyId]) {
                acc[currencyId] = {
                    totalAmount: 0,
                    isFiat: win.currency.isFiat || true,
                    symbol: win.currency.symbol || 'UNKNOWN',
                };
            }
            acc[currencyId].totalAmount += win.win_money || 0;
            return acc;
        }, {});

        winByCurrency = { ...casinoWinByCurrency };
    }


    if (!type || type === 'sport') {
        const sportsQuery = {
            status: { $in: ['WIN', 'HALF_WIN'] },
            createdAt: { $gte: startDate, $lte: endDate },
            profit: { $gte: 0 },
        };

        const sportsWins = yield models_1.SportsBets.find(sportsQuery).populate('currency');
        totalCount += sportsWins.length;

        // console.log('DEBUG: Sports wins count:', sportsWins.length);
        // console.log('DEBUG: Sample sports win:', sportsWins[0] ? JSON.stringify({
        //     _id: sportsWins[0]._id,
        //     currency: sportsWins[0].currency,
        //     profit: sportsWins[0].profit
        // }, null, 2) : 'No sports wins');

        const sportsWinByCurrency = sportsWins.reduce((acc, win) => {
            if (!win.currency || !win.currency._id) {
                console.warn('DEBUG: Skipping sports win with missing currency:', win._id);
                return acc;
            }
            if (win.currency.symbol === 'USDT') {
                // console.log('DEBUG: Found USDT sports win:', win._id, 'amount:', win.profit);
            }
            const currencyId = win.currency._id.toString();
            if (!acc[currencyId]) {
                acc[currencyId] = {
                    totalAmount: 0,
                    isFiat: win.currency.isFiat || true,
                    symbol: win.currency.symbol || 'UNKNOWN',
                };
            }
            acc[currencyId].totalAmount += win.profit || 0;
            return acc;
        }, {});


        for (const [currencyId, data] of Object.entries(sportsWinByCurrency)) {
            if (!winByCurrency[currencyId]) {
                winByCurrency[currencyId] = { ...data };
            } else {
                winByCurrency[currencyId].totalAmount += data.totalAmount;
            }
        }
    }

    let fiatEur = 0;
    let fiatUsd = 0;
    let usdtValue = 0;
    let usdtUsd = 0;

    // console.log('DEBUG: winByCurrency:', JSON.stringify(winByCurrency, null, 2));

    for (const [currencyId, data] of Object.entries(winByCurrency)) {
        try {
            if (data.symbol === 'UNKNOWN') {
                console.warn('DEBUG: Skipping currency aggregation for UNKNOWN symbol:', currencyId);
                continue;
            }
            if (data.isFiat) {
                let usdRate = data.symbol === 'USD' ? 1 : yield fiatConverter_1.convertFiatCurrency(data.symbol, 'USD', 1);
                let eurRate = data.symbol === 'EUR' ? 1 : yield fiatConverter_1.convertFiatCurrency(data.symbol, 'EUR', 1);
                fiatUsd += data.totalAmount * usdRate;
                fiatEur += data.totalAmount * eurRate;
            } else if (data.symbol === 'USDT') {
                usdtValue += data.totalAmount;
                usdtUsd += data.totalAmount; 
            }
        } catch (error) {
            console.error(`DEBUG: Failed to convert currency ${data.symbol}:`, error.message);
            continue;
        }
    }

    return {
        count: totalCount,
        fiat: { eur: fiatEur, usd: fiatUsd },
        usdt: { value: usdtValue, usd: usdtUsd },
    };
});

const get_total_loss_gaming = (startDate, endDate, type, provider_code, game_code) => __awaiter(void 0, void 0, void 0, function* () {
    let totalCount = 0;
    let lossByCurrency = {};


    if (!type || type === 'casino') {
        const casinoQuery = {
            txn_type: "WIN",
            win_money: { $eq: 0 },
            canceled: false,
            createdAt: { $gte: startDate, $lte: endDate },
        };
        if (provider_code) casinoQuery.provider_code = provider_code;
        if (game_code) casinoQuery.game_code = game_code;

        const casinoLosses = yield models_1.GameHistories.find(casinoQuery).populate('currency');
        totalCount += casinoLosses.length;

        // console.log('DEBUG: Casino losses count:', casinoLosses.length);
        // console.log('DEBUG: Sample casino loss:', casinoLosses[0] ? JSON.stringify({
        //     _id: casinoLosses[0]._id,
        //     currency: casinoLosses[0].currency,
        //     round_id: casinoLosses[0].round_id
        // }, null, 2) : 'No casino losses');

        const betIds = casinoLosses.map(loss => loss.round_id);
        const casinoBets = yield models_1.GameHistories.find({
            txn_type: "BET",
            round_id: { $in: betIds },
            canceled: false,
        }).populate('currency');

        const casinoLossByCurrency = casinoBets.reduce((acc, bet) => {
            if (!bet.currency || !bet.currency._id) {
                console.warn('DEBUG: Skipping casino bet for loss with missing currency:', bet._id);
                return acc;
            }
            if (bet.currency.symbol === 'USDT') {
                // console.log('DEBUG: Found USDT casino loss bet:', bet._id, 'amount:', bet.bet_money);
            }
            const currencyId = bet.currency._id.toString();
            if (!acc[currencyId]) {
                acc[currencyId] = {
                    totalAmount: 0,
                    isFiat: bet.currency.isFiat || true,
                    symbol: bet.currency.symbol || 'UNKNOWN',
                };
            }
            acc[currencyId].totalAmount += bet.bet_money || 0;
            return acc;
        }, {});

        lossByCurrency = { ...casinoLossByCurrency };
    }


    if (!type || type === 'sport') {
        const sportsQuery = {
            status: { $in: ['LOST', 'HALF_LOST'] },
            createdAt: { $gte: startDate, $lte: endDate },
        };

        const sportsLosses = yield models_1.SportsBets.find(sportsQuery).populate('currency');
        totalCount += sportsLosses.length;

        // console.log('DEBUG: Sports losses count:', sportsLosses.length);
        // console.log('DEBUG: Sample sports loss:', sportsLosses[0] ? JSON.stringify({
        //     _id: sportsLosses[0]._id,
        //     currency: sportsLosses[0].currency,
        //     stake: sportsLosses[0].stake
        // }, null, 2) : 'No sports losses');

        const sportsLossByCurrency = sportsLosses.reduce((acc, loss) => {
            if (!loss.currency || !loss.currency._id) {
                console.warn('DEBUG: Skipping sports loss with missing currency:', loss._id);
                return acc;
            }
            if (loss.currency.symbol === 'USDT') {
                // console.log('DEBUG: Found USDT sports loss:', loss._id, 'amount:', loss.stake);
            }
            const currencyId = loss.currency._id.toString();
            if (!acc[currencyId]) {
                acc[currencyId] = {
                    totalAmount: 0,
                    isFiat: loss.currency.isFiat || true,
                    symbol: loss.currency.symbol || 'UNKNOWN',
                };
            }
            acc[currencyId].totalAmount += loss.stake || 0;
            return acc;
        }, {});


        for (const [currencyId, data] of Object.entries(sportsLossByCurrency)) {
            if (!lossByCurrency[currencyId]) {
                lossByCurrency[currencyId] = { ...data };
            } else {
                lossByCurrency[currencyId].totalAmount += data.totalAmount;
            }
        }
    }

    let fiatEur = 0;
    let fiatUsd = 0;
    let usdtValue = 0;
    let usdtUsd = 0;

    // console.log('DEBUG: lossByCurrency:', JSON.stringify(lossByCurrency, null, 2));

    for (const [currencyId, data] of Object.entries(lossByCurrency)) {
        try {
            if (data.symbol === 'UNKNOWN') {
                console.warn('DEBUG: Skipping currency aggregation for UNKNOWN symbol:', currencyId);
                continue;
            }
            if (data.isFiat) {
                let usdRate = data.symbol === 'USD' ? 1 : yield fiatConverter_1.convertFiatCurrency(data.symbol, 'USD', 1);
                let eurRate = data.symbol === 'EUR' ? 1 : yield fiatConverter_1.convertFiatCurrency(data.symbol, 'EUR', 1);
                fiatUsd += data.totalAmount * usdRate;
                fiatEur += data.totalAmount * eurRate;
            } else if (data.symbol === 'USDT') {
                usdtValue += data.totalAmount;
                usdtUsd += data.totalAmount; 
            }
        } catch (error) {
            console.error(`DEBUG: Failed to convert currency ${data.symbol}:`, error.message);
            continue;
        }
    }

    return {
        count: totalCount,
        fiat: { eur: fiatEur, usd: fiatUsd },
        usdt: { value: usdtValue, usd: usdtUsd },
    };
});

const get_gaming_activity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { filters } = req.body;

        if (!filters || !filters.range) {
            return res.status(400).json({ error: "Filters with range are required" });
        }

        const { range, dates, type, provider_code, game_code } = filters;
        let startDate, endDate;
        const now = moment();

        switch (range) {
            case "all_time":
                startDate = new Date(0);
                endDate = now.clone().endOf("day").toDate();
                break;
            case "daily":
                startDate = now.clone().startOf("day").toDate();
                endDate = now.clone().endOf("day").toDate();
                break;
            case "weekly":
                startDate = now.clone().subtract(6, "days").startOf("day").toDate();
                endDate = now.clone().endOf("day").toDate();
                break;
            case "monthly":
                startDate = now.clone().subtract(29, "days").startOf("day").toDate();
                endDate = now.clone().endOf("day").toDate();
                break;
            case "custom":
                if (!dates || !dates.start || !dates.end) {
                    return res.status(400).json({ error: "Custom range requires start and end dates" });
                }
                startDate = moment(dates.start).startOf("day").toDate();
                endDate = moment(dates.end).endOf("day").toDate();
                if (startDate > endDate) {
                    return res.status(400).json({ error: "Start date cannot be after end date" });
                }
                break;
            default:
                return res.status(400).json({ error: "Invalid range value" });
        }

        const ggrData = yield get_ggr_gaming(startDate, endDate, type, provider_code, game_code);
        const winData = yield get_total_wins_gaming(startDate, endDate, type, provider_code, game_code);
        const lossData = yield get_total_loss_gaming(startDate, endDate, type, provider_code, game_code);


        const ggrTotalUsd = (ggrData.fiat.usd);
        const ggr = {
            fiat: {
                eur: ggrData.fiat.eur,
                usd: ggrData.fiat.usd,
            },
            usdt: {
                value: ggrTotalUsd, 
                usd: ggrTotalUsd,   
            },
            total_usd: ggrTotalUsd,
        };

        const response = {
            total_bets: { count: ggrData.count },
            count_wins: { count: winData.count },
            count_losses: { count: lossData.count },
            total_win: {
                fiat: winData.fiat,
                usdt: {
                    value: winData.fiat.usd,
                    usd: winData.fiat.usd,
                },
            },
            total_loss: {
                fiat: lossData.fiat,
                usdt: {
                    value: lossData.fiat.usd,
                    usd: lossData.fiat.usd,
                },
            },
            ggr: ggr,
        };

        // console.log('DEBUG: Gaming activity response:', JSON.stringify(response, null, 2));
        res.json(response);
        // console.log('DEBUG: Gaming activity response sent successfully');
    } catch (error) {
        console.error('ERROR: get_gaming_activity failed:', error.message);
        console.error('ERROR: Stack trace:', error.stack);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.get_gaming_activity = get_gaming_activity;


