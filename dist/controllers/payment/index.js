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
exports.getActiveCrypto = exports.calcUsetToCrypto = exports.submitCrypto = exports.withdrawal = exports.coinRemitterCallback = exports.generateAddress = exports.getAddress = exports.getCoinremitterCurrencies = exports.getPaymentsPeriod = exports.omnnoHook = exports.createOmnoTx = exports.getCurrenciesFiat = exports.getFiatNowpay = exports.exchangeNowpay = exports.createNowpay = exports.getPaymentMethod = exports.removePendingPayment = exports.withdrawalTimer = exports.getAdminBalance = exports.updateBalance = exports.UpdatePrices = exports.useCurrency = exports.addRemoveCurrency = exports.getBalances = exports.getCurrencies = exports.getTransactions = exports.getTransactionResult = exports.cancelWithdrawal = exports.depositSolana = exports.depositEthereum = exports.deposit = void 0;
const axios_1 = require("axios");
const request = require("request");
const moment = require("moment-timezone");
const units_1 = require("@ethersproject/units");
const { LAMPORTS_PER_SOL } = require('@solana/web3.js');
const base_1 = require("../base");
const models_1 = require("../../models");
const coinpayment_1 = require("./coinpayment");
const ethereum_1 = require("./ethereum");
const solana_1 = require("./solana");
const omno_1 = require("../../utils/omno");
const timelesstech_1 = require("../games/timelesstech");
const affiliate_1 = require("../../utils/affiliate");
const own_affiliate_1 = require("../../utils/own_affilate");
const coinremitter_1 = require("../../utils/coinremitter");
const utils_1 = require("../../utils");
const tracking_1 = require("../journey/tracking");
const IPN = require('coinpayments-ipn');
const ipn_url = `${process.env.API_URL}${process.env.IPN_URL}`;
const depositAddress = process.env.E_D_PUBLIC_ADDRESS;
const widthrawAddress = process.env.E_W_PUBLIC_ADDRESS;
const solanaAddress = process.env.S_W_PUBLIC_ADDRESS;
const NOW_PAYMENT_API = process.env.NOW_PAYMENT_API;
const NOW_PAYMENT_API_KEY = process.env.NOW_PAYMENT_API_KEY;
const NOW_PAYMENT_CALL_BACK = process.env.NOW_PAYMENT_CALL_BACK;
const MIN_DEPOSIT_USD = 10;
const deposit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, balanceId, currencyId } = req.body;
    if (!userId || !balanceId || !currencyId) {
        res.status(400).json('Invalid field!');
        return;
    }
    const currency = yield models_1.Currencies.findById((0, base_1.ObjectId)(currencyId));
    if (!currency) {
        res.status(400).json('Invalid field!');
        return;
    }
    else if (!currency.deposit) {
        res.status(400).json('Deposit disabled!');
        return;
    }
    const balance = yield models_1.Balances.findOne({
        userId: (0, base_1.ObjectId)(userId),
        _id: (0, base_1.ObjectId)(balanceId),
        currency: (0, base_1.ObjectId)(currencyId),
    });
    if (!balance) {
        res.status(400).json('Invalid field!');
        return;
    }
    const payment = yield models_1.Payments.create({
        userId,
        balanceId,
        currencyId: currency._id,
        currency: currency.payment,
        status: 0,
        method: 1,
        ipn_type: 'deposit',
        status_text: 'pending',
    });
    try {
        const result = yield coinpayment_1.coinpayment.getCallbackAddress({
            currency: currency.payment,
            label: String(payment._id),
            ipn_url,
        });
        res.json(result);
    }
    catch (error) {
        yield models_1.Payments.deleteOne({ _id: payment._id });
        if (error.code === 'ENOTFOUND') {
            res.status(400).json('Server error!');
        }
        else {
            res.status(400).json(error.extra.data.error);
        }
    }
});
exports.deposit = deposit;
const depositEthereum = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, balanceId, currencyId, txn_id, amounti, address, from } = req.body;
    const currency = yield models_1.Currencies.findById(currencyId);
    const balances = yield models_1.Balances.findOne({
        userId: (0, base_1.ObjectId)(userId),
        _id: (0, base_1.ObjectId)(balanceId),
        currency: (0, base_1.ObjectId)(currencyId),
    });
    if (!balances) {
        res.status(400).json('Invalid field!');
        return;
    }
    const amount = amounti / Math.pow(10, currency.decimals);
    const result = yield models_1.Payments.findOne({ txn_id });
    if (result) {
        res.json({});
        return;
    }
    const payment = yield models_1.Payments.findOneAndUpdate({ txn_id }, {
        userId,
        balanceId,
        currencyId: currencyId,
        currency: currency.payment,
        amount,
        address,
        status: 1,
        method: 0,
        ipn_type: 'deposit',
        status_text: 'deposited',
        txn_id,
    }, { upsert: true, new: true });
    res.json(payment);
    let timeout = 0;
    let timer = null;
    function timerfunc() {
        return __awaiter(this, void 0, void 0, function* () {
            const paymentResult = yield models_1.Payments.findById((0, base_1.ObjectId)(payment._id));
            if (paymentResult.status === 100 || paymentResult.status === -1) {
                if (timer) {
                    clearTimeout(timer);
                    return;
                }
            }
            else {
                const responseReceipt = yield ethereum_1.EthereumWeb3.eth.getTransactionReceipt(txn_id);
                if (responseReceipt && (responseReceipt === null || responseReceipt === void 0 ? void 0 : responseReceipt.status)) {
                    const response = yield ethereum_1.EthereumWeb3.eth.getTransaction(txn_id);
                    if ((response === null || response === void 0 ? void 0 : response.input) === '0x') {
                        if (response.to &&
                            address === 'ether' &&
                            amounti === response.value &&
                            from.toLowerCase() === response.from.toLowerCase() &&
                            response.to.toLowerCase() === (depositAddress === null || depositAddress === void 0 ? void 0 : depositAddress.toLowerCase())) {
                            yield models_1.Payments.findByIdAndUpdate((0, base_1.ObjectId)(payment._id), { status: 100, status_text: 'confirmed' }, { new: true });
                            yield (0, base_1.balanceUpdate)({
                                req,
                                balanceId,
                                amount,
                                type: 'deposit-metamask',
                            });

                            const balance = yield models_1.Balances.findById(balanceId).populate('userId');
                            const user = yield models_1.Users.findById(balance.userId);
if (balance && balance.userId && user.affiliate) {
    try {
        yield (0, own_affiliate_1.depositPostBack)(
            balance.userId._id,
            user.username,
            txn_id,
            amount,
            currency.symbol
        );
    } catch (error) {
        console.error('[depositPostBack] Error in ethereum deposit:', error);
    }
}
                            if (timer) {
                                clearTimeout(timer);
                                return;
                            }
                        }
                        else {
                            if (timer) {
                                clearTimeout(timer);
                                return;
                            }
                        }
                    }
                    else {
                        const erc20TransferABI = [
                            { type: 'address', name: 'receiver' },
                            { type: 'uint256', name: 'amount' },
                        ];
                        const decoded = ethereum_1.EthereumWeb3.eth.abi.decodeParameters(erc20TransferABI, response.input.slice(10));
                        if (response.to &&
                            amounti === decoded.amount &&
                            from.toLowerCase() === response.from.toLowerCase() &&
                            address.toLowerCase() === response.to.toLowerCase() &&
                            decoded.receiver.toLowerCase() === (depositAddress === null || depositAddress === void 0 ? void 0 : depositAddress.toLowerCase())) {
                            yield models_1.Payments.findByIdAndUpdate((0, base_1.ObjectId)(payment._id), { status: 100, status_text: 'confirmed' }, { new: true });
                            yield (0, base_1.balanceUpdate)({
                                req,
                                balanceId,
                                amount,
                                type: 'deposit-metamask',
                            });
                            if (timer) {
                                clearTimeout(timer);
                                return;
                            }
                        }
                        else {
                            if (timer) {
                                clearTimeout(timer);
                                return;
                            }
                        }
                    }
                }
                else if (responseReceipt) {
                    yield models_1.Payments.updateOne({ _id: payment._id }, { status: -1, status_text: 'canceled' });
                    if (timer) {
                        clearTimeout(timer);
                        return;
                    }
                }
            }
            timeout++;
            timer = setTimeout(timerfunc, 10000);
            if (timeout === 360) {
                if (timer) {
                    clearTimeout(timer);
                    return;
                }
            }
        });
    }
    timer = setTimeout(timerfunc, 10000);
});
exports.depositEthereum = depositEthereum;
const depositSolana = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, balanceId, currencyId, txn_id, address, from } = req.body;
    const currency = yield models_1.Currencies.findById(currencyId);
    const balances = yield models_1.Balances.findOne({
        userId: (0, base_1.ObjectId)(userId),
        _id: (0, base_1.ObjectId)(balanceId),
        currency: (0, base_1.ObjectId)(currencyId),
    });
    if (!balances) {
        res.status(400).json('Invalid field!');
        return;
    }
    const result = yield models_1.Payments.findOne({ txn_id });
    if (result) {
        res.json({});
        return;
    }
    const payment = yield models_1.Payments.findOneAndUpdate({ txn_id }, {
        userId,
        balanceId,
        currencyId: currencyId,
        currency: currency.payment,
        address,
        status: 1,
        method: 0,
        ipn_type: 'deposit',
        status_text: 'deposited',
        txn_id,
    }, { upsert: true, new: true });
    res.json(payment);
    let timeout = 0;
    let timer = null;
    function timerfunc() {
        return __awaiter(this, void 0, void 0, function* () {
            const paymentResult = yield models_1.Payments.findById((0, base_1.ObjectId)(payment._id));
            if (paymentResult.status === 100 || paymentResult.status === -1) {
                if (timer) {
                    clearTimeout(timer);
                    return;
                }
            }
            else {
                try {
                    const res = yield (0, solana_1.getTxnSolana)(txn_id);
                    if (!res.status) {
                        yield models_1.Payments.updateOne({ _id: payment._id }, { status: -1, status_text: 'canceled' });
                        if (timer) {
                            clearTimeout(timer);
                            return;
                        }
                    }
                    else {
                        const tResult = res.data.result;
                        if (tResult) {
                            if (tResult.transaction.message.accountKeys[2] == '11111111111111111111111111111111') {
                                const amount = (tResult.meta.preBalances[0] - tResult.meta.postBalances[0] - tResult.meta.fee) / LAMPORTS_PER_SOL;
                                const fromAcc = tResult.transaction.message.accountKeys[0].toLowerCase();
                                const receiverAcc = tResult.transaction.message.accountKeys[1].toLowerCase();
                                if ((from.toLowerCase() == fromAcc || from.toLowerCase() == receiverAcc) &&
                                    (solanaAddress.toLowerCase() == fromAcc || solanaAddress.toLowerCase() == receiverAcc)) {
                                    yield models_1.Payments.findByIdAndUpdate((0, base_1.ObjectId)(payment._id), { status: 100, status_text: 'confirmed', amount }, { new: true });
                                    yield (0, base_1.balanceUpdate)({
                                        req,
                                        balanceId,
                                        amount,
                                        type: 'deposit-solana',
                                    });

                                    const balance = yield models_1.Balances.findById(balanceId).populate('userId');
                                    const user = yield models_1.Users.findById(balance.userId);
if (balance && balance.userId && user.affiliate) {
    try {
        yield (0, own_affiliate_1.depositPostBack)(
            balance.userId._id,
            user.username,
            txn_id,
            amount,
            currency.symbol
        );
    } catch (error) {
        console.error('[depositPostBack] Error in solana deposit:', error);
    }
}

                                    if (timer) {
                                        clearTimeout(timer);
                                        return;
                                    }
                                }
                                else {
                                    if (timer) {
                                        clearTimeout(timer);
                                        return;
                                    }
                                }
                            }
                            else {
                                const preTokenB = tResult.meta.preTokenBalances;
                                const postTokenB = tResult.meta.postTokenBalances;
                                const amount = Math.abs(preTokenB[0].uiTokenAmount.uiAmount - postTokenB[0].uiTokenAmount.uiAmount);
                                const fromAcc = preTokenB[0].owner.toLowerCase();
                                const tokenMintAcc = preTokenB[0].mint.toLowerCase();
                                const receiverAcc = postTokenB[1].owner.toLowerCase();
                                if ((from.toLowerCase() == fromAcc || from.toLowerCase() == receiverAcc) &&
                                    address.toLowerCase() == tokenMintAcc &&
                                    (solanaAddress.toLowerCase() == fromAcc || solanaAddress.toLowerCase() == receiverAcc)) {
                                    yield models_1.Payments.findByIdAndUpdate((0, base_1.ObjectId)(payment._id), { status: 100, status_text: 'confirmed', amount }, { new: true });
                                    yield (0, base_1.balanceUpdate)({
                                        req,
                                        balanceId,
                                        amount,
                                        type: 'deposit-solana',
                                    });
                                    if (timer) {
                                        clearTimeout(timer);
                                        return;
                                    }
                                }
                                else {
                                    if (timer) {
                                        clearTimeout(timer);
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }
                catch (error) {
                    console.log(error);
                }
            }
            timeout++;
            timer = setTimeout(timerfunc, 10000);
            if (timeout === 360) {
                if (timer) {
                    clearTimeout(timer);
                    return;
                }
            }
        });
    }
    timer = setTimeout(timerfunc, 10000);
});
exports.depositSolana = depositSolana;
// export const withdrawal = async (req: Request, res: Response) => {
//     const { userId, balanceId, currencyId, address, amount, method } = req.body;
//     const currency = await Currencies.findById(ObjectId(currencyId));
//     if (!currency) {
//         res.status(400).json('Invalid field!');
//         return;
//     } else if (!currency.withdrawal) {
//         res.status(400).json('Withdrawal disabled!');
//         return;
//     }
//     const _balance = await Balances.findOne({
//         userId: ObjectId(userId),
//         _id: ObjectId(balanceId),
//         currency: ObjectId(currencyId)
//     });
//     if (!_balance || _balance.balance <= 0 || _balance.balance < Number(amount)) {
//         res.status(400).json('Your balance is not enough!');
//         return;
//     }
//     const type = method === 0 ? 'withdrawal-metamask' : 'withdrawal-coinpayment';
//     await balanceUpdate({ req, balanceId, amount: amount * -1, type });
//     await Payments.create({
//         userId,
//         balanceId,
//         currencyId: currency._id,
//         currency: currency.payment,
//         amount,
//         address,
//         method,
//         status: -2,
//         status_text: 'pending',
//         ipn_type: 'withdrawal'
//     });
//     res.json('Succeed!');
// };
const cancelWithdrawal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { _id } = req.body;
        const payment = yield models_1.Payments.findOneAndUpdate({ _id: (0, base_1.ObjectId)(_id) }, { status: -1, status_text: 'canceled' });
        yield (0, base_1.balanceUpdate)({
            req,
            balanceId: payment.balanceId,
            amount: payment.amount,
            type: 'withdrawal-metamask-canceled',
        });
        return res.json(true);
    }
    catch (error) {
        console.error('Error cancelWithdrawal =>', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.cancelWithdrawal = cancelWithdrawal;
const getTransactionResult = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.get(`hmac`) ||
        !req.body ||
        !req.body.ipn_mode ||
        req.body.ipn_mode !== `hmac` ||
        process.env.MERCHANT_ID !== req.body.merchant) {
        res.send('error');
        return;
    }
    const hmac = req.get(`hmac`);
    const ipnSecret = process.env.IPN_SECRET;
    const payload = req.body;
    let isValid;
    try {
        isValid = IPN.verify(hmac, ipnSecret, payload);
    }
    catch (e) {
        res.send('error');
        return;
    }
    if (!(payload === null || payload === void 0 ? void 0 : payload.amount)) {
        console.log(payload);
        return;
    }
    if (isValid) {
        try {
            const { label, address, amount, amounti, currency, ipn_id, ipn_mode, ipn_type, merchant, status, status_text, txn_id } = payload;
            const data = {
                address,
                amount,
                amounti,
                currency,
                ipn_id,
                ipn_mode,
                ipn_type,
                merchant,
                status,
                status_text,
                txn_id,
            };
            if ((0, base_1.NumberFix)(amount, 5) === 0)
                return;
            if (ipn_type === 'deposit') {
                if (!amount || !payload.fee)
                    return console.log(`fee`, payload);
                data.id = payload.deposit_id;
                data.amount = amount - payload.fee;
                data.status_text = status === '100' ? 'confirmed' : data.status_text;
                const result = yield models_1.Payments.findOne({ _id: (0, base_1.ObjectId)(label) });
                if (result && result.status !== 100) {
                    yield models_1.Payments.updateOne({ _id: (0, base_1.ObjectId)(label) }, data);
                    if (status === '100') {
                        (0, base_1.balanceUpdate)({
                            req,
                            balanceId: result.balanceId,
                            amount: amount - payload.fee,
                            type: 'deposit-coinpayment',
                        });
                        const balance = yield models_1.Balances.findById(result.balanceId).populate('userId');
                        const user = yield models_1.Users.findById(balance.userId);
    if (balance && balance.userId && user.affiliate) {
        try {
            yield (0, own_affiliate_1.depositPostBack)(
                balance.userId._id,
                user.username,
                result._id,
                amount - payload.fee,
                currency
            );
        } catch (error) {
            console.error('[depositPostBack] Error in coinpayment callback:', error);
        }
    }
                    }
                }
            }
            else if (ipn_type === 'withdrawal') {
                data.id = payload.id;
                if (status === '2') {
                    data.status_text = 'confirmed';
                }
                else if (status === '-1') {
                    data.status_text = 'canceled';
                }
                else if (status === '-6') {
                    data.status_text = 'canceled';
                }
                else {
                    console.log(data.status_text);
                }
                const result = yield models_1.Payments.findOne({ id: payload.id });
                if (result && result.status !== 2) {
                    yield models_1.Payments.updateOne({ id: payload.id }, data);
                }
            }
            else {
                console.log('isValid deposit withdrawal error');
            }
        }
        catch (error) {
            console.log('isValid', error);
            res.json(error);
        }
    }
    else {
        console.log('hmac error');
    }
});
exports.getTransactionResult = getTransactionResult;
const getTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.body;
        const result = yield models_1.Payments.find({
            userId: (0, base_1.ObjectId)(userId),
            status: { $ne: 0 },
        })
            .populate('currencyId')
            .sort({ createdAt: -1 });
        return res.json(result);
    }
    catch (error) {
        console.error('Error getTransactions =>', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.getTransactions = getTransactions;
const getCurrencies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.Currencies.find({ status: true }).sort({
            order: 1,
            createdAt: 1,
        });
        return res.json(result);
    }
    catch (error) {
        console.error('Error getCurrencies =>', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.getCurrencies = getCurrencies;
const getBalances = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.body;
    const result = yield models_1.Balances.find({
        userId: (0, base_1.ObjectId)(userId),
        disabled: false,
    }).sort({ status: -1, balance: -1 });
    res.json(result);
});
exports.getBalances = getBalances;
const addRemoveCurrency = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = (0, base_1.ObjectId)(req.body.userId);
    const currency = (0, base_1.ObjectId)(req.body.currency);
    const data = yield models_1.Balances.findOne({ userId, currency });
    if (data) {
        const result = yield models_1.Balances.findOneAndUpdate({ userId, currency }, { disabled: !data.disabled, status: false }, { new: true });
        const count = yield models_1.Balances.countDocuments({
            userId,
            disabled: false,
            status: true,
        });
        if (count === 0) {
            yield models_1.Balances.findOneAndUpdate({ userId, disabled: false }, { status: true });
        }
        res.json(result);
    }
    else {
        const result = yield models_1.Balances.create({
            userId,
            currency,
            balance: 0,
            status: false,
            disabled: false,
        });
        res.json(result);
    }
});
exports.addRemoveCurrency = addRemoveCurrency;
const useCurrency = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, currency } = req.body;
    yield models_1.Balances.updateMany({ userId: (0, base_1.ObjectId)(userId) }, { status: false });
    const result = yield models_1.Balances.findOneAndUpdate({ userId: (0, base_1.ObjectId)(userId), currency: (0, base_1.ObjectId)(currency) }, { status: true });
    res.json(result);
});
exports.useCurrency = useCurrency;
const UpdatePrices = () => __awaiter(void 0, void 0, void 0, function* () {
    const currencies = yield models_1.Currencies.find({ coingecko: { $ne: '' } }).select({
        coingecko: 1,
        _id: 0,
    });
    const ids = currencies.map((e) => e.coingecko);
    const id_count = 4;
    const pages = Math.ceil(ids.length / id_count);
    const sendIds = [];
    for (let i = 0; i < pages; i++) {
        let id = [];
        if (i === 0) {
            id = ids.slice(0, i + 1 * id_count);
        }
        else {
            id = ids.slice(i * id_count, (i + 1) * id_count);
        }
        sendIds.push(id.join(','));
    }
    for (const i in sendIds) {
        setTimeout(() => {
            const option1 = {
                method: 'GET',
                url: process.env.GET_PRICE_URL,
                headers: { 'Content-Type': 'application/json' },
                qs: {
                    ids: sendIds[i],
                    vs_currencies: 'usd',
                },
                json: true,
            };
            request(option1, (error, response, body) => __awaiter(void 0, void 0, void 0, function* () {
                if (!error) {
                    for (const i in body) {
                        if (i)
                            yield models_1.Currencies.updateOne({ coingecko: i }, { price: body[i].usd });
                    }
                }
            }));
        }, 1000);
    }
});
exports.UpdatePrices = UpdatePrices;
const updateBalance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { balanceId, amount, type } = req.body;
        const balances = yield models_1.Balances.findById((0, base_1.ObjectId)(balanceId));
        if (type === 'withdrawal' && balances.balance < amount)
            return res.status(400).json('Balances not enough!');
        if (type === 'withdrawal') {
            yield (0, base_1.balanceUpdate)({
                req,
                balanceId,
                amount: amount * -1,
                type: `${type}-admin`,
            });
            yield models_1.Payments.create({
                paymentId: 'admin',
                currencyId: balances.currency._id,
                currency: balances.currency.symbol,
                userId: balances.userId,
                balanceId,
                amount,
                actually_paid: amount,
                address: 'admin',
                status: 2,
                method: 3,
                ipn_type: type,
                status_text: 'confirmed',
                txn_id: 'admin',
            });
        }
        else {
            yield (0, base_1.balanceUpdate)({ req, balanceId, amount, type: `${type}-admin` });
            yield models_1.Payments.create({
                paymentId: 'admin',
                currencyId: balances.currency._id,
                currency: balances.currency.symbol,
                userId: balances.userId,
                balanceId,
                amount,
                actually_paid: amount,
                address: 'admin',
                status: 100,
                method: 3,
                ipn_type: type,
                status_text: 'confirmed',
                txn_id: 'admin',
            });
        }
        return res.json({ status: true });
    }
    catch (error) {
        console.error('Payment Update Balance Error => ', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.updateBalance = updateBalance;
const getAdminBalance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const address1 = depositAddress;
    const address2 = widthrawAddress;
    let balances;
    try {
        if (coinpayment_1.coinpayment && coinpayment_1.coinpayment.balances)
            balances = yield coinpayment_1.coinpayment.balances();
    }
    catch (error) {
        console.log(error);
    }
    const currencies = yield models_1.Currencies.find({ status: true }).select({
        _id: 0,
        abi: 1,
        symbol: 1,
        price: 1,
        contractAddress: 1,
        type: 1,
        payment: 1,
        network: 1,
        icon: 1,
    });
    const metamask = {};
    const solana = {};
    const coinpaymentData = {};
    let mtotal1 = 0;
    let mtotal2 = 0;
    let ctotal = 0;
    let stotal = 0;
    for (const i in currencies) {
        const currency = currencies[i];
        if (currency.type === 2 || currency.type === 0) {
            if (currency.network === 'ethereum') {
                if (currency.contractAddress !== 'ether') {
                    const contract = new ethereum_1.EthereumWeb3.eth.Contract(currency.abi, currency.contractAddress);
                    const balance1 = yield contract.methods.balanceOf(address1).call();
                    const balance2 = yield contract.methods.balanceOf(address2).call();
                    const decimals = yield contract.methods.decimals().call();
                    const amount1 = Number((0, units_1.formatUnits)(balance1, decimals));
                    const amount2 = Number((0, units_1.formatUnits)(balance2, decimals));
                    metamask[currency.symbol] = {
                        balance1: amount1,
                        balance2: amount2,
                        usdbalance1: amount1,
                        usdbalance2: amount2, //  * currency.price
                    };
                    mtotal1 += amount1; //  * currency.price;
                    mtotal2 += amount2; //  * currency.price;
                }
                else {
                    const balance1 = yield ethereum_1.EthereumWeb3.eth.getBalance(address1);
                    const balance2 = yield ethereum_1.EthereumWeb3.eth.getBalance(address2);
                    const amount1 = Number((0, units_1.formatUnits)(balance1, 18));
                    const amount2 = Number((0, units_1.formatUnits)(balance2, 18));
                    metamask[currency.symbol] = {
                        balance1: amount1,
                        balance2: amount2,
                        usdbalance1: amount1,
                        usdbalance2: amount2, // * currency.price
                    };
                    mtotal1 += amount1; //  * currency.price;
                    mtotal2 += amount2; //  * currency.price;
                }
            }
            else if (currency.network === 'solana') {
                const amount = yield (0, solana_1.getSOLbalance)(solanaAddress, currency);
                solana[currency.symbol] = {
                    balance: amount,
                    usdbalance: amount, //  * currency.price
                };
                stotal += amount; //  * currency.price;
            }
        }
        if (balances) {
            const balance = balances[currency.payment];
            if (balance) {
                coinpaymentData[currency.symbol] = {
                    balance: Number(balance.balancef),
                    usdbalance: Number(balance.balancef), //  * currency.price
                };
                ctotal += Number(balance.balancef); //  * currency.price;
            }
        }
    }
    return res.json({ metamask, solana, coinpayment: coinpaymentData, ctotal, stotal, mtotal1, mtotal2 });
});
exports.getAdminBalance = getAdminBalance;
const withdrawalTimer = () => __awaiter(void 0, void 0, void 0, function* () {
    const processingPayment = yield models_1.Payments.findOne({
        method: 0,
        status: 1,
        ipn_type: 'withdrawal',
    })
        .populate('currencyId')
        .sort({ createdAt: 1 });
    if (processingPayment && processingPayment.currencyId) {
        const currency = processingPayment.currencyId;
        if (currency.network === 'ethereum') {
            const response = yield ethereum_1.EthereumWeb3.eth.getTransactionReceipt(processingPayment.txn_id);
            if (!response)
                return;
            if (!response.status) {
                yield models_1.Payments.updateOne({ _id: processingPayment._id }, { status: -1, status_text: 'canceled' });
                yield (0, base_1.balanceUpdate)({
                    balanceId: processingPayment.balanceId,
                    amount: processingPayment.amount,
                    type: 'withdrawal-metamask-canceled',
                });
            }
            else {
                yield models_1.Payments.updateOne({ _id: processingPayment._id }, { status: 2, status_text: 'confirmed' });
            }
        }
        else {
            const res = yield (0, solana_1.getTxnSolana)(processingPayment.txn_id);
            if (!res)
                return;
            if (!res.status) {
                yield models_1.Payments.updateOne({ _id: processingPayment._id }, { status: -1, status_text: 'canceled' });
                yield (0, base_1.balanceUpdate)({
                    balanceId: processingPayment.balanceId,
                    amount: processingPayment.amount,
                    type: 'withdrawal-solana-canceled',
                });
            }
            else {
                yield models_1.Payments.updateOne({ _id: processingPayment._id }, { status: 2, status_text: 'confirmed' });
            }
        }
    }
    else {
        const pendingPayment = yield models_1.Payments.findOne({
            method: 0,
            status: 105,
            ipn_type: 'withdrawal',
        })
            .populate('currencyId')
            .sort({ createdAt: 1 });
        if (pendingPayment && pendingPayment.currencyId) {
            const balance = yield models_1.Balances.findById(pendingPayment.balanceId);
            if (balance.balance < 0) {
                console.log('error =>', balance);
                yield models_1.Payments.updateOne({ _id: pendingPayment._id }, { status: -1, status_text: 'canceled' });
            }
            else {
                const currency = pendingPayment.currencyId;
                if (currency.network === 'ethereum') {
                    if (currency.symbol === 'ETH') {
                        (0, ethereum_1.transferEthererum)(widthrawAddress, pendingPayment.address, pendingPayment.amount)
                            .then((txn_id) => __awaiter(void 0, void 0, void 0, function* () {
                            yield models_1.Payments.updateOne({ _id: pendingPayment._id }, {
                                status: 1,
                                status_text: 'processing',
                                id: txn_id,
                                txn_id,
                            });
                        }))
                            .catch((error) => {
                            console.log('error', error);
                        });
                    }
                    else {
                        const currencyData = {
                            abi: currency.abi,
                            address: currency.contractAddress,
                            price: currency.price,
                        };
                        (0, ethereum_1.transferErc20)(widthrawAddress, pendingPayment.address, currencyData, pendingPayment.amount)
                            .then((txn_id) => __awaiter(void 0, void 0, void 0, function* () {
                            yield models_1.Payments.updateOne({ _id: pendingPayment._id }, {
                                status: 1,
                                status_text: 'processing',
                                id: txn_id,
                                txn_id,
                            });
                        }))
                            .catch((error) => {
                            console.log('error', error);
                        });
                    }
                }
                else if (currency.network === 'solana') {
                    try {
                        let txn_id;
                        if (currency.symbol == 'SOL') {
                            txn_id = yield (0, solana_1.transferSOL)(pendingPayment.amount, pendingPayment.address);
                        }
                        else {
                            txn_id = yield (0, solana_1.transferSPL)(currency.contractAddress, pendingPayment.amount, pendingPayment.address);
                        }
                        if (!txn_id) {
                            yield models_1.Payments.updateOne({ _id: pendingPayment._id }, { status: -1, status_text: 'canceled' });
                        }
                        else {
                            yield models_1.Payments.updateOne({ _id: pendingPayment._id }, { status: 1, status_text: 'processing', txn_id });
                        }
                    }
                    catch (error) {
                        console.log('payment error => ', error);
                    }
                }
            }
        }
    }
    const pendingPayment = yield models_1.Payments.findOne({
        method: 1,
        status: 105,
        ipn_type: 'withdrawal',
    })
        .populate('currencyId')
        .sort({ createdAt: 1 });
    if (pendingPayment) {
        const currency = pendingPayment.currencyId;
        const balance = yield models_1.Balances.findById(pendingPayment.balanceId);
        if (balance.balance < 0) {
            console.log('error =>', balance);
            yield models_1.Payments.updateOne({ _id: pendingPayment._id }, { status: -1, status_text: 'canceled' });
            return;
        }
        try {
            const Opts = {
                amount: pendingPayment.amount,
                currency: currency.payment,
                ipn_url,
                address: pendingPayment.address,
            };
            const data = yield coinpayment_1.coinpayment.createWithdrawal(Opts);
            yield models_1.Payments.updateOne({ _id: pendingPayment._id }, { id: data.id, status: data.status, status_text: 'processing' });
        }
        catch (error) {
            console.log('coinpayment error => ', error);
        }
    }
});
exports.withdrawalTimer = withdrawalTimer;
const removePendingPayment = () => __awaiter(void 0, void 0, void 0, function* () {
    const date = moment().subtract(24, 'hours');
    yield models_1.Payments.find({
        ipn_type: 'deposit',
        status: 0,
        method: 1,
        createdAt: { $lte: date },
    });
});
exports.removePendingPayment = removePendingPayment;
const getPaymentMethod = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield models_1.Currencies.find({ status: true }).sort({ order: 1 }).select({
        _id: 0,
        icon: 1,
        name: 1,
        officialLink: 1,
    });
    res.json(result);
});
exports.getPaymentMethod = getPaymentMethod;
const createNowpay = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, amount, currencyId } = req.body;
        // const balance = await Balances.findOne({
        //     userId: ObjectId(userId),
        //     status: true,
        // });
        // if (!balance) return res.status(402).json("Currency is not allowed");
        let balance = yield models_1.Balances.findOne({
            userId: (0, base_1.ObjectId)(userId),
            currency: currencyId,
        });
        if (!balance)
            balance = yield models_1.Balances.create({
                userId,
                balance: 0,
                status: false,
                disabled: false,
                currency: currencyId,
            });
        const currency = yield models_1.Currencies.findOne({ _id: currencyId, status: true, deposit: true });
        if (!currency)
            return res.status(402).json('Currency is not allowed');
        if (amount <= 0 || amount < currency.minDeposit)
            return res.status(402).json(`Min Deposit amount is ${currency.minDeposit}`);
        axios_1.default
            .post(`${NOW_PAYMENT_API}/v1/payment`, {
            price_amount: 1,
            price_currency: 'usd',
            pay_currency: currency.payment,
            pay_amount: amount,
            ipn_callback_url: NOW_PAYMENT_CALL_BACK,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': NOW_PAYMENT_API_KEY,
            },
        })
            .then(({ data }) => __awaiter(void 0, void 0, void 0, function* () {
            const { payment_id, pay_address, pay_amount } = data;
            const payment = yield models_1.Payments.findOneAndUpdate({ paymentId: payment_id }, {
                userId,
                currencyId: currency._id,
                balanceId: balance._id,
                amount: pay_amount,
                address: pay_address,
                status: -3,
                ipn_type: 'deposit',
                status_text: 'pending',
            }, { upsert: true, new: true });
            res.json(payment);
        }))
            .catch((err) => {
            var _a, _b;
            console.log('error', err);
            return res.status(500).json((_b = (_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data.message) !== null && _b !== void 0 ? _b : 'server error !!!');
        });
    }
    catch (error) {
        console.error(error);
        return res.status(400).json('Internal Server Error');
    }
});
exports.createNowpay = createNowpay;
const exchangeNowpay = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, amount, fromCurrencyId, toCurrencyId } = req.body;
        if (fromCurrencyId === toCurrencyId)
            return res.status(402).json('Currency is wrong');
        const balance = yield models_1.Balances.findOne({ userId, currency: fromCurrencyId });
        const tocurrency = yield models_1.Currencies.findOne({ _id: toCurrencyId, status: true });
        if (!tocurrency)
            return res.status(402).json('To Currency is not defined');
        if (balance < amount)
            return res.status(402).json('Your Balance is not enough');
        console.log(balance, '==>balance');
        const token = yield (0, base_1.authNOW)();
        console.log(token, '==>token');
        if (!token)
            return res.status(402).json('Auth TOKEN Error!');
        axios_1.default
            .post(`${NOW_PAYMENT_API}/v1/conversion`, {
            amount: amount.toString(),
            from_currency: balance.currency.payment,
            to_currency: tocurrency.payment,
        }, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        })
            .then(({ data }) => __awaiter(void 0, void 0, void 0, function* () {
            yield models_1.Balances.updateOne({ _id: balance._id }, { $inc: { balance: -1 * data.result.from_amount } });
            yield models_1.Exchanges.create(Object.assign(Object.assign({}, data.result), { userId, from_currency_id: balance.currency._id, to_currency_id: tocurrency._id }));
            return res.json('success');
        }))
            .catch((err) => {
            var _a, _b;
            console.log('error', err);
            return res.status(500).json((_b = (_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data.message) !== null && _b !== void 0 ? _b : 'server error !!!');
        });
    }
    catch (error) {
        console.error(error);
        return res.status(400).json('Internal Server Error');
    }
});
exports.exchangeNowpay = exchangeNowpay;
const getFiatNowpay = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        axios_1.default
            .post(`${NOW_PAYMENT_API}/v1/payment`, {
            price_amount: 100,
            price_currency: 'USD',
            pay_currency: 'USD',
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': NOW_PAYMENT_API_KEY,
            },
        })
            .then(({ data }) => __awaiter(void 0, void 0, void 0, function* () {
            if (data.type !== 'fiat2crypto')
                return res.status(402).json('PAYMENT API ERROR!');
            return res.json(data.redirectData.redirect_url);
        }))
            .catch((err) => {
            var _a, _b;
            console.log('error', err);
            return res.status(500).json((_b = (_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data.message) !== null && _b !== void 0 ? _b : 'server error !!!');
        });
    }
    catch (error) {
        console.error(error);
        return res.status(400).json('Internal Server Error');
    }
});
exports.getFiatNowpay = getFiatNowpay;
const getCurrenciesFiat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield models_1.Currencies.find({ status: true, isFiat: true }).sort({
            order: 1,
            createdAt: 1,
        });
        res.json(result);
    }
    catch (error) {
        console.error('Error fetching currencies:', error);
        res.status(500).json('Internal server error');
    }
});
exports.getCurrenciesFiat = getCurrenciesFiat;

