"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkJourneyFlow = void 0;
const models_1 = require("../../models");
const socket_1 = require("../../socket");
const redis_1 = require("../../utils/redis");
const sendgrid_1 = require("../../utils/sendgrid");
const twilio_1 = require("../../utils/twilio");
const bonus_1 = require("../../controllers/bonus");
const base_1 = require("../base");

const { triggersCheck } = require("./triggers");
const { applyConditions } = require("./conditions");

const MARKETING_EMAIL = process.env.MARKETING_EMAIL;
const APP_NAME = process.env.APP_NAME;
const SENDER_NUMBER = process.env.TWILIO_PHONE_NUMBER;

const cleanStaleCampaigns = async () => {
    const now = new Date();
    const timeoutMs = 10 * 60 * 1000; 
    const staleCampaigns = await models_1.Journeys.find({
        processing: true,
        processingStartedAt: { $lt: new Date(now.getTime() - timeoutMs) }
    }).select('_id').lean();

    if (staleCampaigns.length) {
        console.log(`Found ${staleCampaigns.length} stale campaigns to reset`);
        await models_1.Journeys.updateMany(
            { _id: { $in: staleCampaigns.map(c => c._id) } },
            { $unset: { processing: "", processingStartedAt: "" } }
        );
        for (const campaign of staleCampaigns) {
            await redis_1.delFromCache(`journey:${campaign._id}`);
            console.log(`Cleared cache for stale campaign ${campaign._id}`);
        }
        await redis_1.delFromCache('campaigns:active');
        console.log(`Cleared campaigns:active cache due to stale campaigns`);
    }
};

const sendJourneyEmail = async (toPlayers, node) => {
    const { title, sendgridId } = node.node.data;
    const mailOptions = {
        from: { email: MARKETING_EMAIL, name: APP_NAME },
        to: toPlayers,
        subject: 'webet360',
        templateId: sendgridId || 'd-5872ef231b8e4d8084658108936c7cf6',
        dynamicTemplateData: { title }
    };

    const sentEmails = [];
    const failedEmails = [];

    try {
        const response = await sendgrid_1.sendMail(mailOptions);
        if (response && response[0]?.statusCode >= 200 && response[0]?.statusCode < 300) {
            sentEmails.push(...toPlayers);
        } else {
            console.error(`Failed to send email for node ${node._id}. SendGrid response:`, response);
            failedEmails.push(...toPlayers);
        }
    } catch (error) {
        console.error(`Failed to send email batch for node ${node._id} => `, error.response?.body || error);
        failedEmails.push(...toPlayers);
    }

    return { sent: sentEmails, failed: failedEmails };
};

const sendJourneySms = async (toPlayers, node) => {
    const { message, link } = node.node.data;
    const sentPhones = [];
    const failedPhones = [];

    for (const phone of toPlayers) {
        const journeyHistory = new models_1.JourneyHistory({
            node: node.node,
            sender: SENDER_NUMBER,
            receivers: [phone]
        });

        const params = {
            message: `${message}\n${link}?id=${journeyHistory._id}`,
            to: phone
        };

        try {
            const response = await twilio_1.sendSms(params);
            sentPhones.push(phone);
            await journeyHistory.save();
        } catch (error) {
            console.error(`Failed to send SMS to ${phone} for node ${node._id} => `, error);
            failedPhones.push(phone);
        }
    }

    return { sent: sentPhones, failed: failedPhones };
};

const getPlayers = async (id) => {
    const cacheKey = `segmentation:${id}`;
    let segmentation = await redis_1.getFromCache(cacheKey);
    if (!segmentation) {
        segmentation = await models_1.Segmentations.findById(id).lean();
        if (segmentation) {
            await redis_1.setToCache(cacheKey, segmentation, 3600);
            console.log(`Fetched and cached segmentation ${id}:`, JSON.stringify(segmentation, null, 2));
        } else {
            console.error(`Segmentation ${id} not found in database`);
            return [];
        }
    }

    const pageSize = 500;
    let skip = 0;
    const filterUsers = [];
    const cacheFilterKey = `filteredUsers:segment:${id}`;
    let cachedFilteredUsers = await redis_1.getFromCache(cacheFilterKey);

    if (cachedFilteredUsers) {
        console.log(`Cache hit for filtered users: ${cacheFilterKey}, returning ${cachedFilteredUsers.length} users`);
        return cachedFilteredUsers;
    }

    while (true) {
        const usersCacheKey = `users:active:page:${skip}:${pageSize}`;
        let users = await redis_1.getFromCache(usersCacheKey);
        if (!users) {
            users = await models_1.Users.find({ status: true })
                .select('_id email phone point gender createdAt last_game country_reg kycVerified status tier birthday')
                .skip(skip)
                .limit(pageSize)
                .lean();
            if (users.length) {
                await redis_1.setToCache(usersCacheKey, users, 300);
                console.log(`Cached ${users.length} users for key: ${usersCacheKey}`);
            }
        }
        if (!users.length) break;

        for (const user of users) {
            try {
                const balance = await models_1.Balances.findOne({ userId: user._id, status: true })
                    .populate('userId')
                    .lean();
                if (!balance) {
                    console.warn(`No balance found for user ${user._id}, skipping`);
                    continue;
                }
                balance.userId = user;
                const checked = await base_1.checkSegmentationPlayer(segmentation, balance);
                if (checked) filterUsers.push(user);
            } catch (error) {
                console.error(`Error checking segmentation for user ${user._id} with segmentation ${id}:`, error.message);
                console.error(`Segmentation data:`, JSON.stringify(segmentation, null, 2));
                console.error(`User data:`, JSON.stringify(user, null, 2));
            }
        }

        skip += pageSize;
    }

    if (filterUsers.length) {
        await redis_1.setToCache(cacheFilterKey, filterUsers, 3600);
        console.log(`Cached ${filterUsers.length} filtered users for key: ${cacheFilterKey}`);
    } else {
        console.warn(`No users matched segmentation ${id}`);
    }
    return filterUsers;
};

const calculateDelayInMs = (unit, value) => {
    const numValue = parseFloat(value) || 0;
    if (!unit) {
        console.error(`Delay unit is missing! Defaulting to seconds.`);
        return numValue * 1000;
    }
    switch (unit.toLowerCase()) {
        case 'seconds': return numValue * 1000;
        case 'minutes': return numValue * 60 * 1000;
        case 'hours': return numValue * 60 * 60 * 1000;
        case 'days': return numValue * 24 * 60 * 60 * 1000;
        default:
            console.error(`Unknown delay unit: ${unit}. Defaulting to seconds.`);
            return numValue * 1000;
    }
};

const calculateDurationInMs = (unit, value) => {
    const numValue = parseFloat(value) || 0;
    switch (unit.toLowerCase()) {
        case 'hours': return numValue * 60 * 60 * 1000;
        case 'days': return numValue * 24 * 60 * 60 * 1000;
        case 'weeks': return numValue * 7 * 24 * 60 * 60 * 1000;
        case 'months': return numValue * 30 * 24 * 60 * 60 * 1000;
        default: return 0;
    }
};

