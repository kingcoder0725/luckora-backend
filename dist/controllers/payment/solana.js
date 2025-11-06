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
exports.getSOLbalance = exports.transferSPL = exports.transferSOL = exports.getTxnSolana = void 0;
const axios_1 = require("axios");
const bs58 = require("bs58");
const spl_token_1 = require("@solana/spl-token");
const { RpcResponseAndContext, TokenAmount, Keypair, Transaction, Connection, PublicKey, clusterApiUrl, SystemProgram, LAMPORTS_PER_SOL, Cluster } = require('@solana/web3.js');
let param;
let URL;
let connection;
let PRIVKEY;
let txWallet;
try {
    param = process.env.NETWORK_URL;
    URL = clusterApiUrl(param);
    connection = new Connection(clusterApiUrl(param));
    // PRIVKEY = decrypt(process.env.S_W_PRIVATE_ADDRESS as string);
    PRIVKEY = "";
    txWallet = Keypair.fromSecretKey(bs58.decode(PRIVKEY));
}
catch (error) {
    console.log('Solana web3 error !!!');
}
const getTxnSolana = (signature) => __awaiter(void 0, void 0, void 0, function* () {
    const res = yield (0, axios_1.default)(URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        data: {
            jsonrpc: '2.0',
            id: 'get-transaction',
            method: 'getTransaction',
            params: [signature]
        }
    });
    return res;
});
exports.getTxnSolana = getTxnSolana;
const transferSOL = (amount, destAddress) => __awaiter(void 0, void 0, void 0, function* () {
    const transaction = new Transaction().add(SystemProgram.transfer({
        fromPubkey: txWallet.publicKey,
        toPubkey: new PublicKey(destAddress),
        lamports: Math.floor(Number(amount) * LAMPORTS_PER_SOL)
    }));
    transaction.feePayer = txWallet.publicKey;
    const txhash = yield connection.sendTransaction(transaction, [txWallet]);
    console.log(`txhash: ${txhash}`);
    return txhash;
});
exports.transferSOL = transferSOL;
const transferSPL = (tokenMintAddress, amount, destAddress) => __awaiter(void 0, void 0, void 0, function* () {
    const mintPubkey = new PublicKey(tokenMintAddress);
    const destPubkey = new PublicKey(destAddress);
    const fromTokenAccount = yield (0, spl_token_1.getOrCreateAssociatedTokenAccount)(connection, txWallet, mintPubkey, txWallet.publicKey);
    const tokenAccountBalance = yield connection.getTokenAccountBalance(fromTokenAccount.address);
    if (tokenAccountBalance) {
        const decimals = tokenAccountBalance.value.decimals;
        const toTokenAccount = yield (0, spl_token_1.getOrCreateAssociatedTokenAccount)(connection, txWallet, mintPubkey, destPubkey);
        const transaction = new Transaction().add((0, spl_token_1.createTransferCheckedInstruction)(fromTokenAccount.address, mintPubkey, toTokenAccount.address, txWallet.publicKey, Math.floor(Number(amount) * Math.pow(10, decimals)), decimals));
        const txhash = yield connection.sendTransaction(transaction, [txWallet]);
        return txhash;
    }
    return '';
});
exports.transferSPL = transferSPL;
const getSOLbalance = (walletAddress, currency) => __awaiter(void 0, void 0, void 0, function* () {
    const ownerPubkey = new PublicKey(walletAddress);
    let tokenBalance = 0;
    try {
        if (currency.symbol === 'SOL') {
            tokenBalance = (yield connection.getBalance(ownerPubkey)) / LAMPORTS_PER_SOL;
        }
        else {
            const mintPubkey = new PublicKey(currency.contractAddress);
            const ownerTokenAccount = yield (0, spl_token_1.getOrCreateAssociatedTokenAccount)(connection, txWallet, mintPubkey, ownerPubkey);
            const tokenAccountBalance = yield connection.getTokenAccountBalance(ownerTokenAccount.address);
            tokenBalance = Number(tokenAccountBalance.value.amount) / Math.pow(10, tokenAccountBalance.value.decimals);
        }
    }
    catch (error) {
        tokenBalance = 0;
    }
    return tokenBalance;
});
exports.getSOLbalance = getSOLbalance;
