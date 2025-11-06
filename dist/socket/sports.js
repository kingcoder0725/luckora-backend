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
const cron_1 = require("cron");
const models_1 = require("../models");
const LAST_MODIFIED_FIELD = 'updatedAt';
exports.default = (io) => {
    io.of('/sports').on('connection', (socket) => __awaiter(void 0, void 0, void 0, function* () {
        // console.log("connected sports socket");
        // Listen for changes
    }));
    // Function to fetch recently changed documents
    const fetchChangedSportsMatch = () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            // console.log(moment().format('YYYY-MM-DD hh:mm:ss'), "====>changed sports matches");
            const thresholdTime = new Date(Date.now() - 10000); // Example: Fetch documents changed in the last 5 seconds
            const changedSportsMatch = yield models_1.SportsMatchs.find({ [LAST_MODIFIED_FIELD]: { $gte: thresholdTime }, odds: { $nin: [{}, null, []] } }).lean().sort({ time: 1, sport_id: 1, });
            if (!changedSportsMatch.length)
                return;
            const result = changedSportsMatch.map((row) => {
                let num = Object.keys((row === null || row === void 0 ? void 0 : row.odds) || {}).length;
                return Object.assign(Object.assign({}, row), { bet365_odds: {}, markets: num });
            });
            io.of('/sports').emit('changed-matches', result);
        }
        catch (error) {
            console.error('Error fetching recently changed documents:', error);
        }
    });
    // Call the function to fetch recently changed documents
    fetchChangedSportsMatch();
    const job1 = new cron_1.CronJob(process.env.LIVE_TIME, () => {
        fetchChangedSportsMatch();
    });
    job1.start();
};
