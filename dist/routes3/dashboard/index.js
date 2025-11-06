"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const validation_1 = require("../../middlewares/validation");
const dashboard_1 = require("../../controllers/dashboard");
const auth_1 = require("../../middlewares/auth");
const router = (0, express_promise_router_1.default)();

router.post('/get_total_deposits', auth_1.AGVerifytoken, dashboard_1.getDeposits); 
router.post('/users-by-country', auth_1.AGVerifytoken, dashboard_1.get_users_by_country); 
router.post('/financial-activity', auth_1.AGVerifytoken, dashboard_1.get_financial_activity); 
router.post('/gaming-activity', auth_1.AGVerifytoken, dashboard_1.get_gaming_activity); 
router.post('/bonus-activity', auth_1.AGVerifytoken, dashboard_1.get_bonus_activity); 
exports.default = router;