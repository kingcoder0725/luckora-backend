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
exports.getPayInTransaction = exports.createTransaction = exports.authorization = void 0;
const axios_1 = require("axios");
const OMNO_CLIENT_ID = process.env.OMNO_CLIENT_ID;
const OMNO_CLIENT_SECRET = process.env.OMNO_CLIENT_SECRET;
const OMNO_HOOK_URL = process.env.OMNO_HOOK_URL;
const OMNO_CALLBACK = process.env.OMNO_CALLBACK;
const OMNO_CALLBACK_FAIL = process.env.OMNO_CALLBACK_FAIL;
const authorization = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        // The request body with necessary parameters
        const requestBody = new URLSearchParams({
            client_id: OMNO_CLIENT_ID,
            client_secret: OMNO_CLIENT_SECRET,
            grant_type: 'client_credentials',
        });
        console.log(OMNO_CLIENT_SECRET, '==>OMNO_CLIENT_SECRET');
        const response = yield axios_1.default.post('https://sso.omno.com/realms/omno/protocol/openid-connect/token', requestBody, { headers });
        if (!(response === null || response === void 0 ? void 0 : response.data))
            return false;
        // {
        //     "access_token": "eyJhbG...",
        //     "expires_in": 300,
        //     "refresh_expires_in": 0,
        //     "token_type": "Bearer",
        //     "not-before-policy": 0,
        //     "scope": "email profile merchant"
        //   }
        return (_a = response.data) === null || _a === void 0 ? void 0 : _a.access_token;
    }
    catch (err) {
        console.error('Falid Omno Authorization error : ', ((_b = err === null || err === void 0 ? void 0 : err.response) === null || _b === void 0 ? void 0 : _b.data) || err);
        return false;
    }
});
exports.authorization = authorization;
const createTransaction = (token, data) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    try {
        const param = JSON.stringify(Object.assign(Object.assign({}, data), { kycVerified: false, webhook: {
                url: OMNO_HOOK_URL,
            }, previousTransactionCount: 0, returnUrls: {
                success: OMNO_CALLBACK,
                failure: OMNO_CALLBACK_FAIL,
            } }));
        const url = `https://api.omno.com/public/cashier/session`;
        console.log(param, '===>data==', url);
        const res = yield axios_1.default.post(url, param, {
            headers: {
                authorization: `Bearer ${token}`,
                'content-type': 'application/json',
            },
        });
        if (!(res === null || res === void 0 ? void 0 : res.data))
            return false;
        console.log('🚀 ~ createTransaction ~ res?.data:', res.data);
        // {
        //     sessionId: '99a33e2e-3aca-4a14-a2aa-a28462b572e0',
        //     checkoutUrl: 'https://checkout.omno.com/payments/cashier/99a33e2e-3aca-4a14-a2aa-a28462b572e0'
        //   }
        return res.data;
    }
    catch (err) {
        console.error('Falid Omno CreateTransaction error : ', ((_c = err === null || err === void 0 ? void 0 : err.response) === null || _c === void 0 ? void 0 : _c.data) || err);
        return false;
    }
});
exports.createTransaction = createTransaction;
// export const createTransaction = async (token: string, data: any) => {
//     try {
//         const param = JSON.stringify({
//             ...data,
//             hookUrl: OMNO_HOOK_URL,
//             callback: OMNO_CALLBACK,
//             callbackFail: OMNO_CALLBACK_FAIL,
//         });
//         const res = await axios.post(`https://api.omno.com/transaction/create`, param, {
//             headers: {
//                 authorization: `Bearer ${token}`,
//                 'content-type': 'application/json',
//             }
//         });
//         if (!res?.data) return false;
//         // {
//         //    paymentId: '80E144E2FC3949518ECF0182E4992F8E',
//         //    paymentUrl: 'https://api.omno.com/transaction/paymentpage/80E144E2FC3949518ECF0182E4992F8E',
//         //    paymentUrlIframe: 'https://api.omno.com/transaction/paymentpage/iframe/80E144E2FC3949518ECF0182E4992F8E',
//         //    paymentUrlIframeApm: 'https://api.omno.com/transaction/paymentpage/iframe/80E144E2FC3949518ECF0182E4992F8E/apm'
//         // }
//         return res.data;
//     } catch (err: any) {
//         console.error("Falid Omno Authorization error : ", err?.response?.data || err);
//         return false;
//     }
// };
const getPayInTransaction = (token, paymnetId) => __awaiter(void 0, void 0, void 0, function* () {
    var _d;
    try {
        const url = `https://api.omno.com/public/payin/${paymnetId}`;
        const res = yield axios_1.default.get(url, {
            headers: {
                authorization: `Bearer ${token}`,
                'content-type': 'application/json',
            },
        });
        if (!(res === null || res === void 0 ? void 0 : res.data))
            return false;
        // {
        // "id": "string",
        // "amount": 0,
        // "merchantId": "string",
        // "customerId": "string",
        // "orderId": "string",
        // "currency": "string",
        // "status": "CREATED",
        // "initialAmount": 0,
        // "initialCurrency": "string",
        // "routerId": "string",
        // "cardId": "string",
        // "cardMask": "string",
        // "cardBrand": "string",
        // "cardHash": "string",
        // "merchantPspId": "string",
        // "pspTransactionId": "string",
        // "statusReason": {
        //      "reason": "string",
        //      "detailedStatus": "GENERAL_DECLINE",
        //      "status": "CREATED"
        // },
        // "previousTransactionCount": 0,
        // "metadata": {
        //       "ipAddress": "string"
        // },
        // "transactionType": "CARD",
        // "createdAt": "2019-08-24T14:15:22Z",
        // "updatedAt": "2019-08-24T14:15:22Z"
        //   }
        return res.data;
    }
    catch (err) {
        console.error('Falid Omno CreateTransaction error : ', ((_d = err === null || err === void 0 ? void 0 : err.response) === null || _d === void 0 ? void 0 : _d.data) || err);
        return false;
    }
});
exports.getPayInTransaction = getPayInTransaction;
