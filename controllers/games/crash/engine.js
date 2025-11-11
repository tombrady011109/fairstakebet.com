const UserBalance = require("../../../models/user.model");
const CrashBet = require("../../../models/games/crash/crashbet");
const CrashGameModel = require("../../../models/games/crash/crashgameV2");
const CrashGameLock = require("../../../models/games/crash/crash_endgame_lock");
const CrashGameHash = require("../../../models/games/crash/crashgamehash");
const Bills = require("../../../models/bill");

const { ensureFiftyBots } = require('../../../controllers/user.controller');
const { calculateCrashPoint, calculateElapsed, calculateRate, waitFor } = require('./utils');

const botNames = [
  'Emily', 'James', 'Sophia', 'Liam', 'Olivia', 'Noah', 'Ava', 'Mason', 'Isabella', 'Lucas',
  'Mia', 'Ethan', 'Charlotte', 'Logan', 'Amelia', 'Benjamin', 'Harper', 'Jacob', 'Ella', 'Michael',
  'Scarlett', 'Alexander', 'Grace', 'Daniel', 'Chloe', 'Jack', 'Emma', 'Henry', 'Zoe', 'Samuel',
  'Layla', 'David', 'Matthew', 'Sofia', 'Jackson', 'Victoria', 'Sebastian', 'Penelope', 'Carter',
  'Riley', 'Wyatt', 'Lily', 'Julian', 'Nora', 'Levi', 'Hazel', 'Isaac', 'Aurora', 'Gabriel'
];
const botAvatars = [
  // Add avatar URLs or use faker for random ones
  "https://randomuser.me/api/portraits/women/1.jpg",
  "https://randomuser.me/api/portraits/men/2.jpg",
  "https://randomuser.me/api/portraits/women/3.jpg",
  "https://randomuser.me/api/portraits/men/4.jpg",
  "https://randomuser.me/api/portraits/women/5.jpg",
  "https://randomuser.me/api/portraits/men/6.jpg",
  // ...repeat or randomize as needed
];
const botCurrency = [
  { name: "USDT", image: "/assets/tokens/usdt.svg" },
  { name: "BTC", image: "/assets/tokens/btc.svg" },
  { name: "ETH", image: "/assets/tokens/eth.svg" },
  { name: "BNB", image: "/assets/tokens/bnb.svg" }
];

const GameStatus = {
  0: "CONNECTION",
  1: "STARTING",
  2: "PROGRESS",
  3: "ENDED",
  CONNECTION: 0,
  STARTING: 1,
  PROGRESS: 2,
  ENDED: 3,
};

const NEXT_GAME_DELAY = 3000; // 3 seconds

class CrashGame {
  constructor() {
    this.bets = [];
    this.xBets = [];
    this.status = 0;
    this.gameId = 0;
    this.hash = "";
    this.escapes = [];
    this.crash_point = 0;
    this.maxRate = 100;
    this.prepareTime = 5000;
    this.startTime = Date.now();
  }

  get running() {
    return this.status === GameStatus.PROGRESS;
  }
  get canBet() {
    return this.status === GameStatus.STARTING;
  }

  get currentRate() {
    return calculateRate(Date.now() - this.startTime);
  }
}

