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
exports.getGameLimits = exports.getFreespinLimit = exports.cancelCampaign = exports.createCampaign = exports.getcampaignsList = exports.getVendorsList = exports.cancelUserCampaign = exports.ping = exports.finishround = exports.cancel = exports.status = exports.launchTimeLessTech = exports.getGameLists = exports.authenticate = exports.balance = exports.changebalance = void 0;
const crypto = require("crypto");
const axios_1 = require("axios");
const moment = require("moment-timezone");
const models_1 = require("../../models");
const base_1 = require("../base");
const affiliate_1 = require("../../utils/affiliate");
function generateSHA1Hash(input) {
    return crypto.createHash('sha1').update(input).digest('hex');
}
const API_URL = process.env.TIMELESSTECH_API_URL;
const OPERATOR_ID = process.env.TIMELESSTECH_OPERATOR_ID;
const SECRET_KEY = process.env.TIMELESSTECH_SECRET_KEY;
const CALLBACK_URL = process.env.TIMELESSTECH_CALLBACK_URL;
const LAUNCH_URL = process.env.TIMELESSTECH_LAUNCH_URL;
const DEFAULT_CURRENCY = 'USD';
const CURRENCY_LIST = ['EUR', 'CAD', 'USD'];
const globalTime = () => {
    return moment.tz(new Date(), process.env.TIME_ZONE).format('YYYY-MM-DD hh:mm:ss');
};
const errorRes = (request, code, message) => {
    return {
        request,
        response: {
            status: 'ERROR',
            response_timestamp: globalTime(),
            hash: generateSHA1Hash(`ERROR${globalTime()}${SECRET_KEY}`),
            data: {
                error_code: code,
                error_message: message,
            },
        },
    };
};
const changebalance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { command, data } = req.body;

        console.log(data, '====>timelesstech->changebalance->callback===');

        // Handle currency for both token and null token cases
        const currency = data.token ? data.token.split('-')[1] : data.currency_code;

        if (command !== 'changebalance')
            return res.json(errorRes(req.body, 'OP_21', 'Invalid token'));

        const user = yield models_1.Users.findById(data.user_id);
        if (!user) {
            console.error('USER NOT FOUND!');
            return res.json(errorRes(req.body, 'OP_34', 'Player is not found'));
        }

        if (data?.token && (data.transaction_type === 'WIN' || data.transaction_type === 'BET') && !user.status) {
            console.error('USER IS DISABLED!');
            return res.json(errorRes(req.body, 'OP_33', 'player blocked'));
        }

        // Check if this is a tournament/promo game ID that should accept WIN transactions
        const tournamentGame = yield models_1.TournamentGames.findOne({ game_id: data.game_id, status: true });
        const isTournamentGame = tournamentGame && data.transaction_type === 'WIN';
        
        let game = null;
        if (isTournamentGame) {
            // For tournament games, create a virtual game object for WIN transactions
            game = {
                game_code: data.game_id,
                game_name: tournamentGame.game_name,
                provider_code: tournamentGame.vendor,
                status: true,
                api_type: 'timelesstech',
                is_tournament: true,
                tournament_info: {
                    subtype: tournamentGame.subtype,
                    description: tournamentGame.description
                }
            };
            console.log(`[TOURNAMENT WIN] Accepting WIN transaction for tournament game: ${data.game_id} (${tournamentGame.game_name}) - ${tournamentGame.subtype}`);
        } else {
            // Regular game lookup
            game = yield models_1.GameLists.findOne({ game_code: data.game_id, api_type: 'timelesstech', status: true });
            if (!game) {
                console.error('GAME NOT FOUND! changebalance');
                return res.json(errorRes(req.body, 'OP_35', 'Game is disabled'));
            }
        }

        if (data?.token && (data.transaction_type === 'WIN' || data.transaction_type === 'BET') && game.disabled) {
            console.error('GAME IS DISABLED!');
            return res.json(errorRes(req.body, 'OP_35', 'Game is disabled'));
        }

        const exists = yield models_1.GameHistories.findOne({
            txn_id: data.transaction_id,
            // ...(data.transaction_type === 'BET' && {
            //     round_id: data.round_id,
            //     txn_type: data.transaction_type,
            // })
        });

        let balance = yield models_1.Balances.findOne({ userId: user._id, status: true });
        if (!balance) {
            console.error('BALANCE NOT FOUND!');
            return res.json(errorRes(req.body, 'OP_30', 'Invalid currency'));
        }

        if (exists) {
            const param = {
                balance: (0, base_1.NumberFix)(balance.balance + balance.bonus, 2),
                currency_code: currency,
            };
            const response = {
                status: 'OK',
                response_timestamp: globalTime(),
                hash: generateSHA1Hash(`OK${globalTime()}${SECRET_KEY}`),
                data: param,
            };
            return res.json({ request: req.body, response });
        }
        const isBonusStatus = balance.balance < data.amount || (data.transaction_type === 'BET' && data.amount === 0);
        const activeBonus = yield models_1.BonusHistories.findOne({ userId: user._id, status: 'active' });
        if (data.transaction_type === 'BET') {
            const betlimit = yield (0, base_1.checkBetLimit)(user._id);
            if (!betlimit) {
                console.error('Your Bet Limited!');
                return res.json(errorRes(req.body, 'OP_32', 'Limits reached'));
            }
        }
        if (data.transaction_type === 'BET' && data.amount > 0) {
            if ((balance.balance + balance.bonus) < data.amount) {
                console.error('AMOUNT NOT ENOUGH!');
                return res.json(errorRes(req.body, 'OP_31', 'Insufficient funds'));
            }

            if ((balance.balance < data.amount) && activeBonus?.bonusId &&
                ((data.amount - balance.balance) > activeBonus.bonusId.max_bet_bonus_amount)
            ) {
                console.error('AMOUNT NOT ENOUGH!');
                return res.json(errorRes(req.body, 'OP_31', 'Insufficient funds'));
            }

            if (balance.balance >= data.amount) {
                balance = yield models_1.Balances.findOneAndUpdate(
                    { userId: user._id, status: true },
                    { $inc: { balance: -data.amount } },
                    { new: true }
                );
            } else {
                const bonusDeduct = data.amount - balance.balance;
                balance = yield models_1.Balances.findOneAndUpdate(
                    { userId: user._id, status: true },
                    {
                        $set: { balance: 0 },
                        $inc: { bonus: -(0, base_1.NumberFix)(bonusDeduct, 2) }
                    },
                    { new: true }
                );
            }

            yield models_1.Users.findOneAndUpdate(
                { _id: user._id },
                {
                    last_bet: new Date(),
                    last_game: game.game_code
                }
            );

            yield (0, base_1.checkCasinoBonus)({
                userId: user._id,
                amount: (0, base_1.NumberFix)(data.amount, 2),
                isBonusPlay: isBonusStatus,
                game_code: game.game_code,
            });
            if (user.affiliate)
                yield (0, affiliate_1.activityPostBack)({
                    playerid: user._id,
                    ggr: (0, base_1.NumberFix)(data.amount, 2),
                    ngr: (0, base_1.NumberFix)(data.amount, 2),
                    turnover: (0, base_1.NumberFix)(data.amount, 2),
                    payouts: 0,
                    bonuses: 0,
                    local_currency: balance.currency.symbol,
                });
        }
        let betHistory = null;
        if (data.transaction_type === 'WIN' || data.transaction_type === 'REFUND') {
            betHistory = yield models_1.GameHistories.findOne({ round_id: data.round_id, txn_type: 'BET' });
            if (!betHistory) {
                console.error('BET HISTORY NOT FOUND!');
                return res.json(errorRes(req.body, 'OP_21', 'Invalid token'));
            }
            if (betHistory.isBonusPlay) {
                balance = yield models_1.Balances.findOneAndUpdate(
                    { userId: user._id, status: true },
                    { $inc: { bonus: (0, base_1.NumberFix)(data.amount, 2) } },
                    { new: true }
                );
            } else {
                balance = yield models_1.Balances.findOneAndUpdate(
                    { userId: user._id, status: true },
                    { $inc: { balance: (0, base_1.NumberFix)(data.amount, 2) } },
                    { new: true }
                );
            }
            console.log(balance.balance, balance.bonus, '===>isFreespin : ', data.amount);
            // if (data.transaction_type === 'WIN' && balance.isFreespinPlay && activeBonus)
            //     await BonusHistories.updateOne(
            //         { userId: user._id, status: 'active' },
            //         {
            //             $inc: { amount: NumberFix(data.amount, 2) },
            //         }
            //     );
            if (user.affiliate)
                yield (0, affiliate_1.activityPostBack)({
                    playerid: user._id,
                    ggr: (0, base_1.NumberFix)(data.amount * -1, 2),
                    ngr: (0, base_1.NumberFix)(data.amount * -1, 2),
                    turnover: 0,
                    payouts: !betHistory.isBonusPlay ? (0, base_1.NumberFix)(data.amount, 2) : 0,
                    bonuses: betHistory.isBonusPlay ? (0, base_1.NumberFix)(data.amount, 2) : 0,
                    local_currency: balance.currency.symbol,
                });
        }

        const query = {
            userId: user._id,
            currency: balance.currency._id,
            user_balance: (0, base_1.NumberFix)(balance.balance, 2),
            user_bonus: (0, base_1.NumberFix)(balance.bonus, 2),
            provider_code: game.provider_code,
            game_code: game.game_code,
            txn_type: data.transaction_type,
            txn_id: data.transaction_id,
            round_id: data.round_id,
            other: JSON.stringify(data),
            isBonusPlay: isBonusStatus,
        };
        if (data.transaction_type === 'BET') {
            query.bet_money = data.amount;
        }
        if (data.transaction_type === 'WIN') {
            query.win_money = data.amount;
            query.isBonusPlay = betHistory === null || betHistory === void 0 ? void 0 : betHistory.isBonusPlay;
        }
        if (data.transaction_type === 'REFUND') {
            query.refund_money = data.amount;
            query.isBonusPlay = betHistory === null || betHistory === void 0 ? void 0 : betHistory.isBonusPlay;
        }
        const history = yield models_1.GameHistories.create(query);
        if (data.amount > 0) {
            const query2 = {
                userId: user._id,
                amount: (0, base_1.NumberFix)(-1 * data.amount, 2),
                currency: balance.currency._id,
                type: 'casino-bet',
                currentBalance: (0, base_1.NumberFix)(balance.balance),
                beforeBalance: (0, base_1.NumberFix)(balance.balance - (0, base_1.NumberFix)(-1 * data.amount, 2)),
                bonus: (0, base_1.NumberFix)(balance.bonus, 2),
                info: `gamehistories_${history._id}`,
                isBonusPlay: query.isBonusPlay,
            };
            if (data.transaction_type === 'WIN' || data.transaction_type === 'REFUND') {
                query2.amount = (0, base_1.NumberFix)(data.amount, 2);
                query2.type = data.transaction_type === 'WIN' ? 'casino-win' : 'casino-refund';
                query2.beforeBalance = (0, base_1.NumberFix)(balance.balance - (0, base_1.NumberFix)(data.amount, 2));
                // if (query.isBonusPlay) {
                //     query2.type = query2.type + '(bonus)';
                //     const qy = {
                //         userId: user._id,
                //         amount: query2.amount,
                //         isDeposit: 0,
                //         status: 'finished',
                //     };
                //     await BonusHistories.create(qy);
                // }
            }
            if (!query.isBonusPlay) {
                yield models_1.BalanceHistories.create(query2);
            }
            if (data.transaction_type === 'BET') {
                yield (0, base_1.checkTierStatus)(user._id);
                // await checkCasinoBonus({ balanceId: updated._id, balanceHistoryId: balanceHistory._id, spend_amount: data.amount })
            }
        }

        // Логирование для отладки race conditions

        const param = {
            balance: (0, base_1.NumberFix)(balance.balance + balance.bonus),
            currency_code: currency,
        };

        console.log(param, '====>timelesstech->response===');
        const response = {
            status: 'OK',
            response_timestamp: globalTime(),
            hash: generateSHA1Hash(`OK${globalTime()}${SECRET_KEY}`),
            data: param,
        };
        return res.json({ request: req.body, response });
    }
    catch (error) {
        console.error(error);
        return res.json(errorRes(req.body, 'OP_31', 'Insufficient funds'));
    }
});
exports.changebalance = changebalance;

