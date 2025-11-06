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
exports.Result = exports.bettingSettled = void 0;
const cron_1 = require("cron");
const moment = require("moment");
const base_1 = require("../base");
const sportsmatchs_1 = require("./sportsmatchs");
const models_1 = require("../../models");
const sportsrealtime_1 = require("./sportsrealtime");
const payment_1 = require("../payment");
const affiliate_1 = require("../../utils/affiliate");
const football_1 = require("./football");
let count = 0;
let single = 0;
let multi = 0;
const DEFAULT_DATA = { h_score: 0, a_score: 0, t_score: 0, state: false };
const convertScoresToNumbers = (scores) => {
    const result = {};
    Object.entries(scores || {}).forEach(([key, value]) => {
        const home = (value === null || value === void 0 ? void 0 : value.home) || 0;
        const away = (value === null || value === void 0 ? void 0 : value.away) || 0;
        result[key] = { home: Number(home), away: Number(away) };
    });
    return result;
};
/**
 * Match Winner 2-Way
 */
const get1X2 = ({ h_score, a_score, oddType }) => {
    if (h_score === a_score && oddType === 'draw') {
        return 'WIN';
    }
    if ((h_score > a_score && oddType === 'home') || (h_score < a_score && oddType === 'away')) {
        return 'WIN';
    }
    return 'LOST';
};
/**
 * Is Player to be booked
 */
const getAlternativeHandicap = ({ h_score, a_score, oddType, handicap }) => {
    const isFavorite = Number(handicap) > 0 ? true : false;
    const _handicap = Math.abs(handicap);
    let d_score = Math.floor(_handicap);
    if (oddType === 'home') {
        h_score = h_score + (isFavorite ? d_score : d_score * -1);
    }
    else if (oddType === 'away') {
        let temp = h_score;
        h_score = a_score + (isFavorite ? d_score : d_score * -1);
        a_score = temp;
    }
    if (oddType !== "draw") {
        if (h_score > a_score) {
            return "WIN";
        }
        else if (h_score === a_score) {
            return "REFUND";
        }
        else {
            return 'LOST';
        }
    }
    else {
        if (h_score - a_score === handicap) {
            return "WIN";
        }
        else {
            return 'LOST';
        }
    }
};
/**
 * Draw No Bet (Cricket)
 */
const getDrawNoBet = ({ h_score, a_score, oddType }) => {
    if (h_score === a_score) {
        return 'REFUND';
    }
    if ((h_score > a_score && oddType === 'home') || (h_score < a_score && oddType === 'away')) {
        return 'WIN';
    }
    return 'LOST';
};
/**
 * Asian Handicap
 */
const getHandicap = ({ h_score, a_score, oddType, handicap }) => {
    const isFavorite = Number(handicap) > 0;
    const _handicap = Math.abs(handicap);
    const d_score = Math.floor(_handicap);
    let handicap_od = d_score < 1 ? _handicap : _handicap % d_score;
    if (oddType === 'home') {
        handicap_od = isFavorite ? handicap_od : -handicap_od;
        h_score = h_score + (isFavorite ? d_score : -d_score);
    }
    else if (oddType === 'away') {
        const temp = h_score;
        handicap_od = isFavorite ? -handicap_od : handicap_od;
        h_score = a_score - (isFavorite ? d_score : -d_score);
        a_score = temp;
    }
    switch (handicap_od) {
        case 0.25:
            if (h_score > a_score)
                return 'WIN';
            if (h_score === a_score)
                return 'HALF_WIN';
            return 'LOST';
        case 0.5:
            if (h_score >= a_score)
                return 'WIN';
            return 'LOST';
        case 0.75:
            if (h_score >= a_score)
                return 'WIN';
            if (h_score + 1 === a_score)
                return 'HALF_LOST';
            return 'LOST';
        case -0.25:
            if (h_score > a_score)
                return 'WIN';
            if (h_score === a_score)
                return 'HALF_LOST';
            return 'LOST';
        case -0.5:
            if (h_score > a_score)
                return 'WIN';
            return 'LOST';
        case -0.75:
            if (h_score > a_score + 1)
                return 'WIN';
            if (h_score === a_score + 1)
                return 'HALF_WIN';
            return 'LOST';
        default:
            if (h_score > a_score)
                return 'WIN';
            if (h_score === a_score)
                return 'REFUND';
            return 'LOST';
    }
};
/**
 * Over/Under
 */
const getOverUnder = ({ t_score, handicap, oddType }) => {
    handicap = Math.abs(handicap);
    let d_score = Math.floor(handicap);
    let over_under = d_score < 1 ? handicap : handicap % d_score;
    if (oddType === 'under') {
        if (over_under === 0.25) {
            if (t_score < d_score) {
                return 'WIN';
            }
            else if (t_score === d_score) {
                return 'HALF_WIN';
            }
            else {
                return 'LOST';
            }
        }
        else if (over_under === 0.5) {
            if (t_score <= d_score) {
                return 'WIN';
            }
            else {
                return 'LOST';
            }
        }
        else if (over_under === 0.75) {
            if (t_score <= d_score) {
                return 'WIN';
            }
            else if (t_score === d_score + 1) {
                return 'HALF_LOST';
            }
            else {
                return 'LOST';
            }
        }
        else {
            if (t_score < d_score) {
                return 'WIN';
            }
            else if (t_score === d_score) {
                return 'REFUND';
            }
            else {
                return 'LOST';
            }
        }
    }
    else if (oddType === 'over') {
        if (over_under === 0.25) {
            if (t_score > d_score) {
                return 'WIN';
            }
            else if (t_score === d_score) {
                return 'HALF_LOST';
            }
            else {
                return 'LOST';
            }
        }
        else if (over_under === 0.5) {
            if (t_score > d_score) {
                return 'WIN';
            }
            else {
                return 'LOST';
            }
        }
        else if (over_under === 0.75) {
            if (t_score > d_score + 1) {
                return 'WIN';
            }
            else if (t_score === d_score + 1) {
                return 'HALF_WIN';
            }
            else {
                return 'LOST';
            }
        }
        else {
            if (t_score > d_score) {
                return 'WIN';
            }
            else if (t_score === d_score) {
                return 'REFUND';
            }
            else {
                return 'LOST';
            }
        }
    }
    else {
        return '';
    }
};
const getScore = (scores) => {
    let home = 0, away = 0;
    for (const i in scores) {
        if (Number(scores[i].home) > Number(scores[i].away)) {
            home++;
        }
        else if (Number(scores[i].home) < Number(scores[i].away)) {
            away++;
        }
    }
    return { home, away };
};
// Card
/**
 * Match Card
 */
const getCardResult = ({ h_card, a_card, t_card, r_card, oddType }) => {
    if (h_card === a_card && oddType === 'draw') {
        return 'WIN';
    }
    else if (h_card > a_card && oddType === 'home') {
        return 'WIN';
    }
    else if (h_card < a_card && oddType === 'away') {
        return 'WIN';
    }
    else if (r_card > t_card && oddType === 'under') {
        return 'WIN';
    }
    else if (r_card < t_card && oddType === 'over') {
        return 'WIN';
    }
    else if (r_card === t_card && oddType === 'exactly') {
        return 'WIN';
    }
    else {
        return 'LOST';
    }
};
/**
 * Both team get Card
 */
const getIsBothCard = ({ h_card, a_card, r_card }) => {
    if (h_card > 0 && a_card > 0 && r_card == "Yes") {
        return 'WIN';
    }
    else if (h_card <= 0 && a_card <= 0 && r_card == "No") {
        return 'WIN';
    }
    else {
        return 'LOST';
    }
};
/**
 * Is team get Card
 */
const getIsTeamCard = ({ h_card, a_card, handicap, header }) => {
    if (header === "1") {
        if (handicap.indexOf("Over") !== -1) {
            if (handicap.split("Over ").length > 1) {
                let cardVal = Number(handicap.split("Over ")[1]);
                if (h_card > cardVal) {
                    return 'WIN';
                }
                else {
                    return 'LOST';
                }
            }
            else {
                return "REFUND";
            }
        }
        else if (handicap.indexOf("Under") !== -1) {
            if (handicap.split("Under ").length > 1) {
                let cardVal = Number(handicap.split("Under ")[1]);
                if (h_card < cardVal) {
                    return 'WIN';
                }
                else {
                    return 'LOST';
                }
            }
            else {
                return "REFUND";
            }
        }
        else {
            return "REFUND";
        }
    }
    else if (header === "2") {
        if (handicap.indexOf("Over") !== -1) {
            if (handicap.split("Over ").length > 1) {
                let cardVal = Number(handicap.split("Over ")[1]);
                if (a_card > cardVal) {
                    return 'WIN';
                }
                else {
                    return 'LOST';
                }
            }
            else {
                return "REFUND";
            }
        }
        else if (handicap.indexOf("Under") !== -1) {
            if (handicap.split("Under ").length > 1) {
                let cardVal = Number(handicap.split("Under ")[1]);
                if (a_card < cardVal) {
                    return 'WIN';
                }
                else {
                    return 'LOST';
                }
            }
            else {
                return "REFUND";
            }
        }
        else {
            return "REFUND";
        }
    }
    else {
        return "REFUND";
    }
};
/**
 * Is which team get Card
 */
const getIsWhoFistCard = ({ t_card, data, r_card }) => {
    let result = 'REFUND';
    if (t_card === 0 && r_card === "No Card") {
        return 'WIN';
    }
    else if (t_card !== 0 && r_card === "No Card") {
        return 'LOST';
    }
    else {
        for (var i = 0; i < data.events.length; i++) {
            let item = data.events[i];
            let text = item === null || item === void 0 ? void 0 : item.text.toLowerCase();
            if (text && (text.indexOf('1st yellow card') !== -1 || text.indexOf('1st red card') !== -1)) {
                if ((text.indexOf(data.home.name.toLowerCase()) !== -1) && r_card === '1') {
                    result = 'WIN';
                    break;
                }
                else if ((text.indexOf(data.away.name.toLowerCase()) !== -1) && r_card === '2') {
                    result = 'WIN';
                    break;
                }
                else {
                    result = 'LOST';
                }
            }
        }
    }
    return result;
};
/**
 * The time when get Card
 */
const getTimeFistCard = ({ t_card, data, targetTime }) => {
    let result = 'REFUND';
    let _targetTime = targetTime.toLowerCase();
    for (var i = 0; i < data.events.length; i++) {
        let item = data.events[i];
        if (((item === null || item === void 0 ? void 0 : item.text.includes('1st Yellow Card')) || (item === null || item === void 0 ? void 0 : item.text.includes('1st Red Card')))) {
            let _time = item.text.split("'")[0].split("+");
            let firstCardTime = Number(_time[0]) * 60 + (Number(_time[1]) || 0);
            let ttime = _targetTime.split(" ");
            let targettime = ttime[ttime.length - 1];
            let mttime = (Number(targettime.split(":")[0]) || 0) * 60 + (Number(targettime.split(":")[1]) || 0);
            if (_targetTime.includes('no card before')) {
                if (mttime > firstCardTime) {
                    return 'LOST';
                }
                else {
                    return 'WIN';
                }
            }
            else if (_targetTime.includes('card before')) {
                if (mttime > firstCardTime) {
                    return 'WIN';
                }
                else {
                    return 'LOST';
                }
            }
            else {
                return 'REFUND';
            }
        }
    }
    return result;
};
/**
 * The selected min time get total Card
 */
const getSelectedTimeFistCard = ({ t_card, data, handicap, oddType, targetTime }) => {
    let card_num = 0;
    for (var i = 0; i < data.events.length; i++) {
        let item = data.events[i];
        if (((item === null || item === void 0 ? void 0 : item.text.indexOf('1st Yellow Card')) !== -1 || (item === null || item === void 0 ? void 0 : item.text.indexOf('1st Red Card')) !== -1)) {
            let _time = item.text.split("'")[0].split("+");
            let firstCardTime = Number(_time[0]) * 60 + (Number(_time[1]) || 0);
            if (firstCardTime < targetTime) {
                card_num += 1;
            }
        }
    }
    if (oddType == "over") {
        if (card_num > handicap) {
            return 'WIN';
        }
        else if (card_num === handicap) {
            return 'REFUND';
        }
        else {
            return 'LOST';
        }
    }
    else if (oddType == "under") {
        if (card_num < handicap) {
            return 'WIN';
        }
        else if (card_num === handicap) {
            return 'REFUND';
        }
        else {
            return 'LOST';
        }
    }
    else {
        return 'REFUND';
    }
};
/**
 * Is both team get 2+ Card
 */
const getIsBoth2Card = ({ h_card, a_card, r_card }) => {
    if (h_card >= 2 && a_card >= 2 && r_card == "Yes") {
        return 'WIN';
    }
    else if ((h_card < 2 || a_card < 2) && r_card == "No") {
        return 'WIN';
    }
    else {
        return 'LOST';
    }
};
/**
 * Is Player to be booked
 */
const getIsPlayerBooked = ({ data, player }) => {
    for (var i = 0; i < data.events.length; i++) {
        let item = data.events[i];
        if ((item.text.includes('Red Card') || item.text.includes('Yellow Card')) && player.split(" ").findIndex((b) => item.text.includes(b)) !== -1) {
            return 'WIN';
        }
    }
    return 'LOST';
};
// Corner
/**
 * Match Corner
 */
const getCornerResult = ({ h_corner, a_corner, t_corner, r_corner, oddType }) => {
    if (h_corner === a_corner && oddType === 'draw') {
        return 'WIN';
    }
    else if (h_corner > a_corner && oddType === 'home') {
        return 'WIN';
    }
    else if (h_corner < a_corner && oddType === 'away') {
        return 'WIN';
    }
    else if (r_corner > t_corner && oddType === 'under') {
        return 'WIN';
    }
    else if (r_corner < t_corner && oddType === 'over') {
        return 'WIN';
    }
    else if (r_corner === t_corner && oddType === 'exactly') {
        return 'WIN';
    }
    else {
        return 'LOST';
    }
};
/**
 * Match Between Corner
 */
const getCornerBetweenResult = ({ h_corner, a_corner, t_corner, r_corner, oddType }) => {
    let r_corner_under_val = 0;
    let r_corner_over_val = 0;
    if (r_corner.indexOf("Under") !== -1) {
        r_corner_under_val = Number(r_corner.split(" ")[1]);
        if (t_corner < r_corner_under_val) {
            return 'WIN';
        }
        else if (t_corner === r_corner_under_val) {
            return 'REFUND';
        }
        else {
            return 'LOST';
        }
    }
    else if (r_corner.indexOf("Over") !== -1) {
        r_corner_over_val = Number(r_corner.split(" ")[1]);
        if (t_corner > r_corner_over_val) {
            return 'WIN';
        }
        else if (t_corner === r_corner_over_val) {
            return 'REFUND';
        }
        else {
            return 'LOST';
        }
    }
    else {
        if (r_corner.indexOf(" - ") !== -1 && r_corner.split(" - ").length > 1) {
            r_corner_under_val = Number(r_corner.split(" - ")[0]);
            r_corner_over_val = Number(r_corner.split(" - ")[1]);
            if (t_corner < r_corner_over_val && t_corner > r_corner_under_val) {
                return 'WIN';
            }
            else if ((t_corner === r_corner_over_val && t_corner > r_corner_under_val) || (t_corner < r_corner_over_val && t_corner === r_corner_under_val) || (t_corner < r_corner_over_val && t_corner === r_corner_under_val) || (t_corner === r_corner_over_val && t_corner > r_corner_under_val)) {
                return 'REFUND';
            }
            else {
                return 'LOST';
            }
        }
        else {
            return 'REFUND';
        }
    }
};
/**
 * The time when get Corner
 */
