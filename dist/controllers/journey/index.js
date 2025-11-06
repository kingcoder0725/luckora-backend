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
exports.triggerNoti = exports.triggerLogin = exports.triggerSms = exports.triggerEmail = exports.deleteMain = exports.deactiveMain = exports.cloneMain = exports.updateMain = exports.createMain = exports.updateFlow = exports.getMain = exports.getAllMain = exports.getFlow = void 0;
const moment_timezone_1 = require("moment-timezone");
const models_1 = require("../../models");
const sendgrid_1 = require("../../utils/sendgrid");
const twilio_1 = require("../../utils/twilio");
const MARKETING_EMAIL = process.env.MARKETING_EMAIL;
const APP_NAME = process.env.APP_NAME;
const getFlow = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const nodes = yield models_1.JourneyNodes.find({ campaignId: id });
        const edges = yield models_1.JourneyEdges.find({ campaignId: id });
        return res.json({ nodes, edges });
    }
    catch (error) {
        console.error('Journey Error => ', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.getFlow = getFlow;
const getAllMain = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield models_1.Journeys.find();
        return res.json(data);
    }
    catch (error) {
        console.error('Journey Error => ', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.getAllMain = getAllMain;
const getMain = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const data = yield models_1.Journeys.findById(id);
        return res.json(data);
    }
    catch (error) {
        console.error('Journey Error => ', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.getMain = getMain;
const getStatCampaign = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const stats = yield models_1.JourneyStats.findOne({ campaignId: id });
        
        if (!stats) {
            return res.status(404).json('Statistics for this campaign not found');
        }

        return res.json(stats);
    } catch (error) {
        console.error('Journey Stats Error => ', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.getStatCampaign = getStatCampaign;

const updateFlow = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { nodes, edges } = req.body;
        const r_nodes = nodes.map((n) => (Object.assign(Object.assign({}, n), { campaignId: id })));
        yield models_1.JourneyNodes.deleteMany({ campaignId: id });
        yield models_1.JourneyNodes.insertMany(r_nodes);
        const r_edges = edges.map((e) => (Object.assign(Object.assign({}, e), { campaignId: id })));
        yield models_1.JourneyEdges.deleteMany({ campaignId: id });
        yield models_1.JourneyEdges.insertMany(r_edges);
        return res.json('Success');
    }
    catch (error) {
        console.error('Journey Error => ', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.updateFlow = updateFlow;

const createMain = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const journeyData = yield models_1.Journeys.create(req.body);
        const campaignId = journeyData._id;

        const statsData = {
            campaignId: campaignId,
            campaignDuration: req.body.campaignDuration
        };

        const stats = yield models_1.JourneyStats.create(statsData);
        console.log(`Created JourneyStats for campaign ${campaignId}:`, stats);

        return res.json(journeyData);
    } catch (error) {
        console.error('Journey Error => ', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.createMain = createMain;
const updateMain = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { selectedSegment } = req.body;
        const campagin = yield models_1.Journeys.findOne({ _id: id });
        if (!campagin)
            return res.status(403).json('Campagin not found');
        yield models_1.Journeys.updateOne({ _id: id }, req.body);
        if (selectedSegment !== campagin.selectedSegment) {
            yield models_1.JourneyNodes.updateOne({ campaignId: id, 'node.data.type': 'segment', 'node.data.value': campagin.selectedSegment }, { 'node.data.value': selectedSegment });
        }
        return res.json('success');
    }
    catch (error) {
        console.error('Journey Error => ', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.updateMain = updateMain;

const cloneMain = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.body;
        const oldCampaign = yield models_1.Journeys.findById(id);
        if (!oldCampaign)
            return res.status(403).json('Campaign not found');


        const data = Object.assign(Object.assign({}, oldCampaign.toObject()), { _id: '', createdAt: '' });
        delete data._id;
        delete data.createdAt;
        delete data.updatedAt;
        delete data.completedUsers;
        delete data.completed;
        delete data.activeJourneys;
        delete data.processedRecords;

        const newCampaign = yield models_1.Journeys.create(data);

        const statsData = {
            campaignId: newCampaign._id,
            campaignDuration: oldCampaign.campaignDuration, 
        };
        const stats = yield models_1.JourneyStats.create(statsData);
        console.log(`Created JourneyStats for cloned campaign ${newCampaign._id}:`, stats);

        const oldNodes = yield models_1.JourneyNodes.find({ campaignId: oldCampaign._id });
        if (oldNodes.length) {
            const newNodes = oldNodes.map((node) => {
                const data = Object.assign(Object.assign({}, node.toObject()), { campaignId: newCampaign._id });
                delete data._id;
                delete data.createdAt;
                delete data.updatedAt;
                delete data.completedUsers;
                delete data.completed;
                delete data.activeJourneys;
                delete data.processedRecords;
                return data;
            });
            yield models_1.JourneyNodes.insertMany(newNodes);
        }

        const oldEdges = yield models_1.JourneyEdges.find({ campaignId: oldCampaign._id });
        if (oldEdges.length) {
            const newEdges = oldEdges.map((edge) => {
                const data = Object.assign(Object.assign({}, edge.toObject()), { campaignId: newCampaign._id });
                delete data._id;
                delete data.createdAt;
                delete data.updatedAt;
                delete data.completedUsers;
                delete data.completed;
                delete data.activeJourneys;
                delete data.processedRecords;
                return data;
            });
            yield models_1.JourneyEdges.insertMany(newEdges);
        }

        return res.json(newCampaign);
    } catch (error) {
        console.error('Journey Error => ', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.cloneMain = cloneMain;

const deactiveMain = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.body;
        const campagin = yield models_1.Journeys.findById(id);
        if (!campagin)
            return res.status(403).json('Campagin not found');
        yield models_1.Journeys.updateOne({ _id: campagin.id }, { status: !campagin.status });
        return res.json('success');
    }
    catch (error) {
        console.error('Journey Error => ', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.deactiveMain = deactiveMain;
const deleteMain = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield models_1.Journeys.deleteOne({ _id: id });
        yield models_1.JourneyNodes.deleteMany({ campaignId: id });
        yield models_1.JourneyStats.deleteOne({campaignId: id });
        yield models_1.JourneyEdges.deleteMany({ campaignId: id });
        return res.json('success');
    }
    catch (error) {
        console.error('Journey Error => ', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.deleteMain = deleteMain;
const triggerEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        const user = yield models_1.Users.findOne({ email });
        if (!user)
            return res.status(403).json('User not found');
        const mailOptions = {
            from: {
                email: MARKETING_EMAIL,
                name: APP_NAME
            },
            to: email,
            subject: 'TEST',
            templateId: 'd-5872ef231b8e4d8084658108936c7cf6',
            dynamicTemplateData: {
                description: 'TEST'
            }
        };
        yield (0, sendgrid_1.sendMail)(mailOptions);
        return res.json('Success');
    }
    catch (error) {
        console.error('Journey Error => ', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.triggerEmail = triggerEmail;
const triggerSms = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phone } = req.body;
        const user = yield models_1.Users.findOne({ phone });
        if (!user)
            return res.status(403).json('User not found');
        const params = {
            message: 'TEST',
            to: phone
        };
        yield (0, twilio_1.sendSms)(params);
        return res.json('Success');
    }
    catch (error) {
        console.error('Journey Error => ', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.triggerSms = triggerSms;
const triggerLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { day, userId } = req.body;
        const date = (0, moment_timezone_1.default)().subtract(day, 'days').valueOf();
        const result = yield models_1.LoginHistories.findOne({ userId, createdAt: { $gt: new Date(date) } });
        if (!result)
            return res.status(403).json('User not found');
        return res.json(result);
    }
    catch (error) {
        console.error('Journey Error => ', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.triggerLogin = triggerLogin;
const triggerNoti = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, description, userId } = req.body;
        const data = yield models_1.Notification.create({
            title,
            description,
            players: [userId],
            country: ['all'],
            auto: true
        });
        return res.json(data);
    }
    catch (error) {
        console.error('Journey Error => ', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.triggerNoti = triggerNoti;
