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
exports.corsOptionsDelegate = exports.checkUrl = exports.checkUser = exports.AVerifytoken = exports.AGVerifytoken = exports.verifyProxy = exports.verifyTokenBody = exports.verifyToken = void 0;
const geoip = require("geoip-country");
const requestIp = require("request-ip");
const moment = require("moment");
const models_1 = require("../models");
const base_1 = require("../controllers/base");
const proxy_1 = require("../utils/proxy");
const utils_1 = require("../utils");
const log = require('log-to-file');
const config = require('../../config');
const whiteList = JSON.parse(process.env.WHITE_LIST);
const adminWhiteList = JSON.parse(process.env.ADMIN_WHITE_LIST);
const blockList = JSON.parse(process.env.BLCOK_LIST);
const agentBlockList = JSON.parse(process.env.AGENT_BLCOK_LIST);
const apilist = [
    '/api/v1/sports/matchs',
    '/api/v1/sports/lists',
    '/api/v1/sports/odds',
    '/api/v1/reports/profit',
    '/api/v1/languages/word',
    '/api/v1/languages/language'
];
const adminPathList = ['/signin', '/signup', '/signout', '/changePassword'];
const verifyToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const accessToken = req.headers.authorization;
        if (!accessToken) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        else {
            const user = yield models_1.Sessions.findOneAndUpdate({ accessToken }, { expiration: (0, base_1.getSessionTime)() }).populate('userId');
            if (user && user.userId && user.userId.status) {
                req.user = user.userId;
                next();
            }
            else {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
        }
    }
    catch (err) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
});
exports.verifyToken = verifyToken;
const verifyTokenBody = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const accessToken = req.body.token;
        if (!accessToken) {
            res.status(402).json('Unauthorized');
            return;
        }
        else {
            const user = yield models_1.Sessions.findOneAndUpdate({ accessToken }, { expiration: (0, base_1.getSessionTime)() }).populate('userId');
            if (user && user.userId && user.userId.status) {
                req.user = user.userId;
                next();
            }
            else {
                res.status(402).json('Unauthorized');
                return;
            }
        }
    }
    catch (err) {
        res.status(402).json('Unauthorized');
        return;
    }
});
exports.verifyTokenBody = verifyTokenBody;
const verifyProxy = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const ip_address = req.ip;
        const checked = yield (0, proxy_1.checkUserIp)(ip_address);
        if (!checked)
            return res.status(402).json('We are not allow that Proxy, VPN, or Risky User!');
        next();
    }
    catch (err) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
});
exports.verifyProxy = verifyProxy;
const AGVerifytoken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = req.headers.token;
        if (!token || token != process.env.ADMIN_TOKEN) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        else if (adminPathList.includes(req.path)) {
            next();
        }
        else {
            const accessToken = req.headers.authorization;
            if (!accessToken) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            else {
                const user = yield models_1.Sessions.findOneAndUpdate({ accessToken }, { expiration: (0, base_1.getSessionTime)() }).populate('userId');
                if (user &&
                    user.userId &&
                    user.userId.status &&
                    utils_1.ADMIN_ROLES.includes(user.userId.rolesId.type)) {
                    req.user = user.userId;
                    next();
                }
                else {
                    res.status(401).json({ error: 'Unauthorized' });
                    return;
                }
            }
        }
    }
    catch (err) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
});
exports.AGVerifytoken = AGVerifytoken;
const AVerifytoken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const token = req.headers.token;
        if (!token || token != process.env.ADMIN_TOKEN) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        else if (adminPathList.includes(req.path)) {
            next();
        }
        else {
            const accessToken = req.headers.authorization;
            if (!accessToken) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            else {
                const user = yield models_1.Sessions.findOneAndUpdate({ accessToken }, { expiration: (0, base_1.getSessionTime)() }).populate('userId');
                if (user &&
                    user.userId &&
                    user.userId.status &&
                    utils_1.ADMIN_ROLES.includes(user.userId.rolesId.type)) {
                    if (user.userId.rolesId.type === 'agent') {
                        res.status(400).json('You do not have this role.');
                        return;
                    }
                    req.user = user.userId;
                    next();
                }
                else {
                    res.status(401).json({ error: 'Unauthorized' });
                    return;
                }
            }
        }
    }
    catch (err) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
});
exports.AVerifytoken = AVerifytoken;
const checkUser = (req, res, next) => {
    if (req.user && req.body.userId !== String(req.user._id)) {
        console.log(`req.method`, req.method);
        console.log(`req.url`, req.url);
        console.log(`req.user`, req.user);
        console.log(`req.body`, req.body);
        res.status(401).json({ error: 'Unauthorized' });
    }
    else {
        next();
    }
};
exports.checkUser = checkUser;
const checkUrl = (req, res, next) => {
    const ip = requestIp.getClientIp(req);
    if (ip) {
        const ipaddress = ip.replace('::ffff:', '');
        const geo = geoip.lookup(ipaddress);
        if (blockList.indexOf(ipaddress) !== -1 ||
            agentBlockList.indexOf(req.headers['user-agent']) == undefined ||
            agentBlockList.indexOf(req.headers['user-agent']) !== -1 ||
            (req.headers['user-agent'] && req.headers['user-agent'].indexOf('Firefox/91.0') !== -1)) {
            console.log('403 ******', ipaddress, '******', geo === null || geo === void 0 ? void 0 : geo.country, '******', req.method, '******', req.url, '******', req.header('Origin'), '******');
            console.log(req.headers);
            console.log(req.body);
            res.status(403).json(`You can't access.`);
            return;
        }
        else {
            if (apilist.indexOf(req.url) === -1 && adminWhiteList.indexOf(ipaddress) === -1) {
                const filepath = `${config.DIR}/rlog/log-${moment().format('YYYY-MM-DD')}.log`;
                log(`start\n${geo === null || geo === void 0 ? void 0 : geo.country} ${ipaddress}  ${req.method}  ${req.url}\nheaders ${JSON.stringify(req.headers)}\nparams ${JSON.stringify(req.params)}\nbody ${JSON.stringify(req.body)}\nend\r\n\n`, filepath);
                console.log(`===`, geo === null || geo === void 0 ? void 0 : geo.country, `===`, req.header('Origin'), `===`, ipaddress, `===`, req.method, `===`, req.url, `====`, req.headers['user-agent'], `===\n`);
            }
            next();
        }
    }
    else {
        res.status(403).json(`You can't access.`);
        return;
    }
};
exports.checkUrl = checkUrl;
const corsOptionsDelegate = (req, callback) => {
    let corsOptions;
    try {
        const ip = requestIp.getClientIp(req);
        const ipaddress = ip.replace('::ffff:', '');
        if (blockList.indexOf(ipaddress) !== -1) {
            corsOptions = true;
        }
        else if (req.method === 'GET') {
            corsOptions = false;
        }
        else if (req.headers['user-agent'] === 'CoinPayments.net IPN Generator' || req.headers['user-agent'] === 'GuzzleHttp/7') {
            corsOptions = false;
        }
        else if (req.header('Origin') !== undefined && whiteList.indexOf(req.header('Origin')) !== -1) {
            corsOptions = false;
        }
        else if (ipaddress === '127.0.0.1') {
            corsOptions = false;
        }
        else {
            const geo = geoip.lookup(ip);
            console.log('******', ipaddress, '******', geo === null || geo === void 0 ? void 0 : geo.country, '******', req.method, '******', req.url, '******', req.header('Origin'), '******');
            console.log(req.headers);
            console.log(req.body);
            corsOptions = true;
        }
    }
    catch (error) {
        console.log(error);
        corsOptions = true;
    }
    callback(corsOptions);
};
exports.corsOptionsDelegate = corsOptionsDelegate;
