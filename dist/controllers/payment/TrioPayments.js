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
exports.checkTrioPaymentStatus = exports.createTrioSession = void 0;
const axios_1 = require("axios");
const models_1 = require("../../models");
const own_affiliate_1 = require("../../utils/own_affilate");
// import { checkDepositBonus } from './payments';
const API_LINK_TRIO = process.env.API_LINK_TRIO;
const API_CLIENT_ID_TRIO = process.env.API_CLIENT_ID_TRIO;
const API_SECRET_TRIO = process.env.API_SECRET_TRIO;
const VIRTUAL_ID_TRIO = process.env.VIRTUAL_ID_TRIO;
const paymentStatus = new Map();
const encodedCredentials = Buffer.from(`${API_CLIENT_ID_TRIO}:${API_SECRET_TRIO}`).toString('base64');
const generateExternalId = () => {
    return Math.floor(100000000 + Math.random() * 900000000).toString();
};
const createTrioSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { amount, user } = req.body;
    const ext_id = generateExternalId();
    const userId = req.user;
    try {
        const response = yield axios_1.default.post(API_LINK_TRIO, {
            transaction: {
                tax_number: user.tax_number,
                phone_number: user.phone_number,
                email: user.email,
                name: user.name,
                amount: amount,
                external_id: ext_id,
                description: 'Paid to betcasino555.com',
                redirect_url: 'https://betcasino555.com/en/user/wallet',
            },
            receiver: {
                virtual_account_id: VIRTUAL_ID_TRIO,
            },
            options: {
                session_type: 'payin',
                expiration_in_seconds: 1800,
                theme: {
                    colors: {
                        backdrop_color: '#ffffff',
                        button_color: '#f6df69',
                        button_label_color: '#000000',
                        link_color: '#426b55',
                        navbar_action_color: '#ffffff',
                        navbar_color: '#426b55',
                    },
                    logo_url: 'https://www.trio.com.br/_next/static/media/Logo.341273f5.svg',
                },
            },
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${encodedCredentials}`,
            },
        });
        if (response && response.data) {
            console.log('Response from createTrioSession:', response.data);
            // Check if a payment with this external_id already exists
            const existingPayment = yield models_1.Payments.findOne({ paymentId: ext_id });
            if (!existingPayment) {
                yield models_1.Payments.create({
                    userId,
                    address: 'trio',
                    paymentId: ext_id,
                    status: -1,
                    status_text: 'pending',
                    method: 0,
                    ipn_type: 'deposit'
                });
            }
            paymentStatus.set(ext_id, { status: 'PENDING', amount: Number(amount) });
            res.status(200).json(response.data);
        }
        else {
            throw new Error('Invalid response from Trio API');
        }
    }
    catch (error) {
        console.error('Error creating Trio session:', error);
        res.status(500).json({ status: "error", message: "Failed to create payment session." });
    }
});
exports.createTrioSession = createTrioSession;
const checkTrioPaymentStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // const paymentData = {
        //     "category": "collecting_document",
        //     "company_id": "019127fa-784d-3983-a964-2ed3cf61ce08",
        //     "entity_id": "019127fa-797b-2282-5dbe-a5b0552011bc",
        //     "data": {
        //         "amount": {
        //             "amount": 550,
        //             "currency": "BRL"
        //         },
        //         "bank_account_id": "01912841-edc2-5999-2422-5e5f2efe5c6f",
        //         "company_id": "019127fa-784d-3983-a964-2ed3cf61ce08",
        //         "counterparty": {
        //             "company_id": "019127fa-784d-3983-a964-2ed3cf61ce08",
        //             "external_id": null,
        //             "id": "019136b6-df67-2120-7181-6ea339225f01",
        //             "inserted_at": "2024-08-09T10:37:20.103366Z",
        //             "ledger_type": "customer",
        //             "legal_name": "YUTGUYTFGU",
        //             "maximum_amount": null,
        //             "maximum_transactions": null,
        //             "name": "YUTGUYTFGU",
        //             "tax_number": "70004764005",
        //             "updated_at": "2024-08-09T10:37:20.103366Z"
        //         },
        //         "counterparty_bank_account": {
        //             "account_digit": "7",
        //             "account_number": "1234567890123456",
        //             "account_type": "checking",
        //             "bank_ispb": "00000000",
        //             "bank_number": null,
        //             "branch": "0001",
        //             "id": "01914d70-c10c-2f9c-11f2-329f7d2cfb89",
        //             "inserted_at": "2024-08-13T20:32:00.780284Z",
        //             "updated_at": "2024-08-13T20:32:00.780284Z"
        //         },
        //         "counterparty_bank_account_id": "01914d70-c10c-2f9c-11f2-329f7d2cfb89",
        //         "counterparty_id": "019136b6-df67-2120-7181-6ea339225f01",
        //         "description": "Pago a merchant.com",
        //         "end_to_end_id": "S23208119202408132032Q18m4qznntS",
        //         "entity_id": "019127fa-797b-2282-5dbe-a5b0552011bc",
        //         "external_id": "493981171",
        //         "id": "01914d70-c0b9-be8e-2471-5c1fe68b3f77",
        //         "marked_for_automatic_refund": false,
        //         "origin_id": "01914d70-930c-593a-3f92-2e878ab3b400",
        //         "origin_type": "checkout",
        //         "receipt_url": "https://receipts.sandbox.trio.com.br/in/template",
        //         "reconciliation_id": "01914d70-a0d4-26e6-d27a-2d3fd464ff38",
        //         "ref_id": "01914d70-a0d4-e61c-2edf-1e38e24ae35a",
        //         "ref_type": "pix_qrcode",
        //         "status": "settled",
        //         "transaction_date": "2024-08-13T20:32:00.697596Z",
        //         "type": "pix",
        //         "virtual_account_id": "01912841-edcd-47a7-959f-44814b5fc0e1"
        //     },
        //     "ref_id": "01914d70-c0b9-be8e-2471-5c1fe68b3f77",
        //     "timestamp": "2024-08-13T20:32:01.617869Z",
        //     "type": "settled"
        // }
        const paymentData = req.body;
        console.log('Received payment data:', JSON.stringify(req.body, null, 2));
        const ext_id = paymentData.data.external_id;
        const amount = paymentData.data.amount.amount;
        const status = paymentData.data.status;
        const currency = yield models_1.Currencies.findOne({ symbol: paymentData.data.amount.currency });
        console.log('Parsed amount:', amount);
        console.log('Order ID:', ext_id);
        console.log('Order ID:', status);
        const updateData = {
            amount: Number(amount),
            actually_paid: Number(amount),
            currencyId: currency._id,
            currency: currency.symbol,
            status: 0,
            status_text: '',
        };
        if (paymentData.data.status === 'settled') {
            updateData.status = 100;
            updateData.status_text = 'confirmed';
            const payment = yield models_1.Payments.findOneAndUpdate({
                paymentId: ext_id,
                status: -1,
                status_text: 'pending',
                address: 'trio',
                method: 0,
                ipn_type: 'deposit'
            }, updateData, { new: true });
            if (!payment)
                return res.status(400).json({ status: "error", message: "Order ID invalid" });
            const balance = yield models_1.Balances.findOneAndUpdate({ userId: payment.userId, currency: currency._id }, { $inc: { balance: payment.amount } }, { upsert: true, new: true });
            yield models_1.Payments.findByIdAndUpdate(payment._id, { balanceId: balance._id });

            const user = yield models_1.Users.findById(payment.userId);
    if (user && user.affiliate) {
        try {
            yield (0, own_affiliate_1.depositPostBack)(
                user._id,
                user.username,
                ext_id,
                amount,
                currency.symbol
            );
            console.log('[depositPostBack] Trio postback sent successfully');
        } catch (error) {
            console.error('[depositPostBack] Error in trio callback:', error);
        }
    }
            res.json({ status: "success" });
            // await checkDepositBonus({
            //     balanceId: balance._id,
            //     paymentsId: payment._id, deposit_amount: Number(amount), currency: currency.symbol
            // });
        }
        else {
            updateData.status = 100;
            updateData.status_text = 'canceled';
            const payment = yield models_1.Payments.findOneAndUpdate({
                paymentId: ext_id,
                status: -1,
                status_text: 'pending',
                address: 'trio',
                method: 0,
                ipn_type: 'deposit'
            }, updateData, { new: true });
            if (!payment)
                return res.status(400).json({ status: "error", message: "Order ID invalid" });
            res.json({ status: "canceled" });
        }
    }
    catch (error) {
        console.error('Error processing payment status:', error);
        res.status(500).json({ status: "error", message: "Internal server error" });
    }
});
exports.checkTrioPaymentStatus = checkTrioPaymentStatus;
