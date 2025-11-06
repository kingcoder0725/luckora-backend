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
exports.addBonus = exports.checkCashbackBonus = exports.cancel = exports.active = exports.getUserBonus = exports.get_bonuses_for_my_shares = exports.activateNoDepositBonus = exports.deleteOne = exports.updateOne = exports.create = exports.label = exports.updateHistory = exports.history = exports.list = exports.getOne = exports.get = void 0;
const base_1 = require("../base");
const models_1 = require("../../models");
const payment_1 = require("../payment");
const mongoose_1 = require("mongoose");
const timelesstech_1 = require("../games/timelesstech");
const tracking_1 = require("../journey/tracking");
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.body;
        const result = yield models_1.Bonus.find().sort({ order: 1 });
        res.json(result);
    }
    catch (error) {
        console.error(error);
        res.status(500).json('Internal server error');
    }
});
exports.get = get;

const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.body;
        const bonus = yield models_1.Bonus.findOne({ _id: (0, base_1.ObjectId)(req.params.id) });
        if (!bonus)
            return res.json([]);
        let allowed = false;
        if (userId) {
            const balance = yield models_1.Balances.findOne({ userId, status: true }).populate('userId');
            if (!balance)
                return res.status(402).json('User not found');
            if (bonus.player_type === 'player')
                allowed = bonus.players.includes(String(userId));
            if (bonus.player_type === 'segmentation') {
                if (!(bonus === null || bonus === void 0 ? void 0 : bonus.segmentation))
                    allowed = true;
                else {
                    const segmentation = yield models_1.Segmentations.findById(bonus.segmentation);
                    if (!segmentation)
                        return res.status(402).json('Segmentation not found');
                    allowed = yield (0, base_1.checkSegmentationPlayer)(segmentation, balance);
                }
            }
            if (bonus.day.length) {
                const dayIndex = new Date().getDay();
                const dayName = DAYS[dayIndex];
                allowed = bonus.day.includes(dayName);
            }
            return res.json(Object.assign(Object.assign({}, bonus.toObject()), { allowed }));
        }
        return res.json(bonus);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.getOne = getOne;

const list = async (req, res) => {
    try {
      const { pageSize = null, page = null, daily = null, from_date = null, to_date = null } = req.body;
  
      const query = {};
    if (daily && daily !== 'all') {
      query.daily = daily;
    }
    if (from_date && to_date) {
      query.from_date = { $gte: new Date(from_date) };
      query.to_date = { $lte: new Date(to_date) };
    }

    const count = await models_1.Bonus.countDocuments(query);
  
      let results;
      if (daily && daily !== 'all') {
      query.daily = daily;
    }
      if (!pageSize || !page) {
        results = await models_1.Bonus.find(query).sort({ createdAt: -1 });
      } else {
        results = await models_1.Bonus.find(query)
          .limit(pageSize)
          .skip((page - 1) * pageSize)
          .sort({ createdAt: -1 });
      }
  
      res.json({ results, count });
    } catch (error) {
      console.error('List error:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  };
  
  exports.list = list;

const history = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { pageSize = null, page = null, userId = null, bonus = null, sort = null, column = null, date = null, search = '' } = req.body;
    let query = {};
    let sortQuery = { createdAt: -1 };
    if (userId) {
        query.userId = (0, base_1.ObjectId)(userId);
    }
    if (bonus) {
        query.bonusId = (0, base_1.ObjectId)(bonus);
    }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    if (column) {
        sortQuery = { [column]: sort ? sort : 1 };
    }
    if (search) {
        query = Object.assign(Object.assign({}, query), { $or: [
                { status: { $regex: search, $options: 'i' } },
                ...(mongoose_1.default.Types.ObjectId.isValid(search) ? [{ _id: new mongoose_1.default.Types.ObjectId(search) }] : []),
            ] });
    }
    const count = yield models_1.BonusHistories.countDocuments(query);
    let results = [];
    if (!pageSize || !page) {
        results = yield models_1.BonusHistories.find(query).populate('userId').sort({ createdAt: -1, order: 1 });
    }
    else {
        results = yield models_1.BonusHistories.find(query)
            .limit(pageSize)
            .skip((page - 1) * pageSize)
            .populate('userId')
            .sort({ createdAt: -1, order: 1 });
    }
    return res.json({ results, count });
});
exports.history = history;

const updateHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { status } = req.body;
    const result = yield models_1.BonusHistories.findByIdAndUpdate((0, base_1.ObjectId)(req.params.id), req.body, { new: true, upsert: true });
    if (status === 'canceled') {
        yield models_1.Balances.updateOne({
            userId: result.userId,
            status: true,
        }, {
            bonus: 0,
            isBonusPlay: false,
        });
        yield (0, timelesstech_1.cancelCampaign)(result.userId);
    }
    // await checkBonus(result);
    res.json(result);
    return;
});
exports.updateHistory = updateHistory;


const label = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield models_1.Bonus.find({ status: true }).sort({ order: 1 });
        const result = data.map((e) => { var _a; return ({ label: (_a = e.lang[0]) === null || _a === void 0 ? void 0 : _a.title, value: e._id }); });
        return res.json(result);
    }
    catch (error) {
        console.error('Error get bonus label => ', error);
        return res.json(500).json('Internal Server Error');
    }
});
exports.label = label;

