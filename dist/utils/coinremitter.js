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
exports.getFiatToCryptoRate = exports.createNewWallet = void 0;
const axios_1 = require("axios");
// const API_URL = 'https://coinremitter.com/api/v3';
const API_URL = 'https://api.coinremitter.com/v1';


const createNewWallet = ({ symbol, api_key, password, label }) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const url = `${API_URL}/wallet/address/create`;
        const body = {
            api_key,
            password,
            label
        };
        const res = yield axios_1.default.post(url, body);
        if (!(res === null || res === void 0 ? void 0 : res.data))
            return false;
        const { data, flag, msg } = res.data;
        if (flag !== 1) {
            console.error(msg);
            return false;
        }
        return data;
    }
    catch (error) {
        console.error(`Error create new Wallet => `, ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error);
        return false;
    }
});
exports.createNewWallet = createNewWallet;

// const getFiatToCryptoRate = ({ symbol, api_key, password }, fiat_symbol, fiat_amount) => __awaiter(void 0, void 0, void 0, function* () {
//     var _b;
//     try {
//         const url = `${API_URL}/${symbol}/rate/fiat-to-crypto`;
//         const body = {
//             api_key,
//             password,
//             fiat_symbol,
//             fiat_amount
//         };
//         const res = yield axios_1.default.post(url, body);
//         if (!(res === null || res === void 0 ? void 0 : res.data))
//             return false;
//         const { data, flag, msg } = res.data;
//         if (flag !== 1) {
//             console.error(msg);
//             return false;
//         }
//         return data;
//     }
//     catch (error) {
//         console.error(`Error create new Wallet => `, ((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.data) || error);
//         return false;
//     }
// });
// exports.getFiatToCryptoRate = getFiatToCryptoRate;
const getFiatToCryptoRate = ({ symbol, api_key, password }, fiat_symbol, fiat_amount) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    try {
        const url = `${API_URL}/rate/fiat-to-crypto`;
        const body = {
            fiat: fiat_symbol,
            fiat_amount: fiat_amount.toString(),
            crypto: symbol
        };
        const res = yield axios_1.default.post(url, body);
        if (!(res === null || res === void 0 ? void 0 : res.data) || !res.data.success) {
            console.error(res.data ? res.data.message : 'No data');
            return false;
        }
        const dataArray = res.data.data;
        const selected = dataArray.find(d => d.short_name === symbol.toUpperCase());
        if (!selected) {
            console.error('Crypto not found in response');
            return false;
        }
        return {
            crypto_amount: parseFloat(selected.price),
            fiat_amount
        };
    }
    catch (error) {
        console.error(`Error getting fiat to crypto rate => `, ((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.data) || error);
        return false;
    }
});
exports.getFiatToCryptoRate = getFiatToCryptoRate;