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
exports.play = exports.get = exports.getSpinwheels = exports.deleteOne = exports.updateOne = exports.create = exports.list = exports.getOne = void 0;
const moment = require("moment");
const base_1 = require("../base");
const models_1 = require("../../models");
const timelesstech_1 = require("../games/timelesstech");
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.Spinwheels.findOne({ _id: (0, base_1.ObjectId)(req.params.id) });
        return res.json(result);
    }
    catch (error) {
        console.error("Error Spinwheel getOne : ", error);
        return res.status(500).json("Internal Server Error");
    }
});
exports.getOne = getOne;
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
        const count = yield models_1.Spinwheels.countDocuments(query);
        const results = yield models_1.Spinwheels.find(query);
        return res.json({ results, count });
    }
    catch (error) {
        console.error("Error Spinwheel deleteOne : ", error);
        return res.status(500).json("Internal Server Error");
    }
});
exports.list = list;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.Spinwheels.create(req.body);
        return res.json(result);
    }
    catch (error) {
        console.error("Error Spinwheel deleteOne : ", error);
        return res.status(500).json("Internal Server Error");
    }
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.Spinwheels.findByIdAndUpdate((0, base_1.ObjectId)(req.params.id), Object.assign(Object.assign({}, req.body), { viewers: [] }), { new: true });
        return res.json(result);
    }
    catch (error) {
        console.error("Error Spinwheel deleteOne : ", error);
        return res.status(500).json("Internal Server Error");
    }
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.Spinwheels.deleteOne({
            _id: (0, base_1.ObjectId)(req.params.id)
        });
        return res.json(result);
    }
    catch (error) {
        console.error("Error Spinwheel deleteOne : ", error);
        return res.status(500).json("Internal Server Error");
    }
});
exports.deleteOne = deleteOne;

const getSpinwheels = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.Spinwheels.find({ status: true });
        return res.json(result);
    }
    catch (error) {
        console.error("Error Spinwheel deleteOne : ", error);
        return res.status(500).json("Internal Server Error");
    }
});
exports.getSpinwheels = getSpinwheels;

const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.Spinwheels.find({ status: true });
        return res.json(result);
    }
    catch (error) {
        return res.status(400).json('Internal Server Error!');
    }
});
exports.get = get;

const play = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req === null || req === void 0 ? void 0 : req.user;
        if (!user)
            return res.status(402).json(`User not found!`);

        const isJourney = req.body.journey === true;
        console.log('Received play request with journey:', isJourney);

        if (!isJourney && user.last_spin) {
            return res.status(402).json("You have already used your one-time Spin Wheel!");
        }

        const balance = yield models_1.Balances.findOne({ status: true, userId: user._id });
        if (!balance)
            return res.status(402).json(`Balance is not found!`);

        const spinLimit = yield models_1.FreeSpinLimits.aggregate([
            {
                $match: {
                    currency: balance.currency.symbol
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
                $unwind: '$game',
            },
            {
                $project: {
                    game_code: 1,
                    max_bet: 1,
                    "game.game_name": 1,
                    "game.game_code": 1,
                    "game.provider_code": 1,
                }
            }
        ]);

        if (!spinLimit.length)
            return res.status(402).json(`Freespin Game is not found!`);

        const spinOptions = yield models_1.Spinwheels.find({ status: true, type: "freespin" });
        const randomSpin = Math.floor(Math.random() * 1000) % spinOptions.length;
        const spin = spinOptions[randomSpin];
        if (!spin)
            return res.status(402).json(`Plz retry!`);

        if (!isJourney) {
            yield models_1.Users.findByIdAndUpdate(user._id, {
                last_spin: Date.now()
            }, {
                new: true,
                upsert: true
            });
        }

        console.log(spinLimit, "==>spin");
        res.json({ spinIndex: randomSpin, game: spinLimit[0].game, lastSpinDate: Date.now(), isJourney });

        const expires_at = moment().add(1, 'day').valueOf();
        return yield (0, timelesstech_1.createCampaign)([spinLimit[0].game_code], String(user._id), spin.amount, new Date(expires_at), "Freespin", spinLimit[0].max_bet);
    } catch (error) {
        console.error(error);
        return res.status(400).json('Internal server error.');
    }
});
exports.play = play;
