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
exports.play = exports.get = void 0;
const models_1 = require("../../models");
const fiatConverter_1 = require("../../utils/fiatConverter");


const get = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(200).json({ message: 'userId is required' });
    }

    const minigame = await models_1.MissionMiniGames.findOne().lean();
    if (!minigame) {
      return res.status(404).json({ message: 'Minigame configuration not found' });
    }
    const wheelCost = minigame.wheel_100_cost;
    const minigameId = minigame._id;

    const balance = await models_1.Balances.findOne({ userId }).lean();
    if (!balance) {
      return res.status(404).json({ message: 'User balance not found' });
    }
    const userPoints = balance.points;
    const userCurrencySymbol = balance.currency.symbol;

    const wheels = await models_1.MissionMiniWheelTwo.find().lean();
    if (wheels.length !== 9) {
      return res.status(200).json({ message: 'Exactly 9 wheel prize records are required' });
    }

    const totalProcent = wheels.reduce((sum, wheel) => sum + (wheel.procent || 0), 0);
    if (totalProcent > 100) {
      return res.status(200).json({ message: 'Total procent of wheel prizes exceeds 100%' });
    }

    const lastPlay = await models_1.MissionMiniWheelHistories
      .findOne({ userId, minigameId })
      .sort({ createdAt: -1 })
      .lean();
    let timeUntilNextPlay = null;
    if (lastPlay) {
      const lastPlayTime = new Date(lastPlay.createdAt).getTime();
      const now = new Date().getTime();
      const nextPlayTime = lastPlayTime + 86_400_000;
      const timeDiff = nextPlayTime - now;
      if (timeDiff > 0) {
        timeUntilNextPlay = timeDiff;
      }
    }

    const formattedWheels = await Promise.all(
      wheels.map(async (wheel) => {
        let reward = wheel.reward;

        if (wheel.type === 'bonus_balance') {
          if (balance && balance.currency.isFiat && balance.currency.symbol !== 'USD') {
            const rate = await fiatConverter_1.convertFiatCurrency('USD', balance.currency.symbol, 1);
            if (rate === 0) {
              throw new Error('Currency conversion failed');
            }
            reward = wheel.reward * rate;
          }
          return {
            _id: wheel._id.toString(),
            num: wheel.num,
            text: `${Number(reward.toFixed(2))} ${userCurrencySymbol}`,
            desc: wheel.desc || '',
            type: wheel.type,
            reward: Number(reward.toFixed(2)),
            isSmallText: true,
          };
        }

        return {
          _id: wheel._id.toString(),
          num: wheel.num,
          text: wheel.title || 'Unknown Prize',
          desc: wheel.desc || '',
          type: wheel.type,
          reward: Number(reward.toFixed(2)),
          isSmallText: false,
        };
      })
    );

    res.json({
      data: formattedWheels,
      cost: wheelCost,
      points: userPoints,
      timeUntilNextPlay: timeUntilNextPlay,
    });
  } catch (error) {
    console.error('Error in get:', error);
    res.status(401).json({ message: 'Internal server error' });
  }
};
exports.get = get;

