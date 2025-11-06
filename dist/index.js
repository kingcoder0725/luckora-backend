"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
require("regenerator-runtime");
const os_1 = require("os");
const cors = require("cors");
const path = require("path");
const morgan = require("morgan");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const compression = require("compression");
const session = require("express-session");
const useragent = require("express-useragent");
const methodOverride = require("method-override");
const helmet_1 = require("helmet");
const express_rate_limit_1 = require("express-rate-limit");
const fs = require("fs");
const rotating_file_stream_1 = require("rotating-file-stream");
const socket_1 = require("./socket");
const chat_1 = require("./socket/chat");
const admin_1 = require("./socket/admin");
const sports_1 = require("./socket/sports");
const journey_socket_1 = require("./socket/journey");
const routes1_1 = require("./routes1");
const routes2_1 = require("./routes2");
const routes3_1 = require("./routes3");
const validation_1 = require("./middlewares/validation");
const auth_1 = require("./middlewares/auth");
const base_1 = require("./controllers/base");
const nexusggr_1 = require("./controllers/games/nexusggr");
const users_1 = require("./controllers/users");
const cron_1 = require("./controllers/cron");
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cluster = require('cluster');
if (cluster.isPrimary && process.env.CLUSTER) {
    const CPUS = (0, os_1.cpus)();
    CPUS.forEach(() => cluster.fork());
}
else {
    const config = require('../config');
    const app = express();
    const accessLogStream = (0, rotating_file_stream_1.createStream)('access.log', {
        interval: '1d',
        path: path.join(`${config.DIR}`, 'log'),
    });
    app.use(compression());
    app.use(useragent.express());
    app.use(morgan('combined', { stream: accessLogStream }));
    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
    app.use(bodyParser.raw({ type: 'application/vnd.custom-type' }));
    app.use(bodyParser.text({ type: 'text/html' }));
    app.use(methodOverride());
    app.use(base_1.logErrors);
    app.use(base_1.clientErrorHandler);
    app.use(express.static(`${config.DIR}/upload`));
    app.use(express.static(`${config.DIR}/teams`));
    app.use(express.static(`${config.DIR}/../${process.env.FRONTEND}`));
    app.use(express.static(`${config.DIR}/../${process.env.ADMIN}`));
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        referrerPolicy: { policy: 'no-referrer' },
    }));
    app.set('trust proxy', 1);
    app.use(session({
        secret: process.env.SESSION_SECRET,
        saveUninitialized: true,
        resave: true,
        cookie: {
            httpOnly: true,
            secure: true,
            domain: process.env.DOMAIN,
            path: '*',
            expires: new Date(Date.now() + 60 * 60 * 1000),
        },
    }));
    if (process.env.MODE === 'dev') {
        app.use(cors('*'));
    }
    else {
        app.use(cors(auth_1.corsOptionsDelegate));
        app.use(auth_1.checkUrl);
    }
    const apiV1Limiter = (0, express_rate_limit_1.default)({
        windowMs: 5 * 1000,
        max: 20,
        standardHeaders: true,
        legacyHeaders: false,
    });
    const apiV2Limiter = (0, express_rate_limit_1.default)({
        windowMs: 60 * 60 * 1000,
        max: 1000,
        standardHeaders: true,
        legacyHeaders: false,
    });
    const apiV3Limiter = (0, express_rate_limit_1.default)({
        windowMs: 60 * 60 * 1000,
        max: 3000,
        standardHeaders: true,
        legacyHeaders: false,
    });
    app.use('/api/v1/', apiV1Limiter, routes1_1.default);
    app.use('/api/v2/', apiV2Limiter, routes2_1.default);
    app.use('/api/v3/', apiV3Limiter, routes3_1.default);
    
    // Casino redirect for backward compatibility (drifbet.com/casino/ -> /api/v3/games/timelesstech/)
    app.use('/casino/', (req, res, next) => {
        // Remove /casino/ prefix and add /games/timelesstech/ prefix
        const newPath = req.url.replace(/^\//, '');
        req.url = `/games/timelesstech/${newPath}`;
        req.originalUrl = `/api/v3/games/timelesstech/${newPath}`;
        next();
    }, apiV3Limiter, routes3_1.default);
    
    app.post('/gold_api', nexusggr_1.callback);
    app.post('/api/sumsub/webhook', users_1.sumsubWebhook);
    app.get('/sitemap.xml', base_1.getSiteMap);
    app.post('/sms-api', (req, res) => {
        console.log(req.body, '------------sms api---------');
        res.send('ok');
    });
    app.post('/support-chat-api', (req, res) => {
        console.log(req.body, '------------support chat api---------');
        res.send('ok');
    });
      // Swagger setup for v2 routes
      const swaggerDefinition = {
        openapi: '3.0.0',
        info: {
            title: 'Webet360 API',
            version: '1.0.0',
            description: 'API documentation for v2 routes',
        },
        servers: [
            {
                url: `${process.env.DOMAIN || `http://localhost:${process.env.PORT || 2002}`}/api/v2`,
                description: 'Development server',
            },
        ],
    };
    const options = {
        swaggerDefinition,
        apis: [
            path.join(__dirname, './routes2/**/*.ts'),
            path.join(__dirname, './controllers/**/*.ts'),
        ],
    };
    const swaggerSpec = swaggerJsdoc(options);
    app.use('/api/v2/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.get('*', apiV2Limiter, (req, res) => {
        res.sendFile(path.join(config.DIR, '../', `${process.env.FRONTEND}/index.html`));
    });
    app.use(validation_1.RetrunValidation);
    mongoose
    .connect(process.env.DATABASE)
    .then(() => {
        const port = process.env.PORT || 2002;
        let server;
        if (process.env.TYPE === 'https') {
            const options = {
                key: fs.readFileSync('./conf/key.pem'),
                cert: fs.readFileSync('./conf/cert.pem'),
            };
            server = require('https').createServer(options, app);
        } else {
            server = require('http').createServer(app);
        }

        const io = require('socket.io')(server, { cors: { origin: '*' } });
        (0, socket_1.default)(io); 
        (0, chat_1.default)(io);
        (0, admin_1.default)(io);
        (0, sports_1.default)(io);
        (0, journey_socket_1.default)(io);
        app.set('io', io);

        server.listen(port);
        console.log('server listening on:', port);

        console.log('MongoDB connected');
        (0, base_1.init)();
        (0, cron_1.initCron)();
    })
    .catch((error) => {
        console.log('database connection error => ', error);
    });
}