const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const body = req.body;

        if (body.currencies) {
            body.currencies = body.currencies.map(currency => {
                if (currency.player_type === 'player') {
                    delete currency.segmentation;
                }
                return currency;
            });
        }

        console.log(`[createBonus] Creating bonus with display=${body.display || 'not provided'}`);
        const bonus = yield models_1.Bonus.create(body);
        console.log(`[createBonus] Bonus created: _id=${bonus._id}, display=${bonus.display}`);

        const today = (0, base_1.globalTime)().format('YYYY-MM-DD');

        const hasCashback = bonus.currencies.some(currency => 
            currency.amount_type === 'cashback' &&
            bonus.cashback_date === today &&
            bonus.netlose_from >= 0 &&
            bonus.netlose_to > 0 &&
            bonus.calculation_period > 0 &&
            bonus.status
        );
        if (hasCashback) {
            console.log(`[createBonus] Cashback bonus detected, processing for bonus ${_id}`);
            yield (0, exports.checkCashbackBonus)(bonus);
        }

        const hasPlayerBonus = bonus.currencies.some(currency =>
            currency.player_type === 'player' &&
            (currency.players?.length > 0 || false) && 
            bonus.status &&
            bonus.display === false
        );

        if (hasPlayerBonus) {
            console.log(`[createBonus] Private bonus (display=false) detected, sending to players for bonus ${bonus._id}`);
            yield sendBonusPlayer(bonus);
        } else {
            console.log(`[createBonus] Bonus ${bonus._id} is global (display=true) or no valid players, skipping sendBonusPlayer`);
        }

        return res.json(bonus);
    }
    catch (error) {
        console.error(`[createBonus] Error creating bonus: ${error.message}`, error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.create = create;

const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const body = req.body;
        if (body.currencies) {
            body.currencies = body.currencies.map(currency => {
                if (currency.player_type === 'player') {
                    delete currency.segmentation;
                }
                return currency;
            });
        }
        console.log(`[updateBonus] Updating bonus _id=${req.params.id} with new data:`, JSON.stringify(body));
        const result = yield models_1.Bonus.findByIdAndUpdate((0, base_1.ObjectId)(req.params.id), body, { new: true, upsert: true });
        if (!result) {
            console.log(`[updateBonus] Bonus not found: _id=${req.params.id}`);
            return res.status(404).json('Bonus not found');
        }
        console.log(`[updateBonus] Bonus updated: _id=${result._id}, display=${result.display}`);
        
        const today = (0, base_1.globalTime)().format('YYYY-MM-DD');
        const hasCashback = result.currencies.some(currency => 
            currency.amount_type === 'cashback' &&
            result.cashback_date === today &&
            result.netlose_from >= 0 &&
            result.netlose_to > 0 &&
            result.calculation_period > 0 &&
            result.status
        );
        if (hasCashback) {
            console.log(`[updateBonus] Cashback bonus updated, re-processing for _id=${result._id}`);
            yield (0, exports.checkCashbackBonus)(result);
        }

        const hasPlayerBonus = result.currencies.some(currency =>
            currency.player_type === 'player' &&
            (currency.players?.length > 0 || false) && 
            result.status &&
            result.display === false
        );

        if (hasPlayerBonus) {
            console.log(`[updateBonus] Private bonus (display=false) updated, re-sending/updating to players for _id=${result._id}`);
            yield sendBonusPlayer(result);
        } else {
            console.log(`[updateBonus] Bonus ${result._id} is global (display=true) or no valid players, skipping sendBonusPlayer`);
        }

        res.json(result);
    }
    catch (error) {
        console.error(`[updateBonus] Error updating bonus _id=${req.params.id}: ${error.message}`, error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.updateOne = updateOne;


const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const bonusId = (0, base_1.ObjectId)(req.params.id);

    const result = yield models_1.Bonus.deleteOne({ _id: bonusId });

    const actived = yield models_1.BonusHistories.find({
        bonusId: bonusId,
        status: 'active',
    });

    if (!actived.length) {
        return res.json(result);
    }

    for (const row of actived) {
        yield models_1.Balances.updateOne(
            { userId: row.userId, status: true },
            { $inc: { bonus: -row.amount } }
        );
    }
    yield models_1.BonusHistories.updateMany(
        { bonusId: bonusId },
        { status: 'canceled' }
    );

    return res.json(result);
});
exports.deleteOne = deleteOne;

// const getUserBonus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
//     try {
//         const { userId } = req.body;

//         const now = new Date();
        
//         let result = yield models_1.Bonus.aggregate([
//             {
//                 $match: {
//                     $or: [
//                         {
//                             from_date: { $lt: now },
//                             to_date: { $gt: now },
//                         },
//                         {
//                             from_date: null,
//                             to_date: null,
//                         },
//                     ],
//                     status: true,
//                     daily: { $ne: "daily_wheel" },
//                 },
//             },
//             {
//                 $lookup: {
//                     from: 'bonus_events',
//                     localField: 'event',
//                     foreignField: '_id',
//                     as: 'event',
//                 },
//             },
//             { $unwind: '$event' },
//             { $sort: { order: 1 } },
//         ]);

//         if (userId) {
//             const ary = [];
//             const balance = yield models_1.Balances.findOne({ userId, status: true }).populate('userId');
//             if (!balance)
//                 return res.status(402).json('User not found');

//             for (const key in result) {
//                 let allowed = false;
//                 const bonus = result[key];
//                 if (bonus.display) {
//                     ary.push(bonus);
//                     continue;
//                 }
//                 if (bonus.player_type === 'player')
//                     allowed = bonus.players.includes(String(userId));
//                 if (bonus.player_type === 'segmentation') {
//                     if (!(bonus === null || bonus === void 0 ? void 0 : bonus.segmentation))
//                         allowed = true;
//                     else {
//                         const segmentation = yield models_1.Segmentations.findById(bonus.segmentation);
//                         if (!segmentation) {
//                             console.error('Segmentation not found');
//                             continue;
//                         }
//                         allowed = yield (0, base_1.checkSegmentationPlayer)(segmentation, balance);
//                     }
//                 }
//                 if (bonus.day.length) {
//                     const dayIndex = new Date().getDay();
//                     const dayName = DAYS[dayIndex];
//                     allowed = bonus.day.includes(dayName);
//                 }
//                 if (allowed) {
//                     ary.push(bonus);
//                 }
//             }
//             result = ary;
//         }

//         return res.json(result);
//     }
//     catch (error) {
//         console.error(error);
//         return res.status(500).json('Internal server error');
//     }
// });

// exports.getUserBonus = getUserBonus;

const getUserBonus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.body;

        const now = new Date();

        let result = yield models_1.Bonus.aggregate([
            {
                $match: {
                    $or: [
                        {
                            from_date: { $lt: now },
                            to_date: { $gt: now },
                        },
                        {
                            from_date: null,
                            to_date: null,
                        },
                    ],
                    status: true,
                    daily: { $ne: "daily_wheel" },
                },
            },
            {
                $lookup: {
                    from: 'bonus_events',
                    localField: 'event',
                    foreignField: '_id',
                    as: 'event',
                },
            },
            { $unwind: '$event' },
            { $sort: { order: 1 } },
        ]);

        if (userId) {
            const ary = [];
            const balance = yield models_1.Balances.findOne({ userId, status: true }).populate('currency');
            if (!balance) {
                return res.status(402).json('User not found');
            }
            const userCurrencySymbol = balance.currency.symbol;

            for (const bonus of result) {

                const matchingCurrency = bonus.currencies.find(currency => currency.currency === userCurrencySymbol);
                if (!matchingCurrency) {
                    continue; 
                }

                let allowed = false;

                if (bonus.display) {
                    ary.push(bonus);
                    continue;
                }
                if (matchingCurrency.player_type === 'player') {
                    allowed = matchingCurrency.players.includes(String(userId));
                }
                if (matchingCurrency.player_type === 'segmentation') {
                    if (!matchingCurrency.segmentation) {
                        allowed = true;
                    } else {
                        const segmentation = yield models_1.Segmentations.findById(matchingCurrency.segmentation);
                        if (!segmentation) {
                            console.error('Segmentation not found');
                            continue;
                        }
                        allowed = yield (0, base_1.checkSegmentationPlayer)(segmentation, balance);
                    }
                }
                if (bonus.day.length) {
                    const dayIndex = new Date().getDay();
                    const dayName = DAYS[dayIndex];
                    allowed = bonus.day.includes(dayName);
                }
                if (allowed) {
                    ary.push(bonus);
                }
            }
            result = ary;
        }

        return res.json(result);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json('Internal server error');
    }
});

exports.getUserBonus = getUserBonus;

// const get_bonuses_for_my_shares = async (req, res) => {
//   try {
//     const { userId } = req.body;
//     const bonusHistories = await models_1.BonusHistories.find({ userId })
//       .populate({
//         path: 'bonusId',
//         populate: { path: 'event' },
//       });

//     if (!bonusHistories.length) {
//       return res.json([]);
//     }

//     const validHistories = bonusHistories.filter((history) => {
//       if (!history.bonusId) {
//         return false;
//       }
//       if (!history.bonusId.lang || !Array.isArray(history.bonusId.lang)) {
//         return false;
//       }
//       return true;
//     });

//     if (!validHistories.length) {
//       return res.json([]);
//     }

//     const result = [];
//     const now = new Date();


//     for (const history of validHistories) {
//       const bonus = history.bonusId;

//       const fromDate = bonus.from_date ? new Date(bonus.from_date) : null;
//       const toDate = bonus.to_date ? new Date(bonus.to_date) : null;
//       const isExpiredByDate = fromDate && toDate && (now < fromDate || now > toDate);
//     //   const status = isExpiredByDate && history.status !== 'finished' ? 'expired' : history.status;

//     let status = history.status;
//       if (status === 'processing' && history.expireProcessingDate) {
//         const expireDate = new Date(history.expireProcessingDate);
//         if (now > expireDate) {
//           status = 'expired';
//           await models_1.BonusHistories.updateOne(
//             { _id: history._id },
//             { status: 'expired', updatedAt: now }
//           );
//         }
//       } else if (isExpiredByDate && status !== 'finished') {
//         status = 'expired';
//         if (history.status !== 'expired') {
//           await models_1.BonusHistories.updateOne(
//             { _id: history._id },
//             { status: 'expired', updatedAt: now }
//           );
//         }
//       }

//       const conditions = {
//         deposit: {
//           required: bonus.deposit_amount_from > 0 || bonus.deposit_amount_to > 0,
//           completed: false,
//           amountFrom: bonus.deposit_amount_from || 0,
//           amountTo: bonus.deposit_amount_to || 0,
//           userDeposit: 0,
//         },
//         spend: {
//           required: bonus.spend_amount > 0,
//           completed: false,
//           amount: bonus.spend_amount || 0,
//           userSpend: 0,
//         },
//         netLoss: {
//           required: bonus.netlose_from >= 0 && bonus.netlose_to > 0 && bonus.calculation_period > 0,
//           completed: false,
//           netloseFrom: bonus.netlose_from || 0,
//           netloseTo: bonus.netlose_to || 0,
//           userNetLoss: 0,
//         },
//       };

//       let calculatedBonusAmount = 0;
//       let wagerAmount = 0;

// if (conditions.deposit.required) {
//   const deposits = await models_1.Payments.find({
//     userId,
//     ipn_type: 'deposit',
//     status_text: { $in: ['confirmed', 'approved', 'deposited'] },
//     createdAt: {
//       $gte: history.startProcessingDate || new Date(0),
//       $lte: history.expireProcessingDate || now,
//     },
//   });

