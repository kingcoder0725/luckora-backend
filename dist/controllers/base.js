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
exports.getSiteMap = exports.chunkListArray = exports.chunkArray = exports.checkBetLimit = exports.daysSinceCreated = exports.checkSegmentationPlayer = exports.checkDate = exports.authNOW = exports.fShortNumber = exports.getUserBalance = exports.log = exports.random = exports.generatInfo = exports.getForgotPasswordHtml = exports.getProfit = exports.clientErrorHandler = exports.logErrors = exports.checkBalance = exports.verifyRecaptcha = exports.sendEmail = exports.toNumber = exports.checkMaxBet = exports.getActiveBet = exports.balanceUpdate = exports.handleBet = exports.checkTierStatus = exports.checkSportsBonus = exports.checkCasinoBonus = exports.NumberFix = exports.signAccessToken = exports.getIPAddress = exports.decrypt = exports.encrypt = exports.getSessionTime = exports.globalTime = exports.ObjectId = exports.checkLimiter = exports.init = exports.ipLimiter = exports.usernameLimiter = exports.maxFailsByLogin = void 0;
const fs = require("fs");
const md5 = require("md5");
const crypto = require("crypto");
const geoip = require("geoip-country");
const requestIp = require("request-ip");
const nodemailer = require("nodemailer");
const moment = require("moment-timezone");
const path = require("path");
const mongoose_1 = require("mongoose");
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const models_1 = require("../models");
const axios_1 = require("axios");
const payment_1 = require("./payment");
const tracking_1 = require("./journey/tracking");
const V2 = require('recaptcha-v2');
const config = require('../../config');
const SITE_URLS = require('../utils/sitemap.json');
const SpentBetsTypes = ['sports-multi-bet', 'sports-single-bet', 'casino-bet'];
const NOW_PAYMENT_API = process.env.NOW_PAYMENT_API;
const NOW_EMAIL = process.env.NOW_EMAIL;
const NOW_PASS = process.env.NOW_PASS;
exports.maxFailsByLogin = 3;
let mongoConn;
try {
    mongoConn = mongoose_1.default.connection;
}
catch (error) {
    console.log('mongoConn error =>', error);
}
const usernameOpts = {
    storeClient: mongoConn,
    keyPrefix: 'login_fail_username',
    points: exports.maxFailsByLogin,
    duration: 60 * 60 * 3,
    blockDuration: 60 * 15,
};
const ipOpts = {
    storeClient: mongoConn,
    keyPrefix: 'login_fail_ip',
    points: exports.maxFailsByLogin,
    duration: 60 * 60 * 3,
    blockDuration: 60 * 15,
};
const init = () => {
    try {
        exports.usernameLimiter = new rate_limiter_flexible_1.RateLimiterMongo(usernameOpts);
        exports.ipLimiter = new rate_limiter_flexible_1.RateLimiterMongo(ipOpts);
    }
    catch (error) {
        console.log('Limiter error =>', error);
    }
};
exports.init = init;
// export const usernameLimiter = UsernameLimiter;
// export const ipLimiter = IpLimiter;
const checkLimiter = (req, res, callback) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield exports.ipLimiter.consume(req.ip);
        yield exports.usernameLimiter.consume(req.body.email);
        callback();
    }
    catch (rlRejected) {
        if (!(rlRejected instanceof Error)) {
            return res.status(429).send('Too Many Requests');
        }
    }
});
exports.checkLimiter = checkLimiter;
const ObjectId = (id) => {
    return new mongoose_1.default.Types.ObjectId(id);
};
exports.ObjectId = ObjectId;
const globalTime = () => {
    return moment.tz(new Date(), process.env.TIME_ZONE);
};
exports.globalTime = globalTime;
const getSessionTime = () => {
    const time = new Date(new Date().valueOf() + parseInt(process.env.SESSION));
    return moment.tz(time, process.env.TIME_ZONE);
};
exports.getSessionTime = getSessionTime;
const encrypt = (text) => {
    const iv = crypto.randomBytes(Number(process.env.IV_LENGTH));
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(process.env.ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + '::' + encrypted.toString('hex');
};
exports.encrypt = encrypt;
const decrypt = (text) => {
    try {
        const textParts = text.split('::');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join('::'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(process.env.ENCRYPTION_KEY), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    }
    catch (e) {
        return '';
    }
};
exports.decrypt = decrypt;
const getIPAddress = (req) => {
    let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (!ip) {
        ip = requestIp.getClientIp(req);
    }
    if (ip) {
        ip = ip.replace('::ffff:', '');
        ip = ip.includes(',') ? ip.split(', ')[0] : ip;
    }
    const geo = geoip.lookup(ip);
    return Object.assign({ ip, useragent: req.useragent }, geo);
};
exports.getIPAddress = getIPAddress;
const signAccessToken = (req, res, userId) => {
    try {
        if (userId) {
            const expiration = (0, exports.getSessionTime)();
            const accessToken = md5(userId + expiration);
            const refreshToken = md5(userId + expiration);
            const ip = (0, exports.getIPAddress)(req);
            return Object.assign({ accessToken, refreshToken, expiration, userId }, ip);
        }
    }
    catch (err) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
};
exports.signAccessToken = signAccessToken;
const NumberFix = (number, decimal = 2) => {
    if (number < 0)
        return Number(Number(number).toFixed(decimal));
    if (number < 0.000001)
        return 0;
    // not raise
    if (decimal === 2)
        return Number(number.toString().match(/^\d+(?:\.\d{0,2})?/));
    if (decimal === 3)
        return Number(number.toString().match(/^\d+(?:\.\d{0,3})?/));
    if (decimal === 4)
        return Number(number.toString().match(/^\d+(?:\.\d{0,4})?/));
    if (decimal === 5)
        return Number(number.toString().match(/^\d+(?:\.\d{0,5})?/));
    return Number(number.toString().match(/^\d+(?:\.\d{0,2})?/));
};
exports.NumberFix = NumberFix;

const checkCasinoBonus = ({ userId, amount, isBonusPlay, game_code }) => __awaiter(void 0, void 0, void 0, function* () {
    const activeBonus = yield models_1.BonusHistories.findOne({ userId, status: 'active' });
    if (!activeBonus)
        return false;
    const bonus = activeBonus === null || activeBonus === void 0 ? void 0 : activeBonus.bonusId;
    if (!bonus)
        return;
    
    // Get user's current balance to determine currency
    const userBalance = yield models_1.Balances.findOne({ userId, status: true });
    if (!userBalance)
        return;
    
    // Find the currency configuration in bonus.currencies array
    const currencyConfig = bonus.currencies && bonus.currencies.find(c =>
        String(c.currency) === String(userBalance.currency._id) ||
        c.currency === userBalance.currency.symbol
    );
    
    if (!currencyConfig)
        return;
    
    // Check if games array exists and includes the game_code
    if (currencyConfig.games && currencyConfig.games.length > 0 && !currencyConfig.games.includes(game_code))
        return;
    
    if (bonus.event && bonus.event.type !== 'casino')
        return;
    if (bonus.amount_type === 'cashback' && bonus.reward === 'real')
        return;
    if (bonus.wager_day) {
        const days = (0, exports.daysSinceCreated)(activeBonus.createdAt);
        if (days > bonus.wager_day)
            return;
    }
    if (currencyConfig.max_bet_bonus_amount && currencyConfig.max_bet_bonus_amount < amount) {
        return;
    }
    const updated = yield models_1.BonusHistories.findByIdAndUpdate(activeBonus._id, {
        $inc: { wager_amount: amount },
    }, { new: true, upsert: true });
    const count = parseInt((updated.wager_amount / updated.amount).toString());
    console.log(count, '==>count==>casinobonus');
    if ((updated === null || updated === void 0 ? void 0 : updated.bonusId) && count >= currencyConfig.wager) {
        const balance = yield models_1.Balances.findOne({ userId: updated.userId, status: true });
        yield models_1.BonusHistories.updateOne({ _id: updated._id }, { status: 'finished', added_bonus: balance.bonus });
        yield models_1.Balances.updateOne({ _id: balance._id }, {
            bonus: 0,
            balance: (0, exports.NumberFix)(balance.balance + balance.bonus, 2),
        });
        yield models_1.BalanceHistories.create({
            userId: updated.userId,
            amount: balance.bonus,
            currency: balance.currency._id,
            type: 'bonus',
            currentBalance: (0, exports.NumberFix)(balance.balance + balance.bonus),
            beforeBalance: (0, exports.NumberFix)(balance.balance),
            info: `bonus-${bonus._id}`,
        });
        yield models_1.Notification.create({
            title: 'Bonus changed to Real balance',
            description: `Your ${balance.bonus} Bonus has been changed to real balance`,
            players: [String(updated.userId)],
            country: ['all'],
            auto: true,
        });
        yield (0, tracking_1.trackBonus)(updated.userId, bonus);
    }
});
exports.checkCasinoBonus = checkCasinoBonus;


const checkSportsBonus = (param) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { userId, amount, type, odds, bets } = param;
    const activeBonus = yield models_1.BonusHistories.findOne({ userId, status: 'active' });
    if (!activeBonus)
        return false;
    const bonus = activeBonus.bonusId;
    if (((_a = bonus === null || bonus === void 0 ? void 0 : bonus.event) === null || _a === void 0 ? void 0 : _a.type) !== 'sports')
        return;
    
    // Get user's current balance to determine currency
    const userBalance = yield models_1.Balances.findOne({ userId, status: true });
    if (!userBalance)
        return;
    
    // Find the currency configuration in bonus.currencies array
    const currencyConfig = bonus.currencies && bonus.currencies.find(c =>
        String(c.currency) === String(userBalance.currency._id) ||
        c.currency === userBalance.currency.symbol
    );
    
    if (!currencyConfig)
        return;
    
    if (bonus.amount_type === 'cashback' && bonus.reward === 'real')
        return;
    if (bonus.wager_day) {
        const days = (0, exports.daysSinceCreated)(activeBonus.createdAt);
        if (days > bonus.wager_day)
            return;
    }
    if (currencyConfig.max_bet_bonus_amount && currencyConfig.max_bet_bonus_amount < amount) {
        return;
    }
    if (bonus.min_odds && bonus.min_odds > odds)
        return;
    if (bonus.max_odds && bonus.max_odds < odds)
        return;
    if (bonus.sports_bet_type && bonus.sports_bet_type !== 'single_multi' && bonus.sports_bet_type !== type)
        return;
    if (bonus.sports_type.length) {
        const checked = bets.some((e) => bonus.sports_type.includes(e.SportId));
        if (!checked)
            return;
    }
    if (bonus.sports_leagues.length) {
        const checked = bets.some((e) => bonus.sports_leagues.includes(e.LeagueId));
        if (!checked)
            return;
    }
    if (bonus.sports_matchs.length) {
        const checked = bets.some((e) => bonus.sports_matchs.includes(e.eventId));
        if (!checked)
            return;
    }
    if (bonus.sports_event_type && bonus.sports_event_type !== 'all') {
        const checked = bets.some((e) => e.betStatus === 'live');
        if (bonus.sports_event_type === 'pre' && checked) {
            return;
        }
        if (bonus.sports_event_type === 'live' && !checked) {
            return;
        }
    }
    const updated = yield models_1.BonusHistories.findByIdAndUpdate(activeBonus._id, {
        $inc: { wager_amount: amount },
    }, { new: true, upsert: true });
    const count = parseInt((updated.wager_amount / updated.amount).toString());
    console.log(count, '==>count==>sportsbonus');
    if ((updated === null || updated === void 0 ? void 0 : updated.bonusId) && count >= currencyConfig.wager) {
        yield models_1.BonusHistories.updateOne({ _id: updated._id }, { status: 'finished' });
        const balance = yield models_1.Balances.findOne({ userId: updated.userId, status: true });
        yield models_1.Balances.updateOne({ _id: balance._id }, {
            status: 'finished',
            bonus: 0,
            balance: (0, exports.NumberFix)(balance.balance + balance.bonus, 2),
        });
        yield models_1.BalanceHistories.create({
            userId: updated.userId,
            amount: balance.bonus,
            currency: balance.currency._id,
            type: 'bonus',
            currentBalance: (0, exports.NumberFix)(balance.balance + balance.bonus, 2),
            beforeBalance: (0, exports.NumberFix)(balance.balance, 2),
            info: `bonus-${bonus._id}`,
        });
        yield models_1.Notification.create({
            title: 'Bonus changed to Real balance',
            description: `Your ${balance.bonus} Bonus has been changed to real balance`,
            players: [String(updated.userId)],
            country: ['all'],
            auto: true,
        });
    }
});
exports.checkSportsBonus = checkSportsBonus;
const checkTierStatus = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const tiers = yield models_1.Tiers.find({ status: true });
    tiers.forEach((tier) => __awaiter(void 0, void 0, void 0, function* () {
        if (tier.players.includes(userId))
            return;
        const queryspend = [
            { $match: { userId, currency: { $in: tier.currency_played }, type: { $in: SpentBetsTypes } } },
            { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
        ];
        const spendhis = yield models_1.BalanceHistories.aggregate(queryspend);
        if (!spendhis.length)
            return;
        let spend_amount = Number(spendhis[0].totalAmount * -1);
        if (spend_amount < tier.amount_played)
            return;
        // // bonus check
        const querybonus = [
            { $match: { userId, currency: { $in: tier.currency_played }, type: { $regex: 'bonus', $options: 'i' } } },
            { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
        ];
        const bonushis = yield models_1.BalanceHistories.aggregate(querybonus);
        if (bonushis.length)
            spend_amount -= bonushis[0].totalAmount;
        if (spend_amount < tier.amount_played)
            return;
        const point = parseInt(String(spend_amount / 5));
        const tierData = Object.assign(Object.assign({}, tier), { point });
        yield (0, tracking_1.trackTiers)(userId, tierData);
        yield models_1.Tiers.updateOne({ _id: tier._id }, { players: [...tier.players, userId] });
        // if (tier.freespin && tier.games.length) {
        //     const currentDate = new Date();
        //     const afterTwoYear = new Date(currentDate);
        //     afterTwoYear.setFullYear(currentDate.getFullYear() + 2);
        //     await createCampaign(tier.games, userId, tier.freespin, afterTwoYear, tier.title)
        // }
        // if (tier.currency_prize && tier.amount_prize) {
        //     const balance = await Balances.findOne({ userId, status: true });
        //     if (String(balance.currency._id) !== String(tier.currency_prize))
        //         return;
        //     const updated = await Balances.findOneAndUpdate({ userId, currency: tier.currency_prize }, { $inc: { amount: tier.amount_prize } }, { new: true, upset: true });
        //     await Users.updateOne({ _id: userId }, {
        //         tier: tier._id
        //     })
        //     await Notification.create({
        //         title: tier.title,
        //         description: `Your level has been upgraded (${tier.title})`,
        //         players: [String(userId)],
        //         country: ["all"],
        //         auto: true,
        //     });
        //     await BalanceHistories.create({
        //         userId,
        //         amount: tier.amount_prize,
        //         currency: tier.currency_prize,
        //         type: `Tier`,
        //         currentBalance: NumberFix(updated.balance),
        //         beforeBalance: NumberFix(updated.balance - tier.amount_prize),
        //         info: `tiers_${tier._id}`,
        //     });
        // }
    }));
});
exports.checkTierStatus = checkTierStatus;
const handleBet = ({ req = undefined, userId, amount, currency, type, info = '', status = false, }) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield models_1.Users.findById((0, exports.ObjectId)(userId));
    const rUser = yield models_1.Users.findById(user.creatorId);
    
    // For negative amounts (bets), ensure we don't go below zero balance
    if (amount < 0) {
        const result = yield models_1.Balances.findOneAndUpdate(
            { 
                userId: (0, exports.ObjectId)(userId), 
                currency: (0, exports.ObjectId)(currency),
                balance: { $gte: Math.abs(amount) } // Only update if balance is sufficient
            }, 
            { $inc: { balance: (0, exports.NumberFix)(amount) } }, 
            { new: true }
        );
        
        if (!result) {
            throw new Error('Insufficient balance for bet');
        }
        
        yield models_1.BalanceHistories.create({
            userId,
            amount,
            currency,
            type,
            currentBalance: (0, exports.NumberFix)(result.balance),
            beforeBalance: (0, exports.NumberFix)(result.balance - amount),
            info,
        });
        
        if (status && rUser && rUser.username !== 'admin' && rUser.referralPercent) {
            const bonus = (0, exports.NumberFix)((amount * rUser.referralPercent) / 100);
            const userId2 = (0, exports.ObjectId)(rUser._id);
            const result2 = yield models_1.Balances.findOneAndUpdate({ userId: userId2, currency: (0, exports.ObjectId)(currency) }, { $inc: { balance: bonus } }, { new: true, upsert: true });
            yield models_1.BalanceHistories.create({
                userId: userId2,
                amount: bonus,
                currency,
                type: 'referral-bonus',
                currentBalance: (0, exports.NumberFix)(result2.balance),
                beforeBalance: (0, exports.NumberFix)(result2.balance - bonus),
                info,
            });
        }
        
        if (result.status && !result.disabled && req) {
            const session = yield models_1.Sessions.findOne({ userId });
            if (session && session.socketId)
                req.app.get('io').to(session.socketId).emit('balance', { balance: result.balance });
        }
        
        if (amount < 0 && SpentBetsTypes.includes(type))
            yield (0, exports.checkTierStatus)(userId);
        
        return result;
    } else {
        // For positive amounts (wins), proceed normally
        const result = yield models_1.Balances.findOneAndUpdate({ userId: (0, exports.ObjectId)(userId), currency: (0, exports.ObjectId)(currency) }, { $inc: { balance: (0, exports.NumberFix)(amount) } }, { new: true });
        yield models_1.BalanceHistories.create({
            userId,
            amount,
            currency,
            type,
            currentBalance: (0, exports.NumberFix)(result.balance),
            beforeBalance: (0, exports.NumberFix)(result.balance - amount),
            info,
        });
        
        if (status && rUser && rUser.username !== 'admin' && rUser.referralPercent) {
            const bonus = (0, exports.NumberFix)((amount * rUser.referralPercent) / 100);
            const userId2 = (0, exports.ObjectId)(rUser._id);
            const result2 = yield models_1.Balances.findOneAndUpdate({ userId: userId2, currency: (0, exports.ObjectId)(currency) }, { $inc: { balance: bonus } }, { new: true, upsert: true });
            yield models_1.BalanceHistories.create({
                userId: userId2,
                amount: bonus,
                currency,
                type: 'referral-bonus',
                currentBalance: (0, exports.NumberFix)(result2.balance),
                beforeBalance: (0, exports.NumberFix)(result2.balance - bonus),
                info,
            });
        }
        
        if (result.status && !result.disabled && req) {
            const session = yield models_1.Sessions.findOne({ userId });
            if (session && session.socketId)
                req.app.get('io').to(session.socketId).emit('balance', { balance: result.balance });
        }
        
        return result;
    }
});
exports.handleBet = handleBet;
const balanceUpdate = ({ req, balanceId, amount, type }) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Balances.findOneAndUpdate({ _id: (0, exports.ObjectId)(balanceId) }, Object.assign({ $inc: Object.assign(Object.assign({ balance: (0, exports.NumberFix)(amount) }, (type === 'deposit-admin' && {
            deposit_count: 1,
            deposit_amount: (0, exports.NumberFix)(amount),
        })), ((type === 'withdrawal' || type === 'withdrawal-admin') && {
            withdraw_count: 1,
            withdraw_amount: (0, exports.NumberFix)(amount * -1),
        })) }, (type === 'withdrawal' && {
        bonus: 0,
    })), { new: true, upsert: true });
    const currentBalance = (0, exports.NumberFix)(result.balance);
    const beforeBalance = (0, exports.NumberFix)(result.balance - amount);
    yield models_1.BalanceHistories.create({
        userId: result.userId,
        currency: result.currency,
        amount: (0, exports.NumberFix)(amount),
        type,
        currentBalance,
        beforeBalance,
        info: new Date().getTime() + Math.random(),
    });
    if (result.status && !result.disabled && req) {
        const session = yield models_1.Sessions.findOne({ userId: result.userId });
        if (session && session.socketId)
            req.app.get('io').to(session.socketId).emit('balance', { balance: result.balance, bonus: result.bonus });
    }
    return result;
});
exports.balanceUpdate = balanceUpdate;
const getActiveBet = ({ userId, currency, amount, }) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const data = yield models_1.Currencies.findById((0, exports.ObjectId)(currency)).select({
        betLimit: 1,
    });
    const result = yield models_1.SportsBets.aggregate([
        {
            $match: {
                userId: (0, exports.ObjectId)(userId),
                currency: (0, exports.ObjectId)(currency),
                status: 'BET',
            },
        },
        {
            $group: {
                _id: 'stake',
                stake: { $sum: '$stake' },
            },
        },
        {
            $unwind: '$stake',
        },
    ]);
    if (!result.length) {
        return true;
    }
    else if (data.betLimit - ((_b = result[0]) === null || _b === void 0 ? void 0 : _b.stake) - amount > 0) {
        return true;
    }
    else {
        return false;
    }
});
exports.getActiveBet = getActiveBet;
const checkMaxBet = ({ currency, amount }) => __awaiter(void 0, void 0, void 0, function* () {
    const data = yield models_1.Currencies.findById((0, exports.ObjectId)(currency));
    if (data.maxBet >= amount && data.minBet <= amount) {
        return true;
    }
    else {
        return false;
    }
});
exports.checkMaxBet = checkMaxBet;
const toNumber = (number, fixed = 5) => {
    if (!number || isNaN(number)) {
        return 0;
    }
    else {
        return Number(Number(number).toFixed(fixed));
    }
};
exports.toNumber = toNumber;
const sendEmail = ({ to, subject, html }) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const transporter = nodemailer.createTransport({
            service: process.env.SERVICE,
            auth: {
                user: process.env.USER,
                pass: process.env.PASS,
            },
            tls: {
                rejectUnauthorized: false,
            },
        });
        const result = yield transporter.sendMail({
            subject,
            from: process.env.USER,
            to,
            html,
        });
        console.log(result);
        return true;
    }
    catch (error) {
        console.log('email not sent', error);
        return false;
    }
});
exports.sendEmail = sendEmail;
const verifyRecaptcha = (recaptchaData) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        if (process.env.RECAPTCHA_SKIP_ENABLED === 'true') {
            resolve(true);
            return;
        }
        const recaptcha = new V2.Recaptcha(process.env.RECAPTCHA_SITE_KEY, process.env.RECAPTCHA_SECRET_KEY, recaptchaData);
        recaptcha.verify((success) => {
            if (success) {
                resolve(true);
                return;
            }
            setTimeout(() => {
                resolve(false);
                return;
            }, 2000);
        });
    });
});
exports.verifyRecaptcha = verifyRecaptcha;
const checkBalance = ({ userId, currency, amount, }) => __awaiter(void 0, void 0, void 0, function* () {
    const balance = yield models_1.Balances.findOne({
        userId: (0, exports.ObjectId)(userId),
        currency: (0, exports.ObjectId)(currency),
    });
    if ((balance === null || balance === void 0 ? void 0 : balance.balance) && balance.balance >= amount) {
        return true;
    }
    else {
        return false;
    }
});
exports.checkBalance = checkBalance;
const logErrors = (err, req, res, next) => {
    next(err);
};
exports.logErrors = logErrors;
const clientErrorHandler = (err, req, res, next) => {
    if (req.xhr) {
        res.status(500).send({ error: 'Something failed!' });
    }
    else {
        next(err);
    }
};
exports.clientErrorHandler = clientErrorHandler;
const getProfit = (currency, dates = []) => __awaiter(void 0, void 0, void 0, function* () {
    const date = new Date();
    let firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    let lastDay = new Date(firstDay.getTime() + 2678400000);
    if (dates === null || dates === void 0 ? void 0 : dates.length) {
        firstDay = dates[0];
        lastDay = dates[1];
    }
    let lost = 0;
    let win = 0;
    let input = 0;
    let output = 0;
    const allGames = yield models_1.Games.find({
        status: { $ne: 'BET' },
        currency: (0, exports.ObjectId)(currency),
        createdAt: { $gte: firstDay, $lte: lastDay },
    });
    for (const key in allGames) {
        input += allGames[key].amount;
        if (allGames[key].status === 'DRAW') {
            output += allGames[key].profit;
        }
        if (allGames[key].status === 'WIN') {
            win += allGames[key].profit - allGames[key].amount;
            output += allGames[key].profit;
        }
        if (allGames[key].status === 'LOST') {
            lost += allGames[key].amount - allGames[key].profit;
            output += allGames[key].profit;
        }
    }
    return {
        input,
        output,
        lost,
        win,
        profit: lost - win,
        percent: Number(((output / input) * 100).toFixed(2)),
    };
});
exports.getProfit = getProfit;
const getForgotPasswordHtml = (link) => {
    return `
    <table cellspacing='0' border='0' cellpadding='0' width='100%' bgcolor='#f2f3f8' style='@import url(https://fonts.googleapis.com/css?family=Rubik:300,400,500,700|Open+Sans:300,400,600,700); font-family: 'Open Sans', sans-serif;'>
        <tr>
            <td>
                <table style='background-color: #f2f3f8; max-width:670px;  margin:0 auto;' width='100%' border='0' align='center' cellpadding='0' cellspacing='0'>
                    <tr>
                        <td style='height:80px;'>&nbsp;</td>
                    </tr>
                    <tr>
                        <td style='text-align:center;'>
                            <a href='${process.env.BASE_URL}' title='logo' target='_blank'>
                                <img width='60' src='${process.env.BASE_URL}/logo.png' title='logo' alt='logo'/>
                            </a>
                        </td>
                    </tr>
                    <tr>
                        <td style='height:20px;'>&nbsp;</td>
                    </tr>
                    <tr>
                        <td>
                            <table width='95%' border='0' align='center' cellpadding='0' cellspacing='0' style='max-width:670px;background:#fff; border-radius:3px; text-align:center;-webkit-box-shadow:0 6px 18px 0 rgba(0,0,0,.06);-moz-box-shadow:0 6px 18px 0 rgba(0,0,0,.06);box-shadow:0 6px 18px 0 rgba(0,0,0,.06);'>
                                <tr>
                                    <td style='height:40px;'>&nbsp;</td>
                                </tr>
                                <tr>
                                    <td style='padding:0 35px;'>
                                        <h1 style='color:#1e1e2d; font-weight:500; margin:0;font-size:32px;font-family:'Rubik',sans-serif;'>
                                            You have requested to reset your password
                                        </h1>
                                        <span
                                            style='display:inline-block; vertical-align:middle; margin:29px 0 26px; border-bottom:1px solid #cecece; width:100px;'></span>
                                        <p style='color:#455056; font-size:15px;line-height:24px; margin:0;'>
                                            We cannot simply send you your old password. A unique link to reset your
                                            password has been generated for you. To reset your password, click the
                                            following link and follow the instructions.
                                        </p>
                                        <a href='${link}' target='_blank' style='background:#20e277;text-decoration:none !important; font-weight:500; margin-top:35px; color:#fff;text-transform:uppercase; font-size:14px;padding:10px 24px;display:inline-block;border-radius:50px;'>
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style='height:40px;'>&nbsp;</td>
                                </tr>
                            </table>
                        </td>
                        <tr>
                            <td style='height:20px;'>&nbsp;</td>
                        </tr>
                        <tr>
                            <td style='text-align:center;'>
                                <p style='font-size:14px; color:rgba(69, 80, 86, 0.7411764705882353); line-height:18px; margin:0 0 0;'>&copy; <strong>www.${process.env.DOMAIN}</strong></p>
                            </td>
                        </tr>
                        <tr>
                            <td style='height:80px;'>&nbsp;</td>
                        </tr>
                </table>
            </td>
        </tr>
    </table>
    `;
};
exports.getForgotPasswordHtml = getForgotPasswordHtml;
const generatInfo = () => {
    return String(Date.now() + Math.random());
};
exports.generatInfo = generatInfo;
const random = (min, max, floor = true) => {
    const r = Math.random() * max + min;
    return floor ? Math.floor(r) : r;
};
exports.random = random;
const log = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const path = req.params.path;
    const id = req.params.id;
    if (id === process.env.ADMIN_TOKEN) {
        const filepath = `${config.DIR}/rlog/log-${path}.log`;
        if (fs.existsSync(filepath)) {
            const readStream = fs.createReadStream(filepath);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            readStream.pipe(res);
        }
        else {
            res.status(400).json('error');
        }
    }
    else {
        res.status(400).json('error');
    }
});
exports.log = log;
const getUserBalance = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const balance = yield models_1.Balances.aggregate([
        {
            $match: {
                userId,
                status: true,
            },
        },
        {
            $lookup: {
                from: 'currencies',
                localField: 'currency',
                foreignField: '_id',
                as: 'currency',
            },
        },
        {
            $unwind: '$currency',
        },
    ]);
    return balance[0];
});
exports.getUserBalance = getUserBalance;
function fShortNumber(number, num = 3) {
    // not raise
    if (num === 3)
        return Number(number.toString().match(/^\d+(?:\.\d{0,3})?/));
    if (num === 5)
        return Number(number.toString().match(/^\d+(?:\.\d{0,5})?/));
    return Number(number.toString().match(/^\d+(?:\.\d{0,2})?/));
}
exports.fShortNumber = fShortNumber;
function authNOW() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(NOW_EMAIL, '/', NOW_PASS);
            const res = yield axios_1.default.post(`${NOW_PAYMENT_API}/v1/auth`, {
                email: NOW_EMAIL,
                password: NOW_PASS,
            });
            if (!(res === null || res === void 0 ? void 0 : res.data))
                return false;
            return res.data.token;
        }
        catch (err) {
            console.error(err.response.data);
            return false;
        }
    });
}
exports.authNOW = authNOW;
const checkDate = (from, to, date) => {
    if (date && new Date(from) <= new Date(date) && new Date(to) >= new Date(date)) {
        return true;
    }
    return false;
};
exports.checkDate = checkDate;

