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
exports.Diamonds = void 0;
const models_1 = require("../../../models");
const base_1 = require("../../base");
const diamond = [
    { pct: 4, odds: 50, index: 0 },
    { pct: 125, odds: 5, index: 1 },
    { pct: 250, odds: 4, index: 2 },
    { pct: 1249, odds: 3, index: 3 },
    { pct: 1874, odds: 2, index: 4 },
    { pct: 4998, odds: 0.1, index: 5 },
    { pct: 1500, odds: 0, index: 6 }
];
const colors = {
    0: [
        ['green', 'green', 'green', 'green', 'green'],
        ['purple', 'purple', 'purple', 'purple', 'purple'],
        ['yellow', 'yellow', 'yellow', 'yellow', 'yellow'],
        ['red', 'red', 'red', 'red', 'red'],
        ['light_blue', 'light_blue', 'light_blue', 'light_blue', 'light_blue'],
        ['pink', 'pink', 'pink', 'pink', 'pink'],
        ['blue', 'blue', 'blue', 'blue', 'blue']
    ],
    1: [
        ['green', 'green', 'green', 'green', 'purple'],
        ['purple', 'purple', 'purple', 'purple', 'yellow'],
        ['yellow', 'yellow', 'yellow', 'yellow', 'red'],
        ['red', 'red', 'red', 'red', 'light_blue'],
        ['light_blue', 'light_blue', 'light_blue', 'light_blue', 'pink'],
        ['pink', 'pink', 'pink', 'pink', 'blue'],
        ['blue', 'blue', 'blue', 'blue', 'green']
    ],
    2: [
        ['green', 'green', 'green', 'purple', 'purple'],
        ['purple', 'purple', 'purple', 'yellow', 'yellow'],
        ['yellow', 'yellow', 'yellow', 'red', 'red'],
        ['red', 'red', 'red', 'light_blue', 'light_blue'],
        ['light_blue', 'light_blue', 'light_blue', 'pink', 'pink'],
        ['pink', 'pink', 'pink', 'blue', 'blue'],
        ['blue', 'blue', 'blue', 'green', 'green']
    ],
    3: [
        ['green', 'green', 'green', 'purple', 'yellow'],
        ['purple', 'purple', 'purple', 'yellow', 'red'],
        ['yellow', 'yellow', 'yellow', 'red', 'light_blue'],
        ['red', 'red', 'red', 'light_blue', 'pink'],
        ['light_blue', 'light_blue', 'light_blue', 'pink', 'blue'],
        ['pink', 'pink', 'pink', 'blue', 'green'],
        ['blue', 'blue', 'blue', 'green', 'purple']
    ],
    4: [
        ['green', 'green', 'purple', 'purple', 'yellow'],
        ['purple', 'purple', 'yellow', 'yellow', 'red'],
        ['yellow', 'yellow', 'red', 'red', 'light_blue'],
        ['red', 'red', 'light_blue', 'light_blue', 'pink'],
        ['light_blue', 'light_blue', 'pink', 'pink', 'blue'],
        ['pink', 'pink', 'blue', 'blue', 'green'],
        ['blue', 'blue', 'green', 'green', 'purple']
    ],
    5: [
        ['green', 'green', 'purple', 'red', 'yellow'],
        ['purple', 'purple', 'yellow', 'light_blue', 'red'],
        ['yellow', 'yellow', 'red', 'pink', 'light_blue'],
        ['red', 'red', 'light_blue', 'blue', 'pink'],
        ['light_blue', 'light_blue', 'green', 'pink', 'blue'],
        ['pink', 'pink', 'blue', 'purple', 'green'],
        ['blue', 'blue', 'green', 'red', 'purple']
    ],
    6: [
        ['green', 'light_blue', 'purple', 'red', 'yellow'],
        ['purple', 'blue', 'yellow', 'light_blue', 'red'],
        ['yellow', 'green', 'red', 'pink', 'light_blue'],
        ['red', 'green', 'light_blue', 'blue', 'pink'],
        ['light_blue', 'purple', 'green', 'pink', 'blue'],
        ['pink', 'yellow', 'blue', 'purple', 'green'],
        ['blue', 'light_blue', 'green', 'red', 'purple']
    ]
};
const getNumber = ({ amount, current = false }) => {
    let numbers = diamond;
    if (current) {
        numbers = [diamond[6]];
    }
    const expanded = numbers.flatMap((item) => Array(item.pct).fill(item));
    const winner = expanded[Math.floor(Math.random() * expanded.length)];
    const color = colors[winner.index][Math.floor(Math.random() * colors[winner.index].length)];
    if (winner.odds > 1) {
        return Object.assign({ status: 'WIN', profit: winner.odds * amount, color }, winner);
    }
    else {
        return Object.assign({ status: 'LOST', profit: winner.odds * amount, color }, winner);
    }
};
const Diamonds = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, currency, amount } = req.body;
    const gamelist = yield models_1.GameLists.findOne({ id: req.body.gameId });
    const gameId = gamelist._id;
    const checkedMax = yield (0, base_1.checkMaxBet)({ currency, amount });
    const checked = yield (0, base_1.checkBalance)({ userId, currency, amount });
    if (!checked) {
        res.status(400).json('Balances not enough!');
        return;
    }
    if (!checkedMax) {
        res.status(400).json('Please check betLimit!');
        return;
    }
    yield (0, base_1.handleBet)({
        req,
        currency,
        userId,
        amount: amount * -1,
        type: 'casino-bet(diamonds)',
        info: (0, base_1.generatInfo)()
    });
    const { input, output } = yield (0, base_1.getProfit)(currency);
    const result = getNumber({ amount });
    const data = {
        providerId: gamelist.providerId,
        userId,
        currency,
        gameId,
        amount,
        betting: req.body
    };
    if (((output + result.profit) / (input + amount)) * 100 >= gamelist.rtp) {
        const result = getNumber({ amount, current: true });
        yield models_1.Games.create(Object.assign({ status: result.status, odds: result.odds, profit: result.profit, aBetting: result }, data));
        res.json({
            status: result.status,
            odds: result.odds,
            profit: result.profit,
            color: result.color
        });
    }
    else {
        const games = yield models_1.Games.create(Object.assign({ status: result.status, odds: result.odds, profit: result.profit, aBetting: result }, data));
        res.json({
            status: result.status,
            odds: result.odds,
            profit: result.profit,
            color: result.color
        });
        if (result.odds > 0) {
            setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
                yield (0, base_1.handleBet)({
                    req,
                    currency,
                    userId,
                    amount: result.profit,
                    type: 'casino-bet-settled(diamonds)',
                    info: games._id
                });
            }), 1000);
        }
    }
});
exports.Diamonds = Diamonds;
