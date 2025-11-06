"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const auth_1 = require("../../middlewares/auth");
const validation_1 = require("../../middlewares/validation");
const notification_1 = require("../../controllers/missions/notifications");

const router = (0, express_promise_router_1.default)();

router.post('/get', auth_1.verifyToken, notification_1.get);
router.post('/read', validation_1.V.body(validation_1.Validator.Missions.Notification.Read), auth_1.verifyToken, notification_1.read);
exports.default = router;
