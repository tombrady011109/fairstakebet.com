const { format } = require("date-fns");
const mongoose = require("mongoose");
const Profile = require("../../../models/user.model");
const CrashBet = require("../../../models/games/crash/crashbet");
const CrashGameModel = require("../../../models/games/crash/crashgameV2");
const CrashGameHash = require("../../../models/games/crash/crashgamehash");
const crypto = require("crypto");
const CryptoJS = require("crypto-js");
const { SALT } = require("./utils");

const handleCrashHistory = async (req, res) => {
  try {
    const data = await CrashGameModel.find({ concluded: true })
      .sort({ _id: -1 })
      .lean()
      .limit(15);
      
    res.status(200).json({
      recent: data.map((d) => ({
        gameId: d.game_id,
        hash: d.hash,
        crashedAt: d.crash_point,
      })),
    });
  } catch (error) {
    res.status(500).json({ error });
  }
};

async function populateUser(data) {
  const user = await Profile.findOne({ user_id: data.user_id });
  data.user = {
    user_id: user.user_id,
    hidden: user.hidden_from_public,
    username: user.hidden_from_public ? "" : user.username,
    image: user.hidden_from_public ? "" : user.profileImg,
  };
  return data;
}

const handleBetDetails = async (req, res) => {
  const { betID: bet_id } = req.params;
  try {
    const data = await CrashBet.findOne({ bet_id }).lean();
    if (!data)
      return res.status(404).json({ message: "Bet not found!", error: true });
    const game = await CrashGameModel.findOne({ game_id: data.game_id }).lean();
    await populateUser(data);
    const details = {
      userID: data.user_id,
      betID: data.bet_id,
      name: data.user.username,
      hidden: data.user.hidden,
      avatar: data.user.image,
      gameID: data.game_id,
      won: data.won,
      currencyName: data.token,
      payout: data.payout,
      betType: data.bet_type,
      crashPoint: game.crash_point,
      gameHash: game.hash,
      betAmount: parseFloat(data.bet),
      betTime: data.bet_time,
      winAmount: data.won ? parseFloat(data.payout * data.bet) : 0,
      profitAmount: data.won ? data.bet * data.payout - data.bet : 0,
    };
    res.status(200).json({ details });
  } catch (error) {
    console.log("Bet details error ", error);
    res.status(500).json({ error });
  }
};

const handleCrashGamePlayers = async (req, res) => {
  const { gameID: game_id } = req.params;
  try {
    const data = await CrashBet.find({ game_id });
    const players = await Promise.all(
      data.map(async (b) => {
        await populateUser(b);
        return {
          userID: b.user_id,
          betID: b.bet_id,
          name: b.user.username,
          hidden: b.user.hidden,
          avatar: b.user.image,
          gameID: b.game_id,
          won: b.won,
          currencyName: b.token,
          currencyImage: b.token_img,
          payout: b.payout,
          amount: b.won ? b.bet * b.payout - b.bet : 0,
        };
      })
    );
    res.status(200).json({ players });
  } catch (error) {
    res.status(500).json({ error });
  }
};

const handleMybets = async (req, res) => {
  try {
    const user_id = req.id;
    const { size } = req.body;
    const data = await CrashBet.find({ user_id })
      .sort({ _id: -1 })
      .limit(size || 20);

    const bets = await Promise.all(
      data.map(async (b) => {
        await populateUser(b);
        return {
          betId: b.bet_id,
          currencyName: b.token,
          currencyImage: b.token_img,
          userName: b.user.username,
          name: b.user.username,
          userId: b.user_id,
          hidden: b.user.hidden,
          avatar: b.user.image,
          gameId: b.game_id,
          won: b.won,
          odds: b.payout * 10000,
          betAmount: parseFloat(b.bet),
          winAmount: b.won ? parseFloat(b.payout * b.bet) : 0,
          profitAmount: b.won ? b.bet * b.payout - b.bet : 0,
          nickName: b.username,
          betTime: b.bet_time,
        };
      })
    );
    res.status(200).json({ bets });
  } catch (error) {
    console.log("Error", error);
    res.status(500).json({ error });
  }
};

const resetCrashDB = async (req, res) => {
  await generateHashes(input, 2_000);
  console.log("Reset complete");
  res.status(200).json({ message: "Done" });
};

const input = `13d64828e4187853581fdaf22758c13843bbb91e518c67a44c6b55a1cc3e3a5a`;
const numberOfTimesToHash = 300000;

function generateHashes(seed, numberOfHashes) {
  let currentHash = seed;
  return new Promise((resolve) => {
    const createHash = async () => {
      if (numberOfHashes-- > 0) {
        currentHash = crypto
          .createHash("sha256")
          .update(currentHash)
          .digest("hex");
        await CrashGameHash.create([
          {
            hash: currentHash,
          },
        ]);
        console.log("generated hash => ", currentHash, numberOfHashes);
        setTimeout(createHash, 50);
      } else {
        console.log("Generated hashes completed");
        resolve(0);
      }
    };
    createHash();
  });
}

// generateHashes(input, numberOfTimesToHash)

const verify = async (req, res) => {
  try {
    const { data } = req.body;
    const gameResult = (seed, salt) => {
      const nBits = 52; // number of most significant bits to use
    
      // 1. HMAC_SHA256(message=seed, key=salt)  
      const hmac = CryptoJS.HmacSHA256(CryptoJS.enc.Hex.parse(seed), salt);
      seed = hmac.toString(CryptoJS.enc.Hex);
    
      // 2. r = 52 most significant bits
      seed = seed.slice(0, nBits / 4);
      const r = parseInt(seed, 16);
    
      // 3. X = r / 2^52
      let X = r / Math.pow(2, nBits); // uniformly distributed in [0; 1)
      X = parseFloat(X.toPrecision(9));
    
      // 4. X = 99 / (1-X)
      X = 99 / (1 - X);
    
      // 5. return max(trunc(X), 100)
      const result = Math.floor(X);
      return Math.max(1, result / 100);
    };
    const point = gameResult(data?.hash_seed, data?.salt);
    return res.status(200).json(point);
  }
  catch(err) {
    console.log(err);
    return res.status(403).json("Server Error");
  }
};

module.exports = {
  handleCrashHistory,
  handleMybets,
  handleCrashGamePlayers,
  handleBetDetails,
  resetCrashDB,
  verify
};
