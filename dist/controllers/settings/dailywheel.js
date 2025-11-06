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
exports.playDaily = exports.get = exports.getDaily = exports.getDailywheels = exports.deleteOne = exports.updateOne = exports.create = exports.list = exports.getOne = void 0;
const moment = require("moment");
const base_1 = require("../base");
const models_1 = require("../../models");
const timelesstech_1 = require("../games/timelesstech");



const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.DailySpinwheels.findOne({ _id: (0, base_1.ObjectId)(req.params.id) });
        return res.json(result);
    }
    catch (error) {
        console.error("Error DailySpinwheels getOne : ", error);
        return res.status(500).json("Internal Server Error");
    }
});
exports.getOne = getOne;

const list = async (req, res) => {
    try {
        const { pageSize = null, page = null, status, country } = req.body;
        const query = {};
        
        if (status !== '' && status !== undefined) {
            query.status = status;
        }
        if (country !== '' && country !== undefined) {
            query.country = country;
        }

        const count = await models_1.DailySpinwheels.countDocuments(query);
        let results;

        if (page && pageSize) {
            results = await models_1.DailySpinwheels
                .find(query)
                .skip((page - 1) * pageSize)
                .limit(pageSize);
        } else {
            results = await models_1.DailySpinwheels.find(query);
        }
        return res.json({ results, count });
    } catch (error) {
        console.error("Error in DailySpinwheels list:", error);
        return res.status(500).json("Internal Server Error");
    }
};
exports.list = list;

const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.DailySpinwheels.create(req.body);
        return res.json(result);
    }
    catch (error) {
        console.error("Error Spinwheel deleteOne : ", error);
        return res.status(500).json("Internal Server Error");
    }
});
exports.create = create;

const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.DailySpinwheels.findByIdAndUpdate((0, base_1.ObjectId)(req.params.id), Object.assign(Object.assign({}, req.body), { viewers: [] }), { new: true });
        return res.json(result);
    }
    catch (error) {
        console.error("Error DailySpinwheels deleteOne : ", error);
        return res.status(500).json("Internal Server Error");
    }
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.DailySpinwheels.deleteOne({
            _id: (0, base_1.ObjectId)(req.params.id)
        });
        return res.json(result);
    }
    catch (error) {
        console.error("Error DailySpinwheels deleteOne : ", error);
        return res.status(500).json("Internal Server Error");
    }
});
exports.deleteOne = deleteOne;

const getDailywheels = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.DailySpinwheels.find({ status: true });
        return res.json(result);
    }
    catch (error) {
        console.error("Error DailySpinwheels getdailyspins : ", error);
        return res.status(500).json("Internal Server Error");
    }
});
exports.getDailywheels = getDailywheels;

const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.DailySpinwheels.find({ status: true });
        return res.json(result);
    }
    catch (error) {
        return res.status(400).json('Internal Server Error!');
    }
});
exports.get = get;


const getDailyNotLogin = async (req, res) => {
  try {
      const result = await models_1.DailySpinwheels.find({ status: true });
          return res.json({
              prizes: result,
              lastBonus: null,
          });
  } catch (error) {
      console.error(error);
      return res.status(400).json('Internal Server Error!');
  }
};
exports.getDailyNotLogin = getDailyNotLogin;



const getDaily = async (req, res) => {
  try {
      const user = req?.user;
      const result = await models_1.DailySpinwheels.find({ status: true });

      if (!user) {
          return res.json({
              prizes: result,
              lastDailyWheel: null, 
          });
      }

      const lastDailyWheel = user.last_dailywheel || null; 

      return res.json({
          prizes: result,
          lastDailyWheel: lastDailyWheel, 
      });
  } catch (error) {
      console.error(error);
      return res.status(400).json('Internal Server Error!');
  }
};
exports.getDaily = getDaily;





// const playDaily = async (req, res) => {
//     try {
//         const user = req?.user;
//         if (!user) {
//             return res.status(401).json({ error: 'User not found' });
//         }
//         console.log("User found:", user._id);

//         let lastDailyWheelDate = user.last_dailywheel ? moment(user.last_dailywheel) : null;

//         if (!user.last_dailywheel) {
//             const twoDaysAgo = moment().subtract(2, 'days').valueOf();
//             await models_1.Users.findByIdAndUpdate(user._id, {
//                 last_dailywheel: twoDaysAgo
//             }, { new: true, upsert: true });
//             lastDailyWheelDate = moment(twoDaysAgo);
//         }

//         const now = moment();

