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
exports.authCheck = exports.checkKYC = exports.deleteOne = exports.updateOne = exports.importCSV = exports.getCsv = exports.label = exports.agentlist = exports.list = exports.getOne = exports.get = exports.changePassword = exports.signout = exports.create = exports.signup = exports.signin = void 0;
const mongoose_1 = require("mongoose");
const randomString = require("randomstring");
const base_1 = require("../base");
const models_1 = require("../../models");
const _1 = require(".");
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD;
const aggregateQuery = [
    {
        $lookup: {
            from: 'roles',
            localField: 'rolesId',
            foreignField: '_id',
            as: 'role',
        },
    },
    {
        $lookup: {
            from: 'balances',
            localField: '_id',
            foreignField: 'userId',
            as: 'balance',
        },
    },
    {
        $lookup: {
            from: 'currencies',
            localField: 'balance.currency',
            foreignField: '_id',
            as: 'currency',
        },
    },
    {
        $unwind: '$role',
    },
    {
        $project: {
            'currency.abi': 0,
        },
    },
    {
        $sort: { createdAt: 1 },
    },
];
const signin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { password, email } = req.body;
        if (!password || !email)
            return res.status(400).json('Invalid field!');
        if (!req.headers.admin)
            return res.status(400).json(`You can't access here.`);
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
        if (user.rolesId.type !== 'super_admin' && user.rolesId.type !== 'admin' && user.rolesId.type !== 'agent') {
            (0, base_1.checkLimiter)(req, res, () => {
                return res.status(400).json(`You can't access here.`);
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
        const session = (0, base_1.signAccessToken)(req, res, user._id);
        const LoginHistory = new models_1.LoginHistories(Object.assign({ userId: user._id }, session));
        yield LoginHistory.save();
        yield models_1.Sessions.updateOne({ userId: user._id }, session, {
            new: true,
            upsert: true,
        });
        const userData = {
            _id: user._id,
            email: user.email,
            username: user.username,
            referral: user.referral,
            avatar: user.avatar,
            cryptoAccount: user.cryptoAccount,
            publicAddress: user.publicAddress,
            oddsformat: user.oddsformat,
            role: user.rolesId.type,
            roleId: user.rolesId._id,
        };
        const sessionData = {
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
        };
        yield base_1.usernameLimiter.delete(email);
        return res.json({ status: true, session: sessionData, user: userData });
    }
    catch (error) {
        console.error(error);
        return res.status(400).json('Internal Server Error');
    }
});
exports.signin = signin;
const signup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (req.headers.password !== ((_a = process.env.ADMIN_PASSWORD) === null || _a === void 0 ? void 0 : _a.toString())) {
        res.status(400).json(`You can't access here.`);
        return;
    }
    const user = req.body;
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
    const currency = yield models_1.Currencies.findOne({ symbol: process.env.DEFAULT_CURRENCY });
    if (!currency) {
        res.status(400).json('error');
        return;
    }
    const newuser = new models_1.Users(user);
    const balance = new models_1.Balances({ userId: newuser._id, currency: currency._id });
    const role = yield models_1.Roles.findOne({ type: 'admin' });
    newuser.password = newuser.generateHash(user.password);
    newuser.rolesId = role._id;
    newuser.status = true;
    const u_result = yield newuser.save();
    const b_result = yield balance.save();
    if (!u_result || !b_result) {
        res.status(400).json('error');
    }
    else {
        res.json(`You have successfully created in as a user to ${process.env.APP_NAME}.`);
    }
});
exports.signup = signup;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, username, password, currency, rolesId } = req.body;
        const emailExists = yield models_1.Users.findOne({
            email: { $regex: new RegExp('^' + email.toLowerCase(), 'i') },
        });
        if (emailExists) {
            res.status(400).json(`${email} is used by another account.`);
            return;
        }
        const usernameExists = yield models_1.Users.findOne({
            username: { $regex: new RegExp('^' + username.toLowerCase(), 'i') },
        });
        if (usernameExists) {
            res.status(400).json(`An account named '${username}' already exists.`);
            return;
        }
        const referral = randomString.generate(10);
        const ip = (0, base_1.getIPAddress)(req);
        const newuser = new models_1.Users(Object.assign(Object.assign(Object.assign({}, req.body), ip), { referral, creatorId: req.user && req.user._id }));
        newuser.password = newuser.generateHash(password);
        if (!rolesId) {
            const roles = yield models_1.Roles.findOne({ type: 'player' });
            newuser.rolesId = roles._id;
            const _currency = yield models_1.Currencies.findById(currency);
            if (!_currency)
                return res.status(400).json('Currency is not defined');
            yield models_1.Balances.create({ userId: newuser._id, currency, status: true });
        }
        const u_result = yield newuser.save();
        if (!u_result)
            return res.status(400).json('New User Creating Error');
        const result = yield models_1.Users.aggregate([{ $match: { _id: (0, base_1.ObjectId)(newuser._id) } }, ...aggregateQuery]);
        return res.json(result[0]);
    }
    catch (error) {
        console.error('Error admin creating new user', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.create = create;
const signout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.body;
    yield models_1.Sessions.deleteMany({ userId });
    res.json({ status: true });
});
exports.signout = signout;
const changePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, newpass } = req.body;
    const user = yield models_1.Users.findById((0, base_1.ObjectId)(userId));
    const password = user.generateHash(newpass);
    const result = yield models_1.Users.findByIdAndUpdate((0, base_1.ObjectId)(userId), { password }, { new: true });
    const session = yield models_1.Sessions.findOneAndDelete({ userId });
    if (session && session.socketId) {
        req.app.get('io').to(session.socketId).emit('logout');
    }
    if (result) {
        res.json('Success!');
    }
    else {
        res.status(400).json('Server error.');
    }
});
exports.changePassword = changePassword;
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Users.aggregate(aggregateQuery);
    return res.json(result);
});
exports.get = get;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Users.aggregate([
        {
            $match: {
                _id: (0, base_1.ObjectId)(req.params.id),
            },
        },
        ...aggregateQuery,
    ]);
    return res.json(result[0]);
});
exports.getOne = getOne;

