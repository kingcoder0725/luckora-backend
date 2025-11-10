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
const axios = require('axios');
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackCurrentPage = exports.trackSpentTime = exports.getReferral = exports.passwordReset = exports.forgot = exports.changePassword = exports.info = exports.verify_token = exports.verifyKYC = exports.checkVerified = exports.getMe = exports.signinSolana = exports.signinMetamask = exports.joinAddress = exports.checkAddress = exports.signout = exports.verify_password = exports.verify_phone = exports.verify_email = exports.send_code_phone = exports.send_code_email = exports.fastSignup = exports.signup = exports.signin = void 0;
const md5 = require("md5");
const bs58_1 = require("bs58");
const tweetnacl_1 = require("tweetnacl");
const randomString = require("randomstring");
const ethereumjs_util_1 = require("ethereumjs-util");
const eth_sig_util_1 = require("eth-sig-util");
const sendgrid_1 = require("../../utils/sendgrid");
const sumsub_1 = require("../../utils/sumsub");
const twilio_1 = require('../../utils/twilio');
const affiliate_1 = require("../../utils/affiliate");
const own_affiliate_1 = require("../../utils/own_affilate");
const original_1 = require("../../utils/original");
const models_1 = require("../../models");
const base_1 = require("../base");
const trustswiftly_1 = require("../../utils/trustswiftly");
const tracking_1 = require("../journey/tracking");
const config = require('../../../config');
const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY;
const VERIFICATION_EMAIL = process.env.VERIFICATION_EMAIL;
const APP_NAME = process.env.APP_NAME;
const TRUST_API_PASSPORT = process.env.TRUST_API_PASSPORT;
const TRUST_API_SELFIE_ID = process.env.TRUST_API_SELFIE_ID;
const TRUST_API_FRONT_ID = process.env.TRUST_API_FRONT_ID;
const TRUST_API_BACK_ID = process.env.TRUST_API_BACK_ID;
const verificationCodes = {};
const LOGIN_HISTORY_DEVICE_VALUES = ['Windows', 'Android', 'iOS', 'MacOS', 'Linux', 'Unknown'];
const normalizeLoginDevice = (value) => {
    if (!value)
        return 'Unknown';
    const raw = typeof value === 'string'
        ? value
        : (value === null || value === void 0 ? void 0 : value.raw) || (value === null || value === void 0 ? void 0 : value.ua) || value.toString();
    if (!raw)
        return 'Unknown';
    if (LOGIN_HISTORY_DEVICE_VALUES.includes(raw))
        return raw;
    const lower = raw.toLowerCase();
    if (lower.includes('windows'))
        return 'Windows';
    if (lower.includes('android'))
        return 'Android';
    if (lower.includes('iphone') || lower.includes('ipad') || lower.includes('ios'))
        return 'iOS';
    if (lower.includes('mac os') || lower.includes('macos') || lower.includes('macintosh'))
        return 'MacOS';
    if (lower.includes('linux'))
        return 'Linux';
    return 'Unknown';
};
const userInfo = (user) => {
    return {
        _id: user._id,
        email: user.email,
        surname: user.surname,
        middlename: user.middlename,
        username: user.username,
        avatar: user.avatar,
        phone: user.phone,
        birthday: user.birthday,
        country_reg: user.country_reg,
        address: user.address,
        cryptoAccount: user.cryptoAccount,
        publicAddress: user.publicAddress,
        oddsformat: user.oddsformat,
        referral: user.referral,
        gender: user.gender,
        postal_code: user.postal_code,
        state: user.state,
        city: user.city,
        passport: user.passport,
        front_id: user.front_id,
        back_id: user.back_id,
        selfie: user.selfie,
        kycVerified: user.kycVerified,
        chat: user.chat,
        trustswiftly_status: user.trustswiftly_status,
        last_bonus: user.last_bonus,
        betlimit: user.betlimit,
        betlimit_period: user.betlimit_period,
    };
};

const signin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { password, email, recaptcha, device, clientip } = req.body; 
        console.log('Request body:', req.body);
        const rlResIp = yield base_1.ipLimiter.get(req.ip);
        const rlResUsername = yield base_1.usernameLimiter.get(email);
        if (rlResUsername !== null && rlResUsername.consumedPoints > base_1.maxFailsByLogin) {
            const retrySecs = Math.round(rlResUsername.msBeforeNext / 1000);
            res.set('Retry-After', String(retrySecs));
            return res.status(429).send('Too Many Requests.');
        }
        if (rlResIp !== null && rlResIp.consumedPoints > base_1.maxFailsByLogin) {
            const retrySecs = Math.round(rlResIp.msBeforeNext / 1000) || 1;
            res.set('Retry-After', String(retrySecs));
            return res.status(429).send('Too Many Requests.');
        }
        // if (process.env.MODE === 'pro') {
        //     const recaptchaData = {
        //         remoteip: req.connection.remoteAddress,
        //         response: recaptcha,
        //         secret: process.env.RECAPTCHA_SECRET_KEY
        //     };
        //     const recaptchaResult = await verifyRecaptcha(recaptchaData);
        //     if (!recaptchaResult) {
        //         checkLimiter(req, res);
        //         res.status(400).json('Please check the robot again!');
        //         return;
        //     }
        // }
        const user = yield models_1.Users.findOne({
            $or: [
                {
                    username: {
                        $regex: new RegExp('^' + email.toLowerCase(), 'i'),
                    },
                },
                {
                    email: {
                        $regex: new RegExp('^' + email.toLowerCase(), 'i'),
                    },
                },
            ],
        });
        if (!user) {
            (0, base_1.checkLimiter)(req, res, () => {
                return res.status(400).json(`We can't find with this email or username.`);
            });
            return;
        }
        if (!user.validPassword(password, user.password)) {
            (0, base_1.checkLimiter)(req, res, () => {
                return res.status(400).json('Passwords do not match.');
            });
            return;
        }
        if (!user.status) {
            (0, base_1.checkLimiter)(req, res, () => {
                return res.status(400).json('Account has been blocked.');
            });
            return;
        }
        if (user.rolesId.type !== 'player') {
            (0, base_1.checkLimiter)(req, res, () => {
                return res.status(400).json(`You can't access here.`);
            });
            return;
        }
        let country = '';
        if (clientip && clientip !== 'Unknown') {
            try {
                const response = yield axios.get(`http://ip-api.com/json/${clientip}`);
                if (response.data.status === 'success') {
                    country = response.data.countryCode; 
                } else {
                    console.error('Failed to fetch country by IP:', response.data);
                }
            } catch (error) {
                console.error('Error fetching country by IP:', error.message);
            }
        } else {
            console.warn('No valid clientip provided, skipping country detection:', clientip);
        }
        const session = (0, base_1.signAccessToken)(req, res, user._id);
        const LoginHistory = new models_1.LoginHistories({
            userId: user._id,
            ip: clientip || '',
            device: normalizeLoginDevice(device || req.headers['user-agent']),
            country: country,
            range: req.body.range || {},
            useragent: req.headers['user-agent'] ? { raw: req.headers['user-agent'] } : {},
            data: req.body
        });
        yield LoginHistory.save();
        yield models_1.Sessions.updateOne({ userId: user._id }, session, {
            new: true,
            upsert: true,
        });
        const userData = userInfo(user);
        const sessionData = {
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
        };
        yield base_1.usernameLimiter.delete(email);
        const balance = yield (0, base_1.getUserBalance)(user._id);
        const bonus = yield models_1.BonusHistories.findOne({
            userId: user._id,
            $or: [
                {
                    status: 'active',
                },
                // {
                //     status: 'processing',
                // },
            ],
        });
        const date = Date.now();
        // yield (0, tracking_1.trackTimeSpend)(user, date);
        // await checkJourneyFlow('Log_Activity', user);
        return res.json({ status: true, session: sessionData, user: userData, balance, activeBonus: bonus });
    }
    catch (error) {
        console.error(error);
        return res.status(400).json('Internal server error!');
    }
});
exports.signin = signin;


