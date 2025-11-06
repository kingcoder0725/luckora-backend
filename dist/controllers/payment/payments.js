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
exports.approveWithdrawal = exports.deleteOne = exports.updateOne = exports.create = exports.csv = exports.list = exports.getOne = exports.get = exports.callback = void 0;
const crypto = require("crypto");
const mongoose_1 = require("mongoose");
const models_1 = require("../../models");
const base_1 = require("../base");
const timelesstech_1 = require("../games/timelesstech");
const own_affiliate_1 = require("../../utils/own_affilate");
const IPN_SECRET_KEY = process.env.IPN_SECRET_KEY;
const NOW_PAYMENT_API = process.env.NOW_PAYMENT_API;
const aggregateQuery = [
    {
        $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
        },
    },
    {
        $lookup: {
            from: 'currencies',
            localField: 'currencyId',
            foreignField: '_id',
            as: 'currency',
        },
    },
    {
        $unwind: '$user',
    },
    {
        $unwind: '$currency',
    },
    {
        $project: {
            'currency.abi': 0,
        },
    },
    {
        $sort: { createdAt: -1 },
    },
];
// export const checkDepositBonus = async ({ balanceId, paymentsId, deposit_amount, currency }: PaymentBonusCheck) => {
//     try {
//         const EVENT_REQ = ["campaign_free_bet", "campaign_free_spin", "free_spin_bonus"];
//         const balance = await Balances.findById(balanceId).populate('userId');
//         const user = balance.userId;
//         if (!balance) return false;
//         // affiliate
//         if (user.affiliate && deposit_amount && paymentsId && currency) {
//             const param = {
//                 playerid: user._id,
//                 transaction_id: paymentsId,
//                 local_amount: deposit_amount,
//                 local_currency: currency
//             }
//             await depositPostBack(param);
//         }
//         //
//         const currentDate = new Date();
//         const bonus = await Bonus.find({
//             event: { $in: EVENT_REQ },
//             currency: balance.currency._id,
//             deposit_amount: { $gte: deposit_amount },
//             status: true,
//         });
//         bonus.forEach(async (row) => {
//             if (!row.players.includes("all") && !row.players.includes(String(user._id)))
//                 return;
//             if (!row.country.includes("all") && !row.country.includes(String(user.country_reg)))
//                 return;
//             const startDate = new Date(row.date[0]);
//             const endDate = new Date(row.date[1]);
//             if (currentDate < startDate || currentDate > endDate)
//                 return;
//             const exists = await BonusHistories.findOne({
//                 bonusId: row._id,
//                 userId: user._id,
//             });
//             let bonushis: any = null;
//             if (exists) return;
//             bonushis = await BonusHistories.create({
//                 bonusId: row._id,
//                 userId: user._id,
//                 paymentsId,
//                 amount: row.amount,
//                 event: row.event,
//                 isDeposit: true,
//                 finished: false
//             });
//         });
//     } catch (err) {
//         console.error(err);
//         return false;
//     }
// }
const callback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const nowpaymentSig = req.headers['x-nowpayments-sig'];
        const hmac = crypto.createHmac('sha512', IPN_SECRET_KEY);
        hmac.update(JSON.stringify(req.body, Object.keys(req.body).sort()));
        const signature = hmac.digest('hex');
        console.log('==============now callback==============');
        console.log(req.body, nowpaymentSig, signature);
        console.log('==============req.body==============');
        // if (signature == nowpaymentSig) {
        const { payment_id, pay_amount, pay_address, actually_paid, payment_status, type } = req.body;
        if (type !== 'crypto2crypto')
            return res.json(true);
        let payment = yield models_1.Payments.findOne({
            paymentId: payment_id,
            // status_text: payment_status
        });
        if (!payment && actually_paid > 0) {
            const oldpayment = yield models_1.Payments.findOne({
                pay_address: pay_address,
            });
            payment = yield models_1.Payments.findOneAndUpdate({ paymentId: payment_id }, {
                userId: oldpayment.userId,
                currencyId: oldpayment.currencyId,
                balanceId: oldpayment.balanceId,
                amount: pay_amount,
                address: pay_address,
                status: -3,
                ipn_type: 'deposit',
                status_text: 'pending',
            }, { upsert: true, new: true });
        }
        console.log('payment', payment);
        let status = -3;
        let status_text = '';
        if (payment && payment.status_text !== payment_status) {
            status_text = payment_status;
            switch (payment_status) {
                case 'finished':
                    status_text = 'confirmed';
                    status = 3;
                    console.log('payment.userId', payment.userId);
                    yield models_1.Balances.findByIdAndUpdate(payment.balanceId, { $inc: { balance: actually_paid } });
                    // await checkDepositBonus({ balanceId: payment.balanceId, paymentsId: payment._id, deposit_amount: actually_paid, currency: payment.currency })
                    break;
                case 'failed':
                    status_text = 'canceled';
                    if (actually_paid > 0) {
                        yield models_1.Balances.findByIdAndUpdate(payment.balanceId, { $inc: { balance: actually_paid } });
                        // await checkDepositBonus({ balanceId: payment.balanceId, paymentsId: payment._id, deposit_amount: actually_paid, currency: payment.currency })
                    }
                    status = -4;
                    break;
                case 'refunded':
                    status = -5;
                    break;
                case 'expired':
                    status = -6;
                    break;
                default:
                    break;
            }
            yield models_1.Payments.updateOne({ paymentId: payment_id }, {
                status,
                actually_paid,
                status_text,
                data: JSON.stringify(req.body),
            });
        }
        // } else {
        //   console.log('depositNowpay signature error!');
        // }
        res.json(true);
    }
    catch (e) {
        console.log(e, 'error');
        return res.status(400).json('Interanal server error');
    }
});
exports.callback = callback;
const get = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const results = yield models_1.Payments.aggregate(aggregateQuery);
    res.json(results);
});
exports.get = get;
const getOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Payments.aggregate([{ $match: { _id: (0, base_1.ObjectId)(req.params.id) } }, ...aggregateQuery]);
    res.json(result[0]);
});
exports.getOne = getOne;

