const crypto = require('crypto');
// const Bills = require('../model/bill');
const mongoose = require('mongoose');
const PlinkoGame = require('../model/games/plinko/plinko_gameV2');
const PlinkoHistory = require('../model/games/plinko/plinko_game_history');
const PlinkoEncrypt = require('../model/games/plinko/plinko_encryped_seeds');
const { wallet } = require("../wallet_transaction")
const Profile = require('../model/profile');
const { generateRandomString } = require('../utils/generators');
// const { handleWagerIncrease } = require('../profile_mangement/index');
function calculateProbabilities(startRow, endRow) {
  let probabilities = {};
  const pascalTriangle = (function (rows) {
    let triangle = [];
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      triangle[rowIndex] = [];
      for (let colIndex = 0; colIndex < rowIndex + 1; colIndex++) {
        let value;
        value = (colIndex == 0 || colIndex == rowIndex) ? 1 : triangle[rowIndex - 1][colIndex - 1] + triangle[rowIndex - 1][colIndex],
        triangle[rowIndex][colIndex] = value;
      }
    }
    return triangle;
  })(++endRow);
  for (let row = startRow; row < endRow; row++) {
    let total = pascalTriangle[row].reduce((sum, num) => sum + num, 0);
    probabilities[row] = [];
    pascalTriangle[row].forEach((num) => probabilities[row].push(num / total));
  }
  return probabilities;
}
const PAYOUTS = {
  1: {
    8: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    9: [5.6, 2, 1.6, 1, 0.7, 0.7, 1, 1.6, 2, 5.6],
    10: [8.9, 3, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 3, 8.9],
    11: [8.4, 3, 1.9, 1.3, 1, 0.7, 0.7, 1, 1.3, 1.9, 3, 8.4],
    12: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
    13: [8.1, 4, 3, 1.9, 1.2, 0.9, 0.7, 0.7, 0.9, 1.2, 1.9, 3, 4, 8.1],
    14: [7.1, 4, 1.9, 1.4, 1.3, 1.1, 1, 0.5, 1, 1.1, 1.3, 1.4, 1.9, 4, 7.1],
    15: [15, 8, 3, 2, 1.5, 1.1, 1, 0.7, 0.7, 1, 1.1, 1.5, 2, 3, 8, 15],
    16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
  },
  2: {
    8: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    9: [18, 4, 1.7, 0.9, 0.5, 0.5, 0.9, 1.7, 4, 18],
    10: [22, 5, 2, 1.4, 0.6, 0.4, 0.6, 1.4, 2, 5, 22],
    11: [24, 6, 3, 1.8, 0.7, 0.5, 0.5, 0.7, 1.8, 3, 6, 24],
    12: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    13: [43, 13, 6, 3, 1.3, 0.7, 0.4, 0.4, 0.7, 1.3, 3, 6, 13, 43],
    14: [58, 15, 7, 4, 1.9, 1, 0.5, 0.2, 0.5, 1, 1.9, 4, 7, 15, 58],
    15: [88, 18, 11, 5, 3, 1.3, 0.5, 0.3, 0.3, 0.5, 1.3, 3, 5, 11, 18, 88],
    16: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
  },
  3: {
    8: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
    9: [43, 7, 2, 0.6, 0.2, 0.2, 0.6, 2, 7, 43],
    10: [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76],
    11: [120, 14, 5.2, 1.4, 0.4, 0.2, 0.2, 0.4, 1.4, 5.2, 14, 120],
    12: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
    13: [260, 37, 11, 4, 1, 0.2, 0.2, 0.2, 0.2, 1, 4, 11, 37, 260],
    14: [420, 56, 18, 5, 1.9, 0.3, 0.2, 0.2, 0.2, 0.3, 1.9, 5, 18, 56, 420],
    15: [620, 83, 27, 8, 3, 0.5, 0.2, 0.2, 0.2, 0.2, 0.5, 3, 8, 27, 83, 620],
    16: [1e3, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1e3],
  },
};

const handleUpdatewallet = async (data, emitter) => {
  let balance = 0,
    prev_bal = 0;
  let bet_amount = parseFloat(data.betAmount);
  if (data.token === 'Fun') {
    let sjj = await wallet.fun.find({ user_id: data.userId });
    prev_bal = parseFloat(sjj[0].balance);

    if (!data.won && prev_bal < bet_amount) {
      throw new Error('Not enough balance!');
    }

    balance = prev_bal + (data.won ? parseFloat(data.profit) : -bet_amount);
    emitter('plinko-wallet', [{ ...data, balance }]);
    await wallet.fun.updateOne(
      { user_id: data.userId },
      { balance }
    );
  } else if (data.token === 'USDT') {
    let sjj = await wallet.usdt.find({ user_id: data.userId });
    prev_bal = parseFloat(sjj[0].balance);
    if (!data.cashout && prev_bal < bet_amount) {
      throw new Error('Not enough balance!');
    }
    balance = prev_bal + (data.won ? parseFloat(data.profit) : -bet_amount);
    emitter('plinko-wallet', [{ ...data, balance }]);
    await wallet.usdt.updateOne(
      { user_id: data.userId },
      { balance }
    );
  }
  return balance;
};

