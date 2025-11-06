"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const minigames_1 = require("./minigames");
const wheel_50_1 = require("./wheel_50");
const wheel_100_1 = require("./wheel_100");
const scratch_1 = require("./scracth");

const router = (0, express_promise_router_1.default)();

router.use('/minigames', minigames_1.default);
router.use('/scratch', scratch_1.default);
router.use('/50_wheel', wheel_50_1.default);
router.use('/100_wheel', wheel_100_1.default);

exports.default = router;