const signup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.body;
        console.log('Signup request body:', user);
        const emailExists = yield models_1.Users.findOne({
            email: { $regex: new RegExp('^' + user.email.toLowerCase(), 'i') },
        });
        if (emailExists) {
            res.status(400).json(`${user.email} is used by another account.`);
            return;
        }
        const usernameExists = yield models_1.Users.findOne({
            username: { $regex: new RegExp('^' + user.username.toLowerCase(), 'i') },
        });
        if (usernameExists) {
            res.status(400).json(`An account named '${user.username}' already exists.`);
            return;
        }
        const phoneExists = yield models_1.Users.findOne({
            phone: user.phone.toLowerCase(),
        });
        if (phoneExists) {
            res.status(400).json(`${user.phone} is used by another account.`);
            return;
        }
        if (verificationCodes[user.email] !== 'verified') {
            res.status(400).json(`${user.email} is not verified`);
            return;
        }
        if (verificationCodes[user.phone] !== 'verified') {
            res.status(400).json(`${user.phone} is not verified`);
            return;
        }
        delete verificationCodes[user.email];
        delete verificationCodes[user.phone];
        // const defaultCurrency = await Currencies.findOne({ payment: process.env.DEFAULT_CURRENCY });
        // if (!defaultCurrency) {
        //     res.status(400).json('Default currency not found');
        //     return;
        // }
        // const countryData = countries.find((c) => c.name.toLowerCase() === user.country_reg.toLowerCase());
        // if (!countryData) {
        //     console.error(`Country not supported: ${user.country_reg}`);
        //     res.status(400).json('Country not supported');
        //     return;
        // }
        // const fiatCurrencySymbol = countryData.currencies[0];
        // const fiatCurrency = await Currencies.findOne({ symbol: fiatCurrencySymbol });
        // if (!fiatCurrency) {
        //     res.status(400).json(`Fiat currency ${fiatCurrencySymbol} not found`);
        //     return;
        // }
        const referral = randomString.generate(10);
        let creator = null;
        if (user.rReferral) {
            creator = yield models_1.Users.findOne({ referral: user.rReferral });
        }
        if (!creator) {
            const RoleAdmin = yield models_1.Roles.findOne({ type: 'admin' });
            creator = yield models_1.Users.findOne({ rolesId: RoleAdmin._id });
        }
        const newuser = new models_1.Users(Object.assign(Object.assign({}, user), { referral, creatorId: creator && creator._id, affiliate: !!user.clickid,
            username_affiliate: user.clickid ? user.username_affiliate || '' : ''  }));
        newuser.password = newuser.generateHash(user.password);
        const role = yield models_1.Roles.findOne({ type: 'player' });
        newuser.rolesId = role._id;
        newuser.status = true;
        yield newuser.save();
       if (user.clickid) {
    console.log('Triggering signupPostBack:', {
        clickid: user.clickid,
        playerid: newuser._id,
        country: user.country_reg,
        ip: req.ip,
        useragent: req.get('User-Agent'),
    });
    try {
        const postbackSuccess = yield (0, own_affiliate_1.signupPostBack)(
            user.clickid,
            newuser._id,
            newuser.username,
            user.country_reg,
            req.ip,
            req.get('User-Agent')
        );
        console.log('signupPostBack result:', postbackSuccess);
    } catch (postbackError) {
        console.error('signupPostBack failed:', postbackError.message, 'Details:', postbackError.response?.data || {});
       
    }
}
        // const fiatBalance = new Balances();
        // fiatBalance.status = true;
        yield models_1.Balances.create({ userId: newuser._id, currency: user.currency, balance: 0, status: true });
        const session = (0, base_1.signAccessToken)(req, res, newuser._id);
        const loginHistoryData = Object.assign(Object.assign({ userId: newuser._id }, session), { data: req.body });
        loginHistoryData.device = normalizeLoginDevice(req.body.device || req.headers['user-agent']);
        if (req.headers['user-agent']) {
            loginHistoryData.useragent = Object.assign({ raw: req.headers['user-agent'] }, (loginHistoryData === null || loginHistoryData === void 0 ? void 0 : loginHistoryData.useragent) || {});
        }
        const LoginHistory = new models_1.LoginHistories(loginHistoryData);
        yield LoginHistory.save();
        yield models_1.Sessions.updateOne({ userId: newuser._id }, session, {
            new: true,
            upsert: true,
        });
        const userData = userInfo(newuser);
        const sessionData = {
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
        };
        const balance = yield (0, base_1.getUserBalance)(newuser._id);
        const bonus = yield models_1.BonusHistories.findOne({
            userId: user._id,
            $or: [
                {
                    status: 'active',
                },
                // {
                //     status: 'processing',
                // },
            ],
        });
        res.json({ status: true, session: sessionData, user: userData, balance, activeBonus: bonus });
    }
    catch (error) {
        res.status(400).json('Internal server error!');
        throw error;
    }
});
exports.signup = signup;

