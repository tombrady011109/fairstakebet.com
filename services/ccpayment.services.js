const crypto = require("crypto");
const { default: axios } = require("axios");
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
require("dotenv").config();

// CCPayment API Configuration
const appId = process.env.CCP_APP_ID || "P29of2owJttyaq48";
const appSecret = process.env.CCP_APP_SECRET || "82d5662ea6d1db45f657b7562822e7e2";
const merchantId = process.env.CCP_MERCHANT_ID || "27383";
const apiBaseUrl = process.env.CCP_API_BASE_URL || 'https://ccpayment.com/ccpayment/v2';

// CCPayment API Configuration (Valiant Joe)
// const appId = process.env.CCP_APP_ID || "g41CQgKXdWS8qpzz";
// const appSecret = process.env.CCP_APP_SECRET || "f7a037c7632163612e9b1c06beb5da52";
// const merchantId = process.env.CCP_MERCHANT_ID || "26738";
// const apiBaseUrl = process.env.CCP_API_BASE_URL || 'https://ccpayment.com/ccpayment/v2';
 
// Default to Ethereum blockchain for all chain parameters
const DEFAULT_CHAIN = 'ETH';

const getSignedText = (reqData, timestamp) => {
  try {
    const args = JSON.stringify(reqData);
    let signText = appId + timestamp;
    if (args.length !== 0) {
      signText += args;
    }

    const sign = crypto
      .createHmac("sha256", appSecret)
      .update(signText)
      .digest("hex");
    return sign
  } catch (error) {
    console.log('Error signing => ', error.message, appSecret, merchantId)
    throw new ApiError(httpStatus.BAD_REQUEST, 'Can not sign');
  }

}

/**
 * Get or create a permanent deposit address for a user
 * @param {Object} reqData - Request data
 * @param {string} reqData.referenceId - Unique reference ID for the user
 * @param {string} [reqData.chain=ETH] - Blockchain network symbol, defaults to Ethereum
 * @returns {Promise<Object>} - Deposit address details
 */
const getOrCreateAppDepositAddress = async (reqData = {}) => {
  // Set default chain to Ethereum if not provided
  if (!reqData.chain) {
    reqData.chain = DEFAULT_CHAIN;
  }

  // Validate required parameters
  if (!reqData.referenceId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'referenceId is required');
  }

  // Ensure referenceId is between 3-64 characters as per API requirements
  if (reqData.referenceId.length < 3 || reqData.referenceId.length > 64) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'referenceId must be between 3-64 characters');
  }

  const path = "https://ccpayment.com/ccpayment/v2/getOrCreateAppDepositAddress";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = getSignedText(reqData, timestamp);
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Appid": appId,
      "Sign": sign,
      "Timestamp": timestamp.toString(),
    },
  };

  try {
    const response = await axios.post(path, reqData, options);
    return {
      ...response.data,
      success: response.data.code === 10000
    };
  } catch (error) {
    console.error('CCPayment getOrCreateAppDepositAddress error:', error.response?.data || error.message);
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      error.response?.data?.msg || 'Failed to get or create deposit address'
    );
  }
}

/**
 * Get deposit record details from CCPayment
 * @param {Object} reqData - Request data
 * @param {string} reqData.recordId - CCPayment unique ID for a transaction
 * @returns {Promise<Object>} - Deposit record details
 */
const getDepositRecord = async (reqData = {}) => {
  // Validate parameters - recordId is required
  if (!reqData.recordId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'recordId is required');
  }

  const path = `${apiBaseUrl}/getAppDepositRecord`;
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = getSignedText(reqData, timestamp);
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Appid": appId,
      "Sign": sign,
      "Timestamp": timestamp.toString(),
    },
  };

  try {
    const response = await axios.post(path, reqData, options);
    return {
      ...response.data,
      success: response.data.code === 10000
    };
  } catch (error) {
    console.error('CCPayment getDepositRecord error:', error.response?.data || error.message);
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      error.response?.data?.msg || 'Failed to get deposit record'
    );
  }
}


// Note: createDepositOrder function has been removed as we're using permanent deposit addresses exclusively