const balance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { command, data } = req.body;
        const currency = data.token.split('-')[1];
        if (command !== 'balance')
            return res.json(errorRes(req.body, 'OP_30', 'Invalid currency'));
        console.log('====>timelesstech->balance->callback===');
        const session = yield models_1.Sessions.findOne({ userId: data.user_id });
        if (!session) {
            console.error('SESSION NOT FOUND!');
            return res.json(errorRes(req.body, 'OP_21', 'Invalid token'));
        }
        const user = yield models_1.Users.findById(data.user_id);
        if (!user) {
            console.error('USER NOT FOUND!');
            return res.json(errorRes(req.body, 'OP_21', 'Invalid token'));
        }
        const balance = yield models_1.Balances.findOne({ userId: user._id, status: true });
        if (!balance) {
            console.error('BALANCE NOT FOUND!');
            return res.json(errorRes(req.body, 'OP_30', 'Invalid currency'));
        }

        // Логирование запроса баланса
        console.log(`[BALANCE REQUEST] User: ${user._id}, Currency: ${currency}`);

        const param = {
            balance: (0, base_1.NumberFix)(balance.balance + balance.bonus, 2),
            currency_code: currency,
        };
        const response = {
            status: 'OK',
            response_timestamp: globalTime(),
            hash: generateSHA1Hash(`OK${globalTime()}${SECRET_KEY}`),
            data: param,
        };
        return res.json({ request: req.body, response });
    }
    catch (error) {
        console.error(error);
        return res.json(errorRes(req.body, 'OP_30', 'Invalid currency'));
    }
});
exports.balance = balance;
const authenticate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { command, data } = req.body;
        if (command !== 'authenticate')
            return res.json(errorRes(req.body, 'OP_21', 'Invalid token'));
        const userCode = data.token.split('-')[0];
        const currency = data.token.split('-')[1];
        if (!userCode) {
            console.error('TOKEN NOT FOUND!');
            return res.json(errorRes(req.body, 'OP_21', 'Invalid token'));
        }
        console.log('====>timelesstech->authenticate->callback===');
        const session = yield models_1.Sessions.findOne({ userId: userCode });
        if (!session) {
            console.error('SESSION NOT FOUND!');
            return res.json(errorRes(req.body, 'OP_21', 'Invalid token'));
        }
        const user = yield models_1.Users.findById(userCode);
        if (!user) {
            console.error('USER NOT FOUND!');
            return res.json(errorRes(req.body, 'OP_22', 'Authorization failed'));
        }
        const balance = yield models_1.Balances.findOne({ userId: user._id, status: true });
        if (!balance) {
            console.error('BALANCE NOT FOUND!');
            return res.json(errorRes(req.body, 'OP_22', 'Authorization failed'));
        }

        const param = {
            user_id: String(user._id),
            user_name: user.username,
            display_name: user.username,
            user_country: 'belarus',
            balance: (0, base_1.NumberFix)(balance.balance + balance.bonus, 2),
            currency_code: currency,
        };
        const response = {
            status: 'OK',
            response_timestamp: globalTime(),
            hash: generateSHA1Hash(`OK${globalTime()}${SECRET_KEY}`),
            data: param,
        };
        return res.json({ request: req.body, response });
    }
    catch (error) {
        console.error(error);
        return res.json(errorRes(req.body, 'OP_21', 'Invalid token'));
    }
});
exports.authenticate = authenticate;
const getGameLists = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('------getting Timelesstech gamelist-------');
        const url = `${API_URL}/api/generic/games/list/all`;
        const authorization = generateSHA1Hash(`games${OPERATOR_ID}${SECRET_KEY}`);
        console.log({ url, authorization });
        const data = yield axios_1.default.get(url, {
            headers: {
                'X-Authorization': authorization,
                'X-Operator-Id': OPERATOR_ID,
            },
        });
        if (!(data === null || data === void 0 ? void 0 : data.data))
            return res.json('API faild');
        const { games } = data.data;
        console.log(games.length, '==>games');
        const providers = [];
        const lists = [];
        games.forEach((row) => __awaiter(void 0, void 0, void 0, function* () {
            const state = providers.some((e) => e.name === row.type && e.type === row.subtype);
            if (!state) {
                providers.push({
                    name: row.type,
                    code: `${row.subtype}-${row.type}`,
                    type: row.subtype,
                    api_type: 'timelesstech',
                });
            }
            const provider = providers.find((e) => e.name === row.type && e.type === row.subtype);
            if (!provider)
                return;
            const param = {
                game_name: row.title,
                game_code: row.id,
                banner: row.details.thumbnails['300x300'],
                provider_code: provider.code,
                api_type: 'timelesstech',
                details: Object.assign(Object.assign({}, row.details), { fun_mode: row.fun_mode, enabled: row.enabled, vendor: row.vendor, campaigns: row.campaigns, vendorGroups: row.vendorGroups }),
                status: true,
            };
            lists.push(param);
        }));
        yield models_1.GameProviders.deleteMany({ api_type: 'timelesstech' });
        yield models_1.GameProviders.insertMany(providers);
        for (const key in lists) {
            const row = lists[key];
            const game = yield models_1.GameLists.findOne({ game_code: row.game_code, api_type: 'timelesstech' });
            if (game) {
                if (game.banner.length === 17) {
                    // @ts-ignore
                    delete row.banner;
                }
                yield models_1.GameLists.updateOne({ game_code: row.game_code, api_type: 'timelesstech' }, row);
            }
            else {
                yield models_1.GameLists.create(row);
            }
        }
        const deleteItems = lists.map((row) => row.game_code);
        yield models_1.GameLists.deleteMany({ api_type: 'timelesstech', game_code: { $nin: deleteItems } });
        // await GameLists.insertMany(lists);
        return res.json({ providers, lists });
    }
    catch (err) {
        console.error(err.response.data);
        return res.json('faild');
    }
});
exports.getGameLists = getGameLists;
const launchTimeLessTech = ({ userCode, game_code, provider, currency, fun_mode = false }) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const PragmaticGames = ['pragmatic', 'pragmatic-live', 'pragmatic-bj', 'pragmaticS', 'pragmatic-virtual'];
        const isPragmaticLive = PragmaticGames.includes(provider);
        const _currency = currency || DEFAULT_CURRENCY;
        console.log(_currency, '====>currency');
        // if (!CURRENCY_LIST.includes(_currency))
        //     _currency = DEFAULT_CURRENCY;
        const uniqueToken = `${userCode}-${_currency}-${game_code}-${new Date().getTime()}`;
        let url = '';
        if (!fun_mode)
            url = `${isPragmaticLive ? 'https://run.games378.com' : LAUNCH_URL}/?operator_id=${OPERATOR_ID}&mode=real&game_id=${game_code}&token=${uniqueToken}&currency=${_currency}&language=en&home_url=${CALLBACK_URL}`;
        else
            url = `${isPragmaticLive ? 'https://run.games378.com' : LAUNCH_URL}/?operator_id=${OPERATOR_ID}&mode=fun&game_id=${game_code}&currency=${_currency}&language=en&home_url=${CALLBACK_URL}`;
        return { status: true, url };
    }
    catch (err) {
        console.error(err.response.data);
        return { status: false, msg: 'Casino API Lvslot Error!' };
    }
});
exports.launchTimeLessTech = launchTimeLessTech;
const status = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { command, data } = req.body;
        if (command !== 'status')
            return res.json(errorRes(req.body, 'OP_41', 'Transaction not found'));
        console.log(req.body, '====>timelesstech->status->callback===');
        const user = yield models_1.Users.findById(data.user_id);
        if (!user) {
            console.error('USER NOT FOUND!');
            return res.json(errorRes(req.body, 'OP_41', 'Transaction not found'));
        }
        const tx = yield models_1.GameHistories.findOne({
            userId: user._id,
            txn_id: data.transaction_id,
            txn_type: data.transaction_type,
            round_id: data.round_id,
        });
        if (!tx) {
            console.error('GAME NOT FOUND! status');
            return res.json(errorRes(req.body, 'OP_41', 'Transaction not found'));
        }
        const param = {
            user_id: String(user._id),
            transaction_id: data.transaction_id,
            transaction_status: tx.canceled ? 'CANCELED' : 'OK',
        };
        const response = {
            status: 'OK',
            response_timestamp: globalTime(),
            hash: generateSHA1Hash(`OK${globalTime()}${SECRET_KEY}`),
            data: param,
        };
        return res.json({ request: req.body, response });
    }
    catch (error) {
        console.error(error);
        return res.json(errorRes(req.body, 'OP_41', 'Transaction not found'));
    }
});
exports.status = status;
const cancel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { command, data } = req.body;
        if (command !== 'cancel')
            return res.json(errorRes(req.body, 'OP_41', 'Transaction not found'));
        console.log(req.body, '====>timelesstech->cancel->callback===');
        const user = yield models_1.Users.findById(data.user_id);
        if (!user) {
            console.error('USER NOT FOUND!');
            return res.json(errorRes(req.body, 'OP_41', 'Transaction not found'));
        }
        // First, look for the transaction WITHOUT the canceled filter
        const tx = yield models_1.GameHistories.findOne({
            userId: user._id,
            txn_id: data.transaction_id,
            round_id: data.round_id,
            game_code: data.game_id,
        });

        // If transaction not found at all, return error
        if (!tx) {
            console.error('TRANSACTION NOT FOUND!');
            return res.json(errorRes(req.body, 'OP_41', 'Transaction not found'));
        }

        // If transaction already canceled, return OK (idempotent behavior)
        if (tx.canceled) {
            console.log('Transaction already canceled, returning OK');
            const param = {
                user_id: String(user._id),
                transaction_id: data.transaction_id,
                transaction_status: 'CANCELED',
            };
            const response = {
                status: 'OK',
                response_timestamp: globalTime(),
                hash: generateSHA1Hash(`OK${globalTime()}${SECRET_KEY}`),
                data: param,
            };
            return res.json({ request: req.body, response });
        }

        const balance = yield models_1.Balances.findOne({ userId: user._id, currency: tx.currency });
        if (tx && tx.txn_type === 'BET') {
            const updated = yield models_1.Balances.findOneAndUpdate({ userId: user._id, currency: tx.currency }, {
                $inc: {
                    [tx.isBonusPlay ? 'bonus' : 'balance']: (0, base_1.NumberFix)(tx.bet_money, 2),
                },
            }, { upsert: true, new: true });
            yield models_1.GameHistories.updateOne({ _id: tx._id }, { canceled: true });
            const query2 = {
                userId: user._id,
                amount: (0, base_1.NumberFix)(tx.bet_money, 2),
                currency: updated.currency._id,
                type: 'casino-cancel',
                currentBalance: (0, base_1.NumberFix)(updated.balance, 2),
                beforeBalance: (0, base_1.NumberFix)(updated.balance - (0, base_1.NumberFix)(tx.bet_money, 2), 2),
                bonus: (0, base_1.NumberFix)(updated.bonus, 2),
                info: `gamehistories_${tx._id}`,
            };
            yield models_1.BalanceHistories.create(query2);
        }
        if (tx && (tx.txn_type === 'WIN' || tx.txn_type === 'REFUND')) {
            const amount = (tx.txn_type === 'WIN' && tx.win_money) || (tx.txn_type === 'REFUND' && tx.refund_money);
            const updated = yield models_1.Balances.findOneAndUpdate({ userId: user._id, currency: tx.currency }, {
                $inc: {
                    [tx.isBonusPlay ? 'bonus' : 'balance']: (0, base_1.NumberFix)(-1 * amount, 2),
                },
            }, { upsert: true, new: true });
            yield models_1.GameHistories.updateOne({ _id: tx._id }, { canceled: true });
            const query2 = {
                userId: user._id,
                amount: (0, base_1.NumberFix)(-1 * amount, 2),
                currency: updated.currency._id,
                type: 'casino-cancel',
                currentBalance: (0, base_1.NumberFix)(updated.balance, 2),
                beforeBalance: (0, base_1.NumberFix)(updated.balance - (0, base_1.NumberFix)(-1 * amount, 2), 2),
                bonus: (0, base_1.NumberFix)(updated.bonus, 2),
                info: `gamehistories_${tx._id}`,
            };
            yield models_1.BalanceHistories.create(query2);
        }
        const param = {
            user_id: String(user._id),
            transaction_id: data.transaction_id,
            transaction_status: 'CANCELED',
        };
        const response = {
            status: 'OK',
            response_timestamp: globalTime(),
            hash: generateSHA1Hash(`OK${globalTime()}${SECRET_KEY}`),
            data: param,
        };
        return res.json({ request: req.body, response });
    }
    catch (error) {
        console.error(error);
        return res.json(errorRes(req.body, 'OP_41', 'Transaction not found'));
    }
});
exports.cancel = cancel;

