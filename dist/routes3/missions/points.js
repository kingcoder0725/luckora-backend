"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const validation_1 = require("../../middlewares/validation");
const missions_points_1 = require("../../controllers/missions/points");
const auth_1 = require("../../middlewares/auth");
const router = (0, express_promise_router_1.default)();


router.post(
  "/",
  auth_1.AGVerifytoken,
  validation_1.V.body(validation_1.Validator.Missions.Points.Create),
  missions_points_1.create
);
router.post(
  "/list",
  auth_1.AGVerifytoken,
  validation_1.V.body(validation_1.Validator.Missions.Points.List),
  missions_points_1.list
);
router.put(
  "/:_id",
  auth_1.AGVerifytoken,
  validation_1.V.params(validation_1.Validator.Missions.Points.Get),
  validation_1.V.body(validation_1.Validator.Missions.Points.Update),
  missions_points_1.updateOne
);
router.delete(
  "/:_id",
  auth_1.AGVerifytoken,
  validation_1.V.params(validation_1.Validator.Missions.Points.Delete),
  missions_points_1.deleteOne
);

exports.default = router;