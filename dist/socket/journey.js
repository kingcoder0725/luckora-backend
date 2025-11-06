// socket/journey.js
'use strict';
Object.defineProperty(exports, '__esModule', { value: true });

const models_1 = require("../models");

const journey = (io) => {
    const journeyNamespace = io.of('/journey');
    journeyNamespace.on('connection', (socket) => {
        console.log('[Journey] Client connected to /journey namespace:', socket.id);

        socket.on('journey_command', async (data) => {
            console.log('[Journey] Received journey_command:', JSON.stringify(data, null, 2));
            const { type, players, payload } = data;
            if (!type || !players || !Array.isArray(players)) {
                console.error('[Journey] Invalid journey_command data:', data);
                return;
            }

            const playerIds = players.map((p) => String(p));
            console.log(`[Journey] Processing command: ${type} for players: ${playerIds.join(', ')}`);

            const sessions = await models_1.Sessions.find({
                userId: { $in: playerIds },
                socketId: { $ne: null }
            }).select('userId socketId').lean();

            if (!sessions.length) {
                console.warn(`[Journey] No active sessions found for players: ${playerIds.join(', ')}`);
                console.log('[Journey] Sessions query:', JSON.stringify({ userId: { $in: playerIds }, socketId: { $ne: null } }, null, 2));
                return;
            }

            console.log(`[Journey] Found ${sessions.length} active sessions:`, JSON.stringify(sessions, null, 2));

            if (type === 'popup') {
                sessions.forEach((session) => {
                    io.to(session.socketId).emit('popup', payload);
                    console.log(`[Journey] Emitted popup to user ${session.userId}, socket ${session.socketId}:`, JSON.stringify(payload, null, 2));
                });
            } else if (type === 'give_mini_game') {
                sessions.forEach((session) => {
                    io.to(session.socketId).emit('give_mini_game', payload);
                    console.log(`[Journey] Emitted give_mini_game to user ${session.userId}, socket ${session.socketId}:`, JSON.stringify(payload, null, 2));
                });
            } else {
                console.warn(`[Journey] Unknown command type: ${type}`);
            }
        });

        socket.on('disconnect', (reason) => {
            console.log(`[Journey] Client disconnected from /journey namespace: ${reason}`);
        });
    });
};

exports.default = journey;