class CrashGameEngine {
  constructor(io) {
    this.io = io;
    this.game = new CrashGame();
    this.botUsers = []; // <-- Add this line
    this.betBuffer = [];         // <-- Add this line
    this.betEmitTimeout = null; 
    this.botAvatars = [
      "https://randomuser.me/api/portraits/women/1.jpg",
      "https://randomuser.me/api/portraits/men/2.jpg",
      "https://randomuser.me/api/portraits/women/3.jpg",
      "https://randomuser.me/api/portraits/men/4.jpg",
      "https://randomuser.me/api/portraits/women/5.jpg",
      "https://randomuser.me/api/portraits/men/6.jpg",
      // ...repeat or randomize as needed
    ];
    this.botCurrency = [
      { name: "USDT", image: "/assets/tokens/usdt.svg" },
      { name: "BTC", image: "/assets/tokens/btc.svg" },
      { name: "ETH", image: "/assets/tokens/eth.svg" },
      { name: "BNB", image: "/assets/tokens/bnb.svg" }
    ];
    // Ensure exactly 50 bots on startup
    ensureFiftyBots(botNames, botAvatars).then(bots => {
      this.botUsers = bots;
     
    });

    io.on("connection", (socket) => {
      socket.on("join", (data, callback) => {
        socket.join("crash-game");
        callback({
          code: 0,
          data: {
            gameId: this.game.gameId,
            status: this.game.status,
            prepareTime: this.game.prepareTime,
            startTime: this.game.startTime,
            hash: this.game.status < 3 ? "" : this.game.hash,
            maxRate: this.game.maxRate * 100,
            players: this.game.bets.map((b) => ({
              userId: b.userId,
              name: b.hidden ? "Hidden" : b.name,
              avatar: b.avatar,
              hidden: b.hidden,
              currencyName: b.currencyName,
              currencyImage: b.currencyImage,
              bet: b.bet,
              rate: this.game.escapes.find(e => e.userId === b.userId)?.rate || 0,
            })),
            xBets: this.game.xBets.map((b) => ({
              userId: b.userId,
              hidden: b.hidden,
              name: b.hidden ? "Hidden" : b.name,
              avatar: b.avatar,
              currencyName: b.currencyName,
              currencyImage: b.currencyImage,
              bet: b.bet,
              type: b.x,
            })),
          },
        });
      });
      socket.on("throw-bet", async (data, callback) => {
        if (!data.userId) {
          callback({ code: -1, message: "UserId Not found" });
          return;
        }
        
        try {
          // Allow zero bet amounts (for spectating)
          if (
            this.game.canBet &&
            data.gameId === this.game.gameId &&
            this.game.bets.findIndex((b) => b.userId === data.userId) === -1
          ) {
            const newBet = {
              ...data,
              name: data.hidden ? "Hidden" : data.name,
              betTime: new Date(),
              // Flag to identify spectators (zero bet amount)
              isSpectator: data.bet === 0
            };
            
            // Only deduct balance for non-spectator bets
            if (!newBet.isSpectator && newBet.bet > 0) {
              // Deduct the bet amount from user's balance
              await UserBalance.findByIdAndUpdate(
                data.userId,
                { $inc: { balance: -newBet.bet } }
              );
              
              // Create a bill record for the bet
              await Bills.create([{
                user_id: newBet.userId,
                transaction_type: "Crash Game Bet",
                token_img: newBet.currencyImage,
                token_name: newBet.currencyName,
                balance: newBet.bet,
                trx_amount: -newBet.bet,
                datetime: newBet.betTime,
                status: false,
                bill_id: Math.floor(Math.random()*100000000),
              }]);
            }
            
            await CrashGameModel.findOneAndUpdate(
              { game_id: this.game.gameId },
              {
                $push: {
                  bets: {
                    user_id: newBet.userId,
                    bet_time: newBet.betTime,
                    name: newBet.name,
                    avatar: newBet.avatar,
                    hidden: newBet.hidden,
                    token: newBet.currencyName,
                    token_img: newBet.currencyImage,
                    bet: newBet.bet,
                    auto_escape: newBet.autoEscapeRate,
                    bet_type: 0,
                    is_spectator: newBet.isSpectator
                  },
                },
              }
            );
            
            this.game.bets.push(newBet);
            
            // Use this.io consistently throughout the code
            this.betBuffer.push(newBet);
            if (!this.betEmitTimeout) {
              this.betEmitTimeout = setTimeout(() => {
                this.io.to("crash-game").emit("b-batch", this.betBuffer);
                this.betBuffer = [];
                this.betEmitTimeout = null;
              }, 200); // Adjust interval as needed
            }
            
            callback({ code: 0 });
          } else {
            callback({ code: 0 });
          }
        } catch (error) {
          console.error("Error processing bet:", error);
          callback({ code: -1, message: "Failed to process bet" });
        }
      });

      socket.on("throw-xbet", async (data, callback) => {
        if (!data.userId) {
          callback({ code: -1, message: "UserId Not found" });
          return;
        }
        // Handle TrendBall bet
        if (
          this.game.canBet &&
          data.gameId === this.game.gameId &&
          this.game.xBets.findIndex(
            (b) => b.userId === data.userId && b.x === data.x
          ) === -1
        ) {
          const newBet = {
            ...data,
            name: data.hidden ? "Hidden" : data.name,
            betTime: new Date(),
          };
          await CrashGameModel.findOneAndUpdate(
            { game_id: this.game.gameId },
            {
              $push: {
                bets: {
                  user_id: newBet.userId,
                  bet_time: newBet.betTime,
                  token: newBet.currencyName,
                  token_img: newBet.currencyImage,
                  name: newBet.name,
                  avatar: newBet.avatar,
                  hidden: newBet.hidden,
                  bet: newBet.bet,
                  auto_escape: newBet.x === -200 ? 1.96 : 2,
                  bet_type: newBet.x,
                },
              },
            }
          );
          this.game.xBets.push(newBet);
          this.io.to("crash-game").emit("xb", newBet);
        }
        callback({ code: 0 });
      });

      socket.on("throw-escape", async (data, callback) => {
        if (!data.userId) {
          callback({ code: -1, message: "UserId Not found" });
          return;
        }
        if (
          this.game.running &&
          data.gameId == this.game.gameId &&
          this.game.bets.findIndex((b) => b.userId === data.userId) !== -1 &&
          this.game.escapes.findIndex((e) => e.userId === data.userId) === -1
        ) {
          const bet = this.game.bets.find((b) => b.userId === data.userId);
          const rate = this.game.currentRate;
          await CrashGameModel.findOneAndUpdate(
            { game_id: this.game.gameId },
            {
              $push: {
                escapes: {
                  user_id: bet.userId,
                  rate,
                },
              },
            }
          );
          this.handleEscape(bet, rate);
        }
        callback({ code: 0 });
      });
    });
  }