// const finishround = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
//     try {
//         const { command, data } = req.body;
//         if (command !== 'finishround')
//             return res.json(errorRes(req.body, 'OP_50', 'Internal error'));
//         console.log('====>timelesstech->finishround->callback===');
//         const user = yield models_1.Users.findById(data.user_id);
//         if (!user) {
//             console.error('USER NOT FOUND!');
//             return res.json(errorRes(req.body, 'OP_50', 'Internal error'));
//         }
//         const tx = yield models_1.GameHistories.findOne({
//             userId: user._id,
//             round_id: data.round_id,
//             game_code: data.game_id,
//         });
//         if (!tx) {
//             console.error('GAME NOT FOUND! finishround');
//             return res.json(errorRes(req.body, 'OP_50', 'Internal error'));
//         }
//         const query = {
//             userId: user._id,
//             currency: tx.currency,
//             user_balance: tx.user_balance,
//             user_bonus: tx.user_bonus,
//             provider_code: tx.provider_code,
//             game_code: tx.game_code,
//             txn_type: 'WIN',
//             txn_id: data.txn_id,
//             round_id: data.round_id,
//             other: JSON.stringify(data),
//             isBonusPlay: tx.isBonusPlay,
//             win_money: 0,
//         };
//         yield models_1.GameHistories.create(query);
//         const param = {
//             user_id: String(user._id),
//             round_id: data.round_id,
//             game_id: data.game_id,
//         };
//         const response = {
//             status: 'OK',
//             response_timestamp: globalTime(),
//             hash: generateSHA1Hash(`OK${globalTime()}${SECRET_KEY}`),
//             data: param,
//         };
//         return res.json({ request: req.body, response });
//     }
//     catch (error) {
//         console.error(error);
//         return res.json(errorRes(req.body, 'OP_50', 'Internal error'));
//     }
// });
// exports.finishround = finishround;

