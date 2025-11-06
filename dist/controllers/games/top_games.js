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
exports.get = exports.getOne = exports.list = exports.label = exports.create = exports.updateOne = exports.deleteOne = void 0;
const base_1 = require("../base");
const models_1 = require("../../models");

const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
  try {
    const topGames = yield models_1.TopGameLists.find().sort({ number: 1, createdAt: -1 });
    const gameCodes = topGames.map((game) => game.game_code);
    const games = yield models_1.GameLists.find({ game_code: { $in: gameCodes } }).sort({ createdAt: -1 });
    res.json(
      games.map((game, index) => ({
        _id: topGames[index]._id,
        number: topGames[index].number,
        game_code: game.game_code,
        game_name: game.game_name,
        provider_code: game.provider_code,
        banner: game.banner,
      }))
    );
  } catch (error) {
    console.error("Error in get:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
exports.get = get;

const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
  try {
    if (!base_1.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    const topGame = yield models_1.TopGameLists.findOne({ _id: base_1.ObjectId(req.params.id) });
    if (!topGame) {
      return res.status(404).json({ error: "Top game not found" });
    }
    const game = yield models_1.GameListsGameLists.findOne({ game_code: topGame.game_code });
    if (!game) {
      return res.status(404).json({ error: "Game not found in GameLists" });
    }
    res.json({
      _id: topGame._id,
      number: topGame.number,
      game_code: game.game_code,
      game_name: game.game_name,
      provider_code: game.provider_code,
      banner: game.banner,
    });
  } catch (error) {
    console.error("Error in getOne:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
exports.getOne = getOne;

const replaceInvalid = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
  try {
    const { number, game_code } = req.body;
    const gameExists = yield models_1.GameLists.findOne({ game_code });
    if (!gameExists) {
      return res.status(400).json({ error: "Invalid game_code" });
    }
    const result = yield models_1.TopGameLists.findOneAndUpdate(
      { number, game_code: "N/A" },
      { game_code },
      { new: true }
    );
    if (!result) {
      return res.status(404).json({ error: "No invalid entry found for this number" });
    }
    res.json(result);
  } catch (error) {
    console.error("Error in replaceInvalid:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
exports.replaceInvalid = replaceInvalid;

const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
  try {
    const { pageSize = 10, page = 1, game_code = "" } = req.body;
    const query = game_code.trim() ? { game_code } : {};
    console.log("list called with body:", req.body);

    const topGames = yield models_1.TopGameLists.find(query)
      .sort({ number: 1, createdAt: -1 })
      .limit(pageSize)
      .skip((page - 1) * pageSize);
    const count = yield models_1.TopGameLists.countDocuments(query);

    const gameCodes = topGames.map((game) => game.game_code);
    const games = yield models_1.GameLists.find({ game_code: { $in: gameCodes } }).sort({ createdAt: -1 });

    // Create a map for faster lookup
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
      };
    });
    console.log("list response:", { results, count });
    res.json({ results, count });
  } catch (error) {
    console.error("Error in list:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

exports.list = list;

const label = async (req, res) => {
  try {
    const { gamecode = false, pageSize = 100, page = 1, search = "" } = req.body;
    let query = {};
    if (search) {
      query.game_code = { $regex: search, $options: "i" };
    }
    const topGames = await models_1.TopGameLists.find(query)
      .sort({ number: 1, createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    const gameCodes = topGames.map((game) => game.game_code);

    const games = await models_1.GameLists.find({ game_code: { $in: gameCodes }, status: true })
      .sort({ game_name: 1 });

    const gameMap = new Map(games.map((game) => [game.game_code, game]));

    let results;
    if (gamecode) {
      results = topGames.map((topGame) => {
        const game = gameMap.get(topGame.game_code);
        return {
          label: game?.game_name || "N/A",
          value: game?.game_code || "N/A",
        };
      });
    } else {
      results = topGames.map((topGame) => {
        const game = gameMap.get(topGame.game_code);
        return {
          label: game?.game_name || "N/A",
          value: game?._id || "N/A",
        };
      });
    }
    res.json(results);
  } catch (error) {
    console.error("Error in label:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
exports.label = label;

const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
  try {
    const { number, game_code } = req.body;
    if (!number || !game_code) {
      return res.status(400).json({ error: "Number and game_code are required" });
    }
    const gameExists = yield models_1.GameLists.findOne({ game_code });
    if (!gameExists) {
      return res.status(400).json({ error: "Invalid game_code" });
    }
    const existingNumber = yield models_1.TopGameLists.findOne({ number });
    if (existingNumber) {
      return res.status(400).json({ error: "Number already exists" });
    }
    const existingGameCode = yield models_1.TopGameLists.findOne({ game_code });
    if (existingGameCode) {
      return res.status(400).json({ error: "Game code already assigned to another number" });
    }
    const result = yield models_1.TopGameLists.create({ number, game_code });
    res.json(result);
  } catch (error) {
    console.error("Error in create:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
exports.create = create;

const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.TopGameLists.findByIdAndUpdate((0, base_1.ObjectId)(req.params.id), req.body, { new: true });
    res.json(result);
});
exports.updateOne = updateOne;

const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.TopGameLists.deleteOne({ _id: (0, base_1.ObjectId)(req.params.id) });
    res.json(result);
});
exports.deleteOne = deleteOne;