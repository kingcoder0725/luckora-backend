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
const base_1 = require("../base");
const mongoose_1 = require("mongoose");

const getOne = async (req, res) => {
  try {
    const missionId = req.params._id;
    console.log('Fetching mission with ID:', missionId);
    const mission = await models_1.Missions.findById(missionId).lean();

    if (!mission) {
      console.log('Mission not found for ID:', missionId);
      return res.status(404).json({ message: 'Mission not found' });
    }

    const formattedMission = {
      ...mission,
      _id: mission._id.toString(),
      shops: mission.shops.map(id => id.toString()),
      missions: mission.missions.map(id => id.toString()),
      eligible_users:
        mission.eligible_users === 'ALL'
          ? 'ALL'
          : mission.eligible_users.map(id => id.toString()),
    };

    res.json({ data: formattedMission });
  } catch (error) {
    console.error('Error in getOne mission:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.getOne = getOne;


const create = async (req, res) => {
  try {
    const missionData = req.body;

    if (missionData.private_mission && missionData.eligible_users === 'ALL') {
      return res.status(200).json({ message: 'Private missions must specify eligible users as an array' });
    }
    if (!missionData.private_mission && missionData.eligible_users !== 'ALL') {
      return res.status(200).json({ message: 'Non-private missions must have eligible_users set to ALL' });
    }

    if (Array.isArray(missionData.shops)) {
      missionData.shops = missionData.shops.map(id => (0, base_1.ObjectId)(id));
    }
    if (Array.isArray(missionData.missions)) {
      missionData.missions = missionData.missions.map(id => (0, base_1.ObjectId)(id));
    }
    if (Array.isArray(missionData.eligible_users)) {
      missionData.eligible_users = missionData.eligible_users.map(id => (0, base_1.ObjectId)(id));
    }

    const mission = await models_1.Missions.create(missionData);

    const formattedMission = {
      ...mission.toObject(),
      _id: mission._id.toString(),
      shops: mission.shops.map(id => id.toString()),
      missions: mission.missions.map(id => id.toString()),
      eligible_users:
        mission.eligible_users === 'ALL'
          ? 'ALL'
          : mission.eligible_users.map(id => id.toString()),
    };

    res.status(201).json({ data: formattedMission });
  } catch (error) {
    console.error('Error in create mission:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.create = create;

const list = async (req, res) => {
  try {
    const { pageSize = null, page = null, search = '', type = null, status = null } = req.body;
    let query = {};

    if (search) {
      query.$text = { $search: search };
    }

    if (type) {
      query.type = type;
    }

    if (status !== null) {
      query.status = status;
    }

    const count = await models_1.Missions.countDocuments(query);

    let results;
    if (!pageSize || !page) {
      results = await models_1.Missions.find(query)
        .sort({ createdAt: -1 })
        .lean();
    } else {
      results = await models_1.Missions.find(query)
        .limit(pageSize)
        .skip((page - 1) * pageSize)
        .sort({ createdAt: -1 })
        .lean();
    }

    const formattedResults = results.map(mission => ({
      ...mission,
      _id: mission._id.toString(),
      shops: mission.shops.map(id => id.toString()),
      missions: mission.missions.map(id => id.toString()),
      eligible_users:
        mission.eligible_users === 'ALL'
          ? 'ALL'
          : mission.eligible_users.map(id => id.toString()),
    }));

    res.json({ data: { results: formattedResults, count } });
  } catch (error) {
    console.error('Error in list missions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.list = list;

const label = async (req, res) => {
  try {
    const { search = '', type = null, status = null } = req.body;
    let query = {};

    if (search) {
      query.$text = { $search: search };
    }

    if (type) {
      query.type = type;
    }

    if (status !== null) {
      query.status = status;
    }

    const missions = await models_1.Missions.find(query)
      .select('title _id')
      .sort({ title: 1 })
      .lean();

    const formattedMissions = missions.map(mission => ({
      name: mission.title,
      value: mission._id.toString(),
    }));

    res.json({ data: formattedMissions });
  } catch (error) {
    console.error('Error in getMissionsLabel:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.label = label;

const updateOne = async (req, res) => {
  try {
    const missionData = req.body;
    const missionId = req.params._id;

    console.log('Updating mission with ID:', missionId);
    console.log('Mission data:', missionData);

    if (missionData.private_mission && missionData.eligible_users === 'ALL') {
      return res.status(200).json({ message: 'Private missions must specify eligible users as an array' });
    }
    if (!missionData.private_mission && missionData.eligible_users !== 'ALL') {
      return res.status(200).json({ message: 'Non-private missions must have eligible_users set to ALL' });
    }

    if (Array.isArray(missionData.shops)) {
      missionData.shops = missionData.shops.map(id => new mongoose_1.default.Types.ObjectId(id));
    }
    if (Array.isArray(missionData.missions)) {
      missionData.missions = missionData.missions.map(id => new mongoose_1.default.Types.ObjectId(id));
    }
    if (Array.isArray(missionData.eligible_users)) {
      missionData.eligible_users = missionData.eligible_users.map(id => new mongoose_1.default.Types.ObjectId(id));
    }

    const mission = await models_1.Missions.findByIdAndUpdate(
      missionId,
      missionData,
      { new: true, runValidators: true }
    ).lean();

    if (!mission) {
      console.log('Mission not found in database for ID:', missionId);
      return res.status(404).json({ message: 'Mission not found' });
    }

    const formattedMission = {
      ...mission,
      _id: mission._id.toString(),
      shops: mission.shops.map(id => id.toString()),
      missions: mission.missions.map(id => id.toString()),
      eligible_users:
        mission.eligible_users === 'ALL'
          ? 'ALL'
          : mission.eligible_users.map(id => id.toString()),
    };

    res.json({ data: formattedMission });
  } catch (error) {
    console.error('Error in updateOne mission:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.updateOne = updateOne;

const deleteOne = async (req, res) => {
  try {
    const missionId = req.params._id;
    console.log('Deleting mission with ID:', missionId);

    const result = await models_1.Missions.deleteOne({
      _id: missionId,
    });

    if (result.deletedCount === 0) {
      console.log('Mission not found in database for ID:', missionId);
      return res.status(404).json({ message: 'Mission not found' });
    }

    res.json({ data: { message: 'Mission deleted successfully' } });
  } catch (error) {
    console.error('Error in deleteOne mission:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.deleteOne = deleteOne;