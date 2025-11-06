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

const { redisClient, setToCache, getFromCache } = require("../../utils/redis");
const models_1 = require("../../models");
const mongoose_1 = require("mongoose");

models_1.SportsBets.schema.set('toJSON', {
    transform: (doc, ret) => {
        if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
        if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();
        return ret;
    }
});
models_1.GameHistories.schema.set('toJSON', {
    transform: (doc, ret) => {
        if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
        if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();
        return ret;
    }
});

const languageToCountryMap = {
    'en': ['US', 'GB', 'CA', 'AU', 'NZ'],
    'ru': ['RU', 'BY', 'KZ', 'UA'],
    'fr': ['FR', 'CA', 'BE', 'CH', 'LU'],
    'no': ['NO'],
    'fi': ['FI'],
    'sv': ['SE', 'FI'],
    'es': ['ES', 'MX', 'CO', 'AR', 'PE', 'VE', 'CL', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY'],
    'de': ['DE', 'AT', 'CH', 'LU', 'LI']
};

const CACHE_TTL = 300;

const getCacheKey = (campaignId, property, operator, value, startDate, endDate) => {
    return `conditions:${campaignId}:${property}:${operator}:${value}:${startDate ? startDate.toISOString() : 'null'}:${endDate ? endDate.toISOString() : 'null'}`;
};

function mapDevice(device) {
    if (!device) return 'Unknown';
    if (/mobile|iPhone|Android/i.test(device)) return 'Mobile';
    if (/desktop|windows|mac/i.test(device)) return 'Desktop';
    return 'Unknown';
}

function applyOperator(left, op, right) {
    switch (op) {
        case '>': return left > right;
        case '<': return left < right;
        case '=': return left === right;
        case '!=': return left !== right;
        case '>=': return left >= right;
        case '<=': return left <= right;
        default: return false;
    }
}

function applyOperatorDate(date, op, condDate, day, condDay) {
    const time = date.getTime();
    const condTime = condDate.getTime();
    switch (op) {
        case '>': return time > condTime;
        case '<': return time < condTime;
        case '=': return day === condDay;
        case '!=': return day !== condDay;
        case '>=': return time >= condTime;
        case '<=': return time <= condTime;
        default: return false;
    }
}

const applyConditions = (players, conditions, campaign, isMultipleTimes = false, startDate = null, endDate = null) => __awaiter(void 0, void 0, void 0, function* () {
    if (!conditions || !conditions.length) {
        return players;
    }
    let filteredPlayers = [...players];
    const processedRecords = isMultipleTimes ? (campaign.processedRecords || []) : [];
    const newProcessedRecords = [];
    const isWaitForEvent = startDate && endDate;

    for (const condition of conditions) {
        let { property, operator, value } = condition;
        const currentUserIds = filteredPlayers.map(u => new mongoose_1.Types.ObjectId(u._id));
        if (!currentUserIds.length) continue;

        const cacheKey = getCacheKey(campaign._id, property, operator, value, startDate, endDate);
        let cachedData = yield getFromCache(cacheKey);
        let computedData;

        if (cachedData) {
            computedData = JSON.parse(cachedData);
        } else {
            computedData = yield computePropertyData(property, currentUserIds, isWaitForEvent, startDate, endDate, value, condition);
            if (computedData) {
                yield setToCache(cacheKey, JSON.stringify(computedData), CACHE_TTL);
            }
        }

        filteredPlayers = yield filterByComputedData(filteredPlayers, computedData, property, operator, value, isMultipleTimes, processedRecords, newProcessedRecords, isWaitForEvent, startDate, endDate, condition);
    }

    if (isMultipleTimes && newProcessedRecords.length) {
        for (const record of newProcessedRecords) {
            const existing = yield models_1.Journeys.findOne({ _id: campaign._id, "processedRecords.userId": record.userId });
            if (existing) {
                yield models_1.Journeys.updateOne(
                    { _id: campaign._id, "processedRecords.userId": record.userId },
                    { 
                        $set: { "processedRecords.$.lastProcessedTime": record.lastProcessedTime },
                        $addToSet: { "processedRecords.$.processedRecordIds": { $each: record.processedRecordIds } }
                    }
                );
            } else {
                yield models_1.Journeys.updateOne(
                    { _id: campaign._id },
                    { $push: { processedRecords: record } }
                );
            }
        }
    }

    return filteredPlayers;
});

const computePropertyData = (property, userIds, isWaitForEvent, startDate, endDate, value, condition) => __awaiter(void 0, void 0, void 0, function* () {
    let query = { userId: { $in: userIds } };
    if (isWaitForEvent) {
        query.createdAt = { $gte: startDate, $lte: endDate };
    }
    let dataMap = {};
    let tempQuery;

    switch (property) {
        case 'sport_bet':
        case 'Minimum_Bet_Amount':
            query.selectedFreeBet = { $eq: '' };
            const sportAgg = yield models_1.SportsBets.aggregate([
                { $match: query },
                { $group: { _id: '$userId', total: { $sum: '$stake' }, records: { $push: { _id: '$_id', value: '$stake' } } } }
            ]);
            sportAgg.forEach(agg => dataMap[agg._id.toString()] = { total: agg.total, records: agg.records.map(r => ({ _id: r._id.toString(), value: r.value })) });
            break;
        case 'league_bet':
            tempQuery = { userId: { $in: userIds } };
            if (isWaitForEvent) tempQuery.createdAt = { $gte: startDate, $lte: endDate };
            const leagueBets = yield models_1.SportsBets.find(tempQuery).select('userId betsId _id').lean();
            const betsIdsLeague = [...new Set(leagueBets.map(b => b.betsId))];
            const matchesLeague = yield models_1.SportsMatchs.find({ id: { $in: betsIdsLeague } }).select('id league.id').lean();
            const leagueMap = {};
            matchesLeague.forEach(m => leagueMap[m.id] = m.league.id);
            leagueBets.forEach(b => {
                const uid = b.userId.toString();
                if (!dataMap[uid]) dataMap[uid] = { has: false, records: [] };
                if (leagueMap[b.betsId] === value) {
                    dataMap[uid].has = true;
                    dataMap[uid].records.push({ _id: b._id.toString() });
                }
            });
            break;
        case 'match_bet':
            tempQuery = { userId: { $in: userIds } };
            if (isWaitForEvent) tempQuery.createdAt = { $gte: startDate, $lte: endDate };
            const matchBets = yield models_1.SportsBets.find(tempQuery).select('userId betsId _id').lean();
            matchBets.forEach(b => {
                const uid = b.userId.toString();
                if (!dataMap[uid]) dataMap[uid] = { has: false, records: [] };
                if (b.betsId === value) {
                    dataMap[uid].has = true;
                    dataMap[uid].records.push({ _id: b._id.toString() });
                }
            });
            break;
        case 'games':
            query.isBonusPlay = false;
            const game = yield models_1.GameLists.findOne({ _id: value }).select('game_code').lean();
            const gameCode = game ? game.game_code : null;
            if (!gameCode) return {};
            const gamesHist = yield models_1.GameHistories.find(query).select('userId game_code _id').lean();
            gamesHist.forEach(g => {
                const uid = g.userId.toString();
                if (!dataMap[uid]) dataMap[uid] = { has: false, records: [] };
                if (g.game_code === gameCode) {
                    dataMap[uid].has = true;
                    dataMap[uid].records.push({ _id: g._id.toString() });
                }
            });
            break;
        case 'provider':
            query.isBonusPlay = false;
            const provider = yield models_1.GameProviders.findOne({ _id: value }).select('code').lean();
            const providerCode = provider ? provider.code : null;
            if (!providerCode) return {};
            const providerHist = yield models_1.GameHistories.find(query).select('userId provider_code _id').lean();
            providerHist.forEach(g => {
                const uid = g.userId.toString();
                if (!dataMap[uid]) dataMap[uid] = { has: false, records: [] };
                if (g.provider_code === providerCode) {
                    dataMap[uid].has = true;
                    dataMap[uid].records.push({ _id: g._id.toString() });
                }
            });
            break;
        case 'registration_date':
            let regQuery = { _id: { $in: userIds } };
            if (isWaitForEvent) regQuery.createdAt = { $gte: startDate, $lte: endDate };
            const usersReg = yield models_1.Users.find(regQuery).select('_id createdAt').lean();
            usersReg.forEach(u => dataMap[u._id.toString()] = { date: new Date(u.createdAt), recordId: u._id.toString() });
            break;
        case 'odds':
            const oddsBets = yield models_1.SportsBets.find(query).select('userId odds _id').lean();
            oddsBets.forEach(b => {
                const uid = b.userId.toString();
                if (!dataMap[uid]) dataMap[uid] = { records: [] };
                dataMap[uid].records.push({ _id: b._id.toString(), value: Number(b.odds) });
            });
            break;
        case 'Casino_Bet':
            query.bet_money = { $exists: true, $ne: null };
            const casinoHist = yield models_1.GameHistories.find(query).select('userId bet_money _id').lean();
            casinoHist.forEach(g => {
                const uid = g.userId.toString();
                if (!dataMap[uid]) dataMap[uid] = { records: [] };
                dataMap[uid].records.push({ _id: g._id.toString(), value: Number(g.bet_money) });
            });
            break;
        case 'Deposit_attempt':
            query.ipn_type = "deposit";
            query.status_text = { $nin: ["confirmed", "deposited", "canceled", "disapproved"] };
            const depAttempt = yield models_1.Payments.find(query).select('userId amount _id').lean();
            depAttempt.forEach(p => {
                const uid = p.userId.toString();
                if (!dataMap[uid]) dataMap[uid] = { records: [] };
                dataMap[uid].records.push({ _id: p._id.toString(), value: Number(p.amount) });
            });
            break;
        case 'Deposit_approved':
            query.ipn_type = "deposit";
            query.status_text = { $in: ["confirmed", "deposited"] };
            const depApproved = yield models_1.Payments.find(query).select('userId amount _id').lean();
            depApproved.forEach(p => {
                const uid = p.userId.toString();
                if (!dataMap[uid]) dataMap[uid] = { records: [] };
                dataMap[uid].records.push({ _id: p._id.toString(), value: Number(p.amount) });
            });
            break;
        case 'Deposit_Disproved':
            query.ipn_type = "deposit";
            query.status_text = { $in: ["canceled", "disapproved"] };
            const depDisproved = yield models_1.Payments.find(query).select('userId amount _id').lean();
            depDisproved.forEach(p => {
                const uid = p.userId.toString();
                if (!dataMap[uid]) dataMap[uid] = { records: [] };
                dataMap[uid].records.push({ _id: p._id.toString(), value: Number(p.amount) });
            });
            break;
        case 'Deposit_Comparator':
            query.ipn_type = "deposit";
            const depComp = yield models_1.Payments.find(query).select('userId amount _id').lean();
            depComp.forEach(p => {
                const uid = p.userId.toString();
                if (!dataMap[uid]) dataMap[uid] = { records: [] };
                dataMap[uid].records.push({ _id: p._id.toString(), value: Number(p.amount) });
            });
            break;
        case 'Live_Casino_Gaming_bet':
            const liveProviders = yield models_1.GameProviders.find({ type: 'live', status: true }).distinct('code');
            query.provider_code = { $in: liveProviders };
            query.bet_money = { $exists: true, $ne: null, $ne: 0 };
            const liveHist = yield models_1.GameHistories.find(query).select('userId bet_money _id').lean();
            liveHist.forEach(g => {
                const uid = g.userId.toString();
                if (!dataMap[uid]) dataMap[uid] = { records: [] };
                dataMap[uid].records.push({ _id: g._id.toString(), value: Number(g.bet_money) });
            });
            break;
        case 'Withdraw_attempt':
            query.ipn_type = "withdrawal";
            query.status_text = { $nin: ["confirmed", "deposited", "canceled", "disapproved"] };
            const withAttempt = yield models_1.Payments.find(query).select('userId amount _id').lean();
            withAttempt.forEach(p => {
                const uid = p.userId.toString();
                if (!dataMap[uid]) dataMap[uid] = { records: [] };
                dataMap[uid].records.push({ _id: p._id.toString(), value: Number(p.amount) });
            });
            break;
        case 'Withdraw_approved':
            query.ipn_type = "withdrawal";
            query.status_text = { $in: ["confirmed", "deposited"] };
            const withApproved = yield models_1.Payments.find(query).select('userId amount _id').lean();
            withApproved.forEach(p => {
                const uid = p.userId.toString();
                if (!dataMap[uid]) dataMap[uid] = { records: [] };
                dataMap[uid].records.push({ _id: p._id.toString(), value: Number(p.amount) });
            });
            break;
        case 'Withdraw_Disproved':
            query.ipn_type = "withdrawal";
            query.status_text = { $in: ["canceled", "disapproved"] };
            const withDisproved = yield models_1.Payments.find(query).select('userId amount _id').lean();
            withDisproved.forEach(p => {
                const uid = p.userId.toString();
                if (!dataMap[uid]) dataMap[uid] = { records: [] };
                dataMap[uid].records.push({ _id: p._id.toString(), value: Number(p.amount) });
            });
            break;
        case 'Withdraw_Comparator':
            query.ipn_type = "withdrawal";
            const withComp = yield models_1.Payments.find(query).select('userId amount _id').lean();
            withComp.forEach(p => {
                const uid = p.userId.toString();
                if (!dataMap[uid]) dataMap[uid] = { records: [] };
                dataMap[uid].records.push({ _id: p._id.toString(), value: Number(p.amount) });
            });
            break;
        case 'Last_login':
            const lastLogins = yield models_1.LoginHistories.aggregate([
                { $match: query },
                { $sort: { createdAt: -1 } },
                { $group: { _id: '$userId', date: { $first: '$createdAt' }, recordId: { $first: '$_id' } } }
            ]);
            lastLogins.forEach(l => dataMap[l._id.toString()] = { date: new Date(l.date), recordId: l.recordId.toString() });
            break;
        case 'Login_sum_total':
            const loginCounts = yield models_1.LoginHistories.aggregate([
                { $match: query },
                { $group: { _id: '$userId', count: { $sum: 1 }, records: { $push: '$_id' } } }
            ]);
            loginCounts.forEach(l => dataMap[l._id.toString()] = { count: l.count, records: l.records.map(id => id.toString()) });
            break;
        case 'device_used':
            const deviceLogins = yield models_1.LoginHistories.find(query).select('userId device _id').lean();
            deviceLogins.forEach(l => {
                const uid = l.userId.toString();
                if (!dataMap[uid]) dataMap[uid] = { records: [] };
                dataMap[uid].records.push({ _id: l._id.toString(), value: mapDevice(l.device) });
            });
            break;
        case 'Login_Specific_IP':
            const ipLogins = yield models_1.LoginHistories.find(query).select('userId ip _id').lean();
            ipLogins.forEach(l => {
                const uid = l.userId.toString();
                if (!dataMap[uid]) dataMap[uid] = { records: [] };
                dataMap[uid].records.push({ _id: l._id.toString(), value: l.ip || '' });
            });
            break;
        case 'Limit_set':
            let limitQuery = { _id: { $in: userIds } };
            if (isWaitForEvent) limitQuery.updatedAt = { $gte: startDate, $lte: endDate };
            const usersLimit = yield models_1.Users.find(limitQuery).select('_id betlimit updatedAt').lean();
            usersLimit.forEach(u => dataMap[u._id.toString()] = { value: u.betlimit || 0, recordId: u._id.toString(), updatedAt: u.updatedAt });
            break;
        case 'Self_exclusion':
            let selfQuery = { _id: { $in: userIds } };
            if (isWaitForEvent) selfQuery.updatedAt = { $gte: startDate, $lte: endDate };
            const usersSelf = yield models_1.Users.find(selfQuery).select('_id status updatedAt').lean();
            usersSelf.forEach(u => dataMap[u._id.toString()] = { value: u.status || false, recordId: u._id.toString(), updatedAt: u.updatedAt });
            break;
        case 'Logout':
            const lastLogouts = yield models_1.LogoutHistories.aggregate([
                { $match: query },
                { $sort: { createdAt: -1 } },
                { $group: { _id: '$userId', date: { $first: '$createdAt' }, recordId: { $first: '$_id' } } }
            ]);
            lastLogouts.forEach(l => dataMap[l._id.toString()] = { date: new Date(l.date), recordId: l.recordId.toString() });
            break;
        case 'Update_User_Balance':
            const lastBalances = yield models_1.BalanceHistories.aggregate([
                { $match: query },
                { $sort: { createdAt: -1 } },
                { $group: { _id: '$userId', value: { $first: '$currentBalance' }, recordId: { $first: '$_id' } } }
            ]);
            lastBalances.forEach(b => dataMap[b._id.toString()] = { value: b.value, recordId: b.recordId.toString() });
            break;
        case 'Game_Session_Start':
        case 'Game_Session_End':
            const sessions = yield models_1.GameHistories.aggregate([
                { $match: query },
                { $sort: { createdAt: -1 } },
                { $group: { _id: '$userId', date: { $first: '$createdAt' }, recordId: { $first: '$_id' } } }
            ]);
            sessions.forEach(s => dataMap[s._id.toString()] = { date: new Date(s.date), recordId: s.recordId.toString() });
            break;
        case 'Game_Type':
            const gameTypes = yield models_1.GameHistories.find(query).select('userId provider_code _id').lean();
            const providersType = yield models_1.GameProviders.find({ status: true }).select('code type').lean();
            const typeMap = {};
            providersType.forEach(p => typeMap[p.code] = p.type);
            gameTypes.forEach(g => {
                const uid = g.userId.toString();
                if (!dataMap[uid]) dataMap[uid] = { records: [] };
                const gType = typeMap[g.provider_code] || 'unknown';
                dataMap[uid].records.push({ _id: g._id.toString(), value: gType });
            });
            break;
        case 'Push_Notifications':
            let notifQuery = { status: true };
            if (isWaitForEvent) notifQuery.createdAt = { $gte: startDate, $lte: endDate };
            else {
                const current = new Date();
                const oneDayAgo = new Date(current.getTime() - 86400000);
                notifQuery.createdAt = { $gte: oneDayAgo, $lte: new Date(current.setHours(23, 59, 59, 999)) };
            }
            const notifications = yield models_1.Notification.find(notifQuery).select('_id players viewers').lean();
            for (const uid of userIds) {
                const uidStr = uid.toString();
                dataMap[uidStr] = { has: false, records: [] };
            }
            notifications.forEach(n => {
                const players = n.players || [];
                const viewers = n.viewers || [];
                const nId = n._id.toString();
                for (const uid of userIds) {
                    const uidStr = uid.toString();
                    const isPlayer = players.includes(uidStr) || players.includes("all");
                    const isViewer = viewers.includes(uidStr);
                    if (isPlayer || isViewer) {
                        dataMap[uidStr].has = true;
                        dataMap[uidStr].records.push(nId);
                    }
                }
            });
            break;
        case 'Admin_Only_Events':
            let adminQuery = { _id: { $in: userIds } };
            if (isWaitForEvent) adminQuery.updatedAt = { $gte: startDate, $lte: endDate };
            const usersAdmin = yield models_1.Users.find(adminQuery).select('_id rolesId updatedAt').lean();
            const roleIdsAdmin = usersAdmin.map(u => u.rolesId?._id).filter(id => id);
            const adminRolesSet = new Set((yield models_1.Roles.find({ _id: { $in: roleIdsAdmin }, type: { $in: ['admin', 'super_admin'] } }).select('_id').lean()).map(r => r._id.toString()));
            usersAdmin.forEach(u => {
                const uidStr = u._id.toString();
                const roleId = u.rolesId?._id?.toString();
                dataMap[uidStr] = { has: adminRolesSet.has(roleId), recordId: uidStr, updatedAt: u.updatedAt };
            });
            break;
        case 'Email_Notifications':
            let emailQuery = { templateId: { $exists: true, $ne: "" } };
            if (isWaitForEvent) emailQuery.createdAt = { $gte: startDate, $lte: endDate };
            else {
                const current = new Date();
                const oneDayAgo = new Date(current.getTime() - 86400000);
                emailQuery.createdAt = { $gte: oneDayAgo, $lte: new Date(current.setHours(23, 59, 59, 999)) };
            }
            const emailRecords = yield models_1.MarketingHistory.find(emailQuery).select('_id receivers').lean();
            const usersEmail = yield models_1.Users.find({ _id: { $in: userIds } }).select('_id email').lean();
            const emailMap = {};
            usersEmail.forEach(u => emailMap[u._id.toString()] = u.email);
            for (const uid of userIds) {
                const uidStr = uid.toString();
                dataMap[uidStr] = { has: false, records: [] };
            }
            emailRecords.forEach(r => {
                const receivers = r.receivers || [];
                const rId = r._id.toString();
                for (const uid of userIds) {
                    const uidStr = uid.toString();
                    const userEmail = emailMap[uidStr];
                    if (receivers.includes(userEmail) || receivers.includes("all")) {
                        dataMap[uidStr].has = true;
                        dataMap[uidStr].records.push(rId);
                    }
                }
            });
            break;
        case 'SMS_Notifications':
            let smsQuery = { $or: [{ templateId: { $exists: false } }, { templateId: "" }] };
            if (isWaitForEvent) smsQuery.createdAt = { $gte: startDate, $lte: endDate };
            else {
                const current = new Date();
                const oneDayAgo = new Date(current.getTime() - 86400000);
                smsQuery.createdAt = { $gte: oneDayAgo, $lte: new Date(current.setHours(23, 59, 59, 999)) };
            }
            const smsRecords = yield models_1.MarketingHistory.find(smsQuery).select('_id receivers').lean();
            const usersPhone = yield models_1.Users.find({ _id: { $in: userIds } }).select('_id phone').lean();
            const phoneMap = {};
            usersPhone.forEach(u => phoneMap[u._id.toString()] = u.phone);
            for (const uid of userIds) {
                const uidStr = uid.toString();
                dataMap[uidStr] = { has: false, records: [] };
            }
            smsRecords.forEach(r => {
                const receivers = r.receivers || [];
                const rId = r._id.toString();
                for (const uid of userIds) {
                    const uidStr = uid.toString();
                    const userPhone = phoneMap[uidStr];
                    if (receivers.includes(userPhone) || receivers.includes("all")) {
                        dataMap[uidStr].has = true;
                        dataMap[uidStr].records.push(rId);
                    }
                }
            });
            break;
        case 'Geolocation':
            let geoQuery = { _id: { $in: userIds } };
            if (isWaitForEvent) geoQuery.updatedAt = { $gte: startDate, $lte: endDate };
            const usersGeo = yield models_1.Users.find(geoQuery).select('_id country updatedAt').lean();
            usersGeo.forEach(u => dataMap[u._id.toString()] = { value: u.country || '', recordId: u._id.toString(), updatedAt: u.updatedAt });
            break;
        case 'User_Tier':
            let tierQuery = { _id: { $in: userIds } };
            if (isWaitForEvent) tierQuery.updatedAt = { $gte: startDate, $lte: endDate };
            const usersTier = yield models_1.Users.find(tierQuery).select('_id tiers updatedAt').lean();
            usersTier.forEach(u => {
                let tiers = [];
                if (Array.isArray(u.tiers)) tiers = u.tiers.map(t => t.toString());
                else if (u.tiers && typeof u.tiers === 'string') tiers = [u.tiers];
                else if (u.tiers) tiers = [u.tiers.toString()];
                dataMap[u._id.toString()] = { has: tiers.includes(value.toString()), recordId: u._id.toString(), updatedAt: u.updatedAt };
            });
            break;
        case 'Localization':
            let locQuery = { _id: { $in: userIds } };
            if (isWaitForEvent) locQuery.updatedAt = { $gte: startDate, $lte: endDate };
            const usersLoc = yield models_1.Users.find(locQuery).select('_id country updatedAt').lean();
            const expected = languageToCountryMap[value.toLowerCase()] || [];
            usersLoc.forEach(u => {
                const country = u.country ? u.country.toUpperCase() : '';
                dataMap[u._id.toString()] = { has: expected.includes(country), recordId: u._id.toString(), updatedAt: u.updatedAt };
            });
            break;
        case 'Award_Bonus':
            let awardQuery = { userId: { $in: userIds }, status: true };
            if (isWaitForEvent) {
                const recentUsers = yield models_1.Users.find({ _id: { $in: userIds }, updatedAt: { $gte: startDate, $lte: endDate } }).select('_id').lean();
                awardQuery.userId = { $in: recentUsers.map(u => u._id) };
            }
            const balancesAward = yield models_1.Balances.find(awardQuery).select('userId bonus updatedAt').lean();
            balancesAward.forEach(b => dataMap[b.userId.toString()] = { value: b.bonus || 0, recordId: b.userId.toString(), updatedAt: b.updatedAt });
            break;
        case 'VIP_points':
            query.amount = { $lt: 0 };
            const vipAgg = yield models_1.BalanceHistories.aggregate([
                { $match: query },
                { $group: { _id: '$userId', totalAbs: { $sum: { $abs: '$amount' } }, records: { $push: { _id: '$_id', value: { $abs: '$amount' } } } } }
            ]);
            vipAgg.forEach(agg => dataMap[agg._id.toString()] = { total: agg.totalAbs / 5, records: agg.records.map(r => ({ _id: r._id.toString(), value: r.value / 5 })) });
            break;
        case 'time_spend':
            let timeQuery = { _id: { $in: userIds } };
            if (isWaitForEvent) timeQuery.updatedAt = { $gte: startDate, $lte: endDate };
            const usersTime = yield models_1.Users.find(timeQuery).select('_id timeSpent updatedAt').lean();
            usersTime.forEach(u => dataMap[u._id.toString()] = { value: u.timeSpent || 0, recordId: u._id.toString(), updatedAt: u.updatedAt });
            break;
        case 'visite_page':
            let pageQuery = { _id: { $in: userIds } };
            if (isWaitForEvent) pageQuery.updatedAt = { $gte: startDate, $lte: endDate };
            const usersPage = yield models_1.Users.find(pageQuery).select('_id LastOpenPage updatedAt').lean();
            usersPage.forEach(u => dataMap[u._id.toString()] = { value: u.LastOpenPage || '', recordId: u._id.toString(), updatedAt: u.updatedAt });
            break;
        case 'Deposit_Canceled':
            query.ipn_type = "deposit";
            query.status_text = "canceled";
            const depCanceled = yield models_1.Payments.find(query).select('userId amount _id').lean();
            depCanceled.forEach(p => {
                const uid = p.userId.toString();
                if (!dataMap[uid]) dataMap[uid] = { records: [] };
                dataMap[uid].records.push({ _id: p._id.toString(), value: Number(p.amount) });
            });
            break;
        case 'Balance':
            let balanceQuery = { userId: { $in: userIds }, status: true };
            if (isWaitForEvent) {
                const recentUsersBalance = yield models_1.Users.find({ _id: { $in: userIds }, updatedAt: { $gte: startDate, $lte: endDate } }).select('_id').lean();
                balanceQuery.userId = { $in: recentUsersBalance.map(u => u._id) };
            }
            const balances = yield models_1.Balances.find(balanceQuery).select('userId balance updatedAt').lean();
            balances.forEach(b => dataMap[b.userId.toString()] = { value: b.balance || 0, recordId: b.userId.toString(), updatedAt: b.updatedAt });
            break;
        case 'Bonus_balance':
            let bonusBalanceQuery = { userId: { $in: userIds }, status: true };
            if (isWaitForEvent) {
                const recentUsersBonus = yield models_1.Users.find({ _id: { $in: userIds }, updatedAt: { $gte: startDate, $lte: endDate } }).select('_id').lean();
                bonusBalanceQuery.userId = { $in: recentUsersBonus.map(u => u._id) };
            }
            const bonusesBalance = yield models_1.Balances.find(bonusBalanceQuery).select('userId bonus updatedAt').lean();
            bonusesBalance.forEach(b => dataMap[b.userId.toString()] = { value: b.bonus || 0, recordId: b.userId.toString(), updatedAt: b.updatedAt });
            break;
        case 'Bonus_get':
            const bonusGet = yield models_1.BonusHistories.find(query).select('userId amount createdAt _id').lean();
            bonusGet.forEach(bg => {
                const uid = bg.userId.toString();
                if (!dataMap[uid]) dataMap[uid] = { records: [] };
                dataMap[uid].records.push({ _id: bg._id.toString(), amount: Number(bg.amount), date: new Date(bg.createdAt) });
            });
            break;
        case 'net_lose':
            const balancesNet = yield models_1.Balances.find({ userId: { $in: userIds }, status: true }).select('userId balance').lean();
            const balanceNetMap = {};
            balancesNet.forEach(b => balanceNetMap[b.userId.toString()] = b.balance || 0);
            let payNetQuery = { userId: { $in: userIds }, status: 3 };
            if (isWaitForEvent) payNetQuery.createdAt = { $gte: startDate, $lte: endDate };
            const paymentsNetAgg = yield models_1.Payments.aggregate([
                { $match: payNetQuery },
                { $group: { _id: { userId: '$userId', type: '$ipn_type' }, total: { $sum: '$actually_paid' } } }
            ]);
            paymentsNetAgg.forEach(agg => {
                const uid = agg._id.userId.toString();
                if (!dataMap[uid]) dataMap[uid] = { deposit: 0, withdraw: 0 };
                if (agg._id.type === 'deposit') dataMap[uid].deposit = agg.total || 0;
                if (agg._id.type === 'withdrawal') dataMap[uid].withdraw = agg.total || 0;
            });
            for (const uid of userIds.map(id => id.toString())) {
                if (!dataMap[uid]) dataMap[uid] = { deposit: 0, withdraw: 0 };
                const m = dataMap[uid];
                m.netLose = m.deposit - m.withdraw - (balanceNetMap[uid] || 0);
            }
            break;
        default:
            console.warn(`Unsupported property: ${property}`);
            return {};
    }
    return dataMap;
});

const filterByComputedData = (filteredPlayers, computedData, property, operator, value, isMultipleTimes, processedRecords, newProcessedRecords, isWaitForEvent, startDate, endDate, condition) => __awaiter(void 0, void 0, void 0, function* () {
    const newFiltered = [];
    for (const user of filteredPlayers) {
        const userIdStr = user._id.toString();
        const data = computedData[userIdStr] || {};
        const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr) || { lastProcessedTime: new Date(0), processedRecordIds: [] };
        const lastTime = new Date(lastProcessed.lastProcessedTime);
        const processedIds = lastProcessed.processedRecordIds.map(id => id.toString());

        let isNew = true;
        let matches = false;
        let newIds = [];

        switch (property) {
            case 'sport_bet':
            case 'Casino_Bet':
            case 'Live_Casino_Gaming_bet':
            case 'Deposit_attempt':
            case 'Deposit_approved':
            case 'Deposit_Disproved':
            case 'Deposit_Comparator':
            case 'Withdraw_attempt':
            case 'Withdraw_approved':
            case 'Withdraw_Disproved':
            case 'Withdraw_Comparator':
            case 'odds':
            case 'Deposit_Canceled':
                const recordsVal = data.records || [];
                const newRecordsVal = recordsVal.filter(rec => !processedIds.includes(rec._id));
                isNew = isMultipleTimes ? newRecordsVal.length > 0 : true;
                matches = (isMultipleTimes ? newRecordsVal : recordsVal).some(rec => applyOperator(rec.value, operator, Number(value)));
                if (isMultipleTimes && matches) newIds = (isMultipleTimes ? newRecordsVal : recordsVal).filter(rec => applyOperator(rec.value, operator, Number(value))).map(rec => rec._id);
                break;
            case 'league_bet':
            case 'match_bet':
            case 'games':
            case 'provider':
                const recordsHas = data.records || [];
                const newRecordsHas = recordsHas.filter(rec => !processedIds.includes(rec._id));
                isNew = isMultipleTimes ? newRecordsHas.length > 0 : true;
                matches = operator === '=' ? (isMultipleTimes ? newRecordsHas.length > 0 : data.has || false) : !(isMultipleTimes ? newRecordsHas.length > 0 : data.has || false);
                if (isMultipleTimes && matches) newIds = newRecordsHas.map(rec => rec._id);
                break;
            case 'Push_Notifications':
            case 'Email_Notifications':
            case 'SMS_Notifications':
                const recordsNotif = data.records || [];
                const newRecordsNotif = recordsNotif.filter(id => !processedIds.includes(id));
                isNew = isMultipleTimes ? newRecordsNotif.length > 0 : true;
                matches = (value === 'true') ? (operator === '=' ? (isMultipleTimes ? newRecordsNotif.length > 0 : data.has || false) : !(isMultipleTimes ? newRecordsNotif.length > 0 : data.has || false)) : false;
                if (isMultipleTimes && matches) newIds = newRecordsNotif;
                break;
            case 'registration_date':
            case 'Last_login':
            case 'Logout':
            case 'Game_Session_Start':
            case 'Game_Session_End':
                const date = data.date || new Date(0);
                const recordIdDate = data.recordId || null;
                const day = date.toISOString().split('T')[0];
                const condDay = new Date(value).toISOString().split('T')[0];
                isNew = isMultipleTimes ? (date.getTime() > lastTime.getTime() && recordIdDate && !processedIds.includes(recordIdDate)) : true;
                if (isWaitForEvent) isNew = isNew && date >= startDate && date <= endDate;
                matches = applyOperatorDate(date, operator, new Date(value), day, condDay);
                if (isMultipleTimes && isNew && matches) newIds = [recordIdDate];
                break;
            case 'Login_sum_total':
            case 'Minimum_Bet_Amount':
                const count = data.count || 0;
                const recordsCount = data.records || [];
                const newRecordsCount = recordsCount.filter(id => !processedIds.includes(id));
                isNew = isMultipleTimes ? newRecordsCount.length > 0 : true;
                const currentCount = isMultipleTimes ? newRecordsCount.length : count;
                matches = applyOperator(currentCount, operator, Number(value));
                if (isMultipleTimes && matches) newIds = newRecordsCount;
                break;
            case 'device_used':
            case 'Game_Type':
                const recordsDev = data.records || [];
                const newRecordsDev = recordsDev.filter(rec => !processedIds.includes(rec._id));
                isNew = isMultipleTimes ? newRecordsDev.length > 0 : true;
                matches = (isMultipleTimes ? newRecordsDev : recordsDev).some(rec => applyOperator(rec.value.toLowerCase(), operator, value.toLowerCase()));
                if (isMultipleTimes && matches) newIds = (isMultipleTimes ? newRecordsDev : recordsDev).filter(rec => applyOperator(rec.value.toLowerCase(), operator, value.toLowerCase())).map(rec => rec._id);
                break;
            case 'Login_Specific_IP':
                const recordsIp = data.records || [];
                const newRecordsIp = recordsIp.filter(rec => !processedIds.includes(rec._id));
                isNew = isMultipleTimes ? newRecordsIp.length > 0 : true;
                const regex = new RegExp(value, 'i');
                matches = (isMultipleTimes ? newRecordsIp : recordsIp).some(rec => applyOperator(regex.test(rec.value), operator, true));
                if (isMultipleTimes && matches) newIds = (isMultipleTimes ? newRecordsIp : recordsIp).filter(rec => applyOperator(regex.test(rec.value), operator, true)).map(rec => rec._id);
                break;
            case 'Limit_set':
            case 'Award_Bonus':
            case 'Balance':
            case 'Bonus_balance':
            case 'time_spend':
            case 'Geolocation':
            case 'visite_page':
                const val = data.value || (typeof data.value === 'number' ? 0 : '');
                const recordId = data.recordId || null;
                const updatedAt = data.updatedAt ? new Date(data.updatedAt) : null;
                isNew = isMultipleTimes ? recordId && !processedIds.includes(recordId) : true;
                if (isWaitForEvent && updatedAt) isNew = isNew && updatedAt >= startDate && updatedAt <= endDate;
                matches = typeof val === 'number' ? applyOperator(val, operator, Number(value)) : applyOperator(val.toUpperCase(), operator, value.toUpperCase());
                if (isMultipleTimes && isNew && matches) newIds = [recordId];
                break;
            case 'Self_exclusion':
            case 'Admin_Only_Events':
            case 'User_Tier':
            case 'Localization':
                const has = data.has || false;
                const recordIdHas = data.recordId || null;
                const updatedAtHas = data.updatedAt ? new Date(data.updatedAt) : null;
                isNew = isMultipleTimes ? recordIdHas && !processedIds.includes(recordIdHas) : true;
                if (isWaitForEvent && updatedAtHas) isNew = isNew && updatedAtHas >= startDate && updatedAtHas <= endDate;
                matches = operator === '=' ? has : !has;
                if (isMultipleTimes && isNew && matches) newIds = [recordIdHas];
                break;
        case 'VIP_points':
            const recordsVip = data.records || [];
            const newRecordsVip = recordsVip.filter(rec => !processedIds.includes(rec._id));
            isNew = isMultipleTimes ? newRecordsVip.length > 0 : true;
            const sumVip = isMultipleTimes ? newRecordsVip.reduce((s, r) => s + r.value, 0) : data.total || 0;
            matches = applyOperator(sumVip, operator, Number(value));
            if (isMultipleTimes && matches) newIds = newRecordsVip.map(r => r._id);
            break;
        case 'Bonus_get':
            const recordsBonus = data.records || [];
            const newRecordsBonus = recordsBonus.filter(rec => !processedIds.includes(rec._id));
            isNew = isMultipleTimes ? newRecordsBonus.length > 0 : true;
            const { dateOperator, dateValue, amountOperator, amountValue } = condition;
            const condDate = new Date(dateValue);
            const condAmount = Number(amountValue);
            const hasMatchBonus = (isMultipleTimes ? newRecordsBonus : recordsBonus).some(rec => {
                const recDate = rec.date;
                const recDay = recDate.toISOString().split('T')[0];
                const condDay = condDate.toISOString().split('T')[0];
                const matchDate = applyOperatorDate(recDate, dateOperator, condDate, recDay, condDay);
                const matchAmount = applyOperator(rec.amount, amountOperator, condAmount);
                return matchDate && matchAmount;
            });
            matches = hasMatchBonus;
            if (isMultipleTimes && matches) {
                newIds = (isMultipleTimes ? newRecordsBonus : recordsBonus).filter(rec => {
                    const recDate = rec.date;
                    const recDay = recDate.toISOString().split('T')[0];
                    const condDay = condDate.toISOString().split('T')[0];
                    const matchDate = applyOperatorDate(recDate, dateOperator, condDate, recDay, condDay);
                    const matchAmount = applyOperator(rec.amount, amountOperator, condAmount);
                    return matchDate && matchAmount;
                }).map(rec => rec._id);
            }
            break;
        case 'net_lose':
            const netLose = data.netLose || 0;
            isNew = true; 
            matches = applyOperator(netLose, operator, Number(value));
            if (isMultipleTimes && matches) newIds = [userIdStr];
            break;
        }

        if (isNew && matches) {
            newFiltered.push(user);
            if (isMultipleTimes && newIds.length > 0) {
                newProcessedRecords.push({
                    userId: user._id,
                    lastProcessedTime: new Date(),
                    processedRecordIds: newIds
                });
            }
        }
    }
    return newFiltered;
});

module.exports = { applyConditions };