//   const totalDeposit = deposits.reduce((sum, payment) => sum + (payment.actually_paid || 0), 0);
//   conditions.deposit.userDeposit = totalDeposit;
//   conditions.deposit.completed =
//     totalDeposit >= conditions.deposit.amountFrom &&
//     (conditions.deposit.amountTo === 0 || totalDeposit <= conditions.deposit.amountTo);

//   if (conditions.deposit.completed && bonus.amount_type) {
//     if (bonus.amount_type === 'percentage') {
//       calculatedBonusAmount = (totalDeposit / 100) * (bonus.amount || 0);
//       if (bonus.up_to_amount && calculatedBonusAmount > bonus.up_to_amount) {
//         calculatedBonusAmount = bonus.up_to_amount;
//       }
//     } else if (bonus.amount_type === 'fixed') {
//       calculatedBonusAmount = bonus.amount || 0;
//     } else if (bonus.amount_type === 'cashback') {
//       calculatedBonusAmount = (conditions.netLoss.userNetLoss / 100) * (bonus.amount || 0);
//       if (bonus.up_to_amount && calculatedBonusAmount > bonus.up_to_amount) {
//         calculatedBonusAmount = bonus.up_to_amount;
//       }
//     }
//   }
// } else {
//   conditions.deposit.completed = true;
//         if (bonus.amount_type === 'fixed') {
//           calculatedBonusAmount = bonus.amount || 0;
//         }
//       }

//       if (bonus.wager && bonus.wager > 0 && calculatedBonusAmount > 0) 
//         {
//         wagerAmount = bonus.wager * calculatedBonusAmount;
//         }

//       if (conditions.spend.required) {
//         const gameHistory = await models_1.GameHistories.find({
//           userId,
//           txn_type: 'BET',
//           createdAt: {
//             $gte: fromDate || new Date(0),
//             $lte: toDate || now,
//           },
//         });

//         const totalSpend = gameHistory.reduce((sum, game) => sum + (game.bet_money || 0), 0);
//         conditions.spend.userSpend = totalSpend;
//         conditions.spend.completed = totalSpend >= conditions.spend.amount;
//       } else {
//         conditions.spend.completed = true;
//       }

//       if (conditions.netLoss.required) {
//         const balance = await models_1.Balances.findOne({ userId, status: true });
//         if (balance) {
//           const periodPayment = await payment_1.getPaymentsPeriod(userId, bonus.calculation_period);
//           const netLoss = periodPayment.deposit - periodPayment.withdraw - balance.balance;
//           conditions.netLoss.userNetLoss = netLoss;
//           conditions.netLoss.completed =
//             netLoss >= conditions.netLoss.netloseFrom && netLoss <= conditions.netLoss.netloseTo;
//         }
//       } else {
//         conditions.netLoss.completed = true;
//       }

  
// const wagerGames = bonus.games && bonus.games.length
//   ? await models_1.GameLists.find({ game_code: { $in: bonus.games } })
//   : [];


// const freeSpinGames = bonus.games_freespin && bonus.games_freespin.length
//   ? await models_1.GameLists.find({ game_code: { $in: bonus.games_freespin } })
//   : [];


// const gameCodes = bonus.wager > 0 ? (bonus.games || []) : (bonus.free_spin > 0 ? (bonus.games_freespin || []) : []);
// let wagerBets = [];
// if (gameCodes.length > 0) {
//   wagerBets = await models_1.GameHistories.find({
//     userId,
//     game_code: { $in: gameCodes },
//     txn_type: 'BET',
//     bet_money: { $lte: bonus.max_bet_bonus_amount || Infinity },
//     createdAt: {
//       $gte: history.createdAt,
//       $lte: toDate || now,
//     },
//   });
// }

//       result.push({
//         _id: history._id,
//         bonusId: {
//           _id: bonus._id,
//           lang: bonus.lang,
//           event: bonus.event,
//           from_date: bonus.from_date,
//           to_date: bonus.to_date,
//           amount: bonus.amount,
//           calculatedBonusAmount,
//           amount_type: bonus.amount_type, 
//           up_to_amount: bonus.up_to_amount, 
//           wager: bonus.wager,
//           wager_amount: wagerAmount, 
//           free_spin: bonus.free_spin,
//           max_bet_free_spin: bonus.max_bet_free_spin,
//           max_bet_bonus_amount: bonus.max_bet_bonus_amount,
//           pre_image: bonus.pre_image,
//           deposit_amount_from: bonus.deposit_amount_from,
//           deposit_amount_to: bonus.deposit_amount_to,
//           games: wagerGames.map((game) => ({
//           game_code: game.game_code,
//           game_name: game.game_name,
//           banner: game.banner,
//           })),
//           games_freespin: freeSpinGames.map((game) => ({
//           game_code: game.game_code,
//           game_name: game.game_name,
//           banner: game.banner,
//           })),
//           min_odds: bonus.min_odds,
//           max_odds: bonus.max_odds,
//           free_spin_type: bonus.free_spin_type,
//           reward: bonus.reward,
//           sports_bet_type: bonus.sports_bet_type,
//           sports_event_type: bonus.sports_event_type,
//           sports_type: bonus.sports_type,
//           sports_leagues: bonus.sports_leagues,
//           sports_matchs: bonus.sports_matchs,
//           cashback_date: bonus.cashback_date,
//           player_type: bonus.player_type,
//           players: bonus.players,
//           button_link: bonus.button_link,
//           order: bonus.order,
//           display: bonus.display,
//           daily: bonus.daily,
//           status: bonus.status,
//         },
//         userId: history.userId,
//         paymentsId: history.paymentsId,
//         amount: history.amount,
//         wager_amount: history.wager_amount,
//         isSpend: history.isSpend,
//         isDeposit: history.isDeposit,
//         added_bonus: history.added_bonus,
//         status,
//         createdAt: history.createdAt,
//         updatedAt: history.updatedAt,
//         startProcessingDate: history.startProcessingDate,
//         expireProcessingDate: history.expireProcessingDate,
//         conditions,
//         wagerBets,
//       });
//     }

//     result.sort((a, b) => {
//       const statusPriority = {
//         processing: 0,
//         active: 1,
//         finished: 2,
//         expired: 3,
//         canceled: 4,
//       };
//       return statusPriority[a.status] - statusPriority[b.status];
//     });
//     return res.json(result);
//   } catch (error) {
//     console.error('Get Bonuses for My Shares Error => ', error);
//     return res.status(500).json('Internal Server Error');
//   }
// };

// exports.get_bonuses_for_my_shares = get_bonuses_for_my_shares;

// const get_bonuses_for_my_shares = async (req, res) => {
//   try {
//     const { userId } = req.body;
//     const bonusHistories = await models_1.BonusHistories.find({ userId })
//       .populate({
//         path: 'bonusId',
//         populate: { path: 'event' },
//       });

//     if (!bonusHistories.length) {
//       return res.json([]);
//     }

//     const validHistories = bonusHistories.filter((history) => {
//       if (!history.bonusId) {
//         return false;
//       }
//       if (!history.bonusId.lang || !Array.isArray(history.bonusId.lang)) {
//         return false;
//       }
//       return true;
//     });

//     if (!validHistories.length) {
//       return res.json([]);
//     }

//     const result = [];
//     const now = new Date();

//     // Находим баланс юзера и его валюту
//     const balance = await models_1.Balances.findOne({ userId, status: true }).populate('currency');
//     const userCurrencySymbol = balance ? balance.currency.symbol : null; // Валюта юзера, e.g. "EUR"

//     for (const history of validHistories) {
//       const bonus = history.bonusId;

//       const fromDate = bonus.from_date ? new Date(bonus.from_date) : null;
//       const toDate = bonus.to_date ? new Date(bonus.to_date) : null;
//       const isExpiredByDate = fromDate && toDate && (now < fromDate || now > toDate);

//       let status = history.status;
//       if (status === 'processing' && history.expireProcessingDate) {
//         const expireDate = new Date(history.expireProcessingDate);
//         if (now > expireDate) {
//           status = 'expired';
//           await models_1.BonusHistories.updateOne(
//             { _id: history._id },
//             { status: 'expired', updatedAt: now }
//           );
//         }
//       } else if (isExpiredByDate && status !== 'finished') {
//         status = 'expired';
//         if (history.status !== 'expired') {
//           await models_1.BonusHistories.updateOne(
//             { _id: history._id },
//             { status: 'expired', updatedAt: now }
//           );
//         }
//       }