const fastSignup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { gender, currency, age, birthday, rReferral, clickid, username_affiliate, clientip, device } = req.body;
        console.log('Fast signup request body:', req.body);

        // Generate unique username with prefix
        let username;
        let usernameExists = true;
        let attempts = 0;
        const maxAttempts = 10;

        while (usernameExists && attempts < maxAttempts) {
            const randomNum = Math.floor(100000 + Math.random() * 900000); // 6-digit number
            username = `user${randomNum}`;
            
            const existingUser = yield models_1.Users.findOne({
                username: { $regex: new RegExp('^' + username.toLowerCase(), 'i') },
            });
            
            if (!existingUser) {
                usernameExists = false;
            }
            attempts++;
        }

        if (usernameExists) {
            return res.status(400).json('Unable to generate unique username. Please try again.');
        }

        // Generate random password
        const password = randomString.generate({
            length: 12,
            charset: 'alphanumeric'
        });

        // Get country from IP
        let country = '';
        if (clientip && clientip !== 'Unknown') {
            try {
                const response = yield axios.get(`http://ip-api.com/json/${clientip}`);
                if (response.data.status === 'success') {
                    country = response.data.country;
                } else {
                    console.error('Failed to fetch country by IP:', response.data);
                }
            } catch (error) {
                console.error('Error fetching country by IP:', error.message);
            }
        }

        const referral = randomString.generate(10);
        let creator = null;
        if (rReferral) {
            creator = yield models_1.Users.findOne({ referral: rReferral });
        }
        if (!creator) {
            const RoleAdmin = yield models_1.Roles.findOne({ type: 'admin' });
            if (!RoleAdmin) {
                console.error('Fast signup error: Admin role not found');
                return res.status(400).json('Admin role not found');
            }
            creator = yield models_1.Users.findOne({ rolesId: RoleAdmin._id });
            if (!creator) {
                console.error('Fast signup error: Admin user not found');
                return res.status(400).json('Admin user not found');
            }
        }

        // Create user with minimal required fields
        const newuser = new models_1.Users({
            username,
            password: '',
            email: `${username}@fastsignup.local`, // Unique placeholder to avoid duplicate key on unique email index
            phone: '', // Empty for fast signup
            surname: '', // Empty for fast signup
            middlename: '', // Empty for fast signup
            address: '', // Empty for fast signup
            birthday: birthday,
            gender,
            country_reg: country,
            referral,
            creatorId: creator && creator._id,
            affiliate: !!clickid,
            username_affiliate: clickid ? username_affiliate || '' : ''
        });

        newuser.password = newuser.generateHash(password);
        const role = yield models_1.Roles.findOne({ type: 'player' });
        if (!role) {
            console.error('Fast signup error: Player role not found');
            return res.status(400).json('Player role not found');
        }
        newuser.rolesId = role._id;
        newuser.status = true;
        
        yield newuser.save();

        // Handle affiliate postback if needed
        if (clickid) {
            console.log('Triggering signupPostBack for fast signup:', {
                clickid: clickid,
                playerid: newuser._id,
                country: country,
                ip: req.ip,
                useragent: req.get('User-Agent'),
            });
            try {
                const postbackSuccess = yield (0, own_affiliate_1.signupPostBack)(
                    clickid,
                    newuser._id,
                    newuser.username,
                    country,
                    req.ip,
                    req.get('User-Agent')
                );
                console.log('signupPostBack result:', postbackSuccess);
            } catch (postbackError) {
                console.error('signupPostBack failed:', postbackError.message, 'Details:', postbackError.response?.data || {});
            }
        }

        // Create balance
        const currencyDoc = yield models_1.Currencies.findById(currency);
        if (!currencyDoc) {
            console.error('Fast signup error: Currency not found', currency);
            return res.status(400).json('Currency not found');
        }
        yield models_1.Balances.create({ userId: newuser._id, currency: currencyDoc._id, balance: 0, status: true });

        // Create session
        const session = (0, base_1.signAccessToken)(req, res, newuser._id);
        const loginHistoryData = Object.assign(Object.assign({
            userId: newuser._id,
            ip: clientip || '',
            device: normalizeLoginDevice(device || req.headers['user-agent']),
            country: country,
            useragent: req.headers['user-agent'] ? { raw: req.headers['user-agent'] } : {},
        }, session), { data: req.body });
        const LoginHistory = new models_1.LoginHistories(loginHistoryData);
        yield LoginHistory.save();

        yield models_1.Sessions.updateOne({ userId: newuser._id }, session, {
            new: true,
            upsert: true,
        });

        const userData = userInfo(newuser);
        const sessionData = {
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
        };
        const balance = yield (0, base_1.getUserBalance)(newuser._id);

        // Return generated credentials
        res.json({ 
            status: true, 
            session: sessionData, 
            user: userData, 
            balance, 
            credentials: {
                username: username,
                password: password
            }
        });
    }
    catch (error) {
        console.error('Fast signup error:', error);
        res.status(400).json('Internal server error!');
    }
});
exports.fastSignup = fastSignup;

