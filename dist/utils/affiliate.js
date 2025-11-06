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
const POSTBACK_URL = process.env.POSTBACK_URL;
const POSTBACK_KEY = process.env.POSTBACK_KEY;


// const signupPostBack = ({ clickid, playerid, username }) => __awaiter(void 0, void 0, void 0, function* () {
//     var _a;
//     try {
//         const url = `${POSTBACK_URL}/ig/?type=signup&clickid=${clickid}&playerid=${playerid}${username && `&username=${username}`}&key=${POSTBACK_KEY}`;
//         const res = yield axios_1.default.get(url);
//         console.log(url, '==>url', res.data);
//     }
//     catch (error) {
//         console.error(`Error Signup Postback => `, ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error);
//         return false;
//     }
// });
// exports.signupPostBack = signupPostBack;

const signupPostBack = ({ clickid, playerid, username }) => __awaiter(void 0, void 0, void 0, function* () {
  try {
    if (!POSTBACK_URL || !POSTBACK_KEY) {
      console.error('Missing environment variables:', { POSTBACK_URL, POSTBACK_KEY });
      return false;
    }
    const url = `${POSTBACK_URL}/ig/?type=signup&clickid=${clickid}&playerid=${playerid}${username && `&username=${username}`}&key=${POSTBACK_KEY}`;
    console.log('signupPostBack URL:', url);
    
    const res = yield axios_1.default.get(url, { timeout: 5000 });
    console.log('signupPostBack response:', {
      status: res.status,
      data: res.data,
    });
    return true;
  } catch (error) {
    console.error('signupPostBack error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack,
    });
    return false;
  }
});

exports.signupPostBack = signupPostBack;

const depositPostBack = ({ playerid, transaction_id, local_amount, local_currency }) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    try {
        const url = `${POSTBACK_URL}/ig/?type=deposit&playerid=${playerid}&transaction_id=${transaction_id}&local_amount=${local_amount}&local_currency=${local_currency}&key=${POSTBACK_KEY}`;
        console.log(url, '==>url');
        yield axios_1.default.get(url);
    }
    catch (error) {
        console.error(`Error depositPostBack => `, ((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.data) || error);
        return false;
    }
});
exports.depositPostBack = depositPostBack;


const activityPostBack = ({ playerid, ggr, turnover, ngr, payouts, bonuses, local_currency }) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    try {
        const url = `${POSTBACK_URL}/ig/?type=activity&playerid=${playerid}&ggr=${ggr}&turnover=${turnover}&payouts=${payouts}&bonuses=${bonuses}&local_currency=${local_currency}&key=${POSTBACK_KEY}`;
        console.info(url, '==>url');
        yield axios_1.default.get(url);
    }
    catch (error) {
        console.error(`Error activityPostBack => `, ((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error);
        return false;
    }
});
exports.activityPostBack = activityPostBack;
