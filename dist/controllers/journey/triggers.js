"use strict";

const { redisClient } = require("../../utils/redis");
const models_1 = require("../../models");
const mongoose_1 = require("mongoose");
const crypto = require('crypto');
const { chunk } = require("lodash");

const CACHE_TTL = 300;
const BATCH_SIZE = 1000;

function mapDevice(device) {
  if (/mobile|android|iphone/i.test(device)) return 'Mobile';
  if (/windows|mac|linux/i.test(device)) return 'Desktop';
  return 'Unknown';
}

const triggersCheck = async (segmentUsers, entryTrigger, campaignId, startDate, endDate) => {
  if (!segmentUsers.length) return [];

  const triggerOptions = [
    "sport_bet", "league_bet", "match_bet", "games", "provider", "registration_date", "odds",
    "Casino_Bet", "Deposit_attempt", "Deposit_approved", "Deposit_Disproved", "Deposit_Canceled",
    "Deposit_Comparator", "Live_Casino_Gaming_bet", "Withdraw_attempt", "Withdraw_approved",
    "Withdraw_Disproved", "Withdraw_Comparator", "Last_login", "Login_sum_total", "device_used",
    "Logout", "Login_Specific_IP", "Limit_set", "Self_exclusion", "Update_User_Balance",
    "Balance", "Bonus_balance", "Bonus_get", "Game_Session_Start", "Game_Session_End",
    "Game_Type", "Minimum_Bet_Amount", "Admin_Only_Events", "Push_Notifications",
    "Email_Notifications", "SMS_Notifications", "Geolocation", "Localization", "User_Tier",
    "Award_Bonus", "VIP_points", "time_spend", "visite_page", "bet_lose", "bet_win",
    "net_lose", "deposit", "login",
  ];

  if (!triggerOptions.includes(entryTrigger)) return [];

  const isWaitForEvent = !!startDate && !!endDate;
  if (isWaitForEvent) {
    startDate = new Date(startDate);
    endDate = new Date(endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error(`Invalid dates for trigger ${entryTrigger}: startDate=${startDate}, endDate=${endDate}`);
      return [];
    }
  }

  const userIds = segmentUsers
    .map((u) => {
      if (mongoose_1.isValidObjectId(u._id)) {
        return u._id.toString();
      }
      console.warn(`Invalid ObjectId for user: ${JSON.stringify(u._id)}`);
      return null;
    })
    .filter((id) => id !== null);

  if (!userIds.length) {
    console.error(`No valid user IDs after normalization for trigger ${entryTrigger}`);
    return [];
  }

  const userIdsSorted = [...userIds].sort();
  const userIdsHash = crypto.createHash('md5').update(userIdsSorted.join(',')).digest('hex');

  let players = [];

  const checkCache = async (cacheKey) => {
    try {
      const cached = await redisClient.sMembers(cacheKey);
      if (cached.length) {
        console.log(`Cache hit for key: ${cacheKey}`);
        return cached;
      }
      console.log(`Cache miss for key: ${cacheKey}`);
      return null;
    } catch (error) {
      console.error(`Error checking cache for key ${cacheKey}:`, error);
      return null;
    }
  };

  const queryAndCacheAggregate = async (cacheKey, model, matchQuery, groupQuery = { _id: "$userId" }, projectQuery = { _id: 1 }) => {
    const cached = await checkCache(cacheKey);
    if (cached) return cached;

    const aggregatePipeline = [
      { $match: matchQuery },
      { $group: groupQuery },
      { $project: projectQuery }
    ];

    const data = await model.aggregate(aggregatePipeline).catch(error => {
      console.error(`Aggregate error for ${model.modelName}:`, error);
      return [];
    });
    const resultUserIds = data.map((d) => d._id.toString());

    if (resultUserIds.length) {
      await redisClient.sAdd(cacheKey, resultUserIds);
      await redisClient.expire(cacheKey, CACHE_TTL);
      console.log(`Cached ${resultUserIds.length} user IDs for key: ${cacheKey}`);
    }
    return resultUserIds;
  };

  const handlers = {
    sportsBets: async (trigger, batchIds) => {
      const status = trigger === "bet_win" ? "WIN" : trigger === "bet_lose" ? "LOST" : null;
      const cacheKey = `sports_bets:${trigger}:${campaignId}:${userIdsHash}:${isWaitForEvent ? `${startDate.toISOString()}_${endDate.toISOString()}` : "all"}`;
      const matchQuery = {
        userId: { $in: batchIds.map((id) => new mongoose_1.Types.ObjectId(id)) },
        ...(status && { status }),
        ...(isWaitForEvent && { createdAt: { $gte: startDate, $lte: endDate } }),
      };
      console.log(`SportsBets query: ${JSON.stringify(matchQuery)}`);
      const matchedUserIds = await queryAndCacheAggregate(cacheKey, models_1.SportsBets, matchQuery);
      console.log(`Matched user IDs for ${trigger}: ${JSON.stringify(matchedUserIds)}`);
      return segmentUsers.filter((user) => matchedUserIds.includes(user._id.toString()));
    },

    gameHistories: async (trigger, batchIds) => {
      const cacheKey = `game_histories:${trigger}:${campaignId}:${userIdsHash}:${isWaitForEvent ? `${startDate.toISOString()}_${endDate.toISOString()}` : "all"}`;
      const matchQuery = {
        userId: { $in: batchIds.map((id) => new mongoose_1.Types.ObjectId(id)) },
        isBonusPlay: false,
        ...(trigger === "Casino_Bet" && { bet_money: { $exists: true, $ne: null } }),
        ...(trigger === "Live_Casino_Gaming_bet" && {
          provider_code: {
            $in: (await models_1.GameProviders.find({ type: "live", status: true }).select('code').lean()).map((p) => p.code),
          },
          bet_money: { $exists: true, $ne: null, $ne: 0 },
        }),
        ...(isWaitForEvent && { createdAt: { $gte: startDate, $lte: endDate } }),
      };
      const matchedUserIds = await queryAndCacheAggregate(cacheKey, models_1.GameHistories, matchQuery);
      return segmentUsers.filter((user) => matchedUserIds.includes(user._id.toString()));
    },

    deposits: async (trigger, batchIds) => {
      const statusMap = {
        Deposit_approved: ["confirmed", "deposited"],
        Deposit_Disproved: ["disapproved"],
        Deposit_Canceled: ["canceled"],
      };
      const cacheKey = `deposits:${trigger}:${campaignId}:${userIdsHash}:${isWaitForEvent ? `${startDate.toISOString()}_${endDate.toISOString()}` : "all"}`;
      const matchQuery = {
        userId: { $in: batchIds.map((id) => new mongoose_1.Types.ObjectId(id)) },
        ipn_type: "deposit",
        ...(statusMap[trigger] && { status_text: { $in: statusMap[trigger] } }),
        ...(trigger === "Deposit_Comparator" && { amount: { $exists: true } }),
        ...(isWaitForEvent && { createdAt: { $gte: startDate, $lte: endDate } }),
      };
      const matchedUserIds = await queryAndCacheAggregate(cacheKey, models_1.Payments, matchQuery);
      return segmentUsers.filter((user) => matchedUserIds.includes(user._id.toString()));
    },

    withdrawals: async (trigger, batchIds) => {
      const statusMap = {
        Withdraw_approved: ["confirmed", "deposited"],
        Withdraw_Disproved: ["canceled", "disapproved"],
        Withdraw_attempt: { $nin: ["confirmed", "deposited", "canceled", "disapproved"] },
      };
      const cacheKey = `withdrawals:${trigger}:${campaignId}:${userIdsHash}:${isWaitForEvent ? `${startDate.toISOString()}_${endDate.toISOString()}` : "all"}`;
      const matchQuery = {
        userId: { $in: batchIds.map((id) => new mongoose_1.Types.ObjectId(id)) },
        ipn_type: "withdrawal",
        ...(statusMap[trigger] && { status_text: { $in: statusMap[trigger] } }),
        ...(trigger === "Withdraw_Comparator" && { amount: { $exists: true } }),
        ...(isWaitForEvent && { createdAt: { $gte: startDate, $lte: endDate } }),
      };
      const matchedUserIds = await queryAndCacheAggregate(cacheKey, models_1.Payments, matchQuery);
      return segmentUsers.filter((user) => matchedUserIds.includes(user._id.toString()));
    },

    login: async (trigger, batchIds) => {
      const cacheKey = `login:${trigger}:${campaignId}:${userIdsHash}:${isWaitForEvent ? `${startDate.toISOString()}_${endDate.toISOString()}` : "all"}`;
      const matchQuery = {
        userId: { $in: batchIds.map((id) => new mongoose_1.Types.ObjectId(id)) },
        ...(trigger === "Login_Specific_IP" && { ip: { $exists: true, $ne: "" } }),
        ...(trigger === "device_used" && { device: { $exists: true, $ne: "" } }),
        ...(isWaitForEvent && { createdAt: { $gte: startDate, $lte: endDate } }),
      };
      const matchedUserIds = await queryAndCacheAggregate(cacheKey, models_1.LoginHistories, matchQuery);
      if (trigger === "device_used") {
        const deviceAgg = await models_1.LoginHistories.aggregate([
          { $match: matchQuery },
          { $group: { _id: "$userId", device: { $first: "$device" } } }
        ]).catch(error => {
          console.error(`Aggregate error for LoginHistories:`, error);
          return [];
        });
        const filteredIds = deviceAgg
          .filter((entry) => mapDevice(entry.device) !== "Unknown")
          .map((entry) => entry._id.toString());
        return segmentUsers.filter((user) => batchIds.includes(user._id.toString()) && filteredIds.includes(user._id.toString()));
      }
      return segmentUsers.filter((user) => batchIds.includes(user._id.toString()) && matchedUserIds.includes(user._id.toString()));
    },

    logout: async (trigger, batchIds) => {
      const cacheKey = `logout:${campaignId}:${userIdsHash}:${isWaitForEvent ? `${startDate.toISOString()}_${endDate.toISOString()}` : "all"}`;
      const matchQuery = {
        userId: { $in: batchIds.map((id) => new mongoose_1.Types.ObjectId(id)) },
        ...(isWaitForEvent && { createdAt: { $gte: startDate, $lte: endDate } }),
      };
      const matchedUserIds = await queryAndCacheAggregate(cacheKey, models_1.LogoutHistories, matchQuery);
      return segmentUsers.filter((user) => batchIds.includes(user._id.toString()) && matchedUserIds.includes(user._id.toString()));
    },

    userAttributes: async (trigger, batchIds) => {
      const cacheKey = `users:${trigger}:${campaignId}:${userIdsHash}:${isWaitForEvent ? `${startDate.toISOString()}_${endDate.toISOString()}` : "all"}`;
      const matchQuery = {
        _id: { $in: batchIds.map((id) => new mongoose_1.Types.ObjectId(id)) },
        ...(isWaitForEvent && { createdAt: { $gte: startDate, $lte: endDate } }),
      };
      const aggPipeline = [
        { $match: matchQuery },
        { $project: { _id: 1, status: 1, betlimit: 1, country: 1, timeSpent: 1, LastOpenPage: 1 } }
      ];
      const usersData = await models_1.Users.aggregate(aggPipeline).catch(error => {
        console.error(`Aggregate error for Users:`, error);
        return [];
      });
      const filteredIds = usersData.filter((user) => {
        if (trigger === "Self_exclusion") return user.status !== undefined;
        if (trigger === "Limit_set") return user.betlimit > 0;
        if (trigger === "Geolocation" || trigger === "Localization") return user.country?.trim();
        if (trigger === "time_spend") return user.timeSpent > 1;
        if (trigger === "visite_page") return !!user.LastOpenPage;
        return true;
      }).map((user) => user._id.toString());

      if (filteredIds.length) {
        await redisClient.sAdd(cacheKey, filteredIds);
        await redisClient.expire(cacheKey, CACHE_TTL);
        console.log(`Cached ${filteredIds.length} user IDs for key: ${cacheKey}`);
      }
      return segmentUsers.filter((user) => batchIds.includes(user._id.toString()) && filteredIds.includes(user._id.toString()));
    },

    registration: async (trigger, batchIds) => {
      return segmentUsers.filter((user) => {
        const inBatch = batchIds.includes(user._id.toString());
        if (!inBatch) return false;
        const regDateRaw = user.createdAt?.$date || user.createdAt;
        const regDate = new Date(regDateRaw);
        if (isNaN(regDate.getTime())) return false;
        return isWaitForEvent ? regDate >= startDate && regDate <= endDate : true;
      });
    },

    balances: async (trigger, batchIds) => {
      const cacheKey = `balances:${trigger}:${campaignId}:${userIdsHash}:${isWaitForEvent ? `${startDate.toISOString()}_${endDate.toISOString()}` : "all"}`;
      const matchQuery = {
        userId: { $in: batchIds.map((id) => new mongoose_1.Types.ObjectId(id)) },
        status: true,
        ...(isWaitForEvent && { createdAt: { $gte: startDate, $lte: endDate } }),
      };
      const aggPipeline = [
        { $match: matchQuery },
        { $project: { _id: "$userId", balance: 1, bonus: 1 } }
      ];
      const balancesData = await models_1.Balances.aggregate(aggPipeline).catch(error => {
        console.error(`Aggregate error for Balances:`, error);
        return [];
      });
      const filteredIds = balancesData.filter((balance) => {
        if (trigger === "Balance") return balance.balance > 0;
        if (trigger === "Bonus_balance" || trigger === "Bonus_get" || trigger === "Award_Bonus") return balance.bonus > 0;
        return true;
      }).map((balance) => balance._id.toString());

      if (filteredIds.length) {
        await redisClient.sAdd(cacheKey, filteredIds);
        await redisClient.expire(cacheKey, CACHE_TTL);
      }
      return segmentUsers.filter((user) => batchIds.includes(user._id.toString()) && filteredIds.includes(user._id.toString()));
    },

    balanceHistories: async (trigger, batchIds) => {
      const cacheKey = `balance_histories:${trigger}:${campaignId}:${userIdsHash}:${isWaitForEvent ? `${startDate.toISOString()}_${endDate.toISOString()}` : "all"}`;
      const matchQuery = {
        userId: { $in: batchIds.map((id) => new mongoose_1.Types.ObjectId(id)) },
        ...(trigger === "VIP_points" && { amount: { $lt: 0 } }),
        ...(isWaitForEvent && { createdAt: { $gte: startDate, $lte: endDate } }),
      };
      if (trigger === "VIP_points") {
        const groupQuery = {
          _id: "$userId",
          totalAbsAmount: { $sum: { $abs: "$amount" } }
        };
        const projectQuery = {
          _id: 1,
          vipPoints: { $divide: ["$totalAbsAmount", 5] }
        };
        const data = await queryAndCacheAggregate(cacheKey, models_1.BalanceHistories, matchQuery, groupQuery, projectQuery);
        const filteredIds = data.filter((entry) => entry.vipPoints >= 0.2).map((entry) => entry._id.toString());
        return segmentUsers.filter((user) => batchIds.includes(user._id.toString()) && filteredIds.includes(user._id.toString()));
      } else {
        const matchedUserIds = await queryAndCacheAggregate(cacheKey, models_1.BalanceHistories, matchQuery);
        return segmentUsers.filter((user) => batchIds.includes(user._id.toString()) && matchedUserIds.includes(user._id.toString()));
      }
    },

    notifications: async (trigger, batchIds) => {
      const cacheKey = `notifications:${trigger}:${campaignId}:${userIdsHash}:${isWaitForEvent ? `${startDate.toISOString()}_${endDate.toISOString()}` : "all"}`;
      const matchQuery = {
        userId: { $in: batchIds.map((id) => new mongoose_1.Types.ObjectId(id)) },
        status: true,
        ...(isWaitForEvent && { createdAt: { $gte: startDate, $lte: endDate } }),
      };
      const matchedUserIds = await queryAndCacheAggregate(cacheKey, models_1.Notification, matchQuery);
      return segmentUsers.filter((user) => batchIds.includes(user._id.toString()) && matchedUserIds.includes(user._id.toString()));
    },

    marketing: async (trigger, batchIds) => {
      const cacheKey = `marketing:${trigger}:${campaignId}:${userIdsHash}:${isWaitForEvent ? `${startDate.toISOString()}_${endDate.toISOString()}` : "all"}`;
      const matchQuery = {
        ...(trigger === "Email_Notifications" && { templateId: { $exists: true, $ne: "" } }),
        ...(trigger === "SMS_Notifications" && { $or: [{ templateId: { $exists: false } }, { templateId: "" }] }),
        ...(isWaitForEvent && { createdAt: { $gte: startDate, $lte: endDate } }),
      };
      const records = await models_1.MarketingHistory.find(matchQuery).select('receivers').lean().catch(error => {
        console.error(`Find error for MarketingHistory:`, error);
        return [];
      });
      const users = await models_1.Users.find({ _id: { $in: batchIds.map((id) => new mongoose_1.Types.ObjectId(id)) } })
        .select(trigger === "Email_Notifications" ? "email" : "phone")
        .lean().catch(error => {
          console.error(`Find error for Users in marketing:`, error);
          return [];
        });
      const filteredIds = users.filter((userData) => {
        const contact = trigger === "Email_Notifications" ? userData.email : userData.phone;
        return records.some((r) => r.receivers.includes(contact) || r.receivers.includes("all"));
      }).map((userData) => userData._id.toString());

      if (filteredIds.length) {
        await redisClient.sAdd(cacheKey, filteredIds);
        await redisClient.expire(cacheKey, CACHE_TTL);
      }
      return segmentUsers.filter((user) => batchIds.includes(user._id.toString()) && filteredIds.includes(user._id.toString()));
    },

    adminEvents: async (trigger, batchIds) => {
      const cacheKey = `admin_events:${campaignId}:${userIdsHash}:${isWaitForEvent ? `${startDate.toISOString()}_${endDate.toISOString()}` : "all"}`;
      const matchQuery = {
        _id: { $in: batchIds.map((id) => new mongoose_1.Types.ObjectId(id)) },
        ...(isWaitForEvent && { createdAt: { $gte: startDate, $lte: endDate } }),
      };
      const users = await models_1.Users.aggregate([
        { $match: matchQuery },
        { $lookup: { from: "roles", localField: "rolesId", foreignField: "_id", as: "role" } },
        { $unwind: { path: "$role", preserveNullAndEmptyArrays: true } },
        { $match: { "role.type": { $in: ["admin", "super_admin"] } } },
        { $project: { _id: 1 } }
      ]).catch(error => {
        console.error(`Aggregate error for Users in adminEvents:`, error);
        return [];
      });
      const matchedUserIds = users.map((u) => u._id.toString());
      if (matchedUserIds.length) {
        await redisClient.sAdd(cacheKey, matchedUserIds);
        await redisClient.expire(cacheKey, CACHE_TTL);
      }
      return segmentUsers.filter((user) => batchIds.includes(user._id.toString()) && matchedUserIds.includes(user._id.toString()));
    },

    userTier: async (trigger, batchIds) => {
      const cacheKey = `user_tier:${campaignId}:${userIdsHash}:${isWaitForEvent ? `${startDate.toISOString()}_${endDate.toISOString()}` : "all"}`;
      const matchQuery = {
        _id: { $in: batchIds.map((id) => new mongoose_1.Types.ObjectId(id)) },
        tiers: { $exists: true, $ne: null, $ne: "" },
        ...(isWaitForEvent && { createdAt: { $gte: startDate, $lte: endDate } }),
      };
      const matchedUserIds = await queryAndCacheAggregate(cacheKey, models_1.Users, matchQuery);
      return segmentUsers.filter((user) => batchIds.includes(user._id.toString()) && matchedUserIds.includes(user._id.toString()));
    },

    netLose: async (trigger, batchIds) => {
      const cacheKey = `net_lose:${campaignId}:${userIdsHash}:${isWaitForEvent ? `${startDate.toISOString()}_${endDate.toISOString()}` : "all"}`;
      const balanceMatch = {
        userId: { $in: batchIds.map((id) => new mongoose_1.Types.ObjectId(id)) },
        status: true,
      };
      const balancesAgg = await models_1.Balances.aggregate([
        { $match: balanceMatch },
        { $group: { _id: "$userId", balance: { $first: "$balance" } } }
      ]).catch(error => {
        console.error(`Aggregate error for Balances in netLose:`, error);
        return [];
      });
      const balanceMap = Object.fromEntries(balancesAgg.map((b) => [b._id.toString(), b.balance || 0]));

      const paymentMatch = {
        userId: { $in: batchIds.map((id) => new mongoose_1.Types.ObjectId(id)) },
        status: 3,
        ...(isWaitForEvent && { createdAt: { $gte: startDate, $lte: endDate } }),
      };
      const paymentsAgg = await models_1.Payments.aggregate([
        { $match: paymentMatch },
        {
          $group: {
            _id: "$userId",
            deposit: { $sum: { $cond: [{ $eq: ["$ipn_type", "deposit"] }, "$actually_paid", 0] } },
            withdraw: { $sum: { $cond: [{ $eq: ["$ipn_type", "withdrawal"] }, "$actually_paid", 0] } }
          }
        }
      ]).catch(error => {
        console.error(`Aggregate error for Payments in netLose:`, error);
        return [];
      });

      const filteredIds = paymentsAgg.filter((p) => {
        const userId = p._id.toString();
        const netLose = p.deposit - p.withdraw - (balanceMap[userId] || 0);
        return netLose < 0;
      }).map((p) => p._id.toString());

      if (filteredIds.length) {
        await redisClient.sAdd(cacheKey, filteredIds);
        await redisClient.expire(cacheKey, CACHE_TTL);
      }
      return segmentUsers.filter((user) => batchIds.includes(user._id.toString()) && filteredIds.includes(user._id.toString()));
    },
  };

  const triggerMap = {
    sport_bet: handlers.sportsBets,
    league_bet: handlers.sportsBets,
    match_bet: handlers.sportsBets,
    odds: handlers.sportsBets,
    Minimum_Bet_Amount: handlers.sportsBets,
    bet_win: handlers.sportsBets,
    bet_lose: handlers.sportsBets,
    games: handlers.gameHistories,
    provider: handlers.gameHistories,
    Game_Type: handlers.gameHistories,
    Casino_Bet: handlers.gameHistories,
    Live_Casino_Gaming_bet: handlers.gameHistories,
    Game_Session_Start: handlers.gameHistories,
    Game_Session_End: handlers.gameHistories,
    Deposit_attempt: handlers.deposits,
    Deposit_approved: handlers.deposits,
    Deposit_Disproved: handlers.deposits,
    Deposit_Canceled: handlers.deposits,
    Deposit_Comparator: handlers.deposits,
    deposit: handlers.deposits,
    Withdraw_attempt: handlers.withdrawals,
    Withdraw_approved: handlers.withdrawals,
    Withdraw_Disproved: handlers.withdrawals,
    Withdraw_Comparator: handlers.withdrawals,
    Last_login: handlers.login,
    Login_sum_total: handlers.login,
    device_used: handlers.login,
    Login_Specific_IP: handlers.login,
    login: handlers.login,
    Logout: handlers.logout,
    Self_exclusion: handlers.userAttributes,
    Limit_set: handlers.userAttributes,
    Geolocation: handlers.userAttributes,
    Localization: handlers.userAttributes,
    time_spend: handlers.userAttributes,
    visite_page: handlers.userAttributes,
    registration_date: handlers.registration,
    Balance: handlers.balances,
    Bonus_balance: handlers.balances,
    Bonus_get: handlers.balances,
    Award_Bonus: handlers.balances,
    Update_User_Balance: handlers.balanceHistories,
    VIP_points: handlers.balanceHistories,
    Push_Notifications: handlers.notifications,
    Email_Notifications: handlers.marketing,
    SMS_Notifications: handlers.marketing,
    Admin_Only_Events: handlers.adminEvents,
    User_Tier: handlers.userTier,
    net_lose: handlers.netLose,
  };

  try {
    const userBatches = chunk(userIds, BATCH_SIZE);
    const results = await Promise.all(
      userBatches.map(async (batch) => {
        const handler = triggerMap[entryTrigger];
        if (!handler) return [];
        const matchedPlayers = await handler(entryTrigger, batch);
        console.log(`Batch matched players for ${entryTrigger}: ${matchedPlayers.map((p) => p._id.toString())}`);
        return matchedPlayers;
      })
    );

    const allMatched = results.flat();
    const uniqueMap = new Map(allMatched.map(p => [p._id.toString(), p]));
    players = Array.from(uniqueMap.values());
    console.log(`Final matched players for ${entryTrigger}: ${players.map((p) => p._id.toString())}`);
    return players;
  } catch (error) {
    console.error(`Error in triggersCheck for ${entryTrigger}:`, error);
    return [];
  }
};

module.exports = { triggersCheck };