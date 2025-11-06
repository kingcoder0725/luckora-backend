"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DailySpinwheels = void 0;
const mongoose_1 = require("mongoose");

const DailySpinwheelsSchema = new mongoose_1.Schema({
    bonusId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'bonus',
        required: true
    },
    num:
    {
        type: Number,
        required: true
    },
    procent:
    {
        type: Number,
        required: true  
    },
    amount: 
    {
    type: Number,
    default: 1
    },
    text: {
        type: String,
        required: true
    },
    desc: {
        type: String,
        default: ''
    },
    daily: {
        type: String,
        default: 'promotion'
    },
    status: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

exports.DailySpinwheels = (0, mongoose_1.model)('daily_spinwheels', DailySpinwheelsSchema);