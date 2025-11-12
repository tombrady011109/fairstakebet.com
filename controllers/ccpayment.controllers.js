const httpStatus = require("http-status");
const ccpaymentService = require("../services/ccpayment.services");
const walletUpdateService = require("../services/wallet-update.services");
const CCPaymentDeposit = require("../models/ccpayment-deposit");
const CCPaymentWithdrawal = require("../models/ccpayment-withdrawal");
const CCPaymentPermanentAddress = require("../models/ccpayment-permanent-address");
const catchAsync = require("../utils/catchAsync");

// Permanent Deposit Address methods
const getPermanentDepositAddress = catchAsync(async (req, res) => {
    const { body: reqBody } = req;
    const user_id = req.user.id;
    // Default to Ethereum if chain is not specified
    if (!reqBody.chain) {
        reqBody.chain = 'ETH';
    }
    try {
        // Create a unique reference ID for this user and chain
        // This ensures the same user always gets the same address for a specific chain
        const referenceId = `user_${user_id}_chain_${reqBody.chain}`;

        // Check if we already have this address stored
        let permanentAddress = await CCPaymentPermanentAddress.findOne({
            user_id,
            chain: reqBody.chain
        });
        // If we have an address and it's not flagged as risky, return it
        if (permanentAddress && !permanentAddress.isFlagged) {
            return res.status(httpStatus.OK).json({
                success: true,
                data: {
                    address: permanentAddress.address,
                    memo: permanentAddress.memo,
                    chain: permanentAddress.chain
                }
            });
        }

        // If address is flagged or doesn't exist, get a new one from CCPayment
        const reqData = {
            "referenceId": referenceId,
            "chain": reqBody.chain,
        };

        const ccpResponse = await ccpaymentService.getOrCreateAppDepositAddress(reqData);
        if (!ccpResponse.success) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: ccpResponse.message || "Failed to get deposit address"
            });
        }

        // Save or update the permanent address in our database
        if (permanentAddress) {
            // Update existing record
            permanentAddress.address = ccpResponse.data.address;
            permanentAddress.memo = ccpResponse.data.memo || "";
            permanentAddress.isFlagged = false;
            permanentAddress.flaggedAt = null;
            permanentAddress.metadata = { ...permanentAddress.metadata, ccpResponse };
            await permanentAddress.save();
        } else {
            // Create new record
            permanentAddress = await CCPaymentPermanentAddress.create({
                user_id,
                referenceId,
                chain: reqBody.chain,
                address: ccpResponse.data.address,
                memo: ccpResponse.data.memo || "",
                metadata: { ccpResponse }
            });
        }

        return res.status(httpStatus.OK).json({
            success: true,
            data: {
                address: permanentAddress.address,
                memo: permanentAddress.memo,
                chain: permanentAddress.chain
            }
        });
    } catch (error) {
        console.error('Get permanent deposit address error:', error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});


const getDepositRecord = catchAsync(async (req, res) => {
    const { body: reqBody } = req;
    const user_id = req.user.id;;

    if (!reqBody.recordId && !reqBody.txid) {
        return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: "Either recordId or txid is required"
        });
    }

    try {
        const ccpResponse = await ccpaymentService.getDepositRecord(reqBody);

        if (!ccpResponse.success) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: ccpResponse.message || "Failed to get deposit record"
            });
        }

        return res.status(httpStatus.OK).json({
            success: true,
            data: ccpResponse.data
        });
    } catch (error) {
        console.error('Get deposit record error:', error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});


