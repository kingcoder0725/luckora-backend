"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const auth_1 = require("../../middlewares/auth");
const games_1 = require("../../controllers/games");
const express_rate_limit_1 = require("express-rate-limit");
const router = (0, express_promise_router_1.default)();
const Mlimiter = (0, express_rate_limit_1.default)({
    windowMs: 200,
    max: 1,
    standardHeaders: true,
    legacyHeaders: false
});
router.post('/list', auth_1.AGVerifytoken, games_1.list);
router.post('/turn', auth_1.AGVerifytoken, Mlimiter, auth_1.checkUser, games_1.turn);
router.post('/history', auth_1.AGVerifytoken, games_1.history);
exports.default = router;
