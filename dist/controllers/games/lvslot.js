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
exports.callback = exports.launchLvslot = exports.getGameLists = void 0;
const axios_1 = require("axios");
const models_1 = require("../../models");
const base_1 = require("../base");
const API_URL = process.env.LVSLOT_API_URL;
const LVSLOT_HALL = process.env.LVSLOT_HALL;
const LVSLOT_KEY = process.env.LVSLOT_KEY;
const LVSLOT_CDNURL = process.env.LVSLOT_CDNURL;
const LVSLOT_CALLBACK = process.env.LVSLOT_CALLBACK;
const DOMAIN = process.env.DOMAIN;
function getStringToNumberString(inputString) {
    // Convert the input string to a hash value  
    const hash = inputString.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    // Get the last 6 digits of the hash and ensure it is a positive number  
    const numberString = Math.abs(hash % 1000000).toString().padStart(6, '0');
    return numberString;
}
const getGameLists = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("------getting LVSLOT gamelist-------");
        const data = yield axios_1.default.post(API_URL, {
            "cmd": "gamesList",
            "hall": LVSLOT_HALL,
            "key": LVSLOT_KEY,
            "cdnUrl": LVSLOT_CDNURL
        });
        if (!(data === null || data === void 0 ? void 0 : data.data))
            return;
        const games = data.data;
        let providers = [];
        let lists = [];
        games.content.gameList.forEach((row) => {
            let _type = row.categories;
            if (_type === "live_dealers")
                _type = "live";
            if (_type === "slots")
                _type = "slot";
            const _name = row.title.replaceAll("_", " ");
            const state = providers.some((e) => e.name === _name && e.type === _type);
            if (!state) {
                providers.push({
                    name: _name,
                    code: `${_type}_${row.title}`,
                    type: _type,
                    api_type: "lvslot"
                });
            }
            const provider = providers.find((e) => e.name === _name && e.type === _type);
            if (!provider)
                return;
            lists.push({
                game_name: row.name,
                game_code: row.id,
                banner: row.img,
                provider_code: provider.code,
                api_type: "lvslot",
                status: true
            });
        });
        yield models_1.GameProviders.deleteMany({ api_type: "lvslot" });
        yield models_1.GameProviders.insertMany(providers);
        yield models_1.GameLists.deleteMany({ api_type: "lvslot" });
        yield models_1.GameLists.insertMany(lists);
        return res.json({ providers, lists });
    }
    catch (error) {
        console.error(error);
        return res.status(400).json("Internal Server Error");
    }
});
exports.getGameLists = getGameLists;
const launchLvslot = ({ userCode, game_code }) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield axios_1.default.post(`${API_URL}openGame/`, {
            "cmd": "openGame",
            "hall": LVSLOT_HALL,
            "key": LVSLOT_KEY,
            "domain": DOMAIN,
            "exitUrl": LVSLOT_CALLBACK,
            "language": "en",
            "login": userCode,
            "gameId": game_code,
            "cdnUrl": LVSLOT_CDNURL,
            "demo": "0"
        });
        if (result.data.status === "success")
            return { status: true, url: result.data.content.game.url };
        return { status: false, msg: result.data.error };
    }
    catch (error) {
        console.error(error);
        return { status: false, msg: "Casino API Lvslot Error!" };
    }
});
exports.launchLvslot = launchLvslot;
const callback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { cmd, login, winLose, gameId, bet, win, tradeId } = req.body;
        console.log(req.body, "==>callback casino lvslot ");
        const balance = yield models_1.Balances.findOne({ userId: login, status: true });
        if (!balance) {
            return res.json({
                "status": "fail",
                "error": "fail_balance"
            });
        }
        if (cmd === "getBalance") {
            return res.json({
                "status": "success",
                "error": "",
                "login": login,
                "balance": balance === null || balance === void 0 ? void 0 : balance.balance.toFixed(2),
                "currency": balance === null || balance === void 0 ? void 0 : balance.currency.symbol
            });
        }
        if (cmd === "writeBet") {
            if ((balance.balance + (0, base_1.NumberFix)(winLose)) < 0) {
                return res.json({
                    "status": "fail",
                    "error": "fail_balance"
                });
            }
            const game = yield models_1.GameLists.findOne({ game_code: gameId, status: true, api_type: "lvslot" });
            const provider = yield models_1.GameProviders.findOne({ code: game.provider_code, status: true, api_type: "lvslot" });
            yield models_1.Balances.updateOne({ userId: balance.userId, status: true }, { $inc: { balance: (0, base_1.NumberFix)(winLose) } });
            const newhis = new models_1.GameHistories({
                userId: balance.userId,
                currency: balance === null || balance === void 0 ? void 0 : balance.currency._id,
                user_balance: balance === null || balance === void 0 ? void 0 : balance.balance.toFixed(2),
                game_type: provider === null || provider === void 0 ? void 0 : provider.type,
                provider_code: game.provider_code,
                game_code: gameId,
                bet_money: bet,
                win_money: win,
                txn_id: tradeId,
                other: JSON.stringify(req.body)
            });
            const his = yield newhis.save();
            return res.json({
                "status": "success",
                "error": "",
                "login": login,
                "balance": (0, base_1.NumberFix)((balance === null || balance === void 0 ? void 0 : balance.balance) + winLose),
                "currency": balance === null || balance === void 0 ? void 0 : balance.currency.symbol,
                "operationId": getStringToNumberString(String(his._id))
            });
        }
        return res.json({
            "status": "fail",
            "error": "user_not_found"
        });
    }
    catch (error) {
        console.error(error);
        return res.json({
            "status": "fail",
            "error": "user_not_found"
        });
    }
});
exports.callback = callback;