//         if (lastDailyWheelDate && now.diff(lastDailyWheelDate, 'hours') < 24) {
//             const nextDailyWheelDate = moment(lastDailyWheelDate).add(24, 'hours');
//             return res.status(403).json({
//                 error: `You can claim your next daily wheel on ${nextDailyWheelDate.format('YYYY-MM-DD HH:mm:ss')}`,
//                 nextDailyWheelDate: nextDailyWheelDate.toISOString(),
//             });
//         }

//         const balance = await models_1.Balances.findOne({ status: true, userId: user._id });
//         if (!balance) {
//             return res.status(404).json({ error: 'Balance not found' });
//         }

//         const spinwheels = await models_1.DailySpinwheels.find({ status: true })
//             .populate({
//                 path: 'bonusId',
//                 select: 'games games_freespin max_bet_free_spin free_spin amount_type amount lang title wager games',
//                 match: { status: true },
//             })
//             .lean();

//         const validSpinwheels = spinwheels.filter((spin) => spin.bonusId);
//         if (validSpinwheels.length !== 12) {
//             console.warn('Invalid number of DailySpinwheels segments:', validSpinwheels.length);
//             return res.status(500).json({ error: 'Invalid wheel configuration' });
//         }

//         // Process percentages
//         const processedSpinwheels = validSpinwheels.map(spin => ({
//             ...spin,
//             procent: parseFloat(Number(spin.procent).toFixed(2))
//         }));

//         const totalProcent = processedSpinwheels.reduce((sum, spin) => sum + spin.procent, 0);
//         const roundedTotalProcent = parseFloat(totalProcent.toFixed(2));

//         console.log('Individual percentages:', processedSpinwheels.map(spin => spin.procent));
//         console.log('Total percentage:', roundedTotalProcent);

//         const EPSILON = 0.01;
//         if (Math.abs(roundedTotalProcent - 100) > EPSILON) {
//             console.warn('Total percentage is not 100:', roundedTotalProcent);
//             return res.status(500).json({ error: 'Invalid percentages' });
//         }

//         const randomValue = Math.random() * 100;
//         let cumulativeProcent = 0;
//         let selectedSpin = null;
//         let spinIndex = -1;

//         for (let i = 0; i < processedSpinwheels.length; i++) {
//             cumulativeProcent += processedSpinwheels[i].procent;
//             if (randomValue <= cumulativeProcent) {
//                 selectedSpin = processedSpinwheels[i];
//                 spinIndex = i;
//                 break;
//             }
//         }

//         if (!selectedSpin) {
//             console.error('Segment not selected, defaulting to first segment');
//             selectedSpin = processedSpinwheels[0];
//             spinIndex = 0;
//         }

//         const bonus = await models_1.Bonus.findById(selectedSpin.bonusId._id).lean();

//         if (bonus.player_type === 'segmentation') 
//         {
//             if (!bonus.segmentation) {
//                 console.warn(`Segmentation not specified for bonus ${bonus._id}`);
//             } else {
//                 const segmentation = await models_1.Segmentations.findById(bonus.segmentation);
//                 if (!segmentation) {
//                 console.error(`Segmentation not found for bonus ${bonus._id}`);
//                 return res.status(402).json({ error: "Bonus ain't available" });
//                 }
                
//                 balance.userId = user;

//                 const allowed = await base_1.checkSegmentationPlayer(segmentation, balance);
//                 if (!allowed) {
//                 console.error(`User ${user._id} does not match segmentation ${bonus.segmentation}`);
//                 return res.status(402).json({ error: "Daily wheels are available only for customers who made deposits last 10 days" });
//                 }
//             }
//         }

//         let responseData = { spinIndex, lastDailyWheelDate: Date.now() };

//         const bonusAssigned = await exports.sendUserBonusFromDailyWheel(bonus, user._id);
//         if (!bonusAssigned) {
//             console.error('Failed to assign bonus to user');
//             return res.status(500).json({ error: 'Failed to assign bonus' });
//         }

//         const en = bonus.lang.find((e) => e.lang === 'en') || bonus.lang[0];
//         responseData.bonus = {
//             bonusId: bonus._id,
//             title: en?.title || 'Bonus',
//             amount: bonus.amount || selectedSpin.amount || 0,
//             amount_type: bonus.amount_type || 'bonus',
//             wager: bonus.wager || 0,
//             free_spin: bonus.free_spin || 0,
//             games: bonus.games || [],
//             games_freespin: bonus.games_freespin || [],
//         };

//         if (bonus.free_spin && bonus.games_freespin?.length) {
//     let gameCode = bonus.games_freespin[0];
//     if (gameCode && typeof gameCode === 'object' && gameCode.game_code) {
//         gameCode = gameCode.game_code;
//     }
//     if (!gameCode || typeof gameCode !== 'string') {
//         console.error('Incorrect gameCode:', bonus.games_freespin);
//         return res.status(500).json({ error: 'Game code not found' });
//     }

