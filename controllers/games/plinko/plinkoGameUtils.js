const crypto = require('crypto');
const Profile = require('../../../models/user.model');

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateServerSeed() {
  return crypto.randomBytes(32).toString('hex');
}

function hashServerSeed(serverSeed) {
  return crypto.createHash('sha256').update(serverSeed).digest('hex');
}

function generateHash(clientSeed, nonce, serverSeed) {
  const hmac = crypto.createHmac('sha512', serverSeed);
  const data = `${clientSeed}:${nonce}`;
  hmac.update(data);
  return hmac.digest('hex');
}

function generatePlinkoBallPath(clientSeed, nonce, serverSeed, rows) {
  const hash = generateHash(clientSeed, nonce, serverSeed);
  const hashList = String(hash).match(/.{2}/g);
  let path = [];
  for (let i = 0, l = hashList.length; i < l && path.length < rows; i += 4) {
    let num =
      parseInt(hashList[i], 16) / Math.pow(256, 1) +
      parseInt(hashList[i + 1], 16) / Math.pow(256, 2) +
      parseInt(hashList[i + 2], 16) / Math.pow(256, 3) +
      parseInt(hashList[i + 3], 16) / Math.pow(256, 4);
    path.push(num);
  }
  return path;
}

async function populateUser(data) {
  const user = await Profile.findById(data.user_id).lean();
  return {
    ...data,
    userId: user._id,
    hidden: user.hidden_from_public,
    name: user.hidden_from_public ? '' : user.username,
    avatar: user.hidden_from_public ? '' : user.profile_image,
  };
}

module.exports = {
  generateRandomString,
  generateServerSeed,
  hashServerSeed,
  generateHash,
  generatePlinkoBallPath,
  populateUser,
};