function getPayout(betValue, path) {
  const { risk, row } = betValue;
  const payouts = PAYOUTS[risk][row];
  return payouts[path.map(p => Math.round(p)).reduce((t, e) => t + e, 0)];
}

function generateHash(clientSeed, nonce, serverSeed) {
  const hmac = crypto.createHmac('sha512', serverSeed);
  const data = `${clientSeed}:${nonce}`;
  hmac.update(data);
  return hmac.digest('hex');
}

function generatePlinkoBallPath(clientSeed, nonce, serverSeed) {
  const hash = generateHash(clientSeed, nonce, serverSeed);
  const hashList = String(hash).match(/.{2}/g);
  let path = [];
  for (let i = 0, l = hashList.length; i < l; i += 4) {
    let num =
      parseInt(hashList[i], 16) / Math.pow(256, 1) +
      parseInt(hashList[i + 1], 16) / Math.pow(256, 2) +
      parseInt(hashList[i + 2], 16) / Math.pow(256, 3) +
      parseInt(hashList[i + 3], 16) / Math.pow(256, 4);
    path.push(num);
  }

  return path;
}

const handleBet = async (data, emitter) => {
  const { userId: user_id, betValue } = data;
  try {
    let seeds = await PlinkoEncrypt.findOne({ is_open: false, user_id })
      .sort({ _id: -1 });
    if (!seeds) {
      const serverSeed = crypto.randomBytes(32).toString('hex');
      const hash_seed = crypto
        .createHash('sha256')
        .update(serverSeed)
        .digest('hex');
      const n_serverSeed = crypto.randomBytes(32).toString('hex');
      const n_hash_seed = crypto
        .createHash('sha256')
        .update(n_serverSeed)
        .digest('hex');
      [seeds] = await PlinkoEncrypt.create(
        [
          {
            server_seed: serverSeed,
            hash_seed,
            user_id: user_id,
            client_seed: generateRandomString(10),
            next_hash_seed: n_hash_seed,
            next_server_seed: n_serverSeed,
          },
        ],
      );
    }

    const path = generatePlinkoBallPath(
      seeds.client_seed,
      seeds.nonce,
      seeds.server_seed
    ).slice(0, betValue.row);
    const odds = getPayout(betValue, path);

    const [game] = await PlinkoGame.create(
      [
        {
          user_id,
          seed_id: seeds.seed_id,
          bet_amount: parseFloat(data.betAmount),
          token: data.currencyName,
          token_img: data.currencyImage,
          payout: odds,
          risk: betValue.risk,
          rows: betValue.row,
          chance: calculateProbabilities(8, 16)[betValue.row][PAYOUTS[betValue.risk][betValue.row].indexOf(odds)],
          won: odds >= 1,
          profit: odds >= 1 ? parseFloat(data.betAmount) * odds : 0,
          path,
          nonce: seeds.nonce + 1,
        },
      ],
    );
    
    const balance = await handleUpdatewallet(
      {
        ...data,
        token: data.currencyName,
        betAmount:
          odds < 1
            ? parseFloat(data.betAmount) - parseFloat(data.betAmount) * odds
            : parseFloat(data.betAmount),
        won: odds >= 1,
        profit: odds === 1 ? 0 : game.profit - parseFloat(data.betAmount),
      },
      emitter);

    // if (data.token !== 'PPF') {
    //   handleWagerIncrease({
    //     bet_amount: parseFloat(data.betAmount),
    //     user_id,
    //     token: data.currencyName,
    //   });
    // }

    await Promise.all([
      PlinkoEncrypt.updateOne(
        { seed_id: seeds.seed_id },
        { $inc: { nonce: 1 } }
      ),
      // Bills.create(
      //   [
      //     {
      //       user_id,
      //       transaction_type: 'Plinko',
      //       token_img: data.currencyImage,
      //       token_name: data.currencyName,
      //       balance,
      //       trx_amount: parseFloat(data.betAmount),
      //       datetime: game.time,
      //       status: odds >= 1,
      //       bill_id: game.bet_id,
      //     },
      //   ],
      // ),
      PlinkoHistory.create(
        [
          {
            bet_id: game.bet_id,
            bet_amount: parseFloat(data.betAmount),
            token: data.currencyName,
            token_img: data.currencyImage,
            user_id: data.userId,
            payout: odds,
            won: odds >= 1,
          },
        ],
      ),
    ]);
    return {
      betId: game.bet_id,
      userId: user_id,
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
        row: betValue.row,
      },
    };
  } catch (e) {
    console.log('bet error => ', e);
    throw e;
  }
};

async function populateUser(data) {
  const user = await Profile.findOne({ user_id: data.user_id });
  data = {
    ...data,
    userId: user.user_id,
    hidden: user.hidden_from_public,
    name: user.hidden_from_public ? '' : user.username,
    avatar: user.hidden_from_public ? '' : user.profile_image,
  };
  return data;
}

