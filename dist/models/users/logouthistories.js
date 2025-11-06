"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogoutHistories = void 0;
const mongoose_1 = require("mongoose");
const LogoutHistoriesSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'users'
    },
}, { timestamps: true });
exports.LogoutHistories = (0, mongoose_1.model)('logouthistories', LogoutHistoriesSchema);
