const GameScripts = require("../../../models/games/crash/gamescript");

const SYSTEM_SCRIPTS = {
  Simple: `var config = {
    bet: { label: "bet", value: currency.minAmount, type: "number" },
    payout: { label: "payout", value: 2, type: "number" },
  };
  
  function main() {
    game.onBet = function() {
      game.bet(config.bet.value, config.payout.value).then(function(payout) {
        if (payout > 1) {
          log.success("We won, payout " + payout + "X!");
        } else {
          log.error("We lost, payout " + payout + "X!");
        }
      });
    };
  }`,
  Martingale: `var config = {
    baseBet: { label: "base bet", value: currency.minAmount, type: "number" },
    payout: { label: "payout", value: 2, type: "number" },
    stop: { label: "stop if next bet >", value: 1e8, type: "number" },
    onLoseTitle: { label: "On Lose", type: "title" },
    onLoss: {
      label: "",
      value: "reset",
      type: "radio",
      options: [
        { value: "reset", label: "Return to base bet" },
        { value: "increase", label: "Increase bet by (loss multiplier)" },
      ],
    },
    lossMultiplier: { label: "loss multiplier", value: 2, type: "number" },
    onWinTitle: { label: "On Win", type: "title" },
    onWin: {
      label: "",
      value: "reset",
      type: "radio",
      options: [
        { value: "reset", label: "Return to base bet" },
        { value: "increase", label: "Increase bet by (win multiplier)" },
      ],
    },
    winMultiplier: { label: "win multiplier", value: 2, type: "number" },
  };
  function main() {
    var currentBet = config.baseBet.value;
    game.onBet = function () {
      game.bet(currentBet, config.payout.value).then(function (payout) {
        if (payout > 1) {
          if (config.onWin.value === "reset") {
            currentBet = config.baseBet.value;
          } else {
            currentBet *= config.winMultiplier.value;
          }
          log.success(
            "We won, so next bet will be " +
              currentBet +
              " " +
              currency.currencyName
          );
        } else {
          if (config.onLoss.value === "reset") {
            currentBet = config.baseBet.value;
          } else {
            currentBet *= config.lossMultiplier.value;
          }
          log.error(
            "We lost, so next bet will be " +
              currentBet +
              " " +
              currency.currencyName
          );
        }
        if (currentBet > config.stop.value) {
          log.error(
            "Was about to bet " + currentBet + " which triggers the stop"
          );
          game.stop();
        }
      });
    };
  }`,
  "Payout Martingale": `var config = {
    bet: { label: "bet", value: currency.minAmount, type: "number" },
    basePayout: { label: "base payout", value: 2, type: "number" },
    stop: { value: 20, type: "number", label: "stop if next payout >" },
    onLoseTitle: { label: "On Lose", type: "title" },
    onLoss: {
      label: "",
      value: "reset",
      type: "radio",
      options: [
        { value: "reset", label: "Return to base bet" },
        { value: "increase", label: "Increase payout by (loss payout)" },
      ],
    },
    lossAdd: { label: "loss payout +", value: 1, type: "number" },
    onWinTitle: { label: "On Win", type: "title" },
    onWin: {
      label: "",
      value: "reset",
      type: "radio",
      options: [
        { value: "reset", label: "Return to base bet" },
        { value: "increase", label: "Increase payout by (win payout)" },
      ],
    },
    winAdd: { label: "win payout +", value: 1, type: "number" },
  };
  
  function main() {
    var currentPayout = config.basePayout.value;
    game.onBet = function () {
      game.bet(config.bet.value, currentPayout).then(function (payout) {
        if (payout > 1) {
          if (config.onWin.value === "reset") {
            currentPayout = config.basePayout.value;
          } else {
            currentPayout += config.winAdd.value;
          }
          log.success("We won, so next payout will be " + currentPayout + " x");
        } else {
          if (config.onLoss.value === "reset") {
            currentPayout = config.basePayout.value;
          } else {
            currentPayout += config.lossAdd.value;
          }
          log.error("We lost, so next payout will be " + currentPayout + " x");
        }
        if (currentPayout > config.stop.value) {
          log.error(
            "Was about to bet with payout " +
              currentPayout +
              " which triggers the stop"
          );
          game.stop();
        }
      });
    };
  }`,
};

async function addSystemScripts() {
  let scripts = Object.keys(SYSTEM_SCRIPTS).map((k) => ({
    user_id: 0,
    name: k,
    game_name: "crash",
    content: SYSTEM_SCRIPTS[k],
  }));
  return GameScripts.create([...scripts]);
}

const handleScriptAddOrUpdate = async (req, res) => {
  try {
    const user_id = req.id;
    const { id: script_id, content, name } = req.body;
    let script = await GameScripts.findOne({ user_id, script_id }).lean();
    if (!script) {
      [script] = await GameScripts.create([
        { game_name: "crash", user_id, name, content },
      ]);
    }
    res.status(200).json({
      id: script.script_id,
      name: script.name,
      content: script.content,
      userId: script.user_id,
    });
  } catch (error) {
    console.log("Error", error);
    res.status(500).json({ error });
  }
};

const handleScriptDelete = async (req, res) => {
  const user_id = req.id;
  const { id: script_id } = req.body;
  try {
    await GameScripts.findOneAndDelete({ user_id, script_id });
    res.status(200).json({ id: script_id });
  } catch (error) {
    console.log("Error", error);
    res.status(500).json({ error });
  }
};

const handleScriptList = async (req, res) => {
  const { userId: user_id } = req.body;
  try {
    let scripts = await GameScripts.find({
      game_name: "crash",
      user_id: { $in: [0, user_id || 0] },
    }).lean();
    if (!scripts.length) {
      scripts = await addSystemScripts();
    }
    res.status(200).json({
      scripts: scripts.map((s) => ({
        id: s.script_id,
        userId: s.user_id,
        name: s.name,
        game: "crash",
        content: s.content,
      })),
    });
  } catch (error) {
    console.log("Error", error);
    res.status(500).json({ error });
  }
};

module.exports = {
  handleScriptAddOrUpdate,
  handleScriptDelete,
  handleScriptList
};