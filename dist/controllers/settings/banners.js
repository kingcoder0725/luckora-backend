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
exports.getBanners = exports.deleteOne = exports.updateOne = exports.create = exports.list = exports.getOne = exports.get = void 0;
const base_1 = require("../base");
const models_1 = require("../../models");
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const ip = (0, base_1.getIPAddress)(req);
    const userAgent = req.headers['user-agent'] || '';
    
    // Determine device type from user agent
    let deviceType = 'desktop';
    if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
        deviceType = 'mobile';
    } else if (/Tablet|iPad/i.test(userAgent)) {
        deviceType = 'laptop';
    }
    
    if (ip === null || ip === void 0 ? void 0 : ip.country) {
        const data = yield models_1.Banners.find({ country: ip.country, status: true });
        if (data.length) {
            // Add adaptive image based on device type
            const adaptedData = data.map(banner => {
                const adaptedBanner = banner.toObject();
                // Use device-specific image if available, otherwise fallback to default
                if (deviceType === 'mobile' && adaptedBanner.image_mobile) {
                    adaptedBanner.adaptiveImage = adaptedBanner.image_mobile;
                } else if (deviceType === 'laptop' && adaptedBanner.image_laptop) {
                    adaptedBanner.adaptiveImage = adaptedBanner.image_laptop;
                } else if (adaptedBanner.image_desktop) {
                    adaptedBanner.adaptiveImage = adaptedBanner.image_desktop;
                } else {
                    adaptedBanner.adaptiveImage = adaptedBanner.image;
                }
                return adaptedBanner;
            });
            return res.json(adaptedData);
        }
    }
    const result = yield models_1.Banners.find({ country: "all", status: true });
    const adaptedResult = result.map(banner => {
        const adaptedBanner = banner.toObject();
        // Use device-specific image if available, otherwise fallback to default
        if (deviceType === 'mobile' && adaptedBanner.image_mobile) {
            adaptedBanner.adaptiveImage = adaptedBanner.image_mobile;
        } else if (deviceType === 'laptop' && adaptedBanner.image_laptop) {
            adaptedBanner.adaptiveImage = adaptedBanner.image_laptop;
        } else if (adaptedBanner.image_desktop) {
            adaptedBanner.adaptiveImage = adaptedBanner.image_desktop;
        } else {
            adaptedBanner.adaptiveImage = adaptedBanner.image;
        }
        return adaptedBanner;
    });
    return res.json(adaptedResult);
});
exports.get = get;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Banners.findOne({ _id: (0, base_1.ObjectId)(req.params.id) });
    res.json(result);
});
exports.getOne = getOne;
const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { pageSize = null, page = null, status, country, type } = req.body;
    const query = {};
    if (status !== '' && status !== undefined)
        query.status = status;
    if (country !== '' && country !== undefined)
        query.country = country;
    if (type !== '' && type !== undefined)
        query.type = type;
    const count = yield models_1.Banners.countDocuments(query);
    if (!pageSize || !page) {
        const results = yield models_1.Banners.find(query).sort({ createdAt: -1, type: 1, country: 1 });
        res.json({ results, count });
    }
    else {
        const results = yield models_1.Banners.find(query)
            .limit(pageSize)
            .skip((page - 1) * pageSize)
            .sort({ createdAt: -1, type: 1, country: 1 });
        res.json({ results, count });
    }
});
exports.list = list;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Banners.create(req.body);
    res.json(result);
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Banners.findByIdAndUpdate((0, base_1.ObjectId)(req.params.id), req.body, { new: true });
    res.json(result);
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Banners.deleteOne({
        _id: (0, base_1.ObjectId)(req.params.id)
    });
    res.json(result);
});
exports.deleteOne = deleteOne;
const getBanners = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Banners.find({ status: true }).sort({ order: 1 }).select({
        _id: 0,
        icon: 1,
        link: 1,
        name: 1
    });
    res.json(result);
});
exports.getBanners = getBanners;