const createOmnoTx = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { firstName, lastName, city, address1, state, country, postalCode, phone, email, amount, bonusId, isCard } = req.body;
        console.log(`[createOmnoTx] Received bonusId: ${bonusId || 'none'}`);
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            console.log(`[createOmnoTx] User not found for request`);
            return res.status(500).json('User not found!');
        }
        const user = yield models_1.Users.findById(userId);
        if (!user) {
            console.log(`[createOmnoTx] User not found in DB: ${userId}`);
            return res.status(500).json('User not found!');
        }
        if (bonusId) {
            const bonus = yield models_1.Bonus.findById(bonusId);
            if (!bonus) {
                console.log(`[createOmnoTx] Invalid bonusId: ${bonusId}`);
                return res.status(402).json('BonusId invalid!');
            }
            console.log(`[createOmnoTx] Bonus found: ${bonusId}, checking conditions`);
            // Проверка условий бонуса
            const balance = yield models_1.Balances.findOne({ userId, status: true }).populate('currency');
            if (!balance) {
                console.log(`[createOmnoTx] No active balance for user: ${userId}`);
                return res.status(402).json('No active balance found!');
            }
            const userCurrencySymbol = balance.currency.symbol;
            const matchingCurrency = bonus.currencies.find(curr => curr.currency === userCurrencySymbol);
            if (!matchingCurrency) {
                console.log(`[createOmnoTx] No matching currency for bonus: ${bonusId}, user currency: ${userCurrencySymbol}`);
                return res.status(402).json('Bonus not applicable for user currency!');
            }
            if (amount < matchingCurrency.deposit_amount_from || amount > matchingCurrency.deposit_amount_to) {
                console.log(`[createOmnoTx] Amount ${amount} not in range for bonus ${bonusId}: [${matchingCurrency.deposit_amount_from}, ${matchingCurrency.deposit_amount_to}]`);
                return res.status(402).json(`Deposit amount is not available for bonus! Min: ${matchingCurrency.deposit_amount_from} Max: ${matchingCurrency.deposit_amount_to}`);
            }
            const exists = yield models_1.BonusHistories.findOne({
                userId: userId,
                $or: [{ status: 'active' }],
            });
            if (exists) {
                console.log(`[createOmnoTx] Active bonus exists for user ${userId}: ${exists._id}`);
                return res.status(402).json('The active Bonus already exists. Please cancel it!');
            }
        }
        const balance = yield models_1.Balances.findOne({ userId, status: true });
        if (!balance) {
            console.log(`[createOmnoTx] No active balance for user: ${userId}`);
            return res.status(402).json('No active balance found!');
        }
        const token = yield (0, omno_1.authorization)();
        if (!token) {
            console.log(`[createOmnoTx] Failed to get Omno API token`);
            return res.status(500).json('Payment API Token Creating ERROR! Please try again after some time!');
        }
        const data = {
            currency: balance.currency.symbol,
            customer: {
                externalUserId: String(userId),
                firstName,
                lastName,
                email,
                phoneNumber: phone,
                dateOfBirth: moment(user.birthday).format('YYYY-MM-DD'),
                billing: {
                    address: address1,
                    city,
                    state,
                    countryCode: country,
                    postalCode,
                },
            },
        };
        console.log(`[createOmnoTx] Creating transaction for user ${userId}, amount ${amount}, currency ${data.currency}`);
        const result = yield (0, omno_1.createTransaction)(token, data);
        if (!result) {
            console.log(`[createOmnoTx] Failed to create Omno transaction for user ${userId}`);
            return res.status(500).json('Payment API Creating ERROR! Please try again after some time!');
        }
        const { sessionId, checkoutUrl } = result;
        console.log(`[createOmnoTx] Transaction created: sessionId=${sessionId}, checkoutUrl=${checkoutUrl}`);
        yield models_1.Payments.findOneAndUpdate(
            { paymentId: sessionId },
            Object.assign(
                {
                    userId,
                    currencyId: balance.currency._id,
                    balanceId: balance._id,
                    address: 'omno',
                    amount,
                    status: -3,
                    ipn_type: 'deposit',
                    status_text: 'pending'
                },
                (bonusId && { bonusId })
            ),
            { upsert: true, new: true }
        );
        console.log(`[createOmnoTx] Payment saved for sessionId=${sessionId}, bonusId=${bonusId || 'none'}`);
        return res.json(checkoutUrl);
    } catch (error) {
        console.error(`[createOmnoTx] Error: ${error.message}`, error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.createOmnoTx = createOmnoTx;

// const setDepositBonus = (payment, amount) => __awaiter(void 0, void 0, void 0, function* () {
//     const bonus = yield models_1.Bonus.findById(payment.bonusId);
//     if (!bonus)
//         return;
//     if (bonus.deposit_amount_from > amount || bonus.deposit_amount_to < amount)
//         return;
//     let bonusAmount = 0;
//     if (bonus.amount_type === 'fixed')
//         bonusAmount = bonus.amount;
//     if (bonus.amount_type === 'percentage') {
//         bonusAmount = (0, base_1.NumberFix)((amount / 100) * bonus.amount, 2);
//         if (bonus.up_to_amount && bonusAmount > bonus.up_to_amount)
//             bonusAmount = bonus.up_to_amount;
//     }
//     if (bonus.amount_type === 'cashback')
//         bonusAmount = bonus.amount;
//     yield models_1.BonusHistories.create({
//         bonusId: payment.bonusId,
//         userId: payment.userId,
//         paymentsId: payment._id,
//         amount: bonusAmount,
//         isDeposit: amount,
//         status: bonus.spend_amount > 0 ? 'processing' : 'active',
//     });
//     if (bonus.spend_amount <= 0) {
//         yield models_1.Balances.findByIdAndUpdate(payment.balanceId, { $inc: { bonus: bonusAmount } });
//         const en = bonus.lang.find((e) => e.lang === 'en') || bonus.lang[0];
//         yield models_1.Notification.create({
//             title: `New Bonus`,
//             description: `You have got new bonus! (${en.title})  ${process.env.DOMAIN}/en/user/my-shares`,
//             players: [String(payment.userId)],
//             country: ['all'],
//             auto: true,
//         });
//         yield (0, tracking_1.trackBonus)(payment.userId, bonus);
//         if (bonus.event.type !== 'casino')
//             return;
//         if (!bonus.games_freespin?.length)
//             return;
//         if (!bonus.free_spin)
//             return;
//         let free_spin = bonus.free_spin;
//         if (bonus.free_spin_type === 'percentage') {
//             free_spin = Math.round((amount / 100) * free_spin);
//             if (bonus.free_spin_up_to_amt && free_spin > bonus.free_spin_up_to_amt)
//                 free_spin = bonus.free_spin_up_to_amt;
//         }
//         yield (0, timelesstech_1.createCampaign)(bonus.games_freespin, String(payment.userId), free_spin, new Date(bonus.to_date), en.title, bonus.max_bet_free_spin);
//     }
// });

const setDepositBonus = (payment, amount) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`[setDepositBonus] Processing bonus for payment ${payment._id}, amount ${amount}`);
    const bonus = yield models_1.Bonus.findById(payment.bonusId);
    if (!bonus) {
        console.log(`[setDepositBonus] Bonus not found: ${payment.bonusId}`);
        return;
    }
    console.log(`[setDepositBonus] Bonus found: ${bonus._id}, title: ${bonus.lang.find(e => e.lang === 'en')?.title || 'unknown'}`);
    const balance = yield models_1.Balances.findById(payment.balanceId).populate('currency');
    if (!balance) {
        console.log(`[setDepositBonus] No balance found for payment ${payment._id}`);
        return;
    }
    const userCurrencySymbol = balance.currency.symbol;
    const matchingCurrency = bonus.currencies.find(curr => curr.currency === userCurrencySymbol);
    if (!matchingCurrency) {
        console.log(`[setDepositBonus] No matching currency for bonus ${bonus._id}, user currency: ${userCurrencySymbol}`);
        return;
    }
    console.log(`[setDepositBonus] Checking amount ${amount} against bonus ${bonus._id}: [${matchingCurrency.deposit_amount_from}, ${matchingCurrency.deposit_amount_to}]`);
    if (matchingCurrency.deposit_amount_from > amount || matchingCurrency.deposit_amount_to < amount) {
        console.log(`[setDepositBonus] Amount ${amount} out of range for bonus ${bonus._id}`);
        return;
    }
    let bonusAmount = 0;
    if (matchingCurrency.amount_type === 'fixed') {
        bonusAmount = matchingCurrency.amount;
        console.log(`[setDepositBonus] Fixed bonus amount: ${bonusAmount}`);
    }
    if (matchingCurrency.amount_type === 'percentage') {
        bonusAmount = (0, base_1.NumberFix)((amount / 100) * matchingCurrency.amount, 2);
        if (matchingCurrency.up_to_amount && bonusAmount > matchingCurrency.up_to_amount) {
            bonusAmount = matchingCurrency.up_to_amount;
        }
        console.log(`[setDepositBonus] Percentage bonus calculated: ${bonusAmount}`);
    }
    if (matchingCurrency.amount_type === 'cashback') {
        bonusAmount = matchingCurrency.amount;
        console.log(`[setDepositBonus] Cashback bonus amount: ${bonusAmount}`);
    }
    // Проверяем, есть ли уже запись в BonusHistories для userId и bonusId
    const existingBonusHistory = yield models_1.BonusHistories.findOne({
        userId: payment.userId,
        bonusId: payment.bonusId,
    });
    if (existingBonusHistory) {
        console.log(`[setDepositBonus] Existing BonusHistories found for user ${payment.userId}, bonus ${bonus._id}: ${existingBonusHistory._id}`);
        // Обновляем существующую запись
        yield models_1.BonusHistories.findOneAndUpdate(
            { _id: existingBonusHistory._id },
            {
                amount: bonusAmount,
                isDeposit: amount,
                paymentsId: payment._id,
                status: matchingCurrency.spend_amount > 0 ? 'processing' : 'active',
            },
            { new: true }
        );
        console.log(`[setDepositBonus] Updated BonusHistories: ${existingBonusHistory._id}`);
    } else {
        console.log(`[setDepositBonus] No existing BonusHistories, creating new for user ${payment.userId}, bonus ${bonus._id}`);
        // Создаём новую запись
        yield models_1.BonusHistories.create({
            bonusId: payment.bonusId,
            wager_amount: matchingCurrency.wager,
            userId: payment.userId,
            paymentsId: payment._id,
            amount: bonusAmount,
            isDeposit: amount,
            status: matchingCurrency.spend_amount > 0 ? 'processing' : 'active',
        });
        console.log(`[setDepositBonus] Created new BonusHistories for user ${payment.userId}, bonus ${bonus._id}`);
    }
    if (matchingCurrency.spend_amount <= 0) {
        console.log(`[setDepositBonus] Applying bonus to balance: ${bonusAmount}`);
        yield models_1.Balances.findByIdAndUpdate(payment.balanceId, { $inc: { bonus: bonusAmount } });
        const en = bonus.lang.find((e) => e.lang === 'en') || bonus.lang[0];
        console.log(`[setDepositBonus] Creating notification for user ${payment.userId}: ${en.title}`);
        yield models_1.Notification.create({
            title: `New Bonus`,
            description: `You have got new bonus! (${en.title})  ${process.env.DOMAIN}/en/user/my-shares`,
            players: [String(payment.userId)],
            country: ['all'],
            auto: true,
        });
        console.log(`[setDepositBonus] Tracking bonus for user ${payment.userId}`);
        yield (0, tracking_1.trackBonus)(payment.userId, bonus);
        if (bonus.event.type !== 'casino') {
            console.log(`[setDepositBonus] Not a casino bonus, skipping free spins`);
            return;
        }
        if (!matchingCurrency.games.length) {
            console.log(`[setDepositBonus] No games specified for free spins`);
            return;
        }
        if (!matchingCurrency.free_spin) {
            console.log(`[setDepositBonus] No free spins configured for bonus ${bonus._id}`);
            return;
        }
        let free_spin = matchingCurrency.free_spin;
        if (matchingCurrency.free_spin_type === 'percentage') {
            free_spin = Math.round((amount / 100) * free_spin);
            if (matchingCurrency.free_spin_up_to_amt && free_spin > matchingCurrency.free_spin_up_to_amt) {
                free_spin = matchingCurrency.free_spin_up_to_amt;
            }
            console.log(`[setDepositBonus] Calculated free spins: ${free_spin}`);
        }
        console.log(`[setDepositBonus] Creating campaign for ${free_spin} free spins`);
        yield (0, timelesstech_1.createCampaign)(
            matchingCurrency.free_games,
            String(payment.userId),
            free_spin,
            new Date(bonus.to_date),
            en.title,
            matchingCurrency.max_bet_free_spin
        );
    } else {
        console.log(`[setDepositBonus] Bonus in processing state, spend_amount: ${matchingCurrency.spend_amount}`);
    }
});
// export const omnnoHook = async (req: Request, res: Response) => {
//     const { id, status, amount } = req.body;
//     // {
//     //      id: '230D30AEAFBE410F87DB3ECF8FA90879',
//     //      status: 'Created' | 'Success' | "Declined" | 'Pending3DS' ,
//     //      amount: 10,
//     //      currency: 'GBP',
//     //      createdAt: '2024-10-01 19:34:36',
//     //      country: 'United States of America',
//     //      customerId: 'fe8740b2-1b32-4f24-8747-5735f2238f1f',
//     //      initialAmount: 10,
//     //      initialCurrency: 'GBP',
//     //      paymentLog: [
//     //        {
//     //          amount: 10,
//     //          merchantId: '6ae84a0f-7aca-4e87-abd4-d29564953a04',
//     //          customerId: 'fe8740b2-1b32-4f24-8747-5735f2238f1f',
//     //          currency: 'GBP',
//     //          paymentTransactionStatus: 'Created',
//     //          transactionRequestType: 'JustPay',
//     //          paymentId: '230D30AEAFBE410F87DB3ECF8FA90879',
//     //          country: 'United States of America',
//     //          hookUrl: 'https://betcasino555.com/api/v2/payments/omno-hook',
//     //          callback: 'https://betcasino555.com/api/v2/payments/omno-callback',
//     //          lang: 'EN',
//     //          initialTransaction: true,
//     //          createdAt: '2024-10-01 19:34:36',
//     //          initialAmount: 10,
//     //          initialCurrency: 'GBP'
//     //        }
//     //      ],
//     //      billingData: {
//     //        firstName: 'Alex',
//     //        lastName: 'true',
//     //        address1: 'Test Address',
//     //        city: 'Alma',
//     //        state: 'Georgia',
//     //        country: 'US',
//     //        postalCode: '1105',
//     //        phone: '+359886560019',
//     //        email: 'pontrue1031@gmail.com'
//     //      },
//     //      paymentTransactionRequests: [],
//     //      paymentSystemLog: []
//     //    }
//     res.send('success');
//     if (status === 'Created') {
//         await Payments.updateOne(
//             { paymentId: id },
//             {
//                 data: JSON.stringify(req.body),
//             }
//         );
//     }
//     if (status === 'Success') {
//         const payment = await Payments.findOneAndUpdate(
//             { paymentId: id },
//             {
//                 status: 3,
//                 actually_paid: amount,
//                 status_text: 'confirmed',
//                 data: JSON.stringify(req.body),
//             }
//         );
//         const balanece = await Balances.findByIdAndUpdate(payment.balanceId, {
//             $inc: { balance: amount, deposit_count: 1, deposit_amount: amount },
//         }).populate('userId');
//         const user = balanece.userId;
//         if (user.affiliate && amount > 0) {
//             const param = {
//                 playerid: user._id,
//                 transaction_id: id,
//                 local_amount: amount,
//                 local_currency: balanece.currency.symbol,
//             };
//             await depositPostBack(param);
//         }
//         const exists = await BonusHistories.findOne({
//             userId: payment.userId,
//             $or: [
//                 {
//                     status: 'active',
//                 },
//                 {
//                     status: 'processing',
//                 },
//             ],
//         });
//         if (exists) return;
//         if (payment.bonusId) {
//             await setDepositBonus(payment, amount);
//         } else {
//             const bonus = await Bonus.find({
//                 deposit_amount_from: { $lte: amount },
//                 deposit_amount_to: { $gte: amount },
//                 status: true,
//             });
//             if (!bonus.length) return;
//             const balance = await Balances.findOne({ userId: payment.userId, status: true }).populate('userId');
//             if (!balance) return;
//             const available = [];
//             // check available bonus vai segmentation
//             for (const key in bonus) {
//                 const element = bonus[key];
//                 if (element.player_type === 'player' && !element.players.includes(String(user._id))) continue;
//                 if (element.player_type === 'segmentation' && element?.segmentation) {
//                     const segmentation = await Segmentations.findById(element?.segmentation);
//                     if (!segmentation) continue;
//                     const check = await checkSegmentationPlayer(segmentation, balance);
//                     console.log(check, '==>check');
//                     if (!check) continue;
//                 }
//                 const en = element.lang.find((e) => e.lang === 'en') || element.lang[0];
//                 available.push({
//                     title: en.title,
//                     description: en.description,
//                     image: en.pre_image,
//                     paymentsId: payment._id,
//                     activate_day: element.activate_day,
//                     _id: element._id,
//                 });
//             }
//             if (!available.length) return;
//             await Notification.create({
//                 title: `Availabile Bonus`,
//                 description: `Here are your available bonuses:`,
//                 param: {
//                     key: 'bonus',
//                     data: available,
//                 },
//                 players: [String(payment.userId)],
//                 country: ['all'],
//                 auto: true,
//             });
//         }
//     }
//     if (status === 'Declined') {
//         await Payments.findOneAndUpdate(
//             { paymentId: id },
//             {
//                 status: -4,
//                 status_text: 'canceled',
//                 data: JSON.stringify(req.body),
//             }
//         );
//     }
// };
const omnnoHook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { payInId, transactionStatus, orderId } = req.body;
    console.log(`[omnnoHook] Received webhook: payInId=${payInId}, status=${transactionStatus}, orderId=${orderId}`);
    res.send('success');
    const token = yield (0, omno_1.authorization)();
    if (!token) {
        console.error(`[omnnoHook] Failed to get Omno API token for payInId=${payInId}`);
        return;
    }
    const transaction = yield (0, omno_1.getPayInTransaction)(token, payInId);
    if (!transaction) {
        console.error(`[omnnoHook] Transaction not found: payInId=${payInId}`);
        return;
    }
    const { amount, initialAmount, initialCurrency } = transaction;
    console.log(`[omnnoHook] Transaction details: orderId=${orderId}, amount=${initialAmount}, currency=${initialCurrency}, status=${transactionStatus}`);
    if (transactionStatus === 'CREATED') {
        console.log(`[omnnoHook] Updating payment to CREATED for orderId=${orderId}`);
        yield models_1.Payments.updateOne({ paymentId: orderId }, {
            amount: initialAmount,
            data: JSON.stringify(transaction),
        });
    }
    if (transactionStatus === 'SUCCESS') {
        const existsHis = yield models_1.Payments.findOne({ paymentId: orderId, status: 3, status_text: 'confirmed' });
        if (existsHis) {
            console.log(`[omnnoHook] Payment already confirmed for orderId=${orderId}`);
            return;
        }
        console.log(`[omnnoHook] Processing SUCCESS for orderId=${orderId}, amount=${initialAmount}`);
        const payment = yield models_1.Payments.findOneAndUpdate(
            { paymentId: orderId },
            {
                amount: initialAmount,
                status: 3,
                actually_paid: initialAmount,
                status_text: 'confirmed',
                data: JSON.stringify(transaction),
            },
            { new: true }
        );
        if (!payment) {
            console.error(`[omnnoHook] Payment not found for orderId=${orderId}`);
            return;
        }
        console.log(`[omnnoHook] Payment updated: paymentId=${payment._id}, bonusId=${payment.bonusId || 'none'}`);
        const balance = yield models_1.Balances.findByIdAndUpdate(
            payment.balanceId,
            {
                $inc: { balance: initialAmount, deposit_count: 1, deposit_amount: initialAmount },
            },
            { new: true }
        ).populate(['userId', 'currency']);
        if (!balance) {
            console.error(`[omnnoHook] Balance not found for payment ${payment._id}`);
            return;
        }
        const user = balance.userId;
        const userCurrencySymbol = balance.currency.symbol;
        console.log(`[omnnoHook] Balance updated for user ${user._id}, currency ${userCurrencySymbol}, new balance=${balance.balance}`);
        if (user.affiliate && amount > 0) {
            // console.log(`[omnnoHook] Sending affiliate postback for user ${user._id}, amount=${initialAmount}`);
            // const param = {
            //     playerid: user._id,
            //     transaction_id: orderId,
            //     local_amount: initialAmount,
            //     local_currency: initialCurrency,
            // };
            // yield (0, affiliate_1.depositPostBack)(param);
            try {
            yield (0, own_affiliate_1.depositPostBack)(
                user._id,
                user.username,
                orderId,
                initialAmount,
                initialCurrency
            );
        } catch (error) {
            console.error('[depositPostBack] Error in omno hook:', error);
        }
        }
        const exists = yield models_1.BonusHistories.findOne({
            userId: payment.userId,
            $or: [{ status: 'active' }],
        });
        if (exists) {
            console.log(`[omnnoHook] Active bonus exists for user ${payment.userId}: ${exists._id}, skipping bonus processing`);
            return;
        }
        if (payment.bonusId) {
            console.log(`[omnnoHook] Applying bonus ${payment.bonusId} for payment ${payment._id}`);
            yield setDepositBonus(payment, initialAmount);
        } else {
            console.log(`[omnnoHook] No bonusId provided, checking available bonuses for user ${payment.userId}, amount=${initialAmount}`);
            const bonuses = yield models_1.Bonus.find({
                currencies: {
                    $elemMatch: {
                        currency: userCurrencySymbol,
                        deposit_amount_from: { $lte: initialAmount },
                        deposit_amount_to: { $gte: initialAmount }
                    }
                },
                daily: 'promotion',
                status: true,
            });
            if (!bonuses.length) {
                console.log(`[omnnoHook] No matching bonuses found for user ${payment.userId}, amount=${initialAmount}, currency=${userCurrencySymbol}`);
                return;
            }
            const available = [];
            console.log(`[omnnoHook] Found ${bonuses.length} potential bonuses, checking segmentation`);
            for (const bonus of bonuses) {
                const matchingCurrency = bonus.currencies.find(curr => 
                    curr.currency === userCurrencySymbol && 
                    curr.deposit_amount_from <= initialAmount && 
                    curr.deposit_amount_to >= initialAmount
                );
                if (!matchingCurrency) {
                    console.log(`[omnnoHook] Bonus ${bonus._id} skipped: no matching currency for ${userCurrencySymbol}`);
                    continue;
                }
                if (matchingCurrency.player_type === 'player' && !matchingCurrency.players.includes(String(user._id))) {
                    console.log(`[omnnoHook] Bonus ${bonus._id} skipped: user ${user._id} not in players list`);
                    continue;
                }
                if (matchingCurrency.player_type === 'segmentation' && matchingCurrency.segmentation) {
                    const segmentation = yield models_1.Segmentations.findById(matchingCurrency.segmentation);
                    if (!segmentation) {
                        console.log(`[omnnoHook] Bonus ${bonus._id} skipped: segmentation not found`);
                        continue;
                    }
                    const check = yield (0, base_1.checkSegmentationPlayer)(segmentation, balance);
                    console.log(`[omnnoHook] Segmentation check for bonus ${bonus._id}: ${check}`);
                    if (!check) {
                        console.log(`[omnnoHook] Bonus ${bonus._id} skipped: segmentation check failed`);
                        continue;
                    }
                }
                const en = bonus.lang.find((e) => e.lang === 'en') || bonus.lang[0];
                console.log(`[omnnoHook] Bonus ${bonus._id} is available: ${en.title}`);
                available.push({
                    title: en.title,
                    description: en.description,
                    image: en.pre_image,
                    paymentsId: payment._id,
                    activate_day: bonus.activate_day,
                    _id: bonus._id,
                });
            }
            if (!available.length) {
                console.log(`[omnnoHook] No available bonuses after filtering for user ${payment.userId}`);
                return;
            }
            console.log(`[omnnoHook] Creating notification with ${available.length} available bonuses for user ${payment.userId}`);
            yield models_1.Notification.create({
                title: `Available Bonus`,
                description: `Here are your available bonuses:`,
                param: {
                    key: 'bonus',
                    data: available,
                },
                players: [String(payment.userId)],
                country: ['all'],
                auto: true,
            });
        }
    }
    if (transactionStatus === 'DECLINED' || transactionStatus === 'FAILED' || transactionStatus === 'TIMEOUT') {
        console.log(`[omnnoHook] Updating payment to canceled for orderId=${orderId}, status=${transactionStatus}`);
        yield models_1.Payments.findOneAndUpdate({ paymentId: orderId }, {
            amount: initialAmount,
            status: -4,
            status_text: 'canceled',
            data: JSON.stringify(transaction),
        });
    }
    if (transactionStatus === 'REFUNDED' || transactionStatus === 'PARTIALLY REFUNDED') {
        console.log(`[omnnoHook] Updating payment to refunded for orderId=${orderId}, status=${transactionStatus}`);
        yield models_1.Payments.findOneAndUpdate({ paymentId: orderId }, {
            amount: initialAmount,
            status: -4,
            status_text: 'refunded',
            data: JSON.stringify(transaction),
        });
    }
});
exports.omnnoHook = omnnoHook;