//       // Находим matching currency в bonus.currencies по валюте юзера
//       const matchingCurrency = userCurrencySymbol ? bonus.currencies.find(currency => currency.currency === userCurrencySymbol) : null;

//       // Если нет matching currency, пропускаем этот bonus history
//       if (!matchingCurrency) {
//         continue;
//       }

//       // Теперь используем matchingCurrency для условий
//       const conditions = {
//         deposit: {
//           required: matchingCurrency.deposit_amount_from > 0 || matchingCurrency.deposit_amount_to > 0,
//           completed: false,
//           amountFrom: matchingCurrency.deposit_amount_from || 0,
//           amountTo: matchingCurrency.deposit_amount_to || 0,
//           userDeposit: 0,
//         },
//         spend: {
//           required: matchingCurrency.spend_amount > 0,
//           completed: false,
//           amount: matchingCurrency.spend_amount || 0,
//           userSpend: 0,
//         },
//         netLoss: {
//           required: bonus.netlose_from >= 0 && bonus.netlose_to > 0 && bonus.calculation_period > 0,
//           completed: false,
//           netloseFrom: bonus.netlose_from || 0,
//           netloseTo: bonus.netlose_to || 0,
//           userNetLoss: 0,
//         },
//       };

//       let calculatedBonusAmount = 0;
//       let wagerAmount = 0;

//       if (conditions.deposit.required) {
//         const deposits = await models_1.Payments.find({
//           userId,
//           ipn_type: 'deposit',
//           status_text: { $in: ['confirmed', 'approved', 'deposited'] },
//           createdAt: {
//             $gte: history.startProcessingDate || new Date(0),
//             $lte: history.expireProcessingDate || now,
//           },
//         });

//         const totalDeposit = deposits.reduce((sum, payment) => sum + (payment.actually_paid || 0), 0);
//         conditions.deposit.userDeposit = totalDeposit;
//         conditions.deposit.completed =
//           totalDeposit >= conditions.deposit.amountFrom &&
//           (conditions.deposit.amountTo === 0 || totalDeposit <= conditions.deposit.amountTo);

//         if (conditions.deposit.completed && matchingCurrency.amount_type) {
//           if (matchingCurrency.amount_type === 'percentage') {
//             calculatedBonusAmount = (totalDeposit / 100) * (matchingCurrency.amount || 0);
//             if (matchingCurrency.up_to_amount && calculatedBonusAmount > matchingCurrency.up_to_amount) {
//               calculatedBonusAmount = matchingCurrency.up_to_amount;
//             }
//           } else if (matchingCurrency.amount_type === 'fixed') {
//             calculatedBonusAmount = matchingCurrency.amount || 0;
//           } else if (matchingCurrency.amount_type === 'cashback') {
//             calculatedBonusAmount = (conditions.netLoss.userNetLoss / 100) * (matchingCurrency.amount || 0);
//             if (matchingCurrency.up_to_amount && calculatedBonusAmount > matchingCurrency.up_to_amount) {
//               calculatedBonusAmount = matchingCurrency.up_to_amount;
//             }
//           }
//         }
//       } else {
//         conditions.deposit.completed = true;
//         if (matchingCurrency.amount_type === 'fixed') {
//           calculatedBonusAmount = matchingCurrency.amount || 0;
//         }
//       }

//       if (matchingCurrency.wager && matchingCurrency.wager > 0 && calculatedBonusAmount > 0) {
//         wagerAmount = matchingCurrency.wager * calculatedBonusAmount;
//       }

//       if (conditions.spend.required) {
//         const gameHistory = await models_1.GameHistories.find({
//           userId,
//           txn_type: 'BET',
//           createdAt: {
//             $gte: fromDate || new Date(0),
//             $lte: toDate || now,
//           },
//         });

//         const totalSpend = gameHistory.reduce((sum, game) => sum + (game.bet_money || 0), 0);
//         conditions.spend.userSpend = totalSpend;
//         conditions.spend.completed = totalSpend >= conditions.spend.amount;
//       } else {
//         conditions.spend.completed = true;
//       }

//       if (conditions.netLoss.required) {
//         const balance = await models_1.Balances.findOne({ userId, status: true });
//         if (balance) {
//           const periodPayment = await payment_1.getPaymentsPeriod(userId, bonus.calculation_period);
//           const netLoss = periodPayment.deposit - periodPayment.withdraw - balance.balance;
//           conditions.netLoss.userNetLoss = netLoss;
//           conditions.netLoss.completed =
//             netLoss >= conditions.netLoss.netloseFrom && netLoss <= conditions.netLoss.netloseTo;
//         }
//       } else {
//         conditions.netLoss.completed = true;
//       }

//       const wagerGames = matchingCurrency.games && matchingCurrency.games.length
//         ? await models_1.GameLists.find({ game_code: { $in: matchingCurrency.games } })
//         : [];

//       // Предполагаю, что games_freespin в schema отсутствует, так что используем games для freeSpinGames
//       const freeSpinGames = matchingCurrency.games && matchingCurrency.games.length
//         ? await models_1.GameLists.find({ game_code: { $in: matchingCurrency.games } })
//         : [];

//       const gameCodes = matchingCurrency.wager > 0 ? (matchingCurrency.games || []) : (matchingCurrency.free_spin > 0 ? (matchingCurrency.games || []) : []);
//       let wagerBets = [];
//       if (gameCodes.length > 0) {
//         wagerBets = await models_1.GameHistories.find({
//           userId,
//           game_code: { $in: gameCodes },
//           txn_type: 'BET',
//           bet_money: { $lte: matchingCurrency.max_bet_bonus_amount || Infinity },
//           createdAt: {
//             $gte: history.createdAt,
//             $lte: toDate || now,
//           },
//         });
//       }

//       result.push({
//         _id: history._id,
//         bonusId: {
//           _id: bonus._id,
//           lang: bonus.lang,
//           event: bonus.event,
//           from_date: bonus.from_date,
//           to_date: bonus.to_date,
//           amount: matchingCurrency.amount,
//           calculatedBonusAmount,
//           amount_type: matchingCurrency.amount_type,
//           up_to_amount: matchingCurrency.up_to_amount,
//           wager: matchingCurrency.wager,
//           wager_amount: wagerAmount,
//           free_spin: matchingCurrency.free_spin,
//           max_bet_free_spin: matchingCurrency.max_bet_free_spin,
//           max_bet_bonus_amount: matchingCurrency.max_bet_bonus_amount,
//           pre_image: bonus.pre_image,
//           deposit_amount_from: matchingCurrency.deposit_amount_from,
//           deposit_amount_to: matchingCurrency.deposit_amount_to,
//           games: wagerGames.map((game) => ({
//             game_code: game.game_code,
//             game_name: game.game_name,
//             banner: game.banner,
//           })),
//           games_freespin: freeSpinGames.map((game) => ({
//             game_code: game.game_code,
//             game_name: game.game_name,
//             banner: game.banner,
//           })),
//           min_odds: bonus.min_odds,
//           max_odds: bonus.max_odds,
//           free_spin_type: matchingCurrency.free_spin_type,
//           reward: bonus.reward,
//           sports_bet_type: bonus.sports_bet_type,
//           sports_event_type: bonus.sports_event_type,
//           sports_type: bonus.sports_type,
//           sports_leagues: bonus.sports_leagues,
//           sports_matchs: bonus.sports_matchs,
//           cashback_date: bonus.cashback_date,
//           player_type: matchingCurrency.player_type,
//           players: matchingCurrency.players,
//           button_link: bonus.button_link,
//           order: bonus.order,
//           display: bonus.display,
//           daily: bonus.daily,
//           status: bonus.status,
//         },
//         userId: history.userId,
//         paymentsId: history.paymentsId,
//         amount: history.amount,
//         wager_amount: history.wager_amount,
//         isSpend: history.isSpend,
//         isDeposit: history.isDeposit,
//         added_bonus: history.added_bonus,
//         status,
//         createdAt: history.createdAt,
//         updatedAt: history.updatedAt,
//         startProcessingDate: history.startProcessingDate,
//         expireProcessingDate: history.expireProcessingDate,
//         conditions,
//         wagerBets,
//       });
//     }

//     result.sort((a, b) => {
//       const statusPriority = {
//         processing: 0,
//         active: 1,
//         finished: 2,
//         expired: 3,
//         canceled: 4,
//       };
//       return statusPriority[a.status] - statusPriority[b.status];
//     });
//     return res.json(result);
//   } catch (error) {
//     console.error('Get Bonuses for My Shares Error => ', error);
//     return res.status(500).json('Internal Server Error');
//   }
// };

