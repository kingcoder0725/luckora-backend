"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const lvslot_1 = require("../../controllers/games/lvslot");
const router = (0, express_promise_router_1.default)();
router.get('/game-list', lvslot_1.getGameLists);
router.post('/callback', lvslot_1.callback);
exports.default = router;
