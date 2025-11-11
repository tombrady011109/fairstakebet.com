const axios = require('axios');
const crypto = require('crypto');
const baseURL = 'https://api.sumsub.com';

const SUMSUB_APP_TOKEN = "sbx:GT3V3iogzWWiN7SGtUlJc1n9.bhaQVB2aDcp4OCEKViKjIYkluizF6ajG";
const SUMSUB_SECRET_KEY = "k7sSv4HPFTluuDiedoxOMsRSlfBPeWRm";

const sumsubClient = axios.create({
  baseURL,
  headers: {
    'X-App-Token': SUMSUB_APP_TOKEN,
    'Content-Type': 'application/json'
  }
})

const generateSignature = (method, path, ts) => {
  const data = ts + method + path;
  return crypto.createHmac('sha256', SUMSUB_SECRET_KEY).update(data).digest('hex');
}

const createApplicant = async (applicantData) => {
  const method = 'POST';
  const path = '/resources/applicants';
  const ts = Math.floor(Date.now() / 1000).toString();
  const signature = generateSignature(method, path, ts);
  try {
    const response = await sumsubClient.post(path, applicantData, {
      headers: {
        'X-App-Access-Ts': ts,
        'X-App-Access-Sig': signature
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating applicant:', error.response ? error.response.data : error.message);
    throw error;
  }
};

function createSumsubSignature(secretKey, method, endpoint, timestamp) {
  // Step 1: Concatenate the data to be signed
  const data = `${method}${endpoint}${timestamp}`;

  // Step 2: Create the HMAC signature
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(data);

  // Step 3: Convert the signature to HEX format and lowercase
  const signature = hmac.digest('hex');

  return signature;
}

function getUnixTimestamp() {
  // Get the current time in milliseconds since Unix Epoch
  const currentTimeInMs = Date.now();

  // Convert milliseconds to seconds
  const currentTimeInSeconds = Math.floor(currentTimeInMs / 1000);

  return currentTimeInSeconds;
}

const timestampEl = getUnixTimestamp();
const method = 'POST'; // or 'GET', 'PUT', etc.
const endpoint = '/resources/accessTokens';
const timestamp = Math.floor(Date.now() / 1000); // Current timestamp in seconds
const signature = createSumsubSignature(SUMSUB_SECRET_KEY, method, endpoint, timestamp);


const generateSDKaccessToken = (async()=>{
    await axios.post("https://api.sumsub.com/resources/accessTokens?userId=valiantJoe1234&levelName=basic-kyc-level&ttlInSecs=600",{
      headers:{
        Accept: "application/json",
        "X-App-Token" : SUMSUB_APP_TOKEN,
        'X-App-Access-Sig': signature,
        'X-App-Access-Ts': timestampEl
      }
    })
    .then((res)=>{
      console.log(res)
    })
    .catch((error)=>{
      console.log(error.response)
    })
})
  
  module.exports = { createApplicant, generateSDKaccessToken };