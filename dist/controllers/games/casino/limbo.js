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
exports.Limbo = exports.getNumber = void 0;
const crypto = require("crypto");
const models_1 = require("../../../models");
const base_1 = require("../../base");
const getNumber = ({ amount, multiplier, current = false }) => {
    if (current) {
        const payout = Number(Number((Math.random() * multiplier).toFixed(2)) - 0.01);
        return { status: 'LOST', odds: 0, profit: 0, payout };
    }
    else {
        const seed = crypto.createHash('sha256').update(`${Date.now()}`).digest('hex');
        const timestamp = Date.now();
        const nonce = (Math.random() * 100000).toFixed(0);
        let hash = crypto
            .createHash('sha256')
            .update(seed + '_' + timestamp + '_' + nonce)
            .digest('hex');
        const nBits = 52;
        hash = hash.slice(0, nBits / 4);
        const r = parseInt(hash, 16);
        let X = r / Math.pow(2, nBits);
        X = 99 / (1 - X);
        const result = Math.floor(X);
        const payout = Number(Math.max(1, result / 100).toFixed(2));
        if (payout >= multiplier) {
            return {
                status: 'WIN',
                odds: multiplier,
                profit: multiplier * amount,
                payout
            };
        }
        else {
            return { status: 'LOST', odds: 0, profit: 0, payout };
        }
    }
};
exports.getNumber = getNumber;
const Limbo = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, currency, amount, multiplier } = req.body;
    const gamelist = yield models_1.GameLists.findOne({ id: req.body.gameId });
    const gameId = gamelist._id;
    const checkedMax = yield (0, base_1.checkMaxBet)({ currency, amount });
    if (!checkedMax) {
        res.status(400).json('Maximum bet exceeded!');
        return;
    }
    if (multiplier <= 1) {
        res.status(400).json('Invalid odds!');
        return;
    }
    
    try {
        yield (0, base_1.handleBet)({
            req,
            currency,
            userId,
            amount: amount * -1,
            type: 'casino-bet(limbo)',
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
    const odds = multiplier;
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
        const result = (0, exports.getNumber)({ amount, multiplier, current: true });
        yield models_1.Games.create(Object.assign({ status: result.status, profit: result.profit, aBetting: result }, data));
        res.json({
            status: result.status,
            profit: result.profit,
            odds: result.odds,
            payout: result.payout
        });
    }
    else {
        const result = (0, exports.getNumber)({ amount, multiplier });
        const games = yield models_1.Games.create(Object.assign({ status: result.status, profit: result.profit, aBetting: result }, data));
        res.json({
            status: result.status,
            profit: result.profit,
            odds: result.odds,
            payout: result.payout
        });
        if (result.odds > 0) {
            setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
                yield (0, base_1.handleBet)({
                    req,
                    currency,
                    userId,
                    amount: result.profit,
                    type: 'casino-bet-settled(limbo)',
                    info: games._id
                });
            }), 3000);
        }
    }
});
exports.Limbo = Limbo;