const finishround = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { command, data, request_timestamp, hash } = req.body;
        if (command !== 'finishround') {
            console.error('Invalid command:', command);
            return res.json(errorRes(req.body, 'OP_50', 'Internal error'));
        }

        console.log('====>timelesstech->finishround->callback===', JSON.stringify(req.body, null, 2));

        const user = yield models_1.Users.findById(data.user_id);
        if (!user) {
            console.error('USER NOT FOUND! user_id:', data.user_id);
            return res.json(errorRes(req.body, 'OP_50', 'Internal error'));
        }

        const tx = yield models_1.GameHistories.findOne({
            userId: user._id,
            round_id: data.round_id,
            game_code: data.game_id,
        });
        if (!tx) {
            console.error('GAME NOT FOUND! round_id:', data.round_id, 'game_id:', data.game_id);
            return res.json(errorRes(req.body, 'OP_50', 'Internal error'));
        }

        const query = {
            userId: user._id,
            currency: tx.currency,
            user_balance: tx.user_balance,
            user_bonus: tx.user_bonus,
            provider_code: tx.provider_code,
            game_code: tx.game_code,
            txn_type: 'WIN',
            txn_id: data.txn_id,
            round_id: data.round_id,
            other: JSON.stringify(data),
            isBonusPlay: tx.isBonusPlay,
            win_money: 0,
        };

        yield models_1.GameHistories.create(query);

        const response_data = {
            round_id: data.round_id,
            user_id: String(user._id),
            game_id: data.game_id,
        };

        const response_timestamp = globalTime();
        const response_hash = generateSHA1Hash(`OK${response_timestamp}${SECRET_KEY}`);

        const response = {
            request: {
                command,
                data: {
                    round_id: data.round_id,
                    user_id: data.user_id,
                    game_id: data.game_id,
                    round_date: data.round_date || null,
                    round_ts: data.round_ts || null,
                },
                request_timestamp: request_timestamp || globalTime(),
                hash: hash || null,
            },
            response: {
                status: 'OK',
                response_timestamp,
                hash: response_hash,
                data: response_data,
            },
        };

        console.log('====>timelesstech->finishround->response===', JSON.stringify(response, null, 2));

        return res.json(response);
    } catch (error) {
        console.error('finishround error:', error);
        return res.json(errorRes(req.body, 'OP_50', 'Internal error'));
    }
});
exports.finishround = finishround;

