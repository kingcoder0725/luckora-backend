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
exports.Blackjack = void 0;
const game_1 = require("./game");
const actions = require("./actions");
const models_1 = require("../../../../models");
const base_1 = require("../../../base");
const presets_1 = require("./presets");
const getScore = (cards) => {
    const score = cards.reduce((sum, card) => {
        if (((card === null || card === void 0 ? void 0 : card.value) || 0) === 1) {
            return (sum += 11);
        }
        else {
            return (sum += (card === null || card === void 0 ? void 0 : card.value) || 0);
        }
    }, 0);
    if (score > 21 && cards.find((e) => e.value === 1)) {
        return cards.reduce((sum, card) => (sum += (card === null || card === void 0 ? void 0 : card.value) || 0), 0);
    }
    else {
        return score;
    }
};
const getCard = (card) => {
    return actions.deck.find((e) => e.type === card.suite && e.value === card.text);
};
const settled = ({ req, _id, game, games, split = false }) => __awaiter(void 0, void 0, void 0, function* () {
    const { history, dealerCards, wonOnRight, wonOnLeft } = game.getState();
    const score = getScore([dealerCards[0], dealerCards[1]]);
    let status = 'LOST';
    let playerStatus = 'LOST';
    let splitStatus = 'LOST';
    if (wonOnRight === games.amount / 2) {
        playerStatus = 'DRAW';
    }
    else if (wonOnRight > games.amount / 2) {
        playerStatus = 'WIN';
    }
    if (wonOnLeft === games.amount / 2) {
        splitStatus = 'DRAW';
    }
    else if (wonOnLeft > games.amount / 2) {
        splitStatus = 'WIN';
    }
    let profit = wonOnRight + wonOnLeft;
    if (profit === games.amount) {
        status = 'DRAW';
    }
    else if (profit > 0) {
        status = 'WIN';
    }
    if (history.find((e) => e.type === 'INSURANCE' && Number(e.payload.bet) > 0)) {
        if (score === 21) {
            status = 'WIN';
            profit = games.amount;
        }
        else {
            status = 'LOST';
            profit = games.amount;
        }
    }
    const dealerDraw = [];
    const dealerCard = dealerCards.slice(2, dealerCards.length);
    for (const i in dealerCard) {
        const card = getCard(dealerCard[i]);
        if (card)
            dealerDraw.push(card);
    }
    const check = yield models_1.Games.findById(_id);
    const result = yield models_1.Games.findByIdAndUpdate(_id, {
        profit,
        status,
        aBetting: game.getState(),
        $inc: { 'betting.turn': 1 }
    }, { new: true });
    if (profit && check.status === 'BET')
        yield (0, base_1.handleBet)({
            req,
            currency: games.currency,
            userId: games.userId,
            amount: profit,
            type: 'casino-bet-settled(blackjack)',
            info: result._id
        });
    if (split) {
        return {
            type: 'finish',
            turn: result.betting.turn,
            player: {
                status: playerStatus,
                odds: wonOnRight ? (wonOnRight / result.amount) * 2 : 0,
                profit: wonOnRight
            },
            split: {
                status: splitStatus,
                odds: wonOnLeft ? (wonOnLeft / result.amount) * 2 : 0,
                profit: wonOnLeft
            },
            betting: {
                dealerReveal: getCard(dealerCards[1]),
                dealerDraw
            }
        };
    }
    else {
        return {
            type: 'finish',
            turn: result.betting.turn,
            odds: profit ? profit / result.amount : 0,
            profit,
            split,
            status,
            betting: {
                dealerReveal: getCard(dealerCards[1]),
                dealerDraw
            }
        };
    }
});
const Blackjack = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    switch (req.body.type) {
        case 'info': {
            const { userId, currency, amount } = req.body;
            const gamelist = yield models_1.GameLists.findOne({ id: req.body.gameId });
            const gameId = gamelist._id;
            const providerId = gamelist.providerId;
            const exist = yield models_1.Games.findOne({
                userId,
                currency,
                gameId,
                status: 'BET'
            });
            if (exist) {
                res.json(exist);
                return;
            }
            const checked = yield (0, base_1.checkBalance)({ userId, currency, amount });
            const checkedMax = yield (0, base_1.checkMaxBet)({ currency, amount });
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
                type: 'casino-bet(blackjack)',
                info: (0, base_1.generatInfo)()
            });
            const game = new game_1.default(Object.assign((0, presets_1.defaultState)((0, presets_1.getRules)({})), { currency, init: true }));
            yield game.dispatch(actions.deal({ bet: Number(amount) }));
            const gameData = {
                providerId,
                userId,
                currency,
                gameId,
                amount,
                odds: 2,
                aBetting: game.getState(),
                betting: { player: [], dealer: {}, turn: 0 }
            };
            const games = yield models_1.Games.findOneAndUpdate({ userId, currency, gameId, status: 'BET' }, gameData, { upsert: true, new: true });
            const { handInfo, dealerCards } = game.getState();
            const betting = {
                player: [getCard(handInfo.right.cards[0]), getCard(handInfo.right.cards[1])],
                dealer: getCard(dealerCards[0]),
                turn: 1
            };
            const result = yield models_1.Games.findByIdAndUpdate(games._id, { betting }, { new: true });
            res.json(result);
            return;
        }
        case 'split': {
            const { userId, betId } = req.body;
            const _id = (0, base_1.ObjectId)(betId);
            const games = yield models_1.Games.findById(_id);
            const checked = yield (0, base_1.checkBalance)({
                userId,
                currency: games.currency,
                amount: games.amount
            });
            if (!checked) {
                res.status(400).json('Balances not enough!');
                return;
            }
            const game = new game_1.default(games.aBetting);
            if (game.getState().stage === 'done') {
                const result = yield settled({ req, _id, game, games });
                res.json(result);
                return;
            }
            yield game.dispatch(actions.split());
            const { handInfo, dealerCards } = game.getState();
            yield (0, base_1.handleBet)({
                req,
                currency: games.currency,
                userId,
                amount: games.amount * -1,
                type: 'casino-bet-split(blackjack)',
                info: (0, base_1.generatInfo)()
            });
            const result = yield models_1.Games.findByIdAndUpdate(_id, {
                amount: games.amount * 2,
                aBetting: game.getState(),
                $inc: { 'betting.turn': 1 }
            }, { new: true });
            res.json({
                type: 'continue',
                turn: result.betting.turn,
                betting: {
                    player: [getCard(handInfo.right.cards[0]), getCard(handInfo.right.cards[1])],
                    split: [getCard(handInfo.left.cards[0]), getCard(handInfo.left.cards[1])],
                    dealer: [getCard(dealerCards[0])]
                }
            });
            return;
        }
        case 'double': {
            const { userId, betId } = req.body;
            const _id = (0, base_1.ObjectId)(betId);
            const games = yield models_1.Games.findById(_id);
            const checked = yield (0, base_1.checkBalance)({
                userId,
                currency: games.currency,
                amount: games.amount
            });
            if (!checked) {
                res.status(400).json('Balances not enough!');
                return;
            }
            const game = new game_1.default(games.aBetting);
            if (game.getState().stage === 'done') {
                const result = yield settled({ req, _id, game, games });
                res.json(result);
                return;
            }
            yield game.dispatch(actions.double({ position: 'right' }));
            yield (0, base_1.handleBet)({
                req,
                currency: games.currency,
                userId,
                amount: games.amount * -1,
                type: 'casino-bet-double(blackjack)',
                info: (0, base_1.generatInfo)()
            });
            const result = yield models_1.Games.findByIdAndUpdate(_id, {
                amount: games.amount * 2,
                aBetting: game.getState(),
                $inc: { 'betting.turn': 1 }
            }, { new: true });
            const cards = game.getState().handInfo.right.cards;
            const card = getCard(cards[cards.length - 1]);
            res.json({
                type: 'continue',
                turn: result.betting.turn,
                betting: {
                    player: card
                }
            });
            return;
        }
        case 'insurance': {
            const { userId, betId, bet } = req.body;
            const _id = (0, base_1.ObjectId)(betId);
            const games = yield models_1.Games.findById(_id);
            const checked = yield (0, base_1.checkBalance)({
                userId,
                currency: games.currency,
                amount: games.amount * 0.5
            });
            if (!checked) {
                res.status(400).json('Balances not enough!');
                return;
            }
            const game = new game_1.default(games.aBetting);
            if (bet) {
                yield game.dispatch(actions.insurance({ bet: 1 }));
                yield (0, base_1.handleBet)({
                    req,
                    currency: games.currency,
                    userId,
                    amount: games.amount * -0.5,
                    type: 'casino-bet-insurance(blackjack)',
                    info: (0, base_1.generatInfo)()
                });
                yield models_1.Games.updateOne({ _id }, {
                    amount: games.amount * 1.5,
                    aBetting: game.getState(),
                    $inc: { 'betting.turn': 1 }
                });
            }
            else {
                yield game.dispatch(actions.insurance({ bet: 0 }));
                yield models_1.Games.updateOne({ _id }, { aBetting: game.getState(), $inc: { 'betting.turn': 1 } });
            }
            res.json(games);
            return;
        }
        case 'hit': {
            const _id = (0, base_1.ObjectId)(req.body.betId);
            const games = yield models_1.Games.findById(_id);
            const game = new game_1.default(games.aBetting);
            const stage = game.getState().stage;
            if (stage === 'player-turn-right') {
                yield game.dispatch(actions.hit({ position: 'right' }));
                yield models_1.Games.updateOne({ _id }, { aBetting: game.getState(), $inc: { 'betting.turn': 1 } });
                const cards = game.getState().handInfo.right.cards;
                const card = getCard(cards[cards.length - 1]);
                const result = {
                    type: 'continue',
                    turn: games.betting.turn,
                    betting: {
                        player: card
                    }
                };
                res.json(result);
                return;
            }
            else if (stage === 'player-turn-left') {
                yield game.dispatch(actions.hit({ position: 'left' }));
                yield models_1.Games.updateOne({ _id }, { aBetting: game.getState(), $inc: { 'betting.turn': 1 } });
                const cards = game.getState().handInfo.left.cards;
                const result = {
                    type: 'continue',
                    turn: games.betting.turn,
                    betting: {
                        player: getCard(cards[cards.length - 1])
                    }
                };
                res.json(result);
                return;
            }
            else if (stage === 'done') {
                const result = yield settled({ req, _id, game, games });
                res.json(result);
                return;
            }
            break;
        }
        case 'stand': {
            const _id = (0, base_1.ObjectId)(req.body.betId);
            const games = yield models_1.Games.findById(_id);
            const game = new game_1.default(games.aBetting);
            const { stage, history } = game.getState();
            if (history.find((e) => e.type === 'SPLIT')) {
                if (stage === 'player-turn-right') {
                    yield game.dispatch(actions.stand({ position: 'right' }));
                    const result = yield models_1.Games.findByIdAndUpdate(_id, {
                        aBetting: game.getState(),
                        $inc: { 'betting.turn': 1 }
                    }, { new: true });
                    res.json({
                        type: 'continue',
                        turn: result.betting.turn
                    });
                    return;
                }
                else if (stage === 'player-turn-left' || stage === 'done') {
                    const cards = game.getState().handInfo.left.cards;
                    const score = getScore(cards);
                    if (req.body.auto && score < 21) {
                        const result = yield models_1.Games.findByIdAndUpdate(_id, {
                            aBetting: game.getState(),
                            $inc: { 'betting.turn': 1 }
                        }, { new: true });
                        res.json({ type: 'continue', turn: result.betting.turn });
                        return;
                    }
                    else {
                        if (stage === 'player-turn-left') {
                            yield game.dispatch(actions.stand({ position: 'left' }));
                        }
                        const result = yield settled({
                            req,
                            _id,
                            game,
                            games,
                            split: true
                        });
                        res.json(result);
                        return;
                    }
                }
            }
            else {
                if (stage === 'player-turn-right') {
                    yield game.dispatch(actions.stand({ position: 'right' }));
                }
                const result = yield settled({ req, _id, game, games });
                res.json(result);
                return;
            }
            break;
        }
    }
});
exports.Blackjack = Blackjack;
