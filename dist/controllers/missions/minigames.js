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
exports.deleteOne = exports.updateOne = exports.create = exports.get = void 0;
const mongoose_1 = require("mongoose");
const models_1 = require("../../models");

const get = async (req, res) => {
  try {
    console.log('Fetching minigames configuration');
    const minigame = await models_1.MissionMiniGames.findOne().lean();

    if (!minigame) {
      console.log('Minigames configuration not found');
      return res.status(404).json({ message: 'Minigames configuration not found' });
    }

    const formattedMinigame = {
      ...minigame,
      _id: minigame._id.toString(),
    };

    res.json({ data: formattedMinigame });
  } catch (error) {
    console.error('Error in get minigames:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.get = get;

const create = async (req, res) => {
  try {
    const minigameData = req.body;
    console.log('Attempting to create minigames configuration:', minigameData);

    // Check if a record already exists
    const existingMinigame = await models_1.MissionMiniGames.findOne().lean();
    if (existingMinigame) {
      console.log('Minigames configuration already exists');
      return res.status(200).json({ message: 'Minigames configuration already exists. Use update to modify.' });
    }

    const minigame = await models_1.MissionMiniGames.create(minigameData);

    const formattedMinigame = {
      ...minigame.toObject(),
      _id: minigame._id.toString(),
    };

    res.status(201).json({ data: formattedMinigame });
  } catch (error) {
    console.error('Error in create minigames:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.create = create;

const updateOne = async (req, res) => {
  try {
    const minigameData = req.body;
    const minigameId = req.params._id;
    console.log('Updating minigames configuration with ID:', minigameId);

    const minigame = await models_1.MissionMiniGames.findByIdAndUpdate(
      minigameId,
      minigameData,
      { new: true, runValidators: true }
    ).lean();

    if (!minigame) {
      console.log('Minigames configuration not found for ID:', minigameId);
      return res.status(404).json({ message: 'Minigames configuration not found' });
    }

    const formattedMinigame = {
      ...minigame,
      _id: minigame._id.toString(),
    };

    res.json({ data: formattedMinigame });
  } catch (error) {
    console.error('Error in updateOne minigames:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.updateOne = updateOne;

const deleteOne = async (req, res) => {
  try {
    const minigameId = req.params._id;
    console.log('Deleting minigames configuration with ID:', minigameId);

    const result = await models_1.MissionMiniGames.deleteOne({
      _id: minigameId,
    });

    if (result.deletedCount === 0) {
      console.log('Minigames configuration not found for ID:', minigameId);
      return res.status(404).json({ message: 'Minigames configuration not found' });
    }

    res.json({ data: { message: 'Minigames configuration deleted successfully' } });
  } catch (error) {
    console.error('Error in deleteOne minigames:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.deleteOne = deleteOne;




//mini games 
const getOneWheel_50 = async (req, res) => {
  try {
    const wheelId = req.params._id;
    console.log('Fetching Wheel 50 with ID:', wheelId);

    if (!mongoose_1.Types.ObjectId.isValid(wheelId)) {
      console.log('Invalid wheelId:', wheelId);
      return res.status(404).json({ message: 'Invalid wheelId' });
    }

    const wheel = await models_1.MissionMiniWheelOne.findById(wheelId).lean();

    if (!wheel) {
      console.log('Wheel 50 not found for ID:', wheelId);
      return res.status(404).json({ message: 'Wheel 50 not found' });
    }

    const formattedWheel = {
      ...wheel,
      _id: wheel._id.toString(),
      minigameId: wheel.minigameId.toString(),
    };

    res.json({ data: formattedWheel });
  } catch (error) {
    console.error('Error in getOneWheel_50:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.getOneWheel_50 = getOneWheel_50;

const createWheel_50 = async (req, res) => {
  try {
    const wheelData = req.body;
    console.log('Creating Wheel 50:', wheelData);

    const wheel = await models_1.MissionMiniWheelOne.create(wheelData);

    const formattedWheel = {
      ...wheel.toObject(),
      _id: wheel._id.toString(),
      minigameId: wheel.minigameId.toString(),
    };

    res.status(201).json({ data: formattedWheel });
  } catch (error) {
    console.error('Error in createWheel_50:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.createWheel_50 = createWheel_50;

const listWheel_50 = async (req, res) => {
  try {
    const { pageSize = null, page = null, search = '', status = null, type = null } = req.body;
    console.log('Listing Wheel 50 with params:', { pageSize, page, search, status, type });

    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { desc: { $regex: search, $options: 'i' } },
      ];
    }
    if (status !== null) {
      query.status = status;
    }
    if (type) {
      query.type = type;
    }

    const count = await models_1.MissionMiniWheelOne.countDocuments(query);

    let results;
    if (!pageSize || !page) {
      results = await models_1.MissionMiniWheelOne.find(query)
        .sort({ createdAt: -1 })
        .lean();
    } else {
      results = await models_1.MissionMiniWheelOne.find(query)
        .limit(pageSize)
        .skip((page - 1) * pageSize)
        .sort({ createdAt: -1 })
        .lean();
    }

    const formattedResults = results.map(wheel => ({
      ...wheel,
      _id: wheel._id.toString(),
      minigameId: wheel.minigameId.toString(),
    }));

    res.json({ data: { results: formattedResults, count } });
  } catch (error) {
    console.error('Error in listWheel_50:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.listWheel_50 = listWheel_50;

const updateOneWheel_50 = async (req, res) => {
  try {
    const wheelData = req.body;
    const wheelId = req.params._id;
    console.log('Updating Wheel 50 with ID:', wheelId);

    if (!mongoose_1.Types.ObjectId.isValid(wheelId)) {
      console.log('Invalid wheelId:', wheelId);
      return res.status(200).json({ message: 'Invalid wheelId' });
    }

    const wheel = await models_1.MissionMiniWheelOne.findByIdAndUpdate(
      wheelId,
      wheelData,
      { new: true, runValidators: true }
    ).lean();

    if (!wheel) {
      console.log('Wheel 50 not found for ID:', wheelId);
      return res.status(404).json({ message: 'Wheel 50 not found' });
    }

    const formattedWheel = {
      ...wheel,
      _id: wheel._id.toString(),
      minigameId: wheel.minigameId.toString(),
    };

    res.json({ data: formattedWheel });
  } catch (error) {
    console.error('Error in updateOneWheel_50:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.updateOneWheel_50 = updateOneWheel_50;

const deleteOneWheel_50 = async (req, res) => {
  try {
    const wheelId = req.params._id;
    console.log('Deleting Wheel 50 with ID:', wheelId);

    if (!mongoose_1.Types.ObjectId.isValid(wheelId)) {
      console.log('Invalid wheelId:', wheelId);
      return res.status(200).json({ message: 'Invalid wheelId' });
    }

    const result = await models_1.MissionMiniWheelOne.deleteOne({
      _id: wheelId,
    });

    if (result.deletedCount === 0) {
      console.log('Wheel 50 not found for ID:', wheelId);
      return res.status(404).json({ message: 'Wheel 50 not found' });
    }

    res.json({ data: { message: 'Wheel 50 deleted successfully' } });
  } catch (error) {
    console.error('Error in deleteOneWheel_50:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.deleteOneWheel_50 = deleteOneWheel_50;

// MissionMiniWheelTwo (Wheel 100)
const getOneWheel_100 = async (req, res) => {
  try {
    const wheelId = req.params._id;
    console.log('Fetching Wheel 100 with ID:', wheelId);

    if (!mongoose_1.Types.ObjectId.isValid(wheelId)) {
      console.log('Invalid wheelId:', wheelId);
      return res.status(200).json({ message: 'Invalid wheelId' });
    }

    const wheel = await models_1.MissionMiniWheelTwo.findById(wheelId).lean();

    if (!wheel) {
      console.log('Wheel 100 not found for ID:', wheelId);
      return res.status(404).json({ message: 'Wheel 100 not found' });
    }

    const formattedWheel = {
      ...wheel,
      _id: wheel._id.toString(),
      minigameId: wheel.minigameId.toString(),
    };

    res.json({ data: formattedWheel });
  } catch (error) {
    console.error('Error in getOneWheel_100:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.getOneWheel_100 = getOneWheel_100;

const createWheel_100 = async (req, res) => {
  try {
    const wheelData = req.body;
    console.log('Creating Wheel 100:', wheelData);

    const wheel = await models_1.MissionMiniWheelTwo.create(wheelData);

    const formattedWheel = {
      ...wheel.toObject(),
      _id: wheel._id.toString(),
      minigameId: wheel.minigameId.toString(),
    };

    res.status(201).json({ data: formattedWheel });
  } catch (error) {
    console.error('Error in createWheel_100:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.createWheel_100 = createWheel_100;

const listWheel_100 = async (req, res) => {
  try {
    const { pageSize = null, page = null, search = '', status = null, type = null } = req.body;
    console.log('Listing Wheel 100 with params:', { pageSize, page, search, status, type });

    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { desc: { $regex: search, $options: 'i' } },
      ];
    }
    if (status !== null) {
      query.status = status;
    }
    if (type) {
      query.type = type;
    }

    const count = await models_1.MissionMiniWheelTwo.countDocuments(query);

    let results;
    if (!pageSize || !page) {
      results = await models_1.MissionMiniWheelTwo.find(query)
        .sort({ createdAt: -1 })
        .lean();
    } else {
      results = await models_1.MissionMiniWheelTwo.find(query)
        .limit(pageSize)
        .skip((page - 1) * pageSize)
        .sort({ createdAt: -1 })
        .lean();
    }

    const formattedResults = results.map(wheel => ({
      ...wheel,
      _id: wheel._id.toString(),
      minigameId: wheel.minigameId.toString(),
    }));

    res.json({ data: { results: formattedResults, count } });
  } catch (error) {
    console.error('Error in listWheel_50:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.listWheel_100 = listWheel_100;

const updateOneWheel_100 = async (req, res) => {
  try {
    const wheelData = req.body;
    const wheelId = req.params._id;
    console.log('Updating Wheel 100 with ID:', wheelId);

    if (!mongoose_1.Types.ObjectId.isValid(wheelId)) {
      console.log('Invalid wheelId:', wheelId);
      return res.status(200).json({ message: 'Invalid wheelId' });
    }

    const wheel = await models_1.MissionMiniWheelTwo.findByIdAndUpdate(
      wheelId,
      wheelData,
      { new: true, runValidators: true }
    ).lean();

    if (!wheel) {
      console.log('Wheel 100 not found for ID:', wheelId);
      return res.status(404).json({ message: 'Wheel 100 not found' });
    }

    const formattedWheel = {
      ...wheel,
      _id: wheel._id.toString(),
      minigameId: wheel.minigameId.toString(),
    };

    res.json({ data: formattedWheel });
  } catch (error) {
    console.error('Error in updateOneWheel_100:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.updateOneWheel_100 = updateOneWheel_100;

const deleteOneWheel_100 = async (req, res) => {
  try {
    const wheelId = req.params._id;
    console.log('Deleting Wheel 100 with ID:', wheelId);

    if (!mongoose_1.Types.ObjectId.isValid(wheelId)) {
      console.log('Invalid wheelId:', wheelId);
      return res.status(200).json({ message: 'Invalid wheelId' });
    }

    const result = await models_1.MissionMiniWheelTwo.deleteOne({
      _id: wheelId,
    });

    if (result.deletedCount === 0) {
      console.log('Wheel 100 not found for ID:', wheelId);
      return res.status(404).json({ message: 'Wheel 100 not found' });
    }

    res.json({ data: { message: 'Wheel 100 deleted successfully' } });
  } catch (error) {
    console.error('Error in deleteOneWheel_100:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.deleteOneWheel_100 = deleteOneWheel_100;

// MissionMiniScratch (Scratch)
const getOneScratch = async (req, res) => {
  try {
    const scratchId = req.params._id;
    console.log('Fetching Scratch with ID:', scratchId);

    if (!mongoose_1.Types.ObjectId.isValid(scratchId)) {
      console.log('Invalid scratchId:', scratchId);
      return res.status(200).json({ message: 'Invalid scratchId' });
    }

    const scratch = await models_1.MissionMiniScratch.findById(scratchId).lean();

    if (!scratch) {
      console.log('Scratch not found for ID:', scratchId);
      return res.status(404).json({ message: 'Scratch not found' });
    }

    const formattedScratch = {
      ...scratch,
      _id: scratch._id.toString(),
      minigameId: scratch.minigameId.toString(),
      store_reward: scratch.store_reward.map(id => id.toString()),
    };

    res.json({ data: formattedScratch });
  } catch (error) {
    console.error('Error in getOneScratch:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.getOneScratch = getOneScratch;

const createScratch = async (req, res) => {
  try {
    const scratchData = req.body;
    console.log('Creating Scratch:', scratchData);

    const scratch = await models_1.MissionMiniScratch.create(scratchData);

    const formattedScratch = {
      ...scratch.toObject(),
      _id: scratch._id.toString(),
      minigameId: scratch.minigameId.toString(),
      store_reward: scratch.store_reward.map(id => id.toString()),
    };

    res.status(201).json({ data: formattedScratch });
  } catch (error) {
    console.error('Error in createScratch:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.createScratch = createScratch;

const listScratch = async (req, res) => {
  try {
    const { pageSize = null, page = null, search = '', type = null } = req.body;
    console.log('Listing Scratch with params:', { pageSize, page, search, type });

    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { banner_path: { $regex: search, $options: 'i' } },
      ];
    }
    if (type) {
      query.type = type;
    }

    const count = await models_1.MissionMiniScratch.countDocuments(query);

    let results;
    if (!pageSize || !page) {
      results = await models_1.MissionMiniScratch.find(query)
        .sort({ createdAt: -1 })
        .lean();
    } else {
      results = await models_1.MissionMiniScratch.find(query)
        .limit(pageSize)
        .skip((page - 1) * pageSize)
        .sort({ createdAt: -1 })
        .lean();
    }

    const formattedResults = results.map(scratch => ({
      ...scratch,
      _id: scratch._id.toString(),
      minigameId: scratch.minigameId.toString(),
      store_reward: scratch.store_reward.map(id => id.toString()),
    }));

    res.json({ data: { results: formattedResults, count } });
  } catch (error) {
    console.error('Error in listScratch:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.listScratch = listScratch;

const updateScratch = async (req, res) => {
  try {
    const scratchData = req.body;
    const scratchId = req.params._id;
    console.log('Updating Scratch with ID:', scratchId);

    if (!mongoose_1.Types.ObjectId.isValid(scratchId)) {
      console.log('Invalid scratchId:', scratchId);
      return res.status(200).json({ message: 'Invalid scratchId' });
    }

    const scratch = await models_1.MissionMiniScratch.findByIdAndUpdate(
      scratchId,
      scratchData,
      { new: true, runValidators: true }
    ).lean();

    if (!scratch) {
      console.log('Scratch not found for ID:', scratchId);
      return res.status(404).json({ message: 'Scratch not found' });
    }

    const formattedScratch = {
      ...scratch,
      _id: scratch._id.toString(),
      minigameId: scratch.minigameId.toString(),
      store_reward: scratch.store_reward.map(id => id.toString()),
    };

    res.json({ data: formattedScratch });
  } catch (error) {
    console.error('Error in updateScratch:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.updateScratch = updateScratch;

const deleteScratch = async (req, res) => {
  try {
    const scratchId = req.params._id;
    console.log('Deleting Scratch with ID:', scratchId);

    if (!mongoose_1.Types.ObjectId.isValid(scratchId)) {
      console.log('Invalid scratchId:', scratchId);
      return res.status(200).json({ message: 'Invalid scratchId' });
    }

    const result = await models_1.MissionMiniScratch.deleteOne({
      _id: scratchId,
    });

    if (result.deletedCount === 0) {
      console.log('Scratch not found for ID:', scratchId);
      return res.status(404).json({ message: 'Scratch not found' });
    }

    res.json({ data: { message: 'Scratch deleted successfully' } });
  } catch (error) {
    console.error('Error in deleteScratch:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.deleteScratch = deleteScratch;