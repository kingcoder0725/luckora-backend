"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMessage = void 0;
const mongoose_1 = require("mongoose");
const ChatMessageSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'users',
        required: true
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
        required: true
    },
    casino_game_id: {
        type: String,
        default: '0'
    },
    game_name: {
        type: String,
        default: null
    },
    game_banner: {
        type: String,
        default: null
    },
    replyTo: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'chats',
        default: null
    },
    attachment: {
        type: String,
        default: null
    }
}, { timestamps: true });
ChatMessageSchema.pre('findOneAndUpdate', function () {
    this.populate('userId', ["username", "avatar"]);
});
ChatMessageSchema.pre('find', function () {
    this.populate('userId', ["username", "avatar"]);
});
ChatMessageSchema.pre('findOne', function () {
    this.populate('userId', ["username", "avatar"]);
});
exports.ChatMessage = (0, mongoose_1.model)('chats', ChatMessageSchema);
