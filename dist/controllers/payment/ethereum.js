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
exports.transferEthererum = exports.transferErc20 = exports.EthereumWeb3 = void 0;
const units_1 = require("@ethersproject/units");
const ethereumjs_tx_1 = require("ethereumjs-tx");
const models_1 = require("../../models");
const Web3 = require('web3');
// const privKey = Buffer.from(decrypt(process.env.E_W_PRIVATE_ADDRESS as string), 'hex');
const privKey = Buffer.from("123456", "hex");
exports.EthereumWeb3 = new Web3(process.env.E_WEB3_URL);
const transferErc20 = (senders, reciever, contractInfo, amount) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => __awaiter(void 0, void 0, void 0, function* () {
        const contract = new exports.EthereumWeb3.eth.Contract(contractInfo.abi, contractInfo.address, { from: senders });
        const decimals = yield contract.methods.decimals().call();
        const amounti = (0, units_1.parseUnits)(String(amount), decimals);
        const balance = yield contract.methods.balanceOf(senders).call();
        if (Number((0, units_1.formatUnits)(balance, decimals)) < Number(amount)) {
            return reject('Insufficient funds!');
        }
        else {
            const nonce = yield exports.EthereumWeb3.eth.getTransactionCount(senders);
            const gasLimit = yield contract.methods.transfer(reciever, amounti).estimateGas({ from: senders });
            const gasPrice = yield exports.EthereumWeb3.eth.getGasPrice();
            const transactionFee = Number(gasPrice) * gasLimit;
            const transactionFeeAmount = exports.EthereumWeb3.utils.fromWei(String(transactionFee), 'ether');
            const ether = yield models_1.Currencies.findOne({
                contractAddress: 'ether'
            });
            const etherFee = ether.price * Number(transactionFeeAmount) * 1.5;
            const erc20Amount = (contractInfo.price * Number(amount) - etherFee) / contractInfo.price;
            if (erc20Amount < 0)
                return reject('Insufficient transaction fee.');
            const erc20Amounti = (0, units_1.parseUnits)(Number(erc20Amount.toFixed(decimals)).toString(), decimals);
            const transactionObject = {
                from: senders,
                nonce,
                gasPrice: Number(gasPrice),
                gasLimit: 400000,
                to: contractInfo.address,
                data: contract.methods.transfer(reciever, erc20Amounti).encodeABI()
            };
            const transaction = new ethereumjs_tx_1.Transaction(transactionObject, {
                chain: process.env.E_WEB3_CHAIN_ID
            });
            transaction.sign(privKey);
            const serializedTransaction = `0x${transaction.serialize().toString('hex')}`;
            exports.EthereumWeb3.eth.sendSignedTransaction(serializedTransaction, (error, txn_id) => {
                if (error) {
                    return reject(error);
                }
                else {
                    return resolve(txn_id);
                }
            });
        }
    }));
});
exports.transferErc20 = transferErc20;
const transferEthererum = (senders, reciever, amount) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        exports.EthereumWeb3.eth.getBalance(senders, (error, result) => __awaiter(void 0, void 0, void 0, function* () {
            const nonce = yield exports.EthereumWeb3.eth.getTransactionCount(senders);
            if (error) {
                return reject();
            }
            const balance = exports.EthereumWeb3.utils.fromWei(result, 'ether');
            if (Number(balance) < Number(amount) + 0.1) {
                return reject('Insufficient funds!');
            }
            else {
                const gasPrice = yield exports.EthereumWeb3.eth.getGasPrice();
                const sendAmount = exports.EthereumWeb3.utils.toHex(exports.EthereumWeb3.utils.toWei(String(amount), 'ether'));
                const transactionObject = {
                    to: reciever,
                    gasPrice,
                    nonce
                };
                const gasLimit = yield exports.EthereumWeb3.eth.estimateGas(transactionObject);
                const transactionFee = Number(gasPrice) * gasLimit * 1.5;
                transactionObject.gas = gasLimit;
                transactionObject.value = Number(sendAmount) - transactionFee;
                if (Number(sendAmount) - transactionFee < 0)
                    return reject('Insufficient transaction fee.');
                const transaction = new ethereumjs_tx_1.Transaction(transactionObject, {
                    chain: 'mainnet'
                });
                transaction.sign(privKey);
                const serializedTransaction = `0x${transaction.serialize().toString('hex')}`;
                exports.EthereumWeb3.eth.sendSignedTransaction(serializedTransaction, (error, txn_id) => {
                    if (error) {
                        return reject(error);
                    }
                    else {
                        return resolve(txn_id);
                    }
                });
            }
        }));
    });
});
exports.transferEthererum = transferEthererum;
