"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.coinpayment = void 0;
const coinpayments_1 = require("coinpayments");
const CoinpaymentsCredentials = {
    key: process.env.COINPAYMENT_KEY,
    // secret: decrypt(process.env.COINPAYMENT_SECRET as string)
    secret: ''
};
let client;
try {
    client = new coinpayments_1.default(CoinpaymentsCredentials);
}
catch (error) {
    console.log('Coinpayments error !!!');
}
exports.coinpayment = client;