const ping = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return res.json('');
});
exports.ping = ping;
const cancelUserCampaign = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = req.params.id;
        if (!query)
            return;
        console.log('Cancel campaign => ', query);
        yield (0, exports.cancelCampaign)(query);
    }
    catch (error) {
        console.error('Error Cancel Campaign => ', error);
        return res.status(402).json('Internal server error');
    }
});
exports.cancelUserCampaign = cancelUserCampaign;
const getVendorsList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const url = `${API_URL}/api/generic/campaigns/vendors`;
        const authorization = generateSHA1Hash(`campaigns${OPERATOR_ID}${SECRET_KEY}`);
        console.log({ url, authorization });
        const data = yield axios_1.default.get(url, {
            headers: {
                'X-Authorization': authorization,
                'X-Operator-Id': OPERATOR_ID,
            },
        });
        if (!(data === null || data === void 0 ? void 0 : data.data))
            return res.json('API faild');
        return res.json(data === null || data === void 0 ? void 0 : data.data.data);
    }
    catch (error) {
        return res.status(402).json('Internal server error');
    }
});
exports.getVendorsList = getVendorsList;
const getcampaignsList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { vendors, currencies, players } = req.query;
        const url = `${API_URL}/api/generic/campaigns/vendors/list?vendors=${vendors}&currencies=${currencies}&players=${players}`;
        const authorization = generateSHA1Hash(`campaigns${OPERATOR_ID}${SECRET_KEY}`);
        console.log(url);
        const data = yield axios_1.default.get(url, {
            headers: {
                'X-Authorization': authorization,
                'X-Operator-Id': OPERATOR_ID,
            },
        });
        if (!(data === null || data === void 0 ? void 0 : data.data))
            return res.json('API faild');
        return res.json(data === null || data === void 0 ? void 0 : data.data.data);
    }
    catch (error) {
        return res.status(402).json('Internal server error');
    }
});
exports.getcampaignsList = getcampaignsList;