  // --- BOT LOGIC ---
  startCrashBots() {
    if (!Array.isArray(this.botUsers) || !this.botUsers.length) return;
    if (this.game.canBet) {
      // Shuffle and pick a random number of bots (e.g., 10-30)
      const shuffledBots = this.botUsers.sort(() => Math.random() - 0.5);
      const botCount = Math.floor(Math.random() * 21) + 10; // 10-30 bots
      for (let i = 0; i < botCount; i++) {
        const bot = shuffledBots[i];
        if (this.game.bets.findIndex((b) => b.userId === String(bot._id)) === -1) {
          // ...create and place bet for this bot...
          const avatar = this.botAvatars[Math.floor(Math.random() * this.botAvatars.length)];
          const currency = this.botCurrency[Math.floor(Math.random() * this.botCurrency.length)];
          const bet = Number((Math.random() * 9.9 + 0.1).toFixed(2));
          const autoEscapeRate = Number((Math.random() * 8.8 + 1.2).toFixed(2));

          const newBet = {
            userId: String(bot._id),
            name: bot.username,
            avatar,
            hidden: false,
            currencyName: currency.name,
            currencyImage: currency.image,
            bet,
            autoEscapeRate,
            betTime: new Date(),
            isSpectator: false,
            gameId: this.game.gameId
          };
          this.handleBotBet(newBet);
        }
      }
    }
  }
  // --- END BOT LOGIC ---

