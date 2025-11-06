"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const validation_1 = require("../../middlewares/validation");
const auth_1 = require("../../middlewares/auth");
const sports_1 = require("../../controllers/sports");
const sportsbettings_1 = require("../../controllers/sports/sportsbettings");
const express_rate_limit_1 = require("express-rate-limit");
const router = (0, express_promise_router_1.default)();
const Mlimiter = (0, express_rate_limit_1.default)({
    windowMs: 500,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false
});
router.post('/markets', sports_1.getMarkets);
router.post('/bet-history', validation_1.V.body(validation_1.Validator.Sports.Bet.BetHistory), sports_1.getBetHistory);
router.post('/bet', Mlimiter, validation_1.V.body(validation_1.Validator.Sports.Bet.Bet), auth_1.verifyToken, auth_1.checkUser, sports_1.SportsBet);
router.post('/history', validation_1.V.body(validation_1.Validator.Sports.Bet.History), auth_1.verifyToken, auth_1.checkUser, sports_1.getBettingHistory);
router.post('/cashout', validation_1.V.body(validation_1.Validator.Sports.Bet.CashOut), auth_1.verifyToken, auth_1.checkUser, sports_1.sportsBetCashOut);
router.post('/events', validation_1.V.body(validation_1.Validator.Sports.Betting.Event), sportsbettings_1.getEvents);
exports.default = router;
