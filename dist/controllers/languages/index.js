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
exports.deleteWord = exports.updateWord = exports.updateWords = exports.getWords = exports.getWord = exports.Word = exports.getLanguage = void 0;
const models_1 = require("../../models");
const getLanguage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const results = yield models_1.Language.find().select({
        value: 1,
        label: 1,
        _id: 0
    });
    res.json(results);
});
exports.getLanguage = getLanguage;
const Word = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const results = {};
    const words = yield models_1.LanguageWord.find()
        .select({ key: 1, [req.body.id]: 1, _id: 0 })
        .sort({ key: 1 });
    for (const i in words) {
        results[words[i].key] = words[i][req.body.id];
    }
    res.json(results);
});
exports.Word = Word;
const getWord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.LanguageWord.find()
        .select({ key: 1, [req.params.id]: 1, _id: 0 })
        .sort({ key: 1 });
    res.json(result);
});
exports.getWord = getWord;
const getWords = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const array = {};
    const keys = yield models_1.Language.find().select({ value: 1, _id: 0 });
    for (const i in keys) {
        const data = yield models_1.LanguageWord.find()
            .select({ [keys[i].value]: 1, key: 1, _id: 0 })
            .sort({ key: 1 });
        const result = {};
        for (const j in data) {
            result[data[j].key] = data[j][keys[i].value];
        }
        array[keys[i].value] = result;
    }
    res.json(array);
});
exports.getWords = getWords;
const updateWords = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = req.body;
    const insertData = [];
    for (const lng in data) {
        for (const key in data[lng]) {
            if (lng === 'en') {
                insertData.push({ key: key, [lng]: data[lng][key] });
            }
            else {
                insertData[insertData.findIndex((e) => e.key === key)][lng] = data[lng][key];
            }
        }
    }
    const result1 = yield models_1.LanguageWord.insertMany(insertData);
    res.json(result1);
});
exports.updateWords = updateWords;
const updateWord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { string, key } = req.body;
    const id = req.params.id;
    const result = yield models_1.LanguageWord.findOneAndUpdate({ key: key }, { [id]: string }, { new: true, upsert: true }).select({
        key: 1,
        [id]: 1,
        _id: 0
    });
    res.json(result);
});
exports.updateWord = updateWord;
const deleteWord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.LanguageWord.deleteOne({ key: req.params.id });
    res.json(result);
});
exports.deleteWord = deleteWord;
