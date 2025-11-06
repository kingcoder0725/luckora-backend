"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Users = void 0;
const mongoose_1 = require("mongoose");
const bcrypt = require("bcrypt-nodejs");
const UsersSchema = new mongoose_1.Schema({
    email: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
        default: '',
    },
    username: {
        type: String,
        unique: true,
    },
    surname: {
        type: String,
        default: '',
    },
    middlename: {
        type: String,
        default: '',
    },
    phone: {
        type: String,
        default: '',
    },
    country: {
        type: String,
        default: '',
    },
    country_reg: {
        type: String,
        default: '',
    },
    birthday: {
        type: Number,
    },
    address: {
        type: String,
        default: '',
    },
    rolesId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'roles',
    },
    oddsformat: {
        type: String,
        default: 'decimal',
    },
    cryptoAccount: {
        type: String,
        default: '',
    },
    publicAddress: {
        type: String,
        default: '',
    },
    nonce: {
        type: Number,
    },
    avatar: {
        type: String,
        default: '',
    },
    ip: {
        type: String,
    },
    referral: {
        type: String,
    },
    referralPercent: {
        type: Number,
        default: 5,
    },
    gender: {
        type: String,
        default: '',
    },
    postal_code: {
        type: String,
        default: '',
    },
    state: {
        type: String,
        default: '',
    },
    city: {
        type: String,
        default: '',
    },
    passport: {
        type: String,
        default: '',
    },
    front_id: {
        type: String,
        default: '',
    },
    back_id: {
        type: String,
        default: '',
    },
    selfie: {
        type: String,
        default: '',
    },
    trustswiftly_id: {
        type: String,
        default: '',
    },
    kycVerified: {
        type: Boolean,
        default: false,
    },
    trustswiftly_status: {
        passport: {
            type: String,
            default: '',
        },
        front_id: {
            type: String,
            default: '',
        },
        back_id: {
            type: String,
            default: '',
        },
        selfie: {
            type: String,
            default: '',
        },
    },
    creatorId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'users',
    },
    tier: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'tiers',
    },
    chat: {
        type: Boolean,
        default: true,
    },
    affiliate: {
        type: Boolean,
        default: false,
    },
    username_affiliate: {
        type: String,
        default: '',
    },
    last_bet: {
        type: Number,
        default: null,
    },
    last_bonus: {
        type: Number,
    },
    last_spin: {
        type: Number,
    },
    last_dailywheel: {
        type: Number,
    },
    last_game: {
        type: String,
        default: '',
    },
    betlimit: {
        type: Number,
        default: 0,
    },
    betlimit_period: {
        type: Number,
        default: 0,
    },
    betlimit_date: {
        type: Date,
    },
    status: {
        type: Boolean,
        default: true,
    },
    block_day: {
        type: Number,
        default: 0,
    },
    block_date: {
        type: Date,
    },
    point: {
        type: Number,
        default: 0,
    },
    level: {
        type: Number,
        default: 0,
    },
    timeSpent: {
        type: Number,
        default: 0,
    },
    LastOpenPage: {
        type: String,
        default: '/',
    },
}, { timestamps: true });
UsersSchema.methods.generateHash = (password) => {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
};
UsersSchema.methods.validPassword = (password, encrypted) => {
    return bcrypt.compareSync(password, encrypted);
};
UsersSchema.pre('findOneAndUpdate', function () {
    this.populate('rolesId', ['title', 'type']);
});
UsersSchema.pre('findOne', function () {
    this.populate('rolesId', ['title', 'type']);
});
UsersSchema.pre('find', function () {
    this.populate('rolesId', ['title', 'type']);
});
UsersSchema.index({ email: 1, username: 1, phone: 1, status: 1 });
exports.Users = (0, mongoose_1.model)('users', UsersSchema);
