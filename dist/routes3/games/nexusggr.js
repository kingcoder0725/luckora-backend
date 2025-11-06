"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const nexusggr_1 = require("../../controllers/games/nexusggr");
const router = (0, express_promise_router_1.default)();
router.get('/provider-list', nexusggr_1.getGameProviders);
router.get('/game-list', nexusggr_1.getGameLists);
exports.default = router;
