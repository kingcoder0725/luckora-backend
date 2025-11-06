"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sessions = void 0;
const mongoose_1 = require("mongoose");
const SessionsSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'users'
    },
    socketId: {
        type: String
    },
    accessToken: {
        type: String
    },
    refreshToken: {
        type: String
    },
    passwordToken: {
        type: String
    },
    expiration: {
        type: Date
    },
    ip: {
        type: String
    },
    country: {
        type: String
    },
    range: {
        type: Object
    },
    useragent: {
        type: Object
    }
}, { timestamps: true });
exports.Sessions = (0, mongoose_1.model)('sessions', SessionsSchema);