const createCampaign = async (games, userId, freespin, endDate, title, maxbet = 1) => {
    try {
        console.log('[DEBUG] createCampaign called with:', {
            games,
            userId,
            freespin,
            endDate,
            title,
            maxbet
        });

        const gameCodes = games.map((g) => (typeof g === 'string' ? g : g.game_code)).filter(Boolean);
        console.log('[DEBUG] Extracted game codes:', gameCodes);

        if (!gameCodes.length) {
            console.log('[DEBUG] No game codes found, returning false');
            return false;
        }

        const gameData = await models_1.GameLists.find({ game_code: { $in: gameCodes } });
        console.log('[DEBUG] Found game data:', gameData.length, 'games');

        if (!gameData.length) {
            console.log('[DEBUG] No game data found in database, returning false');
            return false;
        }

        const balance = await models_1.Balances.findOne({ userId, status: true });
        console.log('[DEBUG] User balance found:', balance ? 'Yes' : 'No');

        if (!balance) {
            console.log('[DEBUG] No active balance found, returning false');
            return false;
        }

        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Всегда читаем актуальный баланс из БД
        const freshBalance = await models_1.Balances.findOne({ _id: balance._id });
        if (!freshBalance) {
            console.log('[DEBUG] Fresh balance not found, returning false');
            return false;
        }

        const gameLabels = [];
        console.log('[DEBUG] Starting campaign creation for', gameData.length, 'games');

        for (const element of gameData) {
            console.log('[DEBUG] Processing game:', element.game_code, element.game_name);

            // Simply use the maxbet value as provided, no calculations needed
            let adjustedMaxBet = maxbet;

            console.log(`[DEBUG] Game: ${element.game_code}, using maxbet as is: ${adjustedMaxBet}`);

            // Only use bet_factor if maxbet is not provided or is 0
            if (!maxbet || maxbet <= 0) {
                const betFactor = element.details?.bet_factor || 0.1;
                adjustedMaxBet = betFactor;
                console.log(`[DEBUG] No maxbet provided, using bet_factor: ${adjustedMaxBet}`);
            }

            const url = `${API_URL}/api/generic/campaigns/create`;
            const authorization = generateSHA1Hash(`campaigns${OPERATOR_ID}${SECRET_KEY}`);
            const tensecafter = new Date(Date.now() + 10 * 1000);
            const begins_at = Math.floor(tensecafter.getTime() / 1000);
            const uniqueCampaignCode = `${element.game_code}-${Date.now()}`;

            const body = {
                vendor: element.details?.vendor || '3oaks',
                campaign_code: uniqueCampaignCode,
                freespins_per_player: freespin,
                begins_at,
                expires_at: Math.floor(endDate.getTime() / 1000),
                currency_code: freshBalance.currency.symbol,
                games: [
                    {
                        game_id: element.game_code,
                        total_bet: adjustedMaxBet,
                    },
                ],
                players: userId,
            };

            console.log('[DEBUG] API Request:', {
                url,
                body,
                headers: {
                    'X-Authorization': authorization,
                    'X-Operator-Id': OPERATOR_ID,
                }
            });

            try {
                const res = await axios_1.default.post(url, body, {
                    headers: {
                        'X-Authorization': authorization,
                        'X-Operator-Id': OPERATOR_ID,
                    },
                });

                console.log('[DEBUG] API Response:', res.data);

                if (res?.data?.status !== 'OK') {
                    console.error('[DEBUG] Campaign creation failed:', res.data);
                    return false;
                }

                console.log('[DEBUG] Campaign created successfully for game:', element.game_code);
                gameLabels.push(element.game_name);
            } catch (apiError) {
                console.error('[DEBUG] API request failed:', apiError.response?.data || apiError.message);
                return false;
            }
        }

        console.log('[DEBUG] Campaign creation completed. Game labels:', gameLabels);

        if (gameLabels.length) {
            console.log('[DEBUG] Creating notification for', gameLabels.length, 'games');
            await models_1.Notification.create({
                title,
                description: `You got ${freespin} free spins for [${gameLabels.join(', ')}]`,
                players: [userId],
                country: ['all'],
                param: gameData,
                auto: true,
            });
            console.log('[DEBUG] Notification created successfully');
        } else {
            console.log('[DEBUG] No game labels, skipping notification');
        }

        console.log('[DEBUG] createCampaign returning true');
        return true;
    } catch (error) {
        console.error('[DEBUG] Error in createCampaign:', error.response?.data || error.message);
        console.error('[DEBUG] Full error stack:', error.stack);
        return false;
    }
};