const checkNode = async (param, lastDate, io) => {
    try {
        const { nodes, edges, nodeId, players: initialPlayers, campaignId } = param;
        console.log(`Starting checkNode for campaign ${campaignId}, nodeId: ${nodeId}, players: ${initialPlayers.length}`);

        const startEdges = edges.filter((e) => e.from === nodeId);
        console.log(`Found ${startEdges.length} startEdges for node ${nodeId}`);
        if (!startEdges.length) {
            console.log(`No startEdges for node ${nodeId}. Exiting checkNode.`);
            return;
        }

        const journeyCacheKey = `journey:${campaignId}`;
        let journey = await redis_1.getFromCache(journeyCacheKey);
        if (!journey) {
            console.log(`Cache miss for journey:${campaignId}. Fetching from DB...`);
            journey = await models_1.Journeys.findById(campaignId).select('completedUsers campaignDuration entryMode entryTrigger selectedSegment conditions activeJourneys start_time_segment createdAt').lean();
            if (journey) {
                journey.completedUsers = journey.completedUsers || [];
                journey.activeJourneys = journey.activeJourneys || [];
                await redis_1.setToCache(journeyCacheKey, journey, 3600);
                console.log(`Fetched and cached journey ${campaignId}:`, JSON.stringify(journey, null, 2));
            }
        }
        if (!journey) {
            console.error(`Journey ${campaignId} not found`);
            return;
        }

        console.log('Journey object before completedUsers:', JSON.stringify(journey, null, 2));
        const completedUsers = new Set((journey.completedUsers || []).map(id => id.toString()));
        const activePlayers = initialPlayers.filter(player => !completedUsers.has(player._id.toString()));
        console.log(`Active players after filtering completedUsers: ${activePlayers.length}`);

        let nodesToProcess = [...new Set(startEdges.map(edge => edge.to))].map(id => {
            const nextNode = nodes.find(n => n.id === id);
            return nextNode ? { node: nextNode, players: activePlayers } : null;
        }).filter(item => item !== null);
        console.log(`Nodes to process: ${nodesToProcess.length}`);

        while (nodesToProcess.length > 0) {
            const { node, players } = nodesToProcess.shift();
            console.log(`Processing node ${node.id} of type ${node.type} with ${players.length} players`);
            const now = new Date();

            const filterProcessedPlayers = async (players, nodeKey, subKey = 'default') => {
                const cacheKey = `processedPlayers:${campaignId}:${nodeKey}:${subKey}`;
                let processedUsers = await redis_1.getFromCache(cacheKey);
                if (!processedUsers) {
                    console.log(`Cache miss for ${cacheKey}. Fetching from DB...`);
                    const currentStats = await models_1.JourneyStats.findOne({ campaignId }).select(`nodes.${nodeKey}.stats.${subKey}`).lean() || { nodes: {} };
                    const nodeStats = currentStats.nodes[nodeKey] || { stats: {} };
                    processedUsers = nodeStats.stats[subKey]?.users?.map(u => u.userId.toString()) || [];
                    await redis_1.setToCache(cacheKey, processedUsers, 300);
                    console.log(`Cached processedUsers for ${cacheKey}: ${processedUsers.length} users`);
                } else {
                    console.log(`Cache hit for ${cacheKey}: ${processedUsers.length} users`);
                }
                const unprocessed = players.filter(player => !processedUsers.includes(player._id.toString()));
                console.log(`Unprocessed players for ${nodeKey}:${subKey}: ${unprocessed.length}`);
                return unprocessed;
            };

            if (node.type === 'delay') {
                console.log(`Processing delay node ${node.id}`);
                const { delayUnit, delayValue } = node.node.data;
                const delayInMs = calculateDelayInMs(delayUnit, delayValue);
                console.log(`Delay node ${node.id}: delayUnit=${delayUnit}, delayValue=${delayValue}, delayInMs=${delayInMs}`);
                if (delayInMs <= 0) {
                    console.log(`Invalid delayInMs for node ${node.id}. Skipping...`);
                    continue;
                }

                const nodeCacheKey = `journeyNode:${node._id}`;
                let nodeData = await redis_1.getFromCache(nodeCacheKey);
                if (!nodeData) {
                    console.log(`Cache miss for ${nodeCacheKey}. Fetching from DB...`);
                    nodeData = await models_1.JourneyNodes.findById(node._id).select('happenedUsers stillWaitingUsers lastCheckTime').lean();
                    if (nodeData) {
                        await redis_1.setToCache(nodeCacheKey, nodeData, 3600);
                        console.log(`Cached nodeData for ${nodeCacheKey}`);
                    } else {
                        nodeData = { happenedUsers: [], stillWaitingUsers: [], lastCheckTime: null };
                    }
                }
                let currentHappenedUsers = nodeData.happenedUsers || [];
                let currentStillWaitingUsers = nodeData.stillWaitingUsers || [];
                let lastCheckTime = nodeData.lastCheckTime ? new Date(nodeData.lastCheckTime) : null;

                const unprocessedPlayers = players.filter(player => {
                    const playerId = player._id.toString();
                    const isHappened = currentHappenedUsers.some(entry => entry.userId.toString() === playerId);
                    const isStillWaiting = currentStillWaitingUsers.some(entry => entry.userId.toString() === playerId);
                    return !isHappened && !isStillWaiting;
                });
                console.log(`Delay node ${node.id}: ${unprocessedPlayers.length} unprocessed players`);

                const MIN_CHECK_INTERVAL_MS = 1 * 60 * 1000;
                const shouldCheckOldWaiting = !lastCheckTime || (now.getTime() - lastCheckTime.getTime()) >= MIN_CHECK_INTERVAL_MS;

                const newPlayerTimings = unprocessedPlayers.map(player => ({
                    userId: player._id,
                    startTime: now,
                    deadline: new Date(now.getTime() + delayInMs)
                }));

                if (newPlayerTimings.length > 0) {
                    currentStillWaitingUsers = [...currentStillWaitingUsers, ...newPlayerTimings];
                    await models_1.JourneyNodes.updateOne({ _id: node._id }, { $set: { stillWaitingUsers: currentStillWaitingUsers } });
                    await redis_1.setToCache(nodeCacheKey, { ...nodeData, stillWaitingUsers: currentStillWaitingUsers }, 3600);
                    console.log(`Added ${newPlayerTimings.length} new players to stillWaitingUsers for delay node ${node.id}`);
                }

                let delayedPlayers = [];
                let stillWaitingPlayers = [];

                if (currentStillWaitingUsers.length > 0) {
                    const timedOutTimings = [];
                    const waitingTimings = [];
                    currentStillWaitingUsers.forEach(timing => {
                        if (now >= new Date(timing.deadline)) {
                            timedOutTimings.push(timing);
                        } else {
                            waitingTimings.push(timing);
                        }
                    });

                    if (timedOutTimings.length > 0) {
                        const timedOutUserIds = timedOutTimings.map(t => t.userId);
                        delayedPlayers = await models_1.Users.find({ _id: { $in: timedOutUserIds } }).lean();
                    }

                    stillWaitingPlayers = waitingTimings.map(t => t.userId);
                }

                const updatedHappenedUsers = [
                    ...currentHappenedUsers,
                    ...delayedPlayers.map(player => {
                        const timing = currentStillWaitingUsers.find(t => t.userId.toString() === player._id.toString());
                        return {
                            userId: player._id,
                            startTime: timing.startTime,
                            deadline: timing.deadline
                        };
                    })
                ];

                const updatedStillWaitingUsers = currentStillWaitingUsers.filter(
                    entry => !delayedPlayers.some(p => p._id.toString() === entry.userId.toString())
                );

                const updateSet = {
                    happenedUsers: updatedHappenedUsers,
                    stillWaitingUsers: updatedStillWaitingUsers
                };

                if (shouldCheckOldWaiting) {
                    updateSet.lastCheckTime = now;
                }

                await models_1.JourneyNodes.updateOne(
                    { _id: node._id },
                    { $set: updateSet }
                );
                await redis_1.setToCache(nodeCacheKey, {
                    ...nodeData,
                    ...updateSet
                }, 3600);
                console.log(`Updated happenedUsers and stillWaitingUsers for delay node ${node.id}`);

                try {
                    const statsCacheKey = `journeyStats:${campaignId}:${node.id}`;
                    let currentStats = await redis_1.getFromCache(statsCacheKey);
                    if (!currentStats) {
                        console.log(`Cache miss for ${statsCacheKey}. Fetching from DB...`);
                        currentStats = await models_1.JourneyStats.findOne({ campaignId }).select('nodes').lean() || { nodes: {} };
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Cached currentStats for ${statsCacheKey}`);
                    }
                    const nodeStats = currentStats.nodes[node.id] || { type: 'delay', stats: {} };

                    const existingUsers = nodeStats.stats.default?.users.map(u => u.userId.toString()) || [];
                    const newUsers = delayedPlayers.map(p => p._id.toString()).filter(id => !existingUsers.includes(id));
                    const newUserEntries = newUsers.map(userId => ({ userId, completionDate: now }));
                    console.log(`Delay node ${node.id}: ${newUsers.length} new users`);

                    nodeStats.stats.default = {
                        count: (nodeStats.stats.default?.count || 0) + newUsers.length,
                        users: [...(nodeStats.stats.default?.users || []), ...newUserEntries]
                    };
                    currentStats.nodes[node.id] = nodeStats;

                    const updateResult = await models_1.JourneyStats.updateOne(
                        { campaignId },
                        { $set: { nodes: currentStats.nodes } },
                        { upsert: true }
                    );
                    if (updateResult.modifiedCount > 0) {
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Updated JourneyStats for delay node ${node.id}`);
                        await redis_1.delFromCache(`processedPlayers:${campaignId}:${node.id}:default`);
                        console.log(`Invalidated processedPlayers cache for delay node ${node.id}`);
                    }
                } catch (error) {
                    console.error(`Failed to update JourneyStats for delay node ${node.id}:`, error);
                }

                const totalStillWaiting = updatedStillWaitingUsers.length;
                console.log(`Delay node ${node.id}: ${totalStillWaiting} players still waiting`);

                // Push all completed players to next
                const completedPlayers = players.filter(player => updatedHappenedUsers.some(entry => entry.userId.toString() === player._id.toString()));

                const nextNodeIds = edges.filter(e => e.from === node.id).map(e => e.to);
                const nextNodes = nextNodeIds.map(id => {
                    const nextNode = nodes.find(n => n.id === id);
                    return nextNode ? { node: nextNode, players: completedPlayers } : null;
                }).filter(item => item !== null);
                console.log(`Pushing ${nextNodes.length} next nodes for delay node ${node.id} with ${completedPlayers.length} players`);
                nodesToProcess.push(...nextNodes);
            }

            if (node.type === 'delay_until') {
                console.log(`Processing delay_until node ${node.id}`);
                const { date, hour, minute } = node.node.data;
                const formattedHour = String(hour).padStart(2, '0');
                const formattedMinute = minute ? String(minute).padStart(2, '0') : '00';
                const targetDate = new Date(`${date}T${formattedHour}:${formattedMinute}:00Z`);
                console.log(`Delay_until node ${node.id}: targetDate=${targetDate}`);

                const nodeCacheKey = `journeyNode:${node._id}`;
                let nodeData = await redis_1.getFromCache(nodeCacheKey);
                if (!nodeData) {
                    console.log(`Cache miss for ${nodeCacheKey}. Fetching from DB...`);
                    nodeData = await models_1.JourneyNodes.findById(node._id).select('happenedUsers stillWaitingUsers lastCheckTime').lean();
                    if (nodeData) {
                        await redis_1.setToCache(nodeCacheKey, nodeData, 3600);
                        console.log(`Cached nodeData for ${nodeCacheKey}`);
                    } else {
                        nodeData = { happenedUsers: [], stillWaitingUsers: [], lastCheckTime: null };
                    }
                }
                let currentHappenedUsers = nodeData.happenedUsers || [];
                let currentStillWaitingUsers = nodeData.stillWaitingUsers || [];
                let lastCheckTime = nodeData.lastCheckTime ? new Date(nodeData.lastCheckTime) : null;

                const unprocessedPlayers = players.filter(player => {
                    const playerId = player._id.toString();
                    const isHappened = currentHappenedUsers.some(entry => entry.userId.toString() === playerId);
                    const isStillWaiting = currentStillWaitingUsers.some(entry => entry.userId.toString() === playerId);
                    return !isHappened && !isStillWaiting;
                });
                console.log(`Delay_until node ${node.id}: ${unprocessedPlayers.length} unprocessed players`);

                const MIN_CHECK_INTERVAL_MS = 1 * 60 * 1000;
                const shouldCheckOldWaiting = !lastCheckTime || (now.getTime() - lastCheckTime.getTime()) >= MIN_CHECK_INTERVAL_MS;

                const newPlayerTimings = unprocessedPlayers.map(player => ({
                    userId: player._id,
                    startTime: now,
                    deadline: targetDate
                }));

                if (newPlayerTimings.length > 0) {
                    currentStillWaitingUsers = [...currentStillWaitingUsers, ...newPlayerTimings];
                    await models_1.JourneyNodes.updateOne({ _id: node._id }, { $set: { stillWaitingUsers: currentStillWaitingUsers } });
                    await redis_1.setToCache(nodeCacheKey, { ...nodeData, stillWaitingUsers: currentStillWaitingUsers }, 3600);
                    console.log(`Added ${newPlayerTimings.length} new players to stillWaitingUsers for delay_until node ${node.id}`);
                }

                let delayedPlayers = [];
                let stillWaitingPlayers = [];

                if (currentStillWaitingUsers.length > 0) {
                    const timedOutTimings = [];
                    const waitingTimings = [];
                    currentStillWaitingUsers.forEach(timing => {
                        if (now >= targetDate) {
                            timedOutTimings.push(timing);
                        } else {
                            waitingTimings.push(timing);
                        }
                    });

                    if (timedOutTimings.length > 0) {
                        const timedOutUserIds = timedOutTimings.map(t => t.userId);
                        delayedPlayers = await models_1.Users.find({ _id: { $in: timedOutUserIds } }).lean();
                    }

                    stillWaitingPlayers = waitingTimings.map(t => t.userId);
                }

                const updatedHappenedUsers = [
                    ...currentHappenedUsers,
                    ...delayedPlayers.map(player => {
                        const timing = currentStillWaitingUsers.find(t => t.userId.toString() === player._id.toString());
                        return {
                            userId: player._id,
                            startTime: timing.startTime,
                            deadline: timing.deadline
                        };
                    })
                ];

                const updatedStillWaitingUsers = currentStillWaitingUsers.filter(
                    entry => !delayedPlayers.some(p => p._id.toString() === entry.userId.toString())
                );

                const updateSet = {
                    happenedUsers: updatedHappenedUsers,
                    stillWaitingUsers: updatedStillWaitingUsers
                };

                if (shouldCheckOldWaiting) {
                    updateSet.lastCheckTime = now;
                }

                await models_1.JourneyNodes.updateOne(
                    { _id: node._id },
                    { $set: updateSet }
                );
                await redis_1.setToCache(nodeCacheKey, {
                    ...nodeData,
                    ...updateSet
                }, 3600);
                console.log(`Updated happenedUsers and stillWaitingUsers for delay_until node ${node.id}`);

                try {
                    const statsCacheKey = `journeyStats:${campaignId}:${node.id}`;
                    let currentStats = await redis_1.getFromCache(statsCacheKey);
                    if (!currentStats) {
                        console.log(`Cache miss for ${statsCacheKey}. Fetching from DB...`);
                        currentStats = await models_1.JourneyStats.findOne({ campaignId }).select('nodes').lean() || { nodes: {} };
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Cached currentStats for ${statsCacheKey}`);
                    }
                    const nodeStats = currentStats.nodes[node.id] || { type: 'delay_until', stats: {} };

                    const existingUsers = nodeStats.stats.default?.users.map(u => u.userId.toString()) || [];
                    const newUsers = delayedPlayers.map(p => p._id.toString()).filter(id => !existingUsers.includes(id));
                    const newUserEntries = newUsers.map(userId => ({ userId, completionDate: now }));
                    console.log(`Delay_until node ${node.id}: ${newUsers.length} new users`);

                    nodeStats.stats.default = {
                        count: (nodeStats.stats.default?.count || 0) + newUsers.length,
                        users: [...(nodeStats.stats.default?.users || []), ...newUserEntries]
                    };
                    currentStats.nodes[node.id] = nodeStats;

                    const updateResult = await models_1.JourneyStats.updateOne(
                        { campaignId },
                        { $set: { nodes: currentStats.nodes } },
                        { upsert: true }
                    );
                    if (updateResult.modifiedCount > 0) {
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Updated JourneyStats for delay_until node ${node.id}`);
                        await redis_1.delFromCache(`processedPlayers:${campaignId}:${node.id}:default`);
                        console.log(`Invalidated processedPlayers cache for delay_until node ${node.id}`);
                    }
                } catch (error) {
                    console.error(`Failed to update JourneyStats for delay_until node ${node.id}:`, error);
                }

                const totalStillWaiting = updatedStillWaitingUsers.length;
                console.log(`Delay_until node ${node.id}: ${totalStillWaiting} players still waiting`);

                // Push all completed players to next
                const completedPlayers = players.filter(player => updatedHappenedUsers.some(entry => entry.userId.toString() === player._id.toString()));

                const nextNodeIds = edges.filter(e => e.from === node.id).map(e => e.to);
                const nextNodes = nextNodeIds.map(id => {
                    const nextNode = nodes.find(n => n.id === id);
                    return nextNode ? { node: nextNode, players: completedPlayers } : null;
                }).filter(item => item !== null);
                console.log(`Pushing ${nextNodes.length} next nodes for delay_until node ${node.id} with ${completedPlayers.length} players`);
                nodesToProcess.push(...nextNodes);
            }

            if (node.type === 'push') {
                const unprocessedPlayers = await filterProcessedPlayers(players, node.id, 'default');
                console.log(`Push node ${node.id}: ${unprocessedPlayers.length} unprocessed players`);
                if (unprocessedPlayers.length === 0) {
                    console.log(`All players already processed for push node ${node.id}. Skipping...`);
                    const nextNodeIds = edges.filter(e => e.from === node.id).map(e => e.to);
                    const nextNodes = nextNodeIds.map(id => {
                        const nextNode = nodes.find(n => n.id === id);
                        return nextNode ? { node: nextNode, players } : null;
                    }).filter(item => item !== null);
                    console.log(`Pushing ${nextNodes.length} next nodes for push node ${node.id}`);
                    nodesToProcess.push(...nextNodes);
                    continue;
                }

                const toPlayers = unprocessedPlayers.map((p) => p._id);
                let message, link;
                try {
                    ({ message, link } = node.node.data || {});
                    if (!message || !link) {
                        throw new Error(`Missing message or link in node ${node.id} data: ${JSON.stringify(node.node.data)}`);
                    }
                    console.log(`Push node ${node.id}: message=${message}, link=${link}`);
                } catch (error) {
                    console.error(`Invalid push node data for ${node.id}:`, error.message);
                    continue;
                }

                try {
                    const notification = {
                        title: 'Push Notification',
                        description: `${message}\n${link}`,
                        players: toPlayers,
                        country: ['all'],
                        auto: true
                    };

                    const createdNotification = await models_1.Notification.create(notification);
                    console.log(`Created notification for push node ${node.id}:`, createdNotification._id);

                    const statsCacheKey = `journeyStats:${campaignId}:${node.id}`;
                    let currentStats = await redis_1.getFromCache(statsCacheKey);
                    if (!currentStats) {
                        console.log(`Cache miss for ${statsCacheKey}. Fetching from DB...`);
                        currentStats = await models_1.JourneyStats.findOne({ campaignId }).select('nodes').lean() || { nodes: {} };
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Cached currentStats for ${statsCacheKey}`);
                    }
                    const nodeStats = currentStats.nodes[node.id] || { type: 'push', stats: {} };

                    const existingUsers = nodeStats.stats.default?.users.map(u => u.userId.toString()) || [];
                    const newUsers = toPlayers.map(id => id.toString()).filter(id => !existingUsers.includes(id));
                    const newUserEntries = newUsers.map(userId => ({ userId, completionDate: now }));
                    console.log(`Push node ${node.id}: ${newUsers.length} new users`);

                    nodeStats.stats.default = {
                        count: (nodeStats.stats.default?.count || 0) + newUsers.length,
                        users: [...(nodeStats.stats.default?.users || []), ...newUserEntries]
                    };
                    currentStats.nodes[node.id] = nodeStats;

                    const updateResult = await models_1.JourneyStats.updateOne(
                        { campaignId },
                        { $set: { nodes: currentStats.nodes } },
                        { upsert: true }
                    );
                    if (updateResult.modifiedCount > 0) {
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Updated JourneyStats for push node ${node.id}`);
                        await redis_1.delFromCache(`processedPlayers:${campaignId}:${node.id}:default`);
                        console.log(`Invalidated processedPlayers cache for push node ${node.id}`);
                    }
                } catch (error) {
                    console.error(`Failed to create push notification or update JourneyStats for node ${node.id}:`, error);
                    continue;
                }

                await models_1.JourneyNodes.updateOne(
                    { _id: node._id },
                    { $set: { date: now } }
                );
                await redis_1.setToCache(`journeyNode:${node._id}`, { ...node, date: now }, 3600);
                console.log(`Updated node ${node.id} date to ${now}`);

                const nextNodeIds = edges.filter(e => e.from === node.id).map(e => e.to);
                const nextNodes = nextNodeIds.map(id => {
                    const nextNode = nodes.find(n => n.id === id);
                    return nextNode ? { node: nextNode, players: unprocessedPlayers } : null;
                }).filter(item => item !== null);
                console.log(`Pushing ${nextNodes.length} next nodes for push node ${node.id} with ${unprocessedPlayers.length} players`);
                nodesToProcess.push(...nextNodes);
            }

            if (node.type === 'split_traffic') {
                console.log(`Processing split_traffic node ${node.id}`);
                await models_1.JourneyNodes.updateOne(
                    { _id: node._id },
                    { $set: { date: now } }
                );
                await redis_1.setToCache(`journeyNode:${node._id}`, { ...node, date: now }, 3600);
                console.log(`Updated node ${node.id} date to ${now}`);

                const nextEdges = edges.filter(e => e.from === node.id);
                console.log(`Found ${nextEdges.length} nextEdges for split_traffic node ${node.id}`);
                if (!nextEdges.length) {
                    console.log(`No nextEdges for split_traffic node ${node.id}. Skipping...`);
                    continue;
                }

                const totalPercentage = nextEdges.reduce((sum, edge) => sum + (Number(edge.data?.value) || 0), 0);
                console.log(`Total percentage for split_traffic node ${node.id}: ${totalPercentage}`);
                if (totalPercentage > 100) {
                    console.error(`Total percentage for split_traffic ${node.id} exceeds 100%: ${totalPercentage}. Skipping...`);
                    continue;
                }

                const playerCount = players.length;
                let assignedPlayers = 0;
                const splitGroups = [];
                const splitStats = {};
                console.log(`Split_traffic node ${node.id}: ${playerCount} players to split`);

                if (playerCount < nextEdges.length) {
                    for (let i = 0; i < Math.min(playerCount, nextEdges.length); i++) {
                        const edge = nextEdges[i];
                        const percent = Number(edge.data?.value) || 0;
                        const groupPlayers = [players[i]];
                        const nextNode = nodes.find(n => n.id === edge.to);
                        if (nextNode) {
                            splitGroups.push({ node: nextNode, players: groupPlayers });
                            const key = `${nextNode.id}_${percent}`;
                            splitStats[key] = {
                                count: groupPlayers.length,
                                users: groupPlayers.map(p => p._id)
                            };
                            console.log(`Split_traffic node ${node.id}: Assigned ${groupPlayers.length} players to node ${nextNode.id} (${percent}%)`);
                        }
                    }
                } else {
                    for (const edge of nextEdges) {
                        const percent = Number(edge.data?.value) || 0;
                        const groupSize = Math.floor((percent / 100) * playerCount);
                        const groupPlayers = players.slice(assignedPlayers, assignedPlayers + groupSize);
                        assignedPlayers += groupSize;

                        const nextNode = nodes.find(n => n.id === edge.to);
                        if (nextNode && groupPlayers.length > 0) {
                            splitGroups.push({ node: nextNode, players: groupPlayers });
                            const key = `${nextNode.id}_${percent}`;
                            splitStats[key] = {
                                count: groupPlayers.length,
                                users: groupPlayers.map(p => p._id)
                            };
                            console.log(`Split_traffic node ${node.id}: Assigned ${groupPlayers.length} players to node ${nextNode.id} (${percent}%)`);
                        }
                    }

                    if (assignedPlayers < playerCount && splitGroups.length > 0) {
                        const remainingPlayers = players.slice(assignedPlayers);
                        splitGroups[splitGroups.length - 1].players.push(...remainingPlayers);

                        const lastEdge = nextEdges[nextEdges.length - 1];
                        const lastPercent = Number(lastEdge.data?.value) || 0;
                        const lastKey = `${lastEdge.to}_${lastPercent}`;
                        splitStats[lastKey].count += remainingPlayers.length;
                        splitStats[lastKey].users.push(...remainingPlayers.map(p => p._id));
                        console.log(`Split_traffic node ${node.id}: Assigned ${remainingPlayers.length} remaining players to last node ${lastEdge.to}`);
                    }
                }

                try {
                    const statsCacheKey = `journeyStats:${campaignId}:${node.id}`;
                    let currentStats = await redis_1.getFromCache(statsCacheKey);
                    if (!currentStats) {
                        console.log(`Cache miss for ${statsCacheKey}. Fetching from DB...`);
                        currentStats = await models_1.JourneyStats.findOne({ campaignId }).select('nodes').lean() || { nodes: {} };
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Cached currentStats for ${statsCacheKey}`);
                    }
                    const nodeStats = currentStats.nodes[node.id] || { type: 'split_traffic', stats: {} };

                    for (const edge of nextEdges) {
                        const percent = Number(edge.data?.value) || 0;
                        const key = `${percent}%`;
                        const groupPlayers = splitGroups.find(g => g.node.id === edge.to)?.players || [];
                        const existingUsers = nodeStats.stats[key]?.users.map(u => u.userId.toString()) || [];
                        const newUsers = groupPlayers.map(p => p._id.toString()).filter(id => !existingUsers.includes(id));
                        const newUserEntries = newUsers.map(userId => ({ userId, completionDate: now }));
                        console.log(`Split_traffic node ${node.id}: ${newUsers.length} new users for ${key}`);

                        if (newUsers.length > 0) {
                            nodeStats.stats[key] = {
                                count: (nodeStats.stats[key]?.count || 0) + newUsers.length,
                                users: [...(nodeStats.stats[key]?.users || []), ...newUserEntries]
                            };
                        }
                    }

                    currentStats.nodes[node.id] = nodeStats;

                    const updateResult = await models_1.JourneyStats.updateOne(
                        { campaignId },
                        { $set: { nodes: currentStats.nodes } },
                        { upsert: true }
                    );
                    if (updateResult.modifiedCount > 0) {
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Updated JourneyStats for split_traffic node ${node.id}`);
                    }
                } catch (error) {
                    console.error(`Failed to update JourneyStats for split_traffic node ${node.id}:`, error);
                }

                console.log(`Pushing ${splitGroups.length} split groups for split_traffic node ${node.id}`);
                nodesToProcess.push(...splitGroups.filter(group => group.players.length > 0));
            }

            if (node.type === 'limit') {
                console.log(`Processing limit node ${node.id} for ${players.length} players...`);
                const nodeCacheKey = `journeyNode:${node._id}`;
                let nodeData = await redis_1.getFromCache(nodeCacheKey);
                if (!nodeData) {
                    console.log(`Cache miss for ${nodeCacheKey}. Fetching from DB...`);
                    nodeData = await models_1.JourneyNodes.findById(node._id).select('happenedUsers date').lean();
                    if (nodeData) {
                        await redis_1.setToCache(nodeCacheKey, nodeData, 3600);
                        console.log(`Cached nodeData for ${nodeCacheKey}`);
                    }
                }
                const limit = Number(node.node.data.limit) || 0;
                const currentHappenedUsers = nodeData.happenedUsers || [];
                const remainingSlots = Math.max(0, limit - currentHappenedUsers.length);
                console.log(`Limit node ${node.id}: limit=${limit}, currentHappenedUsers=${currentHappenedUsers.length}, remainingSlots=${remainingSlots}`);

                await models_1.JourneyNodes.updateOne(
                    { _id: node._id },
                    { $set: { date: now } }
                );
                await redis_1.setToCache(nodeCacheKey, { ...nodeData, date: now }, 3600);
                console.log(`Updated node ${node.id} date to ${now}`);

                const nextEdges = edges.filter(e => e.from === node.id);
                console.log(`Found ${nextEdges.length} nextEdges for limit node ${node.id}`);
                if (!nextEdges.length) {
                    console.log(`No nextEdges for limit node ${node.id}. Skipping...`);
                    continue;
                }

                const matchedEdge = nextEdges.find(e => e.label === 'Matched');
                const notMatchedEdge = nextEdges.find(e => e.label === 'Not Matched');

                let matchedPlayers = [];
                let notMatchedPlayers = [];

                if (remainingSlots > 0 && matchedEdge) {
                    matchedPlayers = players.slice(0, Math.min(remainingSlots, players.length));
                    const currentUserIds = currentHappenedUsers.map(user => user.userId.toString());
                    const newMatchedUserIds = matchedPlayers.map(p => p._id.toString());
                    const updatedHappenedUserIds = [...new Set([...currentUserIds, ...newMatchedUserIds])];
                    const updatedHappenedUsers = updatedHappenedUserIds.map(userId => ({ userId }));

                    await models_1.JourneyNodes.updateOne(
                        { _id: node._id },
                        { $set: { happenedUsers: updatedHappenedUsers } }
                    );
                    await redis_1.setToCache(nodeCacheKey, { ...nodeData, happenedUsers: updatedHappenedUsers }, 3600);
                    console.log(`Limit node ${node.id}: Added ${matchedPlayers.length} matched players`);
                }

                if (notMatchedEdge) {
                    notMatchedPlayers = players.slice(matchedPlayers.length);
                    console.log(`Limit node ${node.id}: ${notMatchedPlayers.length} not matched players`);
                }

                try {
                    const statsCacheKey = `journeyStats:${campaignId}:${node.id}`;
                    let currentStats = await redis_1.getFromCache(statsCacheKey);
                    if (!currentStats) {
                        console.log(`Cache miss for ${statsCacheKey}. Fetching from DB...`);
                        currentStats = await models_1.JourneyStats.findOne({ campaignId }).select('nodes').lean() || { nodes: {} };
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Cached currentStats for ${statsCacheKey}`);
                    }
                    const nodeStats = currentStats.nodes[node.id] || { type: 'limit', stats: {} };

                    let newMatchedUsers = [];
                    let newNotMatchedUsers = [];

                    if (matchedPlayers.length > 0) {
                        const existingMatchedUsers = nodeStats.stats.Matched?.users.map(u => u.userId.toString()) || [];
                        newMatchedUsers = matchedPlayers.map(p => p._id.toString()).filter(id => !existingMatchedUsers.includes(id));
                        const newMatchedUserEntries = newMatchedUsers.map(userId => ({ userId, completionDate: now }));

                        nodeStats.stats.Matched = {
                            count: (nodeStats.stats.Matched?.count || 0) + newMatchedUsers.length,
                            users: [...(nodeStats.stats.Matched?.users || []), ...newMatchedUserEntries]
                        };
                        console.log(`Limit node ${node.id}: ${newMatchedUsers.length} new matched users`);
                    }

                    if (notMatchedPlayers.length > 0) {
                        const existingNotMatchedUsers = nodeStats.stats['Not Matched']?.users.map(u => u.userId.toString()) || [];
                        newNotMatchedUsers = notMatchedPlayers.map(p => p._id.toString()).filter(id => !existingNotMatchedUsers.includes(id));
                        const newNotMatchedUserEntries = newNotMatchedUsers.map(userId => ({ userId, completionDate: now }));

                        nodeStats.stats['Not Matched'] = {
                            count: (nodeStats.stats['Not Matched']?.count || 0) + newNotMatchedUsers.length,
                            users: [...(nodeStats.stats['Not Matched']?.users || []), ...newNotMatchedUserEntries]
                        };
                        console.log(`Limit node ${node.id}: ${newNotMatchedUsers.length} new not matched users`);
                    }

                    currentStats.nodes[node.id] = nodeStats;

                    const updateResult = await models_1.JourneyStats.updateOne(
                        { campaignId },
                        { $set: { nodes: currentStats.nodes } },
                        { upsert: true }
                    );
                    if (updateResult.modifiedCount > 0) {
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Updated JourneyStats for limit node ${node.id}`);
                        if (newMatchedUsers.length > 0) {
                            await redis_1.delFromCache(`processedPlayers:${campaignId}:${node.id}:Matched`);
                        }
                        if (newNotMatchedUsers.length > 0) {
                            await redis_1.delFromCache(`processedPlayers:${campaignId}:${node.id}:Not Matched`);
                        }
                    }
                } catch (error) {
                    console.error(`Failed to update JourneyStats for limit node ${node.id}:`, error);
                }

                if (matchedEdge && matchedPlayers.length > 0) {
                    const nextNode = nodes.find(n => n.id === matchedEdge.to);
                    if (nextNode) {
                        nodesToProcess.push({ node: nextNode, players: matchedPlayers });
                        console.log(`Pushing matched players to node ${nextNode.id} for limit node ${node.id}`);
                    }
                }

                if (notMatchedEdge && notMatchedPlayers.length > 0) {
                    const nextNode = nodes.find(n => n.id === notMatchedEdge.to);
                    if (nextNode) {
                        nodesToProcess.push({ node: nextNode, players: notMatchedPlayers });
                        console.log(`Pushing not matched players to node ${nextNode.id} for limit node ${node.id}`);
                    }
                }
            }

            if (node.type === 'add_points') {
                console.log(`Processing add_points node ${node.id}`);
                if (!lastDate) {
                    console.log(`No lastDate for add_points node ${node.id}. Skipping...`);
                    continue;
                }

                const unprocessedPlayers = await filterProcessedPlayers(players, node.id, 'default');
                console.log(`Add_points node ${node.id}: ${unprocessedPlayers.length} unprocessed players`);
                if (unprocessedPlayers.length === 0) {
                    console.log(`All players already processed for add_points node ${node.id}. Skipping...`);
                    const nextNodeIds = edges.filter(e => e.from === node.id).map(e => e.to);
                    const nextNodes = nextNodeIds.map(id => {
                        const nextNode = nodes.find(n => n.id === id);
                        return nextNode ? { node: nextNode, players } : null;
                    }).filter(item => item !== null);
                    console.log(`Pushing ${nextNodes.length} next nodes for add_points node ${node.id}`);
                    nodesToProcess.push(...nextNodes);
                    continue;
                }

                const { points } = node.node.data;
                const pointsToAdd = Number(points) || 0;
                console.log(`Add_points node ${node.id}: Adding ${pointsToAdd} points`);

                await Promise.all(unprocessedPlayers.map(async (player) => {
                    const userCacheKey = `user:${player._id}`;
                    let user = await redis_1.getFromCache(userCacheKey);
                    if (!user) {
                        console.log(`Cache miss for ${userCacheKey}. Fetching from DB...`);
                        user = await models_1.Users.findById(player._id).select('point').lean();
                        if (user) {
                            await redis_1.setToCache(userCacheKey, user, 300);
                            console.log(`Cached user ${player._id}`);
                        }
                    }
                    const currentPoints = user ? user.point || 0 : 0;

                    await models_1.Users.findByIdAndUpdate(player._id, {
                        $inc: { point: pointsToAdd }
                    });

                    const updatedUser = await models_1.Users.findById(player._id).select('point').lean();
                    if (updatedUser) {
                        await redis_1.setToCache(userCacheKey, updatedUser, 300);
                        console.log(`Updated points for user ${player._id}: ${updatedUser.point}`);
                    }
                }));

                try {
                    const statsCacheKey = `journeyStats:${campaignId}:${node.id}`;
                    let currentStats = await redis_1.getFromCache(statsCacheKey);
                    if (!currentStats) {
                        console.log(`Cache miss for ${statsCacheKey}. Fetching from DB...`);
                        currentStats = await models_1.JourneyStats.findOne({ campaignId }).select('nodes').lean() || { nodes: {} };
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Cached currentStats for ${statsCacheKey}`);
                    }
                    const nodeStats = currentStats.nodes[node.id] || { type: 'add_points', stats: {} };

                    const existingUsers = nodeStats.stats.default?.users.map(u => u.userId.toString()) || [];
                    const newUsers = unprocessedPlayers.map(p => p._id.toString()).filter(id => !existingUsers.includes(id));
                    const newUserEntries = newUsers.map(userId => ({ userId, completionDate: now }));
                    console.log(`Add_points node ${node.id}: ${newUsers.length} new users`);

                    nodeStats.stats.default = {
                        count: (nodeStats.stats.default?.count || 0) + newUsers.length,
                        users: [...(nodeStats.stats.default?.users || []), ...newUserEntries]
                    };
                    currentStats.nodes[node.id] = nodeStats;

                    const updateResult = await models_1.JourneyStats.updateOne(
                        { campaignId },
                        { $set: { nodes: currentStats.nodes } },
                        { upsert: true }
                    );
                    if (updateResult.modifiedCount > 0) {
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Updated JourneyStats for add_points node ${node.id}`);
                        await redis_1.delFromCache(`processedPlayers:${campaignId}:${node.id}:default`);
                        console.log(`Invalidated processedPlayers cache for add_points node ${node.id}`);
                    }
                } catch (error) {
                    console.error(`Failed to update JourneyStats for add_points node ${node.id}:`, error);
                }

                await models_1.JourneyNodes.updateOne(
                    { _id: node._id },
                    { $set: { date: now } }
                );
                await redis_1.setToCache(`journeyNode:${node._id}`, { ...node, date: now }, 3600);
                console.log(`Updated node ${node.id} date to ${now}`);

                const nextNodeIds = edges.filter(e => e.from === node.id).map(e => e.to);
                const nextNodes = nextNodeIds.map(id => {
                    const nextNode = nodes.find(n => n.id === id);
                    return nextNode ? { node: nextNode, players: unprocessedPlayers } : null;
                }).filter(item => item !== null);
                console.log(`Pushing ${nextNodes.length} next nodes for add_points node ${node.id} with ${unprocessedPlayers.length} players`);
                nodesToProcess.push(...nextNodes);
            }

            if (node.type === 'add_bonus') {
                console.log(`Processing add_bonus node ${node.id}`);
                const bonusId = node.node.data.bonus;
                if (!bonusId) {
                    console.error(`No bonus ID provided in node ${node.id} data. Skipping...`);
                    continue;
                }

                const unprocessedPlayers = await filterProcessedPlayers(players, node.id, 'default');
                console.log(`Add_bonus node ${node.id}: ${unprocessedPlayers.length} unprocessed players`);
                if (unprocessedPlayers.length === 0) {
                    console.log(`All players already processed for add_bonus node ${node.id}. Skipping...`);
                    const nextEdges = edges.filter(e => e.from === node.id);
                    console.log(`Add_bonus node ${node.id}: ${nextEdges.length} next edges`);
                    if (nextEdges.length > 0) {
                        const nextNodeIds = nextEdges.map(e => e.to);
                        const nextNodes = nextNodeIds.map(id => {
                            const nextNode = nodes.find(n => n.id === id);
                            return nextNode ? { node: nextNode, players } : null;
                        }).filter(item => item !== null);
                        console.log(`Pushing ${nextNodes.length} next nodes for add_bonus node ${node.id}`);
                        nodesToProcess.push(...nextNodes);
                    } else {
                        console.log(`No next nodes found for add_bonus ${node.id}. Stopping here.`);
                    }
                    continue;
                }

                await Promise.all(unprocessedPlayers.map(async (player) => {
                    try {
                        const userId = player._id.toString();
                        const req = { body: { bonus: bonusId, userId } };
                        let resStatus = 200;
                        let resData = null;

                        const res = {
                            status: (code) => {
                                resStatus = code;
                                return {
                                    json: (data) => {
                                        resData = data;
                                    }
                                };
                            },
                            json: (data) => {
                                resData = data;
                            }
                        };

                        await bonus_1.addBonus(req, res);
                        console.log(`Added bonus ${bonusId} to user ${userId}`);
                    } catch (error) {
                        console.error(`Error adding bonus ${bonusId} to user ${player._id.toString()}:`, error);
                    }
                }));

                try {
                    const statsCacheKey = `journeyStats:${campaignId}:${node.id}`;
                    let currentStats = await redis_1.getFromCache(statsCacheKey);
                    if (!currentStats) {
                        console.log(`Cache miss for ${statsCacheKey}. Fetching from DB...`);
                        currentStats = await models_1.JourneyStats.findOne({ campaignId }).select('nodes').lean() || { nodes: {} };
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Cached currentStats for ${statsCacheKey}`);
                    }
                    const nodeStats = currentStats.nodes[node.id] || { type: 'add_bonus', stats: {} };

                    const existingUsers = nodeStats.stats.default?.users.map(u => u.userId.toString()) || [];
                    const newUsers = unprocessedPlayers.map(p => p._id.toString()).filter(id => !existingUsers.includes(id));
                    const newUserEntries = newUsers.map(userId => ({ userId, completionDate: now }));
                    console.log(`Add_bonus node ${node.id}: ${newUsers.length} new users`);

                    nodeStats.stats.default = {
                        count: (nodeStats.stats.default?.count || 0) + newUsers.length,
                        users: [...(nodeStats.stats.default?.users || []), ...newUserEntries]
                    };
                    currentStats.nodes[node.id] = nodeStats;

                    const updateResult = await models_1.JourneyStats.updateOne(
                        { campaignId },
                        { $set: { nodes: currentStats.nodes } },
                        { upsert: true }
                    );
                    if (updateResult.modifiedCount > 0) {
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Updated JourneyStats for add_bonus node ${node.id}`);
                        await redis_1.delFromCache(`processedPlayers:${campaignId}:${node.id}:default`);
                        console.log(`Invalidated processedPlayers cache for add_bonus node ${node.id}`);
                    }
                } catch (error) {
                    console.error(`Failed to update JourneyStats for add_bonus node ${node.id}:`, error);
                }

                await models_1.JourneyNodes.updateOne(
                    { _id: node._id },
                    { $set: { date: now } }
                );
                await redis_1.setToCache(`journeyNode:${node._id}`, { ...node, date: now }, 3600);
                console.log(`Updated node ${node.id} date to ${now}`);

                const nextEdges = edges.filter(e => e.from === node.id);
                console.log(`Add_bonus node ${node.id}: ${nextEdges.length} next edges`);
                if (nextEdges.length > 0) {
                    const nextNodeIds = nextEdges.map(e => e.to);
                    const nextNodes = nextNodeIds.map(id => {
                        const nextNode = nodes.find(n => n.id === id);
                        return nextNode ? { node: nextNode, players: unprocessedPlayers } : null;
                    }).filter(item => item !== null);
                    console.log(`Pushing ${nextNodes.length} next nodes for add_bonus node ${node.id} with ${unprocessedPlayers.length} players`);
                    nodesToProcess.push(...nextNodes);
                }
            }

            if (node.type === 'give_mini_game') {
                console.log(`Processing give_mini_game node ${node.id}`);
                const unprocessedPlayers = await filterProcessedPlayers(players, node.id, 'default');
                console.log(`Give_mini_game node ${node.id}: ${unprocessedPlayers.length} unprocessed players`);
                if (unprocessedPlayers.length === 0) {
                    console.log(`All players already processed for give_mini_game node ${node.id}. Skipping...`);
                    continue;
                }

                try {
                    const playerIds = unprocessedPlayers.map((p) => String(p._id));
                    io.emit('journey_command', {
                        type: 'give_mini_game',
                        players: playerIds,
                        payload: { journey: true }
                    });
                    console.log(`Sent give_mini_game command for node ${node.id} with ${playerIds.length} players`);

                    const statsCacheKey = `journeyStats:${campaignId}:${node.id}`;
                    let currentStats = await redis_1.getFromCache(statsCacheKey);
                    if (!currentStats) {
                        console.log(`Cache miss for ${statsCacheKey}. Fetching from DB...`);
                        currentStats = await models_1.JourneyStats.findOne({ campaignId }).select('nodes').lean() || { nodes: {} };
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Cached currentStats for ${statsCacheKey}`);
                    }
                    const nodeStats = currentStats.nodes[node.id] || { type: 'give_mini_game', stats: {} };

                    const existingUsers = nodeStats.stats.default?.users.map(u => u.userId.toString()) || [];
                    const newUsers = unprocessedPlayers.map(p => p._id.toString()).filter(id => !existingUsers.includes(id));
                    const newUserEntries = newUsers.map(userId => ({ userId, completionDate: now }));
                    console.log(`Give_mini_game node ${node.id}: ${newUsers.length} new users`);

                    nodeStats.stats.default = {
                        count: (nodeStats.stats.default?.count || 0) + newUsers.length,
                        users: [...(nodeStats.stats.default?.users || []), ...newUserEntries]
                    };
                    currentStats.nodes[node.id] = nodeStats;

                    const updateResult = await models_1.JourneyStats.updateOne(
                        { campaignId },
                        { $set: { nodes: currentStats.nodes } },
                        { upsert: true }
                    );
                    if (updateResult.modifiedCount > 0) {
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Updated JourneyStats for give_mini_game node ${node.id}`);
                    }

                    const cacheKey = `processedPlayers:${campaignId}:${node.id}:default`;
                    const updatedProcessedUsers = [...existingUsers, ...newUsers];
                    await redis_1.setToCache(cacheKey, updatedProcessedUsers, 300);
                    console.log(`Updated cache for ${cacheKey}: ${updatedProcessedUsers.length} users`);
                } catch (error) {
                    console.error(`Failed to send give_mini_game command or update JourneyStats for node ${node.id}:`, error);
                    continue;
                }

                await models_1.JourneyNodes.updateOne(
                    { _id: node._id },
                    { $set: { date: now } }
                );
                await redis_1.setToCache(`journeyNode:${node._id}`, { ...node, date: now }, 3600);
                console.log(`Updated node ${node.id} date to ${now}`);

                const nextNodeIds = edges.filter(e => e.from === node.id).map(e => e.to);
                const nextNodes = nextNodeIds.map(id => {
                    const nextNode = nodes.find(n => n.id === id);
                    return nextNode ? { node: nextNode, players: unprocessedPlayers } : null;
                }).filter(item => item !== null);
                console.log(`Pushing ${nextNodes.length} next nodes for give_mini_game node ${node.id} with ${unprocessedPlayers.length} players`);
                nodesToProcess.push(...nextNodes);
            }

            if (node.type === 'email') {
                console.log(`Processing email node ${node.id}`);
                const toPlayers = players.filter(p => p.email).map(p => ({ _id: p._id, email: p.email }));
                console.log(`Email node ${node.id}: ${toPlayers.length} players with email`);
                if (!toPlayers.length) {
                    console.log(`No players with email for node ${node.id}. Skipping...`);
                    continue;
                }

                const unprocessedPlayers = await filterProcessedPlayers(players, node.id, 'sent');
                console.log(`Email node ${node.id}: ${unprocessedPlayers.length} unprocessed players`);
                if (unprocessedPlayers.length === 0) {
                    console.log(`All players already processed for email node ${node.id}. Skipping...`);
                    const nextEdges = edges.filter(e => e.from === node.id);
                    const sentEdge = nextEdges.find(e => e.label === 'sent');
                    const deliveredEdge = nextEdges.find(e => e.label === 'delivered');
                    const failedEdge = nextEdges.find(e => e.label === 'failed');
                    console.log(`Email node ${node.id}: ${nextEdges.length} next edges (sent=${!!sentEdge}, delivered=${!!deliveredEdge}, failed=${!!failedEdge})`);

                    if (sentEdge) {
                        const sentNode = nodes.find(n => n.id === sentEdge.to);
                        if (sentNode) {
                            nodesToProcess.push({ node: sentNode, players });
                            console.log(`Pushing sent players to node ${sentNode.id} for email node ${node.id}`);
                        }
                    }

                    if (deliveredEdge) {
                        const deliveredNode = nodes.find(n => n.id === deliveredEdge.to);
                        if (deliveredNode) {
                            nodesToProcess.push({ node: deliveredNode, players });
                            console.log(`Pushing delivered players to node ${deliveredNode.id} for email node ${node.id}`);
                        }
                    }

                    if (failedEdge) {
                        const failedNode = nodes.find(n => n.id === failedEdge.to);
                        if (failedNode) {
                            nodesToProcess.push({ node: failedNode, players: [] });
                            console.log(`Pushing failed players to node ${failedNode.id} for email node ${node.id}`);
                        }
                    }
                    continue;
                }

                const unprocessedToPlayers = unprocessedPlayers.filter(p => p.email).map(p => ({ _id: p._id, email: p.email }));
                console.log(`Email node ${node.id}: ${unprocessedToPlayers.length} unprocessed players with email`);

                const playerChunks = base_1.chunkArray(unprocessedToPlayers.map(p => p.email), 1000);
                const sentPlayers = [];
                const failedPlayers = [];

                for (const chunk of playerChunks) {
                    const { sent, failed } = await sendJourneyEmail(chunk, node);
                    sentPlayers.push(...unprocessedToPlayers.filter(p => sent.includes(p.email)));
                    failedPlayers.push(...unprocessedToPlayers.filter(p => failed.includes(p.email)));
                    console.log(`Email node ${node.id}: Sent to ${sent.length} players, failed for ${failed.length} players`);
                }

                try {
                    const statsCacheKey = `journeyStats:${campaignId}:${node.id}`;
                    let currentStats = await redis_1.getFromCache(statsCacheKey);
                    if (!currentStats) {
                        console.log(`Cache miss for ${statsCacheKey}. Fetching from DB...`);
                        currentStats = await models_1.JourneyStats.findOne({ campaignId }).select('nodes').lean() || { nodes: {} };
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Cached currentStats for ${statsCacheKey}`);
                    }
                    const nodeStats = currentStats.nodes[node.id] || { type: 'email', stats: {} };

                    const existingSentUsers = nodeStats.stats.sent?.users.map(u => u.userId.toString()) || [];
                    const newSentUsers = sentPlayers.map(p => p._id.toString()).filter(id => !existingSentUsers.includes(id));
                    const newSentUserEntries = newSentUsers.map(userId => ({ userId, completionDate: now }));
                    console.log(`Email node ${node.id}: ${newSentUsers.length} new sent users`);

                    nodeStats.stats.sent = {
                        count: (nodeStats.stats.sent?.count || 0) + newSentUsers.length,
                        users: [...(nodeStats.stats.sent?.users || []), ...newSentUserEntries]
                    };

                    const existingFailedUsers = nodeStats.stats.failed?.users.map(u => u.userId.toString()) || [];
                    const newFailedUsers = failedPlayers.map(p => p._id.toString()).filter(id => !existingFailedUsers.includes(id));
                    const newFailedUserEntries = newFailedUsers.map(userId => ({ userId, completionDate: now }));
                    console.log(`Email node ${node.id}: ${newFailedUsers.length} new failed users`);

                    nodeStats.stats.failed = {
                        count: (nodeStats.stats.failed?.count || 0) + newFailedUsers.length,
                        users: [...(nodeStats.stats.failed?.users || []), ...newFailedUserEntries]
                    };

                    const existingDeliveredUsers = nodeStats.stats.delivered?.users.map(u => u.userId.toString()) || [];
                    const newDeliveredUsers = sentPlayers.map(p => p._id.toString()).filter(id => !existingDeliveredUsers.includes(id));
                    const newDeliveredUserEntries = newDeliveredUsers.map(userId => ({ userId, completionDate: now }));
                    console.log(`Email node ${node.id}: ${newDeliveredUsers.length} new delivered users`);

                    nodeStats.stats.delivered = {
                        count: (nodeStats.stats.delivered?.count || 0) + newDeliveredUsers.length,
                        users: [...(nodeStats.stats.delivered?.users || []), ...newDeliveredUserEntries]
                    };

                    currentStats.nodes[node.id] = nodeStats;

                    const updateResult = await models_1.JourneyStats.updateOne(
                        { campaignId },
                        { $set: { nodes: currentStats.nodes } },
                        { upsert: true }
                    );
                    if (updateResult.modifiedCount > 0) {
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Updated JourneyStats for email node ${node.id}`);
                        await redis_1.delFromCache(`processedPlayers:${campaignId}:${node.id}:sent`);
                        await redis_1.delFromCache(`processedPlayers:${campaignId}:${node.id}:failed`);
                        await redis_1.delFromCache(`processedPlayers:${campaignId}:${node.id}:delivered`);
                        console.log(`Invalidated processedPlayers caches for email node ${node.id}`);
                    }
                } catch (error) {
                    console.error(`Failed to update JourneyStats for email node ${node.id}:`, error);
                }

                const nextEdges = edges.filter(e => e.from === node.id);
                const sentEdge = nextEdges.find(e => e.label === 'sent');
                const deliveredEdge = nextEdges.find(e => e.label === 'delivered');
                const failedEdge = nextEdges.find(e => e.label === 'failed');
                console.log(`Email node ${node.id}: ${nextEdges.length} next edges (sent=${!!sentEdge}, delivered=${!!deliveredEdge}, failed=${!!failedEdge})`);

                if (sentEdge && sentPlayers.length > 0) {
                    const sentNode = nodes.find(n => n.id === sentEdge.to);
                    if (sentNode) {
                        nodesToProcess.push({ node: sentNode, players: sentPlayers });
                        console.log(`Pushing ${sentPlayers.length} sent players to node ${sentNode.id} for email node ${node.id}`);
                    }
                }

                if (deliveredEdge && sentPlayers.length > 0) {
                    const deliveredNode = nodes.find(n => n.id === deliveredEdge.to);
                    if (deliveredNode) {
                        nodesToProcess.push({ node: deliveredNode, players: sentPlayers });
                        console.log(`Pushing ${sentPlayers.length} delivered players to node ${deliveredNode.id} for email node ${node.id}`);
                    }
                }

                if (failedEdge && failedPlayers.length > 0) {
                    const failedNode = nodes.find(n => n.id === failedEdge.to);
                    if (failedNode) {
                        nodesToProcess.push({ node: failedNode, players: failedPlayers });
                        console.log(`Pushing ${failedPlayers.length} failed players to node ${failedNode.id} for email node ${node.id}`);
                    }
                }
            }

            if (node.type === 'sms') {
                console.log(`Processing sms node ${node.id}`);
                const toPlayers = players.filter(p => p.phone).map(p => ({ _id: p._id, phone: p.phone }));
                console.log(`Sms node ${node.id}: ${toPlayers.length} players with phone`);
                if (!toPlayers.length) {
                    console.log(`No players with phone for node ${node.id}. Skipping...`);
                    continue;
                }

                const unprocessedPlayers = await filterProcessedPlayers(players, node.id, 'sent');
                console.log(`Sms node ${node.id}: ${unprocessedPlayers.length} unprocessed players`);
                if (unprocessedPlayers.length === 0) {
                    console.log(`All players already processed for sms node ${node.id}. Skipping...`);
                    const nextEdges = edges.filter(e => e.from === node.id);
                    const sentEdge = nextEdges.find(e => e.label === 'sent');
                    const deliveredEdge = nextEdges.find(e => e.label === 'delivered');
                    const failedEdge = nextEdges.find(e => e.label === 'failed');
                    console.log(`Sms node ${node.id}: ${nextEdges.length} next edges (sent=${!!sentEdge}, delivered=${!!deliveredEdge}, failed=${!!failedEdge})`);

                    if (sentEdge) {
                        const sentNode = nodes.find(n => n.id === sentEdge.to);
                        if (sentNode) {
                            nodesToProcess.push({ node: sentNode, players });
                            console.log(`Pushing sent players to node ${sentNode.id} for sms node ${node.id}`);
                        }
                    }

                    if (deliveredEdge) {
                        const deliveredNode = nodes.find(n => n.id === deliveredEdge.to);
                        if (deliveredNode) {
                            nodesToProcess.push({ node: deliveredNode, players });
                            console.log(`Pushing delivered players to node ${deliveredNode.id} for sms node ${node.id}`);
                        }
                    }

                    if (failedEdge) {
                        const failedNode = nodes.find(n => n.id === failedEdge.to);
                        if (failedNode) {
                            nodesToProcess.push({ node: failedNode, players: [] });
                            console.log(`Pushing failed players to node ${failedNode.id} for sms node ${node.id}`);
                        }
                    }
                    continue;
                }

                const unprocessedToPlayers = unprocessedPlayers.filter(p => p.phone).map(p => ({ _id: p._id, phone: p.phone }));
                console.log(`Sms node ${node.id}: ${unprocessedToPlayers.length} unprocessed players with phone`);

                const uniquePhones = [...new Set(unprocessedToPlayers.map(p => p.phone))];
                const { sent, failed } = await sendJourneySms(uniquePhones, node);
                const sentPlayers = unprocessedToPlayers.filter(p => sent.includes(p.phone));
                const failedPlayers = unprocessedToPlayers.filter(p => failed.includes(p.phone));
                console.log(`Sms node ${node.id}: Sent to ${sent.length} players, failed for ${failed.length} players`);

                try {
                    const statsCacheKey = `journeyStats:${campaignId}:${node.id}`;
                    let currentStats = await redis_1.getFromCache(statsCacheKey);
                    if (!currentStats) {
                        console.log(`Cache miss for ${statsCacheKey}. Fetching from DB...`);
                        currentStats = await models_1.JourneyStats.findOne({ campaignId }).select('nodes').lean() || { nodes: {} };
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Cached currentStats for ${statsCacheKey}`);
                    }
                    const nodeStats = currentStats.nodes[node.id] || { type: 'sms', stats: {} };

                    const existingSentUsers = nodeStats.stats.sent?.users.map(u => u.userId.toString()) || [];
                    const newSentUsers = sentPlayers.map(p => p._id.toString()).filter(id => !existingSentUsers.includes(id));
                    const newSentUserEntries = newSentUsers.map(userId => ({ userId, completionDate: now }));
                    console.log(`Sms node ${node.id}: ${newSentUsers.length} new sent users`);

                    nodeStats.stats.sent = {
                        count: (nodeStats.stats.sent?.count || 0) + newSentUsers.length,
                        users: [...(nodeStats.stats.sent?.users || []), ...newSentUserEntries]
                    };

                    const existingFailedUsers = nodeStats.stats.failed?.users.map(u => u.userId.toString()) || [];
                    const newFailedUsers = failedPlayers.map(p => p._id.toString()).filter(id => !existingFailedUsers.includes(id));
                    const newFailedUserEntries = newFailedUsers.map(userId => ({ userId, completionDate: now }));
                    console.log(`Sms node ${node.id}: ${newFailedUsers.length} new failed users`);

                    nodeStats.stats.failed = {
                        count: (nodeStats.stats.failed?.count || 0) + newFailedUsers.length,
                        users: [...(nodeStats.stats.failed?.users || []), ...newFailedUserEntries]
                    };

                    const existingDeliveredUsers = nodeStats.stats.delivered?.users.map(u => u.userId.toString()) || [];
                    const newDeliveredUsers = sentPlayers.map(p => p._id.toString()).filter(id => !existingDeliveredUsers.includes(id));
                    const newDeliveredUserEntries = newDeliveredUsers.map(userId => ({ userId, completionDate: now }));
                    console.log(`Sms node ${node.id}: ${newDeliveredUsers.length} new delivered users`);

                    nodeStats.stats.delivered = {
                        count: (nodeStats.stats.delivered?.count || 0) + newDeliveredUsers.length,
                        users: [...(nodeStats.stats.delivered?.users || []), ...newDeliveredUserEntries]
                    };

                    currentStats.nodes[node.id] = nodeStats;

                    const updateResult = await models_1.JourneyStats.updateOne(
                        { campaignId },
                        { $set: { nodes: currentStats.nodes } },
                        { upsert: true }
                    );
                    if (updateResult.modifiedCount > 0) {
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Updated JourneyStats for sms node ${node.id}`);
                        await redis_1.delFromCache(`processedPlayers:${campaignId}:${node.id}:sent`);
                        await redis_1.delFromCache(`processedPlayers:${campaignId}:${node.id}:failed`);
                        await redis_1.delFromCache(`processedPlayers:${campaignId}:${node.id}:delivered`);
                        console.log(`Invalidated processedPlayers caches for sms node ${node.id}`);
                    }
                } catch (error) {
                    console.error(`Failed to update JourneyStats for sms node ${node.id}:`, error);
                }

                const nextEdges = edges.filter(e => e.from === node.id);
                const sentEdge = nextEdges.find(e => e.label === 'sent');
                const deliveredEdge = nextEdges.find(e => e.label === 'delivered');
                const failedEdge = nextEdges.find(e => e.label === 'failed');
                console.log(`Sms node ${node.id}: ${nextEdges.length} next edges (sent=${!!sentEdge}, delivered=${!!deliveredEdge}, failed=${!!failedEdge})`);

                if (sentEdge && sentPlayers.length > 0) {
                    const sentNode = nodes.find(n => n.id === sentEdge.to);
                    if (sentNode) {
                        nodesToProcess.push({ node: sentNode, players: sentPlayers });
                        console.log(`Pushing ${sentPlayers.length} sent players to node ${sentNode.id} for sms node ${node.id}`);
                    }
                }

                if (deliveredEdge && sentPlayers.length > 0) {
                    const deliveredNode = nodes.find(n => n.id === deliveredEdge.to);
                    if (deliveredNode) {
                        nodesToProcess.push({ node: deliveredNode, players: sentPlayers });
                        console.log(`Pushing ${sentPlayers.length} delivered players to node ${deliveredNode.id} for sms node ${node.id}`);
                    }
                }

                if (failedEdge && failedPlayers.length > 0) {
                    const failedNode = nodes.find(n => n.id === failedEdge.to);
                    if (failedNode) {
                        nodesToProcess.push({ node: failedNode, players: failedPlayers });
                        console.log(`Pushing ${failedPlayers.length} failed players to node ${failedNode.id} for sms node ${node.id}`);
                    }
                }
            }

            if (node.type === 'popup') {
                console.log(`Processing popup node ${node.id}`);
                const unprocessedPlayers = await filterProcessedPlayers(players, node.id, 'default');
                console.log(`Popup node ${node.id}: ${unprocessedPlayers.length} unprocessed players`);
                if (unprocessedPlayers.length === 0) {
                    console.log(`All players already processed for popup node ${node.id}. Skipping...`);
                    continue;
                }

                const { selectedbanner, popupMessage, note, funnelId, deliveryTimeout } = node.node.data;
                const bannerCacheKey = `marketingPopup:${selectedbanner}`;
                let banner = await redis_1.getFromCache(bannerCacheKey);
                if (!banner) {
                    console.log(`Cache miss for ${bannerCacheKey}. Fetching from DB...`);
                    banner = await models_1.MarketingPopup.findById(selectedbanner).select('banner link').lean();
                    if (banner) {
                        await redis_1.setToCache(bannerCacheKey, banner, 3600);
                        console.log(`Cached banner for ${bannerCacheKey}`);
                    }
                }
                if (!banner) {
                    console.error(`Banner ${selectedbanner} not found for popup node ${node.id}. Skipping...`);
                    continue;
                }
                const param = {
                    popupMessage,
                    note,
                    deliveryTimeout,
                    banner: banner.banner,
                    link: banner.link
                };

                try {
                    const playerIds = unprocessedPlayers.map((p) => String(p._id));
                    io.emit('journey_command', {
                        type: 'popup',
                        players: playerIds,
                        payload: param
                    });
                    console.log(`Sent popup command for node ${node.id} with ${playerIds.length} players:`, param);

                    const statsCacheKey = `journeyStats:${campaignId}:${node.id}`;
                    let currentStats = await redis_1.getFromCache(statsCacheKey);
                    if (!currentStats) {
                        console.log(`Cache miss for ${statsCacheKey}. Fetching from DB...`);
                        currentStats = await models_1.JourneyStats.findOne({ campaignId }).select('nodes').lean() || { nodes: {} };
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Cached currentStats for ${statsCacheKey}`);
                    }
                    const nodeStats = currentStats.nodes[node.id] || { type: 'popup', stats: {} };

                    const existingUsers = nodeStats.stats.default?.users.map(u => u.userId.toString()) || [];
                    const newUsers = unprocessedPlayers.map(p => p._id.toString()).filter(id => !existingUsers.includes(id));
                    const newUserEntries = newUsers.map(userId => ({ userId, completionDate: now }));
                    console.log(`Popup node ${node.id}: ${newUsers.length} new users`);

                    nodeStats.stats.default = {
                        count: (nodeStats.stats.default?.count || 0) + newUsers.length,
                        users: [...(nodeStats.stats.default?.users || []), ...newUserEntries]
                    };
                    currentStats.nodes[node.id] = nodeStats;

                    const updateResult = await models_1.JourneyStats.updateOne(
                        { campaignId },
                        { $set: { nodes: currentStats.nodes } },
                        { upsert: true }
                    );
                    if (updateResult.modifiedCount > 0) {
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Updated JourneyStats for popup node ${node.id}`);
                    }

                    const cacheKey = `processedPlayers:${campaignId}:${node.id}:default`;
                    const updatedProcessedUsers = [...existingUsers, ...newUsers];
                    await redis_1.setToCache(cacheKey, updatedProcessedUsers, 300);
                    console.log(`Updated cache for ${cacheKey}: ${updatedProcessedUsers.length} users`);
                } catch (error) {
                    console.error(`Failed to send popup command or update JourneyStats for node ${node.id}:`, error);
                    continue;
                }

                await models_1.JourneyNodes.updateOne(
                    { _id: node._id },
                    { $set: { date: now } }
                );
                await redis_1.setToCache(`journeyNode:${node._id}`, { ...node, date: now }, 3600);
                console.log(`Updated node ${node.id} date to ${now}`);

                const nextEdges = edges.filter(e => e.from === node.id);
                const defaultEdge = nextEdges.find(e => e.label === 'default');
                if (defaultEdge && unprocessedPlayers.length > 0) {
                    const nextNode = nodes.find(n => n.id === defaultEdge.to);
                    if (nextNode) {
                        nodesToProcess.push({ node: nextNode, players: unprocessedPlayers });
                        console.log(`Pushing ${unprocessedPlayers.length} players to node ${nextNode.id} for popup node ${node.id}`);
                    }
                } else {
                    const nextNodeIds = nextEdges.map(e => e.to);
                    const nextNodes = nextNodeIds.map(id => {
                        const nextNode = nodes.find(n => n.id === id);
                        return nextNode ? { node: nextNode, players: unprocessedPlayers } : null;
                    }).filter(item => item !== null);
                    console.log(`Pushing ${nextNodes.length} next nodes for popup node ${node.id} with ${unprocessedPlayers.length} players`);
                    nodesToProcess.push(...nextNodes);
                }
            }

            if (node.type === 'stop_campaign') {
                console.log(`Processing stop_campaign node ${node.id}`);
                const playerIds = players.map(p => p._id);
                const { unit, value } = journey.campaignDuration || { unit: 'hours', value: '24' };
                const durationInMs = calculateDurationInMs(unit, value);
                console.log(`Stop_campaign node ${node.id}: duration=${value} ${unit}, durationInMs=${durationInMs}`);

                const currentActiveJourneyUsers = Array.isArray(journey.activeJourneys)
                    ? new Set(journey.activeJourneys.map(j => j.userId.toString()))
                    : new Set();
                const newActiveJourneys = playerIds
                    .filter(id => !currentActiveJourneyUsers.has(id.toString()))
                    .map(userId => ({
                        userId,
                        startTime: now,
                        durationEndTime: new Date(now.getTime() + durationInMs)
                    }));
                console.log(`Stop_campaign node ${node.id}: ${newActiveJourneys.length} new active journeys`);

                try {
                    await models_1.Journeys.updateOne(
                        { _id: campaignId },
                        {
                            $addToSet: { completedUsers: { $each: playerIds } },
                            $push: { activeJourneys: { $each: newActiveJourneys } }
                        }
                    );
                    console.log(`Updated journey ${campaignId} with ${playerIds.length} completed users`);

                    const currentCompletedUsers = Array.isArray(journey.completedUsers) ? journey.completedUsers : [];
                    const currentActiveJourneys = Array.isArray(journey.activeJourneys) ? journey.activeJourneys : [];
                    await redis_1.setToCache(journeyCacheKey, {
                        ...journey,
                        completedUsers: [...currentCompletedUsers, ...playerIds],
                        activeJourneys: [...currentActiveJourneys, ...newActiveJourneys]
                    }, 3600);
                    console.log(`Updated cache for journey ${campaignId} with ${playerIds.length} completed users`);
                } catch (error) {
                    console.error(`Failed to update Journeys or cache for stop_campaign node ${node.id}:`, error);
                }

                try {
                    const statsCacheKey = `journeyStats:${campaignId}:${node.id}`;
                    let currentStats = await redis_1.getFromCache(statsCacheKey);
                    if (!currentStats) {
                        console.log(`Cache miss for ${statsCacheKey}. Fetching from DB...`);
                        currentStats = await models_1.JourneyStats.findOne({ campaignId }).select('nodes').lean() || { nodes: {} };
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Cached currentStats for ${statsCacheKey}`);
                    }
                    const nodeStats = currentStats.nodes[node.id] || { type: 'stop_campaign', stats: {} };

                    const existingUsers = nodeStats.stats.default?.users.map(u => u.userId.toString()) || [];
                    const newUsers = playerIds.map(id => id.toString()).filter(id => !existingUsers.includes(id));
                    const newUserEntries = newUsers.map(userId => ({ userId, completionDate: now }));
                    console.log(`Stop_campaign node ${node.id}: ${newUsers.length} new users`);

                    nodeStats.stats.default = {
                        count: (nodeStats.stats.default?.count || 0) + newUsers.length,
                        users: [...(nodeStats.stats.default?.users || []), ...newUserEntries]
                    };
                    currentStats.nodes[node.id] = nodeStats;

                    const updateResult = await models_1.JourneyStats.updateOne(
                        { campaignId },
                        { $set: { nodes: currentStats.nodes } },
                        { upsert: true }
                    );
                    if (updateResult.modifiedCount > 0) {
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Updated JourneyStats for stop_campaign node ${node.id}`);
                        await redis_1.delFromCache(`processedPlayers:${campaignId}:${node.id}:default`);
                        console.log(`Invalidated processedPlayers cache for stop_campaign node ${node.id}`);
                    }
                } catch (error) {
                    console.error(`Failed to update JourneyStats for stop_campaign node ${node.id}:`, error);
                }

                await models_1.JourneyNodes.updateOne(
                    { _id: node._id },
                    { $set: { date: now } }
                );
                await redis_1.setToCache(`journeyNode:${node._id}`, { ...node, date: now }, 3600);
                console.log(`Updated node ${node.id} date to ${now}`);

                const nextEdges = edges.filter(e => e.from === node.id);
                console.log(`Stop_campaign node ${node.id}: ${nextEdges.length} next edges`);
                if (nextEdges.length > 0) {
                    const nextNodeIds = nextEdges.map(e => e.to);
                    const nextNodes = nextNodeIds.map(id => {
                        const nextNode = nodes.find(n => n.id === id);
                        return nextNode ? { node: nextNode, players } : null;
                    }).filter(item => item !== null);
                    console.log(`Pushing ${nextNodes.length} next nodes for stop_campaign node ${node.id}`);
                    nodesToProcess.push(...nextNodes);
                } else {
                    console.log(`No next nodes after stop_campaign ${node.id}. Campaign fully completed.`);
                }
            }

            if (node.type === 'wait_for_event') {
                console.log(`Processing wait_for_event node ${node.id}`);
                const { eventToWait, maxTime, timeUnit, conditions } = node.node.data;
                if (!eventToWait || !maxTime || !timeUnit) {
                    console.error(`Invalid wait_for_event data for node ${node.id}: missing eventToWait, maxTime, or timeUnit`);
                    continue;
                }

                const maxTimeMs = calculateDelayInMs(timeUnit, maxTime);
                if (maxTimeMs <= 0) {
                    console.error(`Invalid maxTimeMs: ${maxTimeMs} for node ${node.id}. Skipping...`);
                    continue;
                }

                const nodeCacheKey = `journeyNode:${node._id}`;
                let nodeData = await redis_1.getFromCache(nodeCacheKey);
                if (!nodeData) {
                    console.log(`Cache miss for ${nodeCacheKey}. Fetching from DB...`);
                    nodeData = await models_1.JourneyNodes.findById(node._id).select('happenedUsers timeoutUsers stillWaitingUsers date lastCheckTime').lean();
                    if (nodeData) {
                        await redis_1.setToCache(nodeCacheKey, nodeData, 3600);
                        console.log(`Cached nodeData for ${nodeCacheKey}`);
                    }
                }
                if (!nodeData) {
                    console.error(`Node ${node.id} not found in JourneyNodes. Skipping...`);
                    continue;
                }

                let currentHappenedUsers = nodeData.happenedUsers || [];
                let currentTimeoutUsers = nodeData.timeoutUsers || [];
                let currentStillWaitingUsers = nodeData.stillWaitingUsers || [];
                let lastCheckTime = nodeData.lastCheckTime ? new Date(nodeData.lastCheckTime) : null;

                const unprocessedPlayers = players.filter(player => {
                    const playerId = player._id.toString();
                    const isHappened = currentHappenedUsers.some(entry => entry.userId.toString() === playerId);
                    const isTimeout = currentTimeoutUsers.some(entry => entry.userId.toString() === playerId);
                    const isStillWaiting = currentStillWaitingUsers.some(entry => entry.userId.toString() === playerId);
                    return !isHappened && !isTimeout && !isStillWaiting;
                });
                console.log(`Wait_for_event node ${node.id}: ${unprocessedPlayers.length} unprocessed players`);

                const MIN_CHECK_INTERVAL_MS = 1 * 60 * 1000;

                const shouldCheckOldWaiting = !lastCheckTime || (now.getTime() - lastCheckTime.getTime()) >= MIN_CHECK_INTERVAL_MS;

                const newPlayerTimings = unprocessedPlayers.map(player => ({
                    userId: player._id,
                    startTime: now,
                    deadline: new Date(now.getTime() + maxTimeMs)
                }));

                if (newPlayerTimings.length > 0) {
                    currentStillWaitingUsers = [...currentStillWaitingUsers, ...newPlayerTimings];
                    await models_1.JourneyNodes.updateOne({ _id: node._id }, { $set: { stillWaitingUsers: currentStillWaitingUsers } });
                    await redis_1.setToCache(nodeCacheKey, { ...nodeData, stillWaitingUsers: currentStillWaitingUsers }, 3600);
                    console.log(`Added ${newPlayerTimings.length} new players to stillWaitingUsers for wait_for_event node ${node.id}`);
                }

                let triggeredPlayers = [];
                let timedOutPlayers = [];
                let stillWaitingPlayers = [];

                if (unprocessedPlayers.length > 0) {
                    const batches = base_1.chunkArray(unprocessedPlayers, 100);
                    for (const batch of batches) {
                        const triggered = await triggersCheck(batch, eventToWait, campaignId, newPlayerTimings[0].startTime, newPlayerTimings[0].deadline);
                        triggeredPlayers = [...triggeredPlayers, ...triggered];
                        const notTriggered = batch.filter(p => !triggered.some(t => t._id.toString() === p._id.toString()));
                        stillWaitingPlayers = [...stillWaitingPlayers, ...notTriggered];
                    }
                }

                if (shouldCheckOldWaiting && currentStillWaitingUsers.length > 0) {
                    const timedOutTimings = [];
                    const waitingTimings = [];
                    currentStillWaitingUsers.forEach(timing => {
                        if (now >= new Date(timing.deadline)) {
                            timedOutTimings.push(timing);
                        } else {
                            waitingTimings.push(timing);
                        }
                    });

                    if (timedOutTimings.length > 0) {
                        const timedOutUserIds = timedOutTimings.map(t => t.userId);
                        const fetchedTimedOut = await models_1.Users.find({ _id: { $in: timedOutUserIds } }).lean();
                        timedOutPlayers = fetchedTimedOut;
                    }

                    if (waitingTimings.length > 0) {
                        const waitingUserIds = waitingTimings.map(t => t.userId);
                        let waitingPlayers = await models_1.Users.find({ _id: { $in: waitingUserIds } }).lean();

                        const waitingWithTimings = waitingPlayers.map(player => ({
                            player,
                            timing: waitingTimings.find(t => t.userId.toString() === player._id.toString())
                        })).filter(w => w.timing);

                        const batches = base_1.chunkArray(waitingWithTimings, 100);
                        for (const batch of batches) {
                            const batchPlayers = batch.map(b => b.player);
                            const batchStart = batch[0].timing.startTime;
                            const batchEnd = batch[0].timing.deadline;
                            const triggered = await triggersCheck(batchPlayers, eventToWait, campaignId, batchStart, batchEnd);
                            triggeredPlayers = [...triggeredPlayers, ...triggered];
                            const notTriggered = batchPlayers.filter(p => !triggered.some(t => t._id.toString() === p._id.toString()));
                            stillWaitingPlayers = [...stillWaitingPlayers, ...notTriggered];
                        }
                    }
                } else if (currentStillWaitingUsers.length > 0) {
                    console.log(`Skipping check for old waiting users in node ${node.id}, last check was recent`);
                    const timedOutTimings = currentStillWaitingUsers.filter(timing => now >= new Date(timing.deadline));
                    if (timedOutTimings.length > 0) {
                        const timedOutUserIds = timedOutTimings.map(t => t.userId);
                        timedOutPlayers = await models_1.Users.find({ _id: { $in: timedOutUserIds } }).lean();
                    }
                    const countStillWaiting = currentStillWaitingUsers.length - timedOutTimings.length;
                    console.log(`Wait_for_event node ${node.id}: ${countStillWaiting} players still waiting (skipped check)`);
                }

                let finalTriggeredPlayers = triggeredPlayers;
                if (conditions && conditions.length > 0) {
                    try {
                        finalTriggeredPlayers = await applyConditions(triggeredPlayers, conditions, campaignId, false);
                        console.log(`Wait_for_event node ${node.id}: ${finalTriggeredPlayers.length} players after applying conditions`);
                    } catch (error) {
                        console.error(`Error applying conditions for node ${node.id}:`, error);
                    }
                }

                const triggeredPlayerIds = new Set(finalTriggeredPlayers.map(p => p._id.toString()));
                const timedOutPlayerIds = new Set(timedOutPlayers.map(p => p._id.toString()));

                const updatedHappenedUsers = [
                    ...currentHappenedUsers,
                    ...finalTriggeredPlayers.map(player => {
                        const timing = newPlayerTimings.find(t => t.userId.toString() === player._id.toString()) ||
                            currentStillWaitingUsers.find(t => t.userId.toString() === player._id.toString());
                        return {
                            userId: player._id,
                            startTime: timing.startTime,
                            deadline: timing.deadline
                        };
                    })
                ];

                const updatedTimeoutUsers = [
                    ...currentTimeoutUsers,
                    ...timedOutPlayers.map(player => {
                        const timing = currentStillWaitingUsers.find(t => t.userId.toString() === player._id.toString()) ||
                            newPlayerTimings.find(t => t.userId.toString() === player._id.toString());
                        return {
                            userId: player._id,
                            startTime: timing.startTime,
                            deadline: timing.deadline
                        };
                    })
                ];

                const updatedStillWaitingUsers = currentStillWaitingUsers.filter(
                    entry => !triggeredPlayerIds.has(entry.userId.toString()) && !timedOutPlayerIds.has(entry.userId.toString())
                );

                const updateSet = {
                    happenedUsers: updatedHappenedUsers,
                    timeoutUsers: updatedTimeoutUsers,
                    stillWaitingUsers: updatedStillWaitingUsers,
                    date: now
                };

                if (shouldCheckOldWaiting) {
                    updateSet.lastCheckTime = now;
                }

                await models_1.JourneyNodes.updateOne(
                    { _id: node._id },
                    { $set: updateSet }
                );
                await redis_1.setToCache(nodeCacheKey, {
                    ...nodeData,
                    ...updateSet
                }, 3600);
                console.log(`Updated happenedUsers, timeoutUsers, stillWaitingUsers${shouldCheckOldWaiting ? ' and lastCheckTime' : ''} for wait_for_event node ${node.id}`);

                try {
                    const statsCacheKey = `journeyStats:${campaignId}:${node.id}`;
                    let currentStats = await redis_1.getFromCache(statsCacheKey);
                    if (!currentStats) {
                        console.log(`Cache miss for ${statsCacheKey}. Fetching from DB...`);
                        currentStats = await models_1.JourneyStats.findOne({ campaignId }).select('nodes').lean() || { nodes: {} };
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Cached currentStats for ${statsCacheKey}`);
                    }
                    const nodeStats = currentStats.nodes[node.id] || { type: 'wait_for_event', stats: {} };

                    const existingHappenedUsers = nodeStats.stats.happened?.users.map(u => u.userId.toString()) || [];
                    const newHappenedUsers = finalTriggeredPlayers.map(p => p._id.toString()).filter(id => !existingHappenedUsers.includes(id));
                    const newHappenedUserEntries = newHappenedUsers.map(userId => ({ userId, completionDate: now }));

                    nodeStats.stats.happened = {
                        count: (nodeStats.stats.happened?.count || 0) + newHappenedUsers.length,
                        users: [...(nodeStats.stats.happened?.users || []), ...newHappenedUserEntries]
                    };

                    const existingTimeoutUsers = nodeStats.stats.timeout?.users.map(u => u.userId.toString()) || [];
                    const newTimeoutUsers = timedOutPlayers.map(p => p._id.toString()).filter(id => !existingTimeoutUsers.includes(id));
                    const newTimeoutUserEntries = newTimeoutUsers.map(userId => ({ userId, completionDate: now }));

                    nodeStats.stats.timeout = {
                        count: (nodeStats.stats.timeout?.count || 0) + newTimeoutUsers.length,
                        users: [...(nodeStats.stats.timeout?.users || []), ...newTimeoutUserEntries]
                    };

                    currentStats.nodes[node.id] = nodeStats;

                    const updateResult = await models_1.JourneyStats.updateOne(
                        { campaignId },
                        { $set: { nodes: currentStats.nodes } },
                        { upsert: true }
                    );
                    if (updateResult.modifiedCount > 0) {
                        await redis_1.setToCache(statsCacheKey, currentStats, 300);
                        console.log(`Updated JourneyStats for wait_for_event node ${node.id}`);
                        await redis_1.delFromCache(`processedPlayers:${campaignId}:${node.id}:happened`);
                        await redis_1.delFromCache(`processedPlayers:${campaignId}:${node.id}:timeout`);
                        console.log(`Invalidated processedPlayers caches for wait_for_event node ${node.id}`);
                    }
                } catch (error) {
                    console.error(`Failed to update JourneyStats for wait_for_event node ${node.id}:`, error);
                }

                // Push all happened and timeout players to respective edges
                const happenedPlayers = players.filter(player => updatedHappenedUsers.some(entry => entry.userId.toString() === player._id.toString()));
                const timeoutPlayers = players.filter(player => updatedTimeoutUsers.some(entry => entry.userId.toString() === player._id.toString()));

                const nextEdges = edges.filter(e => e.from === node.id);
                const happenedEdge = nextEdges.find(e => e.label === 'happened');
                const timeoutEdge = nextEdges.find(e => e.label === 'timeout');
                console.log(`Wait_for_event node ${node.id}: ${nextEdges.length} next edges (happened=${!!happenedEdge}, timeout=${!!timeoutEdge})`);

                if (happenedPlayers.length > 0 && happenedEdge) {
                    const nextNode = nodes.find(n => n.id === happenedEdge.to);
                    if (nextNode) {
                        nodesToProcess.push({ node: nextNode, players: happenedPlayers });
                        console.log(`Pushing ${happenedPlayers.length} happened players to node ${nextNode.id} for wait_for_event node ${node.id}`);
                    }
                }

                if (timeoutPlayers.length > 0 && timeoutEdge) {
                    const nextNode = nodes.find(n => n.id === timeoutEdge.to);
                    if (nextNode) {
                        nodesToProcess.push({ node: nextNode, players: timeoutPlayers });
                        console.log(`Pushing ${timeoutPlayers.length} timeout players to node ${nextNode.id} for wait_for_event node ${node.id}`);
                    }
                }

                const totalStillWaiting = updatedStillWaitingUsers.length;
                console.log(`Wait_for_event node ${node.id}: ${totalStillWaiting} players still waiting, stored in DB`);

                if (eventToWait) {
                    const triggerCacheKey = `triggers:${campaignId}:${eventToWait}`;
                    await redis_1.delFromCache(triggerCacheKey);
                    console.log(`Cleared cache for ${triggerCacheKey}`);
                }
            }

        }

        console.log(`Finished processing nodes for campaign ${campaignId}`);
    } catch (error) {
        console.error('Error Check Node Journey => ', error);
        return;
    }
};

const processCampaign = async (campaign, io) => {
  const { _id: campaignId } = campaign;
  console.log(`Starting processCampaign for campaign ${campaignId}`);

  await redis_1.delFromCache(`journey:${campaignId}`);
  await redis_1.delFromCache(`journeyNodes:${campaignId}`);
  await redis_1.delFromCache(`journeyEdges:${campaignId}`);
  console.log(`Cleared cache for journey:${campaignId}, journeyNodes:${campaignId}, journeyEdges:${campaignId}`);

  const lockedCampaign = await models_1.Journeys.findOneAndUpdate(
    { _id: campaignId, processing: { $ne: true }, status: true, completed: { $ne: true } },
    { $set: { processing: true, processingStartedAt: new Date() } },
    { new: true, select: 'entryMode campaignDuration entryTrigger selectedSegment conditions completedUsers activeJourneys start_time_segment createdAt' }
  );
  console.log(`Locked campaign ${campaignId}: ${lockedCampaign ? 'Success' : 'Failed'}`);
  if (!lockedCampaign) {
    const campaignStatus = await models_1.Journeys.findById(campaignId).select('status completed processing').lean();
    console.log(`Campaign ${campaignId} status:`, campaignStatus);
    console.log(`Campaign ${campaignId} could not be locked. Exiting...`);
    return;
  }

  try {
    const { entryMode, campaignDuration, entryTrigger, selectedSegment, conditions, completedUsers = [], activeJourneys, start_time_segment, createdAt } = lockedCampaign;
    console.log(`Campaign ${campaignId}: entryMode=${entryMode}, campaignDuration=${JSON.stringify(campaignDuration)}, entryTrigger=${entryTrigger}, selectedSegment=${selectedSegment}`);

    const nodesCacheKey = `journeyNodes:${campaignId}`;
    let nodes = await redis_1.getFromCache(nodesCacheKey);
    if (!nodes) {
      console.log(`Cache miss for ${nodesCacheKey}. Fetching from DB...`);
      nodes = await models_1.JourneyNodes.find({ campaignId }).select('id type node.data date happenedUsers timeoutUsers stillWaitingUsers lastCheckTime').lean();
      if (nodes.length) {
        await redis_1.setToCache(nodesCacheKey, nodes, 3600);
        console.log(`Cached ${nodes.length} nodes for ${nodesCacheKey}`);
      }
    }
    console.log(`Found ${nodes.length} nodes for campaign ${campaignId}`);

    const edgesCacheKey = `journeyEdges:${campaignId}`;
    let edges = await redis_1.getFromCache(edgesCacheKey);
    if (!edges) {
      console.log(`Cache miss for ${edgesCacheKey}. Fetching from DB...`);
      edges = await models_1.JourneyEdges.find({ campaignId }).select('id from to label data').lean();
      if (edges.length) {
        await redis_1.setToCache(edgesCacheKey, edges, 3600);
        console.log(`Cached ${edges.length} edges for ${edgesCacheKey}`);
      }
    }
    console.log(`Found ${edges.length} edges for campaign ${campaignId}`);

    const startNode = nodes.find((n) => n.type === "segment");
    console.log(`Start node for campaign ${campaignId}: ${startNode ? startNode.id : 'Not found'}`);
    if (!nodes.length || !edges.length || !startNode) {
      console.log(`Invalid campaign setup for ${campaignId}: nodes=${nodes.length}, edges=${edges.length}, startNode=${!!startNode}. Skipping...`);
      await models_1.Journeys.updateOne(
        { _id: campaignId },
        { $unset: { processing: "", processingStartedAt: "" } }
      );
      await redis_1.setToCache(`journey:${campaignId}`, { ...lockedCampaign, processing: false }, 3600);
      console.log(`Skipped campaign ${campaignId} and reset processing`);
      return;
    }

    const now = new Date();
    const segmentStartDate = startNode.node.data.date && startNode.node.data.hour !== undefined
      ? new Date(`${startNode.node.data.date}T${String(startNode.node.data.hour).padStart(2, '0')}:${startNode.node.data.minute ? String(startNode.node.data.minute).padStart(2, '0') : '00'}:00Z`)
      : new Date(createdAt);
    console.log(`Campaign ${campaignId}: segmentStartDate=${segmentStartDate}, now=${now}`);

    if (segmentStartDate.getTime() !== new Date(start_time_segment).getTime()) {
      await models_1.Journeys.updateOne(
        { _id: campaignId },
        { $set: { start_time_segment: segmentStartDate } }
      );
      await redis_1.setToCache(`journey:${campaignId}`, { ...lockedCampaign, start_time_segment: segmentStartDate }, 3600);
      console.log(`Updated start_time_segment for campaign ${campaignId} to ${segmentStartDate}`);
    }

    if (now < segmentStartDate) {
      console.log(`Campaign ${campaignId} has not started yet. segmentStartDate=${segmentStartDate}. Exiting...`);
      await models_1.Journeys.updateOne({ _id: campaignId }, { $unset: { processing: "", processingStartedAt: "" } });
      await redis_1.setToCache(`journey:${campaignId}`, { ...lockedCampaign, processing: false }, 3600);
      return;
    }

    const { unit, value } = campaignDuration || { unit: null, value: null };
    if (unit && value) {
      const durationInMs = calculateDurationInMs(unit, value);
      const campaignEndTime = new Date(segmentStartDate.getTime() + durationInMs);
      console.log(`Campaign ${campaignId}: campaignEndTime=${campaignEndTime}`);
      if (now > campaignEndTime) {
        console.log(`Campaign ${campaignId} has ended. campaignEndTime=${campaignEndTime}. Completing...`);
        await models_1.Journeys.updateOne(
          { _id: campaignId },
          { $set: { completed: true, status: false }, $unset: { processing: "", processingStartedAt: "" } }
        );
        await redis_1.setToCache(`journey:${campaignId}`, { ...lockedCampaign, completed: true, status: false, processing: false }, 3600);
        await redis_1.delFromCache('campaigns:active');
        console.log(`Cleared campaigns:active cache due to campaign completion`);
        return;
      }
    }

    const segmentId = selectedSegment;
    const segmentUsers = await getPlayers(segmentId);
    console.log(`Campaign ${campaignId}: ${segmentUsers.length} users in segment ${segmentId}`);
    if (!segmentUsers.length) {
      console.log(`No users in segment ${segmentId} for campaign ${campaignId}. Exiting...`);
      await models_1.Journeys.updateOne({ _id: campaignId }, { $unset: { processing: "", processingStartedAt: "" } });
      await redis_1.setToCache(`journey:${campaignId}`, { ...lockedCampaign, processing: false }, 3600);
      return;
    }

    if (entryMode === "Once_in_a_lifetime") {
      const journeyFromDB = await models_1.Journeys.findById(campaignId).select('completedUsers').lean();
      const completedUsersSet = new Set((journeyFromDB.completedUsers || []).map(id => id.toString()));
      console.log(`Campaign ${campaignId}: ${completedUsersSet.size} users in completedUsers`);

      const incompleteUsers = segmentUsers.filter(user => !completedUsersSet.has(user._id.toString()));
      console.log(`Campaign ${campaignId}: ${incompleteUsers.length} incomplete users (Once_in_a_lifetime)`);
      if (!incompleteUsers.length) {
        console.log(`No incomplete users for campaign ${campaignId}. Exiting...`);
        await models_1.Journeys.updateOne({ _id: campaignId }, { $unset: { processing: "", processingStartedAt: "" } });
        await redis_1.setToCache(`journey:${campaignId}`, { ...lockedCampaign, processing: false }, 3600);
        return;
      }

      let players = incompleteUsers;
      if (entryTrigger) {
        const triggerCacheKey = `triggers:${campaignId}:${entryTrigger}`;
        let triggeredPlayers = await redis_1.getFromCache(triggerCacheKey);
        if (!triggeredPlayers) {
          console.log(`Cache miss for ${triggerCacheKey}. Checking triggers...`);
          try {
            triggeredPlayers = await triggersCheck(incompleteUsers, entryTrigger, campaignId, null, null);
            console.log(`Triggered players for ${entryTrigger}:`, triggeredPlayers.map(p => p._id.toString()));
            if (triggeredPlayers.length) {
              await redis_1.setToCache(triggerCacheKey, triggeredPlayers, 300);
              console.log(`Cached ${triggeredPlayers.length} triggered players for ${triggerCacheKey}`);
            } else {
              await redis_1.delFromCache(triggerCacheKey);
              console.log(`Cleared cache for ${triggerCacheKey} due to no triggered players`);
            }
          } catch (error) {
            console.error(`Error checking triggers for campaign ${campaignId}:`, error);
            triggeredPlayers = [];
          }
        } else {
          console.log(`Cache hit for ${triggerCacheKey}: ${triggeredPlayers.length} triggered players`);
        }
        players = triggeredPlayers;
        console.log(`Campaign ${campaignId}: ${players.length} players after trigger check`);
      }

      if (!players.length) {
        console.log(`No players after trigger check for campaign ${campaignId}. Exiting...`);
        await models_1.Journeys.updateOne({ _id: campaignId }, { $unset: { processing: "", processingStartedAt: "" } });
        await redis_1.setToCache(`journey:${campaignId}`, { ...lockedCampaign, processing: false }, 3600);
        return;
      }

      const conditionCacheKey = `conditions:${campaignId}`;
      let filteredPlayers = await redis_1.getFromCache(conditionCacheKey);
      if (!filteredPlayers) {
        console.log(`Cache miss for ${conditionCacheKey}. Applying conditions...`);
        try {
          filteredPlayers = await applyConditions(players, conditions, campaignId);
          if (filteredPlayers.length) {
            await redis_1.setToCache(conditionCacheKey, filteredPlayers, 300);
            console.log(`Cached ${filteredPlayers.length} filtered players for ${conditionCacheKey}`);
          } else {
            await redis_1.delFromCache(conditionCacheKey);
            console.log(`Cleared cache for ${conditionCacheKey} due to no filtered players`);
          }
        } catch (error) {
          console.error(`Error applying conditions for campaign ${campaignId}:`, error);
          filteredPlayers = [];
        }
      } else {
        console.log(`Cache hit for ${conditionCacheKey}: ${filteredPlayers.length} filtered players`);
      }
      console.log(`Campaign ${campaignId}: ${filteredPlayers.length} players after conditions`);

      if (!filteredPlayers.length) {
        console.log(`No players after conditions for campaign ${campaignId}. Exiting...`);
        await models_1.Journeys.updateOne({ _id: campaignId }, { $unset: { processing: "", processingStartedAt: "" } });
        await redis_1.setToCache(`journey:${campaignId}`, { ...lockedCampaign, processing: false }, 3600);
        return;
      }

      const param = { nodes, edges, nodeId: startNode.id, players: filteredPlayers, campaignId };
      console.log(`Calling checkNode for campaign ${campaignId} with ${filteredPlayers.length} players`);
      await checkNode(param, segmentStartDate, io);
    } else if (entryMode === "Multiple_times") {
      let players = segmentUsers;
      console.log(`Campaign ${campaignId}: ${players.length} players (Multiple_times)`);
      if (entryTrigger) {
        const triggerCacheKey = `triggers:${campaignId}:${entryTrigger}`;
        let triggeredPlayers = await redis_1.getFromCache(triggerCacheKey);
        if (!triggeredPlayers) {
          console.log(`Cache miss for ${triggerCacheKey}. Checking triggers...`);
          try {
            triggeredPlayers = await triggersCheck(segmentUsers, entryTrigger, campaignId, null, null);
            console.log(`Triggered players for ${entryTrigger}:`, triggeredPlayers.map(p => p._id.toString()));
            if (triggeredPlayers.length) {
              await redis_1.setToCache(triggerCacheKey, triggeredPlayers, 300);
              console.log(`Cached ${triggeredPlayers.length} triggered players for ${triggerCacheKey}`);
            } else {
              await redis_1.delFromCache(triggerCacheKey);
              console.log(`Cleared cache for ${triggerCacheKey} due to no triggered players`);
            }
          } catch (error) {
            console.error(`Error checking triggers for campaign ${campaignId}:`, error);
            triggeredPlayers = [];
          }
        } else {
          console.log(`Cache hit for ${triggerCacheKey}: ${triggeredPlayers.length} triggered players`);
        }
        players = triggeredPlayers;
        console.log(`Campaign ${campaignId}: ${players.length} players after trigger check`);
      }

      if (!players.length) {
        console.log(`No players after trigger check for campaign ${campaignId}. Exiting...`);
        await models_1.Journeys.updateOne({ _id: campaignId }, { $unset: { processing: "", processingStartedAt: "" } });
        await redis_1.setToCache(`journey:${campaignId}`, { ...lockedCampaign, processing: false }, 3600);
        return;
      }

      const conditionCacheKey = `conditions:${campaignId}`;
      let filteredPlayers = await redis_1.getFromCache(conditionCacheKey);
      if (!filteredPlayers) {
        console.log(`Cache miss for ${conditionCacheKey}. Applying conditions...`);
        try {
          filteredPlayers = await applyConditions(players, conditions, campaignId, true);
          if (filteredPlayers.length) {
            await redis_1.setToCache(conditionCacheKey, filteredPlayers, 300);
            console.log(`Cached ${filteredPlayers.length} filtered players for ${conditionCacheKey}`);
          } else {
            await redis_1.delFromCache(conditionCacheKey);
            console.log(`Cleared cache for ${conditionCacheKey} due to no filtered players`);
          }
        } catch (error) {
          console.error(`Error applying conditions for campaign ${campaignId}:`, error);
          filteredPlayers = [];
        }
      } else {
        console.log(`Cache hit for ${conditionCacheKey}: ${filteredPlayers.length} filtered players`);
      }
      console.log(`Campaign ${campaignId}: ${filteredPlayers.length} players after conditions`);

      if (!filteredPlayers.length) {
        console.log(`No players after conditions for campaign ${campaignId}. Exiting...`);
        await models_1.Journeys.updateOne({ _id: campaignId }, { $unset: { processing: "", processingStartedAt: "" } });
        await redis_1.setToCache(`journey:${campaignId}`, { ...lockedCampaign, processing: false }, 3600);
        return;
      }

      const param = { nodes, edges, nodeId: startNode.id, players: filteredPlayers, campaignId };
      console.log(`Calling checkNode for campaign ${campaignId} with ${filteredPlayers.length} players`);
      await checkNode(param, segmentStartDate, io);
    } else if (entryMode === "Once_during_open_journey") {
      const completedUsersSet = new Set(completedUsers.map(id => id.toString()));
      console.log(`Campaign ${campaignId}: ${completedUsersSet.size} users in completedUsers`);
      const incompleteUsers = segmentUsers.filter(user => !completedUsersSet.has(user._id.toString()));
      console.log(`Campaign ${campaignId}: ${incompleteUsers.length} incomplete users (Once_during_open_journey)`);
      const filteredUsers = incompleteUsers;

      if (!filteredUsers.length) {
        console.log(`No incomplete users for campaign ${campaignId}. Exiting...`);
        await models_1.Journeys.updateOne({ _id: campaignId }, { $unset: { processing: "", processingStartedAt: "" } });
        await redis_1.setToCache(`journey:${campaignId}`, { ...lockedCampaign, processing: false }, 3600);
        return;
      }

      let players = filteredUsers;
      if (entryTrigger) {
        const triggerCacheKey = `triggers:${campaignId}:${entryTrigger}`;
        let triggeredPlayers = await redis_1.getFromCache(triggerCacheKey);
        if (!triggeredPlayers) {
          console.log(`Cache miss for ${triggerCacheKey}. Checking triggers...`);
          try {
            triggeredPlayers = await triggersCheck(filteredUsers, entryTrigger, campaignId, null, null);
            console.log(`Triggered players for ${entryTrigger}:`, triggeredPlayers.map(p => p._id.toString()));
            if (triggeredPlayers.length) {
              await redis_1.setToCache(triggerCacheKey, triggeredPlayers, 300);
              console.log(`Cached ${triggeredPlayers.length} triggered players for ${triggerCacheKey}`);
            } else {
              await redis_1.delFromCache(triggerCacheKey);
              console.log(`Cleared cache for ${triggerCacheKey} due to no triggered players`);
            }
          } catch (error) {
            console.error(`Error checking triggers for campaign ${campaignId}:`, error);
            triggeredPlayers = [];
          }
        } else {
          console.log(`Cache hit for ${triggerCacheKey}: ${triggeredPlayers.length} triggered players`);
        }
        players = triggeredPlayers;
        console.log(`Campaign ${campaignId}: ${players.length} players after trigger check`);
      }

      if (!players.length) {
        console.log(`No players after trigger check for campaign ${campaignId}. Exiting...`);
        await models_1.Journeys.updateOne({ _id: campaignId }, { $unset: { processing: "", processingStartedAt: "" } });
        await redis_1.setToCache(`journey:${campaignId}`, { ...lockedCampaign, processing: false }, 3600);
        return;
      }

      const conditionCacheKey = `conditions:${campaignId}`;
      let filteredPlayers = await redis_1.getFromCache(conditionCacheKey);
      if (!filteredPlayers) {
        console.log(`Cache miss for ${conditionCacheKey}. Applying conditions...`);
        try {
          filteredPlayers = await applyConditions(players, conditions, campaignId);
          if (filteredPlayers.length) {
            await redis_1.setToCache(conditionCacheKey, filteredPlayers, 300);
            console.log(`Cached ${filteredPlayers.length} filtered players for ${conditionCacheKey}`);
          } else {
            await redis_1.delFromCache(conditionCacheKey);
            console.log(`Cleared cache for ${conditionCacheKey} due to no filtered players`);
          }
        } catch (error) {
          console.error(`Error applying conditions for campaign ${campaignId}:`, error);
          filteredPlayers = [];
        }
      } else {
        console.log(`Cache hit for ${conditionCacheKey}: ${filteredPlayers.length} filtered players`);
      }
      console.log(`Campaign ${campaignId}: ${filteredPlayers.length} players after conditions`);

      if (!filteredPlayers.length) {
        console.log(`No players after conditions for campaign ${campaignId}. Exiting...`);
        await models_1.Journeys.updateOne({ _id: campaignId }, { $unset: { processing: "", processingStartedAt: "" } });
        await redis_1.setToCache(`journey:${campaignId}`, { ...lockedCampaign, processing: false }, 3600);
        return;
      }

      const param = { nodes, edges, nodeId: startNode.id, players: filteredPlayers, campaignId };
      console.log(`Calling checkNode for campaign ${campaignId} with ${filteredPlayers.length} players`);
      await checkNode(param, segmentStartDate, io);
    }
  } finally {
    await models_1.Journeys.updateOne(
      { _id: campaignId },
      { $unset: { processing: "", processingStartedAt: "" } }
    );
    await redis_1.setToCache(`journey:${campaignId}`, { ...lockedCampaign, processing: false }, 3600);
    console.log(`Finished processCampaign for campaign ${campaignId} and reset processing`);
  }
};

const checkJourneyFlow = async (io) => {
    try {
        await cleanStaleCampaigns();
        const campaignsCacheKey = `campaigns:active`;
        await redis_1.delFromCache(campaignsCacheKey);
        console.log(`Cleared campaigns:active cache`);

        let campaigns = await models_1.Journeys.find({
            status: true,
            completed: { $ne: true },
            processing: { $ne: true }
        }).select('_id entryMode campaignDuration entryTrigger selectedSegment conditions completedUsers activeJourneys start_time_segment createdAt').lean();

        if (campaigns.length) {
            await redis_1.setToCache(campaignsCacheKey, campaigns, 300);
            console.log(`Кэшировано ${campaigns.length} активных кампаний`);
        }

        if (!campaigns.length) {
            console.log('Нет активных кампаний для обработки.');
            return;
        }

        console.log(`Обработка ${campaigns.length} кампаний на ${new Date().toISOString()}`);
        await Promise.all(campaigns.map(async (campaign) => {
            try {
                await processCampaign(campaign, io); 
            } catch (err) {
                console.error(`Ошибка обработки кампании ${campaign._id}:`, err);
            }
        }));
    } catch (error) {
        console.error("Ошибка в checkJourneyFlow => ", error);
    }
};

exports.checkJourneyFlow = checkJourneyFlow;