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
exports.trackBonus = exports.trackTiers = exports.trackVisitPage = exports.trackTimeSpend = exports.hookSms = exports.hookEmail = void 0;
const models_1 = require("../../models");
const hookEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = req.body;
        return res.json('success');
    }
    catch (error) {
        console.error(error);
        return res.status(500).json('Internal Server Error!');
    }
});
exports.hookEmail = hookEmail;

const hookSms = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.body;
        yield models_1.JourneyHistory.findByIdAndUpdate(id, { open: true });
        return res.json('success');
    }
    catch (error) {
        console.error(error);
        return res.status(500).json('Internal Server Error!');
    }
});
exports.hookSms = hookSms;

// const trackTimeSpend = (user, time) => __awaiter(void 0, void 0, void 0, function* () {
//     try {
//         console.log(time, user._id, '======tracking time spend =======');
//     }
//     catch (error) {
//         console.error(error);
//     }
// });
// exports.trackTimeSpend = trackTimeSpend;
// const trackVisitPage = (user, path) => __awaiter(void 0, void 0, void 0, function* () {
//     try {
//         console.log(path, user._id, '======tracking path =======');
//     }
//     catch (error) {
//         console.error(error);
//     }
// });


// exports.trackVisitPage = trackVisitPage;
// const trackTiers = (userId, tier) => __awaiter(void 0, void 0, void 0, function* () {
//     try {
//         console.log(userId, tier, '======tracking tier =======');
//     }
//     catch (error) {
//         console.error(error);
//     }
// });
// exports.trackTiers = trackTiers;

const trackBonus = (userId, bonus) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(userId, bonus, '======tracking bonus =======');
    }
    catch (error) {
        console.error(error);
    }
});
exports.trackBonus = trackBonus;
