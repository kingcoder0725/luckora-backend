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
exports.translateText = void 0;
const axios_1 = require("axios");

const DEEPL_API_URL = process.env.DEEPL_API_URL;
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;

const translateText = (text, targetLang) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const textArray = Array.isArray(text) ? text : [text];
        
        const response = yield axios_1.default.post(DEEPL_API_URL, {
            text: textArray,
            target_lang: targetLang
        }, {
            headers: {
                'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data.translations;
    }
    catch (error) {
        console.error('Error translating:', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error, text.length, targetLang);
        return "";
    }
});
exports.translateText = translateText;