// Note: getDepositOrderStatus function has been removed as we're using permanent deposit addresses exclusively

/**
 * Create a network withdrawal order with CCPayment
 * @param {Object} data - Withdrawal request data
 * @param {string} data.userId - User ID (for internal reference)
 * @param {number} data.amount - Amount to withdraw
 * @param {number} data.coinId - Coin ID
 * @param {string} data.chain - Symbol of the chain
 * @param {string} data.address - Destination wallet address
 * @param {string} [data.memo] - Memo of the withdrawal address (optional)
 * @param {boolean} [data.merchantPayNetworkFee=false] - Whether merchant pays network fee (optional)
 * @returns {Promise<Object>} - Withdrawal request details
 */
const createWithdrawalRequest = async (data) => {
  const { userId, amount, coinId, chain, address, memo, merchantPayNetworkFee } = data;

  // Generate a unique order ID using userId and timestamp
  const orderId = userId + String(Math.floor(Date.now() / 1000));

  const reqData = {
    "coinId": coinId,
    "chain": chain || DEFAULT_CHAIN,
    "address": address,
    "orderId": orderId,
    "amount": amount.toString()
  };

  // Add optional parameters if provided
  if (memo) {
    reqData.memo = memo;
  }

  if (merchantPayNetworkFee !== undefined) {
    reqData.merchantPayNetworkFee = merchantPayNetworkFee;
  }

  const path = "https://ccpayment.com/ccpayment/v2/applyAppWithdrawToNetwork";
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = getSignedText(reqData, timestamp);

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Appid": appId,
      "Sign": sign,
      "Timestamp": timestamp.toString(),
    },
  };

  try {
    const response = await axios.post(path, reqData, options);
    return {
      ...response.data,
      success: response.data.code === 10000,
      orderId: orderId // Include the orderId in the response for reference
    };
  } catch (error) {
    console.error('CCPayment createWithdrawalRequest error:', error.response?.data || error.message);
    throw new ApiError(httpStatus.BAD_REQUEST, error.response?.data?.msg || 'Failed to create withdrawal request');
  }
};

/**
 * Get withdrawal record from CCPayment
 * @param {Object} reqData - Request data
 * @param {string} [reqData.recordId] - CCPayment unique ID for a transaction
 * @param {string} [reqData.orderId] - Your unique order ID for the withdrawal
 * @returns {Promise<Object>} - Withdrawal record details
 */
const getWithdrawalRecord = async (reqData = {}) => {
  // Validate parameters - either recordId or orderId must be provided
  if (!reqData.recordId && !reqData.orderId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Either recordId or orderId is required');
  }

  // If a string is passed, assume it's an orderId for backward compatibility
  if (typeof reqData === 'string') {
    reqData = { orderId: reqData };
  }

  const path = `${apiBaseUrl}/getAppWithdrawRecord`;
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = getSignedText(reqData, timestamp);

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Appid": appId,
      "Sign": sign,
      "Timestamp": timestamp.toString(),
    },
  };

  try {
    const response = await axios.post(path, reqData, options);
    return {
      ...response.data,
      success: response.data.code === 10000
    };
  } catch (error) {
    console.error('CCPayment getWithdrawalRecord error:', error.response?.data || error.message);
    throw new ApiError(httpStatus.BAD_REQUEST, error.response?.data?.msg || 'Failed to get withdrawal record');
  }
};

/**
 * Get list of supported coins and their networks from CCPayment
 * @returns {Promise<Object>} - List of supported coins with network details
 */
const getCoinList = async () => {
  const reqData = {};


  const path = `${apiBaseUrl}/getCoinList`;
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = getSignedText(reqData, timestamp);

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Appid": appId,
      "Sign": sign,
      "Timestamp": timestamp.toString(),
    },
  };

  try {
    const response = await axios.post(path, reqData, options);
    return {
      ...response.data,
      success: response.data.code === 10000
    };
  } catch (error) {
    console.error('CCPayment getCoinList error:', error.response?.data || error.message);
    throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to get coin list');
  }
};

/**
 * Get cryptocurrency prices in USDT from CCPayment
 * @param {Array<number>} coinIds - Array of coin IDs to get prices for
 * @returns {Promise<Object>} - Coin prices in USDT
 */