// exports.get_bonuses_for_my_shares = get_bonuses_for_my_shares;


const get_bonuses_for_my_shares = async (req, res) => {
  try {
    const { userId } = req.body;
    const bonusHistories = await models_1.BonusHistories.find({ userId })
      .populate({
        path: 'bonusId',
        populate: { path: 'event' },
      });

    if (!bonusHistories.length) {
      return res.json([]);
    }

    const validHistories = bonusHistories.filter((history) => {
      if (!history.bonusId) {
        return false;
      }
      if (!history.bonusId.lang || !Array.isArray(history.bonusId.lang)) {
        return false;
      }
      return true;
    });

    if (!validHistories.length) {
      return res.json([]);
    }

    const result = [];
    const now = new Date();

    // Find user's balance and currency
    const balance = await models_1.Balances.findOne({ userId, status: true }).populate('currency');
    const userCurrencySymbol = balance ? balance.currency.symbol : null;

    for (const history of validHistories) {
      const bonus = history.bonusId;

      const fromDate = bonus.from_date ? new Date(bonus.from_date) : null;
      const toDate = bonus.to_date ? new Date(bonus.to_date) : null;
      const isExpiredByDate = fromDate && toDate && (now < fromDate || now > toDate);

      let status = history.status;
      if (status === 'processing' && history.expireProcessingDate) {
        const expireDate = new Date(history.expireProcessingDate);
        if (now > expireDate) {
          status = 'expired';
          await models_1.BonusHistories.updateOne(
            { _id: history._id },
            { status: 'expired', updatedAt: now }
          );
        }
      } else if (isExpiredByDate && status !== 'finished') {
        status = 'expired';
        if (history.status !== 'expired') {
          await models_1.BonusHistories.updateOne(
            { _id: history._id },
            { status: 'expired', updatedAt: now }
          );
        }
      }

      // Find matching currency
      const matchingCurrency = userCurrencySymbol ? bonus.currencies.find(currency => currency.currency === userCurrencySymbol) : null;
      if (!matchingCurrency) {
        continue;
      }

      // Define conditions
      const conditions = {
        deposit: {
          required: matchingCurrency.deposit_amount_from > 0 || matchingCurrency.deposit_amount_to > 0,
          completed: false,
          amountFrom: matchingCurrency.deposit_amount_from || 0,
          amountTo: matchingCurrency.deposit_amount_to || 0,
          userDeposit: 0,
        },
        spend: {
          required: matchingCurrency.spend_amount > 0,
          completed: false,
          amount: matchingCurrency.spend_amount || 0,
          userSpend: 0,
        },
        netLoss: {
          required: bonus.netlose_from >= 0 && bonus.netlose_to > 0 && bonus.calculation_period > 0,
          completed: false,
          netloseFrom: bonus.netlose_from || 0,
          netloseTo: bonus.netlose_to || 0,
          userNetLoss: 0,
        },
      };

      let calculatedBonusAmount = 0;
      let wagerAmount = 0;

      if (conditions.deposit.required) {
        const deposits = await models_1.Payments.find({
          userId,
          ipn_type: 'deposit',
          status_text: { $in: ['confirmed', 'approved', 'deposited'] },
          createdAt: {
            $gte: history.startProcessingDate || new Date(0),
            $lte: history.expireProcessingDate || now,
          },
        });

        const totalDeposit = deposits.reduce((sum, payment) => sum + (payment.actually_paid || 0), 0);
        conditions.deposit.userDeposit = totalDeposit;
        conditions.deposit.completed =
          totalDeposit >= conditions.deposit.amountFrom &&
          (conditions.deposit.amountTo === 0 || totalDeposit <= conditions.deposit.amountTo);

        if (conditions.deposit.completed && matchingCurrency.amount_type) {
          if (matchingCurrency.amount_type === 'percentage') {
            calculatedBonusAmount = (totalDeposit / 100) * (matchingCurrency.amount || 0);
            if (matchingCurrency.up_to_amount && calculatedBonusAmount > matchingCurrency.up_to_amount) {
              calculatedBonusAmount = matchingCurrency.up_to_amount;
            }
          } else if (matchingCurrency.amount_type === 'fixed') {
            calculatedBonusAmount = matchingCurrency.amount || 0;
          } else if (matchingCurrency.amount_type === 'cashback') {
            calculatedBonusAmount = (conditions.netLoss.userNetLoss / 100) * (matchingCurrency.amount || 0);
            if (matchingCurrency.up_to_amount && calculatedBonusAmount > matchingCurrency.up_to_amount) {
              calculatedBonusAmount = matchingCurrency.up_to_amount;
            }
          }
        }
      } else {
        conditions.deposit.completed = true;
        if (matchingCurrency.amount_type === 'fixed') {
          calculatedBonusAmount = matchingCurrency.amount || 0;
        }
      }

      if (matchingCurrency.wager && matchingCurrency.wager > 0 && calculatedBonusAmount > 0) {
        wagerAmount = matchingCurrency.wager * calculatedBonusAmount;
      }

      if (conditions.spend.required) {
        const gameHistory = await models_1.GameHistories.find({
          userId,
          txn_type: 'BET',
          createdAt: {
            $gte: fromDate || new Date(0),
            $lte: toDate || now,
          },
        });

        const totalSpend = gameHistory.reduce((sum, game) => sum + (game.bet_money || 0), 0);
        conditions.spend.userSpend = totalSpend;
        conditions.spend.completed = totalSpend >= conditions.spend.amount;
      } else {
        conditions.spend.completed = true;
      }

      if (conditions.netLoss.required) {
        const balance = await models_1.Balances.findOne({ userId, status: true });
        if (balance) {
          const periodPayment = await payment_1.getPaymentsPeriod(userId, bonus.calculation_period);
          const netLoss = periodPayment.deposit - periodPayment.withdraw - balance.balance;
          conditions.netLoss.userNetLoss = netLoss;
          conditions.netLoss.completed =
            netLoss >= conditions.netLoss.netloseFrom && netLoss <= conditions.netLoss.netloseTo;
        }
      } else {
        conditions.netLoss.completed = true;
      }

      const wagerGames = matchingCurrency.games && matchingCurrency.games.length
        ? await models_1.GameLists.find({ game_code: { $in: matchingCurrency.games } })
        : [];

      // Use games_freespin for free spins, assuming schema has it
      const freeSpinGames = matchingCurrency.games_freespin && matchingCurrency.games_freespin.length
        ? await models_1.GameLists.find({ game_code: { $in: matchingCurrency.games_freespin } })
        : [];

      const gameCodes = matchingCurrency.wager > 0 ? (matchingCurrency.games || []) : (matchingCurrency.free_spin > 0 ? (matchingCurrency.games_freespin || []) : []);
      let wagerBets = [];
      if (gameCodes.length > 0) {
        wagerBets = await models_1.GameHistories.find({
          userId,
          game_code: { $in: gameCodes },
          txn_type: 'BET',
          bet_money: { $lte: matchingCurrency.max_bet_bonus_amount || Infinity },
          createdAt: {
            $gte: history.createdAt,
            $lte: toDate || now,
          },
        });
      }

      result.push({
        _id: history._id,
        bonusId: {
          _id: bonus._id,
          lang: bonus.lang,
          event: bonus.event,
          from_date: bonus.from_date,
          to_date: bonus.to_date,
          amount: matchingCurrency.amount,
          calculatedBonusAmount,
          amount_type: matchingCurrency.amount_type,
          up_to_amount: matchingCurrency.up_to_amount,
          wager: matchingCurrency.wager,
          wager_amount: wagerAmount,
          free_spin: matchingCurrency.free_spin,
          max_bet_free_spin: matchingCurrency.max_bet_free_spin,
          max_bet_bonus_amount: matchingCurrency.max_bet_bonus_amount,
          pre_image: bonus.pre_image,
          deposit_amount_from: matchingCurrency.deposit_amount_from,
          deposit_amount_to: matchingCurrency.deposit_amount_to,
          games: wagerGames.map((game) => ({
            game_code: game.game_code,
            game_name: game.game_name,
            banner: game.banner,
          })),
          games_freespin: freeSpinGames.map((game) => ({
            game_code: game.game_code,
            game_name: game.game_name,
            banner: game.banner,
          })),
          min_odds: bonus.min_odds,
          max_odds: bonus.max_odds,
          free_spin_type: matchingCurrency.free_spin_type,
          reward: bonus.reward,
          sports_bet_type: bonus.sports_bet_type,
          sports_event_type: bonus.sports_event_type,
          sports_type: bonus.sports_type,
          sports_leagues: bonus.sports_leagues,
          sports_matchs: bonus.sports_matchs,
          cashback_date: bonus.cashback_date,
          player_type: matchingCurrency.player_type,
          players: matchingCurrency.players,
          button_link: bonus.button_link,
          order: bonus.order,
          display: bonus.display,
          daily: bonus.daily,
          status: bonus.status,
        },
        userId: history.userId,
        paymentsId: history.paymentsId,
        amount: history.amount,
        wager_amount: history.wager_amount,
        isSpend: history.isSpend,
        isDeposit: history.isDeposit,
        added_bonus: history.added_bonus,
        status,
        createdAt: history.createdAt,
        updatedAt: history.updatedAt,
        startProcessingDate: history.startProcessingDate,
        expireProcessingDate: history.expireProcessingDate,
        conditions,
        wagerBets,
      });
    }

    // Sort by createdAt descending (newest first)
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json(result);
  } catch (error) {
    console.error('Get Bonuses for My Shares Error => ', error);
    return res.status(500).json('Internal Server Error');
  }
};