//     const gameData = await models_1.GameLists.findOne({ game_code: gameCode }).lean();
//     if (!gameData) {
//         console.error('Game not found:', gameCode);
//         return res.status(500).json({ error: 'Game not found' });
//     }

//     const spinLimit = await models_1.FreeSpinLimits.findOne({
//         game_code: gameCode,
//         currency: balance.currency.symbol,
//     }).lean();
//     let maxBet = spinLimit ? spinLimit.max_bet || 1 : bonus.max_bet_free_spin || 1;

//     const betFactor = gameData.details?.bet_factor || 0.1;
//     let adjustedMaxBet = maxBet;
//     if (betFactor > 0 && maxBet % betFactor !== 0) {
//         adjustedMaxBet = Math.ceil(maxBet / betFactor) * betFactor;
//     }

//     if (adjustedMaxBet <= 0) {
//         console.error('Incorrect bet:', adjustedMaxBet);
//         return res.status(500).json({ error: 'Incorrect bet' });
//     }

//     const expiresAt = moment().add(1, 'day').valueOf();
//     const freespinCount = selectedSpin.amount || bonus.free_spin || 1;
//     const campaignResult = await timelesstech_1.createCampaign(
//         [gameCode],
//         String(user._id),
//         freespinCount,
//         new Date(expiresAt),
//         'Freespin',
//         adjustedMaxBet
//     );

//             if (!campaignResult) {
//                 console.error('Failed to create campaign');
//                 return res.status(500).json({ error: 'Failed to create campaign' });
//             }

//             responseData.game = {
//                 game_name: gameData.game_name || 'Anonim game',
//                 game_code: gameData.game_code,
//                 provider_code: gameData.provider_code || 'Anonim',
//             };
//         }

//         await models_1.Users.findByIdAndUpdate(user._id, { last_dailywheel: Date.now() }, { new: true });

//         return res.json(responseData);
//     } catch (error) {
//         console.error('Error in playDaily:', error);
//         return res.status(402).json({ error: 'Internal server error', details: error.message });
//     }
// };
//  exports.playDaily = playDaily;

// const sendUserBonusFromDailyWheel = async (bonus, userId) => {
//     try {
//         const user = await models_1.Users.findOne({ _id: userId, status: true });
//         if (!user) {
//             console.error(`User not found: ${userId}`);
//             return false;
//         }
      
//         const players = Array.isArray(bonus.players) ? bonus.players : [];
       
//         // if (!players.includes(String(userId))) {
//         //     await models_1.Bonus.findByIdAndUpdate(bonus._id, {
//         //         $addToSet: { players: String(userId) },
//         //     });
//         // }

      
//         const exists = await models_1.BonusHistories.findOne({
//             userId: user._id,
//             $or: [{ status: 'active' }],
//         });
    
//         const query = {
//             bonusId: bonus._id,
//             userId: user._id,
//             amount: bonus.amount || 0,
//             isDeposit: 0,
//             status: 'processing',
//             daily:'daily_wheel',
//             startProcessingDate: new Date(), 
//             expireProcessingDate: new Date(Date.now() + 24 * 60 * 60 * 1000), 
//         };
 
//         const en = bonus.lang.find((e) => e.lang === 'en') || bonus.lang[0];
//         const queryNoti = {
//             title: `New Daily Wheel Bonus`,
//             description: `You won a bonus from the Daily Wheel! (${en?.title || 'Bonus'}) bonus up => ${bonus.amount || 0}  ${process.env.DOMAIN}/en/casino/promotion/${bonus._id}`,
//             players: [String(user._id)],
//             country: ['all'],
//             auto: true,
//         };

//         await models_1.BonusHistories.create(query);
//         await models_1.Notification.create(queryNoti);
      
//         if (!exists) {
//             await models_1.Balances.updateOne(
//                 { userId: user._id, status: true },
//                 { bonus: 0 }
//             );
//         }
//         return true;
//     } catch (error) {
//         console.error('Error in sendUserBonusFromDailyWheel:', error);
//         return false;
//     }
// };
// exports.sendUserBonusFromDailyWheel = sendUserBonusFromDailyWheel;