const list = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { pageSize = null, page = null, userId = null, type = null, currency = null, sort = null, column = null, date = null, method, search = '', } = req.body;
    let query = {};
    const query2 = {};
    let sortQuery = { createdAt: -1 };
    if (userId) {
        query.userId = (0, base_1.ObjectId)(userId);
    }
    if (type) {
        query.ipn_type = type;
    }
    if (currency) {
        query.currencyId = (0, base_1.ObjectId)(currency);
    }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    if (column) {
        sortQuery = { [column]: sort ? sort : 1 };
    }
    if (method !== '' && method !== undefined) {
        query.method = method;
    }
    if (search) {
        query = Object.assign(Object.assign({}, query), { $or: [
                { address: { $regex: search, $options: 'i' } },
                { currency: { $regex: search, $options: 'i' } },
                { ipn_type: { $regex: search, $options: 'i' } },
                { status_text: { $regex: search, $options: 'i' } },
                // Check for valid ObjectId before searching in `_id`
                ...(mongoose_1.default.Types.ObjectId.isValid(search) ? [{ _id: new mongoose_1.default.Types.ObjectId(search) }] : []),
            ] });
    }
    let count = 0;
    if (req.user && req.user.rolesId.type === 'agent') {
        query2['user.creatorId'] = req.user._id;
        const results = yield models_1.Payments.aggregate([{ $match: query }, ...aggregateQuery, { $match: query2 }]);
        count = results.length;
    }
    else {
        count = yield models_1.Payments.countDocuments(query);
    }
    if (!pageSize || !page) {
        const results = yield models_1.Payments.aggregate([{ $match: query }, ...aggregateQuery, { $match: query2 }, { $sort: sortQuery }]);
        res.json({ results, count });
    }
    else {
        const results = yield models_1.Payments.aggregate([
            { $match: query },
            ...aggregateQuery,
            { $match: query2 },
            { $sort: sortQuery },
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize },
        ]);
        res.json({ results, count });
    }
});
exports.list = list;

