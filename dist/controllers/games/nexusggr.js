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
exports.callback = exports.launchNexusGGR = exports.createUser = exports.getGameLists = exports.getGameProviders = void 0;
const axios_1 = require("axios");
const base_1 = require("../base");
const models_1 = require("../../models");
const API_URL = process.env.NEXUSGGR_API_URL;
const AGENT_CODE = process.env.NEXUSGGR_AGENT_CODE;
const AGENT_TOKEN = process.env.NEXUSGGR_AGENT_TOKEN;
const getGameProviders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("------getting nexusggr providers-------");
        const result = yield axios_1.default.post(API_URL, {
            "method": "provider_list",
            "agent_code": AGENT_CODE,
            "agent_token": AGENT_TOKEN
        });
        if (result.data.msg === "SUCCESS" && result.data.status === 1 && result.data.providers.length) {
            yield models_1.GameProviders.deleteMany({ api_type: "nexusggr" });
            yield models_1.GameProviders.insertMany(result.data.providers);
            return res.json("success1");
        }
        res.json("Casino API Error");
    }
    catch (error) {
        console.error(error);
        return res.status(400).json("Internal Server Error");
    }
});
exports.getGameProviders = getGameProviders;
const getGameLists = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("-----getting nexusggr game lists------");
        const providers = yield models_1.GameProviders.find({ status: true });
        yield models_1.GameLists.deleteMany({ api_type: "nexusggr" });
        providers.forEach((provider) => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield axios_1.default.post(API_URL, {
                "method": "game_list",
                "agent_code": AGENT_CODE,
                "agent_token": AGENT_TOKEN,
                "provider_code": provider.code,
            });
            if (result.data.msg === "SUCCESS" && result.data.status === 1 && result.data.games.length) {
                const query = result.data.games.map((list) => (Object.assign(Object.assign({}, list), { provider_code: provider.code, banner: list.banner.replaceAll("https://assets.fiverscool.com", "https://webet360.com/banners") })));
                yield models_1.GameLists.insertMany(query);
            }
        }));
        return res.json("success");
    }
    catch (error) {
        console.error(error);
        return res.status(400).json("Internal Server Error");
    }
});
exports.getGameLists = getGameLists;
const createUser = (userCode) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield axios_1.default.post(API_URL, {
            "method": "user_create",
            "agent_code": AGENT_CODE,
            "agent_token": AGENT_TOKEN,
            "user_code": userCode
        });
        if (result.data.status === 1)
            return true;
        return false;
    }
    catch (error) {
        console.error(error);
        return false;
    }
});
exports.createUser = createUser;
const launchNexusGGR = ({ userCode, game_code, provider_code }) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield axios_1.default.post(API_URL, {
            "method": "game_launch",
            "agent_code": AGENT_CODE,
            "agent_token": AGENT_TOKEN,
            "user_code": userCode,
            "provider_code": provider_code,
            "game_code": game_code,
            "lang": "en",
        });
        if (result.data.status === 1)
            return { status: true, url: result.data.launch_url };
        return { status: false, msg: result.data.msg };
    }
    catch (error) {
        console.error(error);
        return { status: false, msg: "Casino API Nexusggr Error!" };
    }
});
exports.launchNexusGGR = launchNexusGGR;
const callback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { method, user_balance, agent_secret, user_code, slot, live } = req.body;
        console.log(req.body, "==>callback casino nexusggr");
        const balance = yield models_1.Balances.findOne({ userId: user_code, status: true });
        if (method === "user_balance") {
            return res.json({
                "status": 1,
                "user_balance": (balance === null || balance === void 0 ? void 0 : balance.balance) || 0
            });
        }
        if (method === "transaction") {
            let amount = 0;
            if (slot)
                amount = user_balance - slot.bet_money + slot.win_money;
            if (live)
                amount = user_balance - live.bet_money + live.win_money;
            if (amount < 0) {
                return res.json({
                    "status": 0,
                    "msg": "Balance is not enough!"
                });
            }
            yield models_1.Balances.updateOne({ userId: balance.userId, status: true }, { balance: (0, base_1.NumberFix)(amount) });
            const newhis = new models_1.GameHistories(Object.assign(Object.assign(Object.assign(Object.assign({}, req.body), slot), live), { userId: balance.userId, currency: balance.currency, other: JSON.stringify(req.body) }));
            yield newhis.save();
            return res.json({
                "status": 1,
                "user_balance": amount
            });
        }
        return res.json({
            "status": 0,
            "msg": "INSUFFICIENT_USER_FUNDS"
        });
    }
    catch (error) {
        console.error(error);
        return res.json({
            "status": 0,
            "user_balance": 0,
            "msg": "INTERNAL_ERROR"
        });
    }
});
exports.callback = callback;
