const express = require('express');
const router = express.Router();

const ccpaymentController = require('../../controllers/ccpayment.controllers');
const requireAuth = require('../../middleware/authMiddleware');

// Webhook endpoint - no auth required
router.post('/webhook', ccpaymentController.handleWebhook);

// Auth middleware for all other routes
router.use(requireAuth);

// Permanent deposit address endpoints
router.post('/permanent-address', ccpaymentController.getPermanentDepositAddress);
router.get('/permanent-addresses', ccpaymentController.getUserPermanentAddresses);
router.post('/unbind-address', ccpaymentController.unbindDepositAddress);
router.post('/deposit-record', ccpaymentController.getDepositRecord);
router.get('/permanent-deposits', ccpaymentController.getPermanentDepositHistory);

// Deposit history
router.get('/deposit/history', ccpaymentController.getDepositHistory);
router.get('/deposit/records', ccpaymentController.getDepositRecordsList);

// Withdrawal endpoints
router.post('/withdraw', ccpaymentController.createWithdrawalRequest);
router.get('/withdraw/status/:withdrawalId', ccpaymentController.getWithdrawalStatus);
router.get('/withdraw/history', ccpaymentController.getWithdrawalHistory);
router.get('/withdraw/records', ccpaymentController.getWithdrawalRecordsList);

// Utility endpoints
router.get('/currencies', ccpaymentController.getCoinList);
router.get('/prices', ccpaymentController.getCoinPrices);
router.get('/convert', ccpaymentController.convertAmount);

module.exports = router;
