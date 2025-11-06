'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.SportsBets = void 0;
const mongoose_1 = require('mongoose');
const SportsBetsSchema = new mongoose_1.Schema(
    {
        betsId: {
            type: String,
            default: ''
        },
        userId: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'users'
        },
        currency: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'currencies'
        },
        odds: {
            type: Number,
            require: true
        },
        stake: {
            type: Number,
            require: true
        },
        profit: {
            type: Number,
            default: 0,
            require: true
        },
        potential: {
            type: Number,
            require: true
        },
        type: {
            type: String,
            require: true
        },
        betType: {
            type: Number,
            require: true
        },
        isFreeBet: {
            type: Boolean,
            default: false
        },
        selectedFreeBet: {
            type: String,
            default: ''
        },
        status: {
            type: String,
            default: 'BET',
            enum: ['BET', 'SETTLED', 'LOST', 'WIN', 'HALF_WIN', 'HALF_LOST', 'REFUND', 'CANCEL'],
            require: true
        }
    },
    { timestamps: true }
);
SportsBetsSchema.pre('findOneAndUpdate', function () {
    this.populate('userId').populate('currency');
});
SportsBetsSchema.pre('findOne', function () {
    this.populate('userId').populate('currency');
});
SportsBetsSchema.pre('find', function () {
    this.populate('userId').populate('currency');
});
SportsBetsSchema.index({ betId: 1, userId: 1, status: 1 });
exports.SportsBets = (0, mongoose_1.model)('sports_bets', SportsBetsSchema);
