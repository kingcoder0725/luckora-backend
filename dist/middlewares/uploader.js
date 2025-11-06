"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.limits = exports.fileFilter = exports.storage = void 0;
const path = require("path");
const multer = require("multer");
const config = require('../../config');
exports.storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(`${config.DIR}/upload/`));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}${ext}`);
    }
});
const fileFilter = (req, file, callback) => {
    const ext = path.extname(file.originalname);
    const fileTypes = ['.png', '.jpg', '.gif', '.jpeg', '.jfif', '.webp', '.svg'];
    if (fileTypes.indexOf(ext) === -1) {
        callback(new Error('Only images are allowed'));
        return;
    }
    callback(null, true);
};
exports.fileFilter = fileFilter;
exports.limits = { fileSize: 50 * 1024 * 1024 };
