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
exports.Keno = void 0;
const models_1 = require("../../../models");
const base_1 = require("../../base");
const numbers = {
    1: [0, 1.8],
    2: [0, 1.96, 3.6],
    3: [0, 0, 1.5, 24],
    4: [0, 0, 2.1, 7.8, 88.6],
    5: [0, 0, 1.5, 4, 12, 292],
    6: [0, 0, 0, 1.8, 6, 100, 600],
    7: [0, 0, 0, 1.7, 3.2, 14, 200, 700],
    8: [0, 0, 0, 1.5, 2, 5, 39, 100, 800],
    9: [0, 0, 0, 1.4, 1.6, 2.3, 7, 40, 200, 900],
    10: [0, 0, 0, 1.3, 1.4, 1.5, 2.6, 10, 30, 200, 1000]
};
const numbers40 = Array.from(Array(40).keys());
const getNumber = ({ amount, selected, current = false }) => {
    const picked = [];
    while (picked.length < 10) {
        const rand = (0, base_1.random)(1, 40);
        if (picked.includes(rand))
            continue;
        picked.push(rand);
    }
    let count = 0;
    const match = [];
    const notMatch = [];
    const notnumbers = [];
    for (const i in numbers40) {
        if (!selected.includes(numbers40[i] + 1)) {
            notnumbers.push(numbers40[i] + 1);
        }
    }
    for (const i in picked) {
        if (selected.includes(picked[i])) {
            match.push(picked[i]);
            count++;
        }
        else {
            notMatch.push(picked[i]);
        }
    }
    const odds = numbers[selected.length][count];
    if (current) {
        const length = numbers[selected.length].filter((e) => e === 0).length - 1;
        if (match.length > length) {
            while (notMatch.length < 10) {
                const rand = notnumbers[Math.floor(Math.random() * notnumbers.length)];
                if (notMatch.includes(rand))
                    continue;
                notMatch.push(rand);
            }
            const odds = 0;
            return {
                status: 'LOST',
                odds,
                profit: amount * odds,
                picked: notMatch
            };
        }
        else {
            return { status: 'LOST', odds, profit: amount * odds, picked };
        }
    }
    else {
        if (odds > 1) {
            return { status: 'WIN', odds, profit: amount * odds, picked };
        }
        else {
            return { status: 'LOST', odds, profit: amount * odds, picked };
        }
    }
};
const Keno = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, currency, amount, selected } = req.body;
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
    if (!selected || selected.length < 1) {
        res.status(400).json('Please select keno!');
        return;
    }
    yield (0, base_1.handleBet)({
        req,
        currency,
        userId,
        amount: amount * -1,
        type: 'casino-bet(keno)',
        info: (0, base_1.generatInfo)()
    });
    const toFindDuplicates = (selected) => selected.filter((item, index) => selected.indexOf(item) !== index);
    const duplicate = toFindDuplicates(selected);
    if (duplicate.length > 0) {
        res.status(400).json('Please select keno!');
        return;
    }
    const result = getNumber({ amount, selected });
    const { input, output } = yield (0, base_1.getProfit)(currency);
    const data = {
        providerId: gamelist.providerId,
        userId,
        currency,
        gameId,
        amount,
        betting: req.body,
        odds: result.odds
    };
    if (((output + result.profit) / (input + amount)) * 100 >= gamelist.rtp) {
        const result = getNumber({ amount, selected, current: true });
        yield models_1.Games.create(Object.assign({ status: result.status, profit: result.profit, aBetting: result }, data));
        res.json({
            status: result.status,
            profit: result.profit,
            odds: result.odds,
            picked: result.picked
        });
    }
    else {
        const games = yield models_1.Games.create(Object.assign({ status: result.status, profit: result.profit, aBetting: result }, data));
        res.json({
            status: result.status,
            profit: result.profit,
            odds: result.odds,
            picked: result.picked
        });
        if (result.odds > 0) {
            setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
                yield (0, base_1.handleBet)({
                    req,
                    currency,
                    userId,
                    amount: result.profit,
                    type: 'casino-bet-settled(keno)',
                    info: games._id
                });
            }), 2000);
        }
    }
});
exports.Keno = Keno;
