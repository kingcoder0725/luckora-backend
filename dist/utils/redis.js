"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.delFromCache = exports.getFromCache = exports.setToCache = exports.redisClient = void 0;

const redis_1 = require("redis");
require('dotenv').config();

const redisClient = (0, redis_1.createClient)({
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));

(async () => {
    await redisClient.connect();
})();

exports.redisClient = redisClient;

async function setToCache(key, value, ttl = 3600) {
    try {
        await redisClient.setEx(key, ttl, JSON.stringify(value));
        console.log(`Cache set for key: ${key}`);
    } catch (error) {
        console.error(`Error setting cache for key ${key}:`, error);
    }
}
exports.setToCache = setToCache;

async function getFromCache(key) {
    try {
        const data = await redisClient.get(key);
        if (data) {
            console.log(`Cache hit for key: ${key}`);
            return JSON.parse(data);
        }
        console.log(`Cache miss for key: ${key}`);
        return null;
    } catch (error) {
        console.error(`Error getting cache for key ${key}:`, error);
        return null;
    }
}
exports.getFromCache = getFromCache;

async function delFromCache(key) {
    try {
        await redisClient.del(key);
        console.log(`Cache deleted for key: ${key}`);
    } catch (error) {
        console.error(`Error deleting cache for key ${key}:`, error);
    }
}
exports.delFromCache = delFromCache;