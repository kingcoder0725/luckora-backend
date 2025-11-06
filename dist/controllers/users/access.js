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
exports.deleteOne = exports.updateOne = exports.list = exports.create = exports.get = void 0;
const base_1 = require("../base");
const models_1 = require("../../models");
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Access.find({ status: true });
    res.json(result);
});
exports.get = get;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { url } = req.body;
    let result = [];
    for (const key in url) {
        const element = url[key];
        const resEle = yield models_1.Access.findOneAndUpdate({ url: element }, Object.assign(Object.assign({}, req.body), { url: element }), { new: true, upsert: true });
        result = [...result, resEle];
    }
    res.json(result);
});
exports.create = create;
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { pageSize = null, page = null } = req.body;
    const query = {};
    const count = yield models_1.Access.countDocuments(query);
    if (!pageSize || !page) {
        const results = yield models_1.Access.find(query);
        res.json({ results, count });
    }
    else {
        const results = yield models_1.Access.find(query)
            .limit(pageSize)
            .skip((page - 1) * pageSize);
        res.json({ results, count });
    }
});
exports.list = list;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Access.findByIdAndUpdate((0, base_1.ObjectId)(req.params.id), req.body, { new: true });
    res.json(result);
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Access.deleteOne({
        _id: (0, base_1.ObjectId)(req.params.id)
    });
    res.json(result);
});
exports.deleteOne = deleteOne;
