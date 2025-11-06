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
exports.deleteOne = exports.updateOne = exports.list = exports.label = exports.create = exports.getOne = void 0;
const models_1 = require("../../models");

const getOne = async (req, res) => {
  try {
    const shopId = req.params._id;
    console.log('Fetching shop with ID:', shopId);
    const shop = await models_1.MissionShops.findById(shopId).lean();

    if (!shop) {
      console.log('Shop not found for ID:', shopId);
      return res.status(404).json({ message: 'Shop not found' });
    }

    const formattedShop = {
      ...shop,
      _id: shop._id.toString(),
    };

    res.json({ data: formattedShop });
  } catch (error) {
    console.error('Error in getOne shop:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.getOne = getOne;

const create = async (req, res) => {
  try {
    const shopData = req.body;
    const shop = await models_1.MissionShops.create(shopData);

    const formattedShop = {
      ...shop.toObject(),
      _id: shop._id.toString(),
    };

    res.status(201).json({ data: formattedShop });
  } catch (error) {
    console.error('Error in create shop:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.create = create;

const list = async (req, res) => {
  try {
    const { pageSize = null, page = null, search = '', type_pay = null, type_gift = null, status = null } = req.body;
    let query = {};

    if (search) {
      query.$text = { $search: search };
    }

    if (type_pay) {
      query.type_pay = type_pay;
    }

    if (type_gift) {
      query.type_gift = type_gift;
    }

    if (status !== null) {
      query.status = status;
    }

    const count = await models_1.MissionShops.countDocuments(query);

    let results;
    if (!pageSize || !page) {
      results = await models_1.MissionShops.find(query)
        .sort({ createdAt: -1 })
        .lean();
    } else {
      results = await models_1.MissionShops.find(query)
        .limit(pageSize)
        .skip((page - 1) * pageSize)
        .sort({ createdAt: -1 })
        .lean();
    }

    const formattedResults = results.map(shop => ({
      ...shop,
      _id: shop._id.toString(),
    }));

    res.json({ data: { results: formattedResults, count } });
  } catch (error) {
    console.error('Error in list shops:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.list = list;

const label = async (req, res) => {
  try {
    const { search = '', type_pay = null, type_gift = null, status = null } = req.body;
    let query = {};

    if (search) {
      query.$text = { $search: search };
    }

    if (type_pay) {
      query.type_pay = type_pay;
    }

    if (type_gift) {
      query.type_gift = type_gift;
    }

    if (status !== null) {
      query.status = status;
    }

    const shops = await models_1.MissionShops.find(query)
      .select('name _id')
      .sort({ name: 1 })
      .lean();

    const formattedShops = shops.map(shop => ({
      name: shop.name,
      value: shop._id.toString(),
    }));

    res.json({ data: formattedShops });
  } catch (error) {
    console.error('Error in getShopsLabel:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.label = label;

const updateOne = async (req, res) => {
  try {
    const shopData = req.body;
    const shopId = req.params._id;

    const shop = await models_1.MissionShops.findByIdAndUpdate(
      shopId,
      shopData,
      { new: true, runValidators: true }
    ).lean();

    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    const formattedShop = {
      ...shop,
      _id: shop._id.toString(),
    };

    res.json({ data: formattedShop });
  } catch (error) {
    console.error('Error in updateOne shop:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.updateOne = updateOne;

const deleteOne = async (req, res) => {
  try {
    const shopId = req.params._id;

    const result = await models_1.MissionShops.deleteOne({
      _id: shopId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    res.json({ data: { message: 'Shop deleted successfully' } });
  } catch (error) {
    console.error('Error in deleteOne shop:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.deleteOne = deleteOne;