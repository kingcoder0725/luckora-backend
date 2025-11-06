"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const validation_1 = require("../../middlewares/validation");
const missions_badges_leveles_1 = require("../../controllers/missions/badges_leveles");
const auth_1 = require("../../middlewares/auth");
const router = (0, express_promise_router_1.default)();

router.get(
  "/:_id",
  auth_1.AGVerifytoken,
  validation_1.V.params(validation_1.Validator.Missions.Badges_Leveles.Get),
  missions_badges_leveles_1.getOne
);
router.post(
  "/",
  auth_1.AGVerifytoken,
  validation_1.V.body(validation_1.Validator.Missions.Badges_Leveles.Create),
  missions_badges_leveles_1.create
);
router.post(
  "/list",
  auth_1.AGVerifytoken,
  validation_1.V.body(validation_1.Validator.Missions.Badges_Leveles.List),
  missions_badges_leveles_1.list
);
router.put(
  "/:_id",
  auth_1.AGVerifytoken,
  validation_1.V.params(validation_1.Validator.Missions.Badges_Leveles.Get),
  validation_1.V.body(validation_1.Validator.Missions.Badges_Leveles.Update),
  missions_badges_leveles_1.updateOne
);
router.delete(
  "/:_id",
  auth_1.AGVerifytoken,
  validation_1.V.params(validation_1.Validator.Missions.Badges_Leveles.Delete),
  missions_badges_leveles_1.deleteOne
);

exports.default = router;