const getTimeFistCorner = ({ t_corner, data, targetTime }) => {
    const noCornerBefore = 'no corner before';
    const cornerBefore = 'corner before';
    const _targetTime = targetTime.toLowerCase();
    for (let i = 0; i < data.events.length; i++) {
        let item = data.events[i];
        if (item === null || item === void 0 ? void 0 : item.text.includes(' - 1st Corner - ')) {
            let timeParts = item.text.split("'")[0].split("+");
            let firstCornerTime = Number(timeParts[0]) * 60 + (Number(timeParts[1] || 0));
            let tragetTimeParts = _targetTime.split(" ");
            let tragetTImeT = tragetTimeParts[tragetTimeParts.length - 1];
            let newTargetTime = Number(tragetTImeT.split(":")[0]) * 60 + Number(tragetTImeT.split(":")[1] || 0);
            if (_targetTime.includes(noCornerBefore)) {
                if (newTargetTime > firstCornerTime) {
                    return 'WIN';
                }
                else {
                    return 'LOST';
                }
            }
            else if (_targetTime.includes(cornerBefore)) {
                if (newTargetTime < firstCornerTime) {
                    return 'WIN';
                }
                else {
                    return 'LOST';
                }
            }
            break; // Exit the loop after processing the first corner event
        }
    }
    return 'REFUND';
};
/**
 * The corners Race Calculate
 */
const getCornersRace = ({ data, handicap, oddType }) => {
    let h_card_num = 0;
    let a_card_num = 0;
    for (var i = 0; i < data.events.length; i++) {
        let item = data.events[i];
        if (item === null || item === void 0 ? void 0 : item.text.includes(' Corner - ')) {
            if (item === null || item === void 0 ? void 0 : item.text.includes(data.home.name)) {
                h_card_num += 1;
            }
            else if (item === null || item === void 0 ? void 0 : item.text.includes(data.away.name)) {
                a_card_num += 1;
            }
        }
    }
    if (oddType === "neither") {
        if (h_card_num < handicap && a_card_num < handicap) {
            return 'WIN';
        }
        else {
            return 'LOST';
        }
    }
    else {
        if (oddType === "home" && h_card_num >= handicap && h_card_num > a_card_num) {
            return 'WIN';
        }
        else if (oddType === "away" && a_card_num >= handicap && h_card_num < a_card_num) {
            return 'WIN';
        }
        else {
            return 'LOST';
        }
    }
};
/**
 * The First Corner
 */
const getFirstCorner = ({ data, oddType }) => {
    for (let i = 0; i < data.events.length; i++) {
        let item = data.events[i];
        if (item === null || item === void 0 ? void 0 : item.text.includes(' Corner - ')) {
            if (item === null || item === void 0 ? void 0 : item.text.includes(data.home.name)) {
                if (oddType === "home") {
                    return 'WIN';
                }
                else if (oddType === "away") {
                    return 'LOST';
                }
                else {
                    return 'REFUND';
                }
            }
            else if (item === null || item === void 0 ? void 0 : item.text.includes(data.away.name)) {
                if (oddType === "home") {
                    return 'LOST';
                }
                else if (oddType === "away") {
                    return 'WIN';
                }
                else {
                    return 'REFUND';
                }
            }
            break; // Exit the loop after the first corner is found
        }
    }
    return 'REFUND';
};
/**
 * The Last Corner
 */
const getLastCorner = ({ data, oddType }) => {
    let is_h_corner = false;
    let is_a_corner = false;
    for (var i = 0; i < data.events.length; i++) {
        let item = data.events[i];
        if (item === null || item === void 0 ? void 0 : item.text.includes(' Corner - ')) {
            is_h_corner = false;
            is_a_corner = false;
            if (item === null || item === void 0 ? void 0 : item.text.includes(data.home.name)) {
                is_h_corner = true;
            }
            else if (item === null || item === void 0 ? void 0 : item.text.includes(data.away.name)) {
                is_a_corner = true;
            }
        }
    }
    if (oddType === "home") {
        if (is_h_corner) {
            return 'WIN';
        }
        else {
            return 'LOST';
        }
    }
    else if (oddType === "away") {
        if (is_a_corner) {
            return 'WIN';
        }
        else {
            return 'LOST';
        }
    }
    else {
        return 'REFUND';
    }
};
/**
 * Is First corner in 1 min
 */
const getIsSelectedTimeFistCorner = ({ data, header, targetTime }) => {
    let result = 'REFUND';
    for (var i = 0; i < data.events.length; i++) {
        let item = data.events[i];
        if ((item === null || item === void 0 ? void 0 : item.text.includes(' - 1st Corner - '))) {
            let time = item.text.split(' - 1st ');
            if (time.length > 0 && time[0].split("+").length > 0 && time[0].split("+")[0].split("'").length > 0) {
                time = time[0].split("+")[0].split("'")[0];
                if (header === "Yes") {
                    if (time < targetTime) {
                        return 'WIN';
                    }
                    else {
                        return 'LOST';
                    }
                }
                else if (header === "No") {
                    if (time > targetTime) {
                        return 'WIN';
                    }
                    else {
                        return 'LOST';
                    }
                }
                else {
                    return 'REFUND';
                }
            }
        }
    }
    return result;
};
//goal
const teamTotalGoals = ({ h_score, a_score, oddType, underOver, handicap }) => {
    if (underOver == "under") {
        if (oddType === 'home') {
            if (h_score < handicap) {
                return "WIN";
            }
            else if (h_score === handicap) {
                return "REFUND";
            }
            else {
                return 'LOST';
            }
        }
        else if (oddType === 'away') {
            if (a_score < handicap) {
                return "WIN";
            }
            else if (a_score === handicap) {
                return "REFUND";
            }
            else {
                return 'LOST';
            }
        }
        else {
            return "REFUND";
        }
    }
    else if (underOver == "over") {
        if (oddType === 'home') {
            if (h_score > handicap) {
                return "WIN";
            }
            else if (h_score === handicap) {
                return "REFUND";
            }
            else {
                return 'LOST';
            }
        }
        else if (oddType === 'away') {
            if (a_score > handicap) {
                return "WIN";
            }
            else if (a_score === handicap) {
                return "REFUND";
            }
            else {
                return 'LOST';
            }
        }
        else {
            return "REFUND";
        }
    }
    else {
        return "REFUND";
    }
};
/**
 * Get Result of tatal goals
 */
const getOddtypeUnderOverHandicap = ({ h_score, a_score, oddType, underOver, handicap }) => {
    if (underOver == "under") {
        if (oddType === 'home') {
            if (h_score < handicap && h_score > a_score) {
                return "WIN";
            }
            else if (h_score === handicap && h_score > a_score) {
                return "REFUND";
            }
            else {
                return 'LOST';
            }
        }
        else if (oddType === 'away') {
            if (a_score < handicap && a_score > h_score) {
                return "WIN";
            }
            else if (a_score === handicap && a_score > h_score) {
                return "REFUND";
            }
            else {
                return 'LOST';
            }
        }
        else if (oddType === 'draw') {
            if (a_score < handicap && a_score === h_score) {
                return "WIN";
            }
            else if (a_score === handicap && a_score === h_score) {
                return "REFUND";
            }
            else {
                return 'LOST';
            }
        }
        else {
            return "REFUND";
        }
    }
    else if (underOver == "over") {
        if (oddType === 'home') {
            if (h_score > handicap && h_score > a_score) {
                return "WIN";
            }
            else if (h_score === handicap && h_score > a_score) {
                return "REFUND";
            }
            else {
                return 'LOST';
            }
        }
        else if (oddType === 'away') {
            if (a_score > handicap && a_score > h_score) {
                return "WIN";
            }
            else if (a_score === handicap && a_score > h_score) {
                return "REFUND";
            }
            else {
                return 'LOST';
            }
        }
        else if (oddType === 'draw') {
            if (a_score > handicap && a_score === h_score) {
                return "WIN";
            }
            else if (a_score === handicap && a_score === h_score) {
                return "REFUND";
            }
            else {
                return 'LOST';
            }
        }
        else {
            return "REFUND";
        }
    }
    else {
        return "REFUND";
    }
};
/**
 * Get Result of tatal goals
 */
const getTotalGoalBothTeamScore = ({ t_score, _betType }) => {
    let betType = _betType.toLowerCase();
    if (betType.indexOf("over") !== -1) {
        if (betType.indexOf("yes") !== -1) {
            if (betType.split(" ").length > 1 && Number(betType.split(" ")[1]) > 0) {
                let handicap = Number(betType.split(" ")[1]);
                if (t_score > handicap) {
                    return "WIN";
                }
                else if (t_score === handicap) {
                    return "REFUND";
                }
                else {
                    return 'LOST';
                }
            }
            else {
                return "REFUND";
            }
        }
        else if (betType.indexOf("no") !== -1) {
            if (betType.split(" ").length > 1 && Number(betType.split(" ")[1]) > 0) {
                let handicap = Number(betType.split(" ")[1]);
                if (t_score < handicap) {
                    return "WIN";
                }
                else if (t_score === handicap) {
                    return "REFUND";
                }
                else {
                    return 'LOST';
                }
            }
            else {
                return "REFUND";
            }
        }
        else {
            return "REFUND";
        }
    }
    else if (betType.indexOf("under") !== -1) {
        if (betType.indexOf("yes") !== -1) {
            if (betType.split(" ").length > 1 && Number(betType.split(" ")[1]) > 0) {
                let handicap = Number(betType.split(" ")[1]);
                if (t_score < handicap) {
                    return "WIN";
                }
                else if (t_score === handicap) {
                    return "REFUND";
                }
                else {
                    return 'LOST';
                }
            }
            else {
                return "REFUND";
            }
        }
        else if (betType.indexOf("no") !== -1) {
            if (betType.split(" ").length > 1 && Number(betType.split(" ")[1]) > 0) {
                let handicap = Number(betType.split(" ")[1]);
                if (t_score > handicap) {
                    return "WIN";
                }
                else if (t_score === handicap) {
                    return "REFUND";
                }
                else {
                    return 'LOST';
                }
            }
            else {
                return "REFUND";
            }
        }
        else {
            return "REFUND";
        }
    }
    else {
        return "REFUND";
    }
};
/**
 * The Number of goal in match
 */
const getNumberGoalMatch = ({ t_score, _betType }) => {
    let betType = _betType.toLowerCase();
    if (betType.indexOf("over") !== -1) {
        if (betType.split(" ").length > 1 && Number(betType.split(" ")[1]) > 0) {
            let handicap = Number(betType.split(" ")[1]);
            if (t_score > handicap) {
                return "WIN";
            }
            else if (t_score === handicap) {
                return "REFUND";
            }
            else {
                return 'LOST';
            }
        }
        else {
            return "REFUND";
        }
    }
    else if (betType.indexOf("under") !== -1) {
        if (betType.split(" ").length > 1 && Number(betType.split(" ")[1]) > 0) {
            let handicap = Number(betType.split(" ")[1]);
            if (t_score < handicap) {
                return "WIN";
            }
            else if (t_score === handicap) {
                return "REFUND";
            }
            else {
                return 'LOST';
            }
        }
        else {
            return "REFUND";
        }
    }
    else if (betType.indexOf("or") !== -1) {
        if (betType.split(" ").length > 2 && Number(betType.split(" ")[0]) > 0 && Number(betType.split(" ")[2]) > 0) {
            let underHandicap = Number(betType.split(" ")[0]);
            let overHandicap = Number(betType.split(" ")[2]);
            if (t_score === underHandicap || t_score === overHandicap) {
                return "WIN";
            }
            else {
                return 'LOST';
            }
        }
        else {
            return "REFUND";
        }
    }
    else {
        return "REFUND";
    }
};
/**
 * The both team in score
 */
const getBothTeamScore = ({ h_score, a_score, _betType }) => {
    let betType = _betType.toLowerCase();
    if (betType.includes("yes")) {
        if (h_score > 0 && a_score > 0) {
            return "WIN";
        }
        else {
            return 'LOST';
        }
    }
    else if (betType.includes("no")) {
        if (h_score === 0 || a_score === 0) {
            return "WIN";
        }
        else {
            return 'LOST';
        }
    }
    else {
        return "REFUND";
    }
};
/**
 * Early Goal
 */
const getEarlyGoal = ({ data, targetTime }) => {
    let result = 'REFUND';
    let _targetTime = targetTime.toLowerCase();
    let no_goal = 'no goal before';
    let goal = 'goal before';
    const getLastGoalTime = (events) => {
        let lastGoalTime = 130 * 60;
        for (let i = 0; i < events.length; i++) {
            let item = events[i];
            if (item === null || item === void 0 ? void 0 : item.text.includes(' Goal - ')) {
                const timeParts = item.text.split("'")[0].split("+");
                const minutes = parseInt(timeParts[0], 10);
                const seconds = timeParts.length > 1 ? parseInt(timeParts[1], 10) : 0;
                const totalSeconds = minutes * 60 + seconds;
                if (totalSeconds < lastGoalTime) {
                    lastGoalTime = totalSeconds;
                }
            }
        }
        return lastGoalTime;
    };
    const lastGoalTime = getLastGoalTime(data.events);
    const newTargetTime = _targetTime.split(' ');
    if (_targetTime.includes(no_goal)) {
        let time = newTargetTime[newTargetTime.length - 1].split(":");
        let targett = (Number(time[0]) * 60 + Number(time[1]));
        if (lastGoalTime > targett) {
            result = 'WIN';
        }
        else {
            result = 'LOST';
        }
    }
    else if (_targetTime.includes(goal)) {
        let time = newTargetTime[newTargetTime.length - 1].split(":");
        let targett = (Number(time[0]) * 60 + Number(time[1]));
        if (lastGoalTime < targett) {
            result = 'WIN';
        }
        else {
            result = 'LOST';
        }
    }
    return result;
};
/**
 * Late Goal
 */
const getLastGoal = ({ data, _targetTime }) => {
    let result = 'REFUND';
    let no_goal = 'no goal after';
    let goal = 'goal after';
    let targetTime = _targetTime.toLowerCase();
    const getLastGoalTime = (events) => {
        let lastGoalTime = 0;
        for (let i = 0; i < events.length; i++) {
            let item = events[i];
            if (item === null || item === void 0 ? void 0 : item.text.includes(' Goal - ')) {
                const timeParts = item.text.split("'")[0].split("+");
                const minutes = parseInt(timeParts[0], 10);
                const seconds = timeParts.length > 1 ? parseInt(timeParts[1], 10) : 0;
                const totalSeconds = minutes * 60 + seconds;
                if (totalSeconds > lastGoalTime) {
                    lastGoalTime = totalSeconds;
                }
            }
        }
        return lastGoalTime;
    };
    const lastGoalTime = getLastGoalTime(data.events);
    const newTargetTime = targetTime.split(' ');
    if (targetTime.includes(no_goal)) {
        let time = newTargetTime[newTargetTime.length - 1].split(":");
        let targett = (Number(time[0]) * 60 + Number(time[1]));
        if (lastGoalTime > targett) {
            result = 'LOST';
        }
        else {
            result = 'WIN';
        }
    }
    else if (targetTime.includes(goal)) {
        let time = newTargetTime[newTargetTime.length - 1].split(":");
        let targett = (Number(time[0]) * 60 + Number(time[1]));
        if (lastGoalTime > targett) {
            result = 'WIN';
        }
        else {
            result = 'LOST';
        }
    }
    return result;
};
/**s
 * Is Odd or Even
 */
