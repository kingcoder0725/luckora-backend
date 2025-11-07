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
exports.deleteOne = exports.updateOne = exports.create = exports.list = exports.getOne = exports.get = void 0;
const base_1 = require("../base");
const models_1 = require("../../models");
const mongoose_1 = require("mongoose");
const sendgrid_1 = require("../../utils/sendgrid");
const twilio_1 = require("../../utils/twilio");
const MARKETING_EMAIL = process.env.MARKETING_EMAIL;
const APP_NAME = process.env.APP_NAME;
const SENDER_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const DOMAIN = process.env.DOMAIN;
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Marketing.find();
    res.json(result);
});
exports.get = get;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Marketing.findOne({ _id: (0, base_1.ObjectId)(req.params.id) });
    res.json(result);
});
exports.getOne = getOne;
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { pageSize = null, page = null, search = null } = req.body;
    const query = {};
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            ...(mongoose_1.default.Types.ObjectId.isValid(search) ? [{ _id: new mongoose_1.default.Types.ObjectId(search) }] : []),
        ];
    }
    const count = yield models_1.Marketing.countDocuments(query);
    if (!pageSize || !page) {
        const results = yield models_1.Marketing.find(query).sort({ createdAt: -1 });
        res.json({ results, count });
    }
    else {
        const results = yield models_1.Marketing.find(query)
            .limit(pageSize)
            .skip((page - 1) * pageSize)
            .sort({ createdAt: -1 });
        res.json({ results, count });
    }
});
exports.list = list;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { event, title, segmentation, description, image, template_id, time_send, players } = req.body;
        const query = req.body;
        if (!query.segmentation) {
            query.segmentation = null;
        }
        const result = yield models_1.Marketing.create(query);
        const today = (0, base_1.globalTime)().format('YYYY-MM-DD');
        console.log(today, '===>today');
        if (result.status && time_send.length && time_send.includes(today)) {
            const playerRole = yield models_1.Roles.findOne({ title: 'player' });
            if (!playerRole)
                return res.status(402).json('Player Role is not exists');
            const toPlayers = [];
            if (segmentation) {
                const filter = yield models_1.Segmentations.findById(segmentation);
                if (!filter)
                    return res.status(402).json('Segmentation is not exists');
                const _players = yield models_1.Users.find({
                    status: true,
                    rolesId: playerRole._id,
                }).sort({ _id: 1 });
                for (let index = 0; index < _players.length; index++) {
                    const player = _players[index];
                    const balance = yield models_1.Balances.findOne({ userId: player._id, status: true }).populate('userId');
                    if (!balance)
                        continue;
                    const checked = yield (0, base_1.checkSegmentationPlayer)(filter, balance);
                    if (checked) {
                        if (event === 'email')
                            toPlayers.push(player.email);
                        if (event === 'sms')
                            toPlayers.push(player.phone);
                    }
                }
            }
            console.log(toPlayers.length, '==>toPlayers');
            if (players.length) {
                const _players = yield models_1.Users.find({
                    _id: { $in: players },
                    status: true,
                    rolesId: playerRole._id,
                });
                for (let index = 0; index < _players.length; index++) {
                    const player = _players[index];
                    if (event === 'email')
                        toPlayers.push(player.email);
                    if (event === 'sms')
                        toPlayers.push(player.phone);
                }
            }
            if (event === 'email' && toPlayers.length) {
                const mailOptions = {
                    from: {
                        email: MARKETING_EMAIL,
                        name: APP_NAME,
                    },
                    to: toPlayers,
                    subject: 'betcasino555',
                    templateId: template_id || 'd-5872ef231b8e4d8084658108936c7cf6',
                    dynamicTemplateData: Object.assign(Object.assign({ title }, (description && {
                        description,
                    })), (image && {
                        image: `${DOMAIN}/${image}`,
                    })),
                };
                const mailRes = yield (0, sendgrid_1.sendMail)(mailOptions);
                console.log('📢[email.ts:118]: mailRes: ', mailRes);
                yield models_1.MarketingHistory.create({
                    marketingId: result._id,
                    templateId: template_id,
                    sender: MARKETING_EMAIL,
                    receivers: toPlayers,
                });
            }
            if (event === 'sms' && toPlayers.length) {
                // const toPlayers = _players.map((e) => e.phone);
                const history = new models_1.MarketingHistory({
                    marketingId: result._id,
                    sender: SENDER_NUMBER,
                    receivers: toPlayers,
                });
                const params = {
                    message: title,
                    to: toPlayers,
                };
                yield (0, twilio_1.sendSms)(params);
                yield history.save();
            }
            yield models_1.Marketing.updateOne({ _id: result._id }, { last_sent: Date.now() });
        }
        return res.json(result);
    }
    catch (error) {
        console.error('Error Create MarketingHisoty => ', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Marketing.findByIdAndUpdate((0, base_1.ObjectId)(req.params.id), req.body, { new: true });
    res.json(result);
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Marketing.deleteOne({
        _id: (0, base_1.ObjectId)(req.params.id),
    });
    res.json(result);
});
exports.deleteOne = deleteOne;
