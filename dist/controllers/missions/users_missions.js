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
exports.getUserRank  = exports.getOneUserMission = exports.getUsersMissions = exports.triggerTesting = void 0;
// exports.getUsersMissions = exports.getOneUserMission = exports.checkMIssion = exports.claimMission
const models_1 = require("../../models");
const base_1 = require("../base");
const mongoose_1 = require("mongoose");
const { convertFiatCurrency } = require("../../utils/fiatConverter");


const getUserRank = async (req, res) => {
  try {
    const { userId } = req.body;
    console.log('Fetching rank for user ID:', userId);

    let user = await models_1.Users.findById(userId).lean();
    if (!user) {
      console.log('User not found for ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.level === undefined || user.level === null) {
      await models_1.Users.findByIdAndUpdate(
        userId,
        { $set: { level: 0 } },
        { new: true }
      );
      user = { ...user, level: 0 };
    }
    const level = user.level || 0;

    const levels = await models_1.MissionLevel.find().lean();
    const formattedLevels = levels.map(level => ({
      _id: level._id.toString(),
      name: level.name,
      num: level.num,
      min_points: level.min_points,
      banner_path: level.banner_path,
      have: level.num <= user.level,
    }));

    let balance = await models_1.Balances.findOne({ userId }).lean();

    if (balance.points === undefined || balance.points === null) {
      balance = await models_1.Balances.findOneAndUpdate(
        { userId },
        { $set: { points: 0 } },
        { new: true, lean: true }
      );
    }

    const points = balance?.points || 0;
    const nextLevel = levels.find(l => l.num === user.level + 1);
    const level_progress = nextLevel && nextLevel.min_points > 0
      ? Math.min((points / nextLevel.min_points) * 100, 100)
      : user.level === Math.max(...levels.map(l => l.num)) ? 100 : 0;

    const points_needed = nextLevel ? nextLevel.min_points : 0;

    const badges = await models_1.MissionBadge.find().lean();
    const formattedBadges = badges.map(badge => ({
      _id: badge._id.toString(),
      name: badge.name,
      banner_path: badge.banner_path,
      have: badge.players.includes(userId.toString()),
    }));

    const badges_count = formattedBadges.filter(b => b.have).length;

    const missions_completed_count = await models_1.MissionsHistories.countDocuments({
      userId,
      status: 'completed',
    });

    const all_missions_count = await models_1.Missions.countDocuments();

    const response = {
      level,
      levels: formattedLevels,
      level_progress,
      badges: formattedBadges,
      badges_count,
      points,
      missions_completed_count,
      all_missions_count,
      points_needed,
    };

    res.json({ data: response });
  } catch (error) {
    console.error('Error in getUserRank:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.getUserRank = getUserRank;



const getOneUserMission = async (req, res) => {
  try {
    const { userId, id } = req.body;
    const missionId = id;
    console.log(`Fetching mission ${missionId} for user ID: ${userId}`);

    if (!mongoose_1.Types.ObjectId.isValid(userId) || !mongoose_1.Types.ObjectId.isValid(missionId)) {
      console.log('Invalid userId or missionId:', { userId, missionId });
      return res.status(200).json({ message: 'Invalid userId or missionId' });
    }

    const history = await models_1.MissionsHistories.findOne({ userId, missionId }).lean();
    const historyData = history || { progress: 0, status: 'notcompleted' };

    const mission = await models_1.Missions.findById(missionId).lean();
    if (!mission) {
      console.log('Mission not found for ID:', missionId);
      return res.status(404).json({ message: 'Mission not found' });
    }

    // Determine URL based on mission type
    let url = '';
    switch (mission.type) {
      case 'sport':
        url = 'sports';
        break;
      case 'casino':
      case 'casino_daily':
      case 'wins':
        url = 'casino/casino/casino-slots';
        break;
      case 'live_casino':
      case 'live_casino_daily':
        url = 'casino/live-casino';
        break;
      case 'deposit':
        url = 'en/user/wallet';
        break;
      case 'login_daily':
        url = 'casino/signin';
        break;
      case 'others':
      case 'shop':
        url = '';
        break;
      default:
        url = '';
    }

    const response = {
      _id: mission._id.toString(),
      title: mission.title,
      description: mission.description,
      steps: mission.steps,
      banner_path: mission.banner_path,
      type: mission.type,
      num: mission.num,
      reward: mission.reward,
      min_level: mission.min_level,
      eligible_users: mission.eligible_users === 'ALL'
        ? 'ALL'
        : mission.eligible_users.map(id => id.toString()),
      createdAt: mission.createdAt,
      start_date: mission.start_date,
      expire_date: mission.expire_date,
      progress: historyData.progress,
      status: historyData.status,
      optIn: historyData? historyData.optIn: false,
      url, // Add the URL to the response
    };

    if (mission.count_bets > 0) response.count_bets = mission.count_bets;
    if (mission.min_bet > 0) response.min_bet = mission.min_bet;
    if (mission.min_stake > 0) response.min_stake = mission.min_stake;
    if (mission.min_odds > 0) response.min_odds = mission.min_odds;
    if (mission.min_deposit > 0) response.min_deposit = mission.min_deposit;
    if (mission.type_deposit) response.type_deposit = mission.type_deposit;
    if (mission.win > 0) response.win = mission.win;
    if (mission.type_win) response.type_win = mission.type_win;
    if (mission.games.length > 0) response.games = mission.games;
    if (mission.vendors.length > 0) response.vendors = mission.vendors;
    if (mission.originalgames.length > 0) response.originalgames = mission.originalgames;
    if (mission.missions.length > 0) response.missions = mission.missions.map(id => id.toString());
    if (mission.shops.length > 0) response.shops = mission.shops.map(id => id.toString());
    if (mission.count_shops > 0) response.count_shops = mission.count_shops;
    if (mission.count_others > 0) response.count_others = mission.count_others;
    if (mission.count_days > 0) response.count_days = mission.count_days;
    if (mission.count_login > 0) response.count_login = mission.count_login;
    if (mission.temp_mission) response.temp_mission = mission.temp_mission;
    if (mission.start_date) response.start_date = mission.start_date;
    if (mission.expire_date) response.expire_date = mission.expire_date;
    if (mission.private_mission) response.private_mission = mission.private_mission;

    res.json({ data: response });
  } catch (error) {
    console.error('Error in getOneUserMission:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getOneUserMission = getOneUserMission;


const optInMission = async (req, res) => {
  try {
    const { userId, id } = req.body;
    const missionId = id;

    if (!mongoose_1.Types.ObjectId.isValid(userId) || !mongoose_1.Types.ObjectId.isValid(missionId)) {
      return res.status(200).json({ message: 'Invalid userId or missionId' });
    }

    const history = await models_1.MissionsHistories.findOne({ userId, missionId });
    if (!history) {
      return res.status(404).json({ message: 'Mission history not found' });
    }

    if (history.optIn) {
      return res.status(200).json({ message: 'Mission already opted in' });
    }

    history.optIn = true;
    await history.save();

    return res.json({ message: 'Successfully opted in', optIn: true });
  } catch (error) {
    console.error('Error in optInMission:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.optInMission = optInMission;

const getUsersMissions = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
      return res.status(200).json({ message: 'Invalid userId' });
    }

    const missions = await models_1.Missions.find({
      status: true,
      $or: [
        { eligible_users: 'ALL' },
        { eligible_users: new mongoose_1.Types.ObjectId(userId) },
      ],
    }).lean();

    const missionIds = missions.map(m => m._id);
    const histories = await models_1.MissionsHistories.find({
      userId,
      missionId: { $in: missionIds },
    }).lean();

    const historyMap = new Map(histories.map(h => [h.missionId.toString(), h]));

    const formattedMissions = missions.map(mission => {
      const history = historyMap.get(mission._id.toString());
      return {
        _id: mission._id.toString(),
        title: mission.title,
        description: mission.description,
        banner_path: mission.banner_path,
        type: mission.type,
        min_level: mission.min_level,
        reward: mission.reward,
        eligible_users: mission.eligible_users === 'ALL'
          ? 'ALL'
          : mission.eligible_users.map(id => id.toString()),
        createdAt: mission.createdAt,
        start_date: mission.start_date,
        expire_date: mission.expire_date,
        progress: history ? history.progress : 0,
        status: history ? history.status : 'notcompleted',
        optIn: history? history.optIn: false,
      };
    });

    res.json({ data: formattedMissions });
  } catch (error) {
    console.error('Error in getUsersMissions:', error);
    res.status(402).json({ message: 'Internal server error' });
  }
};
exports.getUsersMissions = getUsersMissions;

// const triggerTesting = async () => {
//   try {
//     const userId = "677e741ea21fd4535a0a501f";
//     const missionId1 = "68274b8c8a5203215e6ac40e";
//     const missionId2 = "682b09a9527583463dd71a8e";
//     console.log('Running triggerTesting with user ID:', userId);

//     // Mock response object
//     const mockRes = {
//       statusCode: 200,
//       jsonData: null,
//       status(code) {
//         this.statusCode = code;
//         return this;
//       },
//       json(data) {
//         this.jsonData = data;
//         return this;
//       },
//     };

//     console.log('Testing getUserRank');
//     const rankReq = { body: { userId } };
//     await getUserRank(rankReq, mockRes);
//     console.log('getUserRank Result:');
//     console.log('Status Code:', mockRes.statusCode);
//     console.log('Response Data:', JSON.stringify(mockRes.jsonData, null, 2));
//     mockRes.statusCode = 200;
//     mockRes.jsonData = null;

//     console.log('Testing getOneUserMission with missionId:', missionId1);
//     const missionReq1 = { body: { userId, missionId: missionId1 } };
//     await getOneUserMission(missionReq1, mockRes);
//     console.log('getOneUserMission Result (missionId1):');
//     console.log('Status Code:', mockRes.statusCode);
//     console.log('Response Data:', JSON.stringify(mockRes.jsonData, null, 2));
//     mockRes.statusCode = 200;
//     mockRes.jsonData = null;

//     console.log('Testing getOneUserMission with missionId:', missionId2);
//     const missionReq2 = { body: { userId, missionId: missionId2 } };
//     await getOneUserMission(missionReq2, mockRes);
//     console.log('getOneUserMission Result (missionId2):');
//     console.log('Status Code:', mockRes.statusCode);
//     console.log('Response Data:', JSON.stringify(mockRes.jsonData, null, 2));
//     mockRes.statusCode = 200;
//     mockRes.jsonData = null;

//     console.log('Testing getUsersMissions');
//     const missionsReq = { body: { userId } };
//     await getUsersMissions(missionsReq, mockRes);
//     console.log('getUsersMissions Result:');
//     console.log('Status Code:', mockRes.statusCode);
//     console.log('Response Data:', JSON.stringify(mockRes.jsonData, null, 2));

//     return { statusCode: mockRes.statusCode, data: mockRes.jsonData };
//   } catch (error) {
//     console.error('Error in triggerTesting:', error);
//     throw error;
//   }
// };
// exports.triggerTesting = triggerTesting;

const checkMission = async (req, res) => {
  try {
    const { id, userId } = req.body;
    const missionId = id;

    // Validate inputs
    if (!mongoose_1.Types.ObjectId.isValid(missionId) || !mongoose_1.Types.ObjectId.isValid(userId)) {
      return res.status(200).json({ message: 'Invalid missionId or userId' });
    }

    // Fetch mission
    const mission = await models_1.Missions.findById(missionId).lean();
    if (!mission) {
      return res.status(404).json({ message: 'Mission not found' });
    }

    // Check temporary mission dates
    if (mission.temp_mission) {
      const now = moment();
      const startDate = mission.start_date ? moment(mission.start_date) : null;
      const expireDate = mission.expire_date ? moment(mission.expire_date) : null;

      if (startDate && now.isBefore(startDate)) {
        return res.status(403).json({ message: 'Mission has not started yet' });
      }
      if (expireDate && now.isAfter(expireDate)) {
        return res.status(403).json({ message: 'Mission has expired' });
      }
    }

    const user = await models_1.Users.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }


    const balance = await models_1.Balances.findOne({ userId, status: true }).populate('currency').lean();
    if (!balance || !balance.currency) {
      return res.status(404).json({ message: 'Balance or currency not found' });
    }

    if (mission.eligible_users !== 'ALL' && !mission.eligible_users.some(id => id.toString() === userId)) {
      return res.status(403).json({ message: 'User not eligible for this mission' });
    }

    if (mission.min_level > (user.level || 0)) {
      return res.status(403).json({ message: 'User level too low for this mission' });
    }

    // Dispatch to type-specific check
    let checkResult;
    switch (mission.type) {
      case 'others':
        checkResult = await checkOthersMission(mission, userId);
        break;
      case 'sport':
        checkResult = await checkSportMission(mission, userId, balance);
        break;
      case 'casino':
        checkResult = await checkCasinoMission(mission, userId, balance);
        break;
      case 'live_casino':
        checkResult = await checkCasinoMission(mission, userId, balance);
        break;
      case 'casino_provider':
        checkResult = await checkCasinoProviderMission(mission, userId, balance);
        break;
      case 'casino_daily':
        checkResult = await checkCasinoDailyMission(mission, userId);
        break;
      case 'live_casino_daily':
        checkResult = await checkCasinoDailyMission(mission, userId);
        break;
      case 'wins':
        checkResult = await checkWinsMission(mission, userId, balance);
        break;
      case 'deposit':
        checkResult = await checkDepositMission(mission, userId, balance);
        break;
      case 'login_daily':
        checkResult = await checkLoginDailyMission(mission, userId);
        break;
      case 'shop':
        checkResult = await checkShopMission(mission, userId);
        break;
      default:
        return res.status(200).json({ message: 'Unsupported mission type' });
    }

    const { progress, status } = await calculateProgress(mission, userId, checkResult);

    const history = await models_1.MissionsHistories.findOne({ missionId, userId }).lean();
    const historyData = history || { progress: 0, status: 'notcompleted' };

    const response = {
      _id: mission._id.toString(),
      title: mission.title,
      description: mission.description,
      steps: mission.steps,
      banner_path: mission.banner_path,
      type: mission.type,
      num: mission.num,
      reward: mission.reward,
      min_level: mission.min_level,
      eligible_users: mission.eligible_users === 'ALL' ? 'ALL' : mission.eligible_users.map(id => id.toString()),
      progress: historyData.progress,
      status: historyData.status,
    };

    if (mission.count_bets > 0) response.count_bets = mission.count_bets;
    if (mission.min_bet > 0) response.min_bet = mission.min_bet;
    if (mission.min_stake > 0) response.min_stake = mission.min_stake;
    if (mission.min_odds > 0) response.min_odds = mission.min_odds;
    if (mission.min_deposit > 0) response.min_deposit = mission.min_deposit;
    if (mission.type_deposit) response.type_deposit = mission.type_deposit;
    if (mission.win > 0) response.win = mission.win;
    if (mission.type_win) response.type_win = mission.type_win;
    if (mission.games.length > 0) response.games = mission.games;
    if (mission.vendors.length > 0) response.vendors = mission.vendors;
    if (mission.originalgames.length > 0) response.originalgames = mission.originalgames;
    if (mission.missions.length > 0) response.missions = mission.missions.map(id => id.toString());
    if (mission.shops.length > 0) response.shops = mission.shops.map(id => id.toString());
    if (mission.count_shops > 0) response.count_shops = mission.count_shops;
    if (mission.count_others > 0) response.count_others = mission.count_others;
    if (mission.count_days > 0) response.count_days = mission.count_days;
    if (mission.count_login > 0) response.count_login = mission.count_login;
    if (mission.temp_mission) response.temp_mission = mission.temp_mission;
    if (mission.start_date) response.start_date = mission.start_date;
    if (mission.expire_date) response.expire_date = mission.expire_date;
    if (mission.private_mission) response.private_mission = mission.private_mission;

    res.json({ data: response });
  } catch (error) {
    console.error('Error in checkMission:', error);
    res.status(402).json({ message: 'Internal server error' });
  }
};
exports.checkMission = checkMission;

const checkOthersMission = async (mission, userId) => {
  const { missions, count_others } = mission;

  if (!missions.length || count_others <= 0) {
    return { completedCount: 0, requiredCount: count_others || missions.length };
  }

  const histories = await models_1.MissionsHistories.find({
    userId,
    missionId: { $in: missions },
    status: 'completed',
  }).lean();

  const completedCount = histories.length;
  return { completedCount, requiredCount: count_others };
};

const checkSportMission = async (mission, userId, balance) => {
  const { count_bets, min_stake, min_odds, leagueId, matchId } = mission;

  if (!count_bets || count_bets <= 0 || !min_stake || min_stake <= 0 || !min_odds || min_odds <= 0) {
    return { validBets: 0, requiredBets: count_bets || 1 };
  }

  const currency = balance.currency;
  let minStakeInUSD = min_stake;

  if (currency.isFiat && currency.symbol !== 'USD') {
    const rate = await convertFiatCurrency(currency.symbol, 'USD', 1);
    if (rate === 0) {
      console.error(`Failed to convert ${currency.symbol} to USD for mission ${mission._id}`);
      return { validBets: 0, requiredBets: count_bets };
    }
    minStakeInUSD = min_stake / rate;
  }

  const bets = await models_1.SportsBets.find({
    userId,
    odds: { $gte: min_odds },
    stake: { $gte: minStakeInUSD },
    isFreeBet: false,
  }).lean();

  let validBets = 0;

  if (leagueId || matchId) {
    for (const bet of bets) {
      const bettingDetails = await models_1.SportsBetting.findOne({
        betId: bet._id,
        ...(leagueId && { LeagueId: leagueId }),
        ...(matchId && { eventId: matchId }), 
      }).lean();

      if (bettingDetails) {
        validBets++;
      }
    }
  } else {
    validBets = bets.length;
  }

  return {
    validBets,
    requiredBets: count_bets,
  };
};

const checkCasinoMission = async (mission, userId, balance) => {
  const { count_bets, min_bet, games } = mission;

  if (count_bets <= 0 || min_bet <= 0) {
    return { validBets: 0, totalBetAmount: 0, requiredBets: count_bets, requiredBetAmount: min_bet };
  }

  const currency = balance.currency;
  let minBetInUSD = min_bet;
  if (currency.isFiat && currency.symbol !== 'USD') {
    const rate = await convertFiatCurrency(currency.symbol, 'USD', 1);
    if (rate === 0) {
      console.error(`Failed to convert ${currency.symbol} to USD for mission ${mission._id}`);
      return { validBets: 0, totalBetAmount: 0, requiredBets: count_bets, requiredBetAmount: min_bet };
    }
    minBetInUSD = min_bet / rate;
  }

  const query = {
    userId,
    txn_type: 'BET',
    isBonusPlay: false,
    ...(games.length > 0 && { game_code: { $in: games } }),
  };
  const bets = await models_1.GameHistories.find(query).lean();

  let validBets = 0;
  let totalBetAmount = 0;
  for (const bet of bets) {
    let betAmount = bet.bet_money || 0;
    if (currency.isFiat && currency.symbol !== 'USD') {
      const rate = await convertFiatCurrency(currency.symbol, 'USD', 1);
      if (rate === 0) continue;
      betAmount = betAmount * rate;
    }
    if (betAmount >= minBetInUSD) {
      validBets++;
      totalBetAmount += betAmount;
    }
  }

  return { validBets, totalBetAmount, requiredBets: count_bets, requiredBetAmount: min_bet * count_bets };
};

const checkCasinoProviderMission = async (mission, userId, balance) => {
  const { count_bets, min_bet, vendors } = mission;

  if (count_bets <= 0 || min_bet <= 0 || !vendors.length) {
    return { validBets: 0, totalBetAmount: 0, requiredBets: count_bets, requiredBetAmount: min_bet };
  }

  const games = await models_1.GameLists.find({
    'details.vendor': { $in: vendors },
    status: true,
  }).lean();
  const gameCodes = games.map(game => game.game_code);

  const currency = balance.currency;
  let minBetInUSD = min_bet;
  if (currency.isFiat && currency.symbol !== 'USD') {
    const rate = await convertFiatCurrency(currency.symbol, 'USD', 1);
    if (rate === 0) {
      console.error(`Failed to convert ${currency.symbol} to USD for mission ${mission._id}`);
      return { validBets: 0, totalBetAmount: 0, requiredBets: count_bets, requiredBetAmount: min_bet };
    }
    minBetInUSD = min_bet / rate;
  }

  const query = {
    userId,
    txn_type: 'BET',
    isBonusPlay: false,
    game_code: { $in: gameCodes },
  };
  const bets = await models_1.GameHistories.find(query).lean();

  let validBets = 0;
  let totalBetAmount = 0;
  for (const bet of bets) {
    let betAmount = bet.bet_money || 0;
    if (currency.isFiat && currency.symbol !== 'USD') {
      const rate = await convertFiatCurrency(currency.symbol, 'USD', 1);
      if (rate === 0) continue;
      betAmount = betAmount * rate;
    }
    if (betAmount >= minBetInUSD) {
      validBets++;
      totalBetAmount += betAmount;
    }
  }

  return { validBets, totalBetAmount, requiredBets: count_bets, requiredBetAmount: min_bet * count_bets };
};

const checkCasinoDailyMission = async (mission, userId) => {
  const { count_days, count_bets } = mission;

  if (count_days <= 0 || count_bets <= 0) {
    return { validDays: 0, requiredDays: count_days };
  }

  const bets = await models_1.GameHistories.find({
    userId,
    txn_type: 'BET',
    isBonusPlay: false,
  }).lean();

  const betsByDay = {};
  for (const bet of bets) {
    const day = moment(bet.createdAt).startOf('day').toISOString();
    if (!betsByDay[day]) betsByDay[day] = 0;
    betsByDay[day]++;
  }

  let validDays = 0;
  for (const day in betsByDay) {
    if (betsByDay[day] >= 1) validDays++;
  }

  return { validDays, requiredDays: count_days };
};



const checkWinsMission = async (mission, userId, balance) => {
  const { win, games, min_deposit, type_deposit } = mission;

  if (win <= 0) {
    return { totalWin: 0, requiredWin: win, depositMet: false };
  }

  const currency = balance.currency;
  let winInUSD = win;
  if (currency.isFiat && currency.symbol !== 'USD') {
    const rate = await convertFiatCurrency(currency.symbol, 'USD', 1);
    if (rate === 0) {
      console.error(`Failed to convert ${currency.symbol} to USD for mission ${mission._id}`);
      return { totalWin: 0, requiredWin: win, depositMet: false };
    }
    winInUSD = win / rate;
  }

  let depositMet = true;
  if (min_deposit > 0) {
    let requiredDeposit = min_deposit;
    if (type_deposit === 'percentage') {
      requiredDeposit = (win * min_deposit) / 100;
    }

    const deposits = await models_1.Payments.find({
      userId,
      ipn_type: 'deposit',
      status_text: { $in: ['approved', 'confirmed'] },
    }).lean();

    let totalDeposited = 0;
    for (const deposit of deposits) {
      let amount = deposit.actually_paid || deposit.amount || 0;
      if (currency.isFiat && currency.symbol !== 'USD') {
        const rate = await convertFiatCurrency(currency.symbol, 'USD', 1);
        if (rate === 0) continue;
        amount = amount * rate;
      }
      totalDeposited += amount;
    }

    depositMet = totalDeposited >= requiredDeposit;
  }

  const query = {
    userId,
    txn_type: 'WIN',
    isBonusPlay: false,
    ...(games.length > 0 && { game_code: { $in: games } }),
  };
  const wins = await models_1.GameHistories.find(query).lean();

  let totalWin = 0;
  for (const winEntry of wins) {
    let winAmount = winEntry.win_money || 0;
    if (currency.isFiat && currency.symbol !== 'USD') {
      const rate = await convertFiatCurrency(currency.symbol, 'USD', 1);
      if (rate === 0) continue;
      winAmount = winAmount * rate;
    }
    totalWin += winAmount;
  }

  return { totalWin, requiredWin: win, depositMet };
};

const checkDepositMission = async (mission, userId, balance) => {
  const { min_deposit } = mission;

  if (min_deposit <= 0) {
    return { totalDeposited: 0, requiredDeposit: min_deposit };
  }

  const currency = balance.currency;
  let requiredDeposit = min_deposit;
  if (currency.isFiat && currency.symbol !== 'USD') {
    const rate = await convertFiatCurrency(currency.symbol, 'USD', 1);
    if (rate === 0) {
      console.error(`Failed to convert ${currency.symbol} to USD for mission ${mission._id}`);
      return { totalDeposited: 0, requiredDeposit: min_deposit };
    }
    requiredDeposit = min_deposit / rate;
  }

  const deposits = await models_1.Payments.find({
    userId,
    ipn_type: 'deposit',
    status_text: { $in: ['approved', 'confirmed'] },
  }).lean();

  let totalDeposited = 0;
  for (const deposit of deposits) {
    let amount = deposit.actually_paid || deposit.amount || 0;
    if (currency.isFiat && currency.symbol !== 'USD') {
      const rate = await convertFiatCurrency(currency.symbol, 'USD', 1);
      if (rate === 0) continue;
      amount = amount * rate;
    }
    totalDeposited += amount;
  }

  return { totalDeposited, requiredDeposit: min_deposit };
};

const checkLoginDailyMission = async (mission, userId) => {
  const { count_days, count_login } = mission;

  if (count_days <= 0 || count_login <= 0) {
    return { validDays: 0, requiredDays: count_days };
  }

  const logins = await models_1.LoginHistories.find({ userId }).lean();

  const loginsByDay = {};
  for (const login of logins) {
    const day = moment(login.createdAt).startOf('day').toISOString();
    if (!loginsByDay[day]) loginsByDay[day] = 0;
    loginsByDay[day]++;
  }

  let validDays = 0;
  for (const day in loginsByDay) {
    if (loginsByDay[day] >= 1) validDays++;
  }

  return { validDays, requiredDays: count_days };
};

const checkShopMission = async (mission, userId) => {
  const { shops, count_shops } = mission;

  if (!shops.length || count_shops <= 0) {
    return { completedPurchases: 0, requiredPurchases: count_shops || shops.length };
  }

  const purchases = await models_1.ShopsHistories.find({
    userId,
    shopId: { $in: shops },
    status: 'paid',
  }).lean();

  const completedPurchases = purchases.length;
  return { completedPurchases, requiredPurchases: count_shops };
};


const calculateProgress = async (mission, userId, checkResult) => {
  const { type, reward } = mission;

  let progress = 0;
  let status = 'notcompleted';

  let validBets, requiredBets;

  switch (type) {
    case 'others':
      const { completedCount, requiredCount } = checkResult;
      progress = Math.min((completedCount / requiredCount) * 100, 100);
      if (progress === 100) status = 'claimable';
      break;
    case 'sport':
      ({ validBets, requiredBets } = checkResult);
      progress = Math.min((validBets / requiredBets) * 100, 100);
      if (progress === 100) status = 'claimable';
      break;
    case 'casino':
    case 'live_casino':
    case 'casino_provider':
      ({ validBets, requiredBets } = checkResult);
      progress = Math.min((validBets / requiredBets) * 100, 100);
      if (progress === 100) status = 'completed'; 
      break;
    case 'casino_daily':
    case 'live_casino_daily':
      const { validDays, requiredDays } = checkResult;
      progress = Math.min((validDays / requiredDays) * 100, 100);
      if (progress === 100) status = 'claimable';
      break;
    case 'wins':
      const { totalWin, requiredWin, depositMet } = checkResult;
      progress = depositMet ? Math.min((totalWin / requiredWin) * 100, 100) : 0;
      if (progress === 100 && depositMet) status = 'claimable';
      break;
    case 'deposit':
      const { totalDeposited, requiredDeposit } = checkResult;
      progress = Math.min((totalDeposited / requiredDeposit) * 100, 100);
      if (progress === 100) status = 'claimable';
      break;
    case 'login_daily':
      const { validDays: loginDays, requiredDays: loginRequired } = checkResult;
      progress = Math.min((loginDays / loginRequired) * 100, 100);
      if (progress === 100) status = 'claimable';
      break;
    case 'shop':
      const { completedPurchases, requiredPurchases } = checkResult;
      progress = Math.min((completedPurchases / requiredPurchases) * 100, 100);
      if (progress === 100) status = 'claimable';
      break;
  }


  const history = await models_1.MissionsHistories.findOneAndUpdate(
    { missionId: mission._id, userId },
    {
      $set: {
        reward,
        progress,
        status,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { progress, status };
};


const claimMission = async (req, res) => {
  try {
    const { id, userId } = req.body;
    const missionId = id;

    if (!mongoose_1.Types.ObjectId.isValid(missionId) || !mongoose_1.Types.ObjectId.isValid(userId)) {
      return res.status(200).json({ message: 'Invalid missionId or userId' });
    }

    const history = await models_1.MissionsHistories.findOne({ missionId, userId }).lean();
    if (!history) {
      return res.status(404).json({ message: 'Mission history not found' });
    }

    if (history.progress !== 100 || history.status !== 'claimable') {
      return res.status(403).json({ message: 'Mission not claimable' });
    }

    const user = await models_1.Users.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const balance = await models_1.Balances.findOne({ userId, status: true });
    if (!balance) {
      return res.status(404).json({ message: 'Balance not found' });
    }

    const rewardPoints = history.reward;
    const newPoints = (balance.points || 0) + rewardPoints;
    await models_1.Balances.updateOne(
      { userId, status: true },
      { $set: { points: newPoints } }
    );

    const levels = await models_1.MissionLevel.find({ status: true }).sort({ num: 1 }).lean();
    let newLevel = user.level || 0;
    for (const level of levels) {
      if (newPoints >= level.min_points && level.num > newLevel) {
        newLevel = level.num;
      }
    }
    if (newLevel > (user.level || 0)) {
      await models_1.Users.updateOne(
        { _id: userId },
        { $set: { level: newLevel } }
      );
    }

    const badges = await models_1.MissionBadge.find({ status: true }).lean();
    const badgeUpdates = badges
      .filter(badge => {
        const levelForBadge = levels.find(level => level.num === badge.min_level);
        const pointsRequired = levelForBadge ? levelForBadge.min_points : 0;
        return (
          newLevel >= badge.min_level &&
          newPoints >= pointsRequired &&
          !badge.players.includes(userId.toString())
        );
      })
      .map(badge => ({
        updateOne: {
          filter: { _id: badge._id },
          update: { $addToSet: { players: userId.toString() } },
        },
      }));

    if (badgeUpdates.length > 0) {
      await models_1.MissionBadge.bulkWrite(badgeUpdates);
    }

    await models_1.MissionsHistories.updateOne(
      { missionId, userId },
      { $set: { status: 'completed' } }
    );

    const updatedHistory = await models_1.MissionsHistories.findOne({ missionId, userId }).lean();
    const updatedUser = await models_1.Users.findById(userId).lean();
    const updatedBalance = await models_1.Balances.findOne({ userId, status: true }).lean();
    const updatedBadges = await models_1.MissionBadge.find({ players: userId.toString(), status: true }).lean();

    const response = {
      missionId: missionId.toString(),
      userId: userId.toString(),
      status: updatedHistory?.status || 'completed',
      points: updatedBalance?.points || newPoints,
      level: updatedUser?.level || newLevel,
      badges: updatedBadges.map(badge => ({
        _id: badge._id.toString(),
        name: badge.name,
        min_level: badge.min_level,
        banner_path: badge.banner_path,
      })),
    };

    res.json({ data: response });
  } catch (error) {
    console.error('Error in claimMission:', error);
    res.status(402).json({ message: 'Internal server error' });
  }
};
exports.claimMission = claimMission;