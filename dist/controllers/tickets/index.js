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
exports.getUserTicket = exports.getTickets = exports.deleteOne = exports.updateOne = exports.create = exports.list = exports.getOne = void 0;
const base_1 = require("../base");
const models_1 = require("../../models");
const sendgrid_1 = require("../../utils/sendgrid");
const MARKETING_EMAIL = process.env.MARKETING_EMAIL;
const APP_NAME = process.env.APP_NAME;
const DOMAIN = process.env.DOMAIN;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Tickets.findOne({ _id: (0, base_1.ObjectId)(req.params.id) });
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
    const count = yield models_1.Tickets.countDocuments(query);
    if (!pageSize || !page) {
        const results = yield models_1.Tickets.find(query).sort({ category: -1 });
        res.json({ results, count });
    }
    else {
        const results = yield models_1.Tickets.find(query).populate("agent").populate("player")
            .limit(pageSize)
            .skip((page - 1) * pageSize)
            .sort({ category: -1 });
        res.json({ results, count });
    }
});
exports.list = list;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const { player, description, image } = req.body;
        const toPlayer = yield models_1.Users.findById(player);
        if (!toPlayer) {
            res.status(429).json("Player not found");
        }
        const timestamp = Date.now();
        const result = yield models_1.Tickets.create(Object.assign(Object.assign({}, req.body), { number: timestamp, agent: user === null || user === void 0 ? void 0 : user._id, auto: false }));
        const mailOptions = {
            from: {
                email: MARKETING_EMAIL,
                name: APP_NAME
            },
            to: toPlayer.email,
            subject: "Ticket Created",
            templateId: 'd-5872ef231b8e4d8084658108936c7cf6',
            dynamicTemplateData: Object.assign(Object.assign({ title: `Ticket Created (${timestamp})` }, (description && {
                description,
            })), (image && {
                image,
            }))
        };
        const status = yield (0, sendgrid_1.sendMail)(mailOptions);
        if (!status) {
            res.status(429).json("Email sending Error!");
        }
        yield models_1.Notification.create({
            title: `Ticket Created (${timestamp})`,
            description,
            players: [player],
            country: ["all"],
            auto: true,
        });
        res.json(result);
    }
    catch (error) {
        console.error(`Creating Ticket Error => `, error);
        res.status(400).json("Internal Server Error");
    }
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    delete req.body.number;
    const { status } = req.body;
    const result = yield models_1.Tickets.findByIdAndUpdate((0, base_1.ObjectId)(req.params.id), Object.assign(Object.assign({}, req.body), (status === "completed" ? {
        closed_time: new Date()
    } : {
        update_time: new Date()
    })), { new: true });
    res.json(result);
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Tickets.deleteOne({
        _id: (0, base_1.ObjectId)(req.params.id)
    });
    res.json(result);
});
exports.deleteOne = deleteOne;
const getTickets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Tickets.find().sort({ order: 1 }).select({
        _id: 0,
        icon: 1,
        link: 1,
        name: 1
    });
    res.json(result);
});
exports.getTickets = getTickets;
const getUserTicket = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const result = yield models_1.Tickets.find({ player: user === null || user === void 0 ? void 0 : user._id }).populate("agent").sort({ category: -1 });
        const data = result.map((row) => (Object.assign(Object.assign({}, row.toObject()), { agent: {
                avatar: row.agent.avatar,
                username: row.agent.username,
                email: row.agent.email,
            } })));
        return res.json(data);
    }
    catch (error) {
        console.error(`GetUserTicket Error => `, error);
        return res.status(400).json("Internal Server Error!");
    }
});
exports.getUserTicket = getUserTicket;
