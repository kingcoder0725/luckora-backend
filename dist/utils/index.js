"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADMIN_ROLES = exports.NOT_TRANSLATE = exports.COINREMITTER_COINS = void 0;
exports.COINREMITTER_COINS = [
    {
        symbol: 'BTC',
        name: 'Bitcoin',
        icon: 'https://nowpayments.io/images/coins/btc.svg',
        api_key: 'wkey_6drXa0Y5SEj97rS',
        password: 'webet@1234',
        currencyId: '6697799a59758c6e3cfe422d',
        withdrawable: false
    },
    {
        symbol: 'BNB',
        name: 'Binance Coin',
        icon: 'https://nowpayments.io/images/coins/bnbbsc.svg',
        api_key: 'wkey_CKSRFBOcaM1Cuts',
        password: 'webet@1234',
        currencyId: '6697799a59758c6e3cfe4225',
        withdrawable: false
    },
    {
        symbol: 'USDTTRC20',
        name: 'Tether USD (Tron)',
        icon: 'https://nowpayments.io/images/coins/usdttrc20.svg',
        api_key: 'wkey_jI5DJFd90coeUFd',
        password: 'webet@1234',
        currencyId: '6697799a59758c6e3cfe4313',
        withdrawable: true
    },
    {
        symbol: 'ETH',
        name: 'Ethereum',
        icon: 'https://nowpayments.io/images/coins/eth.svg',
        api_key: 'wkey_PXPFcxHJRh93k2w',
        password: 'webet@1234',
        currencyId: '6697799a59758c6e3cfe4259',
        withdrawable: false
    },
    {
        symbol: 'USDTERC20',
        name: 'Tether USD (Ethereum)',
        icon: 'https://nowpayments.io/images/coins/usdterc20.svg',
        api_key: 'wkey_fktIQ8doroTM9Cf',
        password: 'webet@1234',
        currencyId: '6697799a59758c6e3cfe430c',
        withdrawable: true
    }
];
exports.NOT_TRANSLATE = [
    'Home/Away',
    'Match Corners',
    'Asian Corners',
    'Corners European Handicap',
    'Corners 1x2',
    'Corners Over Under',
    'Corners Asian Handicap',
    'Home Corners Over/Under',
    'Away Corners Over/Under',
    'Total Corners',
    'Total Corners (3 way)'
];
exports.ADMIN_ROLES = ['super_admin', 'admin', 'agent'];