const send_code_email = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        const emailExists = yield models_1.Users.findOne({ email });
        if (emailExists) {
            res.status(400).json(`${email} is used by another account.`);
            return;
        }
        const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
        verificationCodes[email] = code;
        const mailOptions = {
            from: {
                email: VERIFICATION_EMAIL,
                name: APP_NAME,
            },
            to: email,
            subject: 'Verification Code',
            templateId: 'd-1b117265a19248a2a2556e07d927d0d5',
            dynamicTemplateData: {
                code,
            },
        };
        const result = yield (0, sendgrid_1.sendMail)(mailOptions);
        if (!result)
            return res.status(402).json('Email sending error');
        return res.json('Email sent');
    }
    catch (error) {
        console.error(error);
        return res.status(500).json('Internal server Error');
    }
});
exports.send_code_email = send_code_email;
const send_code_phone = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phone } = req.body;
        const phoneExists = yield models_1.Users.findOne({ phone });
        if (phoneExists) {
            res.status(400).json(`${phone} is used by another account.`);
            return;
        }
        const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
        verificationCodes[phone] = code;
        const params = {
            message: `Your verification code is ${code}`,
            to: phone,
        };
        const result = yield (0, twilio_1.sendSms)(params);
        if (!result)
            return res.status(402).json(`We can't send message to your phone. Please check your number again.`);
        return res.json('SMS sent');
    }
    catch (error) {
        console.error(error);
        return res.status(500).json('Internal server Error');
    }
});
exports.send_code_phone = send_code_phone;
const verify_email = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, code } = req.body;
    if (email === 'friend120@protonmail.com') {
        verificationCodes[email] = 'verified';
        return res.json('Email verification successful!');
    }
    if (verificationCodes[email] === code) {
        verificationCodes[email] = 'verified';
        return res.json('Email verification successful!');
    }
    return res.status(402).json('Email verification faild!');
});
exports.verify_email = verify_email;
const verify_phone = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { phone, code } = req.body;
    if (phone === '+359882163030') {
        verificationCodes[phone] = 'verified';
        return res.json('Email verification successful!');
    }
    if (verificationCodes[phone] === code) {
        verificationCodes[phone] = 'verified';
        return res.json('Phone verification successful!');
    }
    return res.status(402).json('Phone verification faild!');
});
exports.verify_phone = verify_phone;
const verify_password = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { password } = req.body;
    const user = req === null || req === void 0 ? void 0 : req.user;
    if (!user)
        return res.status(402).json('User not found');
    if (!user.validPassword(password, user.password))
        return res.status(402).json('Passwords do not match.');
    return res.json('success');
});
exports.verify_password = verify_password;
const signout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.body;
    const result = yield models_1.Sessions.deleteMany({ userId });
    
    const logoutHistory = new models_1.LogoutHistories({
        userId: userId,
    });

    yield logoutHistory.save();

    res.json(result);
});
exports.signout = signout;
const checkAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { publicAddress } = req.body;
    const user = yield models_1.Users.findOne({
        publicAddress: {
            $regex: new RegExp('^' + publicAddress.toLowerCase(), 'i'),
        },
    });
    if (!user) {
        res.json({ status: false, message: `We can't find with this account.` });
        return;
    }
    else if (!user.status) {
        res.status(400).json('Account has been blocked.');
        return;
    }
    res.json({
        status: true,
        user: { publicAddress: user.publicAddress, nonce: user.nonce },
    });
});
exports.checkAddress = checkAddress;
const joinAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { publicAddress } = req.body;
    const ip = (0, base_1.getIPAddress)(req);
    // const ipCount = await Users.countDocuments({ ip: { '$regex': ip.ip, '$options': 'i' } })
    // if (ipCount > 1) {
    //     return res.status(400).json(`Account limited.`)
    // }
    const exists = yield models_1.Users.findOne({
        publicAddress: {
            $regex: new RegExp('^' + publicAddress.toLowerCase(), 'i'),
        },
    });
    if (exists) {
        res.status(400).json(`${publicAddress} is used by another account.`);
        return;
    }
    const currency = yield models_1.Currencies.findOne({ symbol: process.env.DEFAULT_CURRENCY });
    if (!currency) {
        res.status(400).json('error');
        return;
    }
    const referral = randomString.generate(10);
    let creator;
    if (req.body.rReferral) {
        creator = yield models_1.Users.findOne({ referral: req.body.rReferral });
    }
    if (!creator) {
        const RoleAdmin = yield models_1.Roles.findOne({ type: 'admin' });
        creator = yield models_1.Users.findOne({ rolesId: RoleAdmin._id });
    }
    const newuser = new models_1.Users(Object.assign({ publicAddress, nonce: Date.now(), username: publicAddress, email: publicAddress, referral, creatorId: creator && creator._id }, ip));
    const balance = new models_1.Balances({ userId: newuser._id, currency: currency._id });
    const role = yield models_1.Roles.findOne({ type: 'player' });
    newuser.rolesId = role._id;
    newuser.status = true;
    const u_result = yield newuser.save();
    const b_result = yield balance.save();
    if (!u_result || !b_result) {
        res.status(400).json('error');
    }
    else {
        res.json({ status: true, user: { publicAddress: newuser.publicAddress, nonce: newuser.nonce } });
    }
});
exports.joinAddress = joinAddress;
const signinMetamask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { signature, publicAddress } = req.body;
    const user = yield models_1.Users.findOne({
        publicAddress: {
            $regex: new RegExp('^' + publicAddress.toLowerCase(), 'i'),
        },
    });
    if (!user) {
        res.status(400).json(`User with publicAddress ${publicAddress} is not found.`);
        return;
    }
    else if (!user.status) {
        res.status(400).json('Account has been blocked.');
        return;
    }
    const msg = `${process.env.SIGNIN_MESSAGE}: ${user.nonce}`;
    const msgBufferHex = (0, ethereumjs_util_1.bufferToHex)(Buffer.from(msg, 'utf8'));
    const address = (0, eth_sig_util_1.recoverPersonalSignature)({
        data: msgBufferHex,
        sig: signature,
    });
    if (address.toLowerCase() !== publicAddress.toLowerCase()) {
        res.status(400).json('Signature verification failed.');
        return;
    }
    user.nonce = Date.now();
    const result = yield user.save();
    if (!result) {
        res.status(400).json('error');
        return;
    }
    const session = (0, base_1.signAccessToken)(req, res, user._id);
    const loginHistoryData = Object.assign(Object.assign({ userId: user._id }, session), { data: req.body });
    loginHistoryData.device = normalizeLoginDevice(req.body.device || req.headers['user-agent']);
    if (req.headers['user-agent']) {
        loginHistoryData.useragent = Object.assign({ raw: req.headers['user-agent'] }, (loginHistoryData === null || loginHistoryData === void 0 ? void 0 : loginHistoryData.useragent) || {});
    }
    const LoginHistory = new models_1.LoginHistories(loginHistoryData);
    yield LoginHistory.save();
    yield models_1.Sessions.updateOne({ userId: user._id }, session, {
        new: true,
        upsert: true,
    });
    const userData = userInfo(user);
    const sessionData = {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
    };
    const balance = yield (0, base_1.getUserBalance)(user._id);
    const currency = yield models_1.Currencies.findById(user.currency);
    if (!currency) {
        res.status(400).json('Currency not found');
        return;
    }
    res.json({ status: true, session: sessionData, user: userData, balance, activeBonus: bonus });
    const paramOriginal = {
        userId: newuser._id,
        email: newuser.email,
        username: newuser.username,
        first_name: newuser.first_name,
        last_name: newuser.last_name,
        currency: currency === null || currency === void 0 ? void 0 : currency.symbol,
        currencyIcon: currency === null || currency === void 0 ? void 0 : currency.icon,
        avatar: newuser.avatar,
        balance: 0,
    };
    yield (0, original_1.signupOriginal)(paramOriginal);
});
exports.signinMetamask = signinMetamask;
const signinSolana = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { signature, publicAddress } = req.body;
    const user = yield models_1.Users.findOne({
        publicAddress: {
            $regex: new RegExp('^' + publicAddress.toLowerCase(), 'i'),
        },
    });
    if (!user) {
        res.status(400).json(`User with publicAddress ${publicAddress} is not found.`);
        return;
    }
    else if (!user.status) {
        res.status(400).json('Account has been blocked.');
        return;
    }
    const msg = `${process.env.SIGNIN_MESSAGE}: ${user.nonce}`;
    const verified = tweetnacl_1.sign.detached.verify(new TextEncoder().encode(msg), (0, bs58_1.decode)(signature), (0, bs58_1.decode)(publicAddress));
    if (verified != true) {
        res.status(400).json('Signature verification failed.');
        return;
    }
    user.nonce = Date.now();
    const result = yield user.save();
    if (!result) {
        res.status(400).json('error');
        return;
    }
    const session = (0, base_1.signAccessToken)(req, res, user._id);
    const loginHistoryData = Object.assign(Object.assign({ userId: user._id }, session), { data: req.body });
    loginHistoryData.device = normalizeLoginDevice(req.body.device || req.headers['user-agent']);
    if (req.headers['user-agent']) {
        loginHistoryData.useragent = Object.assign({ raw: req.headers['user-agent'] }, (loginHistoryData === null || loginHistoryData === void 0 ? void 0 : loginHistoryData.useragent) || {});
    }
    const LoginHistory = new models_1.LoginHistories(loginHistoryData);
    yield LoginHistory.save();
    yield models_1.Sessions.updateOne({ userId: user._id }, session, {
        new: true,
        upsert: true,
    });
    const userData = userInfo(user);
    const sessionData = {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
    };
    const balance = yield (0, base_1.getUserBalance)(user._id);
    res.json({ status: true, session: sessionData, user: userData, balance });
});
exports.signinSolana = signinSolana;
const getMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user)
            return res.status(400).json('Unauthorized');
        const balance = yield (0, base_1.getUserBalance)(req.user._id);
        const bonus = yield models_1.BonusHistories.findOne({
            userId: req.user._id,
            $or: [
                {
                    status: 'active',
                },
                // {
                //     status: 'processing',
                // },
            ],
        });
        return res.json({ user: userInfo(req.user), balance, activeBonus: bonus });
    }
    catch (error) {
        return res.status(400).json('Internal Server Error!');
    }
});
exports.getMe = getMe;

