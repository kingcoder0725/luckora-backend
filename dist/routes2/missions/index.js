"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const users_missions_tracking_1 = require("./users_missions");
const users_missions_shop_1 = require("./users_shops");
const users_notifications_1 = require("./notifications");
const users_common_minigames_1 = require("./users_common_minigames");
const router = (0, express_promise_router_1.default)();

router.use('/users-missions', users_missions_tracking_1.default);
router.use('/users-shops', users_missions_shop_1.default);
router.use('/users-notifications', users_notifications_1.default);
router.use('/users_common_minigames', users_common_minigames_1.default);

exports.default = router;