  async gameLoop() {
    clearTimeout(this.loopTimeout);

    let rate = this.game.currentRate;
    if (rate >= this.game.crash_point) {
      rate = this.game.crash_point;
      //crashed
      try {
        await CrashGameModel.updateOne(
          { game_id: this.game.gameId },
          { status: 3 }
        );
        const crashedAt = Date.now();
        this.game.status = 3;
        this.io.to("crash-game").emit("ed", {
          maxRate: rate * 100,
          hash: this.game.hash,
        });

        await this.handlePayouts(rate);

        this.io.to("crash-game").emit("mybet", {
          bets: [
            ...this.game.bets.map((b) => {
              const escapeRate = this.game.escapes.find(e => e.userId === b.userId)?.rate || 0
              const data = {
                ...b,
                gameId: this.game.gameId,
                betAmount: b.bet,
                winAmount: escapeRate * b.bet,
                odds: escapeRate * 10000,
                type: b.betType,
                time: b.betTime,
                name: b.hidden ? "Hidden" : b.name,
              }
              return data;
            }),
            ...this.game.xBets.map((b) => {
              let escapeRate = b.x === -200 ? 1.96 : (b.x === 200 ? 2 : 10);
              if ((b.x === -200 && rate > 2) || (b.x === 200 && rate < 2) || (b.x === 1000 && rate < 10)) {
                escapeRate = 0;
              } 
              const data = {
                ...b,
                gameId: this.game.gameId,
                betAmount: b.bet,
                winAmount: escapeRate * b.bet,
                odds: escapeRate * 10000,
                type: b.betType,
                time: b.betTime,
                name: b.hidden ? "Hidden" : b.name,
              };
              return data;
             }),
          ],
        });

        this.io.to("crash-game").emit("st", {
          gameId: this.game.gameId,
          hash: this.game.hash,
          maxRate: rate * 100,
          escapes: this.game.escapes.map((e) => ({
            betId: this.game.bets.find((b) => b.userId === e.userId)?.betId || "xxx",
            userId: e.userId,
            currencyImage: e.currencyImage,
            currencyName: e.currencyName,
            name: e.hidden ? "Hidden" : e.name,
            rate: e.rate,
          })),
          xBets: this.game.xBets.map((e) => ({
            betId:
              this.game.xBets.find((b) => b.userId === e.userId)?.betId ||
              "xxx",
            userId: e.userId,
            currencyImage: e.currencyImage,
            currencyName: e.currencyName,
            name: e.hidden ? "Hidden" : e.name,
            rate: e.x === -200 ? 1.96 : e.x === 200 ? 2 : 10,
          })),
        });

        // --- CLEAR BOT BETS LIST AFTER CRASH ---
        this.game.bets = [];
        this.game.xBets = [];
        this.game.escapes = [];
        // ----------------------------------------

        const timeDiff = Date.now() - crashedAt;
        if (timeDiff < NEXT_GAME_DELAY)
          await waitFor(NEXT_GAME_DELAY - timeDiff);
        await this.run();
      }  catch (error) {
        console.log("Error in game end ", error);
      } 
    } else {
      const autoEscapes = this.game.bets.filter(
        (b) => !!b.autoEscapeRate && rate >= b.autoEscapeRate && !b.escaped
      );
      autoEscapes.forEach((b) => this.handleEscape(b, b.autoEscapeRate));
      this.io.to("crash-game").emit("pg", { elapsed: calculateElapsed(rate) });
      this.loopTimeout = setTimeout(this.gameLoop.bind(this), 35);
    }
  }