exports.createCampaign = createCampaign;

const cancelCampaign = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    try {
        const url = `${API_URL}/api/generic/campaigns/list?players=${String(userId)}`;
        const authorization = generateSHA1Hash(`campaigns${OPERATOR_ID}${SECRET_KEY}`);
        console.log(url);
        const res = yield axios_1.default.get(url, {
            headers: {
                'X-Authorization': authorization,
                'X-Operator-Id': OPERATOR_ID,
            },
        });
        if (!(res === null || res === void 0 ? void 0 : res.data))
            return false;
        const { status, data } = res.data;
        if (status !== 'OK')
            return false;
        if (!data.length)
            return false;
        const campaigns = data.filter((c) => c.canceled === 0);
        if (!campaigns.length)
            return false;
        for (const key in campaigns) {
            const row = campaigns[key];
            const url = `${API_URL}/api/generic/campaigns/cancel`;
            const authorization = generateSHA1Hash(`campaigns${OPERATOR_ID}${SECRET_KEY}`);
            const body = {
                campaign_code: row.campaign_code,
            };
            console.log(row.campaign_code, '---canceled----', userId);
            yield axios_1.default.post(url, body, {
                headers: {
                    'X-Authorization': authorization,
                    'X-Operator-Id': OPERATOR_ID,
                },
            });
        }
        return true;
    }
    catch (error) {
        console.error(((_c = error === null || error === void 0 ? void 0 : error.response) === null || _c === void 0 ? void 0 : _c.data) || error);
        return false;
    }
});
exports.cancelCampaign = cancelCampaign;
const getFreespinLimit = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield models_1.CampaignLimits.deleteMany({});
        const games = yield models_1.GameLists.find({
            'details.campaigns': 1,
        });
        const vendorIds = games.reduce((ary, game) => {
            const vendor = game.details.vendor;
            const exists = ary.includes(vendor);
            return exists ? ary : [...ary, vendor];
        }, []);
        const currencies = yield models_1.Currencies.find({
            isFiat: true,
        });
        const currencyIds = currencies.map((c) => c.symbol);
        if (!vendorIds.length)
            return;
        console.log('==>games', vendorIds);
        const authorization = generateSHA1Hash(`campaigns${OPERATOR_ID}${SECRET_KEY}`);
        for (const key in vendorIds) {
            const vendor = vendorIds[key];
            const url = `https://air.gameprovider.org/api/generic/campaigns/vendors/limits?vendors=${vendor}&currencies=${currencyIds.join(',')}`;
            console.log(url, '===>url', vendor);
            axios_1.default
                .get(url, {
                    headers: {
                        'X-Authorization': authorization,
                        'X-Operator-Id': OPERATOR_ID,
                    },
                })
                .then((response) => __awaiter(void 0, void 0, void 0, function* () {
                    if (!(response === null || response === void 0 ? void 0 : response.data))
                        return;
                    const { data } = response.data;
                    const query = data.reduce((ary, game) => {
                        const exists = games.some((e) => e.game_code === String(game.game_id));
                        if (exists)
                            return [
                                ...ary,
                                Object.assign(Object.assign({}, game), { game_code: String(game.game_id) }),
                            ];
                        return ary;
                    }, []);
                    console.log(data.length, '===>vendor:', query.length, vendor);
                    yield models_1.CampaignLimits.insertMany(query);
                }))
                .catch((error) => {
                    var _a;
                    console.error('Error vender=>', vendor, ' : ', ((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) || error);
                });
        }
    }
    catch (error) {
        console.error('Error Getting Freespin Limits', error);
        return false;
    }
});
exports.getFreespinLimit = getFreespinLimit;
const getGameLimits = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { vendors, currencies, games } = req.query;
        const url = `${API_URL}/api/generic/campaigns/vendors/limits?vendors=${vendors}&currencies=${currencies}&games=${games}`;
        const authorization = generateSHA1Hash(`campaigns${OPERATOR_ID}${SECRET_KEY}`);
        console.log(url);
        const data = yield axios_1.default.get(url, {
            headers: {
                'X-Authorization': authorization,
                'X-Operator-Id': OPERATOR_ID,
            },
        });
        if (!(data === null || data === void 0 ? void 0 : data.data))
            return res.json('API faild');
        return res.json(data === null || data === void 0 ? void 0 : data.data.data);
    }
    catch (error) {
        return res.status(402).json('Internal server error');
    }
});
exports.getGameLimits = getGameLimits;
// getFreespinLimit();
// cancelCampaign("673df5169a0663ea0e9d97da");