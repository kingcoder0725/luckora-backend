"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrizes = exports.getPrize = exports.isActionAllowed = exports.getSideBetsInfo = exports.isPerfectPairs = exports.getLuckyLuckyMultiplier = exports.isLuckyLucky = exports.getHandInfoAfterInsurance = exports.getHandInfoAfterSurrender = exports.getHandInfoAfterStand = exports.getHandInfoAfterDouble = exports.getHandInfoAfterHit = exports.getHandInfoAfterSplit = exports.getHandInfoAfterDeal = exports.getHandInfo = exports.countCards = exports.isSuited = exports.isSoftHand = exports.isBlackjack = exports.checkForBusted = exports.getHigherValidValue = exports.calculate = exports.isNullOrUndef = exports.isUndefined = exports.isNull = void 0;
const luchyLuchy_1 = require("./paytables/luchyLuchy");
const TYPES = require("./constants");
const isNull = (obj) => obj === null;
exports.isNull = isNull;
const isUndefined = (obj) => obj === undefined;
exports.isUndefined = isUndefined;
const isNullOrUndef = (obj) => (0, exports.isUndefined)(obj) || (0, exports.isNull)(obj);
exports.isNullOrUndef = isNullOrUndef;
const calculate = (cards) => {
    if (cards.length === 1) {
        if ((0, exports.isNullOrUndef)(cards[0])) {
            return {
                hi: 0,
                lo: 0
            };
        }
        const value = cards[0].value;
        return {
            hi: value === 1 ? 11 : value,
            lo: value === 1 ? 1 : value
        };
    }
    const aces = [];
    const value = cards.reduce((memo, x) => {
        if (x.value === 1) {
            aces.push(1);
            return memo;
        }
        memo += x.value;
        return memo;
    }, 0);
    return aces.reduce((memo) => {
        if (memo.hi + 11 <= 21) {
            memo.hi += 11;
            memo.lo += 1;
        }
        else {
            memo.hi += 1;
            memo.lo += 1;
        }
        if (memo.hi > 21 && memo.lo <= 21) {
            memo.hi = memo.lo;
        }
        return memo;
    }, {
        hi: value,
        lo: value
    });
};
exports.calculate = calculate;
const getHigherValidValue = (handValue) => (handValue.hi <= 21 ? handValue.hi : handValue.lo);
exports.getHigherValidValue = getHigherValidValue;
const checkForBusted = (handValue) => handValue.hi > 21 && handValue.lo === handValue.hi;
exports.checkForBusted = checkForBusted;
const isBlackjack = (cards) => { var _a; return cards.length === 2 && ((_a = (0, exports.calculate)(cards)) === null || _a === void 0 ? void 0 : _a.hi) === 21; };
exports.isBlackjack = isBlackjack;
const isSoftHand = (cards) => {
    return (cards.some((x) => x.value === 1) &&
        cards.reduce((memo, x) => {
            memo += x.value === 1 && memo < 11 ? 11 : x.value;
            return memo;
        }, 0) === 17);
};
exports.isSoftHand = isSoftHand;
const isSuited = (array = []) => {
    if (array.length === 0) {
        return false;
    }
    const suite = array[0].suite;
    return array.every((x) => x.suite === suite);
};
exports.isSuited = isSuited;
const countCards = (array) => {
    const systems = {
        'Hi-Lo': [-1, 1, 1, 1, 1, 1, 0, 0, 0, -1, -1, -1, -1]
    };
    const data = array.reduce((memo, x) => {
        memo += systems['Hi-Lo'][x.value - 1];
        return memo;
    }, 0);
    return data;
};
exports.countCards = countCards;
const getHandInfo = (playerCards, dealerCards, hasSplit = false) => {
    const handValue = (0, exports.calculate)(playerCards);
    const hasBlackjack = (0, exports.isBlackjack)(playerCards) && hasSplit === false;
    const hasBusted = (0, exports.checkForBusted)(handValue);
    const isClosed = hasBusted || hasBlackjack || handValue.hi === 21;
    const canDoubleDown = !isClosed && true;
    const canSplit = playerCards.length > 1 && playerCards[0].value === playerCards[1].value && !isClosed;
    const canInsure = dealerCards[0].value === 1 && !isClosed;
    return {
        cards: playerCards,
        playerValue: handValue,
        playerHasBlackjack: hasBlackjack,
        playerHasBusted: hasBusted,
        playerHasSurrendered: false,
        close: isClosed,
        availableActions: {
            double: canDoubleDown,
            split: canSplit,
            insurance: canInsure,
            hit: !isClosed,
            stand: !isClosed,
            surrender: !isClosed
        }
    };
};
exports.getHandInfo = getHandInfo;
const getHandInfoAfterDeal = (playerCards, dealerCards, initialBet) => {
    const hand = (0, exports.getHandInfo)(playerCards, dealerCards);
    hand.bet = initialBet;
    // After deal, even if we got a blackjack the hand cannot be considered closed.
    const availableActions = hand.availableActions;
    hand.availableActions = Object.assign(Object.assign({}, availableActions), { stand: true, hit: true, surrender: true });
    return Object.assign(Object.assign({}, hand), { close: hand.playerHasBlackjack });
};
exports.getHandInfoAfterDeal = getHandInfoAfterDeal;
const getHandInfoAfterSplit = (playerCards, dealerCards, initialBet) => {
    const hand = (0, exports.getHandInfo)(playerCards, dealerCards, true);
    const availableActions = hand.availableActions;
    hand.availableActions = Object.assign(Object.assign({}, availableActions), { split: false, double: !hand.close && playerCards.length === 2, insurance: false, surrender: false });
    hand.bet = initialBet;
    return hand;
};
exports.getHandInfoAfterSplit = getHandInfoAfterSplit;
const getHandInfoAfterHit = (playerCards, dealerCards, initialBet, hasSplit) => {
    const hand = (0, exports.getHandInfo)(playerCards, dealerCards, hasSplit);
    const availableActions = hand.availableActions;
    hand.availableActions = Object.assign(Object.assign({}, availableActions), { double: playerCards.length === 2, split: false, insurance: false, surrender: false });
    hand.bet = initialBet;
    return hand;
};
exports.getHandInfoAfterHit = getHandInfoAfterHit;
const getHandInfoAfterDouble = (playerCards, dealerCards, initialBet, hasSplit) => {
    const hand = (0, exports.getHandInfoAfterHit)(playerCards, dealerCards, initialBet, hasSplit);
    const availableActions = hand.availableActions;
    hand.availableActions = Object.assign(Object.assign({}, availableActions), { hit: false, stand: false });
    hand.bet = initialBet * 2;
    return Object.assign(Object.assign({}, hand), { close: true });
};
exports.getHandInfoAfterDouble = getHandInfoAfterDouble;
const getHandInfoAfterStand = (handInfo) => {
    return Object.assign(Object.assign({}, handInfo), { close: true, availableActions: {
            double: false,
            split: false,
            insurance: false,
            hit: false,
            stand: false,
            surrender: false
        } });
};
exports.getHandInfoAfterStand = getHandInfoAfterStand;
const getHandInfoAfterSurrender = (handInfo) => {
    const hand = (0, exports.getHandInfoAfterStand)(handInfo);
    return Object.assign(Object.assign({}, hand), { playerHasSurrendered: true, close: true });
};
exports.getHandInfoAfterSurrender = getHandInfoAfterSurrender;
const getHandInfoAfterInsurance = (playerCards, dealerCards) => {
    const hand = (0, exports.getHandInfo)(playerCards, dealerCards);
    const availableActions = hand.availableActions;
    hand.availableActions = Object.assign(Object.assign({}, availableActions), { stand: true, hit: true, surrender: true, insurance: false });
    return Object.assign(Object.assign({}, hand), { close: hand.playerHasBlackjack });
};
exports.getHandInfoAfterInsurance = getHandInfoAfterInsurance;
const isLuckyLucky = (playerCards, dealerCards) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    // Player hand and dealer's up card sum to 19, 20, or 21 ("Lucky Lucky")
    const v1 = ((_a = (0, exports.calculate)(playerCards)) === null || _a === void 0 ? void 0 : _a.hi) + ((_b = (0, exports.calculate)(dealerCards)) === null || _b === void 0 ? void 0 : _b.hi);
    const v2 = ((_c = (0, exports.calculate)(playerCards)) === null || _c === void 0 ? void 0 : _c.lo) + ((_d = (0, exports.calculate)(dealerCards)) === null || _d === void 0 ? void 0 : _d.lo);
    const v3 = ((_e = (0, exports.calculate)(playerCards)) === null || _e === void 0 ? void 0 : _e.hi) + ((_f = (0, exports.calculate)(dealerCards)) === null || _f === void 0 ? void 0 : _f.lo);
    const v4 = ((_g = (0, exports.calculate)(playerCards)) === null || _g === void 0 ? void 0 : _g.lo) + ((_h = (0, exports.calculate)(dealerCards)) === null || _h === void 0 ? void 0 : _h.hi);
    return (v1 >= 19 && v1 <= 21) || (v2 >= 19 && v2 <= 21) || (v3 >= 19 && v3 <= 21) || (v4 >= 19 && v4 <= 21);
};
exports.isLuckyLucky = isLuckyLucky;
const getLuckyLuckyMultiplier = (playerCards, dealerCards) => {
    const cards = [...playerCards, ...dealerCards];
    const isSameSuite = (0, exports.isSuited)(cards);
    const flatCards = cards.map((x) => x.value).join('');
    const value = (0, exports.calculate)(cards);
    return (0, luchyLuchy_1.default)(flatCards, isSameSuite, value);
};
exports.getLuckyLuckyMultiplier = getLuckyLuckyMultiplier;
const isPerfectPairs = (playerCards) => playerCards[0].value === playerCards[1].value;
exports.isPerfectPairs = isPerfectPairs;
const getSideBetsInfo = (availableBets, sideBets, playerCards, dealerCards) => {
    const sideBetsInfo = {
        luckyLucky: 0,
        perfectPairs: 0
    };
    if (availableBets.luckyLucky && sideBets && sideBets.luckyLucky && (0, exports.isLuckyLucky)(playerCards, dealerCards)) {
        const multiplier = (0, exports.getLuckyLuckyMultiplier)(playerCards, dealerCards);
        sideBetsInfo.luckyLucky = sideBets.luckyLucky * multiplier;
    }
    if (availableBets.perfectPairs && sideBets && sideBets.perfectPairs && (0, exports.isPerfectPairs)(playerCards)) {
        // TODO: impl colored pairs
        // TODO: impl mixed pairs
        sideBetsInfo.perfectPairs = sideBets.perfectPairs * 5;
    }
    return sideBetsInfo;
};
exports.getSideBetsInfo = getSideBetsInfo;
const isActionAllowed = (actionName, stage) => {
    if (actionName === TYPES.RESTORE) {
        return true;
    }
    switch (stage) {
        case TYPES.STAGE_READY: {
            return [TYPES.RESTORE, TYPES.DEAL].indexOf(actionName) > -1;
        }
        case TYPES.STAGE_PLAYER_TURN_RIGHT: {
            return [TYPES.STAND, TYPES.INSURANCE, TYPES.SURRENDER, TYPES.SPLIT, TYPES.HIT, TYPES.DOUBLE].indexOf(actionName) > -1;
        }
        case TYPES.STAGE_PLAYER_TURN_LEFT: {
            return [TYPES.STAND, TYPES.HIT, TYPES.DOUBLE].indexOf(actionName) > -1;
        }
        case TYPES.SHOWDOWN: {
            return [TYPES.SHOWDOWN, TYPES.STAND].indexOf(actionName) > -1;
        }
        case TYPES.STAGE_DEALER_TURN: {
            return [TYPES.DEALER_HIT].indexOf(actionName) > -1;
        }
        default: {
            return false;
        }
    }
};
exports.isActionAllowed = isActionAllowed;
const getPrize = (playerHand, dealerCards) => {
    const { close = false, playerHasSurrendered = true, playerHasBlackjack = false, playerHasBusted = true, playerValue = { lo: 0, hi: 0 }, bet = 0 } = playerHand;
    const higherValidDealerValue = (0, exports.getHigherValidValue)((0, exports.calculate)(dealerCards));
    const dealerHasBlackjack = (0, exports.isBlackjack)(dealerCards);
    if (!close) {
        return 0;
    }
    if (playerHasBusted) {
        return 0;
    }
    if (playerHasSurrendered) {
        return bet / 2;
    }
    if (playerHasBlackjack && !dealerHasBlackjack) {
        return bet + bet * 1.5;
    }
    const dealerHasBusted = higherValidDealerValue > 21;
    if (dealerHasBusted) {
        return bet + bet;
    }
    const higherValidPlayerValue = (0, exports.getHigherValidValue)(playerValue);
    if (higherValidPlayerValue > higherValidDealerValue) {
        return bet + bet;
    }
    else if (higherValidPlayerValue === higherValidDealerValue) {
        return bet;
    }
    return 0;
};
exports.getPrize = getPrize;
const getPrizes = ({ history, handInfo: { left, right }, dealerCards }) => {
    const finalBet = history.reduce((memo, x) => {
        memo += x.value;
        return memo;
    }, 0);
    const wonOnRight = (0, exports.getPrize)(right, dealerCards);
    const wonOnLeft = (0, exports.getPrize)(left, dealerCards);
    return {
        finalBet: finalBet,
        wonOnRight: wonOnRight,
        wonOnLeft: wonOnLeft
    };
};
exports.getPrizes = getPrizes;