const playDaily = async (req, res) => {
  try {
    const user = req?.user;
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    console.log("User found:", user._id);

    let lastDailyWheelDate = user.last_dailywheel ? moment(user.last_dailywheel) : null;

    if (!user.last_dailywheel) {
      const twoDaysAgo = moment().subtract(2, 'days').valueOf();
      await models_1.Users.findByIdAndUpdate(user._id, {
        last_dailywheel: twoDaysAgo
      }, { new: true, upsert: true });
      lastDailyWheelDate = moment(twoDaysAgo);
    }

    const now = moment();

    if (lastDailyWheelDate && now.diff(lastDailyWheelDate, 'hours') < 24) {
      const nextDailyWheelDate = moment(lastDailyWheelDate).add(24, 'hours');
      return res.status(403).json({
        error: `You can claim your next daily wheel on ${nextDailyWheelDate.format('YYYY-MM-DD HH:mm:ss')}`,
        nextDailyWheelDate: nextDailyWheelDate.toISOString(),
      });
    }

    const balance = await models_1.Balances.findOne({ status: true, userId: user._id });
    if (!balance) {
      return res.status(404).json({ error: 'Balance not found' });
    }
    const userCurrency = balance.currency.symbol; // Получаем валюту пользователя

    const spinwheels = await models_1.DailySpinwheels.find({ status: true })
      .populate({
        path: 'bonusId',
        select: 'currencies lang title wager free_spin free_games max_bet_free_spin amount_type amount games event',
        match: { status: true },
      })
      .lean();

    const validSpinwheels = spinwheels.filter((spin) => spin.bonusId);
    if (validSpinwheels.length !== 12) {
      console.warn('Invalid number of DailySpinwheels segments:', validSpinwheels.length);
      return res.status(500).json({ error: 'Invalid wheel configuration' });
    }

    // Process percentages
    const processedSpinwheels = validSpinwheels.map(spin => ({
      ...spin,
      procent: parseFloat(Number(spin.procent).toFixed(2))
    }));

    const totalProcent = processedSpinwheels.reduce((sum, spin) => sum + spin.procent, 0);
    const roundedTotalProcent = parseFloat(totalProcent.toFixed(2));

    console.log('Individual percentages:', processedSpinwheels.map(spin => spin.procent));
    console.log('Total percentage:', roundedTotalProcent);

    const EPSILON = 0.01;
    if (Math.abs(roundedTotalProcent - 100) > EPSILON) {
      console.warn('Total percentage is not 100:', roundedTotalProcent);
      return res.status(500).json({ error: 'Invalid percentages' });
    }

    const randomValue = Math.random() * 100;
    let cumulativeProcent = 0;
    let selectedSpin = null;
    let spinIndex = -1;

    for (let i = 0; i < processedSpinwheels.length; i++) {
      cumulativeProcent += processedSpinwheels[i].procent;
      if (randomValue <= cumulativeProcent) {
        selectedSpin = processedSpinwheels[i];
        spinIndex = i;
        break;
      }
    }

    if (!selectedSpin) {
      console.error('Segment not selected, defaulting to first segment');
      selectedSpin = processedSpinwheels[0];
      spinIndex = 0;
    }

    const bonus = selectedSpin.bonusId;

    // Находим matching currency в bonus.currencies
    const matchingCurrency = bonus.currencies.find(c => c.currency === userCurrency);
    if (!matchingCurrency) {
      console.error(`No matching currency for user ${user._id}: ${userCurrency}`);
      return res.status(402).json({ error: "Bonus not available for your currency" });
    }

    if (bonus.player_type === 'segmentation') {
      if (!bonus.segmentation) {
        console.warn(`Segmentation not specified for bonus ${bonus._id}`);
      } else {
        const segmentation = await models_1.Segmentations.findById(bonus.segmentation);
        if (!segmentation) {
          console.error(`Segmentation not found for bonus ${bonus._id}`);
          return res.status(402).json({ error: "Bonus ain't available" });
        }

        balance.userId = user;

        const allowed = await base_1.checkSegmentationPlayer(segmentation, balance);
        if (!allowed) {
          console.error(`User ${user._id} does not match segmentation ${bonus.segmentation}`);
          return res.status(402).json({ error: "Daily wheels are available only for customers who made deposits last 10 days" });
        }
      }
    }

    let responseData = { spinIndex, lastDailyWheelDate: Date.now() };

    const bonusAssigned = await sendUserBonusFromDailyWheel(bonus, user._id, userCurrency);
    if (!bonusAssigned) {
      console.error('Failed to assign bonus to user');
      return res.status(500).json({ error: 'Failed to assign bonus' });
    }

    const en = bonus.lang.find((e) => e.lang === 'en') || bonus.lang[0];
    responseData.bonus = {
      bonusId: bonus._id,
      title: en?.title || 'Bonus',
      amount: matchingCurrency.amount || 0,
      amount_type: matchingCurrency.amount_type || 'bonus',
      wager: matchingCurrency.wager || 0,
      free_spin: matchingCurrency.free_spin || 0,
      games: matchingCurrency.games || [],
      games_freespin: matchingCurrency.free_games || [],
    };

    if (matchingCurrency.free_spin && matchingCurrency.free_games?.length) {
      let gameCode = matchingCurrency.free_games[0];
      if (gameCode && typeof gameCode === 'object' && gameCode.game_code) {
        gameCode = gameCode.game_code;
      }
      if (!gameCode || typeof gameCode !== 'string') {
        console.error('Incorrect gameCode:', matchingCurrency.free_games);
        return res.status(500).json({ error: 'Game code not found' });
      }

      const gameData = await models_1.GameLists.findOne({ game_code: gameCode }).lean();
      if (!gameData) {
        console.error('Game not found:', gameCode);
        return res.status(500).json({ error: 'Game not found' });
      }

      const spinLimit = await models_1.FreeSpinLimits.findOne({
        game_code: gameCode,
        currency: userCurrency,
      }).lean();
      let maxBet = spinLimit ? spinLimit.max_bet || 1 : matchingCurrency.max_bet_free_spin || 1;

      const betFactor = gameData.details?.bet_factor || 0.1;
      let adjustedMaxBet = maxBet;
      if (betFactor > 0 && maxBet % betFactor !== 0) {
        adjustedMaxBet = Math.ceil(maxBet / betFactor) * betFactor;
      }

      if (adjustedMaxBet <= 0) {
        console.error('Incorrect bet:', adjustedMaxBet);
        return res.status(500).json({ error: 'Incorrect bet' });
      }

      const expiresAt = moment().add(1, 'day').valueOf();
      const freespinCount = matchingCurrency.free_spin || 1;
      const campaignResult = await timelesstech_1.createCampaign(
        matchingCurrency.free_games,
        String(user._id),
        freespinCount,
        new Date(expiresAt),
        'Freespin',
        adjustedMaxBet
      );

      if (!campaignResult) {
        console.error('Failed to create campaign');
        return res.status(500).json({ error: 'Failed to create campaign' });
      }

      responseData.game = {
        game_name: gameData.game_name || 'Anonim game',
        game_code: gameData.game_code,
        provider_code: gameData.provider_code || 'Anonim',
      };
    }

    await models_1.Users.findByIdAndUpdate(user._id, { last_dailywheel: Date.now() }, { new: true });

    return res.json(responseData);
  } catch (error) {
    console.error('Error in playDaily:', error);
    return res.status(402).json({ error: 'Internal server error', details: error.message });
  }
};
exports.playDaily = playDaily;

