"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const missions_1 = require("./missions");
const badges_leveles_1 = require("./badges_leveles");
const points_1 = require("./points");
const shops_1 = require("./shops");
const notifications_1 = require("./notifications");
const mini_games_1 = require("./minigames_common");

const router = (0, express_promise_router_1.default)();

router.use('/missions', missions_1.default);
router.use('/badges_leveles', badges_leveles_1.default);
router.use('/points', points_1.default);
router.use('/shops', shops_1.default);
router.use('/notifications', notifications_1.default);
router.use('/mini-games-common', mini_games_1.default);

exports.default = router;