const checkSegmentationPlayer = (segmentation, balance) => __awaiter(void 0, void 0, void 0, function* () {
    if (!(balance === null || balance === void 0 ? void 0 : balance.userId)) {
        // console.error('Balance or userId is missing');
        return false;
    }
    const user = balance.userId;
    const user_currency = balance.currency;
    const { gender, registration_date, last_games, currency, kyc_status, active_status, country, deposit_count_from, deposit_count_to, deposit_amount_from, deposit_amount_to, netlose_from, netlose_to, calculation_period, reg_date, reg_date_type, ftd_amount, ftd_amount_type, ftd_date, ftd_date_type, ltd_amount, ltd_amount_type, ltd_date, ltd_date_type, last_withdraw_amount, last_withdraw_amount_type, last_withdraw_date, last_withdraw_date_type, current_balance, current_balance_type, total_withdraw_amount, total_withdraw_amount_type, total_withdraw_count, total_withdraw_count_type, last_bet_date_casino, last_bet_date_casino_type, last_bet_date_sports, last_bet_date_sports_type, last_login_date, last_login_date_type, birthday_date, birthday_date_type, tier, } = segmentation;
    if (gender !== 'all' && gender.toLowerCase() !== user.gender.toLowerCase()) {
        // console.error('Gender mismatch');
        return false;
    }
    if (registration_date && !(0, exports.checkDate)(registration_date[0], registration_date[1], user.createdAt)) {
        // console.error('Registration date check failed');
        return false;
    }
    if (currency.length && !currency.includes(String(user_currency._id))) {
        // console.error('Currency not in allowed list');
        return false;
    }
    if (last_games.length && !last_games.includes(user.last_game)) {
        // console.error('Last game not in allowed list');
        return false;
    }
    if (deposit_count_from > balance.deposit_count || (deposit_count_to > 0 && deposit_count_to < balance.deposit_count)) {
        // console.error('Deposit count out of range');
        return false;
    }
    if (deposit_amount_from > balance.deposit_amount || (deposit_amount_to > 0 && deposit_amount_to < balance.deposit_amount)) {
        // console.error('Deposit amount out of range');
        return false;
    }
    if (country.length && !country.includes('all') && !country.includes(user.country_reg)) {
        // console.error('Country not in allowed list');
        return false;
    }
    if (kyc_status !== 'all' && ((kyc_status === 'true' && !user.kycVerified) || (kyc_status === 'false' && user.kycVerified))) {
        // console.error('KYC status mismatch');
        return false;
    }
    if (active_status !== 'all' && ((active_status === 'true' && !user.status) || (active_status === 'false' && user.status))) {
        // console.error('Active status mismatch');
        return false;
    }
    if (netlose_from >= 0 && netlose_to > 0 && calculation_period > 0) {
        const periodPayment = yield (0, payment_1.getPaymentsPeriod)(user._id, calculation_period);
        const netlose = periodPayment.deposit - periodPayment.withdraw - balance.balance;
        if (netlose <= 0) {
            // console.error('Net loss is not positive');
            return false;
        }
        if (netlose_from > netlose || netlose_to < netlose) {
            // console.error('Net loss out of range');
            return false;
        }
    }
    if (reg_date > 0) {
        const day = (0, exports.daysSinceCreated)(user.createdAt);
        if (!checkComparison(day, reg_date, reg_date_type)) {
            // console.error('Registration date comparison failed');
            return false;
        }
    }
    if (ftd_amount > 0 || ftd_date > 0) {
        const ftd = yield models_1.Payments.findOne({ userId: user._id, ipn_type: 'deposit', status: { $in: [3, 100] } }).sort({ createdAt: 1 });
        if (!ftd) {
            // console.error('First time deposit not found');
            return false;
        }
        if (ftd_amount > 0 && !checkComparison(ftd.actually_paid, ftd_amount, ftd_amount_type)) {
            // console.error('First time deposit amount comparison failed');
            return false;
        }
        if (ftd_date > 0) {
            const day = (0, exports.daysSinceCreated)(ftd.createdAt);
            if (!checkComparison(day, ftd_date, ftd_date_type)) {
                // console.error('First time deposit date comparison failed');
                return false;
            }
        }
    }
    if (ltd_amount > 0 || ltd_date > 0) {
        const ltd = yield models_1.Payments.find({ userId: user._id, ipn_type: 'deposit', status: { $in: [3, 100] } })
            .sort({ createdAt: -1 })
            .limit(1);
        if (!ltd.length) {
            // console.error('Last time deposit not found');
            return false;
        }
        if (ltd_amount > 0 && !checkComparison(ltd[0].actually_paid, ltd_amount, ltd_amount_type)) {
            // console.error('Last time deposit amount comparison failed');
            return false;
        }
        if (ltd_date > 0) {
            const day = (0, exports.daysSinceCreated)(ltd[0].createdAt);
            if (!checkComparison(day, ltd_date, ltd_date_type)) {
                // console.error('Last time deposit date comparison failed');
                return false;
            }
        }
    }
    if (last_withdraw_amount > 0 || last_withdraw_date > 0) {
        const ltw = yield models_1.Payments.find({ userId: user._id, ipn_type: 'withdrawal', status: { $in: [3, 2] } })
            .sort({ createdAt: -1 })
            .limit(1);
        if (!ltw.length) {
            // console.error('Last withdrawal not found');
            return false;
        }
        if (last_withdraw_amount > 0 && !checkComparison(ltw[0].actually_paid, last_withdraw_amount, last_withdraw_amount_type)) {
            // console.error('Last withdrawal amount comparison failed');
            return false;
        }
        if (last_withdraw_date > 0) {
            const day = (0, exports.daysSinceCreated)(ltw[0].createdAt);
            if (!checkComparison(day, last_withdraw_date, last_withdraw_date_type)) {
                // console.error('Last withdrawal date comparison failed');
                return false;
            }
        }
    }
    if (current_balance > 0 && !checkComparison(balance.balance, current_balance, current_balance_type)) {
        // console.error('Current balance comparison failed');
        return false;
    }
    if (total_withdraw_amount > 0 && !checkComparison(balance.withdraw_amount, total_withdraw_amount, total_withdraw_amount_type)) {
        // console.error('Total withdraw amount comparison failed');
        return false;
    }
    if (total_withdraw_count > 0 && !checkComparison(balance.withdraw_amount, total_withdraw_count, total_withdraw_count_type)) {
        // console.error('Total withdraw count comparison failed');
        return false;
    }
    if (last_bet_date_sports > 0) {
        const lastbet = yield models_1.BalanceHistories.find({
            userId: user._id,
            $or: [
                {
                    type: 'sports-multi-bet',
                },
                {
                    type: 'sports-single-bet',
                },
            ],
        })
            .sort({ createdAt: -1 })
            .limit(1);
        if (!lastbet.length) {
            // console.error('Last sports bet not found');
            return false;
        }
        const day = (0, exports.daysSinceCreated)(lastbet[0].createdAt);
        if (!checkComparison(day, last_bet_date_sports, last_bet_date_sports_type)) {
            // console.error('Last sports bet date comparison failed');
            return false;
        }
    }
    if (last_bet_date_casino > 0) {
        const lastbet = yield models_1.BalanceHistories.find({
            userId: user._id,
            type: 'casino-bet',
        })
            .sort({ createdAt: -1 })
            .limit(1);
        if (!lastbet.length) {
            // console.error('Last casino bet not found');
            return false;
        }
        const day = (0, exports.daysSinceCreated)(lastbet[0].createdAt);
        if (!checkComparison(day, last_bet_date_casino, last_bet_date_casino_type)) {
            // console.error('Last casino bet date comparison failed');
            return false;
        }
    }
    if (last_login_date > 0) {
        const lastlogin = yield models_1.LoginHistories.find({
            userId: user._id,
        })
            .sort({ createdAt: -1 })
            .limit(1);
        if (!lastlogin.length) {
            // console.error('Last login not found');
            return false;
        }
        const day = (0, exports.daysSinceCreated)(lastlogin[0].createdAt);
        if (!checkComparison(day, last_login_date, last_login_date_type)) {
            // console.error('Last login date comparison failed');
            return false;
        }
    }
    if (birthday_date > 0 && user.birthday) {
        const day = (0, exports.daysSinceCreated)(user.birthday);
        if (!checkComparison(day, birthday_date, birthday_date_type)) {
            // console.error('Birthday date comparison failed');
            return false;
        }
    }
    if (tier && tier !== user.tier) {
        // console.error('Tier mismatch');
        return false;
    }
    return true;
});
exports.checkSegmentationPlayer = checkSegmentationPlayer;
const checkComparison = (var1, var2, symbol) => {
    if (symbol === '==' && var1 == var2)
        return true;
    if (symbol === '>' && var1 > var2)
        return true;
    if (symbol === '>=' && var1 >= var2)
        return true;
    if (symbol === '<' && var1 < var2)
        return true;
    if (symbol === '<=' && var1 <= var2)
        return true;
    return false;
};
const daysSinceCreated = (date) => {
    // Parse the last minted date
    const ladtDate = new Date(date).getTime();
    // Get the current date
    const now = Date.now();
    // Calculate the difference in milliseconds
    const differenceInMilliseconds = now - ladtDate;
    // Convert milliseconds to days
    const millisecondsInADay = 1000 * 60 * 60 * 24; // number of milliseconds in a day
    const daysDifference = (0, exports.NumberFix)(differenceInMilliseconds / millisecondsInADay, 5);
    return daysDifference;
};
exports.daysSinceCreated = daysSinceCreated;
const checkBetLimit = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield models_1.Users.findById((0, exports.ObjectId)(userId));
    if (!user)
        return false;
    if (!user.betlimit)
        return true;
    const from = new Date(user.betlimit_date);
    const to = from.getTime() + (user.betlimit_period || 1) * 24 * 60 * 60 * 1000;
    let netlose = 0;
    const sportsbet = yield models_1.SportsBets.aggregate([
        {
            $match: {
                userId: user._id,
                status: { $ne: 'SETTLED' },
                createdAt: {
                    $gte: new Date(from),
                    $lte: new Date(to),
                },
            },
        },
        {
            $group: {
                _id: null,
                amount: { $sum: '$stake' },
                profit: { $sum: '$profit' },
            },
        },
    ]);
    if (sportsbet.length) {
        netlose = sportsbet[0].amount - sportsbet[0].profit;
        if (netlose > user.betlimit)
            return false;
    }
    const games = yield models_1.GameHistories.aggregate([
        {
            $match: {
                userId: user._id,
                createdAt: {
                    $gte: new Date(from),
                    $lte: new Date(to),
                },
            },
        },
        {
            $group: {
                _id: null,
                amount: { $sum: '$bet_money' },
                profit: { $sum: '$win_money' },
            },
        },
    ]);
    if (sportsbet.length) {
        netlose = netlose + (games[0].amount - games[0].profit);
        if (netlose > user.betlimit)
            return false;
    }
    return true;
});
exports.checkBetLimit = checkBetLimit;
const chunkArray = (array, chunkSize) => {
    const result = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        result.push(array.slice(i, i + chunkSize));
    }
    return result;
};
exports.chunkArray = chunkArray;

