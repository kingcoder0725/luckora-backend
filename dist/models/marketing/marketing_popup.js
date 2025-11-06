"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketingPopup = void 0;
const mongoose_1 = require("mongoose");
const MarketingPopupSchema = new mongoose_1.Schema({
    id: {
        type: String,
        required: true
    },
    name: {
        type: String,
    },
    banner: {
        type: String,
    },
    link: {
        type: String,
    },
}, { timestamps: true });
exports.MarketingPopup = (0, mongoose_1.model)('marketing_popups', MarketingPopupSchema);
