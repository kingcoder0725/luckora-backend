'use strict';
var __awaiter =
    (this && this.__awaiter) ||
    function (thisArg, _arguments, P, generator) {
        function adopt(value) {
            return value instanceof P
                ? value
                : new P(function (resolve) {
                      resolve(value);
                  });
        }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator['throw'](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
Object.defineProperty(exports, '__esModule', { value: true });
exports.getSumSubAccessTokenApi = void 0;
const axios_1 = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');
const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY;
const SUMSUB_BASE_URL = 'https://api.sumsub.com';
const config = {
    baseURL: SUMSUB_BASE_URL
};
const sumSubAxios = axios_1.default.create({
    baseURL: SUMSUB_BASE_URL
});
const createSignature = (config) => {
    console.log('Creating a signature for the request...');
    var ts = Math.floor(Date.now() / 1000);
    const signature = crypto.createHmac('sha256', SUMSUB_SECRET_KEY);
    signature.update(ts + config.method.toUpperCase() + config.url);
    if (config.data instanceof FormData) {
        signature.update(config.data.getBuffer());
    } else if (config.data) {
        signature.update(config.data);
    }
    config.headers['X-App-Access-Ts'] = ts;
    config.headers['X-App-Access-Sig'] = signature.digest('hex');
    return config;
};
sumSubAxios.interceptors.request.use(createSignature, function (error) {
    return Promise.reject(error);
});
const createAccessToken = (externalUserId, levelName = 'basic-kyc-level', ttlInSecs = 600) => {
    console.log('Creating an access token for initializng SDK...');
    const body = {
        userId: externalUserId,
        levelName: levelName,
        ttlInSecs: ttlInSecs
    };
    const method = 'post';
    const url = '/resources/accessTokens/sdk';
    const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-App-Token': SUMSUB_APP_TOKEN
    };
    config.method = method;
    config.url = url;
    config.headers = headers;
    config.data = JSON.stringify(body);
    return config;
};
const getSumSubAccessTokenApi = (externalUserId) =>
    __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        try {
            const response = yield sumSubAxios(createAccessToken(externalUserId, 'id-and-liveness', 600));
            return response.data;
        } catch (error) {
            console.error(
                'Error getAccessToken: ',
                ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error
            );
            return (_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.data;
        }
    });
exports.getSumSubAccessTokenApi = getSumSubAccessTokenApi;