exports.get_bonuses_for_my_shares = get_bonuses_for_my_shares;


// const activate_processing_bonus = async (req, res) => {
//   try {
//     const { userId, bonusHistoryId} = req.body;
//     if (!userId || !bonusHistoryId) {
//       return res.status(400).json({ error: 'Missing userId or bonusHistoryId' });
//     }

//     const user = req?.user;
//     if (!user) {
//       return res.status(401).json({ error: 'User not authenticated' });
//     }

//     const bonusHistory = await models_1.BonusHistories.findOne({ _id: bonusHistoryId, userId });
//     if (!bonusHistory) {
//       return res.status(404).json({ error: 'Bonus history not found' });
//     }

//     if (bonusHistory.status !== 'processing') {
//       return res.status(400).json({ error: 'Bonus is not in processing status' });
//     }

//     const activeBonus = await models_1.BonusHistories.findOne({
//       userId,
//       $or: [{ status: 'active' }, { status: 'processing' }],
//       _id: { $ne: bonusHistoryId },
//     });

//     if (activeBonus) {
//       await models_1.BonusHistories.updateOne(
//         { _id: activeBonus._id },
//         { status: 'canceled' }
//       );
//       await models_1.Balances.updateOne(
//         { userId, status: true },
//         { bonus: 0 }
//       );
//       await timelesstech_1.cancelCampaign(userId);
//     }

//     bonusHistory.status = 'active';
//     bonusHistory.updatedAt = new Date();
//     await bonusHistory.save();

//     await models_1.Balances.updateOne(
//       { userId, status: true },
//       { bonus: bonusHistory.amount }
//     );

//     return res.json({ data: { message: 'Bonus activated successfully' } });
//   } catch (error) {
//     console.error('Activate Processing Bonus Error => ', error);
//     return res.status(500).json({ error: 'Internal Server Error' });
//   }
// };

// exports.activate_processing_bonus = activate_processing_bonus;

