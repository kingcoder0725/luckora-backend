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
exports.Coinflip = void 0;
const crypto = require("crypto");
const models_1 = require("../../../models");
const base_1 = require("../../base");
const coinflips = [
    { index: 'front', color: 'yellow' },
    { index: 'back', color: 'blue' }
];
const getNumber = ({ amount, color, current = false }) => {
    if (current) {
        const number = coinflips.find((e) => e.color !== color);
        return Object.assign({ status: 'LOST', odds: 0, profit: 0 }, number);
    }
    else {
        const seed = crypto.createHash('sha256').update(`${Date.now()}`).digest('hex');
        const timestamp = Date.now();
        const nonce = (Math.random() * 100000).toFixed(0);
        let resultHash = crypto
            .createHash('sha256')
            .update(seed + '_' + timestamp + '_' + nonce)
            .digest('hex');
        resultHash = resultHash.substring(0, 10);
        const result = parseInt(resultHash, 16);
        const winner = coinflips[result % 2];
        if (color === winner.color) {
            return Object.assign({ status: 'WIN', odds: 2, profit: amount * 2 }, winner);
        }
        else {
            return Object.assign({ status: 'LOST', odds: 0, profit: 0 }, winner);
        }
    }
};
const Coinflip = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, currency, amount, color } = req.body;
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
        type: 'casino-bet(coinfilp)',
        info: (0, base_1.generatInfo)()
    });
    const { input, output } = yield (0, base_1.getProfit)(currency);
    const odds = 2;
    const data = {
        providerId: gamelist.providerId,
        userId,
        currency,
        gameId,
        amount,
        betting: req.body,
        odds
    };
    if (((output + amount * odds) / (input + amount)) * 100 >= gamelist.rtp) {
        const result = getNumber({ amount, color, current: true });
        yield models_1.Games.create(Object.assign({ status: result.status, profit: result.profit, aBetting: result }, data));
        res.json({
            status: result.status,
            profit: result.profit,
            odds: result.odds,
            index: result.index
        });
    }
    else {
        const result = getNumber({ amount, color });
        const games = yield models_1.Games.create(Object.assign({ status: result.status, profit: result.profit, aBetting: result }, data));
        res.json({
            status: result.status,
            profit: result.profit,
            odds: result.odds,
            index: result.index
        });
        if (result.odds > 0) {
            setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
                yield (0, base_1.handleBet)({
                    req,
                    currency,
                    userId,
                    amount: result.profit,
                    type: 'casino-bet-settled(coinfilp)',
                    info: games._id
                });
            }), 1000);
        }
    }
});
exports.Coinflip = Coinflip;
