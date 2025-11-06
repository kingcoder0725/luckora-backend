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
  missions_mini_games_1.getOneScratch
);
router.post(
  "/",
  auth_1.AGVerifytoken,
  missions_mini_games_1.createScratch
);
router.post(
  "/list",
  auth_1.AGVerifytoken,
  missions_mini_games_1.listScratch
);
router.put(
  "/:_id",
  auth_1.AGVerifytoken,
  missions_mini_games_1.updateScratch
);
router.delete(
  "/:_id",
  auth_1.AGVerifytoken,
  missions_mini_games_1.deleteScratch
);

exports.default = router;