const csv = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId = null, type = null, currency = null, sort = null, column = null, date = null, method } = req.body;
    const query = {};
    const query2 = {};
    let sortQuery = { createdAt: -1 };
    if (userId) {
        query.userId = (0, base_1.ObjectId)(userId);
    }
    if (type) {
        query.ipn_type = type;
    }
    if (date && date[0] && date[1]) {
        query.createdAt = { $gte: new Date(date[0]), $lte: new Date(date[1]) };
    }
    if (column) {
        sortQuery = { [column]: sort ? sort : 1 };
    }
    if (currency) {
        query.currencyId = currency;
    }
    if (method !== '' && method !== undefined) {
        query.method = method;
    }
    if (req.user && req.user.rolesId.type === 'agent') {
        query2['user.creatorId'] = req.user._id;
    }
    const results = yield models_1.Payments.aggregate([
        { $match: query },
        ...aggregateQuery,
        { $match: query2 },
        { $sort: sortQuery },
        {
            $project: {
                _id: 0,
                ID: '$_id',
                Username: '$user.username',
                Email: '$user.email',
                TransactionHash: '$txn_id',
                Amount: {
                    $concat: [{ $convert: { input: '$amount', to: 'string' } }, ' ', '$currency.symbol'],
                },
                Address: '$address',
                Status: '$status_text',
                Type: '$ipn_type',
                CreatedAt: '$updatedAt',
            },
        },
    ]);
    res.json(results);
});
exports.csv = csv;
const create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Payments.create(req.body);
    res.json(result);
});
exports.create = create;
const updateOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = { _id: (0, base_1.ObjectId)(req.params.id) };
    yield models_1.Payments.updateOne(query, req.body);
    const result = yield models_1.Payments.aggregate([{ $match: query }, ...aggregateQuery]);
    res.json(result[0]);
});
exports.updateOne = updateOne;
const deleteOne = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Payments.deleteOne({ _id: (0, base_1.ObjectId)(req.params.id) });
    res.json(result);
});
exports.deleteOne = deleteOne;

// const approveWithdrawal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
//     const { status, paymentId } = req.body;
//     if (status === 'pending') {
//         yield models_1.Payments.updateOne({ _id: (0, base_1.ObjectId)(paymentId) }, { status: -2, status_text: 'pending' });
//         return res.json(true);
//     }
//     else if (status === 'approve') {
//         const payment = yield models_1.Payments.findByIdAndUpdate({ _id: (0, base_1.ObjectId)(paymentId) }, {
//             status: 105,
//             status_text: 'approve',
//         });
//         const balance = yield models_1.Balances.findByIdAndUpdate(payment.balanceId);
//         if (balance.balance < payment.fiat_amount)
//             return res.status(429).json('Player Balance is not enough!');
//         return res.json(true);
//     }
//     else if (status === 'confirmed') {
//         const payment = yield models_1.Payments.findById(paymentId);
//         const balance = yield models_1.Balances.findByIdAndUpdate(payment.balanceId);
//         if (balance.balance < payment.fiat_amount)
//             return res.status(429).json('Player Balance is not enough!');
//         yield models_1.Payments.updateOne({ _id: payment._id }, { status: 2, status_text: 'confirmed', actually_paid: payment.amount });
//         yield models_1.BonusHistories.updateOne({
//             userId: payment.userId,
//             $or: [
//                 {
//                     status: 'active',
//                 },
//                 // {
//                 //     status: 'processing',
//                 // },
//             ],
//         }, { status: 'canceled' });
//         yield (0, base_1.balanceUpdate)({
//             req,
//             balanceId: payment.balanceId,
//             amount: payment.fiat_amount * -1,
//             type: 'withdrawal',
//         });
//         yield (0, timelesstech_1.cancelCampaign)(payment.userId);
//         return res.json(true);
//     }
//     else if (status === 'canceled') {
//         yield models_1.Payments.updateOne({ _id: (0, base_1.ObjectId)(paymentId) }, { status: -1, status_text: 'canceled' });
//         // await balanceUpdate({
//         //     req,
//         //     balanceId: payment.balanceId,
//         //     amount: payment.fiat_amount,
//         //     type: 'withdrawal-canceled'
//         // });
//         return res.json(true);
//     }
// });
// exports.approveWithdrawal = approveWithdrawal;

