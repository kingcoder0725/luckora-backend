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
exports.checkWin = exports.check = exports.get = void 0;
const models_1 = require("../../models");
const fiatConverter_1 = require("../../utils/fiatConverter");

const get = async (req, res) => {
    try {
        const { userId } = req.body;
        console.log('Fetching scratch data for user ID:', userId);

        if (!userId) {
            return res.status(200).json({ message: 'userId is required' });
        }

        const minigame = await models_1.MissionMiniGames.findOne().lean();
        if (!minigame) {
            return res.status(404).json({ message: 'Minigame settings not found' });
        }
        const scratchCost = minigame.scratch_cost;

        const balance = await models_1.Balances.findOne({ userId }).lean();
        if (!balance) {
            return res.status(404).json({ message: 'User balance not found' });
        }

        const lastPlay = await models_1.MissionMiniScratchHistories
            .findOne({ userId })
            .sort({ createdAt: -1 })
            .lean();
        let timeUntilNextPlay = null;
        if (lastPlay) {
            const lastPlayTime = new Date(lastPlay.createdAt).getTime();
            const now = new Date().getTime();
            console.log('Debug - lastPlayTime:', new Date(lastPlayTime).toISOString());
            console.log('Debug - now:', new Date(now).toISOString());
            const nextPlayTime = lastPlayTime + 86_400_000;
            console.log('Debug - nextPlayTime:', new Date(nextPlayTime).toISOString());
            const timeDiff = nextPlayTime - now;
            if (timeDiff > 0) {
                timeUntilNextPlay = timeDiff;
                console.log('Debug - timeUntilNextPlay:', timeDiff / 1000 / 60 / 60, 'hours');
            }
        }

        const scratches = await models_1.MissionMiniScratch.find().lean();
        const formattedScratches = scratches.map(scratch => ({
            _id: scratch._id.toString(),
            name: scratch.name,
            banner_path: scratch.banner_path,
            procent: scratch.procent,
            type: scratch.type,
            points: scratch.points,
            store_reward: scratch.store_reward.map(id => id.toString()),
            minigameId: scratch.minigameId.toString(),
            createdAt: scratch.createdAt,
            updatedAt: scratch.updatedAt,
        }));

        res.json({
            cost: scratchCost,
            balance: balance.points,
            data: formattedScratches,
            timeUntilNextPlay: timeUntilNextPlay,
        });
    } catch (error) {
        console.error('Error in get:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.get = get;

// const check = async (req, res) => {
//   try {
//     const { userId } = req.body;
//     console.log('Checking scratch for user ID:', userId);

//     if (!userId) {
//       return res.status(200).json({ message: 'userId is required' });
//     }

//     const minigame = await models_1.MissionMiniGames.findOne().lean();
//     if (!minigame) {
//       return res.status(404).json({ message: 'Minigame settings not found' });
//     }
//     const scratchCost = minigame.scratch_cost;

//     const balance = await models_1.Balances.findOne({ userId }).lean();
//     if (!balance) {
//       return res.status(404).json({ message: 'User balance not found' });
//     }
//     if (balance.points < scratchCost) {
//       return res.status(200).json({ message: 'Insufficient points to play scratch game' });
//     }

//     await models_1.Balances.findOneAndUpdate(
//       { userId },
//       { $inc: { points: -scratchCost } }
//     );

//     const scratches = await models_1.MissionMiniScratch.find().lean();
//     if (!scratches.length) {
//       return res.status(404).json({ message: 'No scratch records found' });
//     }

//     const totalProcent = scratches.reduce((sum, scratch) => sum + (scratch.procent || 0), 0);
//     if (totalProcent > 100) {
//       return res.status(404).json({ message: 'Total procent of scratch records exceeds 100%' });
//     }

//     const weightedScratches = [];
//     for (const scratch of scratches) {
//       const weight = scratch.procent;
//       for (let i = 0; i < weight; i++) {
//         weightedScratches.push({
//           _id: scratch._id.toString(),
//           banner_path: scratch.banner_path || '',
//         });
//       }
//     }

//     if (totalProcent < 100) {
//       const remainingWeight = 100 - totalProcent;
//       for (let i = 0; i < remainingWeight; i++) {
//         weightedScratches.push({
//           _id: null,
//           banner_path: '',
//         });
//       }
//     }

//     const grid = [];
//     for (let i = 0; i < 9; i++) {
//       if (weightedScratches.length === 0) {
//         grid.push({ _id: null, banner_path: '', eraze: false });
//         continue;
//       }

//       const randomIndex = Math.floor(Math.random() * weightedScratches.length);
//       const selected = weightedScratches[randomIndex];
//       grid.push({
//         _id: selected._id,
//         banner_path: selected.banner_path,
//         eraze: false,
//       });

//       weightedScratches.splice(randomIndex, 1);
//     }

//     res.json({
//       cost: scratchCost,
//       balance: balance.points - scratchCost,
//       data: grid,
//     });
//   } catch (error) {
//     console.error('Error in check:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };
// exports.check = check;


// const checkWin = async (req, res) => {
//   try {
//     console.log('Received body:', JSON.stringify(req.body, null, 2));
//     const { userId, grid } = req.body;
//     console.log('Checking win for user ID:', userId);

//     if (!userId || !grid) {
//       return res.status(200).json({ message: 'userId and grid are required', received: req.body });
//     }

//     if (!Array.isArray(grid) || grid.length !== 9) {
//       return res.status(200).json({ message: 'Grid must be an array of 9 cells', receivedGrid: grid });
//     }

//     const openedCells = grid.filter((cell) => cell.eraze === true);
//     if (openedCells.length !== 3) {
//       return res.status(200).json({ message: 'Exactly 3 cells must have eraze: true', openedCount: openedCells.length });
//     }

//     const openedScratchIds = openedCells.filter((cell) => cell._id).map((cell) => cell._id);

//     const scratches = await models_1.MissionMiniScratch.find({
//       _id: { $in: openedScratchIds },
//     }).lean();

//     const openedScratches = openedCells.map((cell) => {
//       if (!cell._id) {
//         return { type: 'nothing' };
//       }
//       const scratch = scratches.find((s) => s._id.toString() === cell._id);
//       return scratch || { type: 'nothing' };
//     });

//     const types = openedScratches.map((scratch) => scratch.type);
//     const allSameType = types.every((type) => type === types[0]);
//     const hasNothing = types.includes('nothing');

//     if (!allSameType || hasNothing) {
//       return res.json({ result: 'lose', message: 'No win - types do not match or include nothing' });
//     }

//     const winType = types[0];
//     const winData = openedScratches.map((scratch) => ({
//       _id: scratch._id?.toString() || null,
//       type: scratch.type,
//       points: scratch.points || 0,
//       store_reward: (scratch.store_reward || []).map((id) => id.toString()),
//     }));

//     const balance = await models_1.Balances.findOne({ userId }).populate('currency');
//     if (!balance) {
//       return res.status(404).json({ message: 'User balance not found' });
//     }

//     let rewardDetails = {};

//     if (winType === 'points') {
//       const pointsToAward = openedScratches[0].points || 0;
//       await models_1.Balances.findOneAndUpdate(
//         { userId },
//         { $inc: { points: pointsToAward } }
//       );
//       rewardDetails = { pointsAwarded: pointsToAward };
//     } else if (winType === 'store') {
//       const shopIds = openedScratches[0].store_reward || [];
//       const purchases = [];

//       for (const shopId of shopIds) {
//         const shop = await models_1.MissionShops.findById(shopId).lean();
//         if (!shop || !shop.status) {
//           continue;
//         }

//         let calculatedPayout = shop.payout;

//         if (shop.type_gift === 'cash_bonus') {
//           calculatedPayout = 0;

//           const priorityPointsCost = await models_1.MissionPointsCost.findOne({ priority: true }).populate('currencyId');
//           if (!priorityPointsCost) {
//             return res.status(500).json({ message: 'Priority points cost not found' });
//           }

//           const userPointsCost = await models_1.MissionPointsCost.findOne({ currencyId: balance.currency._id }).populate('currencyId');
//           const userCurrencySymbol = balance.currency.symbol;

//           if (userPointsCost) {
//             calculatedPayout = shop.cost * userPointsCost.fiatValue;
//           } else {
//             const priorityValue = priorityPointsCost.fiatValue;
//             const priorityCurrencySymbol = priorityPointsCost.currencyId.symbol;
//             const pointsInPriorityCurrency = shop.cost * priorityValue;

//             if (priorityCurrencySymbol !== userCurrencySymbol) {
//               const rate = await fiatConverter_1.convertFiatCurrency(priorityCurrencySymbol, userCurrencySymbol, 1);
//               if (rate === 0) {
//                 return res.status(500).json({ message: 'Currency conversion failed' });
//               }
//               calculatedPayout = pointsInPriorityCurrency * rate;
//             } else {
//               calculatedPayout = pointsInPriorityCurrency;
//             }
//           }

//           calculatedPayout = Number(calculatedPayout.toFixed(2));

//           await models_1.Balances.findOneAndUpdate(
//             { userId },
//             { $inc: { bonus: calculatedPayout } }
//           );
//         }

//         const historyEntry = {
//           shopId: shop._id,
//           userId,
//           type_pay: shop.type_pay,
//           cost: 0,
//           payout: calculatedPayout,
//           vendors: shop.vendors || [],
//           games: shop.games || [],
//           status: 'paid',
//           activate: shop.type_gift === 'free_spins' ? false : true,
//         };

//         const shopHistory = await models_1.MissionShopsHistories.create(historyEntry);

//         const balanceHistoryEntry = {
//           userId,
//           currency: balance.currency._id,
//           amount: 0,
//           currentBalance: balance.balance,
//           beforeBalance: balance.balance,
//           bonus: shop.type_gift === 'cash_bonus' ? calculatedPayout : 0,
//           points: balance.points,
//           type: 'scratch-win',
//           info: shopHistory._id.toString(),
//         };

//         await models_1.BalanceHistories.create(balanceHistoryEntry);

//         purchases.push({
//           shopId: shop._id.toString(),
//           type_gift: shop.type_gift,
//           payout: calculatedPayout,
//         });
//       }
//       rewardDetails = { purchases };
//     }

//     return res.json({
//       result: 'win',
//       type: winType,
//       data: winData,
//       reward: rewardDetails,
//       message: `Win - all 3 cells are type ${winType}`,
//     });
//   } catch (error) {
//     console.error('Error in checkWin:', error);
//     res.status(500).json({ message: 'Internal server error', error: error.message });
//   }
// };
// exports.checkWin = checkWin;


const check = async (req, res) => {
  try {
    const { userId } = req.body;
    console.log('Checking scratch for user ID:', userId);

    if (!userId) {
      return res.status(200).json({ message: 'userId is required' });
    }

    const minigame = await models_1.MissionMiniGames.findOne().lean();
    if (!minigame) {
      return res.status(404).json({ message: 'Minigame settings not found' });
    }
    const scratchCost = minigame.scratch_cost;

    const balance = await models_1.Balances.findOne({ userId }).lean();
    if (!balance) {
      return res.status(404).json({ message: 'User balance not found' });
    }
    if (balance.points < scratchCost) {
      return res.status(200).json({ message: 'Insufficient points to play scratch game' });
    }

    const lastPlay = await models_1.MissionMiniScratchHistories
      .findOne({ userId, minigameId: minigame._id })
      .sort({ createdAt: -1 })
      .lean();
    let timeUntilNextPlay = null;
    if (lastPlay) {
      const lastPlayTime = new Date(lastPlay.createdAt).getTime();
      const now = new Date().getTime();
      console.log('Debug - lastPlayTime:', new Date(lastPlayTime).toISOString());
      console.log('Debug - now:', new Date(now).toISOString());
      console.log('Debug - lastPlay document:', lastPlay); 
      const nextPlayTime = lastPlayTime + 86_400_000;
      console.log('Debug - nextPlayTime:', new Date(nextPlayTime).toISOString());
      const timeDiff = nextPlayTime - now;
      console.log('Debug - timeDiff:', timeDiff, 'ms (', timeDiff / 1000 / 60 / 60, 'hours)');
      if (timeDiff > 0) {
        timeUntilNextPlay = timeDiff;
        console.log('Debug - Returning timeUntilNextPlay:', timeUntilNextPlay);
        return res.status(402).json({ message: 'You can play again after 24 hours', timeUntilNextPlay });
      }
    }

    await models_1.Balances.findOneAndUpdate(
      { userId },
      { $inc: { points: -scratchCost } }
    );

    const scratches = await models_1.MissionMiniScratch.find().lean();
    if (!scratches.length) {
      return res.status(404).json({ message: 'No scratch records found' });
    }

    const totalProcent = scratches.reduce((sum, scratch) => sum + (scratch.procent || 0), 0);
    if (totalProcent > 100) {
      return res.status(404).json({ message: 'Total procent of scratch records exceeds 100%' });
    }

    const weightedScratches = [];
    for (const scratch of scratches) {
      const weight = scratch.procent;
      for (let i = 0; i < weight; i++) {
        weightedScratches.push({
          _id: scratch._id.toString(),
          banner_path: scratch.banner_path || '',
        });
      }
    }

    if (totalProcent < 100) {
      const remainingWeight = 100 - totalProcent;
      for (let i = 0; i < remainingWeight; i++) {
        weightedScratches.push({
          _id: null,
          banner_path: '',
        });
      }
    }

    const grid = [];
    for (let i = 0; i < 9; i++) {
      if (weightedScratches.length === 0) {
        grid.push({ _id: null, banner_path: '', eraze: false });
        continue;
      }

      const randomIndex = Math.floor(Math.random() * weightedScratches.length);
      const selected = weightedScratches[randomIndex];
      grid.push({
        _id: selected._id,
        banner_path: selected.banner_path,
        eraze: false,
      });

      weightedScratches.splice(randomIndex, 1);
    }

    res.json({
      cost: scratchCost,
      balance: balance.points - scratchCost,
      data: grid,
      timeUntilNextPlay: timeUntilNextPlay,
    });
  } catch (error) {
    console.error('Error in check:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.check = check;


const checkWin = async (req, res) => {
  try {
    console.log('Received body:', JSON.stringify(req.body, null, 2));
    const { userId, grid } = req.body;
    console.log('Checking win for user ID:', userId);

    if (!userId || !grid) {
      console.log('Validation failed: userId or grid missing');
      return res.status(200).json({ message: 'userId and grid are required', received: req.body });
    }

    if (!Array.isArray(grid) || grid.length !== 9) {
      console.log('Validation failed: Grid is not an array of 9 cells', { receivedGrid: grid });
      return res.status(200).json({ message: 'Grid must be an array of 9 cells', receivedGrid: grid });
    }

    const openedCells = grid.filter((cell) => cell.eraze === true);
    if (openedCells.length !== 3) {
      console.log('Validation failed: Only 3 cells must have eraze: true', { openedCount: openedCells.length });
      return res.status(200).json({ message: 'Exactly 3 cells must have eraze: true', openedCount: openedCells.length });
    }

    const openedScratchIds = openedCells.filter((cell) => cell._id).map((cell) => cell._id);
    console.log('Opened Scratch IDs:', openedScratchIds);

    const scratches = await models_1.MissionMiniScratch.find({
      _id: { $in: openedScratchIds },
    }).lean();
    console.log('Found scratches:', scratches);

    const openedScratches = openedCells.map((cell) => {
      if (!cell._id) {
        return { type: 'nothing' };
      }
      const scratch = scratches.find((s) => s._id.toString() === cell._id);
      return scratch || { type: 'nothing' };
    });
    console.log('Opened Scratches:', openedScratches);

    const types = openedScratches.map((scratch) => scratch.type);
    const allSameType = types.every((type) => type === types[0]);
    const hasNothing = types.includes('nothing');
    console.log('Types:', types, 'allSameType:', allSameType, 'hasNothing:', hasNothing);

    if (!allSameType || hasNothing) {
      const minigame = await models_1.MissionMiniGames.findOne().lean();
      if (!minigame) {
        console.log('Error: Minigame settings not found');
        return res.status(404).json({ message: 'Minigame settings not found' });
      }
      const historyEntry = {
        userId,
        minigameId: minigame._id,
        type_pay: 'points',
        cost: minigame.scratch_cost,
        payout: 0,
        vendors: [],
        games: [],
        game_code: '',
        status: 'paid',
        activate: true,
        grid: grid.map(({ _id, eraze }) => ({ _id, eraze })),
      };
      await models_1.MissionMiniScratchHistories.create(historyEntry);
      console.log('Returning lose response:', { result: 'lose', message: 'No win - types do not match or include nothing' });
      return res.json({ result: 'lose', message: 'No win - types do not match or include nothing' });
    }

    const winType = types[0];
    const winData = openedScratches.map((scratch) => ({
      _id: scratch._id?.toString() || null,
      type: scratch.type,
      points: scratch.points || 0,
      store_reward: (scratch.store_reward || []).map((id) => id.toString()),
    }));
    console.log('Win Type:', winType, 'Win Data:', winData);

    const balance = await models_1.Balances.findOne({ userId }).populate('currency');
    if (!balance) {
      console.log('Error: User balance not found');
      return res.status(404).json({ message: 'User balance not found' });
    }

    let rewardDetails = {};
    let totalPayout = 0;

    if (winType === 'points') {
      const pointsToAward = openedScratches[0].points || 0;
      await models_1.Balances.findOneAndUpdate(
        { userId },
        { $inc: { points: pointsToAward } }
      );
      rewardDetails = { pointsAwarded: pointsToAward };
      totalPayout = pointsToAward;
      console.log('Awarding points:', pointsToAward);
    } else if (winType === 'store') {
      const shopIds = openedScratches[0].store_reward || [];
      const purchases = [];

      for (const shopId of shopIds) {
        const shop = await models_1.MissionShops.findById(shopId).lean();
        if (!shop || !shop.status) {
          continue;
        }

        let calculatedPayout = shop.payout;

        if (shop.type_gift === 'cash_bonus') {
          calculatedPayout = 0;

          const priorityPointsCost = await models_1.MissionPointsCost.findOne({ priority: true }).populate('currencyId');
          if (!priorityPointsCost) {
            console.log('Error: Priority points cost not found');
            return res.status(500).json({ message: 'Priority points cost not found' });
          }

          const userPointsCost = await models_1.MissionPointsCost.findOne({ currencyId: balance.currency._id }).populate('currencyId');
          const userCurrencySymbol = balance.currency.symbol;

          if (userPointsCost) {
            calculatedPayout = shop.cost * userPointsCost.fiatValue;
          } else {
            const priorityValue = priorityPointsCost.fiatValue;
            const priorityCurrencySymbol = priorityPointsCost.currencyId.symbol;
            const pointsInPriorityCurrency = shop.cost * priorityValue;

            if (priorityCurrencySymbol !== userCurrencySymbol) {
              const rate = await fiatConverter_1.convertFiatCurrency(priorityCurrencySymbol, userCurrencySymbol, 1);
              if (rate === 0) {
                console.log('Error: Currency conversion failed');
                return res.status(500).json({ message: 'Currency conversion failed' });
              }
              calculatedPayout = pointsInPriorityCurrency * rate;
            } else {
              calculatedPayout = pointsInPriorityCurrency;
            }
          }

          calculatedPayout = Number(calculatedPayout.toFixed(2));
          await models_1.Balances.findOneAndUpdate(
            { userId },
            { $inc: { bonus: calculatedPayout } }
          );
        }

        const historyEntry = {
          shopId: shop._id,
          userId,
          type_pay: shop.type_pay,
          cost: 0,
          payout: calculatedPayout,
          vendors: shop.vendors || [],
          games: shop.games || [],
          status: 'paid',
          activate: shop.type_gift === 'free_spins' ? false : true,
        };

        const shopHistory = await models_1.MissionShopsHistories.create(historyEntry);

        const balanceHistoryEntry = {
          userId,
          currency: balance.currency._id,
          amount: 0,
          currentBalance: balance.balance,
          beforeBalance: balance.balance,
          bonus: shop.type_gift === 'cash_bonus' ? calculatedPayout : 0,
          points: balance.points,
          type: 'scratch-win',
          info: shopHistory._id.toString(),
        };

        await models_1.BalanceHistories.create(balanceHistoryEntry);

        purchases.push({
          shopId: shop._id.toString(),
          type_gift: shop.type_gift,
          payout: calculatedPayout,
        });
      }
      rewardDetails = { purchases };
      totalPayout = purchases.reduce((sum, p) => sum + p.payout, 0);
      console.log('Awarding store rewards:', purchases);
    }

    const minigame = await models_1.MissionMiniGames.findOne().lean();
    if (!minigame) {
      console.log('Error: Minigame settings not found');
      return res.status(404).json({ message: 'Minigame settings not found' });
    }
    const lastScratchHistory = await models_1.MissionMiniScratchHistories
      .findOne({ userId, minigameId: minigame._id })
      .sort({ createdAt: -1 })
      .lean();
    if (lastScratchHistory) {
      await models_1.MissionMiniScratchHistories.findByIdAndUpdate(lastScratchHistory._id, {
        payout: totalPayout,
      });
    } else {
      const historyEntry = {
        userId,
        minigameId: minigame._id,
        type_pay: 'points',
        cost: minigame.scratch_cost,
        payout: totalPayout,
        vendors: [],
        games: [],
        game_code: '',
        status: 'paid',
        activate: true,
        grid: grid.map(({ _id, eraze }) => ({ _id, eraze })),
      };
      await models_1.MissionMiniScratchHistories.create(historyEntry);
    }

    const response = {
      result: 'win',
      type: winType,
      data: winData,
      reward: rewardDetails,
      message: `Win - all 3 cells are type ${winType}, awarded ${winType === 'points' ? `${totalPayout} points` : 'store rewards'}`,
    };
    console.log('Sending response to frontend:', response);
    return res.json(response);
  } catch (error) {
    console.error('Error in checkWin:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
exports.checkWin = checkWin;