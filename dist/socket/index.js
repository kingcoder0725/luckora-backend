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
exports.UpdateSession = exports.UpdateSite = exports.updatePopupPlayers = exports.updateMiniAppPlayers = exports.POPUP_DATA = exports.POPUP_PLAYERS = exports.MINI_APP_PLAYERS = void 0;
const cron_1 = require("cron");
// import SocketIOFile from 'socket.io-file';
const base_1 = require("../controllers/base");
const models_1 = require("../models");
const LAST_MODIFIED_FIELD = 'updatedAt';
exports.MINI_APP_PLAYERS = [];
exports.POPUP_PLAYERS = [];
exports.POPUP_DATA = null;

const userTimers = new Map();

const updateTimeSpent = async (userId, timeSpent) => {
    try {
        const updatedUser = await models_1.Users.findOneAndUpdate(
            { _id: (0, base_1.ObjectId)(userId) },
            { $set: { timeSpent: timeSpent } },
            { new: true }
        );

        if (!updatedUser) {
            console.error(`User not found: ${userId}`);
        }
    } catch (error) {
        console.error('Error updating time spent:', error);
    }
};

const startUserTimer = (userId, socketId) => {
    if (userTimers.has(userId)) {
        clearInterval(userTimers.get(userId).intervalId);
    }

    const startTime = Date.now();
    const intervalId = setInterval(() => {
        const timeSpent = Math.floor((Date.now() - startTime) / 1000); 
        updateTimeSpent(userId, timeSpent);
    }, 60 * 1000); 

    userTimers.set(userId, { intervalId, startTime });
};

const stopUserTimer = (userId) => {
    if (userTimers.has(userId)) {
        const { intervalId, startTime } = userTimers.get(userId);
        clearInterval(intervalId);
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        updateTimeSpent(userId, timeSpent);
        userTimers.delete(userId);
    }
};


const updateMiniAppPlayers = (players) => {
    exports.MINI_APP_PLAYERS = players.map((p) => String(p._id));
};
exports.updateMiniAppPlayers = updateMiniAppPlayers;




const updatePopupPlayers = (players, data) => {
    exports.POPUP_PLAYERS = players.map((p) => String(p._id));
    // POPUP_PLAYERS = [...POPUP_PLAYERS, '665fef685d906578ca9c6647'];
    exports.POPUP_DATA = data;
};
exports.updatePopupPlayers = updatePopupPlayers;


const updateBalance = (io, userId, socketId) => __awaiter(void 0, void 0, void 0, function* () {
    const balance = yield models_1.Balances.findOne({ userId, status: true });
    const activeBonus = yield models_1.BonusHistories.findOne({ userId, status: 'active' });
    if (balance) {
        io.to(socketId).emit('balance', {
            balance: balance.balance,
            bonus: balance.bonus,
            activeBonus,
        });
    }
});
const updateNotification = (io, userId, socketId, country) => __awaiter(void 0, void 0, void 0, function* () {
    const thresholdTime = new Date(Date.now() - 2000);
    const query = {
        [LAST_MODIFIED_FIELD]: { $gte: thresholdTime },
        status: true,
    };
    const query_user = [{ players: { $in: ['all'] } }, { players: { $in: [String(userId)] } }];
    if (country)
        query.$or = [
            { country: { $in: ['all'] }, $or: query_user },
            { country: { $in: [country] }, $or: query_user },
        ];
    else if (userId)
        query.$or = query_user;
    const changed = yield models_1.Notification.find(query)
        .lean()
        .sort({ [LAST_MODIFIED_FIELD]: -1 });
    if (changed.length) {
        const data = changed.map((e) => (Object.assign(Object.assign({}, e), { isUnRead: !e.viewers.includes(String(userId)), viewers: null, players: null, country: null })));
        io.to(socketId).emit('notification', data);
    }
});

