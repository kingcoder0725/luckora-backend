"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const validation_1 = require("../../middlewares/validation");
const missions_mini_games_1 = require("../../controllers/missions/minigames");
const auth_1 = require("../../middlewares/auth");
const router = (0, express_promise_router_1.default)();

router.get(
  "/:_id",
  auth_1.AGVerifytoken,
  missions_mini_games_1.getOneWheel_50
);
router.post(
  "/",
  auth_1.AGVerifytoken,
  missions_mini_games_1.createWheel_50
);
router.post(
  "/list",
  auth_1.AGVerifytoken,
  missions_mini_games_1.listWheel_50
);
router.put(
  "/:_id",
  auth_1.AGVerifytoken,
  missions_mini_games_1.updateOneWheel_50
);
router.delete(
  "/:_id",
  auth_1.AGVerifytoken,
  missions_mini_games_1.deleteOneWheel_50
);

exports.default = router;