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
exports.initCron = void 0;
const cron_1 = require("cron");
const moment = require("moment");
const sendgrid_1 = require("../utils/sendgrid");
const twilio_1 = require("../utils/twilio");
const models_1 = require("../models");
const base_1 = require("./base");
const bonus_1 = require("./bonus");
// const custom_1 = require("./journey/custom");
const timelesstech_1 = require("./games/timelesstech");
const activity_calc_1 = require("./activity_calc");
const crypto = require("crypto");

const MARKETING_EMAIL = process.env.MARKETING_EMAIL;
const APP_NAME = process.env.APP_NAME;
const SENDER_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const DEPOSIT_PENDING_TIME = 120;


function generateSHA1Hash(input) {
    return crypto.createHash('sha1').update(input).digest('hex');
}

// const resetCampaignProcessing = async () => {
//   try {
//     const result = await models_1.Journeys.updateMany(
//       { processing: true }, 
//       { $unset: { processing: "" } } 
//     );
//   } catch (error) {
//     console.error("Error resetting campaign processing flags:", error);
//   }
// };

// exports.resetCampaignProcessing = resetCampaignProcessing;


const checkBonus = () => __awaiter(void 0, void 0, void 0, function* () {
    const currentDate = new Date();
    const expired = yield models_1.Bonus.find({
        status: true,
        to_date: {
            $lt: currentDate,
        },
    });
    if (expired.length) {
        for (let index = 0; index < expired.length; index++) {
            const bonus = expired[index];
            const actives = yield models_1.BonusHistories.find({
                bonusId: bonus._id,
                $or: [
                    {
                        status: 'active',
                    },
                    {
                        status: 'processing',
                    },
                ],
            });
            if (!actives.length)
                continue;
            const playerIds = actives.map((e) => e.userId);
            yield models_1.Balances.updateMany({ userId: { $in: playerIds }, status: true }, { bonus: 0 });
            yield models_1.BonusHistories.updateMany({
                bonusId: bonus._id,
                $or: [
                    {
                        status: 'active',
                    },
                    {
                        status: 'processing',
                    },
                ],
            }, { status: 'expired' });
        }
        yield models_1.Bonus.updateMany({
            status: true,
            to_date: {
                $lt: currentDate,
            },
        }, { status: false });
    }
    const today = (0, base_1.globalTime)().format('YYYY-MM-DD');
    const cashbackBonus = yield models_1.Bonus.find({
        status: true,
        amount_type: 'cashback',
        cashback_date: today,
        netlose_from: { $gte: 0 },
        netlose_to: { $gt: 0 },
        calculation_period: { $gt: 0 },
    });
    if (cashbackBonus.length) {
        for (const key in cashbackBonus) {
            const bonus = cashbackBonus[key];
            yield (0, bonus_1.checkCashbackBonus)(bonus);
        }
    }
    const bonuses = yield models_1.Bonus.find({
        status: true,
        wager_day: {
            $gt: 0,
        },
    });
    if (!bonuses.length)
        return;
    for (let index = 0; index < bonuses.length; index++) {
        const bonus = bonuses[index];
        let actives = yield models_1.BonusHistories.find({
            bonusId: bonus._id,
            $or: [
                {
                    status: 'active',
                },
                {
                    status: 'processing',
                },
            ],
        });
        if (!actives.length)
            continue;
        actives = actives.filter((b) => {
            const days = (0, base_1.daysSinceCreated)(b.createdAt);
            if (days > bonus.wager_day)
                return true;
            return false;
        });
        if (!actives.length)
            continue;
        const playerIds = actives.map((e) => e.userId);
        yield models_1.Balances.updateMany({ userId: { $in: playerIds }, status: true }, { bonus: 0 });
        yield models_1.BonusHistories.updateMany({
            _id: { $in: actives.map((b) => String(b._id)) },
        }, { status: 'expired' });
    }
});

const getHours = (last_date) => {
    const currentDate = new Date();
    const pastDate = new Date(last_date);
    const differenceInMilliseconds = currentDate.getTime() - pastDate.getTime();
    const differenceInHours = differenceInMilliseconds / (1000 * 60 * 60);
    return differenceInHours;
};

const checkMarketingEmail = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const playerRole = yield models_1.Roles.findOne({ title: 'player' });
        if (!playerRole)
            return false;
        const currentDate = new Date();
        const marketings = yield models_1.Marketing.find({
            status: true,
            $or: [
                {
                    repeat: true,
                    from_date: { $lt: currentDate },
                    to_date: { $gt: currentDate },
                },
                {
                    time_send: { $nin: [{}, null, []] },
                },
            ],
        });
        if (marketings.length) {
            for (const i in marketings) {
                const { _id, event, players, title, description, image, last_sent, repeat_time, time_send, segmentation, repeat } = marketings[i];
                if (repeat) {
                    const hours = getHours(last_sent);
                    if (hours < repeat_time)
                        continue;
                }
                if (time_send.length) {
                    const last_day = moment(last_sent).format('YYYY-MM-DD');
                    const today = (0, base_1.globalTime)().format('YYYY-MM-DD');
                    if (!time_send.includes(today) || (last_sent && last_day === today))
                        continue;
                }
                let toPlayers = [];
                if (segmentation) {
                    const filter = yield models_1.Segmentations.findById(segmentation);
                    if (!filter)
                        continue;
                    const _players = yield models_1.Users.find({
                        status: true,
                        rolesId: playerRole._id,
                    });
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
                if (players.length) {
                    const _players = yield models_1.Users.find(Object.assign({ status: true, rolesId: playerRole._id }, (!players.includes('all') && {
                        _id: { $in: players },
                    })));
                    toPlayers = _players.map((e) => (event === 'email' ? e.email : e.phone));
                }
                if (event === 'email' && toPlayers.length) {
                    const mailOptions = {
                        from: {
                            email: MARKETING_EMAIL,
                            name: APP_NAME,
                        },
                        to: toPlayers,
                        subject: title,
                        templateId: 'd-5872ef231b8e4d8084658108936c7cf6',
                        dynamicTemplateData: Object.assign(Object.assign({}, (description && {
                            description,
                        })), (image && {
                            image,
                        })),
                    };
                    yield (0, sendgrid_1.sendMail)(mailOptions);
                    yield models_1.MarketingHistory.create({
                        marketingId: _id,
                        sender: MARKETING_EMAIL,
                        receivers: toPlayers,
                    });
                }
                if (event === 'sms' && toPlayers.length) {
                    const params = {
                        message: title,
                        to: toPlayers,
                    };
                    yield (0, twilio_1.sendSms)(params);
                    yield models_1.MarketinHistory.create({
                        marketingId: _id,
                        sender: SENDER_NUMBER,
                        receivers: toPlayers,
                    });
                }
                yield models_1.Marketing.updateOne({ _id }, { last_sent: currentDate });
            }
        }
    }
    catch (error) {
        console.log(error);
    }
});

