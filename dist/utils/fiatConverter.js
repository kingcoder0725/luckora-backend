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
exports.convertFiatCurrency = void 0;
const axios_1 = require("axios");
const EXCHANGE_RATE_CURRENCY_API = process.env.EXCHANGE_RATE_CURRENCY_API;
const EXCHANGE_RATE_CURRENCY_API_KEY = process.env.EXCHANGE_RATE_CURRENCY_API_KEY;

const convertFiatCurrency = (fromCurrency, toCurrency, amount) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const url = `${EXCHANGE_RATE_CURRENCY_API}${EXCHANGE_RATE_CURRENCY_API_KEY}/pair/${fromCurrency}/${toCurrency}`;
        const response = yield axios_1.default.get(url);
        const conversionRate = response.data.conversion_rate;
        const convertedAmount = amount * conversionRate;
        return convertedAmount;
    } catch (error) {
        console.error(`DEBUG: Failed to convert ${fromCurrency} to ${toCurrency}:`, error.response?.data || error.message);
        return 0; 
    }
});
exports.convertFiatCurrency = convertFiatCurrency;