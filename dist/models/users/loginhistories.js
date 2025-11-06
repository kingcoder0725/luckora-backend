"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginHistories = void 0;
const mongoose_1 = require("mongoose");
const LoginHistoriesSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'users'
    },
    ip: {
        type: String
    },
    device: { 
        type: String,
        enum: ['Windows', 'Android', 'iOS', 'MacOS', 'Linux', 'Unknown'],
        default: 'Unknown'
    },
    country: {
        type: String
    },
    range: {
        type: Object
    },
    useragent: {
        type: Object
    },
    data: {
        type: Object
    }
}, { timestamps: true });
exports.LoginHistories = (0, mongoose_1.model)('loginhistories', LoginHistoriesSchema);
