"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Language = void 0;
const mongoose_1 = require("mongoose");
const languagesSchema = new mongoose_1.Schema({
    label: {
        type: String
    },
    value: {
        type: String
    }
}, { timestamps: true });
exports.Language = (0, mongoose_1.model)('languages', languagesSchema);