const approveWithdrawal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { status, paymentId } = req.body;

    // Проверяем, что paymentId валиден
    if (!paymentId || !mongoose_1.Types.ObjectId.isValid(paymentId)) {
        return res.status(400).json('Invalid paymentId');
    }

    if (status === 'pending') {
        yield models_1.Payments.updateOne(
            { _id: new mongoose_1.Types.ObjectId(paymentId) },
            { $set: { status: -2, status_text: 'pending' } }
        );
        return res.json(true);
    } else if (status === 'approve') {
        const payment = yield models_1.Payments.findByIdAndUpdate(
            new mongoose_1.Types.ObjectId(paymentId),
            { $set: { status: 105, status_text: 'approve' } },
            { new: true }
        );

        if (!payment) {
            return res.status(404).json('Payment not found');
        }

        if (!payment.balanceId || !mongoose_1.Types.ObjectId.isValid(payment.balanceId)) {
            return res.status(400).json('Invalid balanceId');
        }

        const balance = yield models_1.Balances.findById(payment.balanceId);
        if (!balance) {
            return res.status(404).json('Balance not found');
        }

        if (balance.balance < payment.fiat_amount) {
            return res.status(429).json('Player Balance is not enough!');
        }

        return res.json(true);
    } else if (status === 'confirmed') {
        const payment = yield models_1.Payments.findById(paymentId);
        if (!payment) {
            return res.status(404).json('Payment not found');
        }

        if (!payment.balanceId || !mongoose_1.Types.ObjectId.isValid(payment.balanceId)) {
            return res.status(400).json('Invalid balanceId');
        }

        const balance = yield models_1.Balances.findById(payment.balanceId);
        if (!balance) {
            return res.status(404).json('Balance not found');
        }

        if (balance.balance < payment.fiat_amount) {
            return res.status(429).json('Player Balance is not enough!');
        }

        yield models_1.Payments.updateOne(
            { _id: payment._id },
            { $set: { status: 2, status_text: 'confirmed', actually_paid: payment.amount } }
        );

        yield models_1.BonusHistories.updateOne(
            {
                userId: payment.userId,
                $or: [{ status: 'active' }],
            },
            { $set: { status: 'canceled' } }
        );

        yield (0, base_1.balanceUpdate)({
            req,
            balanceId: payment.balanceId,
            amount: payment.fiat_amount * -1,
            type: 'withdrawal',
        });

        yield (0, timelesstech_1.cancelCampaign)(payment.userId);
        const user = yield models_1.Users.findById(payment.userId);
        if (user.affiliate) {
        try {
            yield (0, own_affiliate_1.withdrawalPostBack)(
                payment.userId.toString(),
                user.username,
                payment._id.toString(),
                payment.fiat_amount,
                balance.currency.symbol
            );
        } catch (error) {
            console.error('Error in withdrawalPostBack:', error);
        }
    }

        return res.json(true);
    } else if (status === 'canceled') {
        yield models_1.Payments.updateOne(
            { _id: new mongoose_1.Types.ObjectId(paymentId) },
            { $set: { status: -1, status_text: 'canceled' } }
        );
        return res.json(true);
    } else {
        return res.status(400).json('Invalid status');
    }
});
exports.approveWithdrawal = approveWithdrawal;

// const checkExchangeStatus = async () => {
//     try {
//         const datas = await Exchanges.find({ status: "WAITING" });
//         console.log("//check//Exchange//Status", datas.length);
//         if (!datas.length) return false;
//         const token = await authNOW();
//         if (!token) return false;
//         for (const key in datas) {
//             if (Object.prototype.hasOwnProperty.call(datas, key)) {
//                 const element = datas[key];
//                 const res = await axios.get(`${NOW_PAYMENT_API}/v1/conversion/${element.id}`, {
//                     headers: {
//                         "Authorization": `Bearer ${token}`
//                     }
//                 });
//                 if (res?.data) {
//                     const { result } = res.data;
//                     console.log(result, "==>result");
//                     await Exchanges.updateOne({ id: element.id }, { status: result.status });
//                     if (result.status === "FINISHED") {
//                         await Balances.updateOne({ userId: element.userId, currency: element.to_currency_id }, { $inc: { balance: result.to_amount } });
//                     }
//                     if (result.status === "REJECTED") {
//                         await Balances.updateOne({ userId: element.userId, currency: element.from_currency_id }, { $inc: { balance: result.from_amount } });
//                     }
//                 }
//             }
//         }
//     } catch (err) {
//         console.error(err);
//         return false;
//     }
// }
// const job = new CronJob(process.env.EXCHANGE_TIME as string, () => {
//     checkExchangeStatus();
// });
// job.start();
