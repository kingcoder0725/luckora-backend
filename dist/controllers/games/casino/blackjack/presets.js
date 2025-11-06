"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultState = exports.getRules = exports.getDefaultSideBets = exports.State = void 0;
const TYPES = require("./constants");
const deck52 = require('52-deck');
class State {
    constructor() {
        this.init = false;
        this.isfunc = false;
        this.dealerHasBusted = false;
        this.dealerHasBlackjack = false;
        this.hits = 0;
        this.initialBet = 0;
        this.finalBet = 0;
        this.finalWin = 0;
        this.wonOnRight = 0;
        this.wonOnLeft = 0;
        this.cardCount = 0;
        this.currency = '';
        this.stage = '';
        this.deck = [];
        this.dealerCards = [];
        this.handInfo = { left: {}, right: {} };
        this.history = [];
        this.availableBets = (0, exports.getDefaultSideBets)(true);
        this.sideBetsInfo = {};
        this.rules = {};
        this.dealerHoleCard = {
            text: '',
            suite: '',
            color: '',
            value: 0
        };
    }
}
exports.State = State;
const getDefaultSideBets = (active) => {
    return {
        luckyLucky: 0,
        perfectPairs: 0,
        royalMatch: active,
        luckyLadies: active,
        inBet: active,
        MatchTheDealer: active
    };
};
exports.getDefaultSideBets = getDefaultSideBets;
const getRules = ({ decks = 1, standOnSoft17 = true, double = 'any', split = true, doubleAfterSplit = true, surrender = true, insurance = true, showdownAfterAceSplit = true }) => {
    return {
        decks: decks || 1,
        standOnSoft17,
        double,
        split,
        doubleAfterSplit,
        surrender,
        insurance,
        showdownAfterAceSplit
    };
};
exports.getRules = getRules;
const defaultState = (rules) => {
    return {
        isfunc: false,
        hits: 0,
        currency: '',
        initialBet: 0,
        finalBet: 0,
        finalWin: 0,
        wonOnRight: 0,
        wonOnLeft: 0,
        stage: TYPES.STAGE_READY,
        deck: deck52.shuffle(deck52.newDecks(rules.decks)),
        handInfo: {
            left: {},
            right: {}
        },
        history: [],
        dealerCards: [],
        availableBets: (0, exports.getDefaultSideBets)(true),
        sideBetsInfo: {},
        rules,
        dealerHoleCard: {
            text: '',
            suite: '',
            color: '',
            value: 0
        },
        dealerHasBlackjack: false,
        dealerHasBusted: false,
        init: false,
        cardCount: 0,
        dealerValue: undefined
    };
};
exports.defaultState = defaultState;
