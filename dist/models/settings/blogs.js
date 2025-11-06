"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blogs = void 0;
const mongoose_1 = require("mongoose");
const BlogSchema = new mongoose_1.Schema({
    title: {
        type: String
    },
    description: {
        type: String
    },
    image: {
        type: String,
    },
    type: {
        type: String,
    },
    status: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });
exports.Blogs = (0, mongoose_1.model)('blogs', BlogSchema);
