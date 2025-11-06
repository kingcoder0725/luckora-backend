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
exports.Wheel = void 0;
const models_1 = require("../../../models");
const base_1 = require("../../base");
const mode1 = [
    { index: 0, value: 4, color: 'green' },
    { index: 1, value: 2, color: 'red' },
    { index: 2, value: 2, color: 'black' },
    { index: 3, value: 2, color: 'red' },
    { index: 4, value: 2, color: 'black' },
    { index: 5, value: 2, color: 'red' },
    { index: 6, value: 2, color: 'black' },
    { index: 7, value: 2, color: 'red' },
    { index: 8, value: 2, color: 'black' },
    { index: 9, value: 2, color: 'red' },
    { index: 10, value: 2, color: 'black' },
    { index: 11, value: 2, color: 'red' },
    { index: 12, value: 2, color: 'black' },
    { index: 13, value: 2, color: 'red' },
    { index: 14, value: 2, color: 'black' }
];
const mode2 = [
    { index: 0, value: 5, color: 'yellow' },
    { index: 1, value: 5, color: 'green' },
    { index: 2, value: 2, color: 'black' },
    { index: 3, value: 3, color: 'red' },
    { index: 4, value: 2, color: 'black' },
    { index: 5, value: 3, color: 'red' },
    { index: 6, value: 2, color: 'black' },
    { index: 7, value: 3, color: 'red' },
    { index: 8, value: 2, color: 'black' },
    { index: 9, value: 5, color: 'green' },
    { index: 10, value: 2, color: 'black' },
    { index: 11, value: 5, color: 'green' },
    { index: 12, value: 2, color: 'black' },
    { index: 13, value: 3, color: 'red' },
    { index: 14, value: 2, color: 'black' },
    { index: 15, value: 3, color: 'red' },
    { index: 16, value: 2, color: 'black' },
    { index: 17, value: 3, color: 'red' },
    { index: 18, value: 2, color: 'black' },
    { index: 19, value: 5, color: 'green' },
    { index: 20, value: 2, color: 'black' },
    { index: 21, value: 5, color: 'green' },
    { index: 22, value: 2, color: 'black' },
    { index: 23, value: 3, color: 'red' },
    { index: 24, value: 2, color: 'black' },
    { index: 25, value: 3, color: 'red' },
    { index: 26, value: 2, color: 'black' },
    { index: 27, value: 3, color: 'red' },
    { index: 28, value: 2, color: 'black' },
    { index: 29, value: 3, color: 'red' },
    { index: 30, value: 2, color: 'black' },
    { index: 31, value: 3, color: 'red' },
    { index: 32, value: 2, color: 'black' },
    { index: 33, value: 5, color: 'green' },
    { index: 34, value: 2, color: 'black' },
    { index: 35, value: 5, color: 'green' },
    { index: 36, value: 2, color: 'black' },
    { index: 37, value: 3, color: 'red' },
    { index: 38, value: 2, color: 'black' },
    { index: 39, value: 3, color: 'red' },
    { index: 40, value: 2, color: 'black' },
    { index: 41, value: 3, color: 'red' },
    { index: 42, value: 2, color: 'black' },
    { index: 43, value: 5, color: 'green' },
    { index: 44, value: 2, color: 'black' },
    { index: 45, value: 5, color: 'green' },
    { index: 46, value: 2, color: 'black' },
    { index: 47, value: 3, color: 'red' },
    { index: 48, value: 2, color: 'black' },
    { index: 49, value: 3, color: 'red' },
    { index: 50, value: 2, color: 'black' },
    { index: 51, value: 3, color: 'red' },
    { index: 52, value: 2, color: 'black' },
    { index: 53, value: 3, color: 'red' },
    { index: 54, value: 2, color: 'black' },
    { index: 55, value: 5, color: 'green' }
];
const colors1 = {
    black: 2,
    green: 14,
    red: 2
};
const colors2 = {
    black: 2,
    red: 3,
    green: 5,
    yellow: 50
};
const getNumber = ({ amount, color, mode, current = false }) => {
    let numbers = mode ? mode1 : mode2;
    if (current) {
        numbers = numbers.filter((e) => e.color !== color);
    }
    const winner = numbers[Math.floor(Math.random() * numbers.length)];
    if (color === winner.color) {
        const odds = (mode ? colors1 : colors2)[winner.color];
        return Object.assign({ status: 'WIN', odds, profit: amount * odds }, winner);
    }
    else {
        return Object.assign({ status: 'LOST', odds: 0, profit: 0 }, winner);
    }
};
const Wheel = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, currency, amount, color, mode } = req.body;
    const gamelist = yield models_1.GameLists.findOne({ id: req.body.gameId });
    const gameId = gamelist._id;
    const checkedMax = yield (0, base_1.checkMaxBet)({ currency, amount });
    const checked = yield (0, base_1.checkBalance)({ userId, currency, amount });
    if (!checked) {
        res.status(400).json('Balances not enough!');
        return;
    }
    if (!checkedMax) {
        res.status(400).json('Maximum bet exceeded!');
        return;
    }
    yield (0, base_1.handleBet)({
        req,
        currency,
        userId,
        amount: amount * -1,
        type: 'casino-bet(wheel)',
        info: (0, base_1.generatInfo)()
    });
    const { input, output } = yield (0, base_1.getProfit)(currency);
    const odds = (mode ? colors1 : colors2)[color];
    const data = {
        providerId: gamelist.providerId,
        userId,
        currency,
        gameId,
        amount,
        betting: req.body,
        odds
    };
    if (((output + odds * amount) / (input + amount)) * 100 >= gamelist.rtp) {
        const result = getNumber({ amount, color, mode, current: true });
        yield models_1.Games.create(Object.assign({ status: result.status, profit: result.profit, aBetting: result }, data));
        res.json({
            status: result.status,
            index: result.index,
            odds: result.odds,
            profit: result.profit
        });
    }
    else {
        const result = getNumber({ amount, color, mode });
        const games = yield models_1.Games.create(Object.assign({ status: result.status, profit: result.profit, aBetting: result }, data));
        res.json({
            status: result.status,
            index: result.index,
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
                    type: 'casino-bet-settled(wheel)',
                    info: games._id
                });
            }), 3000);
        }
    }
});
exports.Wheel = Wheel;
