"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const validation_1 = require("../../middlewares/validation");
const missions_minigames_1 = require("../../controllers/missions/minigames");

const auth_1 = require("../../middlewares/auth");
const router = (0, express_promise_router_1.default)();

router.get(
  "/get",
  auth_1.AGVerifytoken,
  missions_minigames_1.get
);

router.post(
  "/",
  auth_1.AGVerifytoken,
  missions_minigames_1.create
);

router.put(
  "/:_id",
  auth_1.AGVerifytoken,
  missions_minigames_1.updateOne
);
router.delete(
  "/:_id",
  auth_1.AGVerifytoken,
  missions_minigames_1.deleteOne
);

exports.default = router;