const getIsOddEven = ({ t_val, oddType }) => {
    if (oddType === "even") {
        if (t_val % 2 === 0) {
            return 'WIN';
        }
        else {
            return 'LOST';
        }
    }
    else if (oddType === "odd") {
        if (t_val % 2 === 0) {
            return 'LOST';
        }
        else {
            return 'WIN';
        }
    }
    else {
        return 'REFUND';
    }
};
/**
 * The selected min time get total Goal
 */
const getSelectedTimeFistGoal = ({ data, handicap, oddType, targetTime }) => {
    let card_num = 0;
    for (var i = 0; i < data.events.length; i++) {
        let item = data.events[i];
        if (item === null || item === void 0 ? void 0 : item.text.includes(' - 1st Goal - ')) {
            let timeParts = item.text.split("'")[0].split("+");
            let time = (Number(timeParts[0]) * 60 + Number(timeParts[1] || 0));
            if (time < (targetTime * 60 - 1)) {
                card_num += 1;
            }
        }
    }
    if (oddType == "over") {
        if (card_num > handicap) {
            return 'WIN';
        }
        else if (card_num === handicap) {
            return 'REFUND';
        }
        else {
            return 'LOST';
        }
    }
    else if (oddType == "under") {
        if (card_num < handicap) {
            return 'WIN';
        }
        else if (card_num === handicap) {
            return 'REFUND';
        }
        else {
            return 'LOST';
        }
    }
    else {
        return 'REFUND';
    }
};
/**
 * Is First Goal in 1 min
 */
const getIsSelectedTimeFistGoal = ({ data, header, targetTime }) => {
    let result = 'REFUND';
    for (var i = 0; i < data.events.length; i++) {
        let item = data.events[i];
        if (item === null || item === void 0 ? void 0 : item.text.includes(' - 1st Goal - ')) {
            let timeParts = item.text.split("'")[0].split("+");
            let time = (Number(timeParts[0]) * 60 + Number(timeParts[1] || 0));
            if (header === "Yes") {
                if (time < targetTime * 60) {
                    return 'WIN';
                }
                else {
                    return 'LOST';
                }
            }
            else if (header === "No") {
                if (time > targetTime * 60) {
                    return 'WIN';
                }
                else {
                    return 'LOST';
                }
            }
            else {
                return 'REFUND';
            }
        }
    }
    ;
    return result;
};
// Half
/**
 * Half time double chance
 */
const getHalfDoubleChance = ({ data, h_score, a_score, betType }) => {
    if (betType.includes(data.home.name) && betType.includes("Draw")) {
        if (h_score === a_score || h_score > a_score) {
            return "WIN";
        }
        else {
            return 'LOST';
        }
    }
    else if (betType.includes(data.away.name) && betType.includes("Draw")) {
        if (h_score === a_score || a_score > h_score) {
            return "WIN";
        }
        else {
            return 'LOST';
        }
    }
    else if (betType.includes(data.home.name) && betType.includes(data.away.name)) {
        if (h_score === a_score) {
            return 'LOST';
        }
        else {
            return "WIN";
        }
    }
    else {
        return "REFUND";
    }
};
/**
 * Half time correct score
 */
const getHalfCorrectScore = ({ h_score, a_score, result, oddType }) => {
    if (oddType === "away") {
        let temp = h_score;
        h_score = a_score;
        a_score = temp;
    }
    if (result.split("-").length > 1) {
        let h_result = Number(result.split("-")[0]);
        let a_result = Number(result.split("-")[1]);
        if (h_result === h_score && a_result === a_score) {
            return "WIN";
        }
        else {
            return 'LOST';
        }
    }
    else {
        return "REFUND";
    }
};
/**
 * Half time correct score
 */
const getScoreHalf = ({ h_f_score, a_f_score, h_s_score, a_s_score, header, name, oddType }) => {
    if (name.includes("1st")) {
        if (oddType === "home") {
            if (header === "Yes") {
                if (h_f_score > 0) {
                    return "WIN";
                }
                else {
                    return 'LOST';
                }
            }
            else if (header === "No") {
                if (h_f_score === 0) {
                    return "WIN";
                }
                else {
                    return 'LOST';
                }
            }
            else {
                return "REFUND";
            }
        }
        else if (oddType === "away") {
            if (header === "Yes") {
                if (a_f_score > 0) {
                    return "WIN";
                }
                else {
                    return 'LOST';
                }
            }
            else if (header === "No") {
                if (a_f_score === 0) {
                    return "WIN";
                }
                else {
                    return 'LOST';
                }
            }
            else {
                return "REFUND";
            }
        }
        else {
            return "REFUND";
        }
    }
    else if (name.includes("2nd")) {
        if (oddType === "home") {
            if (header === "Yes") {
                if (h_s_score > 0) {
                    return "WIN";
                }
                else {
                    return 'LOST';
                }
            }
            else if (header === "No") {
                if (h_s_score === 0) {
                    return "WIN";
                }
                else {
                    return 'LOST';
                }
            }
            else {
                return "REFUND";
            }
        }
        else if (oddType === "away") {
            if (header === "Yes") {
                if (a_s_score > 0) {
                    return "WIN";
                }
                else {
                    return 'LOST';
                }
            }
            else if (header === "No") {
                if (a_s_score === 0) {
                    return "WIN";
                }
                else {
                    return 'LOST';
                }
            }
            else {
                return "REFUND";
            }
        }
        else {
            return "REFUND";
        }
    }
    else {
        return "REFUND";
    }
};
// main
// Result/Both teams to score
const getIsResultBothScore = ({ h_score, a_score, header, oddType }) => {
    if (oddType === "home") {
        if (header === "Yes") {
            if (h_score > 0 && a_score > 0 && h_score > a_score) {
                return "WIN";
            }
            else {
                return 'LOST';
            }
        }
        else if (header === "No") {
            if ((h_score === 0 || a_score === 0) && h_score > a_score) {
                return "WIN";
            }
            else {
                return 'LOST';
            }
        }
        else {
            return "REFUND";
        }
    }
    else if (oddType === "away") {
        if (header === "Yes") {
            if (h_score > 0 && a_score > 0 && a_score > h_score) {
                return "WIN";
            }
            else {
                return 'LOST';
            }
        }
        else if (header === "No") {
            if ((h_score === 0 || a_score === 0) && a_score > h_score) {
                return "WIN";
            }
            else {
                return 'LOST';
            }
        }
        else {
            return "REFUND";
        }
    }
    else if (oddType === "draw") {
        if (header === "Yes") {
            if (h_score > 0 && a_score > 0 && a_score === h_score) {
                return "WIN";
            }
            else {
                return 'LOST';
            }
        }
        else if (header === "No") {
            if ((h_score === 0 || a_score === 0) && a_score === h_score) {
                return "WIN";
            }
            else {
                return 'LOST';
            }
        }
        else {
            return "REFUND";
        }
    }
    else {
        return "REFUND";
    }
};
/**
 * Half time Full time
 */
const getHalfFullScore = ({ data, f_h_score, f_a_score, h_score, a_score, betType }) => {
    if (betType.split(" - ").length > 1) {
        let r_f_score = betType.split(" - ")[0];
        let r_t_score = betType.split(" - ")[1];
        if (r_f_score === data.home.name) {
            if (f_h_score > f_a_score) {
                if (r_t_score === data.home.name) {
                    if (h_score > a_score) {
                        return "WIN";
                    }
                    else {
                        return 'LOST';
                    }
                }
                else if (r_t_score === data.away.name) {
                    if (a_score > h_score) {
                        return "WIN";
                    }
                    else {
                        return 'LOST';
                    }
                }
                else if (r_t_score === "Draw") {
                    if (h_score === a_score) {
                        return "WIN";
                    }
                    else {
                        return 'LOST';
                    }
                }
                else {
                    return "REFUND";
                }
            }
            else {
                return 'LOST';
            }
        }
        else if (r_f_score === data.away.name) {
            if (f_a_score > f_h_score) {
                if (r_t_score === data.home.name) {
                    if (h_score > a_score) {
                        return "WIN";
                    }
                    else {
                        return 'LOST';
                    }
                }
                else if (r_t_score === data.away.name) {
                    if (a_score > h_score) {
                        return "WIN";
                    }
                    else {
                        return 'LOST';
                    }
                }
                else if (r_t_score === "Draw") {
                    if (h_score === a_score) {
                        return "WIN";
                    }
                    else {
                        return 'LOST';
                    }
                }
                else {
                    return "REFUND";
                }
            }
            else {
                return 'LOST';
            }
        }
        else if (r_f_score === "Draw") {
            if (f_h_score === f_a_score) {
                if (r_t_score === data.home.name) {
                    if (h_score > a_score) {
                        return "WIN";
                    }
                    else {
                        return 'LOST';
                    }
                }
                else if (r_t_score === data.away.name) {
                    if (a_score > h_score) {
                        return "WIN";
                    }
                    else {
                        return 'LOST';
                    }
                }
                else if (r_t_score === "Draw") {
                    if (h_score === a_score) {
                        return "WIN";
                    }
                    else {
                        return 'LOST';
                    }
                }
                else {
                    return "REFUND";
                }
            }
            else {
                return 'LOST';
            }
        }
        else {
            return "REFUND";
        }
    }
    else {
        return "REFUND";
    }
};
/**
 * The player goal score in match
 */
const getPlayerGoalScore = ({ data, betType, playerName, t_score }) => {
    let fullNames = playerName.split(" ");
    let _playername = fullNames[1] || fullNames[0];
    for (var i = 0; i < data.events.length; i++) {
        let item = data.events[i];
        if (item === null || item === void 0 ? void 0 : item.text.includes(' - 1st Goal - ')) {
            if (betType === "First") {
                if (item === null || item === void 0 ? void 0 : item.text.includes(_playername)) {
                    return 'WIN';
                }
                else {
                    return 'LOST';
                }
            }
        }
        if (item === null || item === void 0 ? void 0 : item.text.includes(' Goal - ')) {
            if (betType === "Anytime") {
                if (item === null || item === void 0 ? void 0 : item.text.includes(_playername)) {
                    return 'WIN';
                }
            }
            if (betType === "Last") {
                if (item === null || item === void 0 ? void 0 : item.text.includes(`' - ${t_score.toString()}`)) {
                    if (item === null || item === void 0 ? void 0 : item.text.includes(_playername)) {
                        return 'WIN';
                    }
                    else {
                        return 'LOST';
                    }
                }
            }
        }
    }
    if (betType === "Anytime") {
        return 'LOST';
    }
    else {
        return 'REFUND';
    }
};
/**
 * The Two handicap
 */
const getTwoHandicap = ({ h_score, a_score, handicap, oddType }) => {
    if (handicap.split(", ").length > 1) {
        let min_handicap = Number(handicap.split(", ")[0]);
        let max_handicap = Number(handicap.split(", ")[1]);
        if (oddType == "home") {
            if (min_handicap === 0.0 && max_handicap === 0.5) {
                if (h_score > a_score) {
                    return 'WIN';
                }
                else if (h_score === a_score) {
                    return "HALF_WIN";
                }
                else {
                    return 'LOST';
                }
            }
            else {
                return 'REFUND';
            }
        }
        else if (oddType == "away") {
            if (min_handicap === 0.0 && max_handicap === -0.5) {
                if (a_score > h_score) {
                    return 'WIN';
                }
                else if (a_score === h_score) {
                    return 'LOST';
                }
                else {
                    return 'LOST';
                }
            }
            else {
                return 'REFUND';
            }
        }
        else {
            return 'REFUND';
        }
    }
    else {
        return 'REFUND';
    }
};
/**
 * The Goal Line
 */
const getGoalLine = ({ t_score, handicap, oddType }) => {
    if (handicap.split(", ").length > 1) {
        let min_handicap = Math.floor(Number(handicap.split(", ")[0]));
        let max_handicap = Math.floor(Number(handicap.split(", ")[1]));
        if (oddType == "over") {
            if (t_score > max_handicap) {
                return 'WIN';
            }
            else if (t_score === max_handicap) {
                return "HALF_WIN";
            }
            else {
                return 'LOST';
            }
        }
        else if (oddType == "under") {
            if (t_score < min_handicap) {
                return 'WIN';
            }
            else if (t_score === min_handicap) {
                return "HALF_WIN";
            }
            else {
                return 'LOST';
            }
        }
        else {
            return 'REFUND';
        }
    }
    else {
        let min_handicap = Math.floor(Number(handicap));
        let max_handicap = Math.floor(Number(handicap));
        if (oddType == "over") {
            if (t_score > max_handicap) {
                return 'WIN';
            }
            else if (t_score === max_handicap) {
                return "HALF_WIN";
            }
            else {
                return 'LOST';
            }
        }
        else if (oddType == "under") {
            if (t_score < min_handicap) {
                return 'WIN';
            }
            else if (t_score === min_handicap) {
                return "HALF_WIN";
            }
            else {
                return 'LOST';
            }
        }
        else {
            return 'REFUND';
        }
    }
};
// Special
/**
 * The Specical Odd
 */
const getSpecicalSpOdd = ({ h_score, a_score, oddType, betType, data }) => {
    const f_score = getSHScore(data.scores);
    const s_score = getSScore(data.scores);
    let _betType = betType.toLowerCase();
    if (oddType === "home") {
        if (_betType === "to win from behind") {
            if (Object.keys(data.scores).length > 2 && h_score > a_score) {
                return 'WIN';
            }
            else {
                return 'LOST';
            }
        }
        else if (_betType === "to win to nil") {
            if (h_score > a_score && a_score === 0) {
                return 'WIN';
            }
            else {
                return 'LOST';
            }
        }
        else if (_betType === "to win either half") {
            if (f_score.home > f_score.away) {
                return 'WIN';
            }
            else {
                return 'LOST';
            }
        }
        else if (_betType === "to win both halves") {
            if (f_score.home > f_score.away && h_score > a_score) {
                return 'WIN';
            }
            else {
                return 'LOST';
            }
        }
        else if (_betType === "to score in both halves") {
            if (f_score.home > 0 && s_score.home > 0) {
                return 'WIN';
            }
            else {
                return 'LOST';
            }
        }
        else {
            return 'REFUND';
        }
    }
    else if (oddType === "away") {
        if (_betType === "to win from behind") {
            if (Object.keys(data.scores).length > 2 && a_score > h_score) {
                return 'WIN';
            }
            else {
                return 'LOST';
            }
        }
        else if (_betType === "to win to nil") {
            if (a_score > h_score && h_score === 0) {
                return 'WIN';
            }
            else {
                return 'LOST';
            }
        }
        else if (_betType === "to win either half") {
            if (f_score.away > f_score.home) {
                return 'WIN';
            }
            else {
                return 'LOST';
            }
        }
        else if (_betType === "to win both halves") {
            if (f_score.away > f_score.home && a_score > h_score) {
                return 'WIN';
            }
            else {
                return 'LOST';
            }
        }
        else if (_betType === "to score in both halves") {
            if (f_score.away > 0 && s_score.away > 0) {
                return 'WIN';
            }
            else {
                return 'LOST';
            }
        }
        else {
            return 'REFUND';
        }
    }
    else {
        return 'REFUND';
    }
};
/**
 * The Goal With Penalty
 */