const getPaymentsPeriod = (userId, day) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const date = Date.now() - day * 24 * 60 * 60 * 1000;
        const payments = yield models_1.Payments.find({
            status: 3,
            userId,
            createdAt: { $gte: new Date(date) },
        });
        if (!payments.length)
            return { deposit: 0, withdraw: 0 };
        let deposit = 0;
        let withdraw = 0;
        payments.forEach((row) => {
            if (row.ipn_type === 'deposit')
                deposit += row.actually_paid;
            if (row.ipn_type === 'withdrawal')
                withdraw += row.actually_paid;
        });
        return { deposit, withdraw };
    }
    catch (error) {
        console.error('Get Depost & Withdaw =>', error);
        return { deposit: 0, withdraw: 0 };
    }
});
exports.getPaymentsPeriod = getPaymentsPeriod;
// Coinremitter API
const getCoinremitterCurrencies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const results = utils_1.COINREMITTER_COINS.map((row) => ({
            icon: row.icon,
            name: row.name,
            symbol: row.symbol,
            withdrawable: row.withdrawable,
        }));
        return res.json(results);
    }
    catch (error) {
        console.error('Error getting coin remitter currencies =>', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.getCoinremitterCurrencies = getCoinremitterCurrencies;

const getAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req === null || req === void 0 ? void 0 : req.user;
        if (!user)
            return res.status(402).json('User not found');
        const { symbol, bonusId } = req.body;
        if (bonusId) {
            const bonus = yield models_1.Bonus.findById(bonusId);
            if (!bonus)
                return res.status(402).json('BonusId invalid!');
        }
        const currency = utils_1.COINREMITTER_COINS.find((row) => row.symbol === symbol);
        if (!currency)
            return res.status(402).json('Currency is not defined');
        const address = yield models_1.CoinAddress.findOneAndUpdate({
            userId: user._id,
            symbol: currency.symbol,
            status: 'active',
        }, { bonusId: bonusId || '' }, { upsert: true });
        return res.json(address);
    }
    catch (error) {
        console.error('Error getting coin remitter currencies =>', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.getAddress = getAddress;
const generateAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req === null || req === void 0 ? void 0 : req.user;
        if (!user)
            return res.status(402).json('User not found');
        const { symbol, bonusId } = req.body;
        if (bonusId) {
            const bonus = yield models_1.Bonus.findById(bonusId);
            if (!bonus)
                return res.status(402).json('BonusId invalid!');
        }
        const currency = utils_1.COINREMITTER_COINS.find((row) => row.symbol === symbol);
        if (!currency)
            return res.status(402).json('Currency is not defined');
        const exists = yield models_1.CoinAddress.findOne({
            userId: user._id,
            symbol: currency.symbol,
            status: 'active',
        });
        if (exists)
            return res.status(402).json('Address already exists.');
        const label = Date.now().toString();
        const param = {
            symbol: currency.symbol,
            api_key: currency.api_key,
            password: currency.password,
            label,
        };
        const result = yield (0, coinremitter_1.createNewWallet)(param);
        if (!result)
            return res.status(402).json('Wallet Generate Failed!');
        console.log(result);
        yield models_1.CoinAddress.create({
            userId: user._id,
            symbol: currency.symbol,
            address: result.address,
            qr_code: result.qr_code,
            label: result.label,
            bonusId: bonusId || '',
        });
        return res.json(result);
    }
    catch (error) {
        console.error('Error getting coin remitter currencies =>', error);
        return res.status(500).json('Internal Server Error');
    }
});
exports.generateAddress = generateAddress;


