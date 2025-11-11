const express = require('express')
const router = express.Router()
const mainRouter = express.Router()
const requireAuth = require('../../../middleware/authMiddleware')
const DiceGameHandlers = require('../../../controllers/games/dice/DiceGameHandlers')

// Public routes
mainRouter.get('/details/:betId', async (req, res) => {
  try {
    const result = await DiceGameHandlers.getGameDetails(req.params.betId)
    res.status(200).json(result)
  } catch (error) {
    res.status(500).json({ status: false, message: error.message })
  }
})

// Protected routes
router.get('/seeds', requireAuth, async (req, res) => {
  try {
    const result = await DiceGameHandlers.getUserSeeds(req.user._id)
    res.status(200).json(result)
  } catch (error) {
    res.status(500).json({ status: false, message: error.message })
  }
})

router.post('/my-bet', requireAuth, async (req, res) => {
  try {
    const result = await DiceGameHandlers.getUserBets(req.user._id)
    res.status(200).json({ bets: result })
  } catch (error) {
    res.status(500).json({ status: false, message: error.message })
  }
})

router.post('/update-seeds', requireAuth, async (req, res) => {
  try {
    const { client_seed } = req.body
    const result = await DiceGameHandlers.updateSeeds(req.user._id, client_seed)
    res.status(200).json(result)
  } catch (error) {
    res.status(500).json({ status: false, message: error.message })
  }
})

router.post('/verify', requireAuth, async (req, res) => {
  try {
    const { clientSeed, serverSeed, nonce, roll } = req.body
    const result = await DiceGameHandlers.verifyRoll(clientSeed, serverSeed, nonce, roll)
    res.status(200).json(result)
  } catch (error) {
    res.status(500).json({ status: false, message: error.message })
  }
})

mainRouter.use(router)

module.exports = mainRouter
module.exports = router