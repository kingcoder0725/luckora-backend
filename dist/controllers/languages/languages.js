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
exports.translate = exports.deleteOne = exports.updateMany = exports.update = exports.getOne = exports.create = exports.get = void 0;
const base_1 = require("../base");
const models_1 = require("../../models");
const translate_1 = require("../../utils/translate");
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield models_1.Language.find();
    res.json(data);
});
exports.get = get;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Language.create(req.body);
    res.json(result);
});
exports.create = create;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Language.findById((0, base_1.ObjectId)(req.params.id));
    res.json(result);
});
exports.getOne = getOne;
const update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Language.findByIdAndUpdate((0, base_1.ObjectId)(req.params.id), req.body, { new: true });
    res.json(result);
});
exports.update = update;
const updateMany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Language.insertMany(req.body);
    res.json(result);
});
exports.updateMany = updateMany;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Language.deleteOne({ _id: (0, base_1.ObjectId)(req.params.id) });
    res.json(result);
});
exports.deleteOne = deleteOne;
const translate = (req, res) =>
    __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { text, target } = req.body;
            const translatedTexts = yield (0, translate_1.translateText)(text, target);
            if (!translatedTexts || !translatedTexts.length) {
                return res.status(500).json('Translate Api Error');
            }
            const results = translatedTexts.map((e) => e.text);
            return res.json(results.length > 0 ? results : text);
        } catch (error) {
            console.error('Error Language Translate:', error);
            return res.status(500).json('Internal Server Error');
        }
    });
exports.translate = translate;

