"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const validation_1 = require("../../middlewares/validation");
const auth_1 = require("../../middlewares/auth");
const users_wheel_100_1 = require("../../controllers/missions/users_wheel_100");

const router = (0, express_promise_router_1.default)();

router.post('/get', auth_1.verifyToken, users_wheel_100_1.get);
router.post('/play', auth_1.verifyToken, users_wheel_100_1.play);

exports.default = router;