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
exports.Roulette = void 0;
const crypto = require("crypto");
const models_1 = require("../../../models");
const base_1 = require("../../base");
const RandomSeed = require('random-seed');
const PatternNum = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];
const BetSet = {
    '1-12': { value: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], odds: 3 },
    '13-24': {
        value: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
        odds: 3
    },
    '25-36': {
        value: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
        odds: 3
    },
    '1-18': {
        value: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
        odds: 2
    },
    '19-36': {
        value: [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
        odds: 2
    },
    row1: { value: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36], odds: 3 },
    row2: { value: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35], odds: 3 },
    row3: { value: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34], odds: 3 },
    red: {
        value: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36],
        odds: 2
    },
    black: {
        value: [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35],
        odds: 2
    },
    even: {
        value: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36],
        odds: 2
    },
    odd: {
        value: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35],
        odds: 2
    }
};
const getProfits = (number, bet) => {
    let win = 0;
    for (const key in bet) {
        if (PatternNum[Number(key)] !== undefined) {
            if (PatternNum[Number(key)] === number) {
                win += bet[key] * 36;
            }
        }
        else if (BetSet[key] !== undefined) {
            if (BetSet[key].value.indexOf(number) !== -1) {
                win += bet[key] * BetSet[key].odds;
            }
        }
    }
    return win;
};
const getNumber = ({ amount, bet, current = false }) => {
    const seed = crypto.createHash('sha256').update(`${Date.now()}`).digest('hex');
    const rand = RandomSeed(seed);
    if (current) {
        const data = [];
        for (const i in PatternNum) {
            data.push({
                profit: getProfits(PatternNum[i], bet),
                number: PatternNum[i]
            });
        }
        const results = data.sort((a, b) => a.profit - b.profit || b.number - a.number);
        const randomNum = rand.range(data.filter((e) => e.profit <= amount).length);
        const result = results[randomNum];
        const win = result.profit;
        if (win > amount) {
            return {
                status: 'WIN',
                odds: win / amount,
                profit: win,
                number: result.number
            };
        }
        else if (win === amount) {
            return {
                status: 'DRAW',
                odds: win / amount,
                profit: win,
                number: result.number
            };
        }
        else {
            return {
                status: 'LOST',
                odds: win / amount,
                profit: win,
                number: result.number
            };
        }
    }
    else {
        const randomNum = rand.range(37);
        const number = PatternNum[randomNum];
        const win = getProfits(number, bet);
        if (win > amount) {
            return { status: 'WIN', odds: win / amount, profit: win, number };
        }
        else if (win === amount) {
            return { status: 'DRAW', odds: win / amount, profit: win, number };
        }
        else {
            return { status: 'LOST', odds: win / amount, profit: win, number };
        }
    }
};
const Roulette = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, currency, amount, bet } = req.body;
    const gamelist = yield models_1.GameLists.findOne({ id: req.body.gameId });
    const gameId = gamelist._id;
    const checkedMax = yield (0, base_1.checkMaxBet)({ currency, amount });
    if (!checkedMax) {
        res.status(400).json('Maximum bet exceeded!');
        return;
    }
    
    try {
        yield (0, base_1.handleBet)({
            req,
            currency,
            userId,
            amount: amount * -1,
            type: 'casino-bet(roulette)',
            info: (0, base_1.generatInfo)()
        });
    } catch (error) {
        if (error.message === 'Insufficient balance for bet') {
            res.status(400).json('Balances not enough!');
            return;
        }
        throw error;
    }
    const { input, output } = yield (0, base_1.getProfit)(currency);
    const result = getNumber({ amount, bet });
    const data = {
        providerId: gamelist.providerId,
        userId,
        currency,
        gameId,
        amount,
        betting: req.body
    };
    if (((output + result.profit) / (input + amount)) * 100 >= gamelist.rtp) {
        const result = getNumber({ amount, bet, current: true });
        const games = yield models_1.Games.create(Object.assign({ status: result.status, profit: result.profit, odds: result.odds, aBetting: result }, data));
        res.json({
            status: result.status,
            number: result.number,
            odds: result.odds,
            profit: result.profit
        });
        if (result.odds > 0) {
            setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
                yield (0, base_1.handleBet)({
                    req,
                    currency,
                    userId,
                    amount: result.profit,
                    type: 'casino-bet-settled(roulette)',
                    info: games._id
                });
            }), 3000);
        }
    }
    else {
        const games = yield models_1.Games.create(Object.assign({ status: result.status, profit: result.profit, odds: result.odds, aBetting: result }, data));
        res.json({
            status: result.status,
            number: result.number,
            odds: result.odds,
            profit: result.profit
        });
        if (result.odds > 0) {
            setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
                yield (0, base_1.handleBet)({
                    req,
                    currency,
                    userId,
                    amount: result.profit,
                    type: 'casino-bet-settled(roulette)',
                    info: games._id
                });
            }), 3000);
        }
    }
});
exports.Roulette = Roulette;