const sendUserBonusFromDailyWheel = async (bonus, userId, userCurrency) => {
  try {
    const user = await models_1.Users.findOne({ _id: userId, status: true });
    if (!user) {
      console.error(`User not found: ${userId}`);
      return false;
    }

    const matchingCurrency = bonus.currencies.find(c => c.currency === userCurrency);
    if (!matchingCurrency) {
      console.error(`No matching currency for bonus ${bonus._id} and user ${userId}: ${userCurrency}`);
      return false;
    }

    const players = Array.isArray(bonus.players) ? bonus.players : [];

    const exists = await models_1.BonusHistories.findOne({
      userId: user._id,
      $or: [{ status: 'active' }],
    });

    const query = {
      bonusId: bonus._id,
      userId,
      amount: matchingCurrency.amount,
      wager_amount: matchingCurrency.wager,
      isDeposit: 0,
      status: 'processing',
      daily: 'daily_wheel',
      startProcessingDate: new Date(),
      expireProcessingDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    const en = bonus.lang.find((e) => e.lang === 'en') || bonus.lang[0];
    const queryNoti = {
      title: `New Daily Wheel Bonus`,
      description: `You won a bonus from the Daily Wheel! (${en?.title || 'Bonus'}) bonus up => ${matchingCurrency.amount || 0}  ${process.env.DOMAIN}/en/casino/promotion/${bonus._id}`,
      players: [String(user._id)],
      country: ['all'],
      auto: true,
    };

    await models_1.BonusHistories.create(query);
    await models_1.Notification.create(queryNoti);

    await models_1.Balances.updateOne(
      { userId: user._id, status: true },
      { $inc: { bonus: matchingCurrency.amount } }
    );

    return true;
  } catch (error) {
    console.error('Error in sendUserBonusFromDailyWheel:', error);
    return false;
  }
};
exports.sendUserBonusFromDailyWheel = sendUserBonusFromDailyWheel;