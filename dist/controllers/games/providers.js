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
exports.deleteOne = exports.updateOne = exports.create = exports.label = exports.list = exports.getOne = exports.get = void 0;
const base_1 = require("../base");
const models_1 = require("../../models");
const mongoose_1 = require("mongoose");
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.GameProviders.find().sort({
        status: -1,
        api_type: 1,
        order: 1,
        type: 1,
        createdAt: -1,
    });
    res.json(result);
});
exports.get = get;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.GameProviders.findOne({
        _id: (0, base_1.ObjectId)(req.params.id),
    });
    res.json(result);
});
exports.getOne = getOne;
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { pageSize = null, page = null, search = '' } = req.body;
    let query = { api_type: 'timelesstech' };
    if (search) {
        query = Object.assign(Object.assign({}, query), { $or: [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
                { type: { $regex: search, $options: 'i' } },
                { api_type: { $regex: search, $options: 'i' } },
                // Check for valid ObjectId before searching in `_id`
                ...(mongoose_1.default.Types.ObjectId.isValid(search) ? [{ _id: new mongoose_1.default.Types.ObjectId(search) }] : []),
            ] });
    }
    const count = yield models_1.GameProviders.countDocuments(query);
    if (!pageSize || !page) {
        const results = yield models_1.GameProviders.find(query).sort({
            status: -1,
            api_type: 1,
            order: 1,
            type: 1,
            createdAt: -1,
        });
        res.json({ results, count });
    }
    else {
        const results = yield models_1.GameProviders.find(query)
            .limit(pageSize)
            .skip((page - 1) * pageSize)
            .sort({
            status: -1,
            api_type: 1,
            order: 1,
            type: 1,
            createdAt: -1,
        });
        res.json({ results, count });
    }
});
exports.list = list;
const label = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const results = yield models_1.GameProviders.aggregate([
        {
            $match: { status: true },
        },
        {
            $project: {
                label: '$name',
                value: '$code',
                _id: 0,
            },
        },
        {
            $sort: {
                label: 1,
            },
        },
    ]);
    res.json(results);
});
exports.label = label;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.GameProviders.create(req.body);
    res.json(result);
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.GameProviders.findByIdAndUpdate((0, base_1.ObjectId)(req.params.id), req.body, { new: true });
    res.json(result);
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.GameProviders.deleteOne({
        _id: (0, base_1.ObjectId)(req.params.id),
    });
    res.json(result);
});
exports.deleteOne = deleteOne;



// const createVendorsFromGameHistories = async () => {
//   try {
//     console.log('Starting createVendorsFromGameHistories');

//     const uniqueVendors = await models_1.GameLists.aggregate([
//       {
//         $match: {
//           'details.vendor': { $exists: true, $ne: null },
//         },
//       },
//       {
//         $group: {
//           _id: '$details.vendor',
//         },
//       },
//       {
//         $sort: {
//           _id: 1,
//         },
//       },
//     ]);

//     console.log('Unique vendors found:', uniqueVendors);

//     const vendorsToInsert = uniqueVendors.map(vendor => ({
//       value: vendor._id,
//       name: vendor._id
//         .split('-')
//         .map(word => word.charAt(0).toUpperCase() + word.slice(1))
//         .join(' '),
//     }));

//     console.log('Vendors to insert:', vendorsToInsert);

//     const existingVendors = await models_1.Vendors.find({
//       value: { $in: vendorsToInsert.map(v => v.value) },
//     }).select('value');

//     console.log('Existing vendors:', existingVendors);

//     const existingVendorValues = new Set(existingVendors.map(v => v.value));
//     const newVendors = vendorsToInsert.filter(v => !existingVendorValues.has(v.value));

//     console.log('New vendors to insert:', newVendors);

//     if (newVendors.length > 0) {
//       await models_1.Vendors.insertMany(newVendors, { ordered: false });
//       console.log('Inserted new vendors:', newVendors.length);
//     } else {
//       console.log('No new vendors to insert');
//     }

//     const allVendors = await models_1.Vendors.find().lean();

//     console.log('All vendors in games_vendors:', allVendors);

//     const formattedVendors = allVendors.map(vendor => ({
//       vendor: vendor.value,
//       name: vendor.name,
//     }));

//     console.log('Formatted response:', formattedVendors);

//     return formattedVendors;
//   } catch (error) {
//     console.error('Error in createVendorsFromGameHistories:', error);
//     throw new Error('Failed to create vendors');
//   }
// };

const getVendors = async (req, res) => {
  try {
    const { search = '' } = req.body;
    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { value: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const vendors = await models_1.Vendors.find(query).select('value name').lean();

    const results = vendors.map(vendor => ({
      vendor: vendor.value,
      name: vendor.name,
    }));

    res.json(results);
  } catch (error) {
    console.error('Error in getVendors:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

exports.getVendors = getVendors;
