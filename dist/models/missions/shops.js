"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Shops = void 0;
const mongoose_1 = require("mongoose");
const MissionShopsSchema = new mongoose_1.Schema(
{
name: {
type: String,
required: true,
trim: true,
},
desc: {
type: String,
required: true,
trim: true,
},
banner_path: {
type: String,
trim: true,
},
type_pay: {
type: String,
required: true,
enum: ['fiat', 'points'],
},
cost: {
type: Number,
required: true,
min: 0,
},
payout: {
type: Number,
required: true,
min: 0,
},
type_gift: {
type: String,
required: true,
enum: ['free_spins', 'cash_bonus', 'free_bet'],
},
currencies: {
type: [
{
currency: {
type: String,
required: true,
trim: true,
},
games: {
type: [
{
game: {
type: String,
required: true,
trim: true,
},
max_bet: {
type: Number,
required: true,
min: 0,
},
},
],
required: true,
minlength: 1,
},
},
],
required: function () { return this.type_gift === 'free_spins'; },
default: function () { return this.type_gift === 'free_spins' ? undefined : []; },
},
maxodds: {
type: Number,
default: 0,
min: 0,
required: function () { return this.type_gift === 'free_bet'; },
},
leagueId: {
type: Number,
required: function () { return this.type_gift === 'free_bet'; },
},
matchId: {
type: Number,
required: function () { return this.type_gift === 'free_bet'; },
},
status: {
type: Boolean,
required: true,
default: true,
},
},
{ timestamps: true }
);
MissionShopsSchema.index({ name: 1, status: 1 });
MissionShopsSchema.index({ name: 'text', desc: 'text' });
exports.MissionShops = (0, mongoose_1.model)('missions_shops', MissionShopsSchema);