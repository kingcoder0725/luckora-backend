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
exports.getFreeSpinLimits = exports.deleteOne = exports.updateOne = exports.create = exports.list = exports.getCampaignGames = exports.getCampaignCurrencies = exports.getOne = void 0;
const base_1 = require("../base");
const models_1 = require("../../models");
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.FreeSpinLimits.findOne({ _id: (0, base_1.ObjectId)(req.params.id) });
        return res.json(result);
    }
    catch (error) {
        console.error("Error getOne : ", error);
        return res.status(500).json("Internal Server Error");
    }
});
exports.getOne = getOne;
const getCampaignCurrencies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { currencies } = req.body;
        const result = yield models_1.CampaignLimits.aggregate([
            {
                $match: {
                    currency_code: { $nin: currencies }
                }
            },
            {
                $group: {
                    _id: { currency_code: '$currency_code' },
                }
            },
            {
                $lookup: {
                    from: 'currencies',
                    localField: '_id.currency_code',
                    foreignField: 'symbol',
                    as: 'currency'
                }
            },
            {
                $unwind: "$currency"
            },
            {
                $sort: {
                    "_id.currency_code": 1,
                }
            },
            {
                $project: {
                    icon: '$currency.icon',
                    label: '$_id.currency_code',
                    value: '$_id.currency_code',
                }
            }
        ]);
        return res.json(result);
    }
    catch (error) {
        console.error("Error getCampaignCurrencies : ", error);
        return res.status(500).json("Internal Server Error");
    }
});
exports.getCampaignCurrencies = getCampaignCurrencies;
const getCampaignGames = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { currency } = req.body;
        const result = yield models_1.CampaignLimits.aggregate([
            {
                $match: {
                    currency_code: currency,
                }
            },
            {
                $lookup: {
                    from: 'game_lists',
                    localField: 'game_code',
                    foreignField: 'game_code',
                    as: 'game'
                }
            },
            {
                $unwind: {
                    path: '$game',
                }
            },
            {
                $sort: {
                    "game.details.vendor": 1,
                }
            },
            {
                $project: {
                    value: '$game_code',
                    label: { $concat: ['$game.game_name', '(', '$game.details.vendor', ')'] },
                    vendor: `$game.details.vendor`,
                    game_name: '$game.game_name',
                    limits: 1,
                    icon: '$game.banner',
                    'game.details': 1,
                }
            }
        ]);
        return res.json(result);
    }
    catch (error) {
        console.error("Error getCampaignGames : ", error);
        return res.status(500).json("Internal Server Error");
    }
});
exports.getCampaignGames = getCampaignGames;
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { pageSize = null, page = null, status, country } = req.body;
        const query = {};
        if (status !== '' && status !== undefined) {
            query.status = status;
        }
        if (country !== '' && country !== undefined) {
            query.country = country;
        }
        const count = yield models_1.FreeSpinLimits.countDocuments(query);
        if (!pageSize || !page) {
            const results = yield models_1.FreeSpinLimits.aggregate([
                {
                    $lookup: {
                        from: 'currencies',
                        localField: 'currency',
                        foreignField: 'symbol',
                        as: 'currency'
                    }
                },
                {
                    $unwind: {
                        path: '$currency',
                    }
                },
                {
                    $lookup: {
                        from: 'game_lists',
                        localField: 'game_code',
                        foreignField: 'game_code',
                        as: 'game'
                    }
                },
                {
                    $unwind: {
                        path: '$game',
                    }
                },
                {
                    $sort: {
                        "game.details.vendor": 1,
                    }
                },
                {
                    $project: {
                        currency: '$currency.symbol',
                        currency_icon: '$currency.icon',
                        game_code: '$game.game_code',
                        game_name: '$game.game_name',
                        game_icon: '$game.banner',
                        max_bet: 1,
                    }
                }
            ]);
            return res.json({ results, count });
        }
        else {
            const results = yield models_1.FreeSpinLimits.aggregate([
                { $match: query },
                {
                    $lookup: {
                        from: 'currencies',
                        localField: 'currency',
                        foreignField: 'symbol',
                        as: 'currency'
                    }
                },
                {
                    $unwind: {
                        path: '$currency',
                    }
                },
                {
                    $lookup: {
                        from: 'game_lists',
                        localField: 'game_code',
                        foreignField: 'game_code',
                        as: 'game'
                    }
                },
                {
                    $unwind: {
                        path: '$game',
                    }
                },
                {
                    $sort: {
                        "game.details.vendor": 1,
                    }
                },
                {
                    $project: {
                        currency: '$currency.symbol',
                        currency_icon: '$currency.icon',
                        game_code: '$game.game_code',
                        game_name: '$game.game_name',
                        game_icon: '$game.banner',
                        max_bet: 1,
                    }
                },
                { $limit: pageSize },
                { $skip: (page - 1) * pageSize }
            ]);
            return res.json({ results, count });
        }
    }
    catch (error) {
        console.error("Error Freespin Limit List : ", error);
        return res.status(500).json("Internal Server Error");
    }
});
exports.list = list;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.FreeSpinLimits.create(req.body);
        return res.json(result);
    }
    catch (error) {
        console.error("Error Freespin create : ", error);
        return res.status(500).json("Internal Server Error");
    }
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.FreeSpinLimits.findByIdAndUpdate((0, base_1.ObjectId)(req.params.id), Object.assign(Object.assign({}, req.body), { viewers: [] }), { new: true });
        res.json(result);
    }
    catch (error) {
        console.error("Error Freespin updateOne : ", error);
        return res.status(500).json("Internal Server Error");
    }
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.FreeSpinLimits.deleteOne({
            _id: (0, base_1.ObjectId)(req.params.id)
        });
        return res.json(result);
    }
    catch (error) {
        console.error("Error Freespin deleteOne : ", error);
        return res.status(500).json("Internal Server Error");
    }
});
exports.deleteOne = deleteOne;
const getFreeSpinLimits = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.FreeSpinLimits.find();
        return res.json(result);
    }
    catch (error) {
        console.error("Error Freespin getFreeSpinLimits : ", error);
        return res.status(500).json("Internal Server Error");
    }
});
exports.getFreeSpinLimits = getFreeSpinLimits;
