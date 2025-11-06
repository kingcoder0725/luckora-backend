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
exports.activity_calc = void 0;
const mongoose_1 = require("mongoose");
const models_1 = require("../models");
const own_affiliate_1 = require("../utils/own_affilate");

const activity_calc = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Starting activity calculation...');

        // Проверяем, что все необходимые модели определены
        if (!models_1.GameHistories || !models_1.BalanceHistories || !models_1.Users || !models_1.Roles || !models_1.Currencies) {
            console.error('One or more models are undefined:', {
                GameHistories: !!models_1.GameHistories,
                BalanceHistories: !!models_1.BalanceHistories,
                Users: !!models_1.Users,
                Roles: !!models_1.Roles,
                Currencies: !!models_1.Currencies
            });
            throw new Error('Required models are not properly initialized');
        }

        // Шаг 1: Получаем всех активных аффилиат-игроков (role: player, status: true, affiliate: true, username_affiliate not empty)
        const playerRole = yield models_1.Roles.findOne({ title: 'player' });
        if (!playerRole) {
            console.error('Player role not found');
            return;
        }

        const affiliateUsers = yield models_1.Users.find({
            rolesId: playerRole._id,
            status: true,
            affiliate: true,
            username_affiliate: { $ne: '' }
        }).select('_id username');

        if (!affiliateUsers.length) {
            console.log('No affiliate users found');
            return;
        }

        const affiliateUserIds = affiliateUsers.map(user => user._id);
        const userMap = new Map(affiliateUsers.map(user => [user._id.toString(), user.username]));

        // Шаг 2: Аггрегация по GameHistories для turnover, wins и ggr
        const gameStats = yield models_1.GameHistories.aggregate([
            {
                $match: {
                    userId: { $in: affiliateUserIds },
                    isBonusPlay: false,
                },
            },
            {
                $group: {
                    _id: { userId: "$userId", currency: "$currency" },
                    turnover: {
                        $sum: {
                            $cond: [{ $eq: ["$txn_type", "BET"] }, "$bet_money", 0],
                        },
                    },
                    wins: {
                        $sum: {
                            $cond: [{ $eq: ["$txn_type", "WIN"] }, "$win_money", 0],
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    userId: "$_id.userId",
                    currencyId: "$_id.currency",
                    turnover: 1,
                    wins: 1,
                    ggr: { $subtract: ["$turnover", "$wins"] },
                },
            },
        ]);

        // Шаг 3: Аггрегация по BalanceHistories для bonuses
        const bonusStats = yield models_1.BalanceHistories.aggregate([
            {
                $match: {
                    userId: { $in: affiliateUserIds },
                    type: 'bonus',
                    amount: { $gt: 0 },
                },
            },
            {
                $group: {
                    _id: { userId: "$userId", currency: "$currency" },
                    bonuses: { $sum: "$amount" },
                },
            },
            {
                $project: {
                    _id: 0,
                    userId: "$_id.userId",
                    currencyId: "$_id.currency",
                    bonuses: 1,
                },
            },
        ]);

      

        // Шаг 5: Получаем все валюты для mapping id -> symbol
        const currencies = yield models_1.Currencies.find().select('_id symbol');
        const currencyMap = new Map(currencies.map(curr => [curr._id.toString(), curr.symbol || 'USD'])); // Fallback to 'USD' if symbol is missing

        // Шаг 6: Мержим stats по userId и currencyId
        const mergedStats = new Map();  // userId_currencyId -> {turnover, ggr, bonuses, withdrawals}

        // Мерж gameStats
        gameStats.forEach(stat => {
            const key = `${stat.userId.toString()}_${stat.currencyId.toString()}`;
            if (!mergedStats.has(key)) {
                mergedStats.set(key, { userId: stat.userId, currencyId: stat.currencyId, turnover: 0, ggr: 0, bonuses: 0});
            }
            const entry = mergedStats.get(key);
            entry.turnover = stat.turnover || 0;
            entry.ggr = stat.ggr || 0;
        });

        // Мерж bonusStats
        bonusStats.forEach(stat => {
            const key = `${stat.userId.toString()}_${stat.currencyId.toString()}`;
            if (!mergedStats.has(key)) {
                mergedStats.set(key, { userId: stat.userId, currencyId: stat.currencyId, turnover: 0, ggr: 0, bonuses: 0});
            }
            const entry = mergedStats.get(key);
            entry.bonuses = stat.bonuses || 0;
        });

  

        // Шаг 7: Обрабатываем пачками (по 100 записей) и вызываем postback
        const statsArray = Array.from(mergedStats.values());
        const chunkSize = 100;
        for (let i = 0; i < statsArray.length; i += chunkSize) {
            const chunk = statsArray.slice(i, i + chunkSize);
            yield Promise.all(chunk.map((stat) => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = stat.userId.toString();
                const currencyIdStr = stat.currencyId.toString();
                const username = userMap.get(userIdStr);
                const currencySymbol = currencyMap.get(currencyIdStr);

                if (!username || !currencySymbol) {
                    console.warn(`Skipping postback for user ${userIdStr}: missing username or currency`);
                    return;
                }

                // Проверяем, что currencySymbol - это строка
                if (typeof currencySymbol !== 'string') {
                    console.warn(`Invalid currency symbol for user ${userIdStr}, currencyId ${currencyIdStr}: ${currencySymbol}`);
                    return;
                }

                // Вызываем только если есть значимые данные
                if (stat.turnover > 0 || stat.bonuses > 0) {
                    try {
                        yield (0, own_affiliate_1.activityPostBack)(
                            new mongoose_1.Types.ObjectId(userIdStr),
                            username,
                            stat.ggr,
                            stat.bonuses,
                            stat.turnover,
                            currencySymbol,
                        );
                    } catch (postbackError) {
                        console.error(`Postback failed for user ${userIdStr}, currency ${currencySymbol}: ${postbackError.message}`);
                    }
                }
            })));
        }

        console.log('Activity calculation completed.');
    } catch (error) {
        console.error('Error in activity_calc:', error);
    }
});
exports.activity_calc = activity_calc;