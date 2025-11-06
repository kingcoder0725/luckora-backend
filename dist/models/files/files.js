"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Files = void 0;
const mongoose_1 = require("mongoose");
const filesSchema = new mongoose_1.Schema({
    filename: {
        type: String
    },
    originalname: {
        type: String
    },
    uri: {
        type: String
    },
    type: {
        type: String
    }
}, { timestamps: true });
exports.Files = (0, mongoose_1.model)('files', filesSchema);
