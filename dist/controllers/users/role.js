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
exports.deleteOne = exports.updateOne = exports.create = exports.label = exports.list = exports.getOne = exports.get = void 0;
const base_1 = require("../base");
const models_1 = require("../../models");
const mongoose_1 = require("mongoose");
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Roles.find();
    res.json(result);
});
exports.get = get;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Roles.findOne({ _id: (0, base_1.ObjectId)(req.params.id) });
    res.json(result);
});
exports.getOne = getOne;
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { pageSize = null, page = null, search = '' } = req.body;
    let query = {
        type: { $ne: 'super_admin' },
    };
    if (req.user && req.user.rolesId.type === 'admin') {
        query.type = 'agent';
    }
    if (req.user && req.user.rolesId.type === 'agent') {
        query.type = 'player';
    }
    if (search) {
        query = Object.assign(Object.assign({}, query), { $or: [
                { title: { $regex: search, $options: 'i' } },
                { url: { $regex: search, $options: 'i' } },
                // Check for valid ObjectId before searching in `_id`
                ...(mongoose_1.default.Types.ObjectId.isValid(search) ? [{ _id: new mongoose_1.default.Types.ObjectId(search) }] : []),
            ] });
    }
    const count = yield models_1.Roles.countDocuments(query);
    if (!pageSize || !page) {
        const results = yield models_1.Roles.find(query).sort({ order: 1 });
        res.json({ results, count });
    }
    else {
        const results = yield models_1.Roles.find(query)
            .limit(pageSize)
            .skip((page - 1) * pageSize)
            .sort({ order: 1 });
        res.json({ results, count });
    }
});
exports.list = list;
const label = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const me = req.user;
        const query = {
            type: { $ne: 'super_admin' },
        };
        if (me && me.rolesId.type === 'admin') {
            query.type = 'agent';
        }
        if (me && me.rolesId.type === 'agent') {
            query.type = 'player';
        }
        const results = yield models_1.Roles.aggregate([
            { $match: query },
            {
                $project: {
                    label: { $concat: ['$title', ' (', '$type', ')'] },
                    type: '$type',
                    value: '$_id',
                    _id: 0,
                },
            },
            {
                $sort: {
                    order: 1,
                },
            },
        ]);
        return res.json(results);
    }
    catch (error) {
        console.error('Error Role Label=>', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.label = label;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = req.body;
        const me = req.user;
        if (me && me.rolesId.type === 'admin') {
            query.type = 'agent';
        }
        const result = yield models_1.Roles.create(query);
        return res.json(result);
    }
    catch (error) {
        console.error('Error create Role =>', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = req.body;
        const me = req.user;
        if (me && me.rolesId.type === 'admin') {
            query.type = 'agent';
        }
        const result = yield models_1.Roles.findByIdAndUpdate((0, base_1.ObjectId)(req.params.id), query, { new: true });
        return res.json(result);
    }
    catch (error) {
        console.error('Error updateOne Role =>', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Roles.deleteOne({
        _id: (0, base_1.ObjectId)(req.params.id),
    });
    res.json(result);
});
exports.deleteOne = deleteOne;
