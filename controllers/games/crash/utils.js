const CryptoJS = require("crypto-js");

const SALT = "Qede00000000000w00wd001bw4dc6a1e86083f95500b096231436e9b25cbdd0075c4";

function calculateCrashPoint(seed) {
  const nBits = 52; // number of most significant bits to use
  // 1. HMAC_SHA256(message=seed, key=salt)  
  const hmac = CryptoJS.HmacSHA256(CryptoJS.enc.Hex.parse(seed), SALT);
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
}

function calculateElapsed(t) {
  return Math.log(t) / 6e-5;
}

function calculateRate(t) {
  return Math.pow(Math.E, 6e-5 * t);
}

function waitFor(delay) {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

module.exports = {
  calculateCrashPoint,
  calculateElapsed,
  calculateRate,
  waitFor,
  SALT
};