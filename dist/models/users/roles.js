"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Roles = void 0;
const mongoose_1 = require("mongoose");
const RolesSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true
    },
    order: {
        type: Number,
        default: 0
    },
    type: {
        type: String,
        default: 'player',
        enum: ['player', 'agent', 'admin', 'super_admin'],
    },
    url: {
        type: Array,
    },
}, { timestamps: true });
exports.Roles = (0, mongoose_1.model)('roles', RolesSchema);