const checkBonus = (bonusId, userId, amount) => __awaiter(void 0, void 0, void 0, function* () {
    const bonus = yield models_1.Bonus.findById(bonusId);
    if (!bonus)
        return false;
    const balance = yield models_1.Balances.findOne({ userId, status: true }).populate('currency');
    if (!balance) return false;
    const userCurrencySymbol = balance.currency.symbol;
    const matchingCurrency = bonus.currencies.find(curr => curr.currency === userCurrencySymbol);
    if (!matchingCurrency) return false;
    if (amount < matchingCurrency.deposit_amount_from || amount > matchingCurrency.deposit_amount_to)
        return false;
    const his = yield models_1.BonusHistories.findOne({
        userId: userId,
        $or: [
            {
                status: 'active',
            },
            // {
            //     status: 'processing',
            // },
        ],
    });
    if (his)
        return false;
    return true;
});

const coinRemitterCallback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id, explorer_url, txid, address, amount } = req.body;
        console.log(address, '===>coinremitter==>callback');
        // {
        // "id":"5b7650458ebb8306365624a2",
        // "txid":"7a6ca109c7c651f9b70a7d4dc8fa77de322e420119c5d2470bce7f08ba0cd1d6",
        // "explorer_url":"http://coin-explorer-url/exp/7a6ca109c7c651f9b70a7d4dc8fa7...",
        // "merchant_id":"5bc46fb28ebb8363d2657347",
        // "type":"receive",
        // "coin_short_name":"BTC",
        // "wallet_id":"5c42ea0ab846fe751421cfb2",
        // "wallet_name":"my-wallet",
        // "address_label":"address-label",
        // "address":"MP78UQoDpkehY7mMy2Cn9HSfysz4wbCeN1",
        // "amount":"2",
        // "confirmations":3,
        // "date":"2018-08-17 10:04:13"
        // }
        const existsTx = yield models_1.Payments.findOne({ txn_id: txid });
        if (existsTx) {
            console.error('Tx already exists');
            return res.json('success');
        }
        const exists = yield models_1.CoinAddress.findOneAndUpdate({ address, status: 'active' }, {
            $inc: {
                amount: (0, base_1.NumberFix)(amount),
            },
        });
        if (!exists) {
            console.error('Coin address not exists');
            return res.json('success');
        }
        const currency = utils_1.COINREMITTER_COINS.find((row) => row.symbol === exists.symbol);
        if (!currency) {
            console.error('Crypto Currency not found on callback');
            return res.json('success');
        }
        const balance = yield models_1.Balances.findOne({ userId: exists.userId._id, status: true });
        const result = yield (0, coinremitter_1.getFiatToCryptoRate)(currency, balance.currency.symbol, 1);
        if (!result) {
            console.error('Get Fiat balance Error');
            return res.json('success');
        }
        const fiat_amount = Number(Number(amount / Number(result.crypto_amount)).toFixed(6));
        console.log(fiat_amount, '==>fiat_amount');
        let payment = yield models_1.Payments.findOne({
            balanceId: balance._id,
            currencyId: currency.currencyId,
            userId: exists.userId._id,
            address: exists.address,
            status: -3,
            ipn_type: 'deposit',
            status_text: 'pending',
            isFiat: false,
        });
        if (!payment) {
            yield models_1.Payments.create({
                paymentId: id,
                payment_link: explorer_url,
                balanceId: balance._id,
                currencyId: currency.currencyId,
                userId: exists.userId._id,
                address,
                amount,
                fiat_amount,
                status: 3,
                ipn_type: 'deposit',
                txn_id: txid,
                actually_paid: amount,
                status_text: 'confirmed',
                balance_updated: false,
                data: JSON.stringify(req.body),
                isFiat: false,
            });
        }
        // if (payment.amount <= amount)
        yield models_1.Balances.updateOne({ _id: balance._id }, {
            $inc: {
                balance: fiat_amount,
                deposit_count: 1,
                deposit_amount: fiat_amount,
            },
        });

        const user = yield models_1.Users.findById(exists.userId._id);
