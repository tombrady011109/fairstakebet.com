const axios = require('axios');
const CryptoJS = require('crypto-js');
const SUMSUB_APP_TOKEN = "prd:4ZbQaCUTQmJYkk7giQYEuOJp.75b65BCjYaTHIrYRpO7P0w8G3CcPeNV4";
const SUMSUB_SECRET_KEY = "NFN0mhCHhbqLLgMxzrsich3P2M1hOW2t";
const getSignature = (_valueToSign = '') => {
    return CryptoJS.enc.Hex.stringify(CryptoJS.HmacSHA256(_valueToSign, SUMSUB_SECRET_KEY));
}
const createApplicant = async (applicantData) => {
    const stamp = Math.floor(Date.now() / 1000).toString();
    const valueToSign = stamp + "POST/resources/applicants?levelName=basic-kyc-level" + JSON.stringify(applicantData);
    const signature = getSignature(valueToSign)
    const options = {
        method: 'POST',
        url: 'https://api.sumsub.com/resources/applicants?levelName=basic-kyc-level',
        headers: {
            'Content-Type': 'application/json',
            'X-App-Token': SUMSUB_APP_TOKEN,
            'X-App-Access-Ts': stamp,
            'X-App-Access-Sig': signature
        },
        data: applicantData
    };
    return await axios
        .request(options)
        .then(function (response) {
            console.log(response.data);
            return response.data
        })
        .catch(function (error) {
            console.error(error);
            return { token: null }
        });
};
const generateSDKaccessToken = (async (id) => {
    const stamp = Math.floor(Date.now() / 1000).toString();
    const valueToSign = stamp + `POST/resources/accessTokens?userId=${id}&levelName=basic-kyc-level`;
    const signature = getSignature(valueToSign)
    const options = {
        method: 'POST',
        url: `https://api.sumsub.com/resources/accessTokens?userId=${id}&levelName=basic-kyc-level`,
        headers: {
            'Content-Type': 'application/json',
            'X-App-Token': SUMSUB_APP_TOKEN,
            'X-App-Access-Ts': stamp,
            'X-App-Access-Sig': signature
        },
    };
    return await axios
        .request(options)
        .then(function (response) {
            // console.log(response.data);
            return response.data
        })
        .catch(function (error) {
            // console.error(error);
            return { token: null }
        });
})
const appData={
    externalUserId: "1Joe21324",
    email: "john.smith@sumsub.com",
    phone: "+449112081223",
    fixedInfo: {
        country: "GBR",
        placeOfBirth: "London"
    }
}
module.exports = { createApplicant, generateSDKaccessToken };
// createApplicant(appData)
// generateSDKaccessToken()