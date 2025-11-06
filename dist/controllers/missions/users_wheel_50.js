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
const timelesstech_1 = require("../games/timelesstech");


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
    const wheelCost = minigame.wheel_50_cost;
    const minigameId = minigame._id;

    const balance = await models_1.Balances.findOne({ userId }).lean();
    if (!balance) {
      return res.status(404).json({ message: 'User balance not found' });
    }
    const userPoints = balance.points;
    const userCurrencySymbol = balance.currency.symbol;

    const wheels = await models_1.MissionMiniWheelOne.find().lean();
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
      console.log('Debug - nextPlayTime:', new Date(nextPlayTime).toISOString());
      const timeDiff = nextPlayTime - now;
      if (timeDiff > 0) {
        timeUntilNextPlay = timeDiff;
        console.log('Debug - timeUntilNextPlay:', timeDiff / 1000 / 60 / 60, 'hours');
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
    const wheelCost = minigame.wheel_50_cost;
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
      const nextPlayTime = lastPlayTime + 86_400_000;
      const timeDiff = nextPlayTime - now;
      if (timeDiff > 0) {
        return res.status(402).json({ message: 'You can play again after 24 hours' });
      }
    }

    await models_1.Balances.findOneAndUpdate(
      { userId },
      { $inc: { points: -wheelCost } }
    );

    const wheels = await models_1.MissionMiniWheelOne.find().lean();
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
        currencies: [],
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
      currencies: selectedWheel.type === 'free_spin' ? selectedWheel.currencies : [],
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


const get_histories_wheel = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const query = { userId: userId };

    const histories = await models_1.MissionMiniWheelHistories.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const total = await models_1.MissionMiniWheelHistories.countDocuments(query);

    return res.json({
      message: 'Histories retrieved successfully',
      data: histories,
      total,
    });
  } catch (error) {
    console.error('Error in get_histories_wheel:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.get_histories_wheel = get_histories_wheel;

const activate_bonus_wheel = async (req, res) => {
  try {
    const { userId, historyId, game_code } = req.body;

    if (!userId || !historyId) {
      return res.status(400).json({ message: 'userId and historyId are required' });
    }

    if (!game_code) {
      return res.status(400).json({ message: 'game_code is required for free spins activation' });
    }

    const user = req?.user;
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const history = await models_1.MissionMiniWheelHistories.findById(historyId)
      .populate({
        path: 'minigameId',
        select: 'name'
      })
      .lean();
    if (!history || history.userId.toString() !== userId) {
      return res.status(404).json({ message: 'History record not found or unauthorized' });
    }

    if (history.activate) {
      return res.status(400).json({ message: 'Bonus already activated' });
    }

    const selectedGame = history.currencies[0].games.find(g => g.game === game_code);
    if (!selectedGame) {
      return res.status(400).json({ message: 'Invalid game_code for this bonus' });
    }

    const free_spin = history.payout;
    const expire_date = new Date();
    expire_date.setDate(expire_date.getDate() + 7);
    const title = history.minigameId.name || 'Wheel Bonus';

    const balance = await models_1.Balances.findOne({ userId }).populate('currency');
    if (!balance) {
      return res.status(404).json({ message: 'User balance not found' });
    }

    let max_bet_free_spin = selectedGame.max_bet;

    const game = await models_1.GameLists.findOne({ game_code });
    if (!game) {
      return res.status(400).json({ message: 'Game not found' });
    }
    const game_name = game.game_name || 'Unknown Game';
    const provider_code = game.provider_code || 'casino';
    const formatted_game_name = game_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]+/g, '');

    await timelesstech_1.createCampaign(
      [game_code],
      String(userId),
      free_spin,
      expire_date,
      title,
      max_bet_free_spin
    );

    await models_1.MissionMiniWheelHistories.findByIdAndUpdate(historyId, {
      $set: { activate: true, game_code },
    });

    await models_1.Notification.create({
      title: 'New Bonus',
      description: `You activated your wheel bonus ${title}: ${game_name}, ${free_spin} spins - ${process.env.DOMAIN}/en/casino/casino/${provider_code}/${formatted_game_name}/${game_code}/play`,
      players: [String(userId)],
      country: ['all'],
      auto: true,
    });

    res.json({ message: 'Bonus activated successfully' });
  } catch (error) {
    console.error('Error in activate_bonus_wheel:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.activate_bonus_wheel = activate_bonus_wheel;

const get_games_by_wheel_history_id = async (req, res) => {
  try {
    const { wheelHistoryId, pageSize = 100, page = 1, search = '' } = req.body;

    if (!wheelHistoryId) {
      return res.status(400).json({ error: 'wheelHistoryId is required' });
    }

    const history = await models_1.MissionMiniWheelHistories.findById(wheelHistoryId);
    if (!history) {
      return res.status(404).json({ error: 'Wheel history not found' });
    }

    // Check if this history record has currencies (indicates it's a free_spin type)
    if (!history.currencies || history.currencies.length === 0) {
      return res.status(404).json({ error: 'This wheel history is not a free_spin type' });
    }

    let gameCodes = history.currencies.reduce((acc, curr) => {
      curr.games.forEach(g => acc.push(g.game));
      return acc;
    }, []);

    if (search.trim()) {
      gameCodes = gameCodes.filter(code => code.toLowerCase().includes(search.toLowerCase()));
    }

    const skip = (page - 1) * pageSize;
    const limit = pageSize;

    const games = await models_1.GameLists.find({
      game_code: { $in: gameCodes.slice(skip, skip + limit) },
      status: true,
      api_type: 'timelesstech'
    });

    const results = games.map(game => ({
      name: game.game_name || 'N/A',
      game_code: game.game_code || 'N/A',
    }));

    res.json(results);
  } catch (error) {
    console.error('[ERROR] Error in get_games_by_wheel_history_id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.get_games_by_wheel_history_id = get_games_by_wheel_history_id;