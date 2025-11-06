"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_promise_router_1 = require("express-promise-router");
const express_rate_limit_1 = require("express-rate-limit");
const validation_1 = require("../../middlewares/validation");
const auth_1 = require("../../middlewares/auth");
const users_1 = require("../../controllers/users");
const tickets_1 = require("../../controllers/tickets");
const router = (0, express_promise_router_1.default)();
const loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
});
const forgotLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
});
if (process.env.MODE === 'dev') {
    router.post('/signin', loginLimiter, users_1.signin);
}
else {
    router.post('/signin', loginLimiter, validation_1.V.body(validation_1.Validator.Users.Auth.Signin), users_1.signin);
}
router.post('/signup', loginLimiter, validation_1.V.body(validation_1.Validator.Users.Auth.Signup), users_1.signup);
router.post('/fast-signup', loginLimiter, validation_1.V.body(validation_1.Validator.Users.Auth.FastSignup), users_1.fastSignup);
router.post('/send-email', loginLimiter, validation_1.V.body(validation_1.Validator.Users.Auth.SendEmail), users_1.send_code_email);
router.post('/send-phone', loginLimiter, validation_1.V.body(validation_1.Validator.Users.Auth.SendPhone), users_1.send_code_phone);
router.post('/verify-email', loginLimiter, validation_1.V.body(validation_1.Validator.Users.Auth.VerifyEmail), users_1.verify_email);
router.post('/verify-phone', loginLimiter, validation_1.V.body(validation_1.Validator.Users.Auth.VerifyPhone), users_1.verify_phone);
router.post('/verify-password', validation_1.V.body(validation_1.Validator.Users.Auth.VerifyPassword), auth_1.verifyToken, users_1.verify_password);
router.post('/forgot', forgotLimiter, validation_1.V.body(validation_1.Validator.Users.Auth.Forgot), users_1.forgot);
router.post('/signout', validation_1.V.body(validation_1.Validator.UserId), users_1.signout);
router.post('/a-check', loginLimiter, validation_1.V.body(validation_1.Validator.Users.Auth.CheckAddress), users_1.checkAddress);
router.post('/a-signin', loginLimiter, validation_1.V.body(validation_1.Validator.Users.Auth.SigninAddress), users_1.signinMetamask);
router.post('/s-signin', loginLimiter, validation_1.V.body(validation_1.Validator.Users.Auth.SigninAddress), users_1.signinSolana);
router.post('/a-signup', loginLimiter, validation_1.V.body(validation_1.Validator.Users.Auth.SignupAddress), users_1.joinAddress);
router.post('/r-password', loginLimiter, validation_1.V.body(validation_1.Validator.Users.Auth.PasswordReset), users_1.passwordReset);
router.post('/c-password', loginLimiter, validation_1.V.body(validation_1.Validator.Users.Auth.ChangePassword), auth_1.verifyToken, auth_1.checkUser, users_1.changePassword);
router.post('/me', auth_1.verifyToken, users_1.getMe);
router.post('/verify-kyc', validation_1.V.body(validation_1.Validator.Users.Auth.KYCVerify), auth_1.verifyToken, users_1.verifyKYC);
router.post('/verify-token', validation_1.V.body(validation_1.Validator.Users.Auth.TokenVerify), auth_1.verifyTokenBody, users_1.verify_token);
router.post('/verify-kyc-mobile', validation_1.V.body(validation_1.Validator.Users.Auth.KYCVerify), auth_1.verifyTokenBody, users_1.verifyKYC);
router.post('/info', validation_1.V.body(validation_1.Validator.Users.Auth.Info), auth_1.verifyToken, auth_1.checkUser, users_1.info);
router.post('/referral', validation_1.V.body(validation_1.Validator.UserId), auth_1.verifyToken, auth_1.checkUser, users_1.getReferral);
router.post('/ticket', auth_1.verifyToken, tickets_1.getUserTicket);
router.get('/check-responce', (req, res) => {
    res.json({ status: 'ok', method: 'GET' });
});
// router.post('/track_time_spent', auth_1.verifyToken, users_1.trackSpentTime);
router.post('/track_current_page', auth_1.verifyToken, users_1.trackCurrentPage);
router.post('/get-user', validation_1.V.body(validation_1.Validator.Users.Auth.TokenVerify), auth_1.verifyTokenBody, users_1.getUserFromToken);
router.post('/update-user-balance', users_1.updateUserBalance);
router.post('/get-sumsub-access-token', auth_1.verifyTokenBody, users_1.getSumsubAccessToken);

exports.default = router;
