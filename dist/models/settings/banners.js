"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Banners = void 0;
const mongoose_1 = require("mongoose");
const BannersSchema = new mongoose_1.Schema({
    image: {
        type: String
    },
    // Adaptive images for responsive design
    image_desktop: {
        type: String
    },
    image_laptop: {
        type: String
    },
    image_mobile: {
        type: String
    },
    type: {
        type: String
    },
    title: {
        type: String,
    },
    description: {
        type: String,
    },
    country: {
        type: String,
    },
    button: {
        type: Boolean,
        default: false,
    },
    button_name: {
        type: String,
        default: "",
    },
    link: {
        type: String,
        default: "",
    },
    text_link_name: {
        type: String,
        default: "",
    },
    text_link_url: {
        type: String,
        default: "",
    },
    status: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });
exports.Banners = (0, mongoose_1.model)('banners', BannersSchema);
