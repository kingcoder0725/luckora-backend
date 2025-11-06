"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const multer = require("multer");
const express_rate_limit_1 = require("express-rate-limit");
const express_promise_router_1 = require("express-promise-router");
const validation_1 = require("../../middlewares/validation");
const files_1 = require("../../controllers/files");
const uploader_1 = require("../../middlewares/uploader");
const router = (0, express_promise_router_1.default)();
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false
});
router.post('/', limiter, multer({ storage: uploader_1.storage, fileFilter: uploader_1.fileFilter, limits: uploader_1.limits }).any(), files_1.upload);
router.post('/delete', limiter, validation_1.V.body(validation_1.Validator.Files.DeleteURI), files_1.deleteURI);
exports.default = router;