const getCoinUSDTPrice = async (coinIds) => {
  // Ensure coinIds is an array
  if (!Array.isArray(coinIds)) {
    coinIds = [coinIds];
  }

  const reqData = {
    "coinIds": coinIds
  };

  const path = `${apiBaseUrl}/getCoinUSDTPrice`;
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = getSignedText(reqData, timestamp);

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Appid": appId,
      "Sign": sign,
      "Timestamp": timestamp.toString(),
    },
  };

  try {
    const response = await axios.post(path, reqData, options);
    return {
      ...response.data,
      success: response.data.code === 10000
    };
  } catch (error) {
    console.error('CCPayment getCoinUSDTPrice error:', error.response?.data || error.message);
    throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to get coin prices');
  }
};

/**
 * Convert amount between currencies
 * @param {Object} data - Conversion data
 * @param {string} data.fromCurrency - Source currency code
 * @param {string} data.toCurrency - Target currency code
 * @param {number} data.amount - Amount to convert
 * @returns {Promise<Object>} - Converted amount
 */
const convertAmount = async (data) => {
  const { fromCurrency, toCurrency, amount } = data;

  const reqData = {
    "fromCoinCode": fromCurrency,
    "toCoinCode": toCurrency,
    "amount": amount.toString()
  };

  const path = `${apiBaseUrl}/convertAmount`;
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = getSignedText(reqData, timestamp);

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Appid": appId,
      "Sign": sign,
      "Timestamp": timestamp.toString(),
    },
  };

  try {
    const response = await axios.post(path, reqData, options);
    return {
      ...response.data,
      success: response.data.code === 10000
    };
  } catch (error) {
    console.error('CCPayment convertAmount error:', error.response?.data || error.message);
    throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to convert amount');
  }
};

/**
 * Verify webhook signature from CCPayment
 * @param {Object} payload - Webhook payload
 * @param {string} signature - Webhook signature from the Sign header
 * @param {string} timestamp - Timestamp from the Timestamp header
 * @param {string} appIdHeader - App ID from the Appid header
 * @returns {boolean} - Whether the signature is valid
 */
const verifyWebhookSignature = (payload, signature, timestamp, appIdHeader) => {
  try {
    // Verify that the appId in the header matches our appId
    if (appIdHeader !== appId) {
      console.error('CCPayment verifyWebhookSignature error: App ID mismatch');
      return false;
    }

    // Verify that the timestamp is within 2 minutes (120 seconds)
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const timestampDiff = Math.abs(currentTimestamp - parseInt(timestamp));
    if (timestampDiff > 120) {
      console.error('CCPayment verifyWebhookSignature error: Timestamp expired');
      return false;
    }

    // Create the signature text: {appId} + {timestamp} + PayloadJSON
    const signText = `${appId}${timestamp}${JSON.stringify(payload)}`;

    // Calculate the signature using HMAC-SHA256
    const calculatedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(signText)
      .digest('hex');

    // Compare the calculated signature with the one from the header
    return calculatedSignature === signature;
  } catch (error) {
    console.error('CCPayment verifyWebhookSignature error:', error);
    return false;
  }
};

/**
 * Unbind a deposit address that has been flagged as risky
 * @param {Object} data - Address unbinding data
 * @param {string} [data.chain=ETH] - Blockchain network symbol, defaults to Ethereum
 * @param {string} data.address - Address to unbind
 * @returns {Promise<Object>} - Unbinding result
 */
const unbindAddress = async (data) => {
  // Create a new object to avoid modifying the original data object
  const unbindData = { ...data };

  // Set default chain to Ethereum if not provided
  if (!unbindData.chain) {
    unbindData.chain = DEFAULT_CHAIN;
  }

  // Validate required parameters
  if (!unbindData.address) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'address is required');
  }

  const reqData = {
    chain: unbindData.chain,
    address: unbindData.address
  };

  const path = `${apiBaseUrl}/addressUnbinding`;
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = getSignedText(reqData, timestamp);

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Appid": appId,
      "Sign": sign,
      "Timestamp": timestamp.toString(),
    },
  };

  try {
    const response = await axios.post(path, reqData, options);
    return {
      ...response.data,
      success: response.data.code === 10000
    };
  } catch (error) {
    console.error('CCPayment unbindAddress error:', error.response?.data || error.message);
    throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to unbind address');
  }
};

