"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");

const users_scratch_1 = require("./users_scratch");
const users_wheel_50_1 = require("./users_wheel_50");
const users_wheel_100_1 = require("./users_wheel_100");

const router = (0, express_promise_router_1.default)();
router.use('/users_scratch', users_scratch_1.default);
router.use('/users_wheel_50', users_wheel_50_1.default);
router.use('/users_wheel_100', users_wheel_100_1.default);

exports.default = router;
