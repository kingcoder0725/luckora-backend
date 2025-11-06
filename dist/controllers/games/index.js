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
exports.history = exports.myhistory = exports.providers = exports.getGame = exports.launchGame = exports.getDemoUrl = exports.list = exports.turn = void 0;
const base_1 = require("../base");
const keno_1 = require("./casino/keno");
const dice_1 = require("./casino/dice");
const wheel_1 = require("./casino/wheel");
const limbo_1 = require("./casino/limbo");
const plinko_1 = require("./casino/plinko");
const diamonds_1 = require("./casino/diamonds");
const roulette_1 = require("./casino/roulette");
const coinflip_1 = require("./casino/coinflip");
const blackjack_1 = require("./casino/blackjack");
const models_1 = require("../../models");
const timelesstech_1 = require("./timelesstech");
const turn = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const game = yield models_1.GameLists.findOne({ id: req.body.gameId });
    if (!(game === null || game === void 0 ? void 0 : game.status)) {
        res.status(400).json('Game is temporarily unavailable.');
        return;
    }
    const gameHandlers = {
        blackjack: blackjack_1.Blackjack,
        wheel: wheel_1.Wheel,
        coinflip: coinflip_1.Coinflip,
        diamonds: diamonds_1.Diamonds,
        dice: dice_1.Dice,
        limbo: limbo_1.Limbo,
        plinko: plinko_1.Plinko,
        keno: keno_1.Keno,
        roulette: roulette_1.Roulette
    };
    const gameId = req.body.gameId;
    const handler = gameHandlers[gameId];
    if (handler) {
        yield handler(req, res, next);
    }
    else {
        // Handle unknown game ID here
    }
});
exports.turn = turn;
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.GameLists.find({ status: true }).sort({
        status: -1,
        order: 1,
        "details.vender": 1,
        createdAt: -1,
    });
    res.json(result);
});
exports.list = list;
const getDemoUrl = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { game_code } = req.body;
        const game = yield models_1.GameLists.findOne({ api_type: "timelesstech", game_code, status: true });
        if (!game)
            return res.status(402).json("Game Link is invalid");
        if (!game.details.fun_mode)
            return res.status(402).json("Demo mode is not allowed!");
        const data = yield (0, timelesstech_1.launchTimeLessTech)({
            userCode: "fun_mode",
            game_code: game_code,
            provider: game.details.vendor,
            fun_mode: true,
        });
        if (data.status)
            return res.json(data.url);
        return res.status(400).json(data.msg);
    }
    catch (error) {
        console.error(error);
        return res.status(400).json("Internal Server Error");
    }
});
exports.getDemoUrl = getDemoUrl;

const launchGame = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { provider_code, game_code, fun_mode, currency } = req.body;
        const game = yield models_1.GameLists.findOne({ provider_code, game_code, status: true });
        if (!game)
            return res.status(402).json("Game Link is invalid");
        if (fun_mode && !!game.details.fun_mode)
            return res.status(402).json("Demo mode is not allowed!");
        // if (game.api_type === "nexusggr") {
        //     const data = await launchNexusGGR({
        //         userCode: String(req.user?._id),
        //         provider_code,
        //         game_code
        //     });
        //     if (data.status)
        //         return res.json(data.url);
        //     return res.status(400).json(data.msg);
        // }
        // if (game.api_type === "lvslot") {
        //     const data = await launchLvslot({
        //         userCode: String(req.user?._id),
        //         game_code: game_code
        //     });
        //     if (data.status)
        //         return res.json(data.url);
        //     return res.status(400).json(data.msg);
        // }
        if (game.api_type === "timelesstech") {
            const data = yield (0, timelesstech_1.launchTimeLessTech)({
                userCode: String((_a = req.user) === null || _a === void 0 ? void 0 : _a._id),
                game_code: game_code,
                provider: game.details.vendor,
                currency,
            });
            if (data.status)
                return res.json(data.url);
            return res.status(400).json(data.msg);
        }
        return res.status(400).json("Game API undefined");
    }
    catch (error) {
        console.error(error);
        return res.status(400).json("Internal Server Error");
    }
});
exports.launchGame = launchGame;

const getGame = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { game_code } = req.body;
        const game = yield models_1.GameLists.findOne({ game_code, status: true, api_type: "timelesstech" });
        if (!game)
            return res.status(402).json("Game Id is invalid");
        return res.json(game);
    }
    catch (error) {
        console.error(error);
        return res.status(400).json("Internal Server Error");
    }
});
exports.getGame = getGame;

const providers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.GameProviders.aggregate([
        { $match: { status: true } },
        {
            $lookup: {
                from: 'game_lists',
                localField: 'code',
                foreignField: 'provider_code',
                as: 'games'
            }
        },
        {
            $addFields: {
                count: { $size: '$games' }
            }
        },
        { $match: { count: { $ne: 0 } } },
        {
            $sort: {
                order: 1
            }
        }
    ]);
    res.json(result);
});
exports.providers = providers;

