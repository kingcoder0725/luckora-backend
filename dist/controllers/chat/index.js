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
exports.settings = exports.getSettings = exports.getMessages = void 0;
const chat_1 = require("../../models/chat");
const translate_1 = require("../../utils/translate");
const getMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const lang = req.body.lang || 'EN';
        // const date = req.body.date ? new Date(req.body.date as string) : new Date();
        // const startOfDayUTC = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
        // const endOfDayUTC = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59));
        const messages = yield chat_1.ChatMessage.find();
        // .limit(limit);
        let translatedMessages = messages;
        if (lang) {
            translatedMessages = yield Promise.all(messages.map((message) => __awaiter(void 0, void 0, void 0, function* () {
                const translatedText = yield (0, translate_1.translateText)(message.text, lang);
                return Object.assign(Object.assign(Object.assign({}, message.toObject()), (translatedText.length > 0 && {
                    text: translatedText[0].text
                })), { user: {
                        username: message.userId.username,
                        avatar: message.userId.avatar,
                        role: message.userId.rolesId.title
                    }, userId: message.userId._id });
            })));
        }
        res.status(200).json(translatedMessages);
    }
    catch (error) {
        console.error('Error via get sms:', error);
        res.status(500).send({ error: 'Error fetching messages' });
    }
});
exports.getMessages = getMessages;
const getSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const data = yield chat_1.ChatSettings.find();
        if (!data.length)
            return res.json({ display_day: 0, blockword: '' });
        const display_day = ((_a = data.find((e) => e.key === 'display_day')) === null || _a === void 0 ? void 0 : _a.value) || 0;
        const blockword = ((_b = data.find((e) => e.key === 'blockword')) === null || _b === void 0 ? void 0 : _b.value) || '';
        return res.json({ display_day, blockword });
    }
    catch (err) {
        console.error('Error via settings:', err);
        res.status(500).send({ error: 'Internale Server Error' });
    }
});
exports.getSettings = getSettings;
const settings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { display_day, blockword } = req.body;
        for (const key in req.body) {
            yield chat_1.ChatSettings.updateOne({ key }, { value: req.body[key] }, { new: true, upsert: true });
        }
        return res.json('success');
    }
    catch (err) {
        console.error('Error via settings:', err);
        res.status(500).send({ error: 'Internale Server Error' });
    }
});
exports.settings = settings;
