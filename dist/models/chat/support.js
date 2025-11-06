"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportChat = void 0;
const mongoose_1 = require("mongoose");
const SupportChatSchema = new mongoose_1.Schema({
    sender: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'users',
        default: null,
    },
    receiver: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'users',
        default: null,
    },
    text: {
        type: String,
        required: true
    },
    userColor: {
        type: String,
        required: true
    },
    emoji: {
        type: String,
        default: null
    },
    status: {
        type: String,
        default: 'SENT',
        enum: ['SENT', 'DELIVERED', 'READ'],
    },
    replyTo: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'chats',
        default: null
    },
    attachment: {
        type: String,
        default: null
    },
    isAi: {
        type: Boolean,
        default: false
    },
    askAgent: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });
SupportChatSchema.pre('findOneAndUpdate', function () {
    this.populate('sender', ["username", "avatar"]);
    this.populate('receiver', ["username", "avatar"]);
});
SupportChatSchema.pre('find', function () {
    this.populate('sender', ["username", "avatar"]);
    this.populate('receiver', ["username", "avatar"]);
});
SupportChatSchema.pre('findOne', function () {
    this.populate('sender', ["username", "avatar"]);
    this.populate('receiver', ["username", "avatar"]);
});
exports.SupportChat = (0, mongoose_1.model)('supports', SupportChatSchema);
