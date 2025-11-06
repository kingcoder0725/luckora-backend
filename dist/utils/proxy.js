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
exports.checkUserIp = void 0;
const axios_1 = require("axios");
const IP_HUB_API_KEY = process.env.IP_HUB_API_KEY;
const checkUserIp = (ipaddress) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const res = yield axios_1.default.get(`http://v2.api.iphub.info/ip/${ipaddress}`, {
            headers: {
                "X-Key": IP_HUB_API_KEY
            }
        });
        if (!(res === null || res === void 0 ? void 0 : res.data))
            return false;
        return res.data.block === 0;
    }
    catch (error) {
        console.error("Checking User IP Error => ", ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error);
        return false;
    }
});
exports.checkUserIp = checkUserIp;
