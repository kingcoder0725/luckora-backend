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
exports.buyItem = exports.getOneUserItem = exports.getUsersItems = exports.get_free_bets_vouchers = exports.buyItem = exports.getGamesByVendor = exports.activatePurchase = exports.getPurchases = void 0;
const models_1 = require("../../models");
const fiatConverter_1 = require("../../utils/fiatConverter");
const timelesstech_1 = require("../games/timelesstech");

const getUsersItems = async (req, res) => {
  try {
    const { userId } = req.body;

    const balance = await models_1.Balances.findOne({ userId }).populate('currency');
    if (!balance) {
      return res.status(404).json({ message: 'User balance not found' });
    }

    const userCurrency = balance.currency;
    const userCurrencySymbol = userCurrency.symbol;

    const shops = await models_1.MissionShops.find({ status: true }).lean();

    const userPointsCost = await models_1.MissionPointsCost.findOne({ currencyId: userCurrency._id }).populate('currencyId');
    const priorityPointsCost = await models_1.MissionPointsCost.findOne({ priority: true }).populate('currencyId');
    if (!priorityPointsCost) {
      return res.status(500).json({ message: 'Priority points cost not found' });
    }

    const formattedItems = await Promise.all(shops.map(async shop => {
      let finalCost = shop.cost; 
      let calculatedPayout = shop.payout;
      let currencySymbol = userCurrencySymbol;

      if ((shop.type_gift === 'cash_bonus' || shop.type_gift === 'free_bet') && shop.type_pay === 'points') {

        if (userPointsCost) {
          calculatedPayout = (shop.type_gift === 'cash_bonus' ? shop.cost : shop.payout) * userPointsCost.fiatValue;
        } else {
          const priorityValue = priorityPointsCost.fiatValue;
          const priorityCurrencySymbol = priorityPointsCost.currencyId.symbol;

          if (shop.type_gift === 'cash_bonus') {
            const pointsInPriorityCurrency = shop.cost * priorityValue;
            if (priorityCurrencySymbol !== userCurrencySymbol) {
              const rate = await fiatConverter_1.convertFiatCurrency(priorityCurrencySymbol, userCurrencySymbol, 1);
              if (rate === 0) {
                console.error('Currency conversion failed for shop:', shop._id);
                calculatedPayout = pointsInPriorityCurrency;
                currencySymbol = priorityCurrencySymbol;
              } else {
                calculatedPayout = pointsInPriorityCurrency * rate;
              }
            } else {
              calculatedPayout = pointsInPriorityCurrency;
            }
          } else if (shop.type_gift === 'free_bet') {
            if (priorityCurrencySymbol !== userCurrencySymbol) {
              const rate = await fiatConverter_1.convertFiatCurrency(priorityCurrencySymbol, userCurrencySymbol, 1);
              console.log(`Conversion rate (${priorityCurrencySymbol} -> ${userCurrencySymbol}): ${rate}`);
              if (rate === 0) {
                console.error('Currency conversion failed for shop:', shop._id);
                calculatedPayout = shop.payout;
                currencySymbol = priorityCurrencySymbol;
              } else {
                calculatedPayout = shop.payout * rate;
              }
            } else {
              calculatedPayout = shop.payout;
            }
          }
        }
      }

      calculatedPayout = Number(calculatedPayout.toFixed(2));

      const formattedItem = {
        _id: shop._id.toString(),
        name: shop.name,
        desc: shop.desc,
        banner_path: shop.banner_path,
        type_pay: shop.type_pay,
        cost: finalCost, 
        payout: calculatedPayout, 
        type_gift: shop.type_gift,
        currencySymbol: currencySymbol,
      };

      return formattedItem;
    }));

    res.json({ data: formattedItems });
  } catch (error) {
    console.error('Error in getUsersItems:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.getUsersItems = getUsersItems;

const getOneUserItem = async (req, res) => {
  try {
    const { userId } = req.body;
    const shopId = req.params.id;

    const balance = await models_1.Balances.findOne({ userId }).populate('currency');
    if (!balance) {
      return res.status(404).json({ message: 'User balance not found' });
    }

    const userCurrency = balance.currency;
    const userCurrencySymbol = userCurrency.symbol;

    const shop = await models_1.MissionShops.findById(shopId).lean();
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    const userPointsCost = await models_1.MissionPointsCost.findOne({ currencyId: userCurrency._id }).populate('currencyId');
    const priorityPointsCost = await models_1.MissionPointsCost.findOne({ priority: true }).populate('currencyId');
    if (!priorityPointsCost) {
      return res.status(500).json({ message: 'Priority points cost not found' });
    }

    let finalCost = shop.cost; 
    let calculatedPayout = shop.payout;
    let currencySymbol = userCurrencySymbol;

    if (shop.type_gift === 'cash_bonus' && shop.type_pay === 'points') {
      if (userPointsCost) {
        calculatedPayout = shop.cost * userPointsCost.fiatValue;
      } else {
        const priorityValue = priorityPointsCost.fiatValue;
        const priorityCurrencySymbol = priorityPointsCost.currencyId.symbol;
        const pointsInPriorityCurrency = shop.cost * priorityValue;

        if (priorityCurrencySymbol !== userCurrencySymbol) {
          const rate = await fiatConverter_1.convertFiatCurrency(priorityCurrencySymbol, userCurrencySymbol, 1);
          if (rate === 0) {
            console.error('Currency conversion failed for shop:', shop._id);
            calculatedPayout = pointsInPriorityCurrency;
            currencySymbol = priorityCurrencySymbol;
          } else {
            calculatedPayout = pointsInPriorityCurrency * rate;
          }
        } else {
          calculatedPayout = pointsInPriorityCurrency;
        }
      }
    }

    const matchingCurrency = shop.currencies.find(c => c.currency === userCurrencySymbol) || shop.currencies[0];

    const formattedItem = {
      _id: shop._id.toString(),
      name: shop.name,
      desc: shop.desc,
      banner_path: shop.banner_path,
      type_pay: shop.type_pay,
      cost: finalCost,
      payout: calculatedPayout,
      type_gift: shop.type_gift,
      currencies: shop.type_gift === 'free_spins' ? shop.currencies : [],
      maxodds: shop.type_gift === 'free_bet' ? shop.maxodds : undefined,
      leagueId: shop.type_gift === 'free_bet' ? shop.leagueId : undefined,
      matchId: shop.type_gift === 'free_bet' ? shop.matchId : undefined,
      currencySymbol: currencySymbol,
    };

    res.json({ data: formattedItem });
  } catch (error) {
    console.error('Error in getOneUserItem:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.getOneUserItem = getOneUserItem;

const buyItem = async (req, res) => {
  try {
    const { userId, id } = req.body;
    const shopId = id;

    if (!userId || !shopId) {
      return res.status(400).json({ message: 'userId and shopId are required' });
    }

    const shop = await models_1.MissionShops.findById(shopId).lean();
    if (!shop || !shop.status) {
      return res.status(404).json({ message: 'Shop not found or inactive' });
    }

    const balance = await models_1.Balances.findOne({ userId }).populate('currency');
    if (!balance) {
      return res.status(404).json({ message: 'User balance not found' });
    }

    let finalCost = shop.cost;
    let calculatedPayout = shop.payout;
    let isSufficientFunds = false;

    if (shop.type_pay === 'fiat') {
      const currency = balance.currency;
      if (!currency.isFiat) {
        return res.status(400).json({ message: 'Invalid currency for fiat payment' });
      }

      const currencySymbol = currency.symbol;
      if (currencySymbol !== 'USD') {
        const rate = await fiatConverter_1.convertFiatCurrency('USD', currencySymbol, 1);
        if (rate === 0) {
          return res.status(500).json({ message: 'Currency conversion failed' });
        }
        finalCost = shop.cost * rate;
      }

      isSufficientFunds = balance.balance >= finalCost;
    } else if (shop.type_pay === 'points') {
      isSufficientFunds = balance.points >= shop.cost;
      finalCost = shop.cost;

      if (shop.type_gift === 'cash_bonus') {
        const userCurrencySymbol = balance.currency.symbol;
        const userPointsCost = await models_1.MissionPointsCost.findOne({ currencyId: balance.currency._id }).populate('currencyId');
        const priorityPointsCost = await models_1.MissionPointsCost.findOne({ priority: true }).populate('currencyId');
        if (!priorityPointsCost) {
          return res.status(500).json({ message: 'Priority points cost not found' });
        }

        if (userPointsCost) {
          calculatedPayout = shop.cost * userPointsCost.fiatValue;
        } else {
          const priorityValue = priorityPointsCost.fiatValue;
          const priorityCurrencySymbol = priorityPointsCost.currencyId.symbol;
          const pointsInPriorityCurrency = shop.cost * priorityValue;

          if (priorityCurrencySymbol !== userCurrencySymbol) {
            const rate = await fiatConverter_1.convertFiatCurrency(priorityCurrencySymbol, userCurrencySymbol, 1);
            if (rate === 0) {
              return res.status(500).json({ message: 'Currency conversion failed' });
            }
            calculatedPayout = pointsInPriorityCurrency * rate;
          } else {
            calculatedPayout = pointsInPriorityCurrency;
          }
        }
      }
    }

    calculatedPayout = Number(calculatedPayout.toFixed(2));

    if (!isSufficientFunds) {
      return res.status(400).json({ message: 'Insufficient funds or points' });
    }

    if (shop.type_pay === 'fiat') {
      await models_1.Balances.findOneAndUpdate(
        { userId },
        { $inc: { balance: -finalCost } }
      );
    } else {
      await models_1.Balances.findOneAndUpdate(
        { userId },
        { $inc: { points: -finalCost } }
      );
    }

    if (shop.type_gift === 'cash_bonus') {
      await models_1.Balances.findOneAndUpdate(
        { userId },
        { $inc: { bonus: calculatedPayout } }
      );
    } else if (shop.type_gift !== 'free_spins') {
      if (shop.payout > 0) {
        await models_1.Balances.findOneAndUpdate(
          { userId },
          { $inc: { points: shop.payout } }
        );
      }
    }

    const userCurrencySymbol = balance.currency.symbol;
    const matchingCurrency = shop.currencies.find(c => c.currency === userCurrencySymbol) || shop.currencies[0];

    const historyEntry = {
      shopId: shop._id,
      userId,
      type_pay: shop.type_pay,
      type_gift: shop.type_gift,
      cost: shop.cost,
      payout: calculatedPayout,
      games: shop.type_gift === 'free_spins' ? matchingCurrency.games : [],
      maxodds: shop.type_gift === 'free_bet' ? shop.maxodds : undefined,
      leagueId: shop.type_gift === 'free_bet' ? shop.leagueId : undefined,
      matchId: shop.type_gift === 'free_bet' ? shop.matchId : undefined,
      status: 'paid',
      activate: shop.type_gift === 'free_spins' || shop.type_gift === 'free_bet' ? false : true,
    };

    const shopHistory = await models_1.MissionShopsHistories.create(historyEntry);

    const balanceHistoryEntry = {
      userId,
      currency: balance.currency._id,
      amount: 0,
      currentBalance: balance.balance,
      beforeBalance: balance.balance,
      bonus: shop.type_gift === 'cash_bonus' ? calculatedPayout : 0,
      points: shop.type_pay === 'points' ? balance.points - shop.cost : balance.points,
      type: 'purchase-in-shop',
      info: shopHistory._id.toString(),
    };

    await models_1.BalanceHistories.create(balanceHistoryEntry);

    return res.json({
      message: 'Purchase successful',
      data: {
        type_gift: shop.type_gift,
        payout: calculatedPayout,
        cost: finalCost,
      },
    });

  } catch (error) {
    console.error('Error in buyItem:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.buyItem = buyItem;

const triggerTesting = async (req, res) => {
  try {

    const mockReq = {
      body: {
        userId: '677e741ea21fd4535a0a501f',
        shopId: '683087b07f9f667c81908c2c'
      },
      user: req.user
    };

    const mockRes = {
      status: (code) => ({
        json: (data) => {
          res.status(code).json(data);
        }
      }),
      json: (data) => {
        res.json(data);
      }
    };

    await exports.buyItem(mockReq, mockRes);

  } catch (error) {
    console.error('Error in triggerTesting:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.triggerTesting = triggerTesting;




const getPurchases = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const purchases = await models_1.MissionShopsHistories.find({ userId, status: 'paid' })
      .populate({
        path: 'shopId',
        select: 'name desc type_gift',
      })
      .lean();

    const formattedPurchases = purchases.map(purchase => {
      if (!purchase.shopId) {
        console.error(`ShopId not found for purchase ${purchase._id}, possible data corruption`);
        return {
          _id: purchase._id.toString(),
          shopId: null,
          shopName: 'Unknown Shop',
          shopDescription: 'Data unavailable',
          type_gift: 'unknown',
          type_pay: purchase.type_pay,
          cost: purchase.cost,
          payout: purchase.payout,
          games: purchase.games || [],
          maxodds: purchase.maxodds,
          leagueId: purchase.leagueId,
          matchId: purchase.matchId,
          status: purchase.activate ? 'activated' : 'paid',
          activate: purchase.activate,
          createdAt: purchase.createdAt,
        };
      }

      return {
        _id: purchase._id.toString(),
        shopId: purchase.shopId._id.toString(),
        shopName: purchase.shopId.name || 'Unnamed Shop',
        shopDescription: purchase.shopId.desc || 'No description',
        type_gift: purchase.shopId.type_gift || 'unknown',
        type_pay: purchase.type_pay,
        cost: purchase.cost,
        payout: purchase.payout,
        games: purchase.games || [],
        maxodds: purchase.maxodds,
        leagueId: purchase.leagueId,
        matchId: purchase.matchId,
        status: purchase.activate ? 'activated' : 'paid',
        activate: purchase.activate,
        createdAt: purchase.createdAt,
      };
    });

    res.json({ data: formattedPurchases });
  } catch (error) {
    console.error('Error in getPurchases:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.getPurchases = getPurchases;

const get_free_bets_vouchers = async (req, res) => {
  try {
    const user = req === null || req === void 0 ? void 0 : req.user;
    
    if (!user._id) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const purchases = await models_1.MissionShopsHistories.find({
      userId: user._id,
      status: 'paid',
      type_gift: 'free_bet'
    })
      .populate({
        path: 'shopId',
        select: 'name desc type_gift'
      })
      .lean();

    if (purchases.some(purchase => !purchase.shopId)) {
      console.warn('Some purchases have missing shopId data');
    }

    const formattedPurchases = purchases.map(purchase => ({
      _id: purchase._id.toString(),
      shopId: purchase.shopId?._id?.toString() || null,
      shopName: purchase.shopId?.name || 'Unknown',
      shopDescription: purchase.shopId?.desc || 'No description',
      type_gift: purchase.type_gift, 
      type_pay: purchase.type_pay,
      cost: purchase.cost,
      payout: purchase.payout,
      maxodds: purchase.maxodds,
      leagueId: purchase.leagueId,
      matchId: purchase.matchId,
      status: purchase.activate ? 'activated' : 'paid',
      activate: purchase.activate,
      createdAt: purchase.createdAt
    }));

    res.json({ data: formattedPurchases });
  } catch (error) {
    console.error('Error in get_free_bets_vouchers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.get_free_bets_vouchers = get_free_bets_vouchers;

const activatePurchase = async (req, res) => {
  try {
    const { userId, purchaseHistoryId, game_code } = req.body;

    if (!userId || !purchaseHistoryId) {
      return res.status(400).json({ message: 'userId and purchaseHistoryId are required' });
    }

    if (!game_code) {
      return res.status(400).json({ message: 'game_code is required for free spins activation' });
    }

    const user = req?.user;
    if (!user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const purchase = await models_1.MissionShopsHistories.findById(purchaseHistoryId)
      .populate({
        path: 'shopId',
        select: 'name type_gift'
      })
      .lean();
    if (!purchase || purchase.userId.toString() !== userId) {
      return res.status(404).json({ message: 'Purchase not found or unauthorized' });
    }

    if (purchase.shopId.type_gift !== 'free_spins') {
      return res.status(400).json({ message: 'Purchase is not a free spins type' });
    }

    if (purchase.activate) {
      return res.status(400).json({ message: 'Purchase already activated' });
    }

    const selectedGame = purchase.games.find(g => g.game === game_code);
    if (!selectedGame) {
      return res.status(400).json({ message: 'Invalid game_code for this purchase' });
    }

    const free_spin = purchase.payout;
    const expire_date = new Date();
    expire_date.setDate(expire_date.getDate() + 7);
    const title = purchase.shopId.name;

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

    await models_1.MissionShopsHistories.findByIdAndUpdate(purchaseHistoryId, {
      $set: { activate: true },
    });

    await models_1.Notification.create({
      title: 'New Bonus',
      description: `You activated your purchase ${title}: ${game_name}, ${free_spin} spins - ${process.env.DOMAIN}/en/casino/casino/${provider_code}/${formatted_game_name}/${game_code}/play`,
      players: [String(userId)],
      country: ['all'],
      auto: true,
    });

    res.json({ message: 'Purchase activated successfully' });
  } catch (error) {
    console.error('Error in activatePurchase:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.activatePurchase = activatePurchase;


const getGamesByPurchaseId = async (req, res) => {
  try {
    const { purchaseId, pageSize = 100, page = 1, search = '' } = req.body;

    if (!purchaseId) {
      return res.status(400).json({ error: 'purchaseId is required' });
    }

    const history = await models_1.MissionShopsHistories.findById(purchaseId);
    if (!history || history.type_gift !== 'free_spins') {
      return res.status(404).json({ error: 'Purchase not found or not free_spins type' });
    }

    let gameCodes = history.games.map(g => g.game);

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
    console.error('[ERROR] Error in getGamesByPurchaseId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getGamesByPurchaseId = getGamesByPurchaseId;