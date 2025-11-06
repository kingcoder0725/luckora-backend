"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const socials_1 = require("../../controllers/settings/socials");
const router = (0, express_promise_router_1.default)();
router.get('/socials', socials_1.getSocials);
exports.default = router;
