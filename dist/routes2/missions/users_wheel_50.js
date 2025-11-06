"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const validation_1 = require("../../middlewares/validation");
const auth_1 = require("../../middlewares/auth");
const users_wheel_50_1 = require("../../controllers/missions/users_wheel_50");

const router = (0, express_promise_router_1.default)();

router.post('/get', auth_1.verifyToken, users_wheel_50_1.get);
router.post('/play', auth_1.verifyToken, users_wheel_50_1.play);
router.post('/get-games-by-wheel', auth_1.verifyToken, users_wheel_50_1.get_games_by_wheel_history_id);
router.post('/get-history', auth_1.verifyToken, users_wheel_50_1.get_histories_wheel);
router.post('/activate-bonus', auth_1.verifyToken, users_wheel_50_1.activate_bonus_wheel);

exports.default = router;