/**
 * Get deposit records list from CCPayment
 * @param {Object} [params] - Optional parameters for filtering
 * @param {number} [params.coinId] - Coin ID
 * @param {string} [params.referenceId] - Unique reference ID for the user
 * @param {string} [params.orderId] - Order ID
 * @param {string} [params.chain] - Symbol of the chain
 * @param {number} [params.startAt] - Retrieve records starting from this timestamp
 * @param {number} [params.endAt] - Retrieve records up to this timestamp
 * @param {string} [params.nextId] - Next ID for pagination
 * @returns {Promise<Object>} - List of deposit records
 */
const getDepositRecordsList = async (params = {}) => {
  // Create request data with only the provided parameters
  const reqData = {};

  // Add optional parameters if provided
  if (params.coinId) reqData.coinId = params.coinId;
  if (params.referenceId) reqData.referenceId = params.referenceId;
  if (params.orderId) reqData.orderId = params.orderId;
  if (params.chain) reqData.chain = params.chain;
  if (params.startAt) reqData.startAt = params.startAt;
  if (params.endAt) reqData.endAt = params.endAt;
  if (params.nextId) reqData.nextId = params.nextId;

  const path = `${apiBaseUrl}/getAppDepositRecordList`;
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = getSignedText(reqData, timestamp);

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Appid": appId,
      "Sign": sign,
      "Timestamp": timestamp.toString(),
    },
  };

  try {
    const response = await axios.post(path, reqData, options);
    return {
      ...response.data,
      success: response.data.code === 10000
    };
  } catch (error) {
    console.error('CCPayment getDepositRecordsList error:', error.response?.data || error.message);
    throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to get deposit records list');
  }
};

/**
 * Get withdrawal records list from CCPayment
 * @param {Object} [params] - Optional parameters for filtering
 * @param {number} [params.coinId] - Coin ID
 * @param {Array<string>} [params.orderIds] - Array of order IDs (max 20)
 * @param {string} [params.chain] - Symbol of the chain
 * @param {number} [params.startAt] - Retrieve records starting from this timestamp
 * @param {number} [params.endAt] - Retrieve records up to this timestamp
 * @param {string} [params.nextId] - Next ID for pagination
 * @returns {Promise<Object>} - List of withdrawal records
 */
const getWithdrawalRecordsList = async (params = {}) => {
  // Create request data with only the provided parameters
  const reqData = {};

  // Add optional parameters if provided
  if (params.coinId) reqData.coinId = params.coinId;
  if (params.orderIds && Array.isArray(params.orderIds)) reqData.orderIds = params.orderIds;
  if (params.chain) reqData.chain = params.chain;
  if (params.startAt) reqData.startAt = params.startAt;
  if (params.endAt) reqData.endAt = params.endAt;
  if (params.nextId) reqData.nextId = params.nextId;

  const path = `${apiBaseUrl}/getAppWithdrawRecordList`;
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = getSignedText(reqData, timestamp);

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Appid": appId,
      "Sign": sign,
      "Timestamp": timestamp.toString(),
    },
  };

  try {
    const response = await axios.post(path, reqData, options);
    return {
      ...response.data,
      success: response.data.code === 10000
    };
  } catch (error) {
    console.error('CCPayment getWithdrawalRecordsList error:', error.response?.data || error.message);
    throw new ApiError(httpStatus.BAD_REQUEST, 'Failed to get withdrawal records list');
  }
};

module.exports = {
  // Permanent deposit address methods
  getOrCreateAppDepositAddress,
  getDepositRecord,
  getDepositRecordsList,
  unbindAddress,

  // Withdrawal methods
  createWithdrawalRequest,
  getWithdrawalRecord,
  getWithdrawalRecordsList,

  // Utility methods
  getCoinList,
  getCoinUSDTPrice,
  convertAmount,
  verifyWebhookSignature
}