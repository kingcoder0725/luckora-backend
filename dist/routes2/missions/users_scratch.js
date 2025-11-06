"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const auth_1 = require("../../middlewares/auth");
const users_scratch_1 = require("../../controllers/missions/users_scratch");
const router = (0, express_promise_router_1.default)();

router.post('/get', auth_1.verifyToken, users_scratch_1.get);
router.post('/check', auth_1.verifyToken, users_scratch_1.check);
router.post('/check_win', auth_1.verifyToken, users_scratch_1.checkWin);

exports.default = router;