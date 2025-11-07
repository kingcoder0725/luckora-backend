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
const fs = require("fs");
const path = require("path");
const openai_1 = require("openai");
const cron_1 = require("cron");
const chat_1 = require("../models/chat");
const models_1 = require("../models");
const translate_1 = require("../utils/translate");
const files_1 = require("../controllers/files");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = new openai_1.default({
    apiKey: OPENAI_API_KEY
});
const filePath = path.join(__dirname, '/../utils/prompt.txt');
const prompt = fs.readFileSync(filePath, 'utf-8');
let USERS = {};
let SOCKETS = {};
const inputEmailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
const inputUrlRegex = /https?:\/\/(?!localhost|betcasino555\.com)\S+/;
const inputPhoneRegex = /(\+?\d{9,})/;
const checkHistory = () => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield chat_1.ChatSettings.findOne({ key: "display_day" });
    if (!data)
        return;
    const daylimit = data.value;
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daylimit);
    const result = yield chat_1.ChatMessage.deleteMany({ createdAt: { $lt: dateThreshold } });
    console.log(`Deleted ${result.deletedCount} chat(s) older than ${daylimit} days.`);
});
const getAIChat = (text) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const completion = yield openai.chat.completions.create({
            messages: [
                { "role": "system", "content": prompt },
                { "role": "user", "content": text }
            ],
            model: "gpt-4o-mini",
        });
        const { message } = completion.choices[0];
        return message;
    }
    catch (error) {
        console.error("Error AI support => ", error);
        return "Internal Server Error";
    }
});
exports.default = (io) => {
    io.of('/chat').on('connection', (socket) => __awaiter(void 0, void 0, void 0, function* () {
        // console.log("connected chat socket");
        const authenticate = (token) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const decoded = yield models_1.Sessions.findOne({ accessToken: token });
                USERS[socket.id] = yield models_1.Users.findById(decoded.userId);
                SOCKETS[decoded.userId] = socket.id;
            }
            catch (err) {
                io.to(socket.id).emit('logout');
            }
        });
        const disconnect = (lang) => {
            USERS[socket.id] = {};
        };
        const language = (lang) => {
            if (!USERS[socket.id])
                USERS[socket.id] = {};
            USERS[socket.id].language = lang;
        };
        const message = (messageData) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            try {
                const me = USERS[socket.id];
                if (!(me === null || me === void 0 ? void 0 : me._id)) {
                    socket.emit('alert', {
                        msg: "You are not authorized to send messages",
                        type: "error"
                    });
                    return;
                }
                if (!(me === null || me === void 0 ? void 0 : me.chat)) {
                    socket.emit('alert', {
                        msg: "You are not allowed to send messages",
                        type: "error"
                    });
                    return;
                }
                const { text, userColor, replyTo, file } = messageData;
                const data = yield chat_1.ChatSettings.findOne({ key: "blockword" });
                if (data === null || data === void 0 ? void 0 : data.value) {
                    const blockwords = JSON.parse(data.value);
                    const result = blockwords.reduce((list, word) => {
                        if (text.toLocaleLowerCase().includes(word.toLocaleLowerCase())) {
                            return [...list, word];
                        }
                        ;
                        return list;
                    }, []);
                    if (result.length) {
                        socket.emit('alert', {
                            msg: `You used to some block words (${result.join(",")})`,
                            type: "error"
                        });
                        return;
                    }
                }
                if (((_a = me === null || me === void 0 ? void 0 : me.rolesId) === null || _a === void 0 ? void 0 : _a.type) === "player" && (inputEmailRegex.test(text) || inputUrlRegex.test(text) || inputPhoneRegex.test(text))) {
                    socket.emit('alert', {
                        msg: "Emails, Links and Phone number are not allowed in the message",
                        type: "error"
                    });
                    return;
                }
                let casino_game_id = '0';
                let game_name = null;
                let game_banner = null;
                if (text.includes('play')) {
                    const gameCodeMatch = text.match(/\/(\d+)\/play/);
                    if (gameCodeMatch) {
                        casino_game_id = gameCodeMatch[1];
                        const game = yield models_1.GameLists.findOne({ game_code: casino_game_id });
                        if (game) {
                            game_name = game.game_name;
                            game_banner = game.banner;
                        }
                    }
                }
                const newMessage = yield chat_1.ChatMessage.create(Object.assign(Object.assign({ userId: me._id, text,
                    userColor,
                    casino_game_id,
                    game_name,
                    game_banner }, (replyTo && {
                    replyTo,
                })), (file && {
                    attachment: file
                })));
                for (const key in USERS) {
                    const translatedText = yield (0, translate_1.translateText)(newMessage.text, (((_b = USERS[key]) === null || _b === void 0 ? void 0 : _b.language) || "EN"));
                    const param = Object.assign(Object.assign(Object.assign({}, newMessage.toObject()), { user: { username: me.username, avatar: me.avatar, role: me.rolesId.title } }), (translatedText.length > 0 && {
                        text: translatedText[0].text
                    }));
                    if (key === socket.id)
                        socket.emit('message', param);
                    else
                        socket.to(key).emit('message', param);
                }
            }
            catch (err) {
                console.error("Socket Message Error => ", err);
                socket.emit('alert', {
                    msg: "Internal server error!",
                    type: "error"
                });
            }
        });
        const report = (messageData) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const me = USERS[socket.id];
                if (!(me === null || me === void 0 ? void 0 : me._id)) {
                    socket.emit('alert', {
                        msg: "You are not authorized to send messages",
                        type: "error"
                    });
                    return;
                }
                if (!(me === null || me === void 0 ? void 0 : me.chat)) {
                    socket.emit('alert', {
                        msg: "You are not allowed to send messages",
                        type: "error"
                    });
                    return;
                }
                const { text, replyTo } = messageData;
                yield chat_1.ChatReport.create({
                    sender: me._id,
                    receiver: replyTo.userId,
                    text,
                    replyTo
                });
                socket.emit('alert', {
                    msg: "Success!",
                    type: "success"
                });
            }
            catch (error) {
                console.error("Error Socket report:", error);
                socket.emit('alert', {
                    msg: "Internal server error!",
                    type: "error"
                });
            }
        });
        const remove = (messageId) => __awaiter(void 0, void 0, void 0, function* () {
            var _c;
            try {
                const me = USERS[socket.id];
                if (!(me === null || me === void 0 ? void 0 : me.rolesId) || ((_c = me === null || me === void 0 ? void 0 : me.rolesId) === null || _c === void 0 ? void 0 : _c.type) === "player") {
                    socket.emit('alert', {
                        msg: "You can't access here",
                        type: "error"
                    });
                    return;
                }
                if (messageId === "all") {
                    const message = yield chat_1.ChatMessage.find({ attachment: { $exists: true } });
                    if (message.length) {
                        message.map((row) => {
                            (0, files_1.deleteFile)(row.attachment);
                        });
                    }
                    yield chat_1.ChatMessage.deleteMany({ attachment: { $exists: true } });
                }
                else {
                    const message = yield chat_1.ChatMessage.findByIdAndDelete(messageId);
                    if (message === null || message === void 0 ? void 0 : message.attachment)
                        (0, files_1.deleteFile)(message.attachment);
                }
                socket.emit('remove', messageId);
                socket.broadcast.emit('remove', messageId);
            }
            catch (error) {
                console.error("Error Socket removing:", error);
                socket.emit('alert', {
                    msg: "Internal server error!",
                    type: "error"
                });
            }
        });
        const support = (messageData) => __awaiter(void 0, void 0, void 0, function* () {
            var _d, _e, _f, _g;
            try {
                const me = USERS[socket.id];
                if (!(me === null || me === void 0 ? void 0 : me._id)) {
                    socket.emit('alert', {
                        msg: "You are not authorized to send messages",
                        type: "error"
                    });
                    return;
                }
                const { text, userColor, replyTo, receiver, file, askAgent } = messageData;
                const newMessage = yield chat_1.SupportChat.create(Object.assign(Object.assign(Object.assign(Object.assign({ sender: me._id, text,
                    userColor }, (replyTo && {
                    replyTo,
                })), (file && {
                    attachment: file
                })), (askAgent && {
                    askAgent: true
                })), (receiver && {
                    receiver,
                    askAgent: true,
                })));
                const param = Object.assign(Object.assign({}, newMessage.toObject()), { sender: { _id: me._id, username: me.username, avatar: me.avatar, role: me.rolesId.title }, senderId: me._id });
                socket.emit('support', param);
                if (receiver && SOCKETS[receiver]) {
                    socket.to(SOCKETS[receiver]).emit('support', param);
                }
                if (askAgent) {
                    for (const key in USERS) {
                        const type = (_e = (_d = USERS[key]) === null || _d === void 0 ? void 0 : _d.rolesId) === null || _e === void 0 ? void 0 : _e.type;
                        if (type !== "player") {
                            socket.to(key).emit('support', param);
                        }
                    }
                }
                if (!askAgent && ((_f = me.rolesId) === null || _f === void 0 ? void 0 : _f.type) === "player") {
                    const message = yield getAIChat(param.text);
                    if (!(message === null || message === void 0 ? void 0 : message.content)) {
                        socket.emit('alert', {
                            msg: "AI Support is not available",
                            type: "error"
                        });
                        return;
                    }
                    const newMessage = yield chat_1.SupportChat.create({
                        sender: null,
                        receiver: me._id,
                        text: message.content,
                        userColor: "#28323D",
                        isAi: true,
                    });
                    const query = Object.assign(Object.assign({}, newMessage.toObject()), { sender: {
                            _id: "ai_support",
                            username: "AI Support",
                            avatar: "https://api-prod-minimal-v610.pages.dev/assets/images/avatar/avatar-25.webp",
                            role: "agent"
                        } });
                    socket.emit('support', query);
                }
                if (((_g = me.rolesId) === null || _g === void 0 ? void 0 : _g.type) === "player") {
                    yield chat_1.SupportChat.updateMany({
                        status: "SENT",
                        receiver: me === null || me === void 0 ? void 0 : me._id
                    }, {
                        status: "READ"
                    });
                }
            }
            catch (error) {
                console.error("Error Socket support:", error);
                socket.emit('alert', {
                    msg: "Internal server error!",
                    type: "error"
                });
            }
        });
        const support_ai = (messageData) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const { text } = messageData;
                const message = yield getAIChat(text);
                if (!(message === null || message === void 0 ? void 0 : message.content)) {
                    socket.emit('alert', {
                        msg: "AI Support is not available",
                        type: "error"
                    });
                    return;
                }
                const query = {
                    text: message.content,
                    userColor: "#28323D",
                    isAi: true,
                    user: {
                        _id: "ai_support",
                        username: "AI Support",
                        avatar: "https://api-prod-minimal-v610.pages.dev/assets/images/avatar/avatar-25.webp",
                        role: "agent"
                    },
                    createdAt: Date.now()
                };
                return socket.emit('support_ai', query);
            }
            catch (error) {
                console.error("Error Socket support:", error);
                return socket.emit('alert', {
                    msg: "Internal server error!",
                    type: "error"
                });
            }
        });
        const support_remove = (data) => __awaiter(void 0, void 0, void 0, function* () {
            var _h;
            try {
                const me = USERS[socket.id];
                if (!(me === null || me === void 0 ? void 0 : me.rolesId) || ((_h = me === null || me === void 0 ? void 0 : me.rolesId) === null || _h === void 0 ? void 0 : _h.type) === "player") {
                    socket.emit('alert', {
                        msg: "You can't access here",
                        type: "error"
                    });
                    return;
                }
                const { messageId, receiver } = data;
                if (messageId === "all") {
                    const message = yield chat_1.SupportChat.find({ attachment: { $exists: true } });
                    if (message.length) {
                        message.map((row) => {
                            (0, files_1.deleteFile)(row.attachment);
                        });
                    }
                    yield chat_1.SupportChat.deleteMany({ attachment: { $exists: true } });
                }
                else {
                    const message = yield chat_1.SupportChat.findByIdAndDelete(messageId);
                    if (message === null || message === void 0 ? void 0 : message.attachment)
                        (0, files_1.deleteFile)(message.attachment);
                }
                socket.emit('support_remove', messageId);
                if (receiver && SOCKETS[receiver]) {
                    socket.to(SOCKETS[receiver]).emit('support_remove', messageId);
                }
            }
            catch (error) {
                console.error("Error Socket support remove:", error);
                socket.emit('alert', {
                    msg: "Internal server error!",
                    type: "error"
                });
            }
        });
        socket.on('support_ai', support_ai);
        socket.on('auth', authenticate);
        socket.on('disconnect', disconnect);
        socket.on('language', language);
        socket.on('message', message);
        socket.on('report', report);
        socket.on("remove", remove);
        socket.on('support', support);
        socket.on("support_remove", support_remove);
    }));
};
const job = new cron_1.CronJob(process.env.CHAT_CHECK_TIME, () => {
    checkHistory();
});
job.start();
