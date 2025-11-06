"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JourneyHistory = void 0;
const mongoose_1 = require("mongoose");
const journeyHisSchema = new mongoose_1.Schema({
    node: {
        type: Object
    },
    sender: {
        type: String,
        required: true
    },
    receivers: {
        type: Array,
        required: true
    },
    templateId: {
        type: String
    },
    last_sent: {
        type: Date,
        default: Date.now()
    },
    open_message: {
        type: Boolean,
        default: false
    },
    clicked_on_message:{
        
    }
}, { timestamps: true });
exports.JourneyHistory = (0, mongoose_1.model)('journey_histories', journeyHisSchema);
