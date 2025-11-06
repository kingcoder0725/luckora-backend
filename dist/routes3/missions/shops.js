"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const validation_1 = require("../../middlewares/validation");
const missions_shops_1 = require("../../controllers/missions/shops");
const auth_1 = require("../../middlewares/auth");
const router = (0, express_promise_router_1.default)();

router.get(
  "/:_id",
  auth_1.AGVerifytoken,
  validation_1.V.params(validation_1.Validator.Missions.Shops.Get),
  missions_shops_1.getOne
);
router.post(
  "/",
  auth_1.AGVerifytoken,
  validation_1.V.body(validation_1.Validator.Missions.Shops.Create),
  missions_shops_1.create
);
router.post(
  "/list",
  auth_1.AGVerifytoken,
  validation_1.V.body(validation_1.Validator.Missions.Shops.List),
  missions_shops_1.list
);
router.post(
  "/label",
  auth_1.AGVerifytoken,
  validation_1.V.body(validation_1.Validator.Missions.Shops.Label),
  missions_shops_1.label
);
router.put(
  "/:_id",
  auth_1.AGVerifytoken,
  validation_1.V.params(validation_1.Validator.Missions.Shops.Get),
  validation_1.V.body(validation_1.Validator.Missions.Shops.Update),
  missions_shops_1.updateOne
);
router.delete(
  "/:_id",
  auth_1.AGVerifytoken,
  validation_1.V.params(validation_1.Validator.Missions.Shops.Delete),
  missions_shops_1.deleteOne
);

exports.default = router;