const getRecentBets = async (data = {}) => {
  try {
    const bets = await PlinkoHistory.find(data)
      .sort({ _id: -1 })
      .limit(15)
      .lean()
      .then((bets) =>
        Promise.all(
          bets.map(async (bet) => {
            return populateUser({
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
  } catch (e) {
    console.log('recent bets Error > ', e);
    throw e;
  }
};

const recentBets = async (req, res) => {
  try {
    return res.status(200).json({
      bets: await getRecentBets(),
    });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
};

const gameDetail = async (req, res) => {
  const { betID: bet_id } = req.params;
  try {
    let game = await PlinkoGame.findOne({ bet_id }).lean();
    if (!game) throw new Error('Game not found!');
  
    const seeds = await PlinkoEncrypt.findOne({ seed_id: game.seed_id });
    game = await populateUser(game);

    return res.status(200).json({
      betLog: {
        betId: game.bet_id,
        betTime: game.time,
        name: game.name,
        avatar: game.avatar,
        userId: game.user_id,
        hidden: game.hidden,
        gameValue: {
          path: game.path,
          risk: game.risk,
          row: game.rows,
        },
        currencyName: game.token,
        currencyImage: game.token_img,
        profit: game.profit - game.bet_amount,
        payout: game.payout,
        won: game.won,
        betAmount: game.bet_amount,
        nonce: game.nonce || seeds.nonce,
      },
      seedHistory: {
        serverSeed: seeds.is_open ? seeds.server_seed : '',
        clientSeed: seeds.client_seed,
        serverSeedHash: seeds.hash_seed,
        nxt_hash: seeds.next_hash_seed,
        maxNonce: seeds.nonce,
      },
    });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
};

const gameSeeds = async (req, res) => {
  const { user_id } = req.id;
  try {
    const seeds = await PlinkoEncrypt.findOne({ is_open: false, user_id }).sort(
      {
        _id: -1,
      }
    );
    return res.status(200).json({
      seedHistory: {
        serverSeed: seeds.is_open ? seeds.server_seed : '',
        clientSeed: seeds.client_seed,
        serverSeedHash: seeds.hash_seed,
        nxt_hash: seeds.next_hash_seed,
        maxNonce: seeds.nonce,
      },
    });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
};
const userBets = async (req, res) => {
  const { user_id } = req.id;
  try {
    return res.status(200).json({
      bets: await getRecentBets({ user_id }),
    });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
};

const updateSeeds = async (req, res) => {
  const { user_id } = req.id;
  const { client_seed } = req.body;
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const seeds = await PlinkoEncrypt.findOne({ is_open: false, user_id })
      .sort({ _id: -1 })
      .session(session);
    if (!seeds) throw new Error('Seeds not found. Play at least one game!');

    if (!client_seed) throw new Error('Client Seed not found!');

    const { next_server_seed: server_seed, next_hash_seed: hash_seed } = seeds;

    await PlinkoEncrypt.updateOne(
      { seed_id: seeds.seed_id },
      {
        is_open: true,
      }
    ).session(session);
    const n_serverSeed = crypto.randomBytes(32).toString('hex');
    const n_hash_seed = crypto
      .createHash('sha256')
      .update(n_serverSeed)
      .digest('hex');
    await PlinkoEncrypt.create(
      [
        {
          server_seed,
          hash_seed,
          user_id,
          client_seed,
          next_hash_seed: n_hash_seed,
          next_server_seed: n_serverSeed,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    await session.endSession();

    return res.status(200).json({
      seeds: {
        serverSeed: seeds.server_seed,
        clientSeed: seeds.client_seed,
        serverSeedHash: seeds.hash_seed,
        maxNonce: seeds.nonce,
      },
    });
  } catch (e) {
    await session.abortTransaction();
    await session.endSession();
    res.status(500).json({ status: false, message: e.message });
  }
};

class PlinkoGameSocket {
  constructor(io) {
    this.io = io;
  }
  

  listen() {
    this.io.on('connection', (socket) => {
      socket.on('plinko-init', async (_, callback) => {
        socket.join('plinko-game');
        const result = await getRecentBets();
        try {
          callback({
            code: 0,
            data: {
              betLogs: result,
            },
          });
        } catch (error) {
          callback({ code: -1, message: error.message });
        }
      });
      socket.on('plinko-bet', async (data, callback) => {
        if (!data.userId) {
          callback({ code: -1, message: 'UserId Not found' });
          return;
        }
        try {
          const bet = await handleBet(data, (event, payload) => {
            this.io.to('plinko-game').emit(event, payload);
          });
          // console.log('On bet complete => ', bet);
          this.io.to('plinko-game').emit('plinkoBet', bet);
          callback({ code: 0, data: bet });
        } catch (error) {
          callback({ code: -1, message: error.message });
        }
      });
    });
  }
}

module.exports = {
  PlinkoGameSocket,
  updateSeeds,
  userBets,
  recentBets,
  gameDetail,
  gameSeeds,
};
