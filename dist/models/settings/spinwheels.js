"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spinwheels = void 0;
const mongoose_1 = require("mongoose");
const SpinwheelsSchema = new mongoose_1.Schema({
    amount: {
        type: Number
    },
}, { timestamps: true });
exports.Spinwheels = (0, mongoose_1.model)('spinwheels', SpinwheelsSchema);
