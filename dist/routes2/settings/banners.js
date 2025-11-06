"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const banners_1 = require("../../controllers/settings/banners");
const router = (0, express_promise_router_1.default)();
router.post('/get', banners_1.get);
exports.default = router;