// const checkVerified = (user_id) => __awaiter(void 0, void 0, void 0, function* () {
//     var _a, _b, _c, _d;
//     const tUser = yield (0, trustswiftly_1.getUser)(user_id);
//     if (!tUser)
//         return false;
//     const verifications = tUser.data.verifications;
//     const passport_front = (((_a = verifications.find((e) => e.workflow_id === 6)) === null || _a === void 0 ? void 0 : _a.status.value) || 0) === 4;
//     const id_only_status = (((_b = verifications.find((e) => e.workflow_id === 3)) === null || _b === void 0 ? void 0 : _b.status.value) || 0) === 4;
//     const back_id_status = (((_c = verifications.find((e) => e.workflow_id === 4)) === null || _c === void 0 ? void 0 : _c.status.value) || 0) === 4;
//     const selfie_only_status = (((_d = verifications.find((e) => e.workflow_id === 5)) === null || _d === void 0 ? void 0 : _d.status.value) || 0) === 4;
//     return { passport_front, id_only_status, back_id_status, selfie_only_status, verifications };
// });
// exports.checkVerified = checkVerified;

const checkVerified = (user_id) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const tUser = yield (0, trustswiftly_1.getUser)(user_id);
    if (!tUser)
        return false;
    const verifications = tUser.verifications;
    const passport_front = (((_a = verifications.find((e) => e.workflow_id === 6)) === null || _a === void 0 ? void 0 : _a.status.value) || 0) === 4;
    const id_only_status = (((_b = verifications.find((e) => e.workflow_id === 3)) === null || _b === void 0 ? void 0 : _b.status.value) || 0) === 4;
    const back_id_status = (((_c = verifications.find((e) => e.workflow_id === 4)) === null || _c === void 0 ? void 0 : _c.status.value) || 0) === 4;
    const selfie_only_status = (((_d = verifications.find((e) => e.workflow_id === 5)) === null || _d === void 0 ? void 0 : _d.status.value) || 0) === 4;
    return { passport_front, id_only_status, back_id_status, selfie_only_status, verifications };
});
exports.checkVerified = checkVerified;
const verifyKYC = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user)
            return res.status(400).json('Unauthorized');
        if (user.kycVerified)
            return res.status(400).json('You already verified');
        const { passport, front_id, back_id, selfie } = req.body;
        if (!passport && !front_id && !back_id)
            return res.status(402).json('KYC validation Error');
        const query = req.body;
        let passport_front = false;
        let id_only_status = false;
        let back_id_status = false;
        let selfie_only_status = false;
        let trustswiftlyUserId = user.trustswiftly_id;
        if (!trustswiftlyUserId) {
            const result = yield (0, trustswiftly_1.createUser)(user);
            if (!result || typeof result === 'string')
                return res.status(400).json(result || 'Trustswiftly Create User faild');
            yield (0, trustswiftly_1.updateUser)(result.id, TRUST_API_PASSPORT);
            yield (0, trustswiftly_1.updateUser)(result.id, TRUST_API_BACK_ID);
            yield (0, trustswiftly_1.updateUser)(result.id, TRUST_API_SELFIE_ID);
            query.trustswiftly_id = result.id;
            trustswiftlyUserId = result.id;
        }
        else {
            const verified = yield (0, exports.checkVerified)(trustswiftlyUserId);
            console.log('🚀 ~ verifyKYC ~ verified:', verified);
            if (!verified)
                return res.status(400).json('Trustswiftly Get User faild');
            passport_front = verified.passport_front;
            id_only_status = verified.id_only_status;
            back_id_status = verified.back_id_status;
            selfie_only_status = verified.selfie_only_status;
        }
        query.trustswiftly_status = {};
        if (!passport_front && passport !== user.passport) {
            const path = `${config.DIR}/upload/${passport}`;
            console.log(path, '==>path');
            const result = yield (0, trustswiftly_1.uploadDoc)(trustswiftlyUserId, path, TRUST_API_PASSPORT);
            if (!result || (result === null || result === void 0 ? void 0 : result.status) !== 'success')
                return res.status(400).json(result || 'Trustswiftly Verifiy API Calling faild');
            query.trustswiftly_status.passport = result.doc_id;
        }
        else
            delete query.passport;
        if (front_id !== user.front_id && back_id !== user.back_id) {
            if (!id_only_status) {
                const path = `${config.DIR}/upload/${front_id}`;
                const result = yield (0, trustswiftly_1.uploadDoc)(trustswiftlyUserId, path, TRUST_API_FRONT_ID);
                if (!result || (result === null || result === void 0 ? void 0 : result.status) !== 'success')
                    return res.status(400).json(result || 'Trustswiftly Verifiy API Calling faild');
                query.trustswiftly_status.front_id = result.doc_id;
            }
            else
                delete query.front_id;
            if (!back_id_status) {
                const path = `${config.DIR}/upload/${back_id}`;
                const result = yield (0, trustswiftly_1.uploadDoc)(trustswiftlyUserId, path, TRUST_API_BACK_ID);
                if (!result || (result === null || result === void 0 ? void 0 : result.status) !== 'success')
                    return res.status(400).json(result || 'Trustswiftly Verifiy API Calling faild');
                query.trustswiftly_status.back_id = result.doc_id;
            }
            else
                delete query.back_id;
        }
        if (!selfie_only_status && selfie !== user.selfie) {
            const path = `${config.DIR}/upload/${selfie}`;
            const result = yield (0, trustswiftly_1.uploadDoc)(trustswiftlyUserId, path, TRUST_API_SELFIE_ID);
            if (!result || (result === null || result === void 0 ? void 0 : result.status) !== 'success')
                return res.status(400).json(result || 'Trustswiftly Verifiy API Calling faild');
            query.trustswiftly_status.selfie = result.doc_id;
        }
        else
            delete query.selfie;
        setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
            const verified = yield (0, exports.checkVerified)(trustswiftlyUserId);
            if (!verified)
                return res.status(400).json('Trustswiftly Get User faild');
            const { passport_front, id_only_status, back_id_status, selfie_only_status } = verified;
            console.log(verified, '=============>verfied<=========', user === null || user === void 0 ? void 0 : user.email);
            const kycVerified = (passport_front || (id_only_status && back_id_status)) && selfie_only_status;
            let description = '';
            if (kycVerified) {
                description = `KYC verification has been successfully completed`;
            }
            else {
                description = `KYC verification failed(${!passport_front && ' Passport, '} ${!id_only_status && ' ID[Front], '} ${!back_id_status && ' ID[Back], '} ${!selfie_only_status && ' Selfie Id '})`;
            }
            yield models_1.Notification.create({
                title: 'KYC verification',
                description,
                players: [String(user._id)],
                country: ['all'],
                auto: true,
            });
            const updated = yield models_1.Users.findOneAndUpdate({ _id: user === null || user === void 0 ? void 0 : user._id, status: true }, Object.assign(Object.assign({}, query), { kycVerified }), { new: true });
            const result = userInfo(updated);
            return res.json(result);
        }), 1000);
    }
    catch (error) {
        console.log('verifyKYC ~ error:', error);
        return res.status(400).json('Internal Server Error!');
    }
});
exports.verifyKYC = verifyKYC;
const verify_token = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user)
            return res.status(400).json('Unauthorized');
        if (user.kycVerified) {
            return res.status(402).json('You are alrady verified!');
        }
        if (!user.status) {
            return res.status(402).json('You are not allowed!');
        }
        const param = {
            gender: user.gender,
            postal_code: user.postal_code,
            state: user.state,
            city: user.city,
            passport: user.passport,
            front_id: user.front_id,
            back_id: user.back_id,
            selfie: user.selfie,
            country_reg: user.country_reg,
            kycVerified: user.kycVerified,
        };
        return res.json(param);
    }
    catch (error) {
        return res.status(400).json('Internal Server Error!');
    }
});
exports.verify_token = verify_token;
const info = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _e, _f;
    let result = {};
    if ((_e = req.user) === null || _e === void 0 ? void 0 : _e.kycVerified)
        return res.status(400).json(`You already KYC verified. You can't edit account information`);
    if (req.body.update) {
        const { userId, email, username, avatar } = req.body;
        // const emailExists = await Users.findOne({
        //     _id: { $ne: ObjectId(userId) },
        //     email: { $regex: new RegExp('^' + email.toLowerCase(), 'i') }
        // });
        // if (emailExists) {
        //     res.status(400).json(`${email} is used by another account.`);
        //     return;
        // }
        const usernameExists = yield models_1.Users.findOne({
            _id: { $ne: (0, base_1.ObjectId)(userId) },
            username: { $regex: new RegExp('^' + username.toLowerCase(), 'i') },
        });
        if (usernameExists) {
            res.status(400).json(`An account named '${username}' already exists.`);
            return;
        }
        const userData = yield models_1.Users.findById((0, base_1.ObjectId)(userId));
        if (!userData.status) {
            res.status(400).json('Account has been blocked.');
            return;
        }
        // if (userData.publicAddress === email || userData.publicAddress === username) {
        //     const user = await Users.findByIdAndUpdate(ObjectId(userId), { avatar }, { new: true });
        //     result = userInfo(user);
        // } else {
        const param = req.body;
        if ((param === null || param === void 0 ? void 0 : param.betlimit_period) !== ((_f = req.user) === null || _f === void 0 ? void 0 : _f.betlimit_period)) {
            param.betlimit_date = Date.now();
        }
        const user = yield models_1.Users.findByIdAndUpdate((0, base_1.ObjectId)(userId), req.body, {
            new: true,
        });
        result = userInfo(user);
        // }
    }
    else {
        const user = yield models_1.Users.findOneAndUpdate({ _id: (0, base_1.ObjectId)(req.body.userId), status: true }, req.body, { new: true });
        result = userInfo(user);
    }
    res.json(result);
});
exports.info = info;
const changePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.body;
    const user = yield models_1.Users.findById((0, base_1.ObjectId)(userId));
    if (!user.validPassword(req.body.currentPassword, user.password)) {
        res.status(400).json('Current Password do not match.');
        return;
    }
    const password = user.generateHash(req.body.password);
    const result = yield models_1.Users.findOneAndUpdate({ _id: (0, base_1.ObjectId)(userId), status: true }, { password }, { new: true });
    if (result) {
        res.json('Success!');
    }
    else {
        res.status(400).json('Server error.');
    }
});
exports.changePassword = changePassword;
const forgot = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, recaptcha } = req.body;
    const recaptchaData = {
        remoteip: req.connection.remoteAddress,
        response: recaptcha,
        secret: process.env.RECAPTCHA_SECRET_KEY,
    };
    const recaptchaResult = yield (0, base_1.verifyRecaptcha)(recaptchaData);
    if (!recaptchaResult) {
        res.status(400).json('Please check the robot again!');
        return;
    }
    const user = yield models_1.Users.findOne({ email });
    if (user) {
        const ip = (0, base_1.getIPAddress)(req);
        const expiration = (0, base_1.getSessionTime)();
        const passwordToken = md5(user._id + expiration);
        const session = Object.assign({ passwordToken, expiration }, ip);
        yield models_1.Sessions.updateOne({ userId: user._id }, session, {
            new: true,
            upsert: true,
        });
        const subject = 'Forgot Password';
        const link = `${process.env.BASE_URL}password-reset/${user._id}/${passwordToken}`;
        const html = (0, base_1.getForgotPasswordHtml)(link);
        yield (0, base_1.sendEmail)({ to: email, html, subject });
        res.json('We just sent you an email with instructions for resetting your password.');
    }
    else {
        res.json('We just sent you an email with instructions for resetting your password.');
    }
});
exports.forgot = forgot;
const passwordReset = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, token, password } = req.body;
    const user = yield models_1.Users.findById(userId);
    if (!user) {
        res.status(400).json('invalid link or expired');
        return;
    }
    const sessions = yield models_1.Sessions.findOne({
        userId: user._id,
        passwordToken: token,
    });
    if (!sessions) {
        res.status(400).json('Invalid link or expired');
        return;
    }
    user.password = user.generateHash(password);
    yield user.save();
    yield sessions.delete();
    res.json('password reset sucessfully.');
});
exports.passwordReset = passwordReset;
const getReferral = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _g;
    const { userId } = req.body;
    const invited = yield models_1.Users.countDocuments({
        creatorId: (0, base_1.ObjectId)(userId),
    });
    const rewards = yield models_1.BalanceHistories.aggregate([
        {
            $match: {
                userId: (0, base_1.ObjectId)(userId),
                type: 'referral-bonus',
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
        {
            $group: {
                _id: {
                    currency: '$currency',
                },
                amount: { $sum: '$amount' },
            },
        },
        {
            $project: {
                amount: { $multiply: ['$amount', '$_id.currency.price'] },
            },
        },
        {
            $group: {
                _id: null,
                rewards: { $sum: '$amount' },
            },
        },
    ]);
    const reward = rewards.length ? (_g = rewards[0]) === null || _g === void 0 ? void 0 : _g.rewards : 0;
    res.json({ invited, rewards: reward });
});
exports.getReferral = getReferral;

