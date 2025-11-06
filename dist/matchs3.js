"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
require("regenerator-runtime");
const mongoose_1 = require("mongoose");
const http_1 = require("http");
const sportsrealtime_1 = require("./controllers/sports/sportsrealtime");
try {
    const port = Number(process.env.PORT) + 6;
    mongoose_1.default.connect(process.env.DATABASE).then(() => {
        const server = (0, http_1.createServer)((req, res) => {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain');
            res.end('Matchs3');
        });
        server.listen(port, '127.0.0.1', () => {
            console.log('server listening on:', port);
            (0, sportsrealtime_1.Matchs3)();
        });
    });
}
catch (error) {
    console.log(`Matchs3`, error);
}