if (user) {
    try {
        yield (0, own_affiliate_1.depositPostBack)(
            user._id,
            user.username,
            txid,
            fiat_amount,
            balance.currency.symbol
        );
    } catch (error) {
        console.error('[depositPostBack] Error in coinremitter callback:', error);
    }
}

        payment = yield models_1.Payments.updateOne({ _id: payment._id }, {
            paymentId: id,
            txn_id: txid,
            actually_paid: amount,
            payment_link: explorer_url,
            fiat_amount,
            status: 3,
            ipn_type: 'deposit',
            status_text: 'confirmed',
            balance_updated: payment.amount <= amount,
            data: JSON.stringify(req.body),
        }, {
            upsert: true,
            new: true,
        });
        if (payment === null || payment === void 0 ? void 0 : payment.bonusId) {
            const checked = yield checkBonus(payment === null || payment === void 0 ? void 0 : payment.bonusId, String(exists.userId._id), fiat_amount);
            if (checked) {
                yield setDepositBonus(payment, fiat_amount);
            }
        }
        return res.json('success');
    }
    catch (error) {
        console.error('Error coinRemitterCallback  => ', error);
        return res.json('success');
    }
});


exports.coinRemitterCallback = coinRemitterCallback;

const withdrawal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { type, amount, currency, address, card_number, IBAN, swift, account_number } = req.body;
        const user = req === null || req === void 0 ? void 0 : req.user;
        if (!user)
            return res.status(402).json('User not found');
        const balance = yield models_1.Balances.findOne({ userId: user._id, status: true });
        if (!balance)
            return res.status(402).json('Balance not found');
        
        let createParams = {
            userId: user._id,
            balanceId: balance._id,
            amount,
            status: -2,
            status_text: 'pending',
            ipn_type: 'withdrawal',
        };

        const param = { ...req.body };
        delete param.amount;
        createParams.data = JSON.stringify(param);

        if (type === 'fiat') {
            if (amount > balance.balance)
                return res.status(402).json('Balance is not enough');
            createParams.currencyId = balance.currency._id;
            createParams.fiat_amount = amount;
            createParams.isFiat = true;
            createParams.address = `IBAN: ${IBAN || ''} SWIFT: ${swift || ''} BANK_ACCOUNT: ${account_number || ''}`.trim();
            if (!IBAN || !swift) {
                return res.status(402).json('IBAN and SWIFT are required for fiat withdrawal');
            }
        } else if (type === 'card') {
            if (amount > balance.balance)
                return res.status(402).json('Balance is not enough');
            createParams.currencyId = balance.currency._id;
            createParams.fiat_amount = amount;
            createParams.isFiat = true;
            createParams.address = card_number || '';
            if (!card_number) {
                return res.status(402).json('Card number is required');
            }
        } else if (type === 'crypto') {
            if (!address)
                return res.status(402).json('Address is not defined');
            const _currency = utils_1.COINREMITTER_COINS.find((row) => row.symbol === currency);
            if (!_currency || !_currency.withdrawable)
                return res.status(402).json('Currency is not found');
            const result = yield (0, coinremitter_1.getFiatToCryptoRate)(_currency, balance.currency.symbol, balance.balance);
            if (!result)
                return res.status(402).json('Fiat rate api error');
            if ((0, base_1.NumberFix)(result.crypto_amount) < amount)
                return res.status(402).json('Balance is not enough');
            const fiat_amount = (0, base_1.NumberFix)((result.fiat_amount / result.crypto_amount) * amount);
            console.log(fiat_amount, '==>fiat_amount', result);
            createParams.currencyId = _currency.currencyId;
            createParams.fiat_amount = fiat_amount;
            createParams.address = address;
            createParams.isFiat = false;
        } else {
            return res.status(402).json('Invalid withdrawal type');
        }

        yield models_1.Payments.create(createParams);

        // await balanceUpdate({
        //     req,
        //     balanceId: balance._id,
        //     amount: (type === 'crypto' ? createParams.fiat_amount : amount) * -1,
        //     type: 'withdrawal-pending'
        // });

        return res.json('success');
    }
    catch (error) {
        console.error('Error fetching currencies:', error);
        return res.status(500).json('Internal server error');
    }
});
exports.withdrawal = withdrawal;