const getDepositHistory = catchAsync(async (req, res) => {
    const user_id = req.user.id;;
    const { currency, page = 1, limit = 10 } = req.query;

    try {
        // Build query
        const query = { user_id };
        if (currency) {
            query.currency = currency;
        }

        // Get total count for pagination
        const total = await CCPaymentDeposit.countDocuments(query);

        // Get deposits with pagination
        const deposits = await CCPaymentDeposit.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        return res.status(httpStatus.OK).json({
            success: true,
            data: deposits,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get deposit history error:', error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

// Withdrawal Endpoints
const createWithdrawalRequest = catchAsync(async (req, res) => {
    const { amount, amountUSD, coinId, chain, address, memo, merchantPayNetworkFee } = req.body;
    const user_id = req.user.id;;

    if (!amount || !coinId || !address) {
        return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: "Missing required parameters: amount, coinId, and address are required"
        });
    }

    try {
        // Get coin details to determine wallet currency
        const coinListResponse = await ccpaymentService.getCoinList();
        if (!coinListResponse.success) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: "Failed to get coin information"
            });
        }

        // Find the coin in the list
        const coin = coinListResponse.data.find(c => c.coinId === coinId);
        if (!coin) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: "Invalid coinId"
            });
        }

        // Determine wallet currency
        const walletCurrency = coin.coinSymbol === 'USDT' ? 'USD' : coin.coinSymbol;

        // Subtract funds from wallet
        try {
            await walletUpdateService.updateWalletBalance({
                userId: user_id,
                currency: walletCurrency,
                amount: parseFloat(amount),
                operation: 'subtract',
                transactionType: 'Withdrawal'
            });
        } catch (error) {
            if (error.statusCode === httpStatus.BAD_REQUEST) {
                return res.status(httpStatus.BAD_REQUEST).json({
                    success: false,
                    message: error.message || "Insufficient balance"
                });
            }
            throw error;
        }

        // Create withdrawal request with CCPayment
        const ccpResponse = await ccpaymentService.createWithdrawalRequest({
            userId: user_id,
            amount,
            coinId,
            chain: chain || 'ETH', // Default to ETH if not provided
            address,
            memo,
            merchantPayNetworkFee
        });

        if (!ccpResponse.success) {
            // Refund the amount if withdrawal request fails
            await walletUpdateService.updateWalletBalance({
                userId: user_id,
                currency: walletCurrency,
                amount: parseFloat(amount),
                operation: 'add',
                transactionType: 'Withdrawal Refund'
            });

            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: ccpResponse.msg || "Failed to create withdrawal request"
            });
        }

        // Save withdrawal request to database
        const withdrawalRequest = await CCPaymentWithdrawal.create({
            user_id,
            withdrawalId: ccpResponse.orderId, // Use orderId as withdrawalId
            recordId: ccpResponse.data.recordId, // Store CCPayment's recordId
            amount: parseFloat(amount),
            amountUSD: amountUSD || parseFloat(amount), // Fallback if USD amount not provided
            currency: coin.coinSymbol,
            address,
            networkFee: 0, // Network fee is handled by CCPayment now
            status: 'pending',
            metadata: {
                ...ccpResponse.data,
                coinId,
                chain: chain || 'ETH',
                memo: memo || '',
                merchantPayNetworkFee: merchantPayNetworkFee || false
            }
        });

        return res.status(httpStatus.CREATED).json({
            success: true,
            withdrawalId: withdrawalRequest.withdrawalId,
            recordId: withdrawalRequest.recordId,
            status: withdrawalRequest.status
        });
    } catch (error) {
        console.error('Create withdrawal request error:', error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

const getWithdrawalStatus = catchAsync(async (req, res) => {
    const { withdrawalId } = req.params;

    if (!withdrawalId) {
        return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: "Withdrawal ID is required"
        });
    }

    try {
        // Get withdrawal request from database
        const withdrawalRequest = await CCPaymentWithdrawal.findOne({ withdrawalId });

        if (!withdrawalRequest) {
            return res.status(httpStatus.NOT_FOUND).json({
                success: false,
                message: "Withdrawal request not found"
            });
        }

        // If request is already completed or failed, return the status
        if (withdrawalRequest.status !== 'pending' && withdrawalRequest.status !== 'processing') {
            return res.status(httpStatus.OK).json({
                success: true,
                status: withdrawalRequest.status,
                data: withdrawalRequest
            });
        }

        // Check status with CCPayment
        const ccpResponse = await ccpaymentService.getWithdrawalRecord(withdrawalId);

        if (!ccpResponse.success) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: ccpResponse.msg || "Failed to get withdrawal record"
            });
        }

        // Map CCPayment status to our status format
        let newStatus;
        if (ccpResponse.data.status === 'Success') {
            newStatus = 'completed';
        } else if (ccpResponse.data.status === 'Processing') {
            newStatus = 'processing';
        } else if (ccpResponse.data.status === 'Failed') {
            newStatus = 'failed';
        } else if (ccpResponse.data.status === 'WaitingApproval') {
            newStatus = 'pending';
        } else if (ccpResponse.data.status === 'Rejected') {
            newStatus = 'failed';
        } else {
            newStatus = 'pending';
        }

        // Update status in database if changed
        if (newStatus !== withdrawalRequest.status) {
            withdrawalRequest.status = newStatus;

            if (newStatus === 'completed') {
                withdrawalRequest.completedAt = new Date();
            } else if (newStatus === 'failed' && withdrawalRequest.status !== 'failed') {
                // Refund the amount if withdrawal fails
                const walletCurrency = withdrawalRequest.currency === 'USDT' ? 'USD' : withdrawalRequest.currency;
                await walletUpdateService.updateWalletBalance({
                    userId: withdrawalRequest.user_id,
                    currency: walletCurrency,
                    amount: withdrawalRequest.amount,
                    operation: 'add',
                    transactionType: 'Withdrawal Refund'
                });
            }

            // Update metadata with latest response
            withdrawalRequest.metadata = { ...withdrawalRequest.metadata, apiResponse: ccpResponse.data };
            await withdrawalRequest.save();
        }

        return res.status(httpStatus.OK).json({
            success: true,
            status: withdrawalRequest.status,
            data: {
                ...withdrawalRequest.toObject(),
                ccpStatus: ccpResponse.data.status
            }
        });
    } catch (error) {
        console.error('Get withdrawal status error:', error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

const getWithdrawalHistory = catchAsync(async (req, res) => {
    const user_id = req.user.id;;
    const { currency, page = 1, limit = 10 } = req.query;

    try {
        // Build query
        const query = { user_id };
        if (currency) {
            query.currency = currency;
        }

        // Get total count for pagination
        const total = await CCPaymentWithdrawal.countDocuments(query);

        // Get withdrawals with pagination
        const withdrawals = await CCPaymentWithdrawal.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        return res.status(httpStatus.OK).json({
            success: true,
            data: withdrawals,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get withdrawal history error:', error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

// Get withdrawal records list from CCPayment API
const getWithdrawalRecordsList = catchAsync(async (req, res) => {
    const { coinId, orderIds, chain, startAt, endAt, nextId } = req.query;

    try {
        // Build params object
        const params = {};

        // Add parameters if provided
        if (coinId) params.coinId = parseInt(coinId);
        if (orderIds) {
            // Parse orderIds from comma-separated string
            if (typeof orderIds === 'string') {
                params.orderIds = orderIds.split(',').map(id => id.trim());
            }
        }
        if (chain) params.chain = chain;
        if (startAt) params.startAt = parseInt(startAt);
        if (endAt) params.endAt = parseInt(endAt);
        if (nextId) params.nextId = nextId;

        const ccpResponse = await ccpaymentService.getWithdrawalRecordsList(params);

        if (!ccpResponse.success) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: ccpResponse.message || "Failed to get withdrawal records list"
            });
        }

        return res.status(httpStatus.OK).json({
            success: true,
            data: ccpResponse.data
        });
    } catch (error) {
        console.error('Get withdrawal records list error:', error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

// Utility Endpoints
const getCoinList = catchAsync(async (req, res) => {
    try {
        const ccpResponse = await ccpaymentService.getCoinList();
        if (!ccpResponse.success) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: ccpResponse.message || "Failed to get coin list"
            });
        }

        return res.status(httpStatus.OK).json({
            success: true,
            data: ccpResponse.data
        });
    } catch (error) {
        console.error('Get coin list error:', error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

const getCoinPrices = catchAsync(async (req, res) => {
    const { coinIds } = req.query;

    // Parse coinIds from query string
    let coinIdArray;
    if (coinIds) {
        // If coinIds is provided as comma-separated string, parse it
        if (typeof coinIds === 'string') {
            coinIdArray = coinIds.split(',').map(id => parseInt(id.trim()));
        } else {
            coinIdArray = [parseInt(coinIds)];
        }
    } else {
        // Default to ETH (1) and USDT (1280) if no coinIds provided
        coinIdArray = [1, 1280];
    }
    try {
        const ccpResponse = await ccpaymentService.getCoinUSDTPrice(coinIdArray);
        if (!ccpResponse.success) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: ccpResponse.message || "Failed to get coin prices"
            });
        }

        return res.status(httpStatus.OK).json({
            success: true,
            data: ccpResponse.data
        });
    } catch (error) {
        console.error('Get coin prices error:', error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});


const convertAmount = catchAsync(async (req, res) => {
    const { fromCurrency, toCurrency, amount } = req.query;

    if (!fromCurrency || !toCurrency || !amount) {
        return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: "fromCurrency, toCurrency, and amount are required"
        });
    }

    try {
        const ccpResponse = await ccpaymentService.convertAmount({
            fromCurrency,
            toCurrency,
            amount: parseFloat(amount)
        });

        if (!ccpResponse.success) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: ccpResponse.message || "Failed to convert amount"
            });
        }

        return res.status(httpStatus.OK).json({
            success: true,
            data: ccpResponse.data
        });
    } catch (error) {
        console.error('Convert amount error:', error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

// Webhook Handler
const handleWebhook = catchAsync(async (req, res) => {
    const payload = req.body;
    const signature = req.headers['sign'];
    const timestamp = req.headers['timestamp'];
    const appIdHeader = req.headers['appid'];

    // Check for required headers
    if (!signature || !timestamp || !appIdHeader) {
        return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: "Missing required headers (Sign, Timestamp, or Appid)"
        });
    }

    try {
        // Verify webhook signature
        const isValid = ccpaymentService.verifyWebhookSignature(payload, signature, timestamp, appIdHeader);

        if (!isValid) {
            return res.status(httpStatus.UNAUTHORIZED).json({
                success: false,
                message: "Invalid signature"
            });
        }

        // Process webhook based on type
        const type = payload.type;

        if (type === 'DirectDeposit') {                                                                                                                                                             
            // This is a direct deposit webhook
            // We handle both normal deposits and risky deposits (isFlaggedAsRisky) here
            const { recordId, referenceId, coinSymbol, status, isFlaggedAsRisky } = payload.msg;
            console.log(recordId, referenceId, coinSymbol, status, isFlaggedAsRisky)

            // Get the deposit details from CCPayment to verify
            const depositDetails = await ccpaymentService.getDepositRecord({ recordId });
            console.log(depositDetails)
            if (depositDetails.success) {
                // const depositDataEl = depositDetails.data;
                const depositData = depositDetails.data?.record;
                // Find the permanent address in our database using referenceId
                // referenceId format is "user_{user_id}_chain_{chain}"
                const referenceIdParts = referenceId.split('_');
                if (referenceIdParts.length >= 2) {

                    // Find the permanent address
                    const permanentAddress = await CCPaymentPermanentAddress.findOne({
                        referenceId: referenceId
                    });

                    if (permanentAddress) {
                        // Check if this deposit is already processed
                        const existingDeposit = await CCPaymentDeposit.findOne({
                            orderId: `perm_${recordId}`
                        });

                        if (!existingDeposit) {
                            // Only process if status is Success and not flagged as risky
                            // or if you want to handle risky deposits differently
                            if (status === 'Success') {
                                // Create a deposit record
                                await CCPaymentDeposit.create({
                                      user_id: permanentAddress.user_id,
                                    orderId: `perm_${recordId}`,
                                    amount: depositData.amount,
                                    amountUSD: depositData.coinUSDPrice,
                                    currency: coinSymbol,
                                    status: isFlaggedAsRisky ? 'pending' : 'completed', // Mark risky deposits as pending
                                    paymentUrl: '',
                                    completedAt: isFlaggedAsRisky ? null : new Date(),
                                    metadata: {
                                        permanentDeposit: true,
                                        depositData,
                                        webhook: payload,
                                        isFlaggedAsRisky
                                    }
                                });
                                // Only update wallet balance if not flagged as risky
                                if (!isFlaggedAsRisky) {
                                    const walletCurrency = coinSymbol === 'USDT' ? 'USDT' : coinSymbol;
                                    console.log({  userId: permanentAddress.user_id,
                                        currency: walletCurrency,
                                        amount: parseFloat(depositData.amount),
                                        operation: 'add',
                                        transactionType: 'Permanent Deposit'})
                                    await walletUpdateService.updateWalletBalance({
                                        userId: permanentAddress.user_id,
                                        currency: walletCurrency,
                                        amount: parseFloat(depositData.amount),
                                        operation: 'add',
                                        transactionType: 'Permanent Deposit'
                                    });
                                }
                                // Log risky deposits for manual review
                                if (isFlaggedAsRisky) {
                                    console.warn(`Risky deposit detected: recordId=${recordId}, user=${permanentAddress.user_id}, amount=${depositData.paidAmount} ${coinSymbol}`);
                                    // Maybe implement notification system for admins here
                                }
                            } else if (status === 'Processing') {
                                // For processing deposits, create a record but mark as pending
                                await CCPaymentDeposit.create({
                                    user_id: permanentAddress.user_id,
                                    orderId: `perm_${recordId}`,
                                    amount: parseFloat(depositData.amount),
                                    amountUSD: parseFloat(depositData.coinUSDPrice),
                                    currency: coinSymbol,
                                    status: 'pending',
                                    paymentUrl: '',
                                    metadata: {
                                        permanentDeposit: true,
                                        depositData,
                                        webhook: payload,
                                        processingDeposit: true
                                    }
                                });
                            }
                        }
                    } else {
                        console.error(`Permanent address not found for referenceId: ${referenceId}`);
                    }
                }
            }
        } else if (type === 'ApiWithdrawal') {
            // Handle API withdrawal webhook
            const orderId = payload.msg.orderId;
            const status = payload.msg.status;

            // Find the withdrawal request by orderId
            const withdrawalRequest = await CCPaymentWithdrawal.findOne({ withdrawalId: orderId });

            if (withdrawalRequest) {
                // Map CCPayment status to our status format
                let newStatus;
                if (status === 'Success') {
                    newStatus = 'completed';
                } else if (status === 'Processing') {
                    newStatus = 'processing';
                } else if (status === 'Failed') {
                    newStatus = 'failed';
                } else if (status === 'WaitingApproval') {
                    newStatus = 'pending';
                } else if (status === 'Rejected') {
                    newStatus = 'failed';
                } else {
                    newStatus = 'pending';
                }

                // Update status if changed
                if (newStatus !== withdrawalRequest.status) {
                    withdrawalRequest.status = newStatus;

                    if (newStatus === 'completed') {
                        withdrawalRequest.completedAt = new Date();
                    } else if (newStatus === 'failed' && withdrawalRequest.status !== 'failed') {
                        // Refund the amount if withdrawal fails
                        const walletCurrency = withdrawalRequest.currency === 'USDT' ? 'USD' : withdrawalRequest.currency;
                        await walletUpdateService.updateWalletBalance({
                            userId: withdrawalRequest.user_id,
                            currency: walletCurrency,
                            amount: withdrawalRequest.amount,
                            operation: 'add',
                            transactionType: 'Withdrawal Refund'
                        });
                    }
                }

                // Update metadata with webhook data
                withdrawalRequest.metadata = { ...withdrawalRequest.metadata, webhook: payload };
                await withdrawalRequest.save();

                // Get the full withdrawal record for additional details
                try {
                    const withdrawalRecord = await ccpaymentService.getWithdrawalRecord(orderId);
                    if (withdrawalRecord.success) {
                        withdrawalRequest.metadata = {
                            ...withdrawalRequest.metadata,
                            withdrawalRecord: withdrawalRecord.data
                        };
                        await withdrawalRequest.save();
                    }
                } catch (recordError) {
                    console.error('Error fetching withdrawal record:', recordError);
                }
            }
        } else if (type === 'ActivateWebhookURL') {
            console.log('Webhook URL activated:', payload.msg);
        }

        // Set the content type as required by CCPayment
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(httpStatus.OK).send('Success');
    } catch (error) {
        console.error('Webhook processing error:', error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

// Get permanent deposit addresses for a user
const getUserPermanentAddresses = catchAsync(async (req, res) => {
    const user_id = req.user.id;;
    const { chain } = req.query;

    try {
        // Build query
        const query = { user_id };
        if (chain) {
            query.chain = chain;
        }

        // Get permanent addresses
        const addresses = await CCPaymentPermanentAddress.find(query)
            .sort({ createdAt: -1 })
            .lean();

        return res.status(httpStatus.OK).json({
            success: true,
            data: addresses.map(addr => ({
                chain: addr.chain,
                address: addr.address,
                memo: addr.memo,
                isFlagged: addr.isFlagged,
                createdAt: addr.createdAt
            }))
        });
    } catch (error) {
        console.error('Get user permanent addresses error:', error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

// Unbind a flagged deposit address
const unbindDepositAddress = catchAsync(async (req, res) => {
    const user_id = req.user.id;;
    const { address } = req.body;
    let { chain } = req.body;

    // Default to Ethereum if chain is not specified
    if (!chain) {
        chain = 'ETH';
    }

    if (!address) {
        return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: "Address is required"
        });
    }

    try {
        // Check if the address belongs to the user
        const permanentAddress = await CCPaymentPermanentAddress.findOne({
            user_id,
            address
        });

        if (!permanentAddress) {
            return res.status(httpStatus.NOT_FOUND).json({
                success: false,
                message: "Address not found or does not belong to you"
            });
        }

        // Call CCPayment to unbind the address
        const ccpResponse = await ccpaymentService.unbindAddress({
            chain,
            address
        });

        if (!ccpResponse.success) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: ccpResponse.message || "Failed to unbind address"
            });
        }

        // Update the address in our database
        await CCPaymentPermanentAddress.deleteOne({ _id: permanentAddress._id });

        return res.status(httpStatus.OK).json({
            success: true,
            message: "Address unbound successfully",
            data: ccpResponse.data
        });
    } catch (error) {
        console.error('Unbind deposit address error:', error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

// Get deposit records list from CCPayment API
const getDepositRecordsList = catchAsync(async (req, res) => {
    const { coinId, referenceId, orderId, chain, startAt, endAt, nextId } = req.query;

    try {
        // Build params object
        const params = {};

        // Add parameters if provided
        if (coinId) params.coinId = parseInt(coinId);
        if (referenceId) params.referenceId = referenceId;
        if (orderId) params.orderId = orderId;
        if (chain) params.chain = chain;
        if (startAt) params.startAt = parseInt(startAt);
        if (endAt) params.endAt = parseInt(endAt);
        if (nextId) params.nextId = nextId;

        const ccpResponse = await ccpaymentService.getDepositRecordsList(params);

        if (!ccpResponse.success) {
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: ccpResponse.message || "Failed to get deposit records list"
            });
        }

        return res.status(httpStatus.OK).json({
            success: true,
            data: ccpResponse.data
        });
    } catch (error) {
        console.error('Get deposit records list error:', error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

// Get permanent deposit history for a user
const getPermanentDepositHistory = catchAsync(async (req, res) => {
    const user_id = req.user.id;;
    const { currency, page = 1, limit = 10 } = req.query;

    try {
        // First, get all permanent addresses for this user
        const permanentAddresses = await CCPaymentPermanentAddress.find({ user_id }).lean();
        const addressList = permanentAddresses.map(addr => addr.address);

        if (addressList.length === 0) {
            // No permanent addresses, return empty result
            return res.status(httpStatus.OK).json({
                success: true,
                data: [],
                pagination: {
                    total: 0,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: 0
                }
            });
        }

        // Build query for local deposits
        const localQuery = {
            user_id,
            'metadata.permanentDeposit': true
        };

        if (currency) {
            localQuery.currency = currency;
        }

        // Get local deposits with pagination
        const localDeposits = await CCPaymentDeposit.find(localQuery)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        // Also fetch recent deposits from CCPayment API
        try {
            const ccpResponse = await ccpaymentService.getDepositRecordsList({
                page: 1,
                limit: 50 // Fetch more to ensure we don't miss any
            });

            if (ccpResponse.success) {
                // Filter records for this user's addresses
                const apiDeposits = ccpResponse.data.records.filter(record =>
                    addressList.includes(record.toAddress));

                // Check if any new deposits need to be saved locally
                for (const deposit of apiDeposits) {
                    // Check if we already have this deposit
                    const existingDeposit = await CCPaymentDeposit.findOne({
                        orderId: `perm_${deposit.recordId}`
                    });

                    if (!existingDeposit) {
                        // Find the permanent address to get the user_id
                        const permanentAddress = permanentAddresses.find(addr =>
                            addr.address === deposit.toAddress);

                        if (permanentAddress && deposit.status === 'Success') {
                            // Create a new deposit record
                            await CCPaymentDeposit.create({
                                user_id: permanentAddress.user_id,
                                orderId: `perm_${deposit.recordId}`,
                                amount: parseFloat(deposit.paidAmount),
                                amountUSD: parseFloat(deposit.paidValue || deposit.paidAmount),
                                currency: deposit.coinSymbol,
                                status: 'completed',
                                paymentUrl: '',
                                completedAt: new Date(deposit.arrivedAt * 1000),
                                metadata: { permanentDeposit: true, depositData: deposit }
                            });

                            // Update user wallet balance
                            const walletCurrency = deposit.coinSymbol === 'USDT' ? 'USD' : deposit.coinSymbol;
                            await walletUpdateService.updateWalletBalance({
                                userId: permanentAddress.user_id,
                                currency: walletCurrency,
                                amount: parseFloat(deposit.paidAmount),
                                operation: 'add',
                                transactionType: 'Permanent Deposit'
                            });
                        }
                    }
                }

                // Refresh local deposits query after potential updates
                const refreshedDeposits = await CCPaymentDeposit.find(localQuery)
                    .sort({ createdAt: -1 })
                    .skip((page - 1) * limit)
                    .limit(parseInt(limit))
                    .lean();

                const total = await CCPaymentDeposit.countDocuments(localQuery);

                return res.status(httpStatus.OK).json({
                    success: true,
                    data: refreshedDeposits,
                    pagination: {
                        total,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        pages: Math.ceil(total / limit)
                    }
                });
            }
        } catch (apiError) {
            console.error('Error fetching from CCPayment API:', apiError);
            // Continue with local data only
        }

        // If API call failed, return local data only
        const total = await CCPaymentDeposit.countDocuments(localQuery);

        return res.status(httpStatus.OK).json({
            success: true,
            data: localDeposits,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get permanent deposit history error:', error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal Server Error"
        });
    }
});

module.exports = {
    // Permanent deposit address methods
    getPermanentDepositAddress,
    getDepositRecord,
    getUserPermanentAddresses,
    getPermanentDepositHistory,
    unbindDepositAddress,

    // Deposit history
    getDepositHistory,
    getDepositRecordsList,

    // Withdrawal endpoints
    createWithdrawalRequest,
    getWithdrawalStatus,
    getWithdrawalHistory,
    getWithdrawalRecordsList,

    // Utility endpoints
    getCoinList,
    getCoinPrices,
    convertAmount,

    // Webhook handler
    handleWebhook
}
