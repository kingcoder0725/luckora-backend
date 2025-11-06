"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatReport = void 0;
const mongoose_1 = require("mongoose");
const ChatReportSchema = new mongoose_1.Schema({
    sender: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    receiver: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    text: {
        type: String,
        required: true
    },
    replyTo: {
        type: mongoose_1.Schema.Types.Mixed,
        required: true
    },
}, { timestamps: true });
ChatReportSchema.pre('findOneAndUpdate', function () {
    this.populate('sender', ["username", "avatar"]);
    this.populate('receiver', ["username", "avatar"]);
});
ChatReportSchema.pre('find', function () {
    this.populate('sender', ["username", "avatar"]);
    this.populate('receiver', ["username", "avatar"]);
});
ChatReportSchema.pre('findOne', function () {
    this.populate('sender', ["username", "avatar"]);
    this.populate('receiver', ["username", "avatar"]);
});
exports.ChatReport = (0, mongoose_1.model)('chat_reports', ChatReportSchema);