const getGoalWithPenalty = ({ betType, data }) => {
    let result = 'LOST';
    for (var i = 0; i < data.events.length; i++) {
        let item = data.events[i];
        if (betType.includes(data.home.name)) {
            if (((item === null || item === void 0 ? void 0 : item.text.includes(' Goal - ')) && (item === null || item === void 0 ? void 0 : item.text.includes(data.home.name))) && (item === null || item === void 0 ? void 0 : item.text.includes('Penalty'))) {
                return 'WIN';
            }
        }
        else if (betType.includes(data.away.name)) {
            if (((item === null || item === void 0 ? void 0 : item.text.includes(' Goal - ')) && (item === null || item === void 0 ? void 0 : item.text.includes(data.away.name))) && (item === null || item === void 0 ? void 0 : item.text.includes('Penalty'))) {
                return 'WIN';
            }
        }
    }
    return result;
};
/**
 * The Miss Penalty
 */
const getMissPenalty = ({ betType, data }) => {
    let result = 'LOST';
    for (var i = 0; i < data.events.length; i++) {
        let item = data.events[i];
        if (betType.includes(data.home.name)) {
            if ((item === null || item === void 0 ? void 0 : item.text.includes(data.home.name)) && (item === null || item === void 0 ? void 0 : item.text.includes(' Missed Penalty -'))) {
                return 'WIN';
            }
        }
        else if (betType.includes(data.away.name)) {
            if ((item === null || item === void 0 ? void 0 : item.text.includes(data.away.name)) && (item === null || item === void 0 ? void 0 : item.text.includes(' Missed Penalty -'))) {
                return 'WIN';
            }
        }
    }
    return result;
};
/**
 * The Own Goal
 */
const getOwnGoal = ({ betType, data }) => {
    let isOwnGoal = false;
    let result = 'REFUND';
    for (var i = 0; i < data.events.length; i++) {
        let item = data.events[i];
        if (item === null || item === void 0 ? void 0 : item.text.includes('- Own Goal')) {
            isOwnGoal = true;
            if (betType === "yes") {
                result = 'WIN';
            }
        }
    }
    if (betType === "no") {
        if (isOwnGoal) {
            result = 'LOST';
        }
        else {
            result = 'WIN';
        }
    }
    else if (betType === "yes") {
        result = 'LOST';
    }
    return result;
};
/**
 * The Team Performances
 */
const getTeamPerformances = ({ handicap, oddType, data }) => {
    let homeEventNumber = 0;
    let awayEventNumber = 0;
    let result = 'REFUND';
    let _handicap = handicap.toLowerCase();
    for (var i = 0; i < data.events.length; i++) {
        let item = data.events[i];
        if (item === null || item === void 0 ? void 0 : item.text.includes(data.home.name)) {
            homeEventNumber += 1;
        }
        else if (item === null || item === void 0 ? void 0 : item.text.includes(data.away.name)) {
            awayEventNumber += 1;
        }
    }
    if (_handicap.includes("over") && _handicap.split("over ").length > 1) {
        let handicapVal = Number(_handicap.split("over ")[1]);
        if (oddType === "home") {
            if (handicapVal < homeEventNumber) {
                return 'WIN';
            }
            else if (handicapVal === homeEventNumber) {
                return 'REFUND';
            }
            else {
                return 'LOST';
            }
        }
        else if (oddType === "away") {
            if (handicapVal < awayEventNumber) {
                return 'WIN';
            }
            else if (handicapVal === awayEventNumber) {
                return 'REFUND';
            }
            else {
                return 'LOST';
            }
        }
    }
    else if (_handicap.includes("under") && _handicap.split("under ").length > 1) {
        let handicapVal = Number(_handicap.split("under ")[1]);
        if (oddType === "home") {
            if (handicapVal > homeEventNumber) {
                return 'WIN';
            }
            else if (handicapVal === homeEventNumber) {
                return 'REFUND';
            }
            else {
                return 'LOST';
            }
        }
        else if (oddType === "away") {
            if (handicapVal > awayEventNumber) {
                return 'WIN';
            }
            else if (handicapVal === awayEventNumber) {
                return 'REFUND';
            }
            else {
                return 'LOST';
            }
        }
    }
    else {
        return 'REFUND';
    }
    return result;
};
/**
 * The on shot
 */
const getOnShot = ({ handicap, oddType, data }) => {
    let onShotNumber = 0;
    // for (var i = 0; i < data.events.length; i++) {
    //     let item = data.events[i];
    //     let text = item?.text.toLowerCase();
    //     if (text && text.includes(" shot on target - ")) {
    //         onShotNumber += 1;
    //     }
    // }
    onShotNumber = (Number(data.stats.on_target[0] || 0) + Number(data.stats.on_target[1] || 0));
    if (oddType === "over") {
        if (handicap < onShotNumber) {
            return 'WIN';
        }
        else if (handicap === onShotNumber) {
            return 'REFUND';
        }
        else {
            return 'LOST';
        }
    }
    else if (oddType === "under") {
        if (handicap > onShotNumber) {
            return 'WIN';
        }
        else if (handicap === onShotNumber) {
            return 'REFUND';
        }
        else {
            return 'LOST';
        }
    }
    else {
        return 'REFUND';
    }
};
/**
 * The on shot or off shot
 */
const getShot = ({ handicap, oddType, data }) => {
    let ShotNumber = 0;
    // for (var i = 0; i < data.events.length; i++) {
    //     let item = data.events[i];
    //     let text = item?.text.toLowerCase();
    //     if (text && text.includes(" shot on ") || text.includes(" shot off ")) {
    //         ShotNumber += 1;
    //     }
    // }
    ShotNumber = (Number(data.stats.on_target[0] || 0) + Number(data.stats.on_target[1] || 0));
    ShotNumber += (Number(data.stats.off_target[0] || 0) + Number(data.stats.off_target[1] || 0));
    if (oddType === "over") {
        if (handicap < ShotNumber) {
            return 'WIN';
        }
        else if (handicap === ShotNumber) {
            return 'REFUND';
        }
        else {
            return 'LOST';
        }
    }
    else if (oddType === "under") {
        if (handicap > ShotNumber) {
            return 'WIN';
        }
        else if (handicap === ShotNumber) {
            return 'REFUND';
        }
        else {
            return 'LOST';
        }
    }
    else {
        return 'REFUND';
    }
};
/**
 * The Team Shot on target
 */
const getTeamShotOnTarget = ({ betType, oddType, data }) => {
    let homeShotNumber = 0;
    let awayShotNumber = 0;
    let result = 'REFUND';
    // for (var i = 0; i < data.events.length; i++) {
    //     let item = data.events[i];
    //     let text = item?.text.toLowerCase();
    //     if (text && text.includes(" shot on target - ")) {
    //         if (text.includes(data.home.name.toLowerCase())) {
    //             homeShotNumber += 1;
    //         } else if (text.includes(data.away.name.toLowerCase())) {
    //             awayShotNumber += 1;
    //         }
    //     }
    // }
    homeShotNumber = (Number(data.stats.on_target[0] || 0));
    awayShotNumber = (Number(data.stats.on_target[1] || 0));
    if (oddType === "home") {
        if (betType.includes("over") && betType.split(" ").length > 1) {
            let handicap = Number(betType.split(" ")[1]);
            if (handicap < homeShotNumber) {
                return 'WIN';
            }
            else if (handicap === homeShotNumber) {
                return 'REFUND';
            }
            else {
                return 'LOST';
            }
        }
        else if (betType.includes("under") && betType.split(" ").length > 1) {
            let handicap = Number(betType.split(" ")[1]);
            if (handicap > homeShotNumber) {
                return 'WIN';
            }
            else if (handicap === homeShotNumber) {
                return 'REFUND';
            }
            else {
                return 'LOST';
            }
        }
        else {
            return 'REFUND';
        }
    }
    else if (oddType === "away") {
        if (betType.includes("over") && betType.split(" ").length > 1) {
            let handicap = Number(betType.split(" ")[1]);
            if (handicap < awayShotNumber) {
                return 'WIN';
            }
            else if (handicap === awayShotNumber) {
                return 'REFUND';
            }
            else {
                return 'LOST';
            }
        }
        else if (betType.includes("under") && betType.split(" ").length > 1) {
            let handicap = Number(betType.split(" ")[1]);
            if (handicap > awayShotNumber) {
                return 'WIN';
            }
            else if (handicap === awayShotNumber) {
                return 'REFUND';
            }
            else {
                return 'LOST';
            }
        }
        else {
            return 'REFUND';
        }
    }
    return result;
};
/**
 * The Team Shot
 */
const getTeamShot = ({ betType, oddType, data }) => {
    let homeShotNumber = 0;
    let awayShotNumber = 0;
    let result = 'REFUND';
    // for (var i = 0; i < data.events.length; i++) {
    //     let item = data.events[i];
    //     let text = item?.text.toLowerCase();
    //     if (text && text.includes(" shot on ") || text.includes(" shot off ")) {
    //         if (text.includes(data.home.name.toLowerCase())) {
    //             homeShotNumber += 1;
    //         } else if (text.includes(data.away.name.toLowerCase())) {
    //             awayShotNumber += 1;
    //         }
    //     }
    // }
    homeShotNumber = (Number(data.stats.on_target[0] || 0) + Number(data.stats.off_target[0] || 0));
    awayShotNumber = (Number(data.stats.on_target[1] || 0) + Number(data.stats.off_target[1] || 0));
    if (oddType === "home") {
        if (betType.includes("over") && betType.split(" ").length > 1) {
            let handicap = Number(betType.split(" ")[1]);
            if (handicap < homeShotNumber) {
                return 'WIN';
            }
            else if (handicap === homeShotNumber) {
                return 'REFUND';
            }
            else {
                return 'LOST';
            }
        }
        else if (betType.includes("under") && betType.split(" ").length > 1) {
            let handicap = Number(betType.split(" ")[1]);
            if (handicap > homeShotNumber) {
                return 'WIN';
            }
            else if (handicap === homeShotNumber) {
                return 'REFUND';
            }
            else {
                return 'LOST';
            }
        }
        else {
            return 'REFUND';
        }
    }
    else if (oddType === "away") {
        if (betType.indexOf("over") !== -1 && betType.split(" ").length > 1) {
            let handicap = Number(betType.split(" ")[1]);
            if (handicap < awayShotNumber) {
                return 'WIN';
            }
            else if (handicap === awayShotNumber) {
                return 'REFUND';
            }
            else {
                return 'LOST';
            }
        }
        else if (betType.indexOf("under") !== -1 && betType.split(" ").length > 1) {
            let handicap = Number(betType.split(" ")[1]);
            if (handicap > awayShotNumber) {
                return 'WIN';
            }
            else if (handicap === awayShotNumber) {
                return 'REFUND';
            }
            else {
                return 'LOST';
            }
        }
        else {
            return 'REFUND';
        }
    }
    return result;
};
/**
 * The Team Shot
 */
const getTeamTackles = ({ betType, oddType, data }) => {
    let homeShotNumber = 0;
    let awayShotNumber = 0;
    let result = 'REFUND';
    data.events.forEach((item, i) => {
        if ((item === null || item === void 0 ? void 0 : item.text.indexOf(" Shot ")) !== -1 && (item === null || item === void 0 ? void 0 : item.text.indexOf(data.home.name)) !== -1) {
            homeShotNumber += 1;
        }
        else if ((item === null || item === void 0 ? void 0 : item.text.indexOf(" Shot ")) !== -1 && (item === null || item === void 0 ? void 0 : item.text.indexOf(data.away.name)) !== -1) {
            awayShotNumber += 1;
        }
        if (i === data.events.length - 1) {
            if (oddType === "home") {
                if (betType.indexOf("Over") !== -1 && betType.split("Over ").length > 1) {
                    let handicap = Number(betType.split("Over ")[1]);
                    if (handicap < homeShotNumber) {
                        result = 'WIN';
                    }
                    else if (handicap === homeShotNumber) {
                        result = 'REFUND';
                    }
                    else {
                        result = 'LOST';
                    }
                }
                else if (betType.indexOf("Under") !== -1 && betType.split("Under ").length > 1) {
                    let handicap = Number(betType.split("Under ")[1]);
                    if (handicap > homeShotNumber) {
                        result = 'WIN';
                    }
                    else if (handicap === homeShotNumber) {
                        result = 'REFUND';
                    }
                    else {
                        result = 'LOST';
                    }
                }
                else {
                    result = 'REFUND';
                }
            }
            else if (oddType === "away") {
                if (betType.indexOf("Over") !== -1 && betType.split("Over ").length > 1) {
                    let handicap = Number(betType.split("Over ")[1]);
                    if (handicap < awayShotNumber) {
                        result = 'WIN';
                    }
                    else if (handicap === awayShotNumber) {
                        result = 'REFUND';
                    }
                    else {
                        result = 'LOST';
                    }
                }
                else if (betType.indexOf("Under") !== -1 && betType.split("Under ").length > 1) {
                    let handicap = Number(betType.split("Under ")[1]);
                    if (handicap > awayShotNumber) {
                        result = 'WIN';
                    }
                    else if (handicap === awayShotNumber) {
                        result = 'REFUND';
                    }
                    else {
                        result = 'LOST';
                    }
                }
                else {
                    result = 'REFUND';
                }
            }
        }
    });
    return result;
};
/**
 * The Off Sides
 */
const getTeamOffSide = ({ h_t_offSides, a_t_offSides, betType, oddType }) => {
    let bettype = betType.toLowerCase();
    if (oddType === "home") {
        if (bettype.indexOf("over") !== -1 && bettype.split(" ").length > 1) {
            let handicap = Number(bettype.split(" ")[1]);
            if (handicap < h_t_offSides) {
                return 'WIN';
            }
            else if (handicap === h_t_offSides) {
                return 'REFUND';
            }
            else {
                return 'LOST';
            }
        }
        else if (bettype.indexOf("under") !== -1 && bettype.split(" ").length > 1) {
            let handicap = Number(bettype.split(" ")[1]);
            if (handicap > h_t_offSides) {
                return 'WIN';
            }
            else if (handicap === h_t_offSides) {
                return 'REFUND';
            }
            else {
                return 'LOST';
            }
        }
        else {
            return 'REFUND';
        }
    }
    else if (oddType === "away") {
        if (bettype.indexOf("over") !== -1 && bettype.split(" ").length > 1) {
            let handicap = Number(bettype.split(" ")[1]);
            if (handicap < a_t_offSides) {
                return 'WIN';
            }
            else if (handicap === a_t_offSides) {
                return 'REFUND';
            }
            else {
                return 'LOST';
            }
        }
        else if (bettype.indexOf("under") !== -1 && bettype.split(" ").length > 1) {
            let handicap = Number(bettype.split(" ")[1]);
            if (handicap > a_t_offSides) {
                return 'WIN';
            }
            else if (handicap === a_t_offSides) {
                return 'REFUND';
            }
            else {
                return 'LOST';
            }
        }
        else {
            return 'REFUND';
        }
    }
    else {
        return 'REFUND';
    }
};
/**
 * The Player shots on target
 */