  async handleEscape(bet, rate = this.game.currentRate) {
    if (!bet) return;
    bet.escaped = true;
    bet.rate = rate;
    
    // Calculate winnings
    const winAmount = bet.bet * rate;
    // Update user balance immediately
    await UserBalance.findByIdAndUpdate(
      bet.userId,
      { $inc: { balance: winAmount } }
    );
    
    // Mark this bet as having its balance already updated
    bet.balanceUpdated = true;
    
    // Create a bill record for this transaction
    await Bills.create([{
      user_id: bet.userId,
      transaction_type: "Crash Game",
      token_img: bet.currencyImage,
      token_name: bet.currencyName,
      balance: bet.bet,
      trx_amount: bet.bet * rate - bet.bet,
      datetime: bet.betTime,
      status: true,
      bill_id: Math.floor(Math.random()*100000)
    }]);

    // Notify clients
    this.io.to("crash-game").emit("e", {
      userId: bet.userId,
      rate,
    });
    
    // Add to escapes list
    // this.game.escapes.push({
    //   ...bet,
    //   rate,
    //   balanceUpdated: true
    // });
  }
  async handlePayouts(rate) {
    // Acquire lock crash game update lock
    const lock = await CrashGameLock.findOneAndUpdate(
      { game_id: this.game.gameId },
      {
        $setOnInsert: { expires_at: new Date() },
      },
      { upsert: true, new: true }
    );
    if (lock) {
      // add auto Escapes
      const autoEscapes = this.game.bets.filter(
        (b) =>
          !!b.autoEscapeRate &&
          rate >= b.autoEscapeRate &&
          this.game.escapes.findIndex((e) => e.userId === b.userId) === -1
      );
      this.game.escapes.push(
        ...autoEscapes.map((e) => ({
          ...e,
          rate: e.autoEscapeRate,
        }))
      );

      const normalBets = this.getBetPromises(
        this.game.bets,
        (bet) =>
          this.game.escapes.find((e) => e.userId === bet.userId)?.rate || rate,
        (bet) =>
          this.game.escapes.findIndex((e) => e.userId === bet.userId) !== -1,
        "Classic"
      );

      const redBets = this.getBetPromises(
        this.game.xBets.filter((b) => b.x === -200),
        () => 1.96,
        () => rate < 2,
        "Red"
      );

      const greenBets = this.getBetPromises(
        this.game.xBets.filter((b) => b.x === 200),
        () => 2,
        () => rate >= 2,
        "Green"
      );

      const moonBets = this.getBetPromises(
        this.game.xBets.filter((b) => b.x === 1000),
        () => 10,
        () => rate >= 10,
        "Moon"
      );
      await Promise.all([
        ...normalBets,
        ...redBets,
        ...greenBets,
        ...moonBets,
        CrashGameModel.updateOne(
          { game_id: this.game.gameId },
          {
            end: new Date(),
            concluded: true,
          }
        )
      ]);
      // Release lock
      await CrashGameLock.deleteOne({ game_id: this.game.gameId });
    } else {
      console.log("Another instance is probably processing payouts!");
    }
  }
 
