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

const models_1 = require("../../models");

models_1.SportsBets.schema.set('toJSON', {
    transform: (doc, ret) => {
        if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
        if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();
        return ret;
    }
});
models_1.GameHistories.schema.set('toJSON', {
    transform: (doc, ret) => {
        if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
        if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();
        return ret;
    }
});

const languageToCountryMap = {
    'en': ['US', 'GB', 'CA', 'AU', 'NZ'],
    'ru': ['RU', 'BY', 'KZ', 'UA'],
    'fr': ['FR', 'CA', 'BE', 'CH', 'LU'],
    'no': ['NO'],
    'fi': ['FI'],
    'sv': ['SE', 'FI'],
    'es': ['ES', 'MX', 'CO', 'AR', 'PE', 'VE', 'CL', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY'],
    'de': ['DE', 'AT', 'CH', 'LU', 'LI']
};

const applyConditions = (players, conditions, campaign, isMultipleTimes = false, startDate = null, endDate = null) => __awaiter(void 0, void 0, void 0, function* () {
    if (!conditions || !conditions.length) {
        return players;
    }
    let filteredPlayers = [...players];
    const processedRecords = isMultipleTimes ? (campaign.processedRecords || []) : [];
    const newProcessedRecords = [];

    const isWaitForEvent = startDate && endDate;

    for (const condition of conditions) {
        const { property, operator, value } = condition;

        if (property === 'sport_bet') {
            let sportsStakes;
            if (isWaitForEvent) {
                sportsStakes = yield models_1.SportsBets.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    createdAt: { $gte: startDate, $lte: endDate },
                    selectedFreeBet: { $eq: '' }
                }).select('userId stake createdAt');
            } else {
                sportsStakes = yield models_1.SportsBets.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) }
                }).select('userId stake createdAt');
            }
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userStakes = sportsStakes.filter((stake) => {
                    const stakeUserIdStr = typeof stake.userId === 'object' && stake.userId._id 
                        ? stake.userId._id.toString() 
                        : stake.userId.toString();
                    return stakeUserIdStr === userIdStr;
                });
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                const newStakes = userStakes.filter(stake => !processedIds.includes(stake._id.toString()));
                const hasNewStakes = isMultipleTimes ? newStakes.length > 0 : true;
        
                const stakeSums = (isMultipleTimes ? newStakes : userStakes).reduce((acc, stake) => {
                    return acc + (stake.stake || 0);
                }, 0);
        
                const matchesCondition = (
                    (operator === '>' && stakeSums > Number(value)) ||
                    (operator === '<' && stakeSums < Number(value)) ||
                    (operator === '=' && stakeSums === Number(value)) ||
                    (operator === '!=' && stakeSums !== Number(value)) ||
                    (operator === '>=' && stakeSums >= Number(value)) ||
                    (operator === '<=' && stakeSums <= Number(value))
                );
        
                if (isMultipleTimes && hasNewStakes && matchesCondition) {
                    const newRecordIds = newStakes
                        .filter(stake => {
                            const stakeValue = Number(stake.stake);
                            const conditionValue = Number(value);
                            return (
                                (operator === '>' && stakeValue > conditionValue) ||
                                (operator === '<' && stakeValue < conditionValue) ||
                                (operator === '=' && stakeValue === conditionValue) ||
                                (operator === '!=' && stakeValue !== conditionValue) ||
                                (operator === '>=' && stakeValue >= conditionValue) ||
                                (operator === '<=' && stakeValue <= conditionValue)
                            );
                        })
                        .map(stake => stake._id);
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                    }
                }
        
                return hasNewStakes && matchesCondition ? user : null;
            }))).then(results => results.filter(user => user !== null));
        }
        else if (property === 'league_bet') {
            let sportsStakes;
            if (isWaitForEvent) {
                sportsStakes = yield models_1.SportsBets.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    createdAt: { $gte: startDate, $lte: endDate }
                }).select('userId betsId createdAt');
            } else {
                sportsStakes = yield models_1.SportsBets.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) }
                }).select('userId betsId createdAt');
            }

            const matchIds = [...new Set(sportsStakes.map(bet => bet.betsId))];
            const matches = yield models_1.SportsMatchs.find({ id: { $in: matchIds } });

            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userBets = sportsStakes.filter((stake) => {
                    const stakeUserIdStr = typeof stake.userId === 'object' && stake.userId._id 
                        ? stake.userId._id.toString() 
                        : stake.userId.toString();
                    return stakeUserIdStr === userIdStr;
                });

                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];

                const newBets = userBets.filter(bet => !processedIds.includes(bet._id.toString()));
                const hasNewBets = isMultipleTimes ? newBets.length > 0 : true;

                const hasLeagueBet = (isMultipleTimes ? newBets : userBets).some((bet) => {
                    const match = matches.find(m => m.id === bet.betsId);
                    return match && match.league.id === value;
                });
                const matchesCondition = operator === '=' ? hasLeagueBet : !hasLeagueBet;

                if (isMultipleTimes && hasNewBets && matchesCondition) {
                    const newRecordIds = newBets
                        .filter(bet => {
                            const match = matches.find(m => m.id === bet.betsId);
                            return match && match.league.id === value;
                        })
                        .map(bet => bet._id);
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                    }
                }

                return hasNewBets && matchesCondition ? user : null;
            }))).then(results => results.filter(user => user !== null));
        } else if (property === 'match_bet') {
            let sportsStakes;
            if (isWaitForEvent) {
                sportsStakes = yield models_1.SportsBets.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    createdAt: { $gte: startDate, $lte: endDate }
                }).select('userId betsId createdAt');
            } else {
                sportsStakes = yield models_1.SportsBets.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) }
                }).select('userId betsId createdAt');
            }

            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userBets = sportsStakes.filter((stake) => {
                    const stakeUserIdStr = typeof stake.userId === 'object' && stake.userId._id 
                        ? stake.userId._id.toString() 
                        : stake.userId.toString();
                    return stakeUserIdStr === userIdStr;
                });

                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
               

                const newBets = userBets.filter(bet => !processedIds.includes(bet._id.toString()));
                const hasNewBets = isMultipleTimes ? newBets.length > 0 : true;

                const hasMatchBet = (isMultipleTimes ? newBets : userBets).some((bet) => bet.betsId === value);

               
                const matchesCondition = operator === '=' ? hasMatchBet : !hasMatchBet;

                if (isMultipleTimes && hasNewBets && matchesCondition) {
                    const newRecordIds = newBets
                        .filter(bet => bet.betsId === value)
                        .map(bet => bet._id);
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                    }
                }

                return hasNewBets && matchesCondition ? user : null;
            }))).then(results => results.filter(user => user !== null));
        }
        else if (property === 'games') {
            let gameHistories;
            if (isWaitForEvent) {
                gameHistories = yield models_1.GameHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    createdAt: { $gte: startDate, $lte: endDate },
                    isBonusPlay: false
                }).select('userId game_code createdAt');
            } else {
                gameHistories = yield models_1.GameHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    isBonusPlay: false
                }).select('userId game_code createdAt');
            }

            const game = yield models_1.GameLists.findOne({ _id: value });
            const gameCode = game ? game.game_code : null;

            if (!gameCode) {
                filteredPlayers = [];
            } else {
                filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                    const userIdStr = user._id.toString();
                    const userGames = gameHistories.filter((game) => {
                        const gameUserIdStr = game.userId.toString();
                        return gameUserIdStr === userIdStr;
                    });

                    const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                    const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                    const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];

                    const newGames = userGames.filter(game => !processedIds.includes(game._id.toString()));
                    const hasNewGames = isMultipleTimes ? newGames.length > 0 : true;

                    const hasGame = (isMultipleTimes ? newGames : userGames).some((game) => game.game_code === gameCode);

                    const matchesCondition = operator === '=' ? hasGame : !hasGame;

                    if (isMultipleTimes && hasNewGames && matchesCondition) {
                        const newRecordIds = newGames
                            .filter(game => game.game_code === gameCode)
                            .map(game => game._id);
                        if (newRecordIds.length > 0) {
                            newProcessedRecords.push({
                                userId: user._id,
                                lastProcessedTime: new Date(),
                                processedRecordIds: newRecordIds
                            });
                        }
                    }

                    return hasNewGames && matchesCondition ? user : null;
                }))).then(results => results.filter(user => user !== null));
            }
        } 
        else if (property === 'provider') {
            let gameHistories;
            if (isWaitForEvent) {
                gameHistories = yield models_1.GameHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    createdAt: { $gte: startDate, $lte: endDate },
                    isBonusPlay: false
                }).select('userId provider_code createdAt');
            } else {
                gameHistories = yield models_1.GameHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    isBonusPlay: false
                }).select('userId provider_code createdAt');
            }
        
            const provider = yield models_1.GameProviders.findOne({ _id: value });
            const providerCode = provider ? provider.code : null;
        
            if (!providerCode) {
                filteredPlayers = [];
            } else {
                filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                    const userIdStr = user._id.toString();
                    const userGames = gameHistories.filter((game) => {
                        const gameUserIdStr = game.userId.toString();
                        return gameUserIdStr === userIdStr;
                    });
        
                    const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                    const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                    const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                    const newGames = userGames.filter(game => !processedIds.includes(game._id.toString()));
                    const hasNewGames = isMultipleTimes ? newGames.length > 0 : true;
        
                    const hasProviderGame = (isMultipleTimes ? newGames : userGames).some((game) => game.provider_code === providerCode);
        
                    const matchesCondition = operator === '=' ? hasProviderGame : !hasProviderGame;
        
                    if (isMultipleTimes && hasNewGames && matchesCondition) {
                        const newRecordIds = newGames
                            .filter(game => game.provider_code === providerCode)
                            .map(game => game._id);
                        if (newRecordIds.length > 0) {
                            newProcessedRecords.push({
                                userId: user._id,
                                lastProcessedTime: new Date(),
                                processedRecordIds: newRecordIds
                            });
                        }
                    }
        
                    return hasNewGames && matchesCondition ? user : null;
                }))).then(results => results.filter(user => user !== null));
            }
        }
        else if (property === 'registration_date') {
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const createdAtStr = user.createdAt && user.createdAt.$date ? user.createdAt.$date : user.createdAt;
                const registrationDate = new Date(createdAtStr);
                const registrationDay = registrationDate.toISOString().split('T')[0];
                const conditionDay = new Date(value).toISOString().split('T')[0];
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                let hasNewRegistration = isMultipleTimes ? 
                    (registrationDate.getTime() > lastProcessedTime.getTime() && !processedIds.includes(userIdStr)) : 
                    true;
        
                if (isWaitForEvent) {
                    hasNewRegistration = hasNewRegistration && registrationDate >= startDate && registrationDate <= endDate;
                }
        
                const matchesCondition = (
                    (operator === '>' && registrationDate.getTime() > new Date(value).getTime()) ||
                    (operator === '<' && registrationDate.getTime() < new Date(value).getTime()) ||
                    (operator === '=' && registrationDay === conditionDay) ||
                    (operator === '!=' && registrationDay !== conditionDay) ||
                    (operator === '>=' && registrationDate.getTime() >= new Date(value).getTime()) ||
                    (operator === '<=' && registrationDate.getTime() <= new Date(value).getTime())
                );
        
                if (isMultipleTimes && hasNewRegistration && matchesCondition) {
                    newProcessedRecords.push({
                        userId: user._id,
                        lastProcessedTime: new Date(),
                        processedRecordIds: [user._id.toString()] 
                    });
                }
        
                return hasNewRegistration && matchesCondition ? user : null;
            }))).then(results => results.filter(user => user !== null));
        }
        else if (property === 'odds') {
            let sportsStakes;
            if (isWaitForEvent) {
                sportsStakes = yield models_1.SportsBets.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    createdAt: { $gte: startDate, $lte: endDate }
                }).select('userId odds createdAt');
            } else {
                sportsStakes = yield models_1.SportsBets.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) }
                }).select('userId odds createdAt');
            }
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userBets = sportsStakes.filter((stake) => {
                    const stakeUserIdStr = typeof stake.userId === 'object' && stake.userId._id 
                        ? stake.userId._id.toString() 
                        : stake.userId.toString();
                    return stakeUserIdStr === userIdStr;
                });
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                const newBets = userBets.filter(bet => !processedIds.includes(bet._id.toString()));
                const hasNewBets = isMultipleTimes ? newBets.length > 0 : true;
        
                const hasMatchingOdds = (isMultipleTimes ? newBets : userBets).some((bet) => {
                    const oddsValue = Number(bet.odds);
                    const conditionValue = Number(value);
                    return (
                        (operator === '>' && oddsValue > conditionValue) ||
                        (operator === '<' && oddsValue < conditionValue) ||
                        (operator === '=' && oddsValue === conditionValue) ||
                        (operator === '!=' && oddsValue !== conditionValue) ||
                        (operator === '>=' && oddsValue >= conditionValue) ||
                        (operator === '<=' && oddsValue <= conditionValue)
                    );
                }) || false;
        
        
                if (isMultipleTimes && hasNewBets && hasMatchingOdds) {
                    const newRecordIds = newBets
                        .filter(bet => {
                            const oddsValue = Number(bet.odds);
                            const conditionValue = Number(value);
                            return (
                                (operator === '>' && oddsValue > conditionValue) ||
                                (operator === '<' && oddsValue < conditionValue) ||
                                (operator === '=' && oddsValue === conditionValue) ||
                                (operator === '!=' && oddsValue !== conditionValue) ||
                                (operator === '>=' && oddsValue >= conditionValue) ||
                                (operator === '<=' && oddsValue <= conditionValue)
                            );
                        })
                        .map(bet => bet._id);
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                    }
                }
        
                return hasNewBets && hasMatchingOdds ? user : null;
            }))).then(results => results.filter(user => user !== null));
        }
        else if (property === 'Casino_Bet') {
            let gameHistories;
            if (isWaitForEvent) {
                gameHistories = yield models_1.GameHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    bet_money: { $exists: true, $ne: null },
                    createdAt: { $gte: startDate, $lte: endDate }
                }).select('userId bet_money game_code createdAt');
            } else {
                gameHistories = yield models_1.GameHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    bet_money: { $exists: true, $ne: null }
                }).select('userId bet_money game_code createdAt');
            }
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userBets = gameHistories.filter((game) => {
                    const gameUserIdStr = game.userId.toString();
                    return gameUserIdStr === userIdStr;
                });
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                const newBets = userBets.filter(bet => !processedIds.includes(bet._id.toString()));
                const hasNewBets = isMultipleTimes ? newBets.length > 0 : true;
        
                const hasMatchingBetMoney = (isMultipleTimes ? newBets : userBets).some((bet) => {
                    const betMoneyValue = Number(bet.bet_money);
                    const conditionValue = Number(value);
                    return (
                        (operator === '>' && betMoneyValue > conditionValue) ||
                        (operator === '<' && betMoneyValue < conditionValue) ||
                        (operator === '=' && betMoneyValue === conditionValue) ||
                        (operator === '!=' && betMoneyValue !== conditionValue) ||
                        (operator === '>=' && betMoneyValue >= conditionValue) ||
                        (operator === '<=' && betMoneyValue <= conditionValue)
                    );
                }) || false;
        
                if (isMultipleTimes && hasNewBets && hasMatchingBetMoney) {
                    const newRecordIds = newBets
                        .filter(bet => {
                            const betMoneyValue = Number(bet.bet_money);
                            const conditionValue = Number(value);
                            return (
                                (operator === '>' && betMoneyValue > conditionValue) ||
                                (operator === '<' && betMoneyValue < conditionValue) ||
                                (operator === '=' && betMoneyValue === conditionValue) ||
                                (operator === '!=' && betMoneyValue !== conditionValue) ||
                                (operator === '>=' && betMoneyValue >= conditionValue) ||
                                (operator === '<=' && betMoneyValue <= conditionValue)
                            );
                        })
                        .map(bet => bet._id);
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                    }
                }
        
                return hasNewBets && hasMatchingBetMoney ? user : null;
            }))).then(results => results.filter(user => user !== null));
        }
        else if (property === 'Deposit_attempt') {
           
            let payments;
            if (isWaitForEvent) {
                payments = yield models_1.Payments.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    ipn_type: "deposit",
                    status_text: { $nin: ["confirmed", "deposited", "canceled", "disapproved"] },
                    createdAt: { $gte: startDate, $lte: endDate }
                }).select('userId amount status_text createdAt');
            } else {
                payments = yield models_1.Payments.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    ipn_type: "deposit",
                    status_text: { $nin: ["confirmed", "deposited", "canceled", "disapproved"] }
                }).select('userId amount status_text createdAt');
            }
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userDeposits = payments.filter((p) => p.userId.toString() === userIdStr);
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                const newDeposits = userDeposits.filter(deposit => !processedIds.includes(deposit._id.toString()));
                const hasNewDeposits = isMultipleTimes ? newDeposits.length > 0 : true;
        
                const hasMatchingAmount = (isMultipleTimes ? newDeposits : userDeposits).some((deposit) => {
                    const amountValue = Number(deposit.amount);
                    const conditionValue = Number(value);
                    return (
                        (operator === '>' && amountValue > conditionValue) ||
                        (operator === '<' && amountValue < conditionValue) ||
                        (operator === '=' && amountValue === conditionValue) ||
                        (operator === '!=' && amountValue !== conditionValue) ||
                        (operator === '>=' && amountValue >= conditionValue) ||
                        (operator === '<=' && amountValue <= conditionValue)
                    );
                }) || false;
        
                if (isMultipleTimes && hasNewDeposits && hasMatchingAmount) {
                    const newRecordIds = newDeposits
                        .filter(deposit => {
                            const amountValue = Number(deposit.amount);
                            const conditionValue = Number(value);
                            return (
                                (operator === '>' && amountValue > conditionValue) ||
                                (operator === '<' && amountValue < conditionValue) ||
                                (operator === '=' && amountValue === conditionValue) ||
                                (operator === '!=' && amountValue !== conditionValue) ||
                                (operator === '>=' && amountValue >= conditionValue) ||
                                (operator === '<=' && amountValue <= conditionValue)
                            );
                        })
                        .map(deposit => deposit._id);
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                    }
                }
        
                return hasNewDeposits && hasMatchingAmount ? user : null;
            }))).then(results => results.filter(user => user !== null));
        }
        else if (property === 'Deposit_approved') {
            let payments;
            if (isWaitForEvent) {
                payments = yield models_1.Payments.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    ipn_type: "deposit",
                    status_text: { $in: ["confirmed", "deposited"] },
                    createdAt: { $gte: startDate, $lte: endDate }
                }).select('userId amount status_text createdAt');
            } else {
                payments = yield models_1.Payments.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    ipn_type: "deposit",
                    status_text: { $in: ["confirmed", "deposited"] }
                }).select('userId amount status_text createdAt');
            }
        
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userDeposits = payments.filter((p) => p.userId.toString() === userIdStr);
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                const newDeposits = userDeposits.filter(deposit => !processedIds.includes(deposit._id.toString()));
                const hasNewDeposits = isMultipleTimes ? newDeposits.length > 0 : true;
        
                const hasMatchingAmount = (isMultipleTimes ? newDeposits : userDeposits).some((deposit) => {
                    const amountValue = Number(deposit.amount);
                    const conditionValue = Number(value);
                    return (
                        (operator === '>' && amountValue > conditionValue) ||
                        (operator === '<' && amountValue < conditionValue) ||
                        (operator === '=' && amountValue === conditionValue) ||
                        (operator === '!=' && amountValue !== conditionValue) ||
                        (operator === '>=' && amountValue >= conditionValue) ||
                        (operator === '<=' && amountValue <= conditionValue)
                    );
                }) || false;
        
        
                if (isMultipleTimes && hasNewDeposits && hasMatchingAmount) {
                    const newRecordIds = newDeposits
                        .filter(deposit => {
                            const amountValue = Number(deposit.amount);
                            const conditionValue = Number(value);
                            return (
                                (operator === '>' && amountValue > conditionValue) ||
                                (operator === '<' && amountValue < conditionValue) ||
                                (operator === '=' && amountValue === conditionValue) ||
                                (operator === '!=' && amountValue !== conditionValue) ||
                                (operator === '>=' && amountValue >= conditionValue) ||
                                (operator === '<=' && amountValue <= conditionValue)
                            );
                        })
                        .map(deposit => deposit._id);
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                    }
                }
        
                return hasNewDeposits && hasMatchingAmount ? user : null;
            }))).then(results => results.filter(user => user !== null));
        }else if (property === 'Deposit_Disproved') {
            let payments;
            if (isWaitForEvent) {
                payments = yield models_1.Payments.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    ipn_type: "deposit",
                    status_text: { $in: ["canceled", "disapproved"] },
                    createdAt: { $gte: startDate, $lte: endDate }
                }).select('userId amount status_text createdAt');
            } else {
                payments = yield models_1.Payments.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    ipn_type: "deposit",
                    status_text: { $in: ["canceled", "disapproved"] }
                }).select('userId amount status_text createdAt');
            }
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userDeposits = payments.filter((p) => p.userId.toString() === userIdStr);

                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
               

                const newDeposits = userDeposits.filter(deposit => !processedIds.includes(deposit._id.toString()));
                const hasNewDeposits = isMultipleTimes ? newDeposits.length > 0 : true;

                const hasMatchingAmount = (isMultipleTimes ? newDeposits : userDeposits).some((deposit) => {
                    const amountValue = Number(deposit.amount);
                    const conditionValue = Number(value);
                    return (
                        (operator === '>' && amountValue > conditionValue) ||
                        (operator === '<' && amountValue < conditionValue) ||
                        (operator === '=' && amountValue === conditionValue) ||
                        (operator === '!=' && amountValue !== conditionValue) ||
                        (operator === '>=' && amountValue >= conditionValue) ||
                        (operator === '<=' && amountValue <= conditionValue)
                    );
                }) || false;

                if (isMultipleTimes && hasNewDeposits && hasMatchingAmount) {
                    const newRecordIds = newDeposits
                        .filter(deposit => {
                            const amountValue = Number(deposit.amount);
                            const conditionValue = Number(value);
                            return (
                                (operator === '>' && amountValue > conditionValue) ||
                                (operator === '<' && amountValue < conditionValue) ||
                                (operator === '=' && amountValue === conditionValue) ||
                                (operator === '!=' && amountValue !== conditionValue) ||
                                (operator === '>=' && amountValue >= conditionValue) ||
                                (operator === '<=' && amountValue <= conditionValue)
                            );
                        })
                        .map(deposit => deposit._id);
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                    }
                }

                return hasNewDeposits && hasMatchingAmount ? user : null;
            }))).then(results => results.filter(user => user !== null));
        }
        else if (property === 'Deposit_Comparator') {
            let payments;
            if (isWaitForEvent) {
                payments = yield models_1.Payments.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    ipn_type: "deposit",
                    createdAt: { $gte: startDate, $lte: endDate }
                }).select('userId amount status_text createdAt');
            } else {
                payments = yield models_1.Payments.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    ipn_type: "deposit"
                }).select('userId amount status_text createdAt');
            }

            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userDeposits = payments.filter((p) => p.userId.toString() === userIdStr);

                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];

                const newDeposits = userDeposits.filter(deposit => !processedIds.includes(deposit._id.toString()));
                const hasNewDeposits = isMultipleTimes ? newDeposits.length > 0 : true;

                const hasMatchingAmount = (isMultipleTimes ? newDeposits : userDeposits).length > 0;

                if (isMultipleTimes && hasNewDeposits && hasMatchingAmount) {
                    const newRecordIds = newDeposits.map(deposit => deposit._id);
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                    }
                }

                return hasNewDeposits && hasMatchingAmount ? user : null;
            }))).then(results => results.filter(user => user !== null));
        }
        else if (property === 'Live_Casino_Gaming_bet') {
            const providerCodes = yield models_1.GameProviders.find({ type: 'live', status: true }).distinct('code');

            let gameHistories;
            if (isWaitForEvent) {
                gameHistories = yield models_1.GameHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    provider_code: { $in: providerCodes },
                    bet_money: { $exists: true, $ne: null, $ne: 0 },
                    createdAt: { $gte: startDate, $lte: endDate }
                }).lean();
            } else {
                gameHistories = yield models_1.GameHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    provider_code: { $in: providerCodes },
                    bet_money: { $exists: true, $ne: null, $ne: 0 }
                }).lean();
            }

            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userBets = gameHistories.filter((game) => game.userId.toString() === userIdStr && providerCodes.includes(game.provider_code));

                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];

                const newBets = userBets.filter(bet => !processedIds.includes(bet._id.toString()));
                const hasNewBets = isMultipleTimes ? newBets.length > 0 : true;

                const hasMatchingLiveCasinoBet = (isMultipleTimes ? newBets : userBets).some((bet) => {
                    const betMoneyValue = Number(bet.bet_money) || 0;
                    const conditionValue = Number(value) || 0;
                    return (
                        (operator === '>' && betMoneyValue > conditionValue) ||
                        (operator === '<' && betMoneyValue < conditionValue) ||
                        (operator === '=' && betMoneyValue === conditionValue) ||
                        (operator === '!=' && betMoneyValue !== conditionValue) ||
                        (operator === '>=' && betMoneyValue >= conditionValue) ||
                        (operator === '<=' && betMoneyValue <= conditionValue)
                    );
                }) || false;

                if (isMultipleTimes && hasNewBets && hasMatchingLiveCasinoBet) {
                    const newRecordIds = newBets
                        .filter(bet => {
                            const betMoneyValue = Number(bet.bet_money) || 0;
                            const conditionValue = Number(value) || 0;
                            return (
                                (operator === '>' && betMoneyValue > conditionValue) ||
                                (operator === '<' && betMoneyValue < conditionValue) ||
                                (operator === '=' && betMoneyValue === conditionValue) ||
                                (operator === '!=' && betMoneyValue !== conditionValue) ||
                                (operator === '>=' && betMoneyValue >= conditionValue) ||
                                (operator === '<=' && betMoneyValue <= conditionValue)
                            );
                        })
                        .map(bet => bet._id);
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                    }
                }

                return hasNewBets && hasMatchingLiveCasinoBet ? user : null;
            }))).then(results => results.filter(user => user !== null));
        } else if (property === 'Withdraw_attempt') {
            let payments;
            if (isWaitForEvent) {
                payments = yield models_1.Payments.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    ipn_type: "withdrawal",
                    status_text: { $nin: ["confirmed", "deposited", "canceled", "disapproved"] },
                    createdAt: { $gte: startDate, $lte: endDate }
                }).select('userId amount status_text createdAt');
            } else {
                payments = yield models_1.Payments.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    ipn_type: "withdrawal",
                    status_text: { $nin: ["confirmed", "deposited", "canceled", "disapproved"] }
                }).select('userId amount status_text createdAt');
            }

            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userWithdraws = payments.filter((p) => p.userId.toString() === userIdStr);
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                const newWithdraws = userWithdraws.filter(withdraw => !processedIds.includes(withdraw._id.toString()));
                const hasNewWithdraws = isMultipleTimes ? newWithdraws.length > 0 : true;
        
                const hasMatchingAmount = (isMultipleTimes ? newWithdraws : userWithdraws).some((withdraw) => {
                    const amountValue = Number(withdraw.amount);
                    const conditionValue = Number(value);
                    return (
                        (operator === '>' && amountValue > conditionValue) ||
                        (operator === '<' && amountValue < conditionValue) ||
                        (operator === '=' && amountValue === conditionValue) ||
                        (operator === '!=' && amountValue !== conditionValue) ||
                        (operator === '>=' && amountValue >= conditionValue) ||
                        (operator === '<=' && amountValue <= conditionValue)
                    );
                }) || false;
        
        
                if (isMultipleTimes && hasNewWithdraws && hasMatchingAmount) {
                    const newRecordIds = newWithdraws
                        .filter(withdraw => {
                            const amountValue = Number(withdraw.amount);
                            const conditionValue = Number(value);
                            return (
                                (operator === '>' && amountValue > conditionValue) ||
                                (operator === '<' && amountValue < conditionValue) ||
                                (operator === '=' && amountValue === conditionValue) ||
                                (operator === '!=' && amountValue !== conditionValue) ||
                                (operator === '>=' && amountValue >= conditionValue) ||
                                (operator === '<=' && amountValue <= conditionValue)
                            );
                        })
                        .map(withdraw => withdraw._id);
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                    }
                }
        
                return hasNewWithdraws && hasMatchingAmount ? user : null;
            }))).then(results => results.filter(user => user !== null));
        }
        else if (property === 'Withdraw_approved') {
            let payments;
            if (isWaitForEvent) {
                payments = yield models_1.Payments.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    ipn_type: "withdrawal",
                    status_text: { $in: ["confirmed", "deposited"] },
                    createdAt: { $gte: startDate, $lte: endDate }
                }).select('userId amount status_text createdAt');
            } else {
                payments = yield models_1.Payments.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    ipn_type: "withdrawal",
                    status_text: { $in: ["confirmed", "deposited"] }
                }).select('userId amount status_text createdAt');
            }
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userWithdraws = payments.filter((p) => p.userId.toString() === userIdStr);
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                const newWithdraws = userWithdraws.filter(withdraw => !processedIds.includes(withdraw._id.toString()));
                const hasNewWithdraws = isMultipleTimes ? newWithdraws.length > 0 : true;
        
                const hasMatchingAmount = (isMultipleTimes ? newWithdraws : userWithdraws).some((withdraw) => {
                    const amountValue = Number(withdraw.amount);
                    const conditionValue = Number(value);
                    return (
                        (operator === '>' && amountValue > conditionValue) ||
                        (operator === '<' && amountValue < conditionValue) ||
                        (operator === '=' && amountValue === conditionValue) ||
                        (operator === '!=' && amountValue !== conditionValue) ||
                        (operator === '>=' && amountValue >= conditionValue) ||
                        (operator === '<=' && amountValue <= conditionValue)
                    );
                }) || false;
        
                if (isMultipleTimes && hasNewWithdraws && hasMatchingAmount) {
                    const newRecordIds = newWithdraws
                        .filter(withdraw => {
                            const amountValue = Number(withdraw.amount);
                            const conditionValue = Number(value);
                            return (
                                (operator === '>' && amountValue > conditionValue) ||
                                (operator === '<' && amountValue < conditionValue) ||
                                (operator === '=' && amountValue === conditionValue) ||
                                (operator === '!=' && amountValue !== conditionValue) ||
                                (operator === '>=' && amountValue >= conditionValue) ||
                                (operator === '<=' && amountValue <= conditionValue)
                            );
                        })
                        .map(withdraw => withdraw._id);
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                    }
                }
        
                return hasNewWithdraws && hasMatchingAmount ? user : null;
            }))).then(results => results.filter(user => user !== null));
        }
        else if (property === 'Withdraw_Disproved') {
            let payments;
            if (isWaitForEvent) {
                payments = yield models_1.Payments.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    ipn_type: "withdrawal",
                    status_text: { $in: ["canceled", "disapproved"] },
                    createdAt: { $gte: startDate, $lte: endDate }
                }).select('userId amount status_text createdAt');
            } else {
                payments = yield models_1.Payments.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    ipn_type: "withdrawal",
                    status_text: { $in: ["canceled", "disapproved"] }
                }).select('userId amount status_text createdAt');
            }
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userWithdraws = payments.filter((p) => p.userId.toString() === userIdStr);
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                const newWithdraws = userWithdraws.filter(withdraw => !processedIds.includes(withdraw._id.toString()));
                const hasNewWithdraws = isMultipleTimes ? newWithdraws.length > 0 : true;
        
                const hasMatchingAmount = (isMultipleTimes ? newWithdraws : userWithdraws).some((withdraw) => {
                    const amountValue = Number(withdraw.amount);
                    const conditionValue = Number(value);
                    return (
                        (operator === '>' && amountValue > conditionValue) ||
                        (operator === '<' && amountValue < conditionValue) ||
                        (operator === '=' && amountValue === conditionValue) ||
                        (operator === '!=' && amountValue !== conditionValue) ||
                        (operator === '>=' && amountValue >= conditionValue) ||
                        (operator === '<=' && amountValue <= conditionValue)
                    );
                }) || false;
        
                if (isMultipleTimes && hasNewWithdraws && hasMatchingAmount) {
                    const newRecordIds = newWithdraws
                        .filter(withdraw => {
                            const amountValue = Number(withdraw.amount);
                            const conditionValue = Number(value);
                            return (
                                (operator === '>' && amountValue > conditionValue) ||
                                (operator === '<' && amountValue < conditionValue) ||
                                (operator === '=' && amountValue === conditionValue) ||
                                (operator === '!=' && amountValue !== conditionValue) ||
                                (operator === '>=' && amountValue >= conditionValue) ||
                                (operator === '<=' && amountValue <= conditionValue)
                            );
                        })
                        .map(withdraw => withdraw._id);
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                    }
                }
        
                return hasNewWithdraws && hasMatchingAmount ? user : null;
            }))).then(results => results.filter(user => user !== null));
        } else if (property === 'Withdraw_Comparator') {
            let payments;
            if (isWaitForEvent) {
                payments = yield models_1.Payments.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    ipn_type: "withdrawal",
                    createdAt: { $gte: startDate, $lte: endDate }
                }).select('userId amount status_text createdAt');
            } else {
                payments = yield models_1.Payments.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    ipn_type: "withdrawal"
                }).select('userId amount status_text createdAt');
            }
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userWithdraws = payments.filter((p) => p.userId.toString() === userIdStr);
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                const newWithdraws = userWithdraws.filter(withdraw => !processedIds.includes(withdraw._id.toString()));
                const hasNewWithdraws = isMultipleTimes ? newWithdraws.length > 0 : true;
        
                const hasMatchingAmount = (isMultipleTimes ? newWithdraws : userWithdraws).some((withdraw) => {
                    const amountValue = Number(withdraw.amount);
                    const conditionValue = Number(value);
                    return (
                        (operator === '>' && amountValue > conditionValue) ||
                        (operator === '<' && amountValue < conditionValue) ||
                        (operator === '=' && amountValue === conditionValue) ||
                        (operator === '!=' && amountValue !== conditionValue) ||
                        (operator === '>=' && amountValue >= conditionValue) ||
                        (operator === '<=' && amountValue <= conditionValue)
                    );
                }) || false;
        
        
                if (isMultipleTimes && hasNewWithdraws && hasMatchingAmount) {
                    const newRecordIds = newWithdraws
                        .filter(withdraw => {
                            const amountValue = Number(withdraw.amount);
                            const conditionValue = Number(value);
                            return (
                                (operator === '>' && amountValue > conditionValue) ||
                                (operator === '<' && amountValue < conditionValue) ||
                                (operator === '=' && amountValue === conditionValue) ||
                                (operator === '!=' && amountValue !== conditionValue) ||
                                (operator === '>=' && amountValue >= conditionValue) ||
                                (operator === '<=' && amountValue <= conditionValue)
                            );
                        })
                        .map(withdraw => withdraw._id);
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                    }
                }
        
                return hasNewWithdraws && hasMatchingAmount ? user : null;
            }))).then(results => results.filter(user => user !== null));
        }
        else if (property === 'Last_login') {
           
            let loginHistories;
            if (isWaitForEvent) {
                loginHistories = yield models_1.LoginHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    createdAt: { $gte: startDate, $lte: endDate }
                }).sort({ createdAt: -1 });
            } else {
                loginHistories = yield models_1.LoginHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) }
                }).sort({ createdAt: -1 });
            }
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userLastLogin = loginHistories
                    .filter((login) => login.userId.toString() === userIdStr)
                    .sort((a, b) => {
                        const dateA = a.createdAt && a.createdAt.$date ? new Date(a.createdAt.$date) : new Date(a.createdAt);
                        const dateB = b.createdAt && b.createdAt.$date ? new Date(b.createdAt.$date) : new Date(b.createdAt);
                        return dateB - dateA;
                    })[0];
        
                if (!userLastLogin || !userLastLogin.createdAt) {
                    return null;
                }
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                const lastLoginStr = userLastLogin.createdAt && userLastLogin.createdAt.$date ? userLastLogin.createdAt.$date : userLastLogin.createdAt;
                const lastLoginDate = new Date(lastLoginStr);
                const lastLoginDay = lastLoginDate.toISOString().split('T')[0];
                const conditionValue = value.split('T')[0];
        
                const hasNewLogin = isMultipleTimes ? 
                    (lastLoginDate.getTime() > lastProcessedTime.getTime() && !processedIds.includes(userLastLogin._id.toString())) : 
                    true;
        
            
        
                const matchesCondition = (
                    (operator === '>' && lastLoginDay > conditionValue) ||
                    (operator === '<' && lastLoginDay < conditionValue) ||
                    (operator === '=' && lastLoginDay === conditionValue) ||
                    (operator === '!=' && lastLoginDay !== conditionValue) ||
                    (operator === '>=' && lastLoginDay >= conditionValue) ||
                    (operator === '<=' && lastLoginDay <= conditionValue)
                );
        
                if (isMultipleTimes && hasNewLogin && matchesCondition) {
                    newProcessedRecords.push({
                        userId: user._id,
                        lastProcessedTime: new Date(),
                        processedRecordIds: [userLastLogin._id.toString()]
                    });
                }
        
                return hasNewLogin && matchesCondition ? user : null;
            }))).then(results => results.filter(user => user !== null));
        }
        else if (property === 'Login_sum_total') {
           
            let loginHistories;
            if (isWaitForEvent) {
                loginHistories = yield models_1.LoginHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    createdAt: { $gte: startDate, $lte: endDate }
                });
               
            } else {
                loginHistories = yield models_1.LoginHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) }
                });
               
            }

        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userLogins = loginHistories.filter((login) => login.userId.toString() === userIdStr);
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
             
        
                const newLogins = userLogins.filter(login => !processedIds.includes(login._id.toString()));
                const loginCount = isMultipleTimes ? newLogins.length : userLogins.length;
                const hasNewLogins = isMultipleTimes ? newLogins.length > 0 : true;
        
                const conditionValue = Number(value);
               
        
                const matchesCondition = (
                    (operator === '>' && loginCount > conditionValue) ||
                    (operator === '<' && loginCount < conditionValue) ||
                    (operator === '=' && loginCount === conditionValue) ||
                    (operator === '!=' && loginCount !== conditionValue) ||
                    (operator === '>=' && loginCount >= conditionValue) ||
                    (operator === '<=' && loginCount <= conditionValue)
                );
        
                if (isMultipleTimes && hasNewLogins && matchesCondition) {
                    const newRecordIds = newLogins.map(login => login._id.toString());
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                    }
                }
        
                return hasNewLogins && matchesCondition ? user : null;
            }))).then(results => results.filter(user => user !== null));
        } else if (property === 'device_used') {
            let loginHistories;
            if (isWaitForEvent) {
                loginHistories = yield models_1.LoginHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    createdAt: { $gte: startDate, $lte: endDate }
                });
            } else {
                loginHistories = yield models_1.LoginHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) }
                });
            }
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userLogins = loginHistories.filter((login) => login.userId.toString() === userIdStr);
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                const newLogins = userLogins.filter(login => !processedIds.includes(login._id.toString()));
                const hasNewLogins = isMultipleTimes ? newLogins.length > 0 : true;
        
                const hasMatchingDevice = (isMultipleTimes ? newLogins : userLogins).some((login) => {
                    const mappedDevice = mapDevice(login.device);
                    const conditionValue = value.toLowerCase();
                    const normalizedMappedDevice = mappedDevice.toLowerCase();
                   
                    return (
                        (operator === '=' && normalizedMappedDevice === conditionValue) ||
                        (operator === '!=' && normalizedMappedDevice !== conditionValue)
                    );
                }) || false;
        
                if (isMultipleTimes && hasNewLogins && hasMatchingDevice) {
                    const newRecordIds = newLogins
                        .filter(login => {
                            const mappedDevice = mapDevice(login.device);
                            const conditionValue = value.toLowerCase();
                            const normalizedMappedDevice = mappedDevice.toLowerCase();
                            return (
                                (operator === '=' && normalizedMappedDevice === conditionValue) ||
                                (operator === '!=' && normalizedMappedDevice !== conditionValue)
                            );
                        })
                        .map(login => login._id.toString());
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                    }
                }
        
                return hasNewLogins && hasMatchingDevice ? user : null;
            }))).then(results => results.filter(user => user !== null));
        }
        else if (property === 'Login_Specific_IP') {
           
            let loginHistories;
            if (isWaitForEvent) {
                loginHistories = yield models_1.LoginHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    createdAt: { $gte: startDate, $lte: endDate }
                });
              
            } else {
                loginHistories = yield models_1.LoginHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) }
                });
               
            }
    
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userLogins = loginHistories.filter((login) => login.userId.toString() === userIdStr);
        
                if (!userLogins.length) {
                    return null;
                }
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                const newLogins = userLogins.filter(login => !processedIds.includes(login._id.toString()));
                const hasNewLogins = isMultipleTimes ? newLogins.length > 0 : true;
        
                const hasMatchingIp = (isMultipleTimes ? newLogins : userLogins).some((login) => {
                    const ip = login.ip || '';
                    const conditionValue = value;
                    const ipRegex = new RegExp(conditionValue, 'i');
                   
                    return (
                        (operator === '=' && ipRegex.test(ip)) ||
                        (operator === '!=' && !ipRegex.test(ip))
                    );
                }) || false;
        
               
        
                if (isMultipleTimes && hasNewLogins && hasMatchingIp) {
                    const newRecordIds = newLogins
                        .filter(login => {
                            const ip = login.ip || '';
                            const conditionValue = value;
                            const ipRegex = new RegExp(conditionValue, 'i');
                            return (
                                (operator === '=' && ipRegex.test(ip)) ||
                                (operator === '!=' && !ipRegex.test(ip))
                            );
                        })
                        .map(login => login._id.toString());
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                    }
                }
        
                return hasNewLogins && hasMatchingIp ? user : null;
            }))).then(results => results.filter(user => user !== null));
        }
        else if (property === 'Limit_set') {
            const users = yield models_1.Users.find({
                _id: { $in: filteredPlayers.map((u) => u._id) }
            }).select('betlimit updatedAt');
        
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userData = users.find(u => u._id.toString() === userIdStr);
        
                if (!userData) {
                    return null;
                }
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                const betlimit = userData.betlimit || 0;
                const updatedAt = userData.updatedAt ? new Date(userData.updatedAt) : null;
                let hasNewLimit = isMultipleTimes ? !processedIds.includes(userIdStr) : true;
        
                if (isWaitForEvent && updatedAt) {
                    hasNewLimit = hasNewLimit && updatedAt >= startDate && updatedAt <= endDate;
                }
        
                const conditionValue = Number(value);
               
        
                const matchesCondition = (
                    (operator === '>' && betlimit > conditionValue) ||
                    (operator === '<' && betlimit < conditionValue) ||
                    (operator === '=' && betlimit === conditionValue) ||
                    (operator === '!=' && betlimit !== conditionValue) ||
                    (operator === '>=' && betlimit >= conditionValue) ||
                    (operator === '<=' && betlimit <= conditionValue)
                );
        
                if (isMultipleTimes && hasNewLimit && matchesCondition) {
                    newProcessedRecords.push({
                        userId: user._id,
                        lastProcessedTime: new Date(),
                        processedRecordIds: [userIdStr]
                    });
                }
        
                return hasNewLimit && matchesCondition ? user : null;
            }))).then(results => results.filter(user => user !== null));
        } else if (property === 'Self_exclusion') {
            const users = yield models_1.Users.find({
                _id: { $in: filteredPlayers.map((u) => u._id) }
            }).select('status updatedAt');
        

        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userData = users.find(u => u._id.toString() === userIdStr);
        
                if (!userData) {
                    return null;
                }
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                const status = userData.status || false;
                const updatedAt = userData.updatedAt ? new Date(userData.updatedAt) : null;
                let hasNewStatus = isMultipleTimes ? !processedIds.includes(userIdStr) : true;
        
                if (isWaitForEvent && updatedAt) {
                    hasNewStatus = hasNewStatus && updatedAt >= startDate && updatedAt <= endDate;
                }
        
                const conditionValue = value === 'true';
                
        
                const matchesCondition = (
                    (operator === '=' && status === conditionValue) ||
                    (operator === '!=' && status !== conditionValue)
                );
        
                if (isMultipleTimes && hasNewStatus && matchesCondition) {
                    newProcessedRecords.push({
                        userId: user._id,
                        lastProcessedTime: new Date(),
                        processedRecordIds: [userIdStr]
                    });
                }
        
                return hasNewStatus && matchesCondition ? user : null;
            }))).then(results => results.filter(user => user !== null));
        }
        else if (property === 'Logout') {
           
            let logoutHistories;
            if (isWaitForEvent) {
                logoutHistories = yield models_1.LogoutHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    createdAt: { $gte: startDate, $lte: endDate }
                }).sort({ createdAt: -1 });
              
            } else {
                logoutHistories = yield models_1.LogoutHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) }
                }).sort({ createdAt: -1 });
               
            }
        
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userLastLogout = logoutHistories
                    .filter((logout) => logout.userId.toString() === userIdStr)
                    .sort((a, b) => {
                        const dateA = a.createdAt && a.createdAt.$date ? new Date(a.createdAt.$date) : new Date(a.createdAt);
                        const dateB = b.createdAt && b.createdAt.$date ? new Date(b.createdAt.$date) : new Date(b.createdAt);
                        return dateB - dateA;
                    })[0];
        
                if (!userLastLogout || !userLastLogout.createdAt) {
                    return null;
                }
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];

        
                const lastLogoutStr = userLastLogout.createdAt && userLastLogout.createdAt.$date ? userLastLogout.createdAt.$date : userLastLogout.createdAt;
                const lastLogoutDate = new Date(lastLogoutStr);
                const lastLogoutDay = lastLogoutDate.toISOString().split('T')[0];
                const conditionValue = value.split('T')[0];
        
                const hasNewLogout = isMultipleTimes ? 
                    (lastLogoutDate.getTime() > lastProcessedTime.getTime() && !processedIds.includes(userLastLogout._id.toString())) : 
                    true;
        
              
        
                const matchesCondition = (
                    (operator === '>' && lastLogoutDay > conditionValue) ||
                    (operator === '<' && lastLogoutDay < conditionValue) ||
                    (operator === '=' && lastLogoutDay === conditionValue) ||
                    (operator === '!=' && lastLogoutDay !== conditionValue) ||
                    (operator === '>=' && lastLogoutDay >= conditionValue) ||
                    (operator === '<=' && lastLogoutDay <= conditionValue)
                );
        
                if (isMultipleTimes && hasNewLogout && matchesCondition) {
                    newProcessedRecords.push({
                        userId: user._id,
                        lastProcessedTime: new Date(),
                        processedRecordIds: [userLastLogout._id.toString()]
                    });
                }
        
                return hasNewLogout && matchesCondition ? user : null;
            }))).then(results => results.filter(user => user !== null));
        }
        else if (property === 'Update_User_Balance') {
            let balanceHistories;
            if (isWaitForEvent) {
                balanceHistories = yield models_1.BalanceHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    createdAt: { $gte: startDate, $lte: endDate }
                }).sort({ createdAt: -1 });
               
            } else {
                balanceHistories = yield models_1.BalanceHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) }
                }).sort({ createdAt: -1 });
               
            }

        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const latestBalance = balanceHistories
                    .filter((bh) => bh.userId.toString() === userIdStr)
                    .sort((a, b) => {
                        const dateA = a.createdAt && a.createdAt.$date ? new Date(a.createdAt.$date) : new Date(a.createdAt);
                        const dateB = b.createdAt && b.createdAt.$date ? new Date(b.createdAt.$date) : new Date(b.createdAt);
                        return dateB - dateA;
                    })[0];
        
                if (!latestBalance || !latestBalance.currentBalance) {
                    return null;
                }
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                const balanceDate = new Date(latestBalance.createdAt && latestBalance.createdAt.$date ? latestBalance.createdAt.$date : latestBalance.createdAt);
                const hasNewBalance = isMultipleTimes ? 
                    (balanceDate.getTime() > lastProcessedTime.getTime() && !processedIds.includes(latestBalance._id.toString())) : 
                    true;
        
                const currentBalance = latestBalance.currentBalance;
                const conditionValue = Number(value);
                
        
                const matchesCondition = (
                    (operator === '>' && currentBalance > conditionValue) ||
                    (operator === '<' && currentBalance < conditionValue) ||
                    (operator === '=' && currentBalance === conditionValue) ||
                    (operator === '!=' && currentBalance !== conditionValue) ||
                    (operator === '>=' && currentBalance >= conditionValue) ||
                    (operator === '<=' && currentBalance <= conditionValue)
                );
        
                if (isMultipleTimes && hasNewBalance && matchesCondition) {
                    newProcessedRecords.push({
                        userId: user._id,
                        lastProcessedTime: new Date(),
                        processedRecordIds: [latestBalance._id.toString()]
                    });
                   
                }
        
                return hasNewBalance && matchesCondition ? user : null;
            }))).then(results => results.filter(user => user !== null));
        } else if (property === 'Game_Session_Start') {
            let gameHistories;
            if (isWaitForEvent) {
                gameHistories = yield models_1.GameHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    createdAt: { $gte: startDate, $lte: endDate }
                }).sort({ createdAt: -1 });
               
            } else {
                gameHistories = yield models_1.GameHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) }
                }).sort({ createdAt: -1 });
               
            }
        
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userGames = gameHistories.filter((gh) => {
                    const createdAtStr = gh.createdAt && gh.createdAt.$date ? gh.createdAt.$date : gh.createdAt || 'missing';
                    const date = new Date(createdAtStr);
                    return gh.userId.toString() === userIdStr && !isNaN(date.getTime());
                });
        
                if (!userGames.length) {

                    return null;
                }
        
                const latestGame = userGames.reduce((latest, current) => {
                    const latestCreatedAtStr = latest.createdAt && latest.createdAt.$date ? latest.createdAt.$date : latest.createdAt;
                    const currentCreatedAtStr = current.createdAt && current.createdAt.$date ? current.createdAt.$date : current.createdAt;
                    const latestDate = new Date(latestCreatedAtStr);
                    const currentDate = new Date(currentCreatedAtStr);
                    return (currentDate > latestDate) ? current : latest;
                });
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
               
        
                const startCreatedAtStr = latestGame.createdAt && latestGame.createdAt.$date ? latestGame.createdAt.$date : latestGame.createdAt;
                const startTime = new Date(startCreatedAtStr);
                if (isNaN(startTime.getTime())) {
                    return null;
                }
        
                const hasNewSession = isMultipleTimes ? 
                    (startTime.getTime() > lastProcessedTime.getTime() && !processedIds.includes(latestGame._id.toString())) : 
                    true;
        
                const conditionValue = new Date(value).toISOString();
              
        
                const matchesCondition = (
                    (operator === '>' && startTime.toISOString() > conditionValue) ||
                    (operator === '<' && startTime.toISOString() < conditionValue) ||
                    (operator === '=' && startTime.toISOString() === conditionValue) ||
                    (operator === '!=' && startTime.toISOString() !== conditionValue) ||
                    (operator === '>=' && startTime.toISOString() >= conditionValue) ||
                    (operator === '<=' && startTime.toISOString() <= conditionValue)
                );
        
                if (isMultipleTimes && hasNewSession && matchesCondition) {
                    newProcessedRecords.push({
                        userId: user._id,
                        lastProcessedTime: new Date(),
                        processedRecordIds: [latestGame._id.toString()]
                    });
                   
                }
        
                return hasNewSession && matchesCondition ? user : null;
            }))).then(results => results.filter(user => user !== null));
        }
        else if (property === 'Game_Session_End') {
            let gameHistories;
            if (isWaitForEvent) {
                gameHistories = yield models_1.GameHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    createdAt: { $gte: startDate, $lte: endDate }
                }).sort({ createdAt: -1 });
               
            } else {
                gameHistories = yield models_1.GameHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) }
                }).sort({ createdAt: -1 });
               
            }
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userGames = gameHistories.filter((gh) => {
                    const createdAt = gh.createdAt && gh.createdAt.$date ? gh.createdAt.$date : gh.createdAt || 'missing';
                    const date = new Date(createdAt);
                    return gh.userId.toString() === userIdStr && !isNaN(date.getTime());
                });
        
                if (!userGames.length) {
                   
                    return null;
                }
        
                const latestGame = userGames.reduce((latest, current) => {
                    const latestCreatedAt = latest.createdAt && latest.createdAt.$date ? latest.createdAt.$date : latest.createdAt;
                    const currentCreatedAt = current.createdAt && current.createdAt.$date ? current.createdAt.$date : current.createdAt;
                    const latestDate = new Date(latestCreatedAt);
                    const currentDate = new Date(currentCreatedAt);
                    return (currentDate > latestDate) ? current : latest;
                });
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                const endCreatedAt = latestGame.createdAt && latestGame.createdAt.$date ? latestGame.createdAt.$date : latestGame.createdAt;
                const endTime = new Date(endCreatedAt);
                if (isNaN(endTime.getTime())) {
                    return null;
                }
        
                const hasNewSession = isMultipleTimes ? 
                    (endTime.getTime() > lastProcessedTime.getTime() && !processedIds.includes(latestGame._id.toString())) : 
                    true;
        
                const conditionValue = new Date(value).toISOString();
                
        
                const matchesCondition = (
                    (operator === '>' && endTime.toISOString() > conditionValue) ||
                    (operator === '<' && endTime.toISOString() < conditionValue) ||
                    (operator === '=' && endTime.toISOString() === conditionValue) ||
                    (operator === '!=' && endTime.toISOString() !== conditionValue) ||
                    (operator === '>=' && endTime.toISOString() >= conditionValue) ||
                    (operator === '<=' && endTime.toISOString() <= conditionValue)
                );
        
                if (isMultipleTimes && hasNewSession && matchesCondition) {
                    newProcessedRecords.push({
                        userId: user._id,
                        lastProcessedTime: new Date(),
                        processedRecordIds: [latestGame._id.toString()]
                    });
                  
                }
        
                return hasNewSession && matchesCondition ? user : null;
            }))).then(results => results.filter(user => user !== null));
        }
        else if (property === 'Game_Type') {
            
            let gameHistories;
            if (isWaitForEvent) {
                gameHistories = yield models_1.GameHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    createdAt: { $gte: startDate, $lte: endDate }
                }).lean();
               
            } else {
                gameHistories = yield models_1.GameHistories.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) }
                }).lean();
               
            }
        
            const providers = yield models_1.GameProviders.find({ status: true }).lean();
           
        
            const providerTypeMap = {};
            providers.forEach(p => {
                providerTypeMap[p.code] = p.type;
            });

        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userGames = gameHistories.filter((game) => game.userId.toString() === userIdStr);
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
               
        
                const newGames = userGames.filter(game => !processedIds.includes(game._id.toString()));
                const hasNewGames = isMultipleTimes ? newGames.length > 0 : true;
        
                const hasMatchingGameType = (isMultipleTimes ? newGames : userGames).some((game) => {
                    const gameType = providerTypeMap[game.provider_code] || 'unknown';
                    const conditionValue = value.toLowerCase();
                   
                    return (
                        (operator === '=' && gameType === conditionValue) ||
                        (operator === '!=' && gameType !== conditionValue)
                    );
                }) || false;
        
               
        
                if (isMultipleTimes && hasNewGames && hasMatchingGameType) {
                    const newRecordIds = newGames
                        .filter(game => {
                            const gameType = providerTypeMap[game.provider_code] || 'unknown';
                            const conditionValue = value.toLowerCase();
                            return (
                                (operator === '=' && gameType === conditionValue) ||
                                (operator === '!=' && gameType !== conditionValue)
                            );
                        })
                        .map(game => game._id.toString());
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                       
                    }
                }
        
                return hasNewGames && hasMatchingGameType ? user : null;
            }))).then(results => results.filter(user => user !== null));
        } else if (property === 'Minimum_Bet_Amount') {
            let sportsStakes;
            if (isWaitForEvent) {
                sportsStakes = yield models_1.SportsBets.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    createdAt: { $gte: startDate, $lte: endDate }
                });
               
            } else {
                sportsStakes = yield models_1.SportsBets.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) }
                });
               
            }
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userStakes = sportsStakes.filter((stake) => {
                    const stakeUserIdStr = typeof stake.userId === 'object' && stake.userId._id ? stake.userId._id.toString() : stake.userId.toString();
                    return stakeUserIdStr === userIdStr;
                });
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
               
        
                const newStakes = userStakes.filter(stake => !processedIds.includes(stake._id.toString()));
                const hasNewStakes = isMultipleTimes ? newStakes.length > 0 : true;
        
                const totalStake = (isMultipleTimes ? newStakes : userStakes).reduce((acc, stake) => acc + (stake.stake || 0), 0);
        
                const matchesCondition = (
                    (operator === '>' && totalStake > Number(value)) ||
                    (operator === '=' && totalStake === Number(value)) ||
                    (operator === '!=' && totalStake !== Number(value)) ||
                    (operator === '>=' && totalStake >= Number(value))
                );
        
                if (isMultipleTimes && hasNewStakes && matchesCondition) {
                    const newRecordIds = newStakes.map(stake => stake._id.toString());
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                    }
                }
        
                return hasNewStakes && matchesCondition ? user : null;
            }))).then(results => results.filter(user => user !== null));
        }
        else if (property === 'Push_Notifications') {
            
            let notifications;
            if (isWaitForEvent) {
                notifications = yield models_1.Notification.find({
                    createdAt: { $gte: startDate, $lte: endDate },
                    status: true
                });
            } else {
                const currentDate = new Date();
                const oneDayAgo = new Date(currentDate);
                oneDayAgo.setDate(currentDate.getDate() - 1);
                const endOfDay = new Date(currentDate);
                endOfDay.setHours(23, 59, 59, 999);
                
                notifications = yield models_1.Notification.find({
                    createdAt: { $gte: oneDayAgo, $lte: endOfDay },
                    status: true
                });
            }
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                const newNotifications = notifications.filter(n => !processedIds.includes(n._id.toString()));
                const hasNewNotifications = isMultipleTimes ? newNotifications.length > 0 : true;
        
                const hasNotification = (isMultipleTimes ? newNotifications : notifications).some(notification => {
                    const players = notification.players || [];
                    const viewers = notification.viewers || [];
                    const isPlayerIncluded = players.includes(userIdStr) || players.includes("all");
                    const isViewerIncluded = viewers.includes(userIdStr);
                    return isPlayerIncluded || isViewerIncluded;
                });
        
                const matchesCondition = (
                    (operator === '=' && hasNotification && value === 'true') ||
                    (operator === '!=' && !hasNotification && value === 'true')
                );
        
                if (isMultipleTimes && hasNewNotifications && matchesCondition) {
                    const newRecordIds = newNotifications
                        .filter(notification => {
                            const players = notification.players || [];
                            const viewers = notification.viewers || [];
                            const isPlayerIncluded = players.includes(userIdStr) || players.includes("all");
                            const isViewerIncluded = viewers.includes(userIdStr);
                            return isPlayerIncluded || isViewerIncluded;
                        })
                        .map(n => n._id.toString());
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                    }
                }
        
                return hasNewNotifications && matchesCondition ? user : null;
            }))).then(results => results.filter(user => user !== null));
        }
        else if (property === 'Admin-Only_Events') {
            
            const users = yield models_1.Users.find({
                _id: { $in: filteredPlayers.map((u) => u._id) }
            }).select('rolesId updatedAt');
        
            const roleIds = users.map(u => u.rolesId?._id).filter(id => id);
        
            const adminRoles = yield models_1.Roles.find({
                _id: { $in: roleIds },
                type: { $in: ['admin', 'super_admin'] }
            });

        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userData = users.find(u => u._id.toString() === userIdStr);
                const userRoleId = userData?.rolesId?._id?.toString();
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
               
        
                const updatedAt = userData?.updatedAt ? new Date(userData.updatedAt) : null;
                let hasNewRole = isMultipleTimes ? !processedIds.includes(userIdStr) : true;
        
                if (isWaitForEvent && updatedAt) {
                    hasNewRole = hasNewRole && updatedAt >= startDate && updatedAt <= endDate;
                }
        
                const isAdmin = adminRoles.some(role => role._id.toString() === userRoleId);
                const conditionValue = value === 'true';
        
                const matchesCondition = (
                    (operator === '=' && isAdmin === conditionValue) ||
                    (operator === '!=' && isAdmin !== conditionValue)
                );
        
                if (isMultipleTimes && hasNewRole && matchesCondition) {
                    newProcessedRecords.push({
                        userId: user._id,
                        lastProcessedTime: new Date(),
                        processedRecordIds: [userIdStr]
                    });
                   
                }
        
                return hasNewRole && matchesCondition ? user : null;
            }))).then(results => results.filter(user => user !== null));
           
        } else if (property === 'Email_Notifications') {
           
            
            const users = yield models_1.Users.find({
                _id: { $in: filteredPlayers.map((u) => u._id) }
            }).select('email');
        
            let emailRecords;
            if (isWaitForEvent) {
                emailRecords = yield models_1.MarketingHistory.find({
                    templateId: { $exists: true, $ne: "" },
                    createdAt: { $gte: startDate, $lte: endDate }
                });
                
            } else {
                const currentDate = new Date();
                const oneDayAgo = new Date(currentDate);
                oneDayAgo.setDate(currentDate.getDate() - 1);
                const endOfDay = new Date(currentDate);
                endOfDay.setHours(23, 59, 59, 999);
        
                emailRecords = yield models_1.MarketingHistory.find({
                    templateId: { $exists: true, $ne: "" },
                    createdAt: { $gte: oneDayAgo, $lte: endOfDay }
                });
               
            }
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userData = users.find(u => u._id.toString() === userIdStr);
                const userEmail = userData?.email;
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
               
        
                const newEmailRecords = emailRecords.filter(record => !processedIds.includes(record._id.toString()));
                const hasNewEmails = isMultipleTimes ? newEmailRecords.length > 0 : true;
        
                const hasEmailNotification = (isMultipleTimes ? newEmailRecords : emailRecords).some(record => {
                    const receivers = record.receivers || [];
                    return receivers.includes(userEmail) || receivers.includes("all");
                });
        
        
                const matchesCondition = (
                    (operator === '=' && hasEmailNotification && value === 'true') ||
                    (operator === '!=' && !hasEmailNotification && value === 'true')
                );
        
                if (isMultipleTimes && hasNewEmails && matchesCondition) {
                    const newRecordIds = newEmailRecords
                        .filter(record => {
                            const receivers = record.receivers || [];
                            return receivers.includes(userEmail) || receivers.includes("all");
                        })
                        .map(record => record._id.toString());
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                    }
                }
        
                return hasNewEmails && matchesCondition ? user : null;
            }))).then(results => results.filter(user => user !== null));
           
        }
        else if (property === 'SMS_Notifications') {
          
            
            const users = yield models_1.Users.find({
                _id: { $in: filteredPlayers.map((u) => u._id) }
            }).select('phone');
          
        
            let smsRecords;
            if (isWaitForEvent) {
                smsRecords = yield models_1.MarketingHistory.find({
                    $or: [{ templateId: { $exists: false } }, { templateId: "" }],
                    createdAt: { $gte: startDate, $lte: endDate }
                });
               
            } else {
                const currentDate = new Date();
                const oneDayAgo = new Date(currentDate);
                oneDayAgo.setDate(currentDate.getDate() - 1);
                const endOfDay = new Date(currentDate);
                endOfDay.setHours(23, 59, 59, 999);
        
                smsRecords = yield models_1.MarketingHistory.find({
                    $or: [{ templateId: { $exists: false } }, { templateId: "" }],
                    createdAt: { $gte: oneDayAgo, $lte: endOfDay }
                });
              
            }
        
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userData = users.find(u => u._id.toString() === userIdStr);
                const userPhone = userData?.phone;
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
               
        
                const newSmsRecords = smsRecords.filter(record => !processedIds.includes(record._id.toString()));
                const hasNewSms = isMultipleTimes ? newSmsRecords.length > 0 : true;
        
                const hasSmsNotification = (isMultipleTimes ? newSmsRecords : smsRecords).some(record => {
                    const receivers = record.receivers || [];
                    return receivers.includes(userPhone) || receivers.includes("all");
                });
        
                const matchesCondition = (
                    (operator === '=' && hasSmsNotification && value === 'true') ||
                    (operator === '!=' && !hasSmsNotification && value === 'true')
                );
        
                if (isMultipleTimes && hasNewSms && matchesCondition) {
                    const newRecordIds = newSmsRecords
                        .filter(record => {
                            const receivers = record.receivers || [];
                            return receivers.includes(userPhone) || receivers.includes("all");
                        })
                        .map(record => record._id.toString());
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                    }
                }
        
                return hasNewSms && matchesCondition ? user : null;
            }))).then(results => results.filter(user => user !== null));
        }
        else if (property === 'Geolocation') {
            
            const users = yield models_1.Users.find({
                _id: { $in: filteredPlayers.map((u) => u._id) }
            }).select('country updatedAt');
        
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userData = users.find(u => u._id.toString() === userIdStr);
                const userCountry = userData?.country || '';
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                const updatedAt = userData?.updatedAt ? new Date(userData.updatedAt) : null;
                let hasNewCountry = isMultipleTimes ? !processedIds.includes(userIdStr) : true;
        
                if (isWaitForEvent && updatedAt) {
                    hasNewCountry = hasNewCountry && updatedAt >= startDate && updatedAt <= endDate;
                }
        
                const conditionValue = value.toUpperCase();
        
                const matchesCondition = (
                    (operator === '=' && userCountry === conditionValue) ||
                    (operator === '!=' && userCountry !== conditionValue)
                );
        
                if (isMultipleTimes && hasNewCountry && matchesCondition) {
                    newProcessedRecords.push({
                        userId: user._id,
                        lastProcessedTime: new Date(),
                        processedRecordIds: [userIdStr]
                    });
                }
        
                return hasNewCountry && matchesCondition ? user : null;
            }))).then(results => results.filter(user => user !== null));
        } else if (property === 'User_Tier') {
            
            let users;
            try {
                users = yield models_1.Users.find({
                    _id: { $in: filteredPlayers.map((u) => u._id) }
                }).select('tiers updatedAt').lean();
            } catch (error) {
                return filteredPlayers;
            }
        
            if (!users || users.length === 0) {
                return filteredPlayers;
            }
        
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userData = users.find(u => u._id.toString() === userIdStr);
        
                if (!userData) {
                    return null;
                }
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                const updatedAt = userData.updatedAt ? new Date(userData.updatedAt) : null;
                let hasNewTier = isMultipleTimes ? !processedIds.includes(userIdStr) : true;
        
                if (isWaitForEvent && updatedAt) {
                    hasNewTier = hasNewTier && updatedAt >= startDate && updatedAt <= endDate;
                }
        
                const tiersValue = userData.tiers;
                let userTiers = [];
                if (Array.isArray(tiersValue)) {
                    userTiers = tiersValue.map(t => t.toString());
                } else if (tiersValue && typeof tiersValue === 'object' && tiersValue.toString) {
                    userTiers = [tiersValue.toString()];
                } else if (tiersValue && typeof tiersValue === 'string') {
                    userTiers = [tiersValue];
                } 
        
                const conditionValue = value.toString();
                const hasTier = userTiers.includes(conditionValue);
            
        
                const matchesCondition = (
                    (operator === '=' && hasTier) ||
                    (operator === '!=' && !hasTier)
                );
        
                if (isMultipleTimes && hasNewTier && matchesCondition) {
                    newProcessedRecords.push({
                        userId: user._id,
                        lastProcessedTime: new Date(),
                        processedRecordIds: [userIdStr]
                    });
                }
        
                return hasNewTier && matchesCondition ? user : null;
            }))).then(results => results.filter(user => user !== null));
        }
        else if (property === 'Localization') {
            
            let users;
            try {
                users = yield models_1.Users.find({
                    _id: { $in: filteredPlayers.map((u) => u._id) }
                }).select('country updatedAt').lean();
            } catch (error) {
                return filteredPlayers;
            }
        
            if (!users || users.length === 0) {
                return filteredPlayers;
            }
        
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userData = users.find(u => u._id.toString() === userIdStr);
                const userCountry = userData?.country?.toString();
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                const updatedAt = userData?.updatedAt ? new Date(userData.updatedAt) : null;
                let hasNewCountry = isMultipleTimes ? !processedIds.includes(userIdStr) : true;
        
                if (isWaitForEvent && updatedAt) {
                    hasNewCountry = hasNewCountry && updatedAt >= startDate && updatedAt <= endDate;
                }
        
                const conditionLanguage = value.toLowerCase();
                const expectedCountries = languageToCountryMap[conditionLanguage];
                if (!expectedCountries || !Array.isArray(expectedCountries)) {
                    return null;
                }
        
                const hasMatchingCountry = userCountry && expectedCountries.includes(userCountry.toUpperCase());
        
                const matchesCondition = (
                    (operator === '=' && hasMatchingCountry) ||
                    (operator === '!=' && !hasMatchingCountry)
                );
        
                if (isMultipleTimes && hasNewCountry && matchesCondition) {
                    newProcessedRecords.push({
                        userId: user._id,
                        lastProcessedTime: new Date(),
                        processedRecordIds: [userIdStr]
                    });
                }
        
                return hasNewCountry && matchesCondition ? user : null;
            }))).then(results => results.filter(user => user !== null));
        } else if (property === 'Award_Bonus') {
            
            const userIds = filteredPlayers.map((u) => u._id);
            let balances;
            try {
                if (isWaitForEvent) {
                    const usersWithRecentUpdates = yield models_1.Users.find({
                        _id: { $in: userIds },
                        updatedAt: { $gte: startDate, $lte: endDate }
                    }).select('_id');
                    const recentUserIds = usersWithRecentUpdates.map(u => u._id);
                    balances = yield models_1.Balances.find({
                        userId: { $in: recentUserIds },
                        status: true
                    }).select('userId bonus updatedAt');
                   
                } else {
                    balances = yield models_1.Balances.find({
                        userId: { $in: userIds },
                        status: true
                    }).select('userId bonus');
                   
                }
            } catch (error) {
               
                return filteredPlayers;
            }

        
            const conditionValue = parseFloat(value) || 0;
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userBalance = balances.find(b => b.userId.toString() === userIdStr);
                const userBonus = userBalance ? userBalance.bonus : 0;
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                let hasNewBonus = isMultipleTimes ? !processedIds.includes(userIdStr) : true;
                const updatedAt = userBalance?.updatedAt ? new Date(userBalance.updatedAt) : null;
        
                if (isWaitForEvent && updatedAt) {
                    hasNewBonus = hasNewBonus && updatedAt >= startDate && updatedAt <= endDate;
                }
        
                const hasMatchingBonus = (
                    (operator === '=' && userBonus === conditionValue) ||
                    (operator === '>' && userBonus > conditionValue) ||
                    (operator === '<' && userBonus < conditionValue) ||
                    (operator === '>=' && userBonus >= conditionValue) ||
                    (operator === '<=' && userBonus <= conditionValue) ||
                    (operator === '!=' && userBonus !== conditionValue)
                );
        
                if (isMultipleTimes && hasNewBonus && hasMatchingBonus) {
                    newProcessedRecords.push({
                        userId: user._id,
                        lastProcessedTime: new Date(),
                        processedRecordIds: [userIdStr]
                    });
                }
        
                return hasNewBonus && hasMatchingBonus ? user : null;
            }))).then(results => results.filter(user => user !== null));
        } else if (property === 'VIP_points') {
            
            const userIds = filteredPlayers.map((u) => u._id);
            let histories;
            try {
                if (isWaitForEvent) {
                    histories = yield models_1.BalanceHistories.find({
                        userId: { $in: userIds },
                        amount: { $lt: 0 },
                        createdAt: { $gte: startDate, $lte: endDate }
                    }).select('userId amount createdAt');
                } else {
                    histories = yield models_1.BalanceHistories.find({
                        userId: { $in: userIds },
                        amount: { $lt: 0 }
                    }).select('userId amount createdAt');
                }
            } catch (error) {
                return filteredPlayers;
            }
        
            const conditionValue = parseFloat(value) || 0;
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userHistories = histories.filter(h => h.userId.toString() === userIdStr);
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                const newHistories = userHistories.filter(h => !processedIds.includes(h._id.toString()));
                const hasNewHistories = isMultipleTimes ? newHistories.length > 0 : true;
        
                const vipPoints = (isMultipleTimes ? newHistories : userHistories).reduce((acc, history) => {
                    return acc + Math.abs(history.amount) / 5;
                }, 0);
        
                const hasMatchingPoints = (
                    (operator === '=' && vipPoints === conditionValue) ||
                    (operator === '>' && vipPoints > conditionValue) ||
                    (operator === '<' && vipPoints < conditionValue) ||
                    (operator === '>=' && vipPoints >= conditionValue) ||
                    (operator === '<=' && vipPoints <= conditionValue) ||
                    (operator === '!=' && vipPoints !== conditionValue)
                );
        
                if (isMultipleTimes && hasNewHistories && hasMatchingPoints) {
                    const newRecordIds = newHistories.map(h => h._id.toString());
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                    }
                }
        
                return hasNewHistories && hasMatchingPoints ? user : null;
            }))).then(results => results.filter(user => user !== null));
        }
        else if (property === 'time_spend') {
            
            const userIds = filteredPlayers.map((u) => u._id);
            let users;
            try {
                users = yield models_1.Users.find({
                    _id: { $in: userIds }
                }).select('_id timeSpent updatedAt');
            } catch (error) {
                return filteredPlayers;
            }
        
            const conditionValueInSeconds = (parseFloat(value) || 0) * 60;
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userData = users.find(u => u._id.toString() === userIdStr);
                const userTimeSpent = userData && userData.timeSpent ? userData.timeSpent : 0;
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                const updatedAt = userData?.updatedAt ? new Date(userData.updatedAt) : null;
                let hasNewTimeSpent = isMultipleTimes ? !processedIds.includes(userIdStr) : true;
        
                if (isWaitForEvent && updatedAt) {
                    hasNewTimeSpent = hasNewTimeSpent && updatedAt >= startDate && updatedAt <= endDate;
                }
        
                const hasMatchingTime = (
                    (operator === '=' && userTimeSpent === conditionValueInSeconds) ||
                    (operator === '>' && userTimeSpent > conditionValueInSeconds) ||
                    (operator === '<' && userTimeSpent < conditionValueInSeconds) ||
                    (operator === '>=' && userTimeSpent >= conditionValueInSeconds) ||
                    (operator === '<=' && userTimeSpent <= conditionValueInSeconds) ||
                    (operator === '!=' && userTimeSpent !== conditionValueInSeconds)
                );
        
                if (isMultipleTimes && hasNewTimeSpent && hasMatchingTime) {
                    newProcessedRecords.push({
                        userId: user._id,
                        lastProcessedTime: new Date(),
                        processedRecordIds: [userIdStr]
                    });
                }
        
                return hasNewTimeSpent && hasMatchingTime ? user : null;
            }))).then(results => results.filter(user => user !== null));
        } else if (property === 'visite_page') {
            
            const userIds = filteredPlayers.map((u) => u._id);
            let users;
            try {
                users = yield models_1.Users.find({
                    _id: { $in: userIds }
                }).select('_id LastOpenPage updatedAt');
            } catch (error) {
                return filteredPlayers;
            }
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userData = users.find(u => u._id.toString() === userIdStr);
                const userLastOpenPage = userData && userData.LastOpenPage ? userData.LastOpenPage : "";
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
        
                const updatedAt = userData?.updatedAt ? new Date(userData.updatedAt) : null;
                let hasNewPage = isMultipleTimes ? !processedIds.includes(userIdStr) : true;
        
                if (isWaitForEvent && updatedAt) {
                    hasNewPage = hasNewPage && updatedAt >= startDate && updatedAt <= endDate;
                }
        
                const hasMatchingPage = (
                    (operator === '=' && userLastOpenPage === value) ||
                    (operator === '!=' && userLastOpenPage !== value)
                );
        
               
        
                if (isMultipleTimes && hasNewPage && hasMatchingPage) {
                    newProcessedRecords.push({
                        userId: user._id,
                        lastProcessedTime: new Date(),
                        processedRecordIds: [userIdStr]
                    });
                   
                }
        
                return hasNewPage && hasMatchingPage ? user : null;
            }))).then(results => results.filter(user => user !== null));
        } else if (property === 'Deposit_Canceled') {
           
            let payments;
            if (isWaitForEvent) {
                payments = yield models_1.Payments.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    ipn_type: "deposit",
                    status_text: "canceled",
                    createdAt: { $gte: startDate, $lte: endDate }
                }).select('userId amount status_text createdAt');
              
            } else {
                payments = yield models_1.Payments.find({
                    userId: { $in: filteredPlayers.map((u) => u._id) },
                    ipn_type: "deposit",
                    status_text: "canceled"
                }).select('userId amount status_text createdAt');
               
            }
        
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userDeposits = payments.filter((p) => p.userId.toString() === userIdStr);
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
               
        
                const newDeposits = userDeposits.filter(deposit => !processedIds.includes(deposit._id.toString()));
                const hasNewDeposits = isMultipleTimes ? newDeposits.length > 0 : true;
        
                const hasMatchingAmount = (isMultipleTimes ? newDeposits : userDeposits).some((deposit) => {
                    const amountValue = Number(deposit.amount);
                    const conditionValue = Number(value);
                   
                    return (
                        (operator === '>' && amountValue > conditionValue) ||
                        (operator === '<' && amountValue < conditionValue) ||
                        (operator === '=' && amountValue === conditionValue) ||
                        (operator === '!=' && amountValue !== conditionValue) ||
                        (operator === '>=' && amountValue >= conditionValue) ||
                        (operator === '<=' && amountValue <= conditionValue)
                    );
                }) || false;
        
               
        
                if (isMultipleTimes && hasNewDeposits && hasMatchingAmount) {
                    const newRecordIds = newDeposits
                        .filter(deposit => {
                            const amountValue = Number(deposit.amount);
                            const conditionValue = Number(value);
                            return (
                                (operator === '>' && amountValue > conditionValue) ||
                                (operator === '<' && amountValue < conditionValue) ||
                                (operator === '=' && amountValue === conditionValue) ||
                                (operator === '!=' && amountValue !== conditionValue) ||
                                (operator === '>=' && amountValue >= conditionValue) ||
                                (operator === '<=' && amountValue <= conditionValue)
                            );
                        })
                        .map(deposit => deposit._id);
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                      
                    }
                }
        
                return hasNewDeposits && hasMatchingAmount ? user : null;
            }))).then(results => results.filter(user => user !== null));
        } else if (property === 'Balance') {
            
            const userIds = filteredPlayers.map((u) => u._id);
            let balances;
            try {
                if (isWaitForEvent) {
                    const usersWithRecentUpdates = yield models_1.Users.find({
                        _id: { $in: userIds },
                        updatedAt: { $gte: startDate, $lte: endDate }
                    }).select('_id');
                    const recentUserIds = usersWithRecentUpdates.map(u => u._id);
                    balances = yield models_1.Balances.find({
                        userId: { $in: recentUserIds },
                        status: true
                    }).select('userId balance updatedAt');
                   
                } else {
                    balances = yield models_1.Balances.find({
                        userId: { $in: userIds },
                        status: true
                    }).select('userId balance');
                   
                }
            } catch (error) {
                return filteredPlayers;
            }

        
            const conditionValue = parseFloat(value) || 0;
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userBalance = balances.find(b => b.userId.toString() === userIdStr);
                const userBalanceAmount = userBalance ? userBalance.balance : 0;
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
               
        
                let hasNewBalance = isMultipleTimes ? !processedIds.includes(userIdStr) : true;
                const updatedAt = userBalance?.updatedAt ? new Date(userBalance.updatedAt) : null;
        
                if (isWaitForEvent && updatedAt) {
                    hasNewBalance = hasNewBalance && updatedAt >= startDate && updatedAt <= endDate;
                }
        
                const hasMatchingBalance = (
                    (operator === '=' && userBalanceAmount === conditionValue) ||
                    (operator === '>' && userBalanceAmount > conditionValue) ||
                    (operator === '<' && userBalanceAmount < conditionValue) ||
                    (operator === '>=' && userBalanceAmount >= conditionValue) ||
                    (operator === '<=' && userBalanceAmount <= conditionValue) ||
                    (operator === '!=' && userBalanceAmount !== conditionValue)
                );
        
               
        
                if (isMultipleTimes && hasNewBalance && hasMatchingBalance) {
                    newProcessedRecords.push({
                        userId: user._id,
                        lastProcessedTime: new Date(),
                        processedRecordIds: [userIdStr]
                    });
                   
                }
        
                return hasNewBalance && hasMatchingBalance ? user : null;
            }))).then(results => results.filter(user => user !== null));
        } else if (property === 'Bonus_balance') {
            
            const userIds = filteredPlayers.map((u) => u._id);
            let balances;
            try {
                if (isWaitForEvent) {
                    const usersWithRecentUpdates = yield models_1.Users.find({
                        _id: { $in: userIds },
                        updatedAt: { $gte: startDate, $lte: endDate }
                    }).select('_id');
                    const recentUserIds = usersWithRecentUpdates.map(u => u._id);
                    balances = yield models_1.Balances.find({
                        userId: { $in: recentUserIds },
                        status: true
                    }).select('userId bonus updatedAt');
                   
                } else {
                    balances = yield models_1.Balances.find({
                        userId: { $in: userIds },
                        status: true
                    }).select('userId bonus');
                   
                }
            } catch (error) {
              
                return filteredPlayers;
            }

        
            const conditionValue = parseFloat(value) || 0;
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userBalance = balances.find(b => b.userId.toString() === userIdStr);
                const userBonusBalance = userBalance ? userBalance.bonus : 0;
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
               
        
                let hasNewBonusBalance = isMultipleTimes ? !processedIds.includes(userIdStr) : true;
                const updatedAt = userBalance?.updatedAt ? new Date(userBalance.updatedAt) : null;
        
                if (isWaitForEvent && updatedAt) {
                    hasNewBonusBalance = hasNewBonusBalance && updatedAt >= startDate && updatedAt <= endDate;
                }
        
                const hasMatchingBonusBalance = (
                    (operator === '=' && userBonusBalance === conditionValue) ||
                    (operator === '>' && userBonusBalance > conditionValue) ||
                    (operator === '<' && userBonusBalance < conditionValue) ||
                    (operator === '>=' && userBonusBalance >= conditionValue) ||
                    (operator === '<=' && userBonusBalance <= conditionValue) ||
                    (operator === '!=' && userBonusBalance !== conditionValue)
                );
        
               
        
                if (isMultipleTimes && hasNewBonusBalance && hasMatchingBonusBalance) {
                    newProcessedRecords.push({
                        userId: user._id,
                        lastProcessedTime: new Date(),
                        processedRecordIds: [userIdStr]
                    });
                }
        
                return hasNewBonusBalance && hasMatchingBonusBalance ? user : null;
            }))).then(results => results.filter(user => user !== null));
          
        } else if (property === 'Bonus_get') {
           
            
            const { dateOperator, dateValue, amountOperator, amountValue } = condition;
           
        
            const userIds = filteredPlayers.map((u) => u._id);
            let bonusHistories;
            try {
                if (isWaitForEvent) {
                    bonusHistories = yield models_1.BonusHistories.find({
                        userId: { $in: userIds },
                        createdAt: { $gte: startDate, $lte: endDate }
                    }).select('userId amount createdAt');
                   
                } else {
                    bonusHistories = yield models_1.BonusHistories.find({
                        userId: { $in: userIds }
                    }).select('userId amount createdAt');
                    
                }
            } catch (error) {
                return filteredPlayers;
            }
        
        
            const conditionDate = new Date(dateValue);
            const conditionAmount = parseFloat(amountValue) || 0;
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userBonuses = bonusHistories.filter(b => b.userId.toString() === userIdStr);
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
            
        
                const newBonuses = userBonuses.filter(bonus => !processedIds.includes(bonus._id.toString()));
                const hasNewBonuses = isMultipleTimes ? newBonuses.length > 0 : true;
        
                const matchesConditions = (isMultipleTimes ? newBonuses : userBonuses).some(bonus => {
                    const bonusDate = new Date(bonus.createdAt);
                    const bonusDateStr = bonusDate.toISOString().split('T')[0];
                    const conditionDateStr = conditionDate.toISOString().split('T')[0];
                    const bonusAmount = Number(bonus.amount) || 0;
        
                    const matchesDateCondition = (
                        (dateOperator === '=' && bonusDateStr === conditionDateStr) ||
                        (dateOperator === '>' && bonusDate > conditionDate) ||
                        (dateOperator === '<' && bonusDate < conditionDate) ||
                        (dateOperator === '>=' && bonusDate >= conditionDate) ||
                        (dateOperator === '<=' && bonusDate <= conditionDate) ||
                        (dateOperator === '!=' && bonusDateStr !== conditionDateStr)
                    );
        
                    const matchesAmountCondition = (
                        (amountOperator === '=' && bonusAmount === conditionAmount) ||
                        (amountOperator === '>' && bonusAmount > conditionAmount) ||
                        (amountOperator === '<' && bonusAmount < conditionAmount) ||
                        (amountOperator === '>=' && bonusAmount >= conditionAmount) ||
                        (amountOperator === '<=' && bonusAmount <= conditionAmount) ||
                        (amountOperator === '!=' && bonusAmount !== conditionAmount)
                    );
        
                   
        
                    return matchesDateCondition && matchesAmountCondition;
                }) || false;
        
                
        
                if (isMultipleTimes && hasNewBonuses && matchesConditions) {
                    const newRecordIds = newBonuses
                        .filter(bonus => {
                            const bonusDate = new Date(bonus.createdAt);
                            const bonusDateStr = bonusDate.toISOString().split('T')[0];
                            const conditionDateStr = conditionDate.toISOString().split('T')[0];
                            const bonusAmount = Number(bonus.amount) || 0;
        
                            const matchesDateCondition = (
                                (dateOperator === '=' && bonusDateStr === conditionDateStr) ||
                                (dateOperator === '>' && bonusDate > conditionDate) ||
                                (dateOperator === '<' && bonusDate < conditionDate) ||
                                (dateOperator === '>=' && bonusDate >= conditionDate) ||
                                (dateOperator === '<=' && bonusDate <= conditionDate) ||
                                (dateOperator === '!=' && bonusDateStr !== conditionDateStr)
                            );
        
                            const matchesAmountCondition = (
                                (amountOperator === '=' && bonusAmount === conditionAmount) ||
                                (amountOperator === '>' && bonusAmount > conditionAmount) ||
                                (amountOperator === '<' && bonusAmount < conditionAmount) ||
                                (amountOperator === '>=' && bonusAmount >= conditionAmount) ||
                                (amountOperator === '<=' && bonusAmount <= conditionAmount) ||
                                (amountOperator === '!=' && bonusAmount !== conditionAmount)
                            );
        
                            return matchesDateCondition && matchesAmountCondition;
                        })
                        .map(bonus => bonus._id.toString());
                    if (newRecordIds.length > 0) {
                        newProcessedRecords.push({
                            userId: user._id,
                            lastProcessedTime: new Date(),
                            processedRecordIds: newRecordIds
                        });
                      
                    }
                }
        
                return hasNewBonuses && matchesConditions ? user : null;
            }))).then(results => results.filter(user => user !== null));
           
        } else if (property === 'net_lose') {
         
        
            const userIds = filteredPlayers.map((u) => u._id);
            let balances;
            try {
                balances = yield models_1.Balances.find({
                    userId: { $in: userIds },
                    status: true
                }).select('userId balance');
               
            } catch (error) {
               
                return filteredPlayers;
            }

        
            const conditionValue = parseFloat(value) || 0;
        
            filteredPlayers = yield Promise.all(filteredPlayers.map(user => __awaiter(void 0, void 0, void 0, function* () {
                const userIdStr = user._id.toString();
                const userBalance = balances.find(b => b.userId.toString() === userIdStr);
                const userBalanceAmount = userBalance ? userBalance.balance : 0;
        
                const lastProcessed = processedRecords.find(pr => pr.userId.toString() === userIdStr);
                const lastProcessedTime = lastProcessed ? new Date(lastProcessed.lastProcessedTime) : new Date(0);
                const processedIds = lastProcessed?.processedRecordIds.map(id => id.toString()) || [];
               
        
                let payments;
                try {
                    const query = {
                        status: 3,
                        userId: user._id
                    };
                    if (isWaitForEvent) {
                        query.createdAt = { $gte: startDate, $lte: endDate };
                    }
                    payments = yield models_1.Payments.find(query).select('ipn_type actually_paid');
                  
                } catch (error) {
                    return null;
                }
        
                let deposit = 0;
                let withdraw = 0;
                payments.forEach((row) => {
                    if (row.ipn_type === 'deposit') {
                        deposit += row.actually_paid || 0;
                    }
                    if (row.ipn_type === 'withdrawal') {
                        withdraw += row.actually_paid || 0;
                    }
                });
        
                const netLose = deposit - withdraw - userBalanceAmount;
        
                if (netLose <= 0) {
                    return null;
                }
        
                const matchesCondition = (
                    (operator === '=' && netLose === conditionValue) ||
                    (operator === '>' && netLose > conditionValue) ||
                    (operator === '<' && netLose < conditionValue) ||
                    (operator === '>=' && netLose >= conditionValue) ||
                    (operator === '<=' && netLose <= conditionValue) ||
                    (operator === '!=' && netLose !== conditionValue)
                );
        
            

                if (isMultipleTimes && matchesCondition) {
                    newProcessedRecords.push({
                        userId: user._id,
                        lastProcessedTime: new Date(),
                        processedRecordIds: [userIdStr]
                    });
                }
        
                return matchesCondition ? user : null;
            }))).then(results => results.filter(user => user !== null));
        } 
    }

    if (isMultipleTimes && newProcessedRecords.length > 0) {
        for (const record of newProcessedRecords) {
            const existingRecord = yield models_1.Journeys.findOne(
                { _id: campaign._id, "processedRecords.userId": record.userId }
            );
    
            if (existingRecord) {
                yield models_1.Journeys.updateOne(
                    { _id: campaign._id, "processedRecords.userId": record.userId },
                    { 
                        $set: { "processedRecords.$.lastProcessedTime": record.lastProcessedTime },
                        $addToSet: { "processedRecords.$.processedRecordIds": { $each: record.processedRecordIds } }
                    }
                );
              
            } else {
                yield models_1.Journeys.updateOne(
                    { _id: campaign._id },
                    { $push: { processedRecords: record } }
                );
                
            }
        }
    }
    return filteredPlayers;
});

module.exports = { applyConditions };