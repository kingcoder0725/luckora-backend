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
exports.updateTeams = void 0;
require("dotenv/config");
require("regenerator-runtime");
const mongoose_1 = require("mongoose");
const axios_1 = require("axios");
const models_1 = require("./models");
const config = require('../config');
const token = process.env.SPORTSBOOK_APIKEY;
let count = 0;
const fs = require('fs'), http = require('http'), https = require('https');
const Stream = require('stream').Transform;
const downloadImageFromURL = (url, filename) => new Promise((resolve, reject) => {
    let client = http;
    if (url.toString().indexOf('https') === 0) {
        client = https;
    }
    client
        .request(url, function (response) {
        const data = new Stream();
        response.on('data', function (chunk) {
            data.push(chunk);
        });
        response.on('end', function () {
            fs.writeFileSync(`${config.DIR}/teams/${filename}`, data.read());
            resolve(true);
        });
    })
        .end();
});
const getTeamsPage = (sport_id) => __awaiter(void 0, void 0, void 0, function* () {
    const options = {
        method: 'GET',
        url: 'https://api.b365api.com/v1/team',
        params: { token, sport_id, page: 1 }
    };
    const { data } = yield axios_1.default.request(options);
    const pager = data.pager;
    const page = Math.ceil(pager.total / pager.per_page);
    for (let i = 0; i < page; i++) {
        yield getTeams(sport_id, i + 1);
    }
});
const getTeams = (sport_id, page) => __awaiter(void 0, void 0, void 0, function* () {
    const options = {
        method: 'GET',
        url: 'https://api.b365api.com/v1/team',
        params: { token, sport_id, page }
    };
    const { data } = yield axios_1.default.request(options);
    for (const i in data.results) {
        count++;
        const result = data.results[i];
        if (result === null || result === void 0 ? void 0 : result.image_id) {
            yield downloadImageFromURL(`https://assets.b365api.com/images/team/b/${result.image_id}.png`, `${result.image_id}.png`);
        }
    }
});
const updateTeams = () => __awaiter(void 0, void 0, void 0, function* () {
    const sportslist = yield models_1.SportsLists.find();
    for (const key in sportslist) {
        console.log(sportslist[key].SportId);
        yield getTeamsPage(sportslist[key].SportId);
        console.log(count);
    }
});
exports.updateTeams = updateTeams;
try {
    mongoose_1.default.connect(process.env.DATABASE).then(() => {
        (0, exports.updateTeams)();
    });
}
catch (error) {
    console.log(`Team image downloader`, error);
}