const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const { status, pageSize = null, page = null, userId = null, role = null, date = null, country = null, agentId, phone = null, email = null, search = '', } = req.body;
    let query = {};
    const user = req.user;
    if (userId) {
        query._id = (0, base_1.ObjectId)(userId);
    }
    if (role) {
        query.rolesId = (0, base_1.ObjectId)(role);
    }
    if (country) {
        query.country_reg = {
            $regex: new RegExp('^' + country.toLowerCase(), 'i'),
        };
    }
    if (phone) {
        query.phone = {
            $regex: phone,
            $options: 'i',
        };
    }
    if (email) {
        query.email = {
            $regex: email,
            $options: 'i',
        };
    }
    if (status !== '' && status !== undefined) {
        query.status = status;
    }
    if (search) {
        query = Object.assign(Object.assign({}, query), { $or: [
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } },
                // Check for valid ObjectId before searching in `_id`
                ...(mongoose_1.default.Types.ObjectId.isValid(search) ? [{ _id: new mongoose_1.default.Types.ObjectId(search) }] : []),
            ] });
    }
    // if ((user && user.rolesId.type === 'agent') || agentId) {
    //     query.creatorId = ObjectId(agentId) || user?._id;
    // }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    const playerRole = yield models_1.Roles.find({ type: 'player' });
    if (playerRole.length) {
        query.rolesId = {
            $in: playerRole.map((e) => e._id),
        };
    }
    let results = [];
    const count = yield models_1.Users.countDocuments(query);
    if (!pageSize || !page) {
        results = yield models_1.Users.aggregate([{ $match: query }, ...aggregateQuery, { $sort: { _id: -1 } }]);
    }
    else {
        results = yield models_1.Users.aggregate([
            { $match: query },
            ...aggregateQuery,
            { $sort: { _id: -1 } },
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize },
        ]);
    }
    if (((_b = user === null || user === void 0 ? void 0 : user.rolesId) === null || _b === void 0 ? void 0 : _b.type) === 'agent')
        results = results.map((row) => (Object.assign(Object.assign({}, row), { email: '', phone: '' })));
    return res.json({ results, count });
});
exports.list = list;
const agentlist = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, pageSize = null, page = null, userId = null, role = null, date = null, country = null, agentId, search = '', } = req.body;
        const me = req.user;
        let query = {};
        if (userId)
            query._id = (0, base_1.ObjectId)(userId);
        if (role)
            query.rolesId = (0, base_1.ObjectId)(role);
        if (country)
            query.country = {
                $regex: new RegExp('^' + country.toLowerCase(), 'i'),
            };
        if (status !== '' && status !== undefined)
            query.status = status;
        if (date && date[0] && date[1])
            query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
        const queryRole = { type: { $nin: ['super_admin', 'player'] } };
        if (me && me.rolesId.type === 'admin')
            queryRole.type = 'agent';
        if (me && me.rolesId.type === 'agent')
            queryRole.type = 'player';
        if (search) {
            query = Object.assign(Object.assign({}, query), { $or: [
                    { email: { $regex: search, $options: 'i' } },
                    { username: { $regex: search, $options: 'i' } },
                    // Check for valid ObjectId before searching in `_id`
                    ...(mongoose_1.default.Types.ObjectId.isValid(search) ? [{ _id: new mongoose_1.default.Types.ObjectId(search) }] : []),
                ] });
        }
        const agentRole = yield models_1.Roles.find(queryRole);
        if (agentRole.length) {
            query.rolesId = {
                $in: agentRole.map((e) => e._id),
            };
        }
        const count = yield models_1.Users.countDocuments(query);
        if (!pageSize || !page) {
            const results = yield models_1.Users.aggregate([{ $match: query }, ...aggregateQuery]);
            return res.json({ results, count });
        }
        const results = yield models_1.Users.aggregate([
            { $match: query },
            ...aggregateQuery,
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize },
        ]);
        return res.json({ results, count });
    }
    catch (error) {
        console.error('Error gett admin agentlist =>', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.agentlist = agentlist;

const label = async (req, res) => {
  try {
    const { role, agentId, full, search = '' } = req.body;
    const me = req.user;
    const queryRole = { type: role };

    if (me && me.rolesId.type === 'super_admin' && role === 'agent') {
      queryRole.type = { $nin: ['super_admin', 'player'] };
    }

    const roleData = await models_1.Roles.find(queryRole);

    const query = {};

    if (roleData.length) {
      query.rolesId = { $in: roleData.map((e) => e._id) };
    }

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        // Check for valid ObjectId before searching in `_id`
        ...(mongoose_1.default.Types.ObjectId.isValid(search) ? [{ _id: new mongoose_1.default.Types.ObjectId(search) }] : []),
      ];
    }

    /*
    if (!full && ((me && me.rolesId.type === 'agent') || agentId)) {
      query.creatorId = ObjectId(agentId) || me?._id;
    }
    */
    const results = await models_1.Users.aggregate([
      { $match: query },
      {
        $project: {
          label: '$username',
          value: '$_id',
          icon: '$avatar',
          _id: 0,
        },
      },
      {
        $sort: {
          label: 1,
        },
      },
    ]);

    res.json(results);
  } catch (error) {
    console.error('Error in label function:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.label = label;

const getCsv = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { status, userId = null, role = null, country = null, date = null } = req.body;
    const query = {};
    if (userId) {
        query._id = (0, base_1.ObjectId)(userId);
    }
    if (role) {
        query.rolesId = (0, base_1.ObjectId)(role);
    }
    if (status !== '' && status !== undefined) {
        query.status = status;
    }
    if (country) {
        query.country = {
            $regex: new RegExp('^' + country.toLowerCase(), 'i'),
        };
    }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    // if (req.user && req.user.rolesId.type === 'agent') {
    //     query.creatorId = req.user._id;
    // }
    const results = yield models_1.Users.aggregate([
        { $match: query },
        ...aggregateQuery,
        {
            $project: {
                _id: 0,
                UserId: '$_id',
                Email: '$email',
                SurName: '$surname',
                MiddleName: '$middlename',
                Username: '$username',
                Phone: '$phone',
                Country: '$country_reg',
                Avatar: '$avatar',
                Role: '$role.title',
                Address: '$address',
                Referral: '$referral',
                Status: {
                    $switch: {
                        branches: [
                            {
                                case: { $eq: ['$status', true] },
                                then: 'Active',
                            },
                            {
                                case: { $eq: ['$status', false] },
                                then: 'InActive',
                            },
                        ],
                        default: 'Active',
                    },
                },
                CreatedAt: '$createdAt',
            },
        },
    ]);
    res.json(results);
});
exports.getCsv = getCsv;
const importCSV = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = req.body;
    let exists = '';
    for (const key in query) {
        const { email, middlename, surname, username, phone, address, birthday, country } = query[key];
        const emailExists = yield models_1.Users.findOne({
            email: { $regex: new RegExp('^' + email.toLowerCase(), 'i') },
        });
        if (emailExists) {
            exists += `${email}, `;
            continue;
        }
        const usernameExists = yield models_1.Users.findOne({
            username: { $regex: new RegExp('^' + username.toLowerCase(), 'i') },
        });
        if (usernameExists) {
            exists += `${username}, `;
            continue;
        }
        const phoneExists = yield models_1.Users.findOne({
            phone: phone.toLowerCase(),
        });
        if (phoneExists) {
            exists += `${phone}, `;
            continue;
        }
        const referral = randomString.generate(10);
        const newuser = new models_1.Users({
            email,
            middlename,
            surname,
            username,
            phone,
            address,
            birthday,
            country,
            referral,
        });
        newuser.password = newuser.generateHash(DEFAULT_PASSWORD);
        const role = yield models_1.Roles.findOne({ type: 'player' });
        newuser.rolesId = role._id;
        newuser.status = true;
        yield newuser.save();
    }
    if (exists) {
        res.status(429).json(`${exists} already exists!`);
        return;
    }
    return res.json(`Success!`);
});
exports.importCSV = importCSV;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = { _id: (0, base_1.ObjectId)(req.params.id) };
        const updated = req.body;
        if (!(updated === null || updated === void 0 ? void 0 : updated.tier)) {
            updated.tier = null;
        }
        // if (updated?.betlimit_period !== req.user?.betlimit_period) {
        //     updated.betlimit_date = Date.now();
        // }
        if (updated.block_day > 0) {
            updated.block_date = Date.now();
        }
        yield models_1.Users.updateOne(query, updated);
        const result = yield models_1.Users.aggregate([{ $match: query }, ...aggregateQuery]);
        return res.json(result[0]);
    }
    catch (error) {
        console.error(`Error updating player => `, error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = (0, base_1.ObjectId)(req.params.id);
    const result = yield models_1.Users.deleteOne({ _id: userId });
    yield models_1.Sessions.deleteMany({ userId });
    yield models_1.LoginHistories.deleteMany({ userId });
    yield models_1.Balances.deleteMany({ userId });
    yield models_1.BalanceHistories.deleteMany({ userId });
    yield models_1.Payments.deleteMany({ userId });
    const sportsbets = yield models_1.SportsBets.find({ userId });
    for (const i in sportsbets) {
        yield models_1.SportsBets.deleteOne({ _id: sportsbets[i]._id });
        yield models_1.SportsBetting.deleteMany({ betId: sportsbets[i]._id });
    }
    res.json(result);
});
exports.deleteOne = deleteOne;
const checkKYC = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, _1.checkVerified)(req.body.id);
        if (!result)
            return res.status(402).json('Trust Id Not Validated');
        res.json(result.verifications);
    }
    catch (error) {
        return res.status(400).json('Internal Server Error ');
    }
});
exports.checkKYC = checkKYC;
const authCheck = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { user } = req;
        res.json(user);
    }
    catch (error) {
        return res.status(400).json('Internal Server Error ');
    }
});
exports.authCheck = authCheck;
