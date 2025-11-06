"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const auth_1 = require("../../middlewares/auth");
const spinwheel_1 = require("../../controllers/settings/spinwheel");
const router = (0, express_promise_router_1.default)();
router.post('/get', spinwheel_1.get);
router.post('/play', auth_1.verifyToken, spinwheel_1.play);
exports.default = router;