  getBetPromises(bets, getPayout, wonCallback, bet_type) {
    const betPromisses = [];
    for (let i = 0; i < bets.length; i++) {
      const bet = bets[i];
      
      // Skip spectator bets (zero amount)
      if (bet.isSpectator || bet.bet === 0) {
        continue;
      }
      
      const rate = getPayout(bet);
      const won = wonCallback(bet);
      bet.won = won;
      
      // Check if this bet has already had its balance updated via handleEscape
      const escapeEntry = this.game.escapes.find(e => e.userId === bet.userId);
      const alreadyUpdated = escapeEntry && escapeEntry.balanceUpdated;
      
      if (!alreadyUpdated) {
        // For bets that won but weren't manually cashed out
        if (won) {
          // Add the full winnings (since we already deducted the bet amount when the bet was placed)
          const winnings = bet.bet * rate;
          betPromisses.push(
            UserBalance.findByIdAndUpdate(
              bet.userId,
              { $inc: { balance: winnings } }
            )
          );
        }
        // For bets that lost, we don't need to do anything (bet amount was already deducted)
      }
      
      // Always create the bet record for history
      betPromisses.push(
        CrashBet.create([
          {
            game_id: this.game.gameId,
            user_id: bet.userId,
            token: bet.currencyName,
            token_img: bet.currencyImage,
            bet_type,
            bet: bet.bet,
            payout: won ? rate : 0,
            bet_time: bet.betTime,
            won,
          }
        ]).then(([bh]) => {
          (bet.betId = bh.bet_id), (bet.betType = bet_type);
          // Only create a bill if we haven't already created one in handleEscape
          if (!alreadyUpdated) {
            const winningAmount = bet.won ? bet.bet * rate - bet.bet : bet.bet;
            if (this.betsCallback) this.betsCallback({
              game_type: "Crash Game",
              hidden: bet.hidden,
              player: bet.hidden ? "Hidden" : bet.name,
              bet_id: bh.bet_id,
              token_img: bh.token_img,
              payout: bh.won ? bh.payout * 100 : 100,
              profit_amount: bh.won ? winningAmount : bh.bet
            });
            
            // Only create a bill for winnings (bet amount bill was created when bet was placed)
            if (won) {
              let bil = {
                user_id: bh.user_id,
                transaction_type: "Crash Game Win",
                token_img: bh.token_img,
                token_name: bh.token,
                balance: bet.bet,
                trx_amount: bet.bet * rate, // Full winnings
                datetime: new Date(),
                status: true,
                bill_id: `${bh.bet_id}-win`,
              };
              return Bills.create([bil]);
            }
          }
          return Promise.resolve();
        })
      );
    }
    return betPromisses;
  }
  async run(betsCallback) {
    this.betsCallback = betsCallback;
    try {
      clearTimeout(this.loopTimeout);
      let game = await CrashGameModel.findOne({ concluded: false }).sort({
        _id: -1,
      });
      if (!game) {
        const { hash } =
          (await CrashGameHash.findOneAndUpdate(
            { used: false },
            { used: true }
          ).sort({
            _id: -1,
          })) || {};
        if (!hash) {
          throw new Error("No game hash available");
        }
        [game] = await CrashGameModel.create([
          {
            hash,
            crash_point: calculateCrashPoint(hash),
          },
        ]);
      }
      this.game = new CrashGame();
      this.game.status = game.status;
      this.game.gameId = game.game_id;
      this.game.crash_point = game.crash_point;
      this.game.hash = game.hash;
      this.game.startTime = game.start.getTime();

      // --- CLEAR BOT BETS LIST FOR NEW ROUND ---
      this.game.bets = [];
      this.game.xBets = [];
      this.game.escapes = [];
      // -----------------------------------------

      // ...existing code to repopulate bets/xBets/escapes from DB if needed...

      this.startCrashBots();

      if (this.game.status === 1) {
        this.io.to("crash-game").emit("pr", {
          gameId: this.game.gameId,
          startTime: Date.now() + this.game.prepareTime,
          prepareTime: this.game.prepareTime,
        });
        setTimeout(async () => {
          await CrashGameModel.updateOne(
            { game_id: this.game.gameId },
            { status: 2 }
          );
          this.game.status = 2;
          this.game.startTime = Date.now();
          this.io.to("crash-game").emit("bg", {
            betUserIds: this.game.bets.map((b) => b.userId),
          });
          this.gameLoop();
        }, this.game.prepareTime);
      } else {
        this.gameLoop();
      }
    } catch (err) {
      console.log("Error in crash game", err);
    }
  }

  async handleBotBet(data) {
    // Mimic the "throw-bet" logic, but without socket/callback
    if (
      this.game.canBet &&
      data.gameId === this.game.gameId &&
      this.game.bets.findIndex((b) => b.userId === data.userId) === -1
    ) {
      const newBet = {
        ...data,
        name: data.hidden ? "Hidden" : data.name,
        betTime: new Date(),
        isSpectator: data.bet === 0
      };
      if (!newBet.isSpectator && newBet.bet > 0) {
        await UserBalance.findByIdAndUpdate(
          data.userId,
          { $inc: { balance: -newBet.bet } }
        );
        await Bills.create([{
          user_id: newBet.userId,
          transaction_type: "Crash Game Bet",
          token_img: newBet.currencyImage,
          token_name: newBet.currencyName,
          balance: newBet.bet,
          trx_amount: -newBet.bet,
          datetime: newBet.betTime,
          status: false,
          bill_id: Math.floor(Math.random()*100000000),
        }]);
      }
      await CrashGameModel.findOneAndUpdate(
        { game_id: this.game.gameId },
        {
          $push: {
            bets: {
              user_id: newBet.userId,
              bet_time: newBet.betTime,
              name: newBet.name,
              avatar: newBet.avatar,
              hidden: newBet.hidden,
              token: newBet.currencyName,
              token_img: newBet.currencyImage,
              bet: newBet.bet,
              auto_escape: newBet.autoEscapeRate,
              bet_type: 0,
              is_spectator: newBet.isSpectator
            },
          },
        }
      );
      this.game.bets.push(newBet);
      this.io.to("crash-game").emit("b", newBet);
    }
  }
}

module.exports = { CrashGameEngine, GameStatus };