const UpdateSite = (io) => __awaiter(void 0, void 0, void 0, function* () {
    const sessions = yield models_1.Sessions.find({ socketId: { $ne: null } }).select({
        userId: 1,
        socketId: 1,
    });
    if (sessions.length) {
        for (const i in sessions) {
            const userId = sessions[i].userId;
            const socketId = sessions[i].socketId;
            const country = sessions[i].country;
            if (userId) {
                yield updateBalance(io, userId, socketId);
                yield updateNotification(io, userId, socketId, country);
            }
            if (exports.MINI_APP_PLAYERS.length && exports.MINI_APP_PLAYERS.includes(String(userId))) {
                io.to(socketId).emit('give_mini_game', { journey: true });
                exports.MINI_APP_PLAYERS = exports.MINI_APP_PLAYERS.filter((item) => item !== String(userId));
            }
              if (exports.POPUP_PLAYERS.length && exports.POPUP_PLAYERS.includes(String(userId)) && exports.POPUP_DATA) {
                console.log('Emitting popup to socketId=', socketId, 'userId=', userId, 'data=', exports.POPUP_DATA);
                io.to(socketId).emit('popup', exports.POPUP_DATA);
                exports.POPUP_PLAYERS = exports.POPUP_PLAYERS.filter((item) => item !== String(userId));
}
        }
    }
});
exports.UpdateSite = UpdateSite;

const UpdateSession = (io) => __awaiter(void 0, void 0, void 0, function* () {
    const sessions = yield models_1.Sessions.find({
        expiration: { $lte: (0, base_1.globalTime)() },
    }).populate('userId');
    if (sessions.length) {
        yield models_1.Sessions.deleteMany({ expiration: { $lte: (0, base_1.globalTime)() } });
        for (const i in sessions) {
            io.to(sessions[i].socketId).emit('logout');
            stopUserTimer(sessions[i].userId); 
        }
    }
});
exports.UpdateSession = UpdateSession;



const resetAllTimeSpent = new cron_1.CronJob('0 0 0 * * *', async () => {
    try {
        await models_1.Users.updateMany({}, { $set: { timeSpent: 0 } });
        console.log('All user timeSpent reset to 0 at 00:00');
    } catch (error) {
        console.error('Error resetting timeSpent:', error);
    }
});
resetAllTimeSpent.start();

exports.default = (io) => {
    io.on('connection', (socket) => __awaiter(void 0, void 0, void 0, function* () {
        // console.log("connected main socket");
        let user = null;
        socket.on('auth', (token) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const decoded = yield models_1.Sessions.findOneAndUpdate({ accessToken: token }, { socketId: socket.id }, { new: true, upsert: true });
                if (decoded) {
                    user = yield models_1.Users.findById((0, base_1.ObjectId)(decoded.userId));
                    if (!user) {
                        yield models_1.Sessions.deleteOne({ userId: decoded.userId });
                        return io.to(socket.id).emit('logout');
                    }
                    startUserTimer(decoded.userId, socket.id); // Запускаем таймер
                    // await checkBirthdayBonus(user);
                }
                else {
                    io.to(socket.id).emit('logout');
                }
            }
            catch (err) {
                io.to(socket.id).emit('logout');
            }
        }));
        socket.on('disconnect', () => __awaiter(void 0, void 0, void 0, function* () {
            const session = yield models_1.Sessions.findOne({ socketId: socket.id });
            if (session && session.userId) {
                stopUserTimer(session.userId); 
            }
            yield models_1.Sessions.updateOne({ socketId: socket.id }, { socketId: '' });
        }));
    }));
    const job1 = new cron_1.CronJob(process.env.TIME, () => {
        const time = (0, base_1.globalTime)();
        io.sockets.emit('time', time.valueOf());
    });
    job1.start();
    const job = new cron_1.CronJob(process.env.BALANCE_TIME, () => {
        (0, exports.UpdateSite)(io);
        (0, exports.UpdateSession)(io);
    });
    job.start();
    if (process.env.MODE === 'pro') {
        setTimeout(() => {
            io.sockets.emit('reload');
        }, 30000);
    }
};
