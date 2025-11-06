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
exports.callback = exports.getVerifiedStatus = exports.uploadDoc = exports.updateUser = exports.createUser = exports.getUser = void 0;
require("dotenv/config");
const fs = require("fs");
const axios_1 = require("axios");
const FormData = require("form-data");
const TRUST_API_URL = process.env.TRUST_API_URL;
const TRUST_API_KEY = process.env.TRUST_API_KEY;
const TRUST_API_FRONT_ID = process.env.TRUST_API_FRONT_ID;
const getUser = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const result = yield axios_1.default.get(`${TRUST_API_URL}/users/${userId}`, {
            headers: {
                Authorization: `Bearer ${TRUST_API_KEY}`,
            },
        });
        if (!(result === null || result === void 0 ? void 0 : result.data))
            return false;
        return result.data;
    }
    catch (error) {
        console.error(`Error getting Trusts user => `, ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error);
        return ((_c = (_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || false;
    }
});
exports.getUser = getUser;
const createUser = (user) => __awaiter(void 0, void 0, void 0, function* () {
    var _d, _e, _f;
    try {
        const body = {
            email: user.email,
            first_name: user.surname,
            last_name: user.middlename,
            username: user.username,
            send_link: true,
            template_id: TRUST_API_FRONT_ID,
            reference_id: user._id,
        };
        const result = yield axios_1.default.post(`${TRUST_API_URL}/users`, body, {
            headers: {
                Authorization: `Bearer ${TRUST_API_KEY}`,
            },
        });
        if (!(result === null || result === void 0 ? void 0 : result.data))
            return false;
        return result.data;
    }
    catch (error) {
        console.error(`Error creating Trusts user => `, ((_d = error === null || error === void 0 ? void 0 : error.response) === null || _d === void 0 ? void 0 : _d.data) || error);
        return ((_f = (_e = error === null || error === void 0 ? void 0 : error.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.message) || false;
    }
});
exports.createUser = createUser;
const updateUser = (user_id, template_id) => __awaiter(void 0, void 0, void 0, function* () {
    var _g, _h, _j;
    try {
        const body = {
            template_id, // `${TRUST_API_SELFIE_ID}, ${TRUST_API_FRONT_ID}, ${TRUST_API_BACK_ID}`,
        };
        const result = yield axios_1.default.patch(`${TRUST_API_URL}/users/${user_id}`, body, {
            headers: {
                Authorization: `Bearer ${TRUST_API_KEY}`,
            },
        });
        if (!(result === null || result === void 0 ? void 0 : result.data))
            return false;
        return result.data;
    }
    catch (error) {
        console.error(`Error update Trusts user => `, ((_g = error === null || error === void 0 ? void 0 : error.response) === null || _g === void 0 ? void 0 : _g.data) || error);
        return ((_j = (_h = error === null || error === void 0 ? void 0 : error.response) === null || _h === void 0 ? void 0 : _h.data) === null || _j === void 0 ? void 0 : _j.message) || false;
    }
});
exports.updateUser = updateUser;
const uploadDoc = (user_id, imagePath, template_id) => __awaiter(void 0, void 0, void 0, function* () {
    var _k, _l, _m;
    try {
        if (!fs.existsSync(imagePath)) {
            return false;
        }
        const formData = new FormData();
        formData.append('user_id', user_id);
        formData.append('template_id', template_id);
        const fileStream = fs.createReadStream(imagePath);
        // @ts-ignore
        formData.append('verify_image', fileStream);
        // Send the FormData to another API endpoint
        const result = yield axios_1.default.post(`${TRUST_API_URL}/verify/document`, formData, {
            headers: {
                Authorization: `Bearer ${TRUST_API_KEY}`,
            },
        });
        if (!(result === null || result === void 0 ? void 0 : result.data))
            return false;
        return result.data;
    }
    catch (error) {
        console.error(`Error uploadDoc Trusts user => `, ((_k = error === null || error === void 0 ? void 0 : error.response) === null || _k === void 0 ? void 0 : _k.data) || error);
        return ((_m = (_l = error === null || error === void 0 ? void 0 : error.response) === null || _l === void 0 ? void 0 : _l.data) === null || _m === void 0 ? void 0 : _m.message) || false;
    }
});
exports.uploadDoc = uploadDoc;
const getVerifiedStatus = (user_id, doc_id) => __awaiter(void 0, void 0, void 0, function* () {
    var _o, _p, _q, _r;
    try {
        const body = {
            user_id,
            doc_id,
        };
        const result = yield axios_1.default.post(`${TRUST_API_URL}/verify/document/status`, body, {
            headers: {
                Authorization: `Bearer ${TRUST_API_KEY}`,
            },
        });
        return ((_o = result === null || result === void 0 ? void 0 : result.data) === null || _o === void 0 ? void 0 : _o.success) || false;
    }
    catch (error) {
        console.error(`Error getVerifiedStatus Trusts user => `, ((_p = error === null || error === void 0 ? void 0 : error.response) === null || _p === void 0 ? void 0 : _p.data) || error);
        return ((_r = (_q = error === null || error === void 0 ? void 0 : error.response) === null || _q === void 0 ? void 0 : _q.data) === null || _r === void 0 ? void 0 : _r.message) || false;
    }
});
exports.getVerifiedStatus = getVerifiedStatus;
const callback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { verifications } = req.body;
    console.log('//////////callback///////', JSON.stringify(req.body));
});
exports.callback = callback;