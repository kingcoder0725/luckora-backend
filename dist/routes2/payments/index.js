"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_rate_limit_1 = require("express-rate-limit");
const express_promise_router_1 = require("express-promise-router");
const validation_1 = require("../../middlewares/validation");
const auth_1 = require("../../middlewares/auth");
const payment_1 = require("../../controllers/payment");
const FiatQuiklyPayments_1 = require("../../controllers/payment/FiatQuiklyPayments");
const TrioPayments_1 = require("../../controllers/payment/TrioPayments");
const router = (0, express_promise_router_1.default)();
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
});
const depositlimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 1,
    standardHeaders: true,
    legacyHeaders: false,
});
const Mlimiter = (0, express_rate_limit_1.default)({
    windowMs: 500,
    max: 1,
    standardHeaders: true,
    legacyHeaders: false,
});
router.post('/deposit', validation_1.V.body(validation_1.Validator.Payments.Payment.Deposit), auth_1.verifyToken, auth_1.checkUser, payment_1.deposit);
router.post('/m-deposit', Mlimiter, depositlimiter, validation_1.V.body(validation_1.Validator.Payments.Payment.MetamaskDeposit), auth_1.verifyToken, auth_1.checkUser, payment_1.depositEthereum);
router.post('/s-deposit', Mlimiter, depositlimiter, validation_1.V.body(validation_1.Validator.Payments.Payment.SolanaDeposit), auth_1.verifyToken, auth_1.checkUser, payment_1.depositSolana);
router.post('/withdrawal', auth_1.verifyToken, validation_1.V.body(validation_1.Validator.Payments.Payment.Withdrawal), payment_1.withdrawal);
// router.post('/withdrawal', Mlimiter, limiter, V.body(Validator.Payments.Payment.Withdrawal), verifyToken, checkUser, withdrawal);
router.post('/c-withdrawal', Mlimiter, limiter, validation_1.V.body(validation_1.Validator.Payments.Payment.CancelWithdrawal), auth_1.verifyToken, auth_1.checkUser, payment_1.cancelWithdrawal);
router.post('/use-currency', validation_1.V.body(validation_1.Validator.Payments.Payment.Currency), auth_1.verifyToken, auth_1.checkUser, payment_1.useCurrency);
// router.post('/get-currency', verifyToken, getCurrencies);
router.post('/get-currency', auth_1.verifyToken, payment_1.getCoinremitterCurrencies);
router.post('/get-address', validation_1.V.body(validation_1.Validator.Payments.Payment.Generate), auth_1.verifyToken, payment_1.getAddress);
router.post('/generate-address', validation_1.V.body(validation_1.Validator.Payments.Payment.Generate), auth_1.verifyToken, payment_1.generateAddress);
router.post('/add-currency', validation_1.V.body(validation_1.Validator.Payments.Payment.Currency), auth_1.verifyToken, auth_1.checkUser, payment_1.addRemoveCurrency);
router.post('/get-balance', validation_1.V.body(validation_1.Validator.UserId), auth_1.verifyToken, auth_1.checkUser, payment_1.getBalances);
router.post('/get-transaction', validation_1.V.body(validation_1.Validator.UserId), auth_1.verifyToken, auth_1.checkUser, payment_1.getTransactions);
router.post('/deposit-now', validation_1.V.body(validation_1.Validator.Payments.Payment.DepositNow), auth_1.verifyToken, auth_1.checkUser, payment_1.createNowpay);
router.post('/exchange-now', validation_1.V.body(validation_1.Validator.Payments.Payment.ExchangeNow), auth_1.verifyToken, auth_1.checkUser, payment_1.exchangeNowpay);
router.post('/fiat-now', auth_1.verifyToken, payment_1.getFiatNowpay);
router.post('/get-currency-fiat', payment_1.getCurrenciesFiat);
router.post('/deposit-fiat-quikly', auth_1.verifyToken, validation_1.V.body(validation_1.Validator.Payments.Payment.DepositFiatQuikly), FiatQuiklyPayments_1.depositFiatQuikly);
router.post('/success-quikly', FiatQuiklyPayments_1.paymentSuccess);
router.post('/cancel-quikly', FiatQuiklyPayments_1.paymentCancel);
router.post('/callback-quikly', FiatQuiklyPayments_1.paymentCallback);
router.get('/status-quikly', FiatQuiklyPayments_1.checkPaymentStatus);
router.post('/create-omno-tx', auth_1.verifyToken, validation_1.V.body(validation_1.Validator.Payments.Payment.CreateOmnoTx), payment_1.createOmnoTx);
router.post('/submit-crypto', auth_1.verifyToken, validation_1.V.body(validation_1.Validator.Payments.Payment.SubmitCrypto), payment_1.submitCrypto);
router.post('/calc-usdt-crypto', auth_1.verifyToken, validation_1.V.body(validation_1.Validator.Payments.Payment.SubmitCrypto), payment_1.calcUsetToCrypto);
router.post('/get-active-payment', auth_1.verifyToken, validation_1.V.body(validation_1.Validator.Payments.Payment.ActiveCrypto), payment_1.getActiveCrypto);
router.post('/omno-hook', payment_1.omnnoHook);
router.post('/trio-session-create', auth_1.verifyToken, TrioPayments_1.createTrioSession);
// router.post('/trio-status', verifyToken, checkTrioPaymentStatus);
router.post('/status-trio', TrioPayments_1.checkTrioPaymentStatus);
exports.default = router;