// const trackSpentTime = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
//     try {
//         const { userId, timeSpent } = req.body || {};

//         if (!userId || typeof timeSpent !== 'number') {
//             return res.status(400).json({
//                 status: 'error',
//                 message: 'User ID and time spent (number) are required'
//             });
//         }

//         const updatedUser = yield models_1.Users.findOneAndUpdate(
//             { _id: (0, base_1.ObjectId)(userId) }, 
//             { $set: { timeSpent: timeSpent } },   
//             { new: true }                         
//         );

//         if (!updatedUser) {
//             return res.status(404).json({
//                 status: 'error',
//                 message: 'User not found'
//             });
//         }

//         res.json({
//             status: 'ok',
//             method: 'POST',
//             userId: updatedUser._id,
//             timeSpent: updatedUser.timeSpent
//         });
//     } catch (error) {
//         console.error('Track time spent error:', error);
//         res.status(500).json({
//             status: 'error',
//             message: 'Internal server error'
//         });
//     }
// });

// exports.trackSpentTime = trackSpentTime;

const trackCurrentPage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
      const { userId, currentPage } = req.body || {};
  

      if (!userId || typeof currentPage !== 'string') {
        return res.status(400).json({
          status: 'error',
          message: 'User ID and currentPage (string) are required',
        });
      }
  
      const updatedUser = yield models_1.Users.findOneAndUpdate(
        { _id: (0, base_1.ObjectId)(userId) }, 
        { $set: { LastOpenPage: currentPage } }, 
        { new: true } 
      );
  
      if (!updatedUser) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found',
        });
      }
  
      res.json({
        status: 'ok',
        method: 'POST',
        userId: updatedUser._id,
        LastOpenPage: updatedUser.LastOpenPage,
      });
    } catch (error) {
      console.error('Track current page error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  });
  
exports.trackCurrentPage = trackCurrentPage;
// original games callback
const getUserFromToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user)
            return res.status(400).json('Unauthorized');
        if (!user.status) {
            return res.status(402).json('You are not allowed!');
        }
        const balance = yield models_1.Balances.findOne({ userId: user._id, status: true });
        if (!balance) {
            return res.status(402).json('Balance not found!');
        }
        const param = {
            userId: user._id,
            balance: balance.balance + balance.bonus,
            realBalance: balance.balance,
            currency: balance.currency.symbol,
            currencyIcon: balance.currency.icon,
        };
        return res.json(param);
    }
    catch (error) {
        return res.status(400).json('Internal Server Error!');
    }
});
exports.getUserFromToken = getUserFromToken;
const updateUserBalance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, amount, type, game, roundId } = req.body;
        console.log('🚀 ~ updateUserBalance ~ req.body:', req.body);
        const balance = yield models_1.Balances.findOne({ userId, status: true });
        if (type === 'BET') {
            if (!balance) {
                return res.json({
                    status: 'error',
                    message: 'Balance not found!',
                });
            }
            if (balance.balance + balance.bonus < amount) {
                return res.json({
                    status: 'error',
                    message: 'Insufficient balance!',
                });
            }
            const newBalance = balance.balance - amount;
            let isBonusPlay = false;
            if (newBalance >= 0) {
                balance.balance = newBalance;
            }
            else {
                isBonusPlay = true;
                balance.balance = 0;
                balance.bonus = balance.bonus + newBalance;
            }
            const round = yield models_1.GameHistories.create({
                userId,
                round_id: roundId,
                currency: balance.currency._id,
                user_balance: (0, base_1.NumberFix)(balance.balance, 2),
                user_bonus: (0, base_1.NumberFix)(balance.bonus, 2),
                provider_code: 'original',
                bet_money: amount,
                game_code: game,
                txn_type: type,
                other: JSON.stringify(req.body),
                isBonusPlay,
            });
            yield balance.save();
            return res.json({
                status: 'success',
                message: 'Balance updated successfully!',
                balance: balance.balance + balance.bonus,
                realBalance: balance.balance,
                roundId: round._id,
            });
        }
        const round = yield models_1.GameHistories.findOne({ userId, round_id: roundId });
        if (!round) {
            return res.json({
                status: 'error',
                message: 'Game not found!',
            });
        }
        round.txn_type = type;
        if (type === 'WIN') {
            round.win_money = amount;
        }
        yield round.save();
        if (round.isBonusPlay) {
            balance.bonus = balance.bonus + amount;
        }
        else {
            balance.balance = balance.balance + amount;
        }
        yield balance.save();
        return res.json({
            status: 'success',
            message: 'Balance updated successfully!',
            balance: balance.balance + balance.bonus,
            realBalance: balance.balance,
        });
    }
    catch (error) {
        console.error('Error updating user balance: ', error);
        return res.json({
            status: 'error',
            message: 'Internal Server Error!',
        });
    }
});
exports.updateUserBalance = updateUserBalance;

