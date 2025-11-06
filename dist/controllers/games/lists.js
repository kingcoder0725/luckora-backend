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
exports.getCampaignsLabel = exports.deleteOne = exports.updateMany = exports.updateOne = exports.create = exports.label = exports.list = exports.getOne = exports.get = void 0;
const base_1 = require("../base");
const models_1 = require("../../models");
const mongoose_1 = require("mongoose");
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.GameLists.find().sort({ status: -1, order: 1, createdAt: -1 });
    res.json(result);
});
exports.get = get;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.GameLists.findOne({
        _id: (0, base_1.ObjectId)(req.params.id),
    });
    res.json(result);
});
exports.getOne = getOne;


const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { pageSize = null, page = null, api_type = null, provider_code, game_name, search = '' } = req.body;
    let query = {
        api_type: 'timelesstech',
    };
    if (api_type) {
        query['api_type'] = api_type;
    }
    if (provider_code) {
        query['provider_code'] = provider_code;
    }
    if (game_name) {
        const regex = new RegExp(game_name, 'i');
        query['game_name'] = { $regex: regex };
    }

   
    if (search) {
        query = Object.assign(Object.assign({}, query), { $or: [
                { game_name: { $regex: search, $options: 'i' } },
                { game_code: { $regex: search, $options: 'i' } },
                { provider_code: { $regex: search, $options: 'i' } },
                { api_type: { $regex: search, $options: 'i' } },
                // Check for valid ObjectId before searching in `_id`
                ...(mongoose_1.default.Types.ObjectId.isValid(search) ? [{ _id: new mongoose_1.default.Types.ObjectId(search) }] : []),
            ] });
    }
    const count = yield models_1.GameLists.countDocuments(query);
    if (!pageSize || !page) {
        const results = yield models_1.GameLists.find(query).sort({ status: -1, order: 1, createdAt: -1 });
        res.json({ results, count });
    }
    else {
        const results = yield models_1.GameLists.find(query)
            .limit(pageSize)
            .skip((page - 1) * pageSize)
            .sort({ status: -1, order: 1, createdAt: -1 });
        res.json({ results, count });
    }
});
exports.list = list;


const label = async (req, res) => {
    try {
      const { gamecode = false, pageSize = 10000, page = 1, search = "", provider_code = "" } = req.body;
      let query = { status: true };

      if (search) {
        query.game_name = { $regex: search, $options: "i" };
      }
      if (provider_code) {
        query.provider_code = provider_code;
      }

      const games = await models_1.GameLists.find(query)
        .sort({ game_name: 1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize);

      let results;
      if (gamecode) {
        results = games.map((game) => ({
          label: game.game_name || "N/A",
          value: game.game_code || "N/A",
        }));
      } else {
        results = games.map((game) => ({
          label: game.game_name || "N/A",
          value: game._id || "N/A",
        }));
      }

      res.json(results);
    } catch (error) {
      console.error("Error in label:", error);
      res.status(500).json({ error: "Internal server error" });
    }
};

exports.label = label;


const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.GameLists.create(req.body);
    res.json(result);
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.GameLists.findByIdAndUpdate((0, base_1.ObjectId)(req.params.id), req.body, { new: true });
    res.json(result);
});
exports.updateOne = updateOne;
const updateMany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.GameLists.insertMany(req.body);
    res.json(result);
});
exports.updateMany = updateMany;

const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.GameLists.deleteOne({ _id: (0, base_1.ObjectId)(req.params.id) });
    res.json(result);
});
exports.deleteOne = deleteOne;


const getCampaignsLabel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // const ALLOW_PROVIDERS = ["pragmatic", "pragmatic-virtual", "evoplay", "gamzix", "redrake", "amigogaming", "mancala", "3oaks", "booming", "egtdigital", "hacksaw", "pateplay", "platingaming",];
        const result = yield models_1.CampaignLimits.aggregate([
            {
                $group: {
                    _id: { game_code: '$game_code' },
                    currencies: { $push: '$currency_code' },
                },
            },
            {
                $lookup: {
                    from: 'game_lists',
                    localField: '_id.game_code',
                    foreignField: 'game_code',
                    as: 'game',
                },
            },
            {
                $unwind: {
                    path: '$game',
                    // preserveNullAndEmptyArrays: true
                },
            },
            {
                $sort: {
                    'game.details.vendor': 1,
                },
            },
            {
                $project: {
                    value: '$_id.game_code',
                    label: { $concat: ['$game.game_name', '(', '$game.details.vendor', ')'] },
                    vendor: `$game.details.vendor`,
                    currencies: 1,
                    game_name: '$game.game_name',
                    banner: '$game.banner',
                    'game.details': 1,
                },
            },
        ]);
        return res.json(result);
    }
    catch (error) {
        console.error('Error getCampaignsLabel => ', error);
        return res.status(500).json('Internal server error');
    }
});
exports.getCampaignsLabel = getCampaignsLabel;
