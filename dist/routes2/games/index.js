"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const express_rate_limit_1 = require("express-rate-limit");
const validation_1 = require("../../middlewares/validation");
const auth_1 = require("../../middlewares/auth");
const games_1 = require("../../controllers/games");
const router = (0, express_promise_router_1.default)();
const Mlimiter = (0, express_rate_limit_1.default)({
    windowMs: 200,
    max: 1,
    standardHeaders: true,
    legacyHeaders: false
});
router.post('/list', games_1.list);
router.post('/provders', games_1.providers);
router.get('/top_games', games_1.getTop);
router.get('/fast_games', games_1.getFast);
router.post('/demo-play', validation_1.V.body(validation_1.Validator.Games.Launch.demo_play), games_1.getDemoUrl);
router.post('/play', validation_1.V.body(validation_1.Validator.Games.Launch.play), auth_1.verifyToken, auth_1.checkUser, games_1.launchGame);
router.post('/game', validation_1.V.body(validation_1.Validator.Games.Launch.game), games_1.getGame);
router.post('/turn', Mlimiter, auth_1.verifyToken, auth_1.checkUser, games_1.turn);
router.post('/myhistory', auth_1.verifyToken, games_1.myhistory);
router.post('/history', games_1.history);
exports.default = router;
