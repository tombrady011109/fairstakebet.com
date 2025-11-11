const express = require('express')
const router = express.Router()

const controller = require('../../controllers/profile.controller')
const wallet = require('../../wallet_transaction/index')
const requireAuth = require('../../middleware/requireAuth')

router.get('/user-id/:id', controller.externalProfile)


// auth middleware
router.use(requireAuth);

router.get('/user', controller.handleProfile)
router.post('/username', controller.handleChangUsername)
router.post('/privacy', controller.handleChangProfilePrivacy)
router.post('/link-email', controller.handleLinkEmail)
router.post('/kyc-step1', controller.handleKYC1)
router.get('/create-otp', controller.handleCreateOtp)
router.get('/fetch-loginType', controller.fetchLoginType)
router.post('/verify-email', controller.verifyEmail)
router.post('/change-profile-img', controller.handleChangeProflePicture)
router.post('/create-referralcode', controller.createReferralCode)
router.get('/referralcode', controller.handleReferralCodeData)
router.post('/register-referralcode', controller.handleRegisterRefCode)
router.post('/update-verify', controller.handleUpdateVerify)
router.get('/fetch-token', controller.handleFetchSumsubToken)
router.post('/check-email', controller.handleCheckEmailChange)
router.post('/change-defaultwallet', controller.handleChangeDefaultWallet)
router.post('/verify-password', controller.handlePasswordValidation)
router.post('/change-password', controller.handleChangePassword)
router.get('/wallet/:wallet', wallet.fetchWallet)

module.exports = router