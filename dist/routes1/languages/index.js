"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const validation_1 = require("../../middlewares/validation");
const languages_1 = require("../../controllers/languages");
const router = (0, express_promise_router_1.default)();
router.post('/language', languages_1.getLanguage);
router.post('/word', validation_1.V.body(validation_1.Validator.Languages.Language.ID), languages_1.Word);
exports.default = router;