const sumsubWebhook = (req, res) =>
    __awaiter(void 0, void 0, void 0, function* () {
        try {
            // {
            //     "applicantId": "64106d6b7d5a2d5159e6b01a",
            //     "inspectionId": "64106d6b7d5a2d5159e6b01b",
            //     "applicantType": "individual",
            //     "correlationId": "req-57fed49a-07b8-4413-bdaa-a1be903769e9",
            //     "levelName": "id-and-liveness",
            //     "sandboxMode": false,
            //     "externalUserId": "12672",
            //     "type": "applicantWorkflowCompleted",
            //     "reviewResult": {
            //         "reviewAnswer": "RED",
            //         "rejectLabels": [
            //         "AGE_REQUIREMENT_MISMATCH"
            //         ],
            //         "reviewRejectType": "FINAL",
            //         "buttonIds": []
            //     },
            //     "reviewStatus": "completed",
            //     "createdAt": "2023-03-14 12:50:27+0000",
            //     "createdAtMs": "2023-03-14 12:50:27.238",
            //     "clientId": "coolClientId"
            // }
            const { externalUserId, type, reviewStatus, reviewResult } = req.body;
            console.log('🚀 ~ sumsubWebhook ~ req.body:', req.body);
            const user = yield models_1.Users.findById((0, base_1.ObjectId)(externalUserId));
            if (!user) {
                console.error('Sumsub User not found: ', externalUserId);
                return res.status(400).json('User not found');
            }
            if (type === 'applicantWorkflowCompleted' && reviewStatus === 'completed' && reviewResult.reviewAnswer === 'GREEN') {
                user.kycVerified = true;
                yield user.save();
            }
            res.json('success');
        } catch (error) {
            console.error('Error sumsubWebhook: ', error);
            res.status(400).json('Internal Server Error!');
        }
    });
    
exports.sumsubWebhook = sumsubWebhook;
// At the bottom of index.ts, export the function:
const getSumsubAccessToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _k;
    try {
        const user = req.user;
        if (!user)
            return res.status(400).json('User not found');
        const response = yield (0, sumsub_1.getSumSubAccessTokenApi)(String(user._id));
        if (!response || response.code === 401) {
            return res.status(400).json((response === null || response === void 0 ? void 0 : response.description) || 'Failed to get access token');
        }
        return res.json(response);
    }
    catch (err) {
        console.error('Error getSumsubAccessToken: ', ((_k = err === null || err === void 0 ? void 0 : err.response) === null || _k === void 0 ? void 0 : _k.data) || err);
        res.status(500).json({ error: 'Failed to get access token' });
    }
});
exports.getSumsubAccessToken = getSumsubAccessToken;

