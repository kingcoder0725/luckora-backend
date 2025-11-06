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
exports.getList = exports.getChat = exports.getContacts = exports.getUnreadSupports = exports.getSupportMessages = void 0;
const chat_1 = require("../../models/chat");
const getSupportMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const messages = yield chat_1.SupportChat.find({
            $or: [
                { sender: user === null || user === void 0 ? void 0 : user._id },
                { receiver: user === null || user === void 0 ? void 0 : user._id }
            ]
        });
        // .limit(limit);
        const translatedMessages = yield Promise.all(messages.map((message) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            // const translatedText = await translateText(message.text, lang);
            return Object.assign(Object.assign(Object.assign({}, message.toObject()), (message.isAi && {
                sender: {
                    username: "AI Support",
                    avatar: "https://api-prod-minimal-v610.pages.dev/assets/images/avatar/avatar-25.webp",
                    role: "agent"
                }
            })), { senderId: `${(_a = message.sender) === null || _a === void 0 ? void 0 : _a._id}`, receiverId: `${(_b = message.receiver) === null || _b === void 0 ? void 0 : _b._id}` });
        })));
        res.json(translatedMessages);
        yield chat_1.SupportChat.updateMany({
            status: "SENT",
            receiver: user === null || user === void 0 ? void 0 : user._id
        }, {
            status: "READ"
        });
    }
    catch (error) {
        console.error('Error via get sms:', error);
        res.status(500).send({ error: 'Error fetching messages' });
    }
});
exports.getSupportMessages = getSupportMessages;
const getUnreadSupports = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const messages = yield chat_1.SupportChat.find({
            status: "SENT",
            receiver: user === null || user === void 0 ? void 0 : user._id
        });
        res.json(messages.length);
    }
    catch (error) {
        console.error('Error via get sms:', error);
        res.status(500).send({ error: 'Error fetching messages' });
    }
});
exports.getUnreadSupports = getUnreadSupports;
const getContacts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield chat_1.SupportChat.aggregate([
            {
                $match: {
                    sender: { $ne: null } // Adjusted to use $ne instead of $not with $eq  
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            },
            {
                $group: {
                    _id: "$sender",
                    root: { $first: "$$ROOT" },
                    unreadCount: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "SENT"] }, 1, 0]
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'senderInfo'
                }
            },
            {
                $unwind: {
                    path: '$senderInfo',
                    preserveNullAndEmptyArrays: true // Keep messages even if there's no matching user  
                }
            },
            {
                $project: {
                    createdAt: '$root.createdAt',
                    lastmsg: '$root.text',
                    user: '$senderInfo',
                    unreadCount: '$unreadCount'
                }
            },
            {
                $lookup: {
                    from: 'roles',
                    localField: 'user.rolesId',
                    foreignField: '_id',
                    as: 'role'
                }
            },
            {
                $unwind: '$role'
            },
            {
                $match: {
                    'role.type': 'player'
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            }
        ]);
        res.status(200).json(data);
    }
    catch (error) {
        console.error('Error via get sms:', error);
        res.status(500).send({ error: 'Error fetching messages' });
    }
});
exports.getContacts = getContacts;
const getChat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.body;
        const data = yield chat_1.SupportChat.find({
            $or: [{
                    sender: userId,
                },
                {
                    receiver: userId,
                }]
        });
        const result = data.map((row) => (Object.assign(Object.assign({}, row.toObject()), (row.isAi && {
            sender: {
                _id: "ai_support",
                username: "AI Support",
                avatar: "https://api-prod-minimal-v610.pages.dev/assets/images/avatar/avatar-25.webp",
                role: "agent"
            }
        }))));
        res.status(200).json(result);
        yield chat_1.SupportChat.updateMany({
            status: "SENT",
            sender: userId
        }, {
            status: "READ"
        });
    }
    catch (error) {
        console.error('Error via get sms:', error);
        res.status(500).send({ error: 'Error fetching messages' });
    }
});
exports.getChat = getChat;
const getList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const messages = yield chat_1.SupportChat.aggregate([
            {
                $match: {
                    sender: { $not: { $eq: null } }
                }
            },
            {
                $group: {
                    _id: {
                        sender: '$sender'
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id.sender',
                    foreignField: '_id',
                    as: 'sender'
                }
            },
            {
                $unwind: '$sender'
            },
        ]);
        // .limit(limit);
        // const translatedMessages = await Promise.all(messages.map(async (message) => {
        //     // const translatedText = await translateText(message.text, lang);
        //     return {
        //         ...message.toObject(),
        //         // text: translatedText,
        //         ...(message.isAi && {
        //             sender: {
        //                 username: "AI Support",
        //                 avatar: "https://api-prod-minimal-v610.pages.dev/assets/images/avatar/avatar-25.webp",
        //                 role: "agent"
        //             }
        //         }),
        //         senderId: `${message.sender?._id}`,
        //         receiverId: `${message.receiver?._id}`,
        //     };
        // }));
        res.status(200).json(messages);
    }
    catch (error) {
        console.error('Error via get sms:', error);
        res.status(500).send({ error: 'Error fetching messages' });
    }
});
exports.getList = getList;
