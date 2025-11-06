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
const models_1 = require("../models");
const utils_1 = require("../utils");
let user = null;
exports.default = (io) => {
    io.of('/admin').on('connection', (socket) => __awaiter(void 0, void 0, void 0, function* () {
        console.log("connected admin socket");
        socket.on('auth', (token) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const decoded = yield models_1.Sessions.findOneAndUpdate({ accessToken: token }, { socketId: socket.id });
                user = yield models_1.Users.findById(decoded.userId);
                if (!utils_1.ADMIN_ROLES.includes(user.rolesId.type))
                    return io.to(decoded.socketId).emit("logout");
            }
            catch (err) {
                io.to(socket.id).emit('logout');
            }
        }));
    }));
};