const activateNoDepositBonus = async (req, res) => {
  try {
    const { userId, bonusHistoryId } = req.body;
    if (!userId || !bonusHistoryId) {
      return res.status(400).json({ error: 'Missing userId or bonusHistoryId' });
    }

    const user = req?.user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const bonusHistory = await models_1.BonusHistories.findOne({
      _id: bonusHistoryId,
      userId,
    });
    if (!bonusHistory) {
      return res.status(404).json({ error: 'Bonus history not found' });
    }

    if (bonusHistory.status !== 'processing') {
      return res.status(400).json({ error: 'Bonus is not in processing status' });
    }

    const bonus = await models_1.Bonus.findById(bonusHistory.bonusId);
    if (!bonus) {
      return res.status(404).json({ error: 'Bonus not found' });
    }

    const balance = await models_1.Balances.findOne({ userId, status: true }).populate('currency');
    if (!balance) {
      return res.status(404).json({ error: 'Active balance not found' });
    }

    const userCurrencySymbol = balance.currency.symbol;

    const matchingCurrency = bonus.currencies.find(curr => curr.currency === userCurrencySymbol);
    if (!matchingCurrency) {
      return res.status(400).json({ error: 'No matching currency for user' });
    }

    if (matchingCurrency.deposit_amount_from !== 0 || matchingCurrency.deposit_amount_to !== 0) {
      return res.status(400).json({ error: 'Bonus is not no-deposit' });
    }

    const activeBonus = await models_1.BonusHistories.findOne({
      userId,
      status: 'active',
      _id: { $ne: bonusHistoryId },
    });
    if (activeBonus) {
      return res.status(400).json({
        error: 'User already has an active bonus. Cancel it first.',
      });
    }

    let isEligible = false;
    if (matchingCurrency.player_type === 'player') {
      isEligible = matchingCurrency.players.includes(String(userId));
    } else if (matchingCurrency.player_type === 'segmentation' && matchingCurrency.segmentation) {
      const segmentation = await models_1.Segmentations.findById(matchingCurrency.segmentation);
      if (!segmentation) {
        return res.status(404).json({ error: 'Segmentation not found' });
      }
      isEligible = await base_1.checkSegmentationPlayer(segmentation, balance);
    }

    if (!isEligible) {
      return res.status(400).json({ error: 'User is not eligible for this bonus' });
    }

    bonusHistory.status = 'active';
    bonusHistory.updatedAt = new Date();
    await bonusHistory.save();

    const updateResult = await models_1.Balances.updateOne(
      { _id: balance._id },
      { $inc: { bonus: bonusHistory.amount } }
    );

    const updatedBalance = await models_1.Balances.findOne({ _id: balance._id });

    await tracking_1.trackBonus(userId, bonus);

    console.log('[DEBUG] Checking free spin conditions:', {
      eventType: bonus.event?.type,
      hasGames: matchingCurrency.games?.length > 0,
      hasFreeGames: matchingCurrency.free_games?.length > 0,
      freeSpin: matchingCurrency.free_spin,
      matchingCurrency: matchingCurrency
    });

    if (bonus.event.type === 'casino' && matchingCurrency.free_games?.length && matchingCurrency.free_spin) {
      console.log('[DEBUG] Free spin conditions met, calling createCampaign');
      
      let free_spin = matchingCurrency.free_spin;
      if (matchingCurrency.free_spin_type === 'percentage') {
        free_spin = matchingCurrency.free_spin_up_to_amt || free_spin;
      }
      const en = bonus.lang.find((e) => e.lang === 'en') || bonus.lang[0];
      
      console.log('[DEBUG] Calling createCampaign with params:', {
        games: matchingCurrency.free_games,
        userId: String(userId),
        freeSpin: free_spin,
        endDate: new Date(bonus.to_date),
        title: en?.title,
        maxBet: matchingCurrency.max_bet_free_spin
      });

      const campaignResult = await timelesstech_1.createCampaign(
        matchingCurrency.free_games,
        String(userId),
        free_spin,
        new Date(bonus.to_date),
        en.title,
        matchingCurrency.max_bet_free_spin
      );
      
      console.log('[DEBUG] createCampaign result:', campaignResult);
    } else {
      console.log('[DEBUG] Free spin conditions NOT met, skipping createCampaign');
    }

    return res.json({ data: { message: 'No-deposit bonus activated successfully' } });
  } catch (error) {
    console.error('[ERROR] Activate No-Deposit Bonus Error => ', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.activateNoDepositBonus = activateNoDepositBonus;

const active = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { notificationId, bonusId, password } = req.body;
        const user = req?.user;
        if (!user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const exists = yield models_1.BonusHistories.findOne({
            userId: user._id,
            bonusId,
            $or: [{ status: 'active' }, { status: 'processing' }],
        });
        if (exists) {
            return res.status(402).json('This Bonus already actived!');
        }

        const nofification = yield models_1.Notification.findById(notificationId);
        if (!nofification || !(nofification?.param)) {
            return res.status(402).json('Notification is wrong');
        }
        if (nofification.param.key !== 'bonus') {
            return res.status(402).json('Notification is wrong');
        }
        const actived = nofification.param.data.find((e) => String(e._id) === String(bonusId));
        if (!actived) {
            return res.status(402).json('bonusId is wrong');
        }

        const bonus = yield models_1.Bonus.findById(bonusId);
        if (!bonus) {
            return res.status(402).json('Bonus not found');
        }
        if (!bonus.status) {
            return res.status(402).json('Bonus not allowed');
        }

        const days = (0, base_1.daysSinceCreated)(nofification.createdAt);
        if (days > bonus.activate_day) {
            return res.status(402).json('Bonus expired');
        }

        const payment = yield models_1.Payments.findById(actived.paymentsId);
        if (!payment) {
            return res.status(402).json('PaymentId invalid');
        }
        if (payment.status !== 3) {
            return res.status(402).json('Payment are not confirmed');
        }

        const balance = yield models_1.Balances.findOne({ userId: user._id, status: true }).populate('currency');
        if (!balance) {
            return res.status(402).json('Active balance not found');
        }
        const userCurrencySymbol = balance.currency.symbol;

        const matchingCurrency = bonus.currencies.find(curr => curr.currency === userCurrencySymbol);
        if (!matchingCurrency) {
            return res.status(402).json('No matching currency for user');
        }

        if (matchingCurrency.deposit_amount_from > 0 || matchingCurrency.deposit_amount_to > 0) {
            if (payment.actually_paid < matchingCurrency.deposit_amount_from || payment.actually_paid > matchingCurrency.deposit_amount_to) {
                return res.status(402).json('Your deposit amount is not enough');
            }
        }

        // const duplicate = await BonusHistories.findOne({ paymentsId: actived.paymentsId });
        // if (duplicate)
        //     return res.status(402).json('Your paymentId used to be duplicated');

        if (password) {
            if (!user.validPassword(password, user.password)) {
                return res.status(402).json('Passwords do not match.');
            }
            yield models_1.BonusHistories.findOneAndUpdate({
                userId: user._id,
                $or: [
                    {
                        status: 'active',
                    },
                    // {
                    //     status: 'processing',
                    // },
                ],
            }, {
                status: 'canceled',
            });
            await (0, timelesstech_1.cancelCampaign)(user._id);
        } else {
            const exists = yield models_1.BonusHistories.findOne({
                userId: user._id,
                $or: [
                    {
                        status: 'active',
                    },
                    // {
                    //     status: 'processing',
                    // },
                ],
            });
            if (exists) {
                return res.status(402).json('You have already activated bonus');
            }
        }

        let bonusAmount = 0;
        if (matchingCurrency.amount_type === 'fixed') {
            bonusAmount = matchingCurrency.amount;
        }
        if (matchingCurrency.amount_type === 'percentage') {
            bonusAmount = (0, base_1.NumberFix)((payment.actually_paid / 100) * matchingCurrency.amount, 2);
            if (matchingCurrency.up_to_amount && bonusAmount > matchingCurrency.up_to_amount) {
                bonusAmount = matchingCurrency.up_to_amount;
            }
        }
        if (matchingCurrency.amount_type === 'cashback') {
            bonusAmount = matchingCurrency.amount;
        }

        const data = yield models_1.BonusHistories.create({
            bonusId: bonus._id,
            userId: user._id,
            paymentsId: payment._id,
            amount: bonusAmount,
            isDeposit: payment.actually_paid,
            status: matchingCurrency.spend_amount > 0 ? 'processing' : 'active',
        });

        yield models_1.Balances.updateOne({
            userId: user._id,
            status: true,
        }, {
            $inc: { bonus: bonusAmount },
        });

        if (matchingCurrency.spend_amount <= 0) {
            console.log('[DEBUG active] Checking free spin conditions:', {
                eventType: bonus.event?.type,
                hasGames: matchingCurrency.games?.length > 0,
                freeSpin: matchingCurrency.free_spin,
                spendAmount: matchingCurrency.spend_amount
            });

            if (bonus.event.type !== 'casino') {
                console.log('[DEBUG active] Not casino event, returning');
                return;
            }
            if (!matchingCurrency.games?.length) {
                console.log('[DEBUG active] No games, returning');
                return;
            }
            if (!matchingCurrency.free_spin) {
                console.log('[DEBUG active] No free spin, returning');
                return;
            }

            console.log('[DEBUG active] All conditions met, calling createCampaign');
            const en = bonus.lang.find((e) => e.lang === 'en') || bonus.lang[0];
            
            console.log('[DEBUG active] Calling createCampaign with params:', {
                games: matchingCurrency.games,
                userId: String(payment.userId),
                freeSpin: matchingCurrency.free_spin,
                endDate: new Date(bonus.to_date),
                title: (en?.title) || 'Bonus',
                maxBet: matchingCurrency.max_bet_free_spin
            });

            const result = await (0, timelesstech_1.createCampaign)(matchingCurrency.games, String(payment.userId), matchingCurrency.free_spin, new Date(bonus.to_date), (en?.title) || 'Bonus', matchingCurrency.max_bet_free_spin);
            
            console.log('[DEBUG active] createCampaign result:', result);
            
            if (!result) {
                console.log('[DEBUG active] createCampaign failed, returning error');
                return res.status(402).json('Freespin Api Error!');
            }
        }

        return res.json({ ...data.toObject(), bonusId: bonus });
    } catch (error) {
        console.error(error);
        return res.status(500).json('Internal Server Error');
    }
});

exports.active = active;

const cancel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { password } = req.body;
        const user = req === null || req === void 0 ? void 0 : req.user;
        if (!user) {
            return res.status(401).json('User not found');
        }

        if (!user.validPassword(password, user.password)) {
            return res.status(401).json('Passwords do not match.');
        }

        const activeBonuses = yield models_1.BonusHistories.find({
            userId: user._id,
            status: 'active',
        });

        const totalBonusToSubtract = Number(activeBonuses.reduce((sum, bonus) => sum + bonus.amount, 0).toFixed(2));

        const historyUpdateResult = yield models_1.BonusHistories.updateMany({
            userId: user._id,
            status: 'active',
        }, {
            status: 'canceled',
        });

        const balanceUpdateResult = yield models_1.Balances.updateOne({
            userId: user._id,
            status: true,
        }, {
            $inc: { bonus: -totalBonusToSubtract },
        });

        const updatedBalance = yield models_1.Balances.findOne({ userId: user._id, status: true });

        res.json('success');
        return yield (0, timelesstech_1.cancelCampaign)(user._id);
    }
    catch (error) {
        console.error(`[DEBUG] Error in cancel:`, error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.cancel = cancel;

const sendBonusPlayer = (bonus) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`[sendBonusPlayer] Processing bonus update: _id=${bonus._id}, display=${bonus.display}`);
    for (let currencyIndex = 0; currencyIndex < bonus.currencies.length; currencyIndex++) {
        const currency = bonus.currencies[currencyIndex];
        if (currency.player_type === 'player' && currency.players && Array.isArray(currency.players)) { 
            console.log(`[sendBonusPlayer] Processing currency ${currencyIndex}, player_type=player, players=${currency.players.length}`);
            
            // Получаем существующие записи для этого бонуса (все пользователи)
            const existingHistories = yield models_1.BonusHistories.find({ bonusId: bonus._id });
            const existingUserIds = existingHistories.map(hist => hist.userId.toString());

            for (let playerIndex = 0; playerIndex < currency.players.length; playerIndex++) {
                try { 
                    const player = currency.players[playerIndex];
                    const user = yield models_1.Users.findOne({ _id: player, status: true });
                    if (!user) {
                        console.log(`[sendBonusPlayer] User not found or inactive: _id=${player}`);
                        continue;
                    }
                    const now = new Date();
                    const activateDays = bonus.activate_day || 1; 
                    const expireTime = new Date(now.getTime() + activateDays * 24 * 60 * 60 * 1000);
                    const query = {
                        bonusId: bonus._id,
                        userId: user._id,
                        amount: currency.amount, 
                        wager_amount: currency.wager,
                        isDeposit: 0,
                        status: currency.spend_amount > 0 ? 'processing' : 'processing',
                        daily: 'usual_bonus',
                        startProcessingDate: now,
                        expireProcessingDate: expireTime,
                    };
                    const en = bonus.lang.find((e) => e.lang === 'en') || bonus.lang[0];
                    const queryNoti = {
                        title: `New Bonus`,
                        description: `You have got new bonus! (${en?.title}) bonus up => ${currency.amount}  ${process.env.DOMAIN}/en/user/my-shares`,
                        players: [String(user._id)],
                        country: ['all'],
                        auto: true,
                    };
                    
                    // Проверяем, существует ли запись для этого userId и bonusId
                    const existingHistory = yield models_1.BonusHistories.findOne({
                        bonusId: bonus._id,
                        userId: user._id,
                    });
                    
                    if (existingHistory) {
                        // Обновляем существующую запись (только если статус позволяет, напр. не 'active')
                        if (existingHistory.status === 'processing' || existingHistory.status === 'pending') {
                            console.log(`[sendBonusPlayer] Updating existing BonusHistories for user ${user._id}, bonus ${bonus._id}: ${existingHistory._id}`);
                            yield models_1.BonusHistories.findOneAndUpdate(
                                { _id: existingHistory._id },
                                query,
                                { new: true }
                            );
                            // Отправляем нотификацию об обновлении
                            queryNoti.title = `Bonus Updated`;
                            queryNoti.description = `Your bonus has been updated! (${en?.title}) new amount => ${currency.amount}`;
                            yield models_1.Notification.create(queryNoti);
                        } else {
                            console.log(`[sendBonusPlayer] Skipping update for user ${user._id}, bonus ${bonus._id}: status=${existingHistory.status} (not updatable)`);
                        }
                    } else {
                        // Создаём новую запись
                        console.log(`[sendBonusPlayer] Creating new BonusHistories for user ${user._id}, bonus ${bonus._id}`);
                        yield models_1.BonusHistories.create(query);
                        yield models_1.Notification.create(queryNoti);
                    }
                } catch (loopError) {
                    console.error(`[sendBonusPlayer] Error in loop for playerIndex ${playerIndex}: ${loopError.message}`, loopError);
                }
            }

            // Удаляем записи для пользователей, которые были удалены из players
            const currentPlayerIds = currency.players.map(p => p.toString());
            const removedUserIds = existingUserIds.filter(id => !currentPlayerIds.includes(id));
            if (removedUserIds.length > 0) {
                console.log(`[sendBonusPlayer] Removing BonusHistories for removed users: ${removedUserIds.join(', ')}`);
                yield models_1.BonusHistories.deleteMany({
                    bonusId: bonus._id,
                    userId: { $in: removedUserIds.map(base_1.ObjectId) },
                });
                // Optional: Отправить нотификацию удалённым пользователям
                // yield Notification.create({ title: 'Bonus Removed', description: ..., players: removedUserIds });
            }
        }
    }
});

