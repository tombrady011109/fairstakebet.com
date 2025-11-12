const mongoose = require('mongoose');
const PlinkoGame = require('../../../models/games/plinko/plinko_gameV2');
const PlinkoHistory = require('../../../models/games/plinko/plinko_game_history');
const PlinkoEncrypt = require('../../../models/games/plinko/plinko_encryped_seeds');
const Profile = require('../../../models/user.model');
const utils = require('./plinkoGameUtils');

// ...PAYOUTS and calculateProbabilities as in your original code...

async function handleUpdateWallet(data, emitter) {
  let balance = 0, prev_bal = 0;
  let bet_amount = parseFloat(data.betAmount);
  let getBalance = await Profile.findById(data._id);
  prev_bal = parseFloat(getBalance.balance);
  if (!data.won && prev_bal < bet_amount) {
    throw new Error('Not enough balance!');
  }
  balance = prev_bal + (data.won ? parseFloat(data.profit) : -bet_amount);
  emitter('plinko-wallet', [{ ...data, balance }]);
  await Profile.findByIdAndUpdate(data._id, { balance });
  return balance;
}

function getPayout(betValue, path, PAYOUTS) {
  const { risk, rows } = betValue;
  const payouts = PAYOUTS[risk][rows];
  return payouts[path.map(p => Math.round(p)).reduce((t, e) => t + e, 0)];
}

async function handleBet(data, emitter, PAYOUTS, calculateProbabilities) {
  const { _id, betValue } = data;
  let seeds = await PlinkoEncrypt.findOne({ is_open: false, user_id: _id }).sort({ _id: -1 });
  if (!seeds) {
    const serverSeed = utils.generateServerSeed();
    const hash_seed = utils.hashServerSeed(serverSeed);
    const n_serverSeed = utils.generateServerSeed();
    const n_hash_seed = utils.hashServerSeed(n_serverSeed);
    [seeds] = await PlinkoEncrypt.create([
      {
        server_seed: serverSeed,
        hash_seed,
        user_id: _id,
        client_seed: utils.generateRandomString(10),
        next_hash_seed: n_hash_seed,
        next_server_seed: n_serverSeed,
      },
    ]);
  }
  const path = utils.generatePlinkoBallPath(seeds.client_seed, seeds.nonce, seeds.server_seed, betValue.rows);
  const odds = getPayout(betValue, path, PAYOUTS);
  const [game] = await PlinkoGame.create([
    {
      user_id: _id,
      seed_id: seeds.seed_id,
      bet_amount: parseFloat(data.betAmount),
      token: data.currencyName,
      token_img: data.currencyImage,
      payout: odds,
      risk: betValue.risk,
      rows: betValue.rows,
      chance: calculateProbabilities(8, 16)[betValue.rows][PAYOUTS[betValue.risk][betValue.rows].indexOf(odds)],
      won: odds >= 1,
      profit: odds >= 1 ? parseFloat(data.betAmount) * odds : 0,
      path,
      nonce: seeds.nonce + 1,
    },
  ]);
  const balance = await handleUpdateWallet(
    {
      ...data,
      token: data.currencyName,
      betAmount: odds < 1 ? parseFloat(data.betAmount) - parseFloat(data.betAmount) * odds : parseFloat(data.betAmount),
      won: odds >= 1,
      profit: odds === 1 ? 0 : game.profit - parseFloat(data.betAmount),
    },
    emitter
  );
  await Promise.all([
    PlinkoEncrypt.updateOne({ seed_id: seeds.seed_id }, { $inc: { nonce: 1 } }),
    PlinkoHistory.create([
      {
        bet_id: game.bet_id,
        bet_amount: parseFloat(data.betAmount),
        token: data.currencyName,
        token_img: data.currencyImage,
        user_id: data._id,
        payout: odds,
        won: odds >= 1,
      },
    ]),
  ]);
  return {
    betId: game.bet_id,
    userId: _id,
    name: data.name,
    hidden: data.hidden,
    avatar: data.avatar,
    chance: game.chance,
    currencyName: data.currencyName,
    currencyImage: data.currencyImage,
    betAmount: data.betAmount,
    winAmount: odds >= 1 ? parseFloat(data.betAmount) * odds : 0,
    odds,
    betTime: game.time,
    gameValue: {
      path: path.map(p => Math.round(p)).join(''),
      risk: betValue.risk,
      row: betValue.rows,
    },
  };
}

async function getRecentBets(data = {}) {
  const bets = await PlinkoHistory.find(data)
    .sort({ _id: -1 })
    .limit(15)
    .lean()
    .then((bets) =>
      Promise.all(
        bets.map(async (bet) => {
          return utils.populateUser({
            ...bet,
            betId: bet.bet_id,
            betAmount: bet.bet_amount,
            currencyImage: bet.token_img,
            currencyName: bet.token,
            odds: bet.payout,
            betTime: bet.time,
          });
        })
      )
    );
  return bets;
}

module.exports = {
  handleBet,
  getRecentBets,
  handleUpdateWallet,
  getPayout,
};