const getPlayerShotsOnTarget = ({ handicap, oddType, underOver, playerName, data }) => {
    let shotNum = 0;
    let result = 'REFUND';
    let fullNames = playerName.toLowerCase().split(" ");
    for (var i = 0; i < data.events.length; i++) {
        let item = data.events[i];
        let text = item === null || item === void 0 ? void 0 : item.text.toLowerCase();
        if (text && text.includes(" shot on target - ") && text.includes(fullNames[1] || fullNames[0])) {
            if (oddType === "home" && (item === null || item === void 0 ? void 0 : item.text.includes(data.home.name))) {
                shotNum++;
            }
            else if (oddType === "away" && (item === null || item === void 0 ? void 0 : item.text.includes(data.away.name))) {
                shotNum++;
            }
        }
    }
    if (underOver == "over") {
        if (shotNum > handicap) {
            return 'WIN';
        }
        else if (shotNum === handicap) {
            return 'REFUND';
        }
        else {
            return 'LOST';
        }
    }
    else if (underOver == "under") {
        if (shotNum < handicap) {
            return 'WIN';
        }
        else if (shotNum === handicap) {
            return 'REFUND';
        }
        else {
            return 'LOST';
        }
    }
    return result;
};
/**
 * The Player assists
 */
const getPlayerAssists = ({ handicap, oddType, underOver, playerName, data }) => {
    let assistsNum = 0;
    let result = 'REFUND';
    let fullNames = playerName.split(" ");
    let _playername = fullNames[1] || fullNames[0];
    for (let i = 0; i < data.events.length; i++) {
        let item = data.events[i];
        let text = item === null || item === void 0 ? void 0 : item.text.toLowerCase();
        if (text && text.includes("assist") && text.includes(_playername.toLowerCase())) {
            if (oddType === "home" && text.includes(data.home.name.toLowerCase())) {
                assistsNum++;
            }
            else if (oddType === "away" && text.includes(data.away.name.toLowerCase())) {
                assistsNum++;
            }
        }
    }
    if (underOver == "over") {
        if (assistsNum > handicap) {
            return 'WIN';
        }
        else if (assistsNum === handicap) {
            return 'REFUND';
        }
        else {
            return 'LOST';
        }
    }
    else if (underOver == "under") {
        if (assistsNum < handicap) {
            return 'WIN';
        }
        else if (assistsNum === handicap) {
            return 'REFUND';
        }
        else {
            return 'LOST';
        }
    }
    return result;
};
// Player
/**
 * The Player shots on target
 */
const getPlayerScoreOrAssists = ({ playerName, data }) => {
    let fullNames = playerName.split(" ");
    let _playername = fullNames[1] || fullNames[0];
    for (let i = 0; i < data.events.length; i++) {
        let item = data.events[i];
        if (((item === null || item === void 0 ? void 0 : item.text.includes(" Goal - ")) || (item === null || item === void 0 ? void 0 : item.text.includes(" Assist - "))) && (item === null || item === void 0 ? void 0 : item.text.includes(_playername))) {
            return 'WIN';
        }
    }
    return 'LOST';
};
/**
 * The Player shots
 */
const getPlayerShot = ({ handicap, oddType, underOver, playerName, data }) => {
    let shotNum = 0;
    let result = 'REFUND';
    let fullNames = playerName.split(" ");
    let _playername = fullNames[1] || fullNames[0];
    for (var j = 0; j < data.events.length; j++) {
        let item = data.events[j];
        let text = item === null || item === void 0 ? void 0 : item.text.toLowerCase();
        if (text && (text.includes(" shot on ") || text.includes(" shot off ")) && text.includes(_playername.toLowerCase())) {
            if (oddType === "home" && text.includes(data.home.name.toLowerCase())) {
                shotNum++;
            }
            else if (oddType === "away" && text.includes(data.away.name.toLowerCase())) {
                shotNum++;
            }
        }
    }
    if (underOver == "over") {
        if (shotNum > handicap) {
            result = 'WIN';
        }
        else if (shotNum === handicap) {
            result = 'REFUND';
        }
        else {
            result = 'LOST';
        }
    }
    else if (underOver == "under") {
        if (shotNum < handicap) {
            result = 'WIN';
        }
        else if (shotNum === handicap) {
            result = 'REFUND';
        }
        else {
            result = 'LOST';
        }
    }
    return result;
};
/**
 * Both team To Score
 */
const getIsBothScore = ({ h_score, a_score, r_score }) => {
    if (h_score > 0 && a_score > 0 && r_score == "Yes") {
        return 'WIN';
    }
    else if ((h_score <= 0 || a_score <= 0) && r_score == "No") {
        return 'WIN';
    }
    else {
        return 'LOST';
    }
};
// get card(red and yellow) of game
const getCard = ({ redcards, yellowcards, yellowred_cards }) => {
    let h_y_card = (yellowcards && yellowcards.length > 0) ? Number(yellowcards[0]) : 0;
    let a_y_card = (yellowcards && yellowcards.length > 0) ? Number(yellowcards[1]) : 0;
    let h_ry_card = (yellowred_cards && yellowred_cards.length > 0) ? Number(yellowred_cards[0]) : 0;
    let a_ry_card = (yellowred_cards && yellowred_cards.length > 0) ? Number(yellowred_cards[1]) : 0;
    let h_r_card = (redcards && redcards.length > 0) ? Number(redcards[0]) : 0;
    let a_r_card = (redcards && redcards.length > 0) ? Number(redcards[1]) : 0;
    let y_t_card = h_y_card + a_y_card;
    let r_t_card = h_r_card + a_r_card;
    let t_card = y_t_card + r_t_card;
    let h_t_card = h_y_card + h_r_card;
    let a_t_card = a_y_card + a_r_card;
    return { t_card, h_t_card, a_t_card, y_t_card, r_t_card, h_y_card, a_y_card, h_ry_card, a_ry_card, h_r_card, a_r_card };
};
// get corner(half and total) of game
const getCornerDetail = ({ corners, corner_f, corner_h }) => {
    let h_t_corner = (corners && corners.length > 0) ? Number(corners[0]) : 0;
    let a_t_corner = (corners && corners.length > 1) ? Number(corners[1]) : 0;
    let fh_corner = (corner_f && corner_f.length > 0) ? Number(corner_f[0]) : 0;
    let fa_corner = (corner_f && corner_f.length > 1) ? Number(corner_f[1]) : 0;
    let f_t_corner = fh_corner + fa_corner;
    let t_corner = h_t_corner + a_t_corner;
    let hh_corner = (corner_h && corner_h.length > 0) ? Number(corner_h[0]) : 0;
    let ha_corner = (corner_h && corner_h.length > 1) ? Number(corner_h[1]) : 0;
    return { t_corner, h_t_corner, a_t_corner, f_t_corner, fh_corner, fa_corner, hh_corner, ha_corner };
};
// get corner(half and total) of game
const getOffSide = ({ offSides }) => {
    let h_t_offSides = (offSides && offSides.length > 0) ? Number(offSides[0]) : 0;
    let a_t_offSides = (offSides && offSides.length > 1) ? Number(offSides[1]) : 0;
    let t_offSides = h_t_offSides + a_t_offSides;
    return { t_offSides, h_t_offSides, a_t_offSides };
};
//second half time
const getFScore = (scores) => {
    return scores[Object.keys(scores).sort().reverse()[0]];
};
/**
 * first half time score
 **/
const getSScore = (scores) => {
    return scores[Object.keys(scores).sort().reverse()[1]];
};
/**
 * first half time with total goal
 * @scores
 * */
const getSHScore = (scores) => {
    const f_score = scores[Object.keys(scores).sort()[0]];
    const home = Number(f_score.home);
    const away = Number(f_score.away);
    return { home, away, total: home + away };
};
/**
 *
 * @param scores
 * panelty scores
 * @returns
 */
