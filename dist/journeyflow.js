// journey-flow.js
'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
require('dotenv').config();
require('regenerator-runtime');
const mongoose_1 = require('mongoose');
const cron_1 = require('cron');
const socket_io_client_1 = require('socket.io-client');
const custom_1 = require('./controllers/journey/custom');
const models_1 = require('./models');
const redis_1 = require('./utils/redis');

const API_URL = process.env.API_URL || 'https://betcasino555.com';


const io = (0, socket_io_client_1.io)(`${API_URL}/journey`, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    transports: ['websocket'],
});

io.on('connect', () => {
    console.log('[Journey] Connected to main Socket.IO server at', `${API_URL}/journey`);
});

io.on('connect_error', (error) => {
    console.error('[Journey] Connection failed to main Socket.IO server:', error.message);
});

io.on('disconnect', (reason) => {
    console.log('[Journey] Disconnected from main Socket.IO server:', reason);
});

const resetCampaignProcessing = async () => {
    try {
        const result = await models_1.Journeys.updateMany({ processing: true }, { $unset: { processing: '' } });
        console.log('[Journey] Reset campaign processing:', result);
    } catch (error) {
        console.error('[Journey] Error resetting campaign processing flags:', error);
    }
};

const initJourneyTasks = async () => {
    await resetCampaignProcessing();
    await (0, custom_1.checkJourneyFlow)(io);
};

const initJourneyFlowCron = () => {
    try {
        initJourneyTasks();
        const job = new cron_1.CronJob('*/15 * * * * *', () => {
            console.log('[Journey] Running journey tasks at', new Date().toISOString());
            initJourneyTasks();
        });
        job.start();
        console.log('[Journey] Journey Flow CronJob started');
    } catch (error) {
        console.error('[Journey] Error initializing Journey Flow CronJob:', error);
    }
};

try {
    mongoose_1.default.connect(process.env.DATABASE).then(async () => {
        await redis_1.redisClient.ping().then(() => console.log('[Journey] Redis ping successful'));
        console.log('[Journey] MongoDB connected');
        initJourneyFlowCron();
    }).catch((error) => {
        console.error('[Journey] MongoDB connection error:', error);
    });
} catch (error) {
    console.error('[Journey] Journey Flow error:', error);
}

exports.initJourneyFlowCron = initJourneyFlowCron;