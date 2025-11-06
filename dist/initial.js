"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
require("regenerator-runtime");
const mongoose_1 = require("mongoose");
const randomString = require("randomstring");
const models_1 = require("./models");
const initRole = { title: 'admin', type: 'super_admin', order: 1 };
const initCurrency = {
    name: 'Tether(ERC20)',
    symbol: 'USDT',
    icon: 'https://s2.coinmarketcap.com/static/img/coins/64x64/825.png',
    payment: 'USDT.ERC20',
    coingecko: 'tether',
    price: 1,
    minDeposit: 10,
    minWithdraw: 50,
    minBet: 1,
    maxBet: 5000,
    adminAddress: '0xe197bD957B08D07E55D65A362780C7845b2CbA12',
    contractAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    type: 2,
    status: true,
    betLimit: 5000,
    deposit: true,
    withdrawal: true,
    officialLink: '',
    order: 5,
    decimals: 6,
    network: 'ethereum'
};
try {
    mongoose_1.default.connect(process.env.DATABASE).then(() => __awaiter(void 0, void 0, void 0, function* () {
        yield models_1.Roles.findOneAndUpdate(initRole, initRole, { upsert: true, new: true });
        yield models_1.Currencies.findOneAndUpdate({ symbol: process.env.DEFAULT_CURRENCY }, initCurrency, { upsert: true, new: true });
        const currency = yield models_1.Currencies.findOne({ symbol: process.env.DEFAULT_CURRENCY });
        const referral = randomString.generate(10);
        const user = {
            email: 'admin@gmail.com',
            username: 'admin',
            password: 'admin123$',
            referral
        };
        const newuser = new models_1.Users(user);
        const balance = new models_1.Balances({ userId: newuser._id, currency: currency._id });
        const role = yield models_1.Roles.findOne({ type: 'admin' });
        newuser.password = newuser.generateHash(user.password);
        newuser.rolesId = role._id;
        newuser.status = true;
        yield newuser.save();
        yield balance.save();
        console.log('done !!!');
    }));
}
catch (error) {
    console.log(`initial`, error);
}