const getBHScore = (scores) => {
    let f_score = null;
    if (!scores) {
        f_score = null;
    }
    else if (Object.keys(scores).length >= 6) {
        f_score = scores['3'];
    }
    else if (Object.keys(scores).length >= 3) {
        f_score = scores['1'];
    }
    if (f_score) {
        const home = Number(f_score.home);
        const away = Number(f_score.away);
        return { home, away, total: home + away, state: true };
    }
    else {
        return { home: 0, away: 0, total: 0, state: false };
    }
};
const getBQScore = (scores, quarter) => {
    let f_score = {
        home: 0,
        away: 0
    };
    let state = true;
    if (quarter === '1' || quarter === '0') {
        f_score = scores['1'];
    }
    else if (quarter === '2') {
        f_score = scores['2'];
    }
    else if (quarter === '3') {
        f_score = scores['4'];
    }
    else if (quarter === '4') {
        f_score = scores['5'];
    }
    if (f_score.home === 0 && f_score.away === 0) {
        state = false;
    }
    const home = Number(f_score.home);
    const away = Number(f_score.away);
    return { home, away, total: home + away, state };
};
const getCorner = (scores) => {
    if (scores && scores.length) {
        return Number(scores[0]) + Number(scores[1]);
    }
    else {
        return false;
    }
};
const getHandicapData = (handicap) => {
    return Number(handicap.split(',')[0]);
};
const getHandicapAndOverUnder = (data) => {
    const handicap = data.split(" ").length > 0 ? data.split(" ")[1] : 0;
    const underOver = data.split(" ").length > 0 ? data.split(" ")[0] : "Over";
    return { handicap, underOver: underOver.toLowerCase() };
};
const getoddTypeData = (header) => {
    let _header = header.toLowerCase();
    if (_header == "1") {
        return "home";
    }
    else if (_header == "2") {
        return "away";
    }
    else if (_header == "over") {
        return "over";
    }
    else if (_header == "under") {
        return "under";
    }
    else if (_header == "exactly") {
        return "exactly";
    }
    else if (_header == "neither") {
        return "neither";
    }
    else if (_header == "even") {
        return "even";
    }
    else if (_header == "odd") {
        return "odd";
    }
    else
        return "draw";
};
const getHockeyScore = (scores) => {
    let h_score = Object.values(scores)
        .slice(0, 3)
        .reduce((sum, { home }) => (sum += Number(home)), 0);
    let a_score = Object.values(scores)
        .slice(0, 3)
        .reduce((sum, { away }) => (sum += Number(away)), 0);
    return { h_score, a_score };
};
const getScores = ({ SportId, scores, ss }) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
    let h_score = 0, a_score = 0, t_score = 0;
    try {
        const h_s = Number(ss === null || ss === void 0 ? void 0 : ss.split('-')[0]);
        const a_s = Number(ss === null || ss === void 0 ? void 0 : ss.split('-')[1]);
        if (SportId === 1) {
            // if (Object.keys(scores).length === 3) {
            //     h_score = Object.values(scores)
            //         .slice(0, 2)
            //         .reduce((sum, { home }) => (sum += Number(home)), 0);
            //     a_score = Object.values(scores)
            //         .slice(0, 2)
            //         .reduce((sum, { away }) => (sum += Number(away)), 0);
            //     t_score = Number(h_score) + Number(a_score);
            //     if (Number(h_s) === h_score && Number(a_s) === a_score) {
            //         return { h_score, a_score, t_score, state: true };
            //     } else {
            //         return {h_score:h_s, a_score:a_s, t_score, state: true}
            //     }
            // } else
            if (Object.keys(scores).length === 4) {
                // h_score = Object.values(scores)
                //     .slice(0, 2)
                //     .reduce((sum, { home }) => (sum += Number(home)), 0);
                // a_score = Object.values(scores)
                //     .slice(0, 2)
                //     .reduce((sum, { away }) => (sum += Number(away)), 0);
                h_score = Number((_a = Object.values(scores)[2]) === null || _a === void 0 ? void 0 : _a.home);
                a_score = Number((_b = Object.values(scores)[2]) === null || _b === void 0 ? void 0 : _b.away);
                t_score = h_score + a_score;
                return { h_score, a_score, t_score, state: true };
                // if (Number(h_s) === h_score && Number(a_s) === a_score) {
                //     return { h_score, a_score, t_score, state: true };
                // } else {
                //     return {h_score:h_s, a_score:a_s, t_score, state: true}
                // }
            }
            else if (Object.keys(scores).length === 3) {
                if (Object.keys(scores)[2] === '3') {
                    const f_score = getFScore(scores);
                    h_score = Number(f_score.home);
                    a_score = Number(f_score.away);
                    t_score = h_score + a_score;
                    if (Number(h_s) === h_score && Number(a_s) === a_score) {
                        return { h_score, a_score, t_score, state: true };
                    }
                    else {
                        return { h_score: 0, a_score: 0, t_score: 0, state: false };
                    }
                }
                else {
                    h_score = Number((_c = Object.values(scores)[1]) === null || _c === void 0 ? void 0 : _c.home);
                    a_score = Number((_d = Object.values(scores)[1]) === null || _d === void 0 ? void 0 : _d.away);
                    t_score = h_score + a_score;
                    return { h_score, a_score, t_score, state: true };
                }
            }
            else {
                const f_score = getFScore(scores);
                h_score = Number(f_score.home);
                a_score = Number(f_score.away);
                t_score = h_score + a_score;
                // console.log("....", scores, f_score, h_score, a_score)
                return { h_score, a_score, t_score, state: true };
                // } else {
                //     return { h_score: 0, a_score: 0, t_score: 0, state: false };
                // }
                // else {
                //     return { h_score: 0, a_score: 0, t_score: 0, state: false };
                // }
            }
        }
        else if (SportId === 17 || SportId === 19 || SportId === 78) {
            const f_score = getFScore(scores);
            h_score = Number(f_score.home);
            a_score = Number(f_score.away);
            t_score = h_score + a_score;
            return { h_score, a_score, t_score, state: true };
        }
        else if (SportId === 18) {
            const f_score = getFScore(scores);
            if (!Object.keys(scores).length) {
                return { h_score: 0, a_score: 0, t_score: 0, state: false };
            }
            if ((f_score === null || f_score === void 0 ? void 0 : f_score.home) && (f_score === null || f_score === void 0 ? void 0 : f_score.away)) {
                h_score = Number(f_score.home);
                a_score = Number(f_score.away);
                t_score = h_score + a_score;
                if (((_e = scores[3]) === null || _e === void 0 ? void 0 : _e.home) !== undefined &&
                    ((_f = scores[3]) === null || _f === void 0 ? void 0 : _f.home) !== '' &&
                    ((_g = scores[3]) === null || _g === void 0 ? void 0 : _g.away) !== undefined &&
                    ((_h = scores[3]) === null || _h === void 0 ? void 0 : _h.away) !== '' &&
                    h_s === Number(scores[3].home) &&
                    a_s === Number(scores[3].away) &&
                    h_score === Number(scores[7].home) &&
                    a_score === Number(scores[7].away) &&
                    h_score === h_s &&
                    a_score === a_s) {
                    return { h_score, a_score, t_score, state: true };
                }
                // else if (scores[5]?.home === undefined || scores[5]?.home === '' || scores[5]?.away === undefined || scores[5]?.away === '') {
                //     return { h_score, a_score, t_score, state: false };
                // }
                else {
                    if (h_score == Number(scores[7].home) && a_score == Number(scores[7].away)) {
                        return { h_score, a_score, t_score, state: true };
                    }
                    else {
                        return { h_score: 0, a_score: 0, t_score: 0, state: false };
                    }
                }
            }
            else if (h_s && a_s) {
                return { h_score: h_s, a_score: a_s, t_score: h_s + a_s, state: true };
            }
            else {
                return { h_score: 0, a_score: 0, t_score: 0, state: false };
            }
        }
        else if (SportId === 12) {
            if (((_j = scores[5]) === null || _j === void 0 ? void 0 : _j.home) === undefined || ((_k = scores[5]) === null || _k === void 0 ? void 0 : _k.home) === '' || ((_l = scores[5]) === null || _l === void 0 ? void 0 : _l.away) === undefined || ((_m = scores[5]) === null || _m === void 0 ? void 0 : _m.away) === '') {
                return { h_score, a_score, t_score, state: false };
            }
            else {
                const f_score = getFScore(scores);
                h_score = Number(f_score.home);
                a_score = Number(f_score.away);
                if (h_score == Number(scores[7].home) && h_score == h_s && a_score == Number(scores[7].away) && a_score == a_s) {
                    t_score = h_score + a_score;
                    return { h_score, a_score, t_score, state: true };
                }
                else {
                    return { h_score: 0, a_score: 0, t_score: 0, state: false };
                }
            }
        }
        else if (SportId === 13) {
            const f_score = getScore(scores);
            if (f_score.home === f_score.away) {
                return { h_score, a_score, t_score, state: false };
            }
            else {
                const home_score = Object.values(scores).reduce((sum, { home }) => (sum += Number(home)), 0);
                const away_score = Object.values(scores).reduce((sum, { away }) => (sum += Number(away)), 0);
                h_score = Number(f_score.home);
                a_score = Number(f_score.away);
                t_score = home_score + away_score;
                return { h_score, a_score, t_score, state: true };
            }
        }
        else if (SportId === 91 || SportId === 92 || SportId === 94 || SportId === 95) {
            const home_score = Object.values(scores).reduce((sum, { home }) => (sum += Number(home)), 0);
            const away_score = Object.values(scores).reduce((sum, { away }) => (sum += Number(away)), 0);
            const f_score = getScore(scores);
            h_score = Number(f_score.home);
            a_score = Number(f_score.away);
            t_score = home_score + away_score;
            return { h_score, a_score, t_score, state: true };
        }
        else if (SportId === 16) {
            const s = ss.split('-');
            h_score = Number(s[0]);
            a_score = Number(s[1]);
            // if (
            //     scores[9]?.home === undefined ||
            //     scores[9]?.home === '' ||
            //     scores[9]?.away === undefined ||
            //     scores[9]?.away === '' ||
            //     h_score === a_score
            // ) {
            //     return { h_score, a_score, t_score, state: false };
            // } else {
            t_score = h_score + a_score;
            return { h_score, a_score, t_score, state: true };
            // }
        }
        else if (SportId === 8) {
            const s = ss.split('-');
            h_score = Number(s[0]);
            a_score = Number(s[1]);
            t_score = h_score + a_score;
            if (((_o = scores[4]) === null || _o === void 0 ? void 0 : _o.home) === undefined ||
                ((_p = scores[4]) === null || _p === void 0 ? void 0 : _p.away) === undefined ||
                Number((_q = scores[4]) === null || _q === void 0 ? void 0 : _q.home) === h_score ||
                Number((_r = scores[4]) === null || _r === void 0 ? void 0 : _r.away) == a_score) {
                return { h_score, a_score, t_score, state: true };
            }
            else {
                return { h_score: 0, a_score: 0, t_score: 0, state: false };
            }
        }
        else if (SportId === 9 ||
            SportId === 162 ||
            SportId === 14 ||
            SportId === 15 ||
            SportId === 36 ||
            SportId === 66 ||
            SportId === 83 ||
            SportId === 90 ||
            SportId === 107 ||
            SportId === 110 ||
            SportId === 151) {
            const s = ss.split('-');
            h_score = Number(s[0]);
            a_score = Number(s[1]);
            t_score = h_score + a_score;
            return { h_score, a_score, t_score, state: true };
        }
        else if (SportId === 3) {
            const s1 = ss.split('-');
            const s2 = ss.split(',');
            if (s1[0] && s1[1]) {
                h_score = Number(s1[0].split('/')[0]);
                a_score = Number(s1[1].split('/')[0]);
                t_score = h_score + a_score;
                return { h_score, a_score, t_score, state: true };
            }
            else if (s2[0] && s2[1]) {
                h_score = Number(s2[0].split('/')[0]);
                a_score = Number(s2[1].split('/')[0]);
                t_score = h_score + a_score;
                return { h_score, a_score, t_score, state: true };
            }
            else {
                return { h_score, a_score, t_score, state: false };
            }
        }
        else if (SportId === 75) {
            return { h_score, a_score, t_score, state: false };
        }
        else {
            return { h_score, a_score, t_score, state: false };
        }
    }
    catch (e) {
        console.log(e);
        return { h_score, a_score, t_score, state: false };
    }
};
const filterMainTime = (data) => {
    var _a, _b, _c, _d;
    let h_r_card = 0;
    let h_y_card = 0;
    let h_corner = 0;
    let hh_corner = 0;
    let a_r_card = 0;
    let a_y_card = 0;
    let a_corner = 0;
    let ah_corner = 0;
    if (data.events) {
        let home = data.events.filter((item) => item.text && item.text.includes(data.home.name)).map((event) => {
            let timeParts = event.text.split("'")[0].split("+");
            let time = (Number(timeParts[0]) * 60 + Number(timeParts[1] || 0));
            return Object.assign(Object.assign({}, event), { eventTime: time });
        });
        let away = data.events.filter((item) => item.text && item.text.includes(data.away.name)).map((event) => {
            let timeParts = event.text.split("'")[0].split("+");
            let time = (Number(timeParts[0]) * 60 + Number(timeParts[1] || 0));
            return Object.assign(Object.assign({}, event), { eventTime: time });
        });
        // home card
        for (let i = 0; i < home.length; i++) {
            let item = home[i];
            if ((item === null || item === void 0 ? void 0 : item.text.indexOf('After Full Time')) != -1) {
                break;
            }
            if ((item === null || item === void 0 ? void 0 : item.text.indexOf('Red Card')) !== -1) {
                h_r_card++;
            }
            else if ((item === null || item === void 0 ? void 0 : item.text.indexOf('Yellow Card ~')) !== -1) {
                h_y_card++;
            }
        }
        // away card 
        for (let i = 0; i < away.length; i++) {
            let item = away[i];
            if ((item === null || item === void 0 ? void 0 : item.text.indexOf('After Full Time')) != -1) {
                break;
            }
            if ((item === null || item === void 0 ? void 0 : item.text.indexOf('Red Card')) !== -1) {
                a_r_card++;
            }
            else if ((item === null || item === void 0 ? void 0 : item.text.indexOf('Yellow Card ~')) !== -1) {
                a_y_card++;
            }
        }
        //corner home
        for (let i = 0; i < home.length; i++) {
            let item = home[i];
            if ((item === null || item === void 0 ? void 0 : item.text.indexOf('After Full Time')) != -1) {
                break;
            }
            if ((item === null || item === void 0 ? void 0 : item.text.includes('Corner -')) !== -1) {
                if (item.eventTime <= 45 * 60) {
                    hh_corner++;
                }
                h_corner++;
            }
        }
        //corner home
        for (let i = 0; i < away.length; i++) {
            let item = home[i];
            if ((item === null || item === void 0 ? void 0 : item.text.indexOf('After Full Time')) != -1) {
                break;
            }
            if ((item === null || item === void 0 ? void 0 : item.text.includes('Corner -')) !== -1) {
                if (item.eventTime <= 45 * 60) {
                    ah_corner++;
                }
                a_corner++;
            }
        }
    }
    let _scores = Object.assign({}, data.scores);
    for (let s in _scores) {
        if (Number(s) > 2) {
            delete _scores[s];
        }
    }
    return {
        cards: { redcards: [h_r_card, a_r_card], yellowcards: [h_y_card, a_y_card], yellowred_cards: ((_a = data === null || data === void 0 ? void 0 : data.stats) === null || _a === void 0 ? void 0 : _a.yellowred_cards) && [h_r_card + h_y_card, a_r_card + a_y_card] },
        corners: {
            corners: ((_b = data === null || data === void 0 ? void 0 : data.stats) === null || _b === void 0 ? void 0 : _b.corners) || [h_corner, a_corner],
            corner_f: ((_c = data === null || data === void 0 ? void 0 : data.stats) === null || _c === void 0 ? void 0 : _c.corner_f) || [h_corner, a_corner],
            corner_h: ((_d = data === null || data === void 0 ? void 0 : data.stats) === null || _d === void 0 ? void 0 : _d.corner_h) || [hh_corner, ah_corner]
        },
        scores: _scores
    };
};
const getProfit = ({ status, bet }) => {
    if (status === 'WIN') {
        return bet.stake * bet.odds;
    }
    else if (status === 'LOST') {
        return bet.stake * -1;
    }
    else if (status === 'REFUND' || status === 'CANCEL') {
        return bet.stake;
    }
    else if (status === 'HALF_WIN') {
        return (bet.stake * bet.odds) / 2;
    }
    else if (status === 'HALF_LOST') {
        return (bet.stake / 2);
    }
};
const bettingSettled = ({ bet, data }) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    try {
        if (!bet || !data) {
            return { profit: 0, status: '', scores: {}, state: false };
        }
        let status = '';
        const oddType = bet.oddType;
        const SportId = bet.SportId;
        const marketId = bet.isBet365 ? bet.oddData.pId : bet.marketId;
        const market_List_Id = bet.marketId;
        let redcards = (_a = data === null || data === void 0 ? void 0 : data.stats) === null || _a === void 0 ? void 0 : _a.redcards;
        let yellowcards = (_b = data === null || data === void 0 ? void 0 : data.stats) === null || _b === void 0 ? void 0 : _b.yellowcards;
        let yellowred_cards = (_c = data === null || data === void 0 ? void 0 : data.stats) === null || _c === void 0 ? void 0 : _c.yellowred_cards;
        let corners = (_d = data === null || data === void 0 ? void 0 : data.stats) === null || _d === void 0 ? void 0 : _d.corners;
        let corner_f = (_e = data === null || data === void 0 ? void 0 : data.stats) === null || _e === void 0 ? void 0 : _e.corner_f;
        let corner_h = (_f = data === null || data === void 0 ? void 0 : data.stats) === null || _f === void 0 ? void 0 : _f.corner_h;
        if (SportId == 1) {
            let fullTimeData = filterMainTime(data);
            data.scores = fullTimeData.scores;
            redcards = fullTimeData.cards.redcards;
            yellowcards = fullTimeData.cards.yellowcards;
            yellowred_cards = ((_g = data === null || data === void 0 ? void 0 : data.stats) === null || _g === void 0 ? void 0 : _g.yellowred_cards) && fullTimeData.cards.yellowred_cards;
            corners = fullTimeData.corners.corners;
            corner_f = fullTimeData.corners.corner_f;
            corner_h = fullTimeData.corners.corner_h;
            if ((_h = data === null || data === void 0 ? void 0 : data.stats) === null || _h === void 0 ? void 0 : _h.corners) {
                data.stats.corners = corners;
            }
            if ((_j = data === null || data === void 0 ? void 0 : data.stats) === null || _j === void 0 ? void 0 : _j.corner_f) {
                data.stats.corner_f = corner_f;
            }
            if ((_k = data === null || data === void 0 ? void 0 : data.stats) === null || _k === void 0 ? void 0 : _k.corner_h)
                data.stats.corner_h = corner_h;
        }
        const { h_score, a_score, t_score, state } = getScores({
            SportId,
            scores: data.scores,
            ss: data.ss
        });
        const handicap = getHandicapData(((_l = bet.oddData) === null || _l === void 0 ? void 0 : _l.handicap) || ',');
        const numberScores = convertScoresToNumbers(data.scores);
        const { t_card, h_t_card, a_t_card, y_t_card, r_t_card, h_y_card, a_y_card, h_ry_card, a_ry_card, h_r_card, a_r_card } = getCard({ redcards, yellowcards, yellowred_cards });
        const { t_corner, h_t_corner, a_t_corner, f_t_corner, fh_corner, fa_corner, hh_corner, ha_corner } = getCornerDetail({ corners, corner_f, corner_h });
        const { t_offSides, h_t_offSides, a_t_offSides } = getOffSide({ offSides: (_m = data === null || data === void 0 ? void 0 : data.stats) === null || _m === void 0 ? void 0 : _m.offsides });
        if (state) {
            // bet365 api
            if ((marketId === 'asian_lines_odds' && market_List_Id === '1st_half_asian_handicap') || (marketId === 'asian_lines_odds' && market_List_Id === 'asian_handicap_corners')) {
                const { home, away } = getSHScore(data.scores);
                const handicap = getHandicapData(bet.oddData.handicap);
                if (market_List_Id === 'asian_handicap_corners') {
                    status = getHandicap({
                        h_score: h_t_corner,
                        a_score: a_t_corner,
                        oddType,
                        handicap
                    });
                }
                else {
                    status = getHandicap({
                        h_score: home,
                        a_score: away,
                        oddType,
                        handicap
                    });
                }
            }
            else if ((marketId === 'asian_lines_odds' && market_List_Id === 'asian_total_cards') || (marketId === 'cards_odds' && market_List_Id === 'asian_total_cards')) {
                status = getCardResult({ h_card: h_t_card, a_card: a_t_card, t_card, r_card: Number(bet.oddData.name), oddType });
            }
            else if ((marketId === 'asian_lines_odds' && market_List_Id === 'asian_handicap_cards') || (marketId === 'cards_odds' && market_List_Id === 'card_handicap') || (marketId === 'cards_odds' && market_List_Id === 'asian_total_cards') || (marketId === 'cards_odds' && market_List_Id === 'asian_handicap_cards')) {
                const handicap = getHandicapData(bet.oddData.handicap);
                status = getHandicap({
                    h_score: h_t_card,
                    a_score: a_t_card,
                    oddType,
                    handicap
                });
            }
            else if ((marketId === 'cards_odds' && market_List_Id === 'number_of_cards_in_match')) {
                status = getCardResult({ h_card: h_t_card, a_card: a_t_card, t_card, r_card: Number(bet.oddData.name), oddType });
            }
            else if ((marketId === 'cards_odds' && market_List_Id === 'both_teams_to_receive_a_card')) {
                status = getIsBothCard({ h_card: h_t_card, a_card: a_t_card, r_card: bet.oddData.name });
            }
            else if ((marketId === 'cards_odds' && market_List_Id === 'both_teams_to_receive_2+_cards')) {
                status = getIsBoth2Card({ h_card: h_t_card, a_card: a_t_card, r_card: bet.oddData.name });
            }
            else if ((marketId === 'cards_odds' && market_List_Id === 'player_to_be_booked')) {
                status = getIsPlayerBooked({ data, player: bet.oddData.name });
            }
            else if ((marketId === 'cards_odds' && market_List_Id === 'team_cards')) {
                status = getIsTeamCard({ h_card: h_t_card, a_card: a_t_card, handicap: bet.oddData.handicap, header: bet.oddData.header });
            }
            else if ((marketId === 'cards_odds' && market_List_Id === 'alternative_card_handicap')) {
                const handicap = getHandicapData(bet.oddData.handicap);
                const oddType = getoddTypeData(bet.oddData.header);
                status = getAlternativeHandicap({
                    h_score: h_t_card,
                    a_score: a_t_card,
                    oddType,
                    handicap
                });
            }
            else if ((marketId === 'cards_odds' && market_List_Id === 'first_card_received')) {
                status = getIsWhoFistCard({ t_card, data, r_card: bet.oddData.name });
            }
            else if ((marketId === 'cards_odds' && market_List_Id === 'time_of_first_card')) {
                status = getTimeFistCard({ t_card, data, targetTime: bet.oddData.name });
            }
            else if ((marketId === 'cards_odds' && market_List_Id === 'first_10_minutes_(00:00_09:59)')) {
                const handicap = getHandicapData(bet.oddData.handicap);
                const oddType = getoddTypeData(bet.oddData.header);
                status = getSelectedTimeFistCard({ t_card, data, handicap, oddType, targetTime: 599 });
            }
            else if ((marketId === 'corners_odds' && market_List_Id === 'corners') || (marketId === 'corners_odds' && market_List_Id === 'alternative_corners') || (marketId === 'corners_odds' && market_List_Id === 'corners_2_way')) {
                const oddType = getoddTypeData(bet.oddData.header);
                status = getCornerResult({ h_corner: h_t_corner, a_corner: a_t_corner, t_corner, r_corner: Number(bet.oddData.name), oddType });
            }
            else if ((marketId === 'corners_odds' && market_List_Id === 'total_corners')) {
                const oddType = getoddTypeData(bet.oddData.header);
                status = getCornerBetweenResult({ h_corner: h_t_corner, a_corner: a_t_corner, t_corner, r_corner: bet.oddData.name, oddType });
            }
            else if ((marketId === 'corners_odds' && market_List_Id === 'first_half_corners')) {
                const oddType = getoddTypeData(bet.oddData.header);
                status = getCornerResult({ h_corner: hh_corner, a_corner: ha_corner, t_corner: (hh_corner + ha_corner), r_corner: Number(bet.oddData.name), oddType });
                // } else if ((marketId === 'corners_odds' && market_List_Id === 'corner_match_bet')) {
                //     const oddType = getoddTypeData(bet.oddData.name);
                //     status = get1X2({ h_score: h_t_corner, a_score: a_t_corner, oddType });
            }
            else if ((marketId === 'corners_odds' && market_List_Id === 'corner_handicap')) {
                const oddType = getoddTypeData(bet.oddData.header);
                const handicap = getHandicapData(bet.oddData.handicap);
                status = getAlternativeHandicap({
                    h_score: h_t_corner,
                    a_score: a_t_corner,
                    oddType,
                    handicap
                });
            }
            else if ((marketId === 'corners_odds' && market_List_Id === 'asian_handicap_corners')) {
                const oddType = getoddTypeData(bet.oddData.header);
                const handicap = getHandicapData(bet.oddData.handicap);
                status = getAlternativeHandicap({
                    h_score: h_t_corner,
                    a_score: a_t_corner,
                    oddType,
                    handicap
                });
            }
            else if ((marketId === 'corners_odds' && market_List_Id === 'asian_total_corners')) {
                const oddType = getoddTypeData(bet.oddData.header);
                status = getCardResult({ h_card: h_t_corner, a_card: a_t_corner, t_card: t_corner, r_card: Number(bet.oddData.name), oddType });
            }
            else if ((marketId === 'corners_odds' && market_List_Id === '1st_half_asian_corners')) {
                const oddType = getoddTypeData(bet.oddData.header);
                status = getCardResult({ h_card: hh_corner, a_card: ha_corner, t_card: (ha_corner + hh_corner), r_card: Number(bet.oddData.name), oddType });
            }
            else if ((marketId === 'corners_odds' && market_List_Id === 'time_of_first_corner')) {
                status = getTimeFistCorner({ t_corner: (ha_corner + hh_corner), data, targetTime: bet.oddData.name });
            }
            else if ((marketId === 'corners_odds' && market_List_Id === 'team_corners')) {
                const oddType = getoddTypeData(bet.oddData.header);
                status = getCardResult({ h_card: h_t_corner, a_card: a_t_corner, t_card: t_corner, r_card: Number(bet.oddData.name), oddType });
            }
            else if ((marketId === 'corners_odds' && market_List_Id === 'corners_race')) {
                const oddType = getoddTypeData(bet.oddData.header);
                const handicap = getHandicapData(bet.oddData.name);
                status = getCornersRace({ data, handicap, oddType });
            }
            else if ((marketId === 'corners_odds' && market_List_Id === 'first_match_corner')) {
                const oddType = getoddTypeData(bet.oddData.name);
                status = getFirstCorner({ data, oddType });
            }
            else if ((marketId === 'corners_odds' && market_List_Id === 'last_match_corner')) {
                const oddType = getoddTypeData(bet.oddData.name);
                status = getLastCorner({ data, oddType });
            }
            else if ((marketId === 'corners_odds' && market_List_Id === 'multicorners')) {
                const oddType = getoddTypeData(bet.oddData.header);
                status = getCardResult({ h_card: h_t_corner, a_card: a_t_corner, t_card: t_corner, r_card: Number(bet.oddData.name), oddType });
            }
            else if ((marketId === 'corners_odds' && market_List_Id === "first_minute_(00:00_00:59)")) {
                status = getIsSelectedTimeFistCorner({ data, header: bet.oddData.header, targetTime: 1 });
            }
            else if ((marketId === 'goals_odds' && market_List_Id === "goals_over_under")) {
                const oddType = getoddTypeData(bet.oddData.header);
                status = getCardResult({ h_card: h_score, a_card: a_score, t_card: t_score, r_card: Number(bet.oddData.name), oddType });
            }
            else if ((marketId === 'goals_odds' && market_List_Id === "alternative_total_goals")) {
                const oddType = getoddTypeData(bet.oddData.header);
                status = getCardResult({ h_card: h_score, a_card: a_score, t_card: t_score, r_card: Number(bet.oddData.name), oddType });
            }
            else if ((marketId === 'goals_odds' && market_List_Id === "result_total_goals")) {
                const underOver = getoddTypeData(bet.oddData.header);
                const oddType = getoddTypeData(bet.oddData.name);
                const handicap = getHandicapData(bet.oddData.handicap);
                status = getOddtypeUnderOverHandicap({
                    h_score: h_score,
                    a_score: a_score,
                    oddType,
                    underOver,
                    handicap
                });
            }
            else if ((marketId === 'goals_odds' && market_List_Id === "total_goals_both_teams_to_score")) {
                status = getTotalGoalBothTeamScore({
                    t_score,
                    _betType: bet.oddData.name
                });
            }
            else if ((marketId === 'goals_odds' && market_List_Id === "number_of_goals_in_match")) {
                status = getNumberGoalMatch({
                    t_score,
                    _betType: bet.oddData.name.toLowerCase()
                });
            }
            else if ((marketId === 'goals_odds' && market_List_Id === "both_teams_to_score")) {
                status = getBothTeamScore({
                    h_score,
                    a_score,
                    _betType: bet.oddData.name
                });
            }
            else if ((marketId === 'goals_odds' && market_List_Id === "both_teams_to_score_in_1st_half")) {
                const f_score = getSHScore(data.scores);
                status = getIsBothScore({
                    h_score: f_score.home,
                    a_score: f_score.away,
                    r_score: bet.oddData.name
                });
            }
            else if ((marketId === 'goals_odds' && market_List_Id === "both_teams_to_score_in_2nd_half")) {
                const s_score = getSScore(data.scores);
                const f_score = getSHScore(data.scores);
                status = getIsBothScore({
                    h_score: Number(f_score.home) - Number(s_score.home),
                    a_score: Number(f_score.away) - Number(s_score.away),
                    r_score: bet.oddData.name
                });
            }
            else if ((marketId === 'goals_odds' && market_List_Id === "first_half_goals")) {
                const oddType = getoddTypeData(bet.oddData.header);
                const f_score = getSHScore(data.scores);
                status = getCardResult({ h_card: f_score.home, a_card: f_score.away, t_card: Number(f_score.home + f_score.away), r_card: Number(bet.oddData.name), oddType });
            }
            else if ((marketId === 'goals_odds' && market_List_Id === "early_goal")) {
                status = getEarlyGoal({ data, targetTime: bet.oddData.name });
            }
            else if ((marketId === 'goals_odds' && market_List_Id === "late_goal")) {
                status = getLastGoal({ data, _targetTime: bet.oddData.name });
            }
            else if ((marketId === 'goals_odds' && market_List_Id === "team_total_goals")) {
                const oddType = getoddTypeData(bet.oddData.header);
                const { underOver, handicap } = getHandicapAndOverUnder(bet.oddData.handicap);
                status = teamTotalGoals({
                    h_score: h_score,
                    a_score: a_score,
                    oddType,
                    underOver,
                    handicap
                });
            }
            else if ((marketId === 'goals_odds' && market_List_Id === "goals_odd_even")) {
                const oddType = getoddTypeData(bet.oddData.name);
                status = getIsOddEven({ t_val: t_score, oddType: oddType.toLowerCase() });
            }
            else if ((marketId === 'goals_odds' && market_List_Id === "first_10_minutes_(00:00_09:59)")) {
                const handicap = getHandicapData(bet.oddData.handicap);
                const oddType = getoddTypeData(bet.oddData.header);
                status = getSelectedTimeFistGoal({ data, handicap, oddType, targetTime: 10 });
            }
            else if ((marketId === 'goals_odds' && market_List_Id === "first_minute_(00:00_00:59)")) {
                status = getIsSelectedTimeFistGoal({ data, header: bet.oddData.header, targetTime: 1 });
            }
            else if ((marketId === 'half_odds' && market_List_Id === "half_time_double_chance")) {
                const f_score = getSHScore(data.scores);
                status = getHalfDoubleChance({ data, h_score: f_score.home, a_score: f_score.away, betType: bet.oddData.name });
            }
            else if ((marketId === 'half_odds' && market_List_Id === "half_time_correct_score")) {
                const oddType = getoddTypeData(bet.oddData.header);
                const f_score = getSHScore(data.scores);
                status = getHalfCorrectScore({ h_score: f_score.home, a_score: f_score.away, result: bet.oddData.name, oddType });
            }
            else if ((marketId === 'half_odds' && market_List_Id === "both_teams_to_score_in_1st_half")) {
                const f_score = getSHScore(data.scores);
                status = getIsBothScore({ h_score: f_score.home, a_score: f_score.away, r_score: bet.oddData.name });
            }
            else if ((marketId === 'half_odds' && market_List_Id === "both_teams_to_score_in_2nd_half")) {
                const s_score = getSScore(data.scores);
                const f_score = getSHScore(data.scores);
                status = getIsBothScore({
                    h_score: Number(f_score.home) - Number(s_score.home),
                    a_score: Number(f_score.away) - Number(s_score.away),
                    r_score: bet.oddData.name
                });
            }
            else if ((marketId === 'half_odds' && market_List_Id === "1st_half_goal_line")) {
                const f_score = getSHScore(data.scores);
                const oddType = getoddTypeData(bet.oddData.header);
                const handicap = getHandicapData(bet.oddData.name);
                status = getCardResult({ h_card: f_score.home, a_card: f_score.away, t_card: Number(f_score.home + f_score.away), r_card: handicap, oddType });
            }
            else if ((marketId === 'half_odds' && market_List_Id === "first_half_goals")) {
                const f_score = getSHScore(data.scores);
                const oddType = getoddTypeData(bet.oddData.header);
                const handicap = getHandicapData(bet.oddData.name);
                status = getCardResult({ h_card: f_score.home, a_card: f_score.away, t_card: Number(f_score.home + f_score.away), r_card: handicap, oddType });
            }
            else if ((marketId === 'half_odds' && market_List_Id === "first_half_corners")) {
                const oddType = getoddTypeData(bet.oddData.header);
                const handicap = getHandicapData(bet.oddData.name);
                status = getCardResult({ h_card: hh_corner, a_card: ha_corner, t_card: (hh_corner + ha_corner), r_card: handicap, oddType });
            }
            else if ((marketId === 'half_odds' && market_List_Id === "to_score_in_half")) {
                const oddType = getoddTypeData((_o = bet.oddData) === null || _o === void 0 ? void 0 : _o.team);
                const s_score = getFScore(data.scores);
                const f_score = getSScore(data.scores);
                status = getScoreHalf({
                    h_f_score: Number(f_score.home),
                    a_f_score: Number(f_score.away),
                    h_s_score: Number(s_score.home) - Number(f_score.home),
                    a_s_score: Number(s_score.away) - Number(f_score.away),
                    header: bet.oddData.header,
                    name: bet.oddData.name,
                    oddType
                });
            }
            else if ((marketId === 'main_odds' && market_List_Id === "double_chance")) {
                status = getHalfDoubleChance({ data, h_score, a_score, betType: bet.oddData.name });
            }
            else if ((marketId === 'main_odds' && market_List_Id === "goals_over_under")) {
                const oddType = getoddTypeData(bet.oddData.header);
                const handicap = getHandicapData(bet.oddData.name);
                status = getCardResult({ h_card: h_score, a_card: a_score, t_card: t_score, r_card: handicap, oddType });
            }
            else if ((marketId === 'main_odds' && market_List_Id === "both_teams_to_score")) {
                status = getBothTeamScore({
                    h_score,
                    a_score,
                    _betType: bet.oddData.name
                });
            }
            else if ((marketId === 'main_odds' && market_List_Id === "result_both_teams_to_score")) {
                const oddType = getoddTypeData(bet.oddData.name);
                status = getIsResultBothScore({ h_score, a_score, header: bet.oddData.header, oddType });
            }
            else if ((marketId === 'main_odds' && market_List_Id === "correct_score")) {
                const oddType = getoddTypeData(bet.oddData.header);
                status = getHalfCorrectScore({ h_score, a_score, result: bet.oddData.name, oddType });
            }
            else if ((marketId === 'main_odds' && market_List_Id === "half_time_full_time")) {
                const f_score = getSScore(data.scores);
                status = getHalfFullScore({ h_score, a_score, f_h_score: f_score.home, f_a_score: f_score.away, data, betType: bet.oddData.name });
            }
            else if ((marketId === 'main_odds' && market_List_Id === "goalscorers")) {
                status = getPlayerGoalScore({ data, playerName: bet.oddData.name, betType: bet.oddData.header, t_score });
            }
            else if ((marketId === 'main_odds' && market_List_Id === "asian_handicap")) {
                const oddType = getoddTypeData(bet.oddData.header);
                status = getTwoHandicap({ h_score, a_score, handicap: bet.oddData.handicap, oddType });
            }
            else if ((marketId === 'main_odds' && market_List_Id === "goal_line")) {
                const oddType = getoddTypeData(bet.oddData.header);
                status = getGoalLine({ t_score, handicap: bet.oddData.name, oddType });
            }
            else if ((marketId === 'main_odds' && market_List_Id === "corners")) {
                const oddType = getoddTypeData(bet.oddData.header);
                status = getCornerResult({ h_corner: h_t_corner, a_corner: a_t_corner, t_corner, r_corner: Number(bet.oddData.name), oddType });
            }
            else if ((marketId === 'main_odds' && market_List_Id === "both_teams_to_receive_a_card")) {
                status = getIsBothCard({ h_card: h_t_card, a_card: a_t_card, r_card: bet.oddData.name });
            }
            else if ((marketId === 'main_odds' && market_List_Id === "draw_no_bet")) {
                const oddType = getoddTypeData(bet.oddData.name);
                status = getDrawNoBet({ h_score, a_score, oddType });
            }
            else if ((marketId === 'specials_odds' && market_List_Id === "specials")) {
                const oddType = getoddTypeData(bet.oddData.header);
                status = getSpecicalSpOdd({ h_score, a_score, oddType, betType: bet.oddData.name, data });
            }
            else if ((marketId === 'specials_odds' && market_List_Id === "to_score_a_penalty")) {
                status = getGoalWithPenalty({ betType: bet.oddData.name, data });
            }
            else if ((marketId === 'specials_odds' && market_List_Id === "to_miss_a_penalty")) {
                status = getMissPenalty({ betType: bet.oddData.name, data });
            }
            else if ((marketId === 'specials_odds' && market_List_Id === "own_goal")) {
                status = getOwnGoal({ betType: bet.oddData.name.toLowerCase(), data });
            }
            else if ((marketId === 'specials_odds' && market_List_Id === "team_performances")) {
                const oddType = getoddTypeData(bet.oddData.header);
                status = getTeamPerformances({ handicap: bet.oddData.handicap, oddType, data });
            }
            else if ((marketId === 'specials_odds' && market_List_Id === "match_shots_on_target")) {
                const oddType = getoddTypeData(bet.oddData.header);
                status = getOnShot({ handicap: Number(bet.oddData.name), oddType, data });
            }
            else if ((marketId === 'specials_odds' && market_List_Id === "match_shots")) {
                const oddType = getoddTypeData(bet.oddData.header);
                status = getShot({ handicap: Number(bet.oddData.name), oddType, data });
            }
            else if ((marketId === 'specials_odds' && market_List_Id === "team_shots_on_target")) {
                const oddType = getoddTypeData(bet.oddData.header);
                status = getTeamShotOnTarget({ betType: bet.oddData.handicap.toLowerCase(), oddType, data });
            }
            else if ((marketId === 'specials_odds' && market_List_Id === "team_shots")) {
                const oddType = getoddTypeData(bet.oddData.header);
                status = getTeamShot({ betType: bet.oddData.handicap.toLowerCase(), oddType, data });
            }
            else if ((marketId === 'specials_odds' && market_List_Id === "team_offsides")) {
                const oddType = getoddTypeData(bet.oddData.header);
                status = getTeamOffSide({ h_t_offSides, a_t_offSides, oddType, betType: bet.oddData.handicap });
            }
            else if ((marketId === 'specials_odds' && market_List_Id === "player_shots_on_target_over_under")) {
                const oddType = getoddTypeData(bet.oddData.name2);
                const underOver = getoddTypeData(bet.oddData.header);
                const handicap = getHandicapData(bet.oddData.handicap);
                status = getPlayerShotsOnTarget({ handicap, oddType, underOver, playerName: bet.oddData.name, data });
            }
            else if ((marketId === 'specials_odds' && market_List_Id === "player_assists")) {
                const oddType = getoddTypeData(bet.oddData.name2);
                const underOver = getoddTypeData(bet.oddData.header);
                const handicap = getHandicapData(bet.oddData.handicap);
                status = getPlayerAssists({ handicap, oddType, underOver, playerName: bet.oddData.name, data });
            }
            else if ((marketId === 'player_odds' && market_List_Id === "player_to_score_or_assist")) {
                status = getPlayerScoreOrAssists({ playerName: bet.oddData.name, data });
            }
            else if ((marketId === 'player_odds' && market_List_Id === "player_to_be_booked")) {
                status = getIsPlayerBooked({ data, player: bet.oddData.name });
            }
            else if ((marketId === 'player_odds' && market_List_Id === "player_shots_on_target_over_under")) {
                const oddType = getoddTypeData(bet.oddData.name2);
                const underOver = getoddTypeData(bet.oddData.header);
                const handicap = getHandicapData(bet.oddData.handicap);
                status = getPlayerShotsOnTarget({ handicap, oddType, underOver, playerName: bet.oddData.name, data });
            }
            else if ((marketId === 'player_odds' && market_List_Id === "player_shots_over_under")) {
                const oddType = getoddTypeData(bet.oddData.name2);
                const underOver = getoddTypeData(bet.oddData.header);
                const handicap = getHandicapData(bet.oddData.handicap);
                status = getPlayerShot({ handicap, oddType, underOver, playerName: bet.oddData.name, data });
            }
            else if ((marketId === 'player_odds' && market_List_Id === "player_assists")) {
                const oddType = getoddTypeData(bet.oddData.name2);
                const underOver = getoddTypeData(bet.oddData.header);
                const handicap = getHandicapData(bet.oddData.handicap);
                status = getPlayerAssists({ handicap, oddType, underOver, playerName: bet.oddData.name, data });
            }
            // events api
            else if (marketId.indexOf('_1') !== -1 || marketId === '13_4') {
                if (SportId === 1) {
                    status = get1X2({ h_score, a_score, oddType });
                }
                else if (SportId === 17) {
                    const { h_score, a_score } = getHockeyScore(data.scores);
                    status = get1X2({ h_score, a_score, oddType });
                }
                else {
                    status = get1X2({ h_score, a_score, oddType });
                }
            }
            else if (marketId.indexOf('_2') !== -1) {
                status = getHandicap({ h_score, a_score, oddType, handicap });
            }
            else if (marketId.indexOf('_3') !== -1) {
                status = getOverUnder({ t_score, oddType, handicap });
            }
            else if (marketId === '1_4') {
                const corner = getCorner((_p = data.stats) === null || _p === void 0 ? void 0 : _p.corners);
                if (corner) {
                    status = getOverUnder({ t_score: corner, oddType, handicap });
                }
                else {
                    status = 'REFUND';
                }
            }
            else if (marketId === '1_5') {
                const { home, away } = getSHScore(data.scores);
                status = getHandicap({
                    h_score: home,
                    a_score: away,
                    oddType,
                    handicap
                });
            }
            else if (marketId === '1_6') {
                const { total } = getSHScore(data.scores);
                status = getOverUnder({ t_score: total, oddType, handicap });
            }
            else if (marketId === '1_7') {
                const corner = getCorner(data.stats.corner_h);
                if (corner) {
                    status = getOverUnder({ t_score: corner, oddType, handicap });
                }
                else {
                    status = 'REFUND';
                }
            }
            else if (marketId === '1_8') {
                const { home, away } = getSHScore(data.scores);
                status = get1X2({ h_score: home, a_score: away, oddType });
            }
            else if (marketId === '18_4') {
                const { home, away, state } = getBHScore(data.scores);
                if (state) {
                    status = get1X2({ h_score: home, a_score: away, oddType });
                }
                else {
                    status = 'REFUND';
                }
            }
            else if (marketId === '18_5') {
                const { home, away, state } = getBHScore(data.scores);
                if (state) {
                    status = getHandicap({
                        h_score: home,
                        a_score: away,
                        oddType,
                        handicap
                    });
                }
                else {
                    status = 'REFUND';
                }
            }
            else if (marketId === '18_6') {
                const { total, state } = getBHScore(data.scores);
                if (state) {
                    status = getOverUnder({ t_score: total, oddType, handicap });
                }
                else {
                    status = 'REFUND';
                }
            }
            else if (marketId === '18_7') {
                const { home, away, state } = getBQScore(data.scores, bet.oddData.q);
                if (state) {
                    status = get1X2({ h_score: home, a_score: away, oddType });
                }
                else {
                    status = 'REFUND';
                }
            }
            else if (marketId === '18_8') {
                const { home, away, state } = getBQScore(data.scores, bet.oddData.q);
                if (state) {
                    status = getHandicap({
                        h_score: home,
                        a_score: away,
                        oddType,
                        handicap
                    });
                }
                else {
                    status = 'REFUND';
                }
            }
            else if (marketId === '18_9') {
                const { total, state } = getBQScore(data.scores, bet.oddData.q);
                if (state) {
                    status = getOverUnder({ t_score: total, oddType, handicap });
                }
                else {
                    status = 'REFUND';
                }
            }
            else if (marketId === '3_4') {
                status = getDrawNoBet({ h_score, a_score, oddType });
            }
            else {
                status = 'REFUND';
            }
            const profit = getProfit({ status, bet });
            const scores = { home: h_score, away: a_score, total: t_score };
            return { profit, status, scores, state };
        }
        else {
            console.log(bet.eventId, bet.SportId);
            return { profit: 0, status: '', scores: {}, state: false };
        }
    }
    catch (error) {
        console.log('error bettingSettled =>', error);
        return { profit: 0, status: '', scores: {}, state: false };
    }
});
exports.bettingSettled = bettingSettled;
const getResult = () => __awaiter(void 0, void 0, void 0, function* () {
    var _q, _r;
    const sportsBets = yield models_1.SportsBetting.aggregate([
        {
            $match: {
                status: 'BET',
                SportId: { $ne: 1 },
            }
        },
        {
            $lookup: {
                from: 'sports_end_matchs',
                localField: 'eventId',
                foreignField: 'id',
                as: 'matchs'
            }
        },
        {
            $unwind: '$matchs'
        },
        {
            $match: {
                'matchs.time_status': 3
            }
        }
    ]);
    for (const i in sportsBets) {
        const data = yield (0, sportsrealtime_1.getEndedDate)(sportsBets[i].eventId);
        if (!data) {
            console.log(`no data => `, data);
        }
        else if (data.id !== String(sportsBets[i].eventId)) {
            console.log(`not match id => `, data.id);
        }
        else if ((data === null || data === void 0 ? void 0 : data.ss) !== ((_q = sportsBets[i].matchs) === null || _q === void 0 ? void 0 : _q.ss) || JSON.stringify(data === null || data === void 0 ? void 0 : data.scores) !== JSON.stringify((_r = sportsBets[i].matchs) === null || _r === void 0 ? void 0 : _r.scores)) {
            console.log(`not match scores => `, data.id, data.id);
        }
        else if (data.time_status === '3') {
            const bet = sportsBets[i];
            if (bet.matchs.time_status != '3' || data.time_status != '3') {
                console.log(`not ended`, data.id);
            }
            else {
                const result = yield (0, exports.bettingSettled)({ bet, data });
                if (result.state) {
                    yield models_1.SportsBetting.updateOne({ _id: (0, base_1.ObjectId)(bet._id) }, result);
                    console.log(data.time_status, '=>', bet.eventId);
                    count++;
                }
                else {
                    console.log(`status false`, result, data.id);
                }
            }
        }
        else {
            console.log(`time status => `, data.id);
        }
    }
});
const updateBalance = () => __awaiter(void 0, void 0, void 0, function* () {
    const sportsBets = yield models_1.SportsBets.aggregate([
        {
            $match: {
                status: 'BET',
                // SportId: { $ne: 1 },
            }
        },
        {
            $lookup: {
                from: 'sports_bettings',
                localField: '_id',
                foreignField: 'betId',
                as: 'bettings'
            }
        }
    ]);
    for (const i in sportsBets) {
        const { userId, currency, bettings, stake } = sportsBets[i];
        if (sportsBets[i].type === 'single') {
            const bettings = sportsBets[i].bettings[0];
            const status = bettings.status;
            const profit = bettings.profit;
            const _id = (0, base_1.ObjectId)(bettings.betId);
            if (status !== 'BET') {
                yield models_1.SportsBets.updateOne({ _id }, { status, profit });
                if (status !== 'BET' && status !== 'SETTLED' && status !== 'LOST') {
                    // if (status === 'HALF_LOST') {
                    //     await handleBet({
                    //         userId,
                    //         currency,
                    //         amount: profit,
                    //         type: 'sports-single-settled',
                    //         info: String(_id)
                    //     });
                    // } else {
                    const currencyData = yield models_1.Currencies.findById((0, base_1.ObjectId)(currency));
                    yield (0, base_1.handleBet)({
                        userId,
                        currency,
                        amount: profit,
                        type: 'sports-single-settled',
                        status: status === 'WIN' || status === 'HALF_WIN',
                        info: String(_id)
                    });
                    if (status !== 'HALF_LOST')
                        yield (0, affiliate_1.activityPostBack)({
                            playerid: userId, ggr: (bettings.stake - profit), ngr: (bettings.stake - profit), payouts: profit, turnover: bettings.stake, bonuses: 0, local_currency: currencyData.symbol
                        });
                    // }
                }
                else {
                    const currencyData = yield models_1.Currencies.findById((0, base_1.ObjectId)(currency));
                    yield (0, affiliate_1.activityPostBack)({
                        playerid: userId, ggr: bettings.stake, ngr: bettings.stake, turnover: bettings.stake, payouts: 0, bonuses: 0, local_currency: currencyData.symbol
                    });
                }
                single++;
            }
        }
        else if (sportsBets[i].type === 'multi') {
            const _id = (0, base_1.ObjectId)(sportsBets[i]._id);
            let lostCount = 0;
            let endCount = 0;
            let potential = sportsBets[i].stake;
            for (const j in bettings) {
                const { status, odds } = bettings[j];
                if (status !== 'BET') {
                    if (status === 'LOST') {
                        lostCount++;
                    }
                    else if (status === 'WIN') {
                        potential *= odds;
                    }
                    else if (status === 'HALF_WIN') {
                        const stake = sportsBets[i].stake;
                        potential *= ((stake * odds - stake) / 2 + stake) / stake;
                    }
                    else if (status === 'HALF_LOST') {
                        potential *= 0.5;
                    }
                    endCount++;
                }
            }
            if (lostCount > 0) {
                yield models_1.SportsBets.updateOne({ _id }, { status: 'LOST', profit: stake * -1 });
                multi++;
            }
            else if (endCount === bettings.length) {
                const status = lostCount === 0 ? 'WIN' : 'LOST';
                const profit = lostCount === 0 ? potential : stake * -1;
                yield models_1.SportsBets.updateOne({ _id }, { status, profit });
                if (lostCount === 0) {
                    yield (0, base_1.handleBet)({
                        userId,
                        currency,
                        amount: profit,
                        type: 'sports-multi-settled',
                        status: true,
                        info: String(_id)
                    });
                }
                multi++;
            }
        }
    }
});
const Result = () => {
    try {
        const job = new cron_1.CronJob(process.env.RESULT_TIME, () => {
            (0, sportsrealtime_1.getEnds)();
            (0, football_1.getFootballBettingStatus)();
            getResult();
            (0, football_1.getSoccerResult)();
            (0, sportsmatchs_1.deleteMatchs)();
            // UpdatePrices();
            updateBalance();
            (0, payment_1.withdrawalTimer)();
            (0, payment_1.removePendingPayment)();
            console.log(moment().format('YYYY-MM-DD hh:mm:ss'), count, single, multi);
        });
        job.start();
    }
    catch (error) {
        console.log(error);
    }
};
exports.Result = Result;
