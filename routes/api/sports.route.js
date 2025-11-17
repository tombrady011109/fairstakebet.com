const express = require('express');
const axios = require('axios');

const router = express.Router();

// Env keys with fallbacks to provided keys (can be overridden in .env)
// API-Sports family (soccer direct, and v1.*.api-sports.io via Rapid headers) -> 841c...
const API_SPORTS_KEY = process.env.API_SPORTS_KEY || '841cc173d07ca902db9cf19a924ee82e';
// Other RapidAPI providers (Tennis/LoL/Horse/CS2) -> 0b2...
const RAPIDAPI_ALT_KEY = process.env.RAPIDAPI_ALT_KEY || '0b2d649173msh2b7a29de97e56c5p10e408jsn9633d349e1e9';

// Helpers
const ok = (res, data) => res.json({ response: data, status: true });
const fail = (res, error, code = 500) =>
  res.status(code).json({ status: false, error: typeof error === 'string' ? error : (error?.message || 'Unknown error') });

// Soccer - live
router.get('/soccer/live', async (req, res) => {
  try {
    const { data } = await axios.get('https://v3.football.api-sports.io/fixtures?live=all', {
      headers: { 'x-apisports-key': API_SPORTS_KEY }
    });
    ok(res, data?.response ?? []);
  } catch (err) {
    fail(res, err);
  }
});

// Soccer - by date (YYYY-MM-DD)
router.get('/soccer/by-date', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const { data } = await axios.get(`https://v3.football.api-sports.io/fixtures?date=${date}`, {
      headers: { 'x-apisports-key': API_SPORTS_KEY }
    });
    ok(res, data?.response ?? []);
  } catch (err) {
    fail(res, err);
  }
});

// Volleyball - live
router.get('/volleyball/live', async (req, res) => {
  try {
    const { data } = await axios.get('https://v1.volleyball.api-sports.io/games?live=all', {
      headers: {
        'x-rapidapi-key': API_SPORTS_KEY,
        'x-rapidapi-host': 'v1.volleyball.api-sports.io'
      }
    });
    ok(res, data?.response ?? []);
  } catch (err) {
    fail(res, err);
  }
});

// Volleyball - by date
router.get('/volleyball/by-date', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const { data } = await axios.get(`https://v1.volleyball.api-sports.io/games?date=${date}`, {
      headers: {
        'x-rapidapi-key': API_SPORTS_KEY,
        'x-rapidapi-host': 'v1.volleyball.api-sports.io'
      }
    });
    ok(res, data?.response ?? []);
  } catch (err) {
    fail(res, err);
  }
});

// Basketball - by date (API provides date-based query)
router.get('/basketball/by-date', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const { data } = await axios.get(`https://v1.basketball.api-sports.io/games?date=${date}`, {
      headers: {
        'x-rapidapi-key': API_SPORTS_KEY,
        'x-rapidapi-host': 'v1.basketball.api-sports.io'
      }
    });
    ok(res, data?.response ?? []);
  } catch (err) {
    fail(res, err);
  }
});

// Basketball - derived "live" (filter in backend for convenience)
router.get('/basketball/live', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const { data } = await axios.get(`https://v1.basketball.api-sports.io/games?date=${date}`, {
      headers: {
        'x-rapidapi-key': API_SPORTS_KEY,
        'x-rapidapi-host': 'v1.basketball.api-sports.io'
      }
    });
    const all = data?.response ?? [];
    const live = all.filter((g) => {
      const s = (g?.status?.short || '').toString().toLowerCase();
      const sl = (g?.status?.long || '').toString().toLowerCase();
      return s.includes('live') || s.includes('q') || s.includes('period') || sl.includes('live');
    });
    ok(res, live);
  } catch (err) {
    fail(res, err);
  }
});

// Ice Hockey - live
router.get('/icehockey/live', async (req, res) => {
  try {
    const { data } = await axios.get('https://v1.hockey.api-sports.io/games?live=all', {
      headers: {
        'x-rapidapi-key': API_SPORTS_KEY,
        'x-rapidapi-host': 'v1.hockey.api-sports.io'
      }
    });
    ok(res, data?.response ?? []);
  } catch (err) {
    fail(res, err);
  }
});

