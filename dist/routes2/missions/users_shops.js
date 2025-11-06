"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const validation_1 = require("../../middlewares/validation");
const auth_1 = require("../../middlewares/auth");
const users_missions_shop_1 = require("../../controllers/missions/users_shop");
const router = (0, express_promise_router_1.default)();

router.post('/get-test', users_missions_shop_1.triggerTesting);
router.post('/get-purchases', auth_1.verifyToken, users_missions_shop_1.getPurchases);
router.post('/get-purchases-free-bets', auth_1.verifyToken, users_missions_shop_1.get_free_bets_vouchers);
router.post('/get-games-by-purchase', auth_1.verifyToken, users_missions_shop_1.getGamesByPurchaseId);
router.post('/activate', auth_1.verifyToken, users_missions_shop_1.activatePurchase);

router.post('/get-user-items',auth_1.verifyToken, users_missions_shop_1.getUsersItems);
router.post('/buy', auth_1.verifyToken, users_missions_shop_1.buyItem);
router.post('/:id', auth_1.verifyToken, validation_1.V.params(validation_1.Validator.ObjectId), users_missions_shop_1.getOneUserItem);

exports.default = router;