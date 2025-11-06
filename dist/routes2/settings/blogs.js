"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const blog_1 = require("../../controllers/settings/blog");
const router = (0, express_promise_router_1.default)();
router.post('/get', blog_1.get);
exports.default = router;
