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
exports.deleteOne = exports.updateOne = exports.create = exports.label = exports.list = exports.getOne = exports.get = exports.init = void 0;
const axios_1 = require("axios");
const base_1 = require("../base");
const models_1 = require("../../models");
const mongoose_1 = require("mongoose");
const NOW_PAYMENT_API = process.env.NOW_PAYMENT_API;
const NOW_PAYMENT_API_KEY = process.env.NOW_PAYMENT_API_KEY;
const DefaultCurrencies = [1, 15, 2, 133, 30, 52, 22];
const formatCurrencyData = (data) => {
    return {
        id: data.id,
        name: data.name,
        symbol: data.code,
        icon: `https://nowpayments.io${data.logo_url}`,
        payment: data.code,
        coingecko: data.cg_id,
        contractAddress: data.smart_contract,
        network: data.network,
        status: DefaultCurrencies.includes(data.id),
    };
};
const init = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('////////');
        const data = yield axios_1.default.get(`${NOW_PAYMENT_API}/v1/full-currencies`, {
            headers: {
                'x-api-key': NOW_PAYMENT_API_KEY,
            },
        });
        if (!(data === null || data === void 0 ? void 0 : data.data))
            return res.json('NOW API ERROR!');
        const { currencies } = data.data;
        const query = currencies.map((row) => formatCurrencyData(row));
        yield models_1.Currencies.deleteMany();
        yield models_1.Currencies.insertMany(query);
        return res.json('success');
    }
    catch (error) {
        console.error(error);
        return res.json('failed');
    }
});
exports.init = init;
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Currencies.find().sort({ status: -1, createdAt: -1 });
    res.json(result);
});
exports.get = get;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Currencies.findOne({ _id: (0, base_1.ObjectId)(req.params.id) });
    res.json(result);
});
exports.getOne = getOne;
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { pageSize = null, page = null, search = '' } = req.body;
    let query = {};
    if (search) {
        query = Object.assign(Object.assign({}, query), { $or: [
                { name: { $regex: search, $options: 'i' } },
                { symbol: { $regex: search, $options: 'i' } },
                // Check for valid ObjectId before searching in `_id`
                ...(mongoose_1.default.Types.ObjectId.isValid(search) ? [{ _id: new mongoose_1.default.Types.ObjectId(search) }] : []),
            ] });
    }
    const count = yield models_1.Currencies.countDocuments(query);
    if (Object.keys(req.body).includes('isFiat'))
        query.isFiat = req.body.isFiat;
    if (!pageSize || !page) {
        const results = yield models_1.Currencies.find(query).sort({
            status: -1,
            order: 1,
            createdAt: -1,
        });
        res.json({ results, count });
    }
    else {
        const results = yield models_1.Currencies.find(query)
            .limit(pageSize)
            .skip((page - 1) * pageSize)
            .sort({ status: -1, order: 1, createdAt: -1 });
        res.json({ results, count });
    }
});
exports.list = list;
const label = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = { status: true };
    if (Object.keys(req.body).includes('isFiat'))
        query.isFiat = req.body.isFiat;
    const results = yield models_1.Currencies.aggregate([
        {
            $match: query,
        },
        {
            $project: {
                label: '$symbol',
                value: '$_id',
                isFiat: '$isFiat',
                icon: '$icon',
                _id: 0,
            },
        },
        {
            $sort: {
                isFiat: 1,
                label: 1,
            },
        },
    ]);
    res.json(results);
});
exports.label = label;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Currencies.create(req.body);
    res.json(result);
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Currencies.findByIdAndUpdate((0, base_1.ObjectId)(req.params.id), req.body, { new: true });
    res.json(result);
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Currencies.deleteOne({ _id: (0, base_1.ObjectId)(req.params.id) });
    res.json(result);
});
exports.deleteOne = deleteOne;
