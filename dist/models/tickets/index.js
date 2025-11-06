"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tickets = void 0;
const mongoose_1 = require("mongoose");
const Ticketschema = new mongoose_1.Schema({
    number: {
        type: String,
        required: true,
        unique: true,
    },
    player: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'users'
    },
    agent: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'users'
    },
    description: {
        type: String
    },
    image: {
        type: String,
    },
    category: {
        type: String,
        enum: ["sports", "casino"]
    },
    status: {
        type: String,
    },
    resolution: {
        type: String,
    },
    priority: {
        type: String,
    },
    update_time: {
        type: Date,
    },
    closed_time: {
        type: Date,
    }
}, { timestamps: true });
exports.Tickets = (0, mongoose_1.model)('tickets', Ticketschema);
