"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Access = void 0;
const mongoose_1 = require("mongoose");
const AccessSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    agents: {
        type: Array,
    },
    status: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });
exports.Access = (0, mongoose_1.model)('accesses', AccessSchema);
