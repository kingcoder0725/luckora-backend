"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const validation_1 = require("../../middlewares/validation");
const auth_1 = require("../../middlewares/auth");
const users_missions_tracking_1 = require("../../controllers/missions/users_missions");
const router = (0, express_promise_router_1.default)();

// router.post('/get-test', users_missions_tracking_1.triggerTesting);
router.post('/get-user-rank',auth_1.verifyToken, users_missions_tracking_1.getUserRank);
router.post('/get-users-missions', auth_1.verifyToken, users_missions_tracking_1.getUsersMissions);
router.post('/opt-in', auth_1.verifyToken, users_missions_tracking_1.optInMission);
router.post('/check', auth_1.verifyToken, users_missions_tracking_1.checkMission);
router.post('/claim', auth_1.verifyToken, users_missions_tracking_1.claimMission);
router.post('/:id', auth_1.verifyToken, validation_1.V.params(validation_1.Validator.ObjectId), users_missions_tracking_1.getOneUserMission);
exports.default = router;