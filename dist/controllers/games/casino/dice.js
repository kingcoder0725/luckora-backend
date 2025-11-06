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
exports.Dice = void 0;
const crypto = require("crypto");
const models_1 = require("../../../models");
const base_1 = require("../../base");
const getNumber = ({ amount, multiplier, target, mode, current = false }) => {
    if (current) {
        if (mode) {
            const roll = Math.floor(Math.random() * target) - 1;
            return { status: 'LOST', odds: 0, profit: 0, roll };
        }
        else {
            const roll = Math.floor(Math.random() * (10000 - target + 1)) + target;
            return { status: 'LOST', odds: 0, profit: 0, roll };
        }
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
        let result = parseInt(resultHash, 16);
        result = result % 10001;
        if (mode) {
            if (result > target) {
                return {
                    status: 'WIN',
                    odds: multiplier,
                    profit: amount * multiplier,
                    roll: result
                };
            }
            else {
                return { status: 'LOST', odds: 0, profit: 0, roll: result };
            }
        }
        else {
            if (result < target) {
                return {
                    status: 'WIN',
                    odds: multiplier,
                    profit: amount * multiplier,
                    roll: result
                };
            }
            else {
                return { status: 'LOST', odds: 0, profit: 0, roll: result };
            }
        }
    }
};
const Dice = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, currency, amount, multiplier, target, mode } = req.body;
    const gamelist = yield models_1.GameLists.findOne({ id: req.body.gameId });
    const gameId = gamelist._id;
    const checkedMax = yield (0, base_1.checkMaxBet)({ currency, amount });
    if (!checkedMax) {
        res.status(400).json('Maximum bet exceeded!');
        return;
    }
    if (multiplier <= 1 || multiplier > 2000) {
        res.status(400).json('Invalid odds!');
        return;
    }
    
    try {
        yield (0, base_1.handleBet)({
            req,
            currency,
            userId,
            amount: amount * -1,
            type: 'casino-bet(dice)',
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
        const result = getNumber({
            amount,
            multiplier,
            target,
            mode,
            current: true
        });
        yield models_1.Games.create(Object.assign({ status: result.status, profit: result.profit, aBetting: result }, data));
        res.json({
            status: result.status,
            profit: result.profit,
            odds: result.odds,
            roll: result.roll
        });
    }
    else {
        const result = getNumber({ amount, multiplier, target, mode });
        const games = yield models_1.Games.create(Object.assign({ status: result.status, profit: result.profit, aBetting: result }, data));
        res.json({
            status: result.status,
            profit: result.profit,
            odds: result.odds,
            roll: result.roll
        });
        if (result.odds > 0) {
            setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
                yield (0, base_1.handleBet)({
                    req,
                    currency,
                    userId,
                    amount: result.profit,
                    type: 'casino-bet-settled(dice)',
                    info: games._id
                });
            }), 3000);
        }
    }
});
exports.Dice = Dice;
