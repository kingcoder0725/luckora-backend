"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TournamentGames = void 0;
const mongoose_1 = require("mongoose");
const TournamentGamesSchema = new mongoose_1.Schema({
    game_id: {
        type: String,
        required: true,
        unique: true,
    },
    game_name: {
        type: String,
        required: true,
    },
    vendor: {
        type: String,
        required: true,
    },
    subtype: {
        type: String,
        required: true,
    },
    status: {
        type: Boolean,
        default: true,
    },
    description: {
        type: String,
        default: "Tournament/Promo game for accepting WIN transactions",
    },
}, { timestamps: true });
TournamentGamesSchema.index({ game_id: 1 });
TournamentGamesSchema.index({ vendor: 1 });
TournamentGamesSchema.index({ status: 1 });
exports.TournamentGames = (0, mongoose_1.model)('tournament_games', TournamentGamesSchema);
