"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Socials = void 0;
const mongoose_1 = require("mongoose");
const SocialsSchema = new mongoose_1.Schema({
    title: {
        type: String
    },
    description: {
        type: String
    },
    icon: {
        type: String
    },
    link: {
        type: String
    },
    order: {
        type: Number
    },
    status: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });
exports.Socials = (0, mongoose_1.model)('socials', SocialsSchema);
