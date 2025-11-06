"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const common_1 = require("./common");
const router = (0, express_promise_router_1.default)();
router.use('/common', common_1.default);
exports.default = router;