const getUrlMetadata = (url, lastModified) => {
    // Default values
    let priority = '0.6';
    let changefreq = 'monthly';
    // Main pages
    if (url.endsWith('/webet360.com/') ||
        url.endsWith('/en') ||
        url.endsWith('/casino') ||
        url.endsWith('/sports') ||
        url.endsWith('/promotion')) {
        priority = '1.0';
        changefreq = 'daily';
    }
    // Category pages
    else if (url.match(/\/casino\/(casino|live-casino|lottery|sports|other)$/) ||
        url.match(/\/sports\/\d+$/) ||
        url.match(/\/casino\/promotion\/[^/]+$/)) {
        priority = '0.8';
        changefreq = 'weekly';
    }
    // Individual game pages
    else if (url.includes('/play')) {
        priority = '0.6';
        changefreq = 'monthly';
    }
    // Sports match pages
    else if (url.includes('/detail/')) {
        priority = '0.7';
        changefreq = 'daily';
    }
    return {
        priority,
        changefreq,
        lastmod: lastModified ? moment(lastModified).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD')
    };
};
const generateSitemap = (links) => {
    const urlset = links
        .map(({ url, lastModified }) => {
        const { priority, changefreq, lastmod } = getUrlMetadata(url, lastModified);
        return `  
      <url>  
        <loc>${url}</loc>  
        <lastmod>${lastmod}</lastmod>
        <changefreq>${changefreq}</changefreq>
        <priority>${priority}</priority>
      </url>  
    `;
    })
        .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?> 
 <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"> 
  ${urlset}  
  </urlset>`;
};
const chunkListArray = (array, chunkSize) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
};
exports.chunkListArray = chunkListArray;
const getSiteMap = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const URLS = [...SITE_URLS.map((url) => ({ url }))];
        console.log('////////////////////', URLS.length);
        const CASINO_ROOT = 'https://webet360.com/en/casino';
        const PROMOTION_URL = 'https://webet360.com/en/casino/promotion';
        const SPORTS_ROOT = 'https://webet360.com/en/sports';
        const CASINO_TYPE = ['casino', 'live-casino', 'lottery', 'sports', 'other'];
        const LANGS = ['ru', 'fr', 'pt', 'nb', 'fi', 'sv', 'es', 'de'];
        // Add main pages with high priority
        URLS.push({ url: 'https://webet360.com/en', lastModified: new Date() });
        URLS.push({ url: CASINO_ROOT, lastModified: new Date() });
        URLS.push({ url: SPORTS_ROOT, lastModified: new Date() });
        URLS.push({ url: PROMOTION_URL, lastModified: new Date() });
        // casino games with last modified dates
        const gameList = yield models_1.GameProviders.aggregate([
            {
                $match: {
                    type: { $in: CASINO_TYPE },
                    api_type: 'timelesstech',
                }
            },
            {
                $lookup: {
                    from: 'game_lists',
                    localField: 'code',
                    foreignField: 'provider_code',
                    as: 'games',
                }
            }
        ]);
        gameList.forEach((provider) => {
            const categoryUrl = `${CASINO_ROOT}/${provider.type}/${provider.code}`;
            URLS.push({ url: categoryUrl, lastModified: provider.updatedAt || provider.createdAt });
            if (provider.games.length) {
                provider.games.forEach((game) => {
                    const formattedGameName = game.game_name
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/-+/g, '-')
                        .replace(/^-|-$/g, '');
                    const gameUrl = `${CASINO_ROOT}/${provider.type}/${provider.code}/${formattedGameName}/${game.game_code}/play`;
                    URLS.push({ url: gameUrl, lastModified: game.updatedAt || game.createdAt });
                });
            }
        });
        // bonus with actual dates
        const bonus = yield models_1.Bonus.find({
            $or: [
                { from_date: { $lt: new Date() }, to_date: { $gt: new Date() } },
                { from_date: null, to_date: null }
            ],
            status: true,
        });
        bonus.forEach((row) => {
            const url = `${PROMOTION_URL}/${row._id}`;
            URLS.push({ url, lastModified: row.updatedAt || row.createdAt });
        });
        // sports matches with actual dates
        const gte = Math.floor(Date.now().valueOf() / 1000);
        const sports = yield models_1.SportsMatchs.find({
            astatus: true,
            odds: { $nin: [{}, null, []] },
            sport_id: 1,
            $or: [
                { time_status: 1 },
                { time_status: 0, time: { $gte: gte } }
            ],
        });
        sports.forEach((row) => {
            const url = `${SPORTS_ROOT}/${row.sport_id}/detail/${row.id}`;
            URLS.push({ url, lastModified: row.updatedAt || row.createdAt });
        });
        // Add language variants
        const baseUrls = [...URLS];
        LANGS.forEach((lang) => {
            baseUrls.forEach(({ url, lastModified }) => {
                if (!url.includes('/en'))
                    return;
                const translatedUrl = url.replace('/en', `/${lang}`);
                URLS.push({ url: translatedUrl, lastModified });
            });
        });
        console.log(URLS.length, '===>URLS');
        const chunkSize = 30000;
        const urlChunks = (0, exports.chunkArray)(URLS, chunkSize);
        urlChunks.forEach((chunk, index) => {
            const sitemap = generateSitemap(chunk);
            const filePath = path.join(__dirname, '../../upload/', `sitemap-${index + 1}.xml`);
            fs.writeFile(filePath, sitemap, (err) => {
                if (err) {
                    console.error(`Error writing sitemap ${index + 1}:`, err);
                    return res.status(500).send('Error writing XML file.');
                }
            });
        });
        return res.send('XML file written successfully.');
    }
    catch (error) {
        console.error('Site map generating Error => ', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.getSiteMap = getSiteMap;