const play = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const minigame = await models_1.MissionMiniGames.findOne().lean();
    if (!minigame) {
      return res.status(402).json({ message: 'Minigame configuration not found' });
    }
    const wheelCost = minigame.wheel_100_cost;
    const minigameId = minigame._id;

    const balance = await models_1.Balances.findOne({ userId }).lean();
    if (!balance) {
      return res.status(402).json({ message: 'User balance not found' });
    }
    if (balance.points < wheelCost) {
      return res.status(400).json({ message: 'Insufficient points to play wheel game' });
    }

    const lastPlay = await models_1.MissionMiniWheelHistories
      .findOne({ userId, minigameId })
      .sort({ createdAt: -1 })
      .lean();
    if (lastPlay) {
      const lastPlayTime = new Date(lastPlay.createdAt).getTime();
      const now = new Date().getTime();
      const nextDay = new Date(lastPlayTime);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(0, 0, 0, 0);
      const timeDiff = nextDay.getTime() - now;
      if (timeDiff > 0) {
        return res.status(402).json({ message: 'You can play again after 24 hours' });
      }
    }

    await models_1.Balances.findOneAndUpdate(
      { userId },
      { $inc: { points: -wheelCost } }
    );

    const wheels = await models_1.MissionMiniWheelTwo.find().lean();
    if (wheels.length !== 9) {
      return res.status(400).json({ message: `Exactly 9 wheel prize records are required, found ${wheels.length}` });
    }

    const totalProcent = wheels.reduce((sum, wheel) => sum + (wheel.procent || 0), 0);
    if (totalProcent > 100) {
      return res.status(400).json({ message: 'Total procent of wheel prizes exceeds 100%' });
    }

    const weightedWheels = [];
    for (const wheel of wheels) {
      const weight = Math.round(wheel.procent * 100);
      for (let i = 0; i < weight; i++) {
        weightedWheels.push(wheel);
      }
    }

    if (totalProcent < 100) {
      const remainingWeight = Math.round((100 - totalProcent) * 100);
      for (let i = 0; i < remainingWeight; i++) {
        weightedWheels.push(null);
      }
    }

    const randomIndex = Math.floor(Math.random() * weightedWheels.length);
    const selectedWheel = weightedWheels[randomIndex];

    let userPoints;

    if (!selectedWheel) {
      const updatedBalance = await models_1.Balances.findOne({ userId }).lean();
      userPoints = updatedBalance.points;
      const historyEntry = {
        userId,
        minigameId,
        type_pay: 'points',
        cost: wheelCost,
        payout: 0,
        vendors: [],
        games: [],
        game_code: '',
        status: 'paid',
        activate: true,
      };
      await models_1.MissionMiniWheelHistories.create(historyEntry);
      return res.json({
        result: 'lose',
        message: 'No prize won',
        data: { index: -1 },
        points: userPoints,
      });
    }

    let rewardDetails = {};
    const prizeIndex = wheels.findIndex((w) => w._id.toString() === selectedWheel._id.toString());

    const historyEntry = {
      userId,
      minigameId,
      type_pay: 'points',
      cost: wheelCost,
      payout: selectedWheel.reward,
      vendors: selectedWheel.vendors || [],
      games: [],
      game_code: '',
      status: 'paid',
      activate: true,
    };
    if (selectedWheel.type === 'free_spin') {
      historyEntry.activate = false;
    }
    const wheelHistory = await models_1.MissionMiniWheelHistories.create(historyEntry);

    if (selectedWheel.type === 'points') {
      await models_1.Balances.findOneAndUpdate(
        { userId },
        { $inc: { points: selectedWheel.reward } }
      );
      rewardDetails = { pointsAwarded: selectedWheel.reward };
    } else if (selectedWheel.type === 'bonus_balance') {
      let bonusAmount = selectedWheel.reward;
      const userBalance = await models_1.Balances.findOne({ userId }).populate('currency').lean();

      if (userBalance.currency.isFiat && userBalance.currency.symbol !== 'USD') {
        const rate = await fiatConverter_1.convertFiatCurrency('USD', userBalance.currency.symbol, 1);
        if (rate === 0) {
          return res.status(402).json({ message: 'Currency conversion failed' });
        }
        bonusAmount = selectedWheel.reward * rate;
      }

      bonusAmount = Number(bonusAmount.toFixed(2));

      await models_1.Balances.findOneAndUpdate(
        { userId },
        { $inc: { bonus: bonusAmount } }
      );
      rewardDetails = { bonusAwarded: Number(bonusAmount.toFixed(2)) };
    } else if (selectedWheel.type === 'free_spin') {
      rewardDetails = {
        freeSpins: selectedWheel.reward,
        historyId: wheelHistory._id.toString(),
        game_code: '',
      };
    }

    const updatedBalance = await models_1.Balances.findOne({ userId }).lean();
    userPoints = updatedBalance.points;

    const prizeData = {
      _id: selectedWheel._id.toString(),
      num: selectedWheel.num,
      title: selectedWheel.title,
      desc: selectedWheel.desc,
      type: selectedWheel.type,
      reward: Number(selectedWheel.reward.toFixed(2)),
      index: prizeIndex,
    };

    return res.json({
      result: 'win',
      message: `Won ${selectedWheel.type} prize`,
      data: prizeData,
      reward: rewardDetails,
      points: userPoints,
    });
  } catch (error) {
    console.error('Error in play:', error);
    res.status(402).json({ message: 'Internal server error' });
  }
};
exports.play = play;