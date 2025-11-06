"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const trustswiftly_1 = require("../../utils/trustswiftly");
const router = (0, express_promise_router_1.default)();
router.post('/trust-webhook', trustswiftly_1.callback);
exports.default = router;
