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
exports.activityPostBack = exports.depositPostBack = exports.signupPostBack = void 0;
const axios_1 = require("axios");
const POSTBACK_URL = process.env.OWN_POSTBACK_URL;
const POSTBACK_KEY = process.env.OWN_POSTBACK_KEY;

const sendPostBack = (type, params) => __awaiter(void 0, void 0, void 0, function* () {
    if (!POSTBACK_URL || !POSTBACK_KEY) {
        throw new Error('POSTBACK_URL or POSTBACK_KEY is not set in environment variables');
    }
    const payload = { type, key: POSTBACK_KEY, ...params };
    // console.log(`Sending postback for ${type} to URL: ${POSTBACK_URL} with payload:`, JSON.stringify(payload, null, 2));
    try {
        const response = yield (0, axios_1.default.post)(POSTBACK_URL, payload, {
            headers: { 'Content-Type': 'application/json' },
        });
        // console.log(`Postback response for ${type}: Status=${response.status}, Data=`, response.data);
        if (response.status !== 200) {
            // console.error(`Postback failed for ${type}: ${response.statusText}`);
        }
        return response.data;
    } catch (error) {
        // console.error(`Error sending postback for ${type}:`, error.message, 'Response:', error.response?.data || {});
        throw error;
    }
});

const signupPostBack = (clickid, playerid, username, country, ip, useragent) => __awaiter(void 0, void 0, void 0, function* () {
    if (!clickid || !playerid) {
        // console.error('[signupPostBack] Error: Missing required parameters', { clickid, playerid });
        throw new Error('clickid and playerid are required');
    }
    const params = { 
        clickid, 
        playerid: playerid.toString(),
        username,
        ...(country && { country }),
        ...(ip && { ip }),
        ...(useragent && { useragent }),
    };
    // console.log('[signupPostBack] Parameters:', params);
    return yield sendPostBack('signup', params);
});
exports.signupPostBack = signupPostBack;

const depositPostBack = (playerid,username, transaction_id, summ, currency) => __awaiter(void 0, void 0, void 0, function* () {
    if (!playerid || !transaction_id || !summ || !currency) {
        // console.error('[depositPostBack] Error: Missing required parameters', {playerid, transaction_id, summ, currency });
        throw new Error('clickid, playerid, transaction_id, summ, and currency are required');
    }
    const params = { 
        playerid: playerid.toString(),
        username,
        transaction_id, 
        summ, 
        currency
    };
    // console.log('[depositPostBack] Parameters:', params);
    return yield sendPostBack('deposit', params);
});
exports.depositPostBack = depositPostBack;

const withdrawalPostBack = (playerid,username, transaction_id, summ, currency) => __awaiter(void 0, void 0, void 0, function* () {
    if (!playerid || !transaction_id || !summ || !currency) {
        console.error('[withdrawalPostBack] Error: Missing required parameters', { playerid, transaction_id, summ, currency });
        throw new Error('playerid, transaction_id, summ, and currency are required');
    }
    const params = { 
        playerid: playerid.toString(), 
        username,
        transaction_id, 
        summ, 
        currency
    };
    // console.log('[withdrawalPostBack] Parameters:', params);
    return yield sendPostBack('withdraw', params);
});
exports.withdrawalPostBack = withdrawalPostBack;

const activityPostBack = (playerid, username, ggr, bonuses, turnover, currency) => __awaiter(void 0, void 0, void 0, function* () {
    if (!playerid) {
        // console.error('[activityPostBack] Error: playerid is undefined');
        throw new Error('playerid is required');
    }
    const params = { playerid: playerid.toString(),username, ggr, bonuses, turnover, currency };
    // console.log('[activityPostBack] Parameters:', params);
    return yield sendPostBack('activity', params);
});
exports.activityPostBack = activityPostBack;