const checkCashbackBonus = (bonus) => __awaiter(void 0, void 0, void 0, function* () {
    for (let currencyIndex = 0; currencyIndex < bonus.currencies.length; currencyIndex++) {
        const currency = bonus.currencies[currencyIndex];
        let segmentation = null;
        if (currency.player_type === 'segmentation') {
            segmentation = yield models_1.Segmentations.findById(currency.segmentation);
            if (!segmentation) continue;
        }
        const balances = yield models_1.Balances.find({ balance: { $not: { $eq: 0 } }, currency: currency.currency, status: true }).populate('userId');
        if (!balances.length) continue;
        for (let index = 0; index < balances.length; index++) {
            const balance = balances[index];
            const user = balance.userId;
            const exists = yield models_1.BonusHistories.findOne({
                userId: user._id,
                $or: [
                    {
                        status: 'active',
                    },
                    // {
                    //     status: 'processing',
                    // },
                ],
            });
            if (exists) continue;
            if (currency.player_type === 'player' && !currency.players.includes(String(user._id))) continue;
            if (currency.player_type === 'segmentation' && segmentation) {
                const checked = yield (0, base_1.checkSegmentationPlayer)(segmentation, balance);
                if (!checked) continue;
            }
            const periodPayment = yield (0, payment_1.getPaymentsPeriod)(user._id, bonus.calculation_period);
            const netlose = periodPayment.deposit - periodPayment.withdraw - balance.balance; // (Deposit in period - curently balance (Real money) - withdraw in period)
            if (netlose <= 0) continue;
            if (bonus.netlose_from > netlose || bonus.netlose_to < netlose) continue;
            let amount = parseInt(String((netlose / 100) * currency.amount));
            if (amount === 0) continue;
            if (currency.up_to_amount > 0 && currency.up_to_amount < amount) amount = currency.up_to_amount;
            console.log('Cashback bouns => ', user.username, '=>', amount);
            const query = {
                bonusId: bonus._id,
                userId: user._id,
                amount,
                isDeposit: 0,
                status: currency.spend_amount > 0 ? 'processing' : 'active',
            };
            const en = bonus.lang.find((e) => e.lang === 'en') || bonus.lang[0];
            const queryNoti = {
                title: `New Bonus`,
                description: `You have got new bonus! (${en === null || en === void 0 ? void 0 : en.title}) balance up => ${amount}  ${process.env.DOMAIN}/en/user/my-shares`,
                players: [String(user._id)],
                country: ['all'],
                auto: true,
            };
            if (bonus.reward === 'bonus') {
                yield models_1.BonusHistories.create(query);
                yield models_1.Balances.updateOne({
                    _id: balance._id,
                },{
                $inc: { bonus: amount },
                });
                yield models_1.Notification.create(queryNoti);
            }
            if (bonus.reward === 'real') {
                yield models_1.BonusHistories.create(Object.assign(Object.assign({}, query), { status: 'finished' }));
                yield models_1.Balances.updateOne({
                    _id: balance._id,
                }, {
                    balance: amount,
                });
                yield models_1.BalanceHistories.create({
                    userId: user._id,
                    amount,
                    currency: balance.currency._id,
                    type: 'bonus',
                    currentBalance: (0, base_1.NumberFix)(balance.balance + amount),
                    beforeBalance: (0, base_1.NumberFix)(balance.balance),
                    info: `bonus-${bonus._id}`,
                });
                yield models_1.Notification.create(queryNoti);
            }
        }
    }
    yield models_1.Bonus.updateOne({ _id: bonus._id }, { status: false });
});
exports.checkCashbackBonus = checkCashbackBonus;

const addBonus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { bonus, userId } = req.body;
        const bonusEle = yield models_1.Bonus.findById(bonus);
        if (!bonusEle)
            return res.status(403).json('The Bonus not found!');
        const balance = yield models_1.Balances.findOne({
            userId,
            status: true,
        }).populate('currency');
        if (!balance)
            return res.status(403).json('User balance not found!');
        const userCurrencySymbol = balance.currency.symbol;
        const matchingCurrency = bonusEle.currencies.find(c => c.currency === userCurrencySymbol);
        if (!matchingCurrency)
            return res.status(403).json('No matching currency for user!');
        yield models_1.BonusHistories.create({
            bonusId: bonusEle._id,
            userId,
            amount: matchingCurrency.amount,
            wager_amount: matchingCurrency.wager,
            isDeposit: 0,
            status: 'processing',
        });
        yield models_1.Balances.updateOne({
            userId,
            status: true,
        }, { $inc: { bonus: matchingCurrency.amount } });
        const en = bonusEle.lang.find((e) => e.lang === 'en') || bonusEle.lang[0];
        yield models_1.Notification.create({
            title: `New Bonus`,
            description: `You have got new bonus from admin! (${en.title})  ${process.env.DOMAIN}/en/user/my-shares`,
            players: [String(userId)],
            country: ['all'],
            auto: true,
        });
        res.json('success');
        
        console.log('[DEBUG addBonus] Checking free spin conditions:', {
            eventType: bonusEle.event?.type,
            hasGames: matchingCurrency.games?.length > 0,
            freeSpin: matchingCurrency.free_spin,
            matchingCurrency: matchingCurrency
        });
        
        if (bonusEle.event.type !== 'casino') {
            console.log('[DEBUG addBonus] Not casino event, returning');
            return;
        }
        if (!matchingCurrency.free_games?.length) {
            console.log('[DEBUG addBonus] No games, returning');
            return;
        }
        if (!matchingCurrency.free_spin) {
            console.log('[DEBUG addBonus] No free spin, returning');
            return;
        }
        
        console.log('[DEBUG addBonus] All conditions met, calling createCampaign with params:', {
            games: matchingCurrency.free_games,
            userId: String(userId),
            freeSpin: matchingCurrency.free_spin,
            endDate: new Date(bonusEle.to_date),
            title: en?.title,
            maxBet: matchingCurrency.max_bet_free_spin
        });
        
        const campaignResult = yield (0, timelesstech_1.createCampaign)(matchingCurrency.free_games, String(userId), matchingCurrency.free_spin, new Date(bonusEle.to_date), en.title, matchingCurrency.max_bet_free_spin);
        
        console.log('[DEBUG addBonus] createCampaign result:', campaignResult);
    }
    catch (error) {
        console.error('Add Bonus Error => ', error);
        res.status(500).json('Internal Server Error!');
    }
});
exports.addBonus = addBonus;
