"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFile = exports.deleteURI = exports.upload = void 0;
const fs = require("fs");
const models_1 = require("../../models");
const config = require('../../../config');
const upload = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.files || req.files.length === 0) {
        res.status(400).json('error');
        return;
    }
    const files = req.files;
    if (files.length > 1) {
        const data = [];
        for (const i in files) {
            const filename = files[i].filename;
            const originalname = files[i].originalname;
            const type = originalname.slice(originalname.lastIndexOf('.')).toLowerCase();
            data.push({ filename, originalname, type, uri: filename });
        }
        const result = yield models_1.Files.insertMany(data);
        res.json(result);
    }
    else {
        const filename = files[0].filename;
        const originalname = files[0].originalname;
        const type = originalname.slice(originalname.lastIndexOf('.')).toLowerCase();
        const data = { filename, originalname, type, uri: filename };
        const result = yield models_1.Files.create(data);
        res.json(result);
    }
});
exports.upload = upload;
const deleteURI = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { uri } = req.body;
    yield (0, exports.deleteFile)(uri, res);
});
exports.deleteURI = deleteURI;
const deleteFile = (uri, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield models_1.Files.findOneAndDelete({ uri });
    const path = `${config.DIR}/upload/${data === null || data === void 0 ? void 0 : data.filename}`;
    try {
        fs.unlinkSync(path);
    }
    catch (err) {
        console.log(err);
    }
    if (res)
        res.json(data);
});
exports.deleteFile = deleteFile;