// Ice Hockey - by date
router.get('/icehockey/by-date', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const { data } = await axios.get(`https://v1.hockey.api-sports.io/games?date=${date}`, {
      headers: {
        'x-rapidapi-key': API_SPORTS_KEY,
        'x-rapidapi-host': 'v1.hockey.api-sports.io'
      }
    });
    ok(res, data?.response ?? []);
  } catch (err) {
    fail(res, err);
  }
});

// Tennis - live (example endpoint; this API returns various structures)
router.get('/tennis/live', async (req, res) => {
  try {
    const { data } = await axios.get('https://tennisapi1.p.rapidapi.com/api/tennis/rankings/wta/live', {
      headers: {
        'x-rapidapi-key': RAPIDAPI_ALT_KEY,
        'x-rapidapi-host': 'tennisapi1.p.rapidapi.com'
      }
    });
    // Return raw data to frontend (they normalize already)
    ok(res, data?.data ?? data ?? []);
  } catch (err) {
    fail(res, err);
  }
});

// CS2 - events matches
router.get('/cs2/matches', async (req, res) => {
  try {
    const { data } = await axios.get('https://cs2-esports-api.p.rapidapi.com/api/events/matches', {
      headers: {
        'x-rapidapi-key': RAPIDAPI_ALT_KEY,
        'x-rapidapi-host': 'cs2-esports-api.p.rapidapi.com'
      }
    });
    ok(res, data?.data ?? data ?? []);
  } catch (err) {
    fail(res, err);
  }
});

// League of Legends - tournaments (used to derive matches)
router.get('/lol/tournaments', async (req, res) => {
  try {
    const { data } = await axios.get('https://league-of-legends-esports.p.rapidapi.com/tournaments', {
      headers: {
        'x-rapidapi-key': RAPIDAPI_ALT_KEY,
        'x-rapidapi-host': 'league-of-legends-esports.p.rapidapi.com'
      }
    });
    ok(res, data?.data ?? data ?? []);
  } catch (err) {
    fail(res, err);
  }
});

// Horse Racing - races
router.get('/horseracing/races', async (req, res) => {
  try {
    const { data } = await axios.get('https://horse-racing.p.rapidapi.com/race', {
      headers: {
        'x-rapidapi-key': RAPIDAPI_ALT_KEY,
        'x-rapidapi-host': 'horse-racing.p.rapidapi.com'
      }
    });
    ok(res, data?.data ?? data ?? []);
  } catch (err) {
    fail(res, err);
  }
});

// Baseball - live & by-date
router.get('/baseball/live', async (req, res) => {
  try {
    const { data } = await axios.get('https://v1.baseball.api-sports.io/games?live=all', {
      headers: {
        'x-rapidapi-key': API_SPORTS_KEY,
        'x-rapidapi-host': 'v1.baseball.api-sports.io'
      }
    });
    ok(res, data?.response ?? []);
  } catch (err) {
    fail(res, err);
  }
});

router.get('/baseball/by-date', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const { data } = await axios.get(`https://v1.baseball.api-sports.io/games?date=${date}`, {
      headers: {
        'x-rapidapi-key': API_SPORTS_KEY,
        'x-rapidapi-host': 'v1.baseball.api-sports.io'
      }
    });
    ok(res, data?.response ?? []);
  } catch (err) {
    fail(res, err);
  }
});

// Cricket - player rankings
router.get('/cricket/rankings', async (req, res) => {
  try {
    const { data } = await axios.get('https://cricket-live-line1.p.rapidapi.com/playerRanking', {
      headers: {
        'x-rapidapi-key': API_SPORTS_KEY,
        'x-rapidapi-host': 'cricket-live-line1.p.rapidapi.com'
      }
    });
    ok(res, data?.data ?? data ?? []);
  } catch (err) {
    fail(res, err);
  }
});

module.exports = router;