const checkBlockUser = () => __awaiter(void 0, void 0, void 0, function* () {
    const users = yield models_1.Users.find({
        status: false,
        block_day: { $gt: 0 },
    });
    if (!users.length)
        return;
    console.log(users.length, '==> check block users');
    const updated = [];
    for (const key in users) {
        const user = users[key];
        const day = (0, base_1.daysSinceCreated)(user.block_date);
        if (user.block_day < day) {
            updated.push(user._id);
        }
    }
    if (!updated.length)
        return;
    yield models_1.Users.updateMany({
        _id: { $in: updated },
    }, {
        status: true,
        block_day: 0,
        block_date: '',
    });
});

function isPastTenMinutes(createdAt) {
    const tenMinutesInMilliseconds = DEPOSIT_PENDING_TIME * 60 * 1000;
    const createdAtTime = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const timeElapsed = now - createdAtTime;
    return timeElapsed >= tenMinutesInMilliseconds;
}

const checkPendingCrypto = () => __awaiter(void 0, void 0, void 0, function* () {
    const payments = yield models_1.Payments.find({
        status: -3,
        ipn_type: 'deposit',
        status_text: 'pending',
        isFiat: false,
    });
    if (!(payments === null || payments === void 0 ? void 0 : payments.length))
        return;
    for (const key in payments) {
        const payment = payments[key];
        const checked = isPastTenMinutes(payment.createdAt);
        if (checked)
            yield models_1.Payments.updateOne({ _id: payment._id }, {
                status: -5,
                status_text: 'expired',
            });
    }
});

const checkZeroWinRecords = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        
        const cutoffTime = new Date(Date.now() - 5 * 60 * 1000);
        const betsWithoutWin = yield models_1.GameHistories.aggregate([
            {
                $match: {
                    txn_type: 'BET',
                    createdAt: { $lte: cutoffTime },
                    canceled: false,
                    provider_code: 'casino-slots',
                },
            },
            {
                $lookup: {
                    from: 'gamehistories',
                    let: { round_id: '$round_id', userId: '$userId', game_code: '$game_code' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$round_id', '$$round_id'] },
                                        { $eq: ['$userId', '$$userId'] },
                                        { $eq: ['$game_code', '$$game_code'] },
                                        { $eq: ['$txn_type', 'WIN'] },
                                    ],
                                },
                            },
                        },
                    ],
                    as: 'winRecords',
                },
            },
            {
                $match: {
                    winRecords: { $size: 0 },
                },
            },
        ]);

        for (const bet of betsWithoutWin) {
            const finishRoundData = {
                command: 'finishround',
                data: {
                    round_id: bet.round_id,
                    user_id: String(bet.userId),
                    game_id: bet.game_code,
                    round_date: moment(bet.createdAt).format('YYYY-MM-DD'),
                    round_ts: String(new Date(bet.createdAt).getTime()),
                },
                request_timestamp: (0, base_1.globalTime)(),
                hash: generateSHA1Hash(`finishround${(0, base_1.globalTime)()}${process.env.TIMELESSTECH_SECRET_KEY}`),
            };

            const mockReq = { body: finishRoundData };
            const mockRes = {
                json: (response) => {
                    console.log(`finishround response for round_id: ${bet.round_id}: ${JSON.stringify(response)}`);
                },
            };

            yield timelesstech_1.finishround(mockReq, mockRes);
        }

    } catch (error) {
        console.error(`Error in checkZeroWinRecords job: ${error.stack}`);
    }
});

const init = () => {
    console.log('Running init tasks');
    // resetCampaignProcessing();
    checkMarketingEmail();
    checkBonus();
    checkPendingCrypto();
    (0, activity_calc_1.activity_calc)();
};

const init2 = () => {
    console.log('Running init2 tasks');
    checkBlockUser();
};


const initCron = () => {
    init();
    const job = new cron_1.CronJob(process.env.ONE_MIN_TIME, () => {
        init();
    });
    job.start();
    const job2 = new cron_1.CronJob(process.env.ONE_DAY_TIME, () => {
        init2();
    });
    job2.start();
//     (0, custom_1.checkJourneyFlow)();
// const job3 = new cron_1.CronJob("0 */5 * * *", () => {
//     (0, custom_1.checkJourneyFlow)();
// });
//     job3.start();
};
exports.initCron = initCron;