const getTop = async (req, res) => {
    try {
      const topGames = await models_1.TopGameLists.find().sort({ number: 1, createdAt: -1 });
      const gameCodes = topGames.map((game) => game.game_code);

      const games = await models_1.GameLists.aggregate([
        { $match: { game_code: { $in: gameCodes }, status: true } },
        {
          $lookup: {
            from: 'game_providers',
            localField: 'provider_code',
            foreignField: 'code',
            as: 'providerInfo'
          }
        },
        {
          $unwind: {
            path: '$providerInfo',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $addFields: {
            "details.vendor": { $ifNull: ["$providerInfo.name", "$provider_code"] }
          }
        },
        { $sort: { createdAt: -1 } }
      ]);
  
      const gameMap = new Map(games.map((game) => [game.game_code, game]));
  
      const results = topGames.map((topGame) => {
        const game = gameMap.get(topGame.game_code);
        return {
          _id: topGame._id,
          number: topGame.number,
          game_code: game?.game_code || "N/A",
          game_name: game?.game_name || "N/A",
          provider_code: game?.provider_code || "N/A",
          banner: game?.banner || "N/A",
          type: "casino",
          details: {
            vendor: game?.details?.vendor || "N/A",
          },
        };
      });
      res.json(results);
    } catch (error) {
      console.error("Error in getTop:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
exports.getTop = getTop;

const getFast = async (req, res) => {
    try {
      const fastGames = await models_1.FastGameLists.find().sort({ number: 1, createdAt: -1 });
      const gameCodes = fastGames.map((game) => game.game_code);
  
      const games = await models_1.GameLists.aggregate([
        { $match: { game_code: { $in: gameCodes }, status: true } },
        {
          $lookup: {
            from: 'game_providers',
            localField: 'provider_code',
            foreignField: 'code',
            as: 'providerInfo',
          },
        },
        {
          $unwind: {
            path: '$providerInfo',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            "details.vendor": { $ifNull: ["$providerInfo.name", "$provider_code"] },
          },
        },
        { $sort: { createdAt: -1 } },
      ]);
  
      const gameMap = new Map(games.map((game) => [game.game_code, game]));
  
      const results = fastGames.map((fastGame) => {
        const game = gameMap.get(fastGame.game_code);
        return {
          _id: fastGame._id,
          number: fastGame.number,
          game_code: game?.game_code || "N/A",
          game_name: game?.game_name || "N/A",
          provider_code: game?.provider_code || "N/A",
          banner: game?.banner || "N/A",
          type: "casino",
          details: {
            vendor: game?.details?.vendor || "N/A",
          },
        };
      });
      res.json(results);
    } catch (error) {
      console.error("Error in getFast:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
  
exports.getFast = getFast;

const myhistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // const date = new Date();
    // const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    // const lastDay = new Date(firstDay.getTime() + 2678400000);
    // query.createdAt = { $gte: firstDay, $lte: lastDay };
    var _b;
    const results = yield models_1.GameHistories.aggregate([
        { $match: { userId: (_b = req === null || req === void 0 ? void 0 : req.user) === null || _b === void 0 ? void 0 : _b._id } },
        {
            $lookup: {
                from: 'currencies',
                localField: 'currency',
                foreignField: '_id',
                as: 'currency'
            }
        },
        {
            $lookup: {
                from: 'game_providers',
                localField: 'provider_code',
                foreignField: 'code',
                as: 'provider'
            }
        },
        {
            $unwind: '$currency'
        },
        {
            $unwind: '$provider'
        },
        {
            $project: {
                _id: 1,
                // username: {
                //     $concat: [
                //         {
                //             $substrCP: ['$user.username', 0, 2]
                //         },
                //         '**********'
                //     ]
                // },
                currency: '$currency.icon',
                provider: {
                    name: '$provider.name'
                },
                user_balance: 1,
                game_type: 1,
                provider_code: 1,
                game_code: 1,
                bet_money: 1,
                win_money: 1,
                refund_money: 1,
                txn_id: 1,
                txn_type: 1,
                createdAt: 1,
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        // { $limit: perPage }
    ]);
    const data = yield Promise.all(results.map((row) => __awaiter(void 0, void 0, void 0, function* () {
        const game = yield models_1.GameLists.findOne({ provider_code: row.provider_code, game_code: row.game_code });
        return Object.assign(Object.assign({}, row), { game: { name: game === null || game === void 0 ? void 0 : game.game_name, icon: game === null || game === void 0 ? void 0 : game.banner } });
    })));
    res.json(data);
});
exports.myhistory = myhistory;
const history = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { perPage = 10, type = 1, userId = null } = req.body;
    const query = {
        status: { $ne: 'BET' }
    };
    if (type === 0 && userId) {
        query.userId = (0, base_1.ObjectId)(userId);
    }
    if (type === 1) {
        res.json([]);
        return;
    }
    if (!userId) {
        const date = new Date();
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const lastDay = new Date(firstDay.getTime() + 2678400000);
        query.createdAt = { $gte: firstDay, $lte: lastDay };
    }
    const results = yield models_1.Games.aggregate([
        { $match: query },
        {
            $lookup: {
                from: 'currencies',
                localField: 'currency',
                foreignField: '_id',
                as: 'currency'
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user'
            }
        },
        {
            $lookup: {
                from: 'game_lists',
                localField: 'gameId',
                foreignField: '_id',
                as: 'game'
            }
        },
        {
            $unwind: '$currency'
        },
        {
            $unwind: '$game'
        },
        {
            $unwind: '$user'
        },
        {
            $project: {
                _id: 1,
                username: {
                    $concat: [
                        {
                            $substrCP: ['$user.username', 0, 2]
                        },
                        '**********'
                    ]
                },
                currency: '$currency.icon',
                game: {
                    icon: '$game.icon',
                    name: '$game.name'
                },
                amount: 1,
                profit: 1,
                status: 1,
                createdAt: 1
            }
        },
        {
            $sort: { createdAt: -1 }
        },
        { $limit: perPage }
    ]);
    res.json(results);
});
exports.history = history;