const submitCrypto = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req === null || req === void 0 ? void 0 : req.user;
        if (!user) {
            return res.status(403).json('User not found!');
        }
        const { symbol, amount, bonusId } = req.body;
        // if (bonusId) {
        //     const bonus = await Bonus.findById(bonusId);
        //     if (!bonus) return res.status(402).json('BonusId invalid!');
        // }
        const balance = yield models_1.Balances.findOne({ userId: user._id, status: true });
        if (!balance) {
            return res.status(403).json('Balance not found!');
        }
        if (bonusId) {
            const bonus = yield models_1.Bonus.findById(bonusId);
            if (!bonus)
                return res.status(402).json('BonusId invalid!');
        }
        const currency = utils_1.COINREMITTER_COINS.find((row) => row.symbol === symbol);
        if (!currency)
            return res.status(402).json('Currency is not defined');
        const fiat = yield (0, coinremitter_1.getFiatToCryptoRate)(currency, balance.currency.symbol, amount);
        if (!fiat) {
            return res.status(402).json('Fiat API ERROR');
        }
        const usd = yield (0, coinremitter_1.getFiatToCryptoRate)(currency, 'USD', 1);
        if (!usd) {
            return res.status(402).json('Fiat API ERROR');
        }
        const usd_amount = Number(Number((fiat === null || fiat === void 0 ? void 0 : fiat.crypto_amount) / Number(usd.crypto_amount)).toFixed(6));
        if (usd_amount < MIN_DEPOSIT_USD) {
            return res.status(403).json(`Min Deposit : ${MIN_DEPOSIT_USD} (USD)`);
        }
        const exists = yield models_1.CoinAddress.findOne({
            userId: user._id,
            symbol: currency.symbol,
            status: 'active',
        });
        if (exists) {
            const payment = yield models_1.Payments.create(Object.assign({ balanceId: balance._id, currencyId: currency.currencyId, userId: user._id, amount: Number(fiat === null || fiat === void 0 ? void 0 : fiat.crypto_amount), fiat_amount: amount, address: exists.address, status: -3, ipn_type: 'deposit', status_text: 'pending', balance_updated: false, isFiat: false }, (bonusId && {
                bonusId,
            })));
            return res.json({ payment, coin: exists });
        }
        const label = Date.now().toString();
        const param = {
            symbol: currency.symbol,
            api_key: currency.api_key,
            password: currency.password,
            label,
        };
        const result = yield (0, coinremitter_1.createNewWallet)(param);
        if (!result)
            return res.status(402).json('Wallet Generate Failed!');
        const newAddress = yield models_1.CoinAddress.create({
            userId: user._id,
            symbol: currency.symbol,
            address: result.address,
            qr_code: result.qr_code,
            label: result.label,
        });
        const payment = yield models_1.Payments.create(Object.assign({ balanceId: balance._id, currencyId: currency.currencyId, userId: user._id, amount: fiat === null || fiat === void 0 ? void 0 : fiat.crypto_amount, address: newAddress.address, fiat_amount: amount, status: -3, ipn_type: 'deposit', status_text: 'pending', balance_updated: false, isFiat: false }, (bonusId && {
            bonusId,
        })));
        return res.json({ payment, coin: newAddress });
    }
    catch (error) {
        console.error('Error checking payment status:', error);
        res.status(500).json({ error: 'Internal Server Error', message: error });
    }
});
exports.submitCrypto = submitCrypto;
const calcUsetToCrypto = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req === null || req === void 0 ? void 0 : req.user;
        if (!user) {
            return res.status(403).json('User not found!');
        }
        const { symbol, amount } = req.body;
        const _currency = utils_1.COINREMITTER_COINS.find((row) => row.symbol === symbol);
        if (!_currency)
            return res.status(403).json('Symbol not defined');
        const balance = yield models_1.Balances.findOne({ userId: user._id, status: true });
        if (!balance) {
            return res.status(403).json('Balance not found!');
        }
        const result = yield (0, coinremitter_1.getFiatToCryptoRate)(_currency, balance.currency.symbol, amount);
        if (!result)
            return res.status(403).json('Fiat rate api error');
        return res.json(result);
    }
    catch (error) {
        console.error('Error checking payment status:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error });
    }
});
exports.calcUsetToCrypto = calcUsetToCrypto;
const getActiveCrypto = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req === null || req === void 0 ? void 0 : req.user;
        if (!user) {
            return res.status(403).json('User not found!');
        }
        const { symbol } = req.body;
        const currency = utils_1.COINREMITTER_COINS.find((row) => row.symbol === symbol);
        if (!currency)
            return res.status(403).json('Symbol not defined');
        const balance = yield models_1.Balances.findOne({ userId: user._id, status: true });
        if (!balance) {
            return res.status(403).json('Balance not found!');
        }
        const coin = yield models_1.CoinAddress.findOne({
            userId: user._id,
            symbol: currency.symbol,
            status: 'active',
        });
        if (!coin)
            return res.json(null);
        const payment = yield models_1.Payments.findOne({
            balanceId: balance._id,
            currencyId: currency.currencyId,
            userId: user._id,
            address: coin.address,
            status: -3,
            ipn_type: 'deposit',
            status_text: 'pending',
            isFiat: false,
        });
        if (!payment)
            return res.json(null);
        return res.json({ payment, coin });
    }
    catch (error) {
        console.error('Error checking payment status:', error);
        return res.status(500).json({ error: 'Internal Server Error', message: error });
    }
});
exports.getActiveCrypto = getActiveCrypto;
