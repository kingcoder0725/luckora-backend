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
exports.get = exports.getBlogs = exports.deleteOne = exports.updateOne = exports.create = exports.list = exports.getOne = void 0;
const base_1 = require("../base");
const models_1 = require("../../models");
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Blogs.findOne({ _id: (0, base_1.ObjectId)(req.params.id) });
    res.json(result);
});
exports.getOne = getOne;
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { pageSize = null, page = null, status, country } = req.body;
    const query = {};
    if (status !== '' && status !== undefined) {
        query.status = status;
    }
    if (country !== '' && country !== undefined) {
        query.country = country;
    }
    const count = yield models_1.Blogs.countDocuments(query);
    if (!pageSize || !page) {
        const results = yield models_1.Blogs.find(query).sort({ type: -1 });
        res.json({ results, count });
    }
    else {
        const results = yield models_1.Blogs.find(query)
            .limit(pageSize)
            .skip((page - 1) * pageSize)
            .sort({ type: -1 });
        res.json({ results, count });
    }
});
exports.list = list;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Blogs.create(Object.assign(Object.assign({}, req.body), { auto: false }));
    res.json(result);
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Blogs.findByIdAndUpdate((0, base_1.ObjectId)(req.params.id), Object.assign(Object.assign({}, req.body), { viewers: [] }), { new: true });
    res.json(result);
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Blogs.deleteOne({
        _id: (0, base_1.ObjectId)(req.params.id)
    });
    res.json(result);
});
exports.deleteOne = deleteOne;
const getBlogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Blogs.find({ status: true }).sort({ order: 1 }).select({
        _id: 0,
        icon: 1,
        link: 1,
        name: 1
    });
    res.json(result);
});
exports.getBlogs = getBlogs;
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.Blogs.find({ status: true }).sort({ type: -1 });
        return res.json(result);
    }
    catch (error) {
        return res.status(400).json("Internal Server Error!");
    }
});
exports.get = get;
