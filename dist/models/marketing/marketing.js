"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Marketing = void 0;
const mongoose_1 = require("mongoose");
const MarketingSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    event: {
        type: String,
        enum: ["email", "sms"],
    },
    segmentation: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'segmentations',
        default: null
    },
    image: {
        type: String,
    },
    from_date: {
        type: String,
    },
    to_date: {
        type: String,
    },
    repeat: {
        type: Boolean,
        default: false,
    },
    repeat_time: {
        type: Number,
        default: 0
    },
    time_send: {
        type: Array,
    },
    players: {
        type: Array,
    },
    // country: {
    //     type: Array,
    // },
    last_sent: {
        type: Date,
        default: ""
    },
    template_id: {
        type: String,
    },
    status: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });
exports.Marketing = (0, mongoose_1.model)('marketings', MarketingSchema);
