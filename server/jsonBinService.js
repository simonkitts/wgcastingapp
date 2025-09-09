const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// JSONBin.io Configuration
const JSONBIN_API_KEY = "$2a$10$CGipdX9RHvglpCEtxW8VXeiFLVj1dUUnIhjF2zRoHOaL5Rxeiv0L.";
const JSONBIN_BIN_ID = "68bee889ae596e708fe6eed1";
// NEW: separate bin for votes (set via env if available)
const JSONBIN_VOTES_BIN_ID = process.env.JSONBIN_VOTES_BIN_ID || process.env.REACT_APP_JSONBIN_VOTES_BIN_ID || "";
const JSONBIN_BASE_URL = 'https://api.jsonbin.io/v3/b';

// Logging for debugging
console.log('Using JSONBin.io configuration:');
console.log('API Key present:', !!JSONBIN_API_KEY);
console.log('BIN ID (main):', JSONBIN_BIN_ID);
console.log('BIN ID (votes):', JSONBIN_VOTES_BIN_ID || '(not set)');

// Default data structure (main bin only)
const DEFAULT_DATA = {
  votes: [], // kept for backward compatibility, but not used once votes bin is configured
  candidates: [],
  slotNotes: [],
  appointments: []
};

// NEW: default structure for votes bin (per-user map)
const DEFAULT_VOTES_DATA = {
  users: {} // { [username]: ServerVote[] }
};

// Cache implementation to prevent excessive API calls (separate caches per bin)
const mainCache = {
  data: null,
  lastFetched: 0,
  expiryTimeMs: 10000,
  isValid() { return this.data !== null && (Date.now() - this.lastFetched) < this.expiryTimeMs; },
  set(data) { this.data = data; this.lastFetched = Date.now(); },
  invalidate() { this.data = null; }
};

const votesCache = {
  data: null,
  lastFetched: 0,
  expiryTimeMs: 10000,
  isValid() { return this.data !== null && (Date.now() - this.lastFetched) < this.expiryTimeMs; },
  set(data) { this.data = data; this.lastFetched = Date.now(); },
  invalidate() { this.data = null; }
};

// Simple async locks to serialize write operations per bin
let mainWriteQueue = Promise.resolve();
let votesWriteQueue = Promise.resolve();
const withWriteLock = async (queueRef, fn) => {
  let release;
  const ticket = new Promise(resolve => (release = resolve));
  const prev = queueRef.current;
  queueRef.current = queueRef.current.then(() => ticket).catch(() => ticket);
  await prev;
  try { return await fn(); } finally { release(); }
};
// Helper to create a queueRef wrapper for closures
const makeQueueRef = (initial) => ({ current: initial });
const mainQueueRef = makeQueueRef(mainWriteQueue);
const votesQueueRef = makeQueueRef(votesWriteQueue);

// Rate limiting implementation
const rateLimiter = {
  lastRequestTime: 0,
  minIntervalMs: 1000,
  async throttle() {
    const now = Date.now();
    const timeToWait = this.lastRequestTime + this.minIntervalMs - now;
    if (timeToWait > 0) {
      console.log(`Rate limiting: Waiting ${timeToWait}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, timeToWait));
    }
    this.lastRequestTime = Date.now();
  }
};

// Retry logic with exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3) => {
  let retries = 0;
  while (true) {
    try { return await fn(); }
    catch (error) {
      retries++;
      if (retries >= maxRetries || error.response?.status !== 429) throw error;
      const delay = Math.pow(2, retries) * 1000;
      console.log(`Rate limit exceeded. Retrying in ${delay}ms (attempt ${retries}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Check if JSONBin credentials are set
const checkCredentials = () => {
  if (!JSONBIN_API_KEY) {
    console.error('ERROR: JSONBin.io API key not set. Please set JSONBIN_API_KEY in your .env file.');
    throw new Error('JSONBin.io API key not configured. Set JSONBIN_API_KEY in .env file.');
  }
};

// Initialize a bin with default data if needed
const ensureBinExists = async (binId, defaultData, label) => {
  try {
    if (!binId) {
      console.warn(`WARNING: JSONBin.io ${label} Bin ID not set. Cannot initialize.`);
      return;
    }
    await readFromBin(binId, true, label); // Force fetch from API
    console.log(`JSONBin.io ${label} bin exists and is accessible`);
  } catch (error) {
    console.error(`Error checking ${label} bin:`, error.message);
    if (error.response && error.response.status === 404) {
      console.log(`JSONBin.io ${label} bin not found or not accessible, creating a new one...`);
      try {
        await rateLimiter.throttle();
        const response = await axios.post('https://api.jsonbin.io/v3/b', defaultData, {
          headers: { 'Content-Type': 'application/json', 'X-Master-key': JSONBIN_API_KEY }
        });
        const newBinId = response.data.metadata.id;
        console.log(`Created new JSONBin.io ${label} bin:`, newBinId);
        console.log(`IMPORTANT: Update your .env file with this Bin ID as JSONBIN_${label.toUpperCase()}_BIN_ID=`, newBinId);
        if (label === 'main') {
          global.RUNTIME_BIN_ID = newBinId;
          mainCache.set(defaultData);
        } else if (label === 'votes') {
          global.RUNTIME_VOTES_BIN_ID = newBinId;
          votesCache.set(defaultData);
        }
      } catch (e) {
        console.error(`Failed to create JSONBin.io ${label} bin:`, e.message);
        throw e;
      }
    } else {
      console.error(`Error checking JSONBin.io ${label} bin:`, error.message);
      throw error;
    }
  }
};

// Initialize both bins
const initializeBin = async () => {
  try {
    checkCredentials();
    await ensureBinExists(getEffectiveMainBinId(), DEFAULT_DATA, 'main');
    if (getEffectiveVotesBinId()) {
      await ensureBinExists(getEffectiveVotesBinId(), DEFAULT_VOTES_DATA, 'votes');
    } else {
      console.warn('Votes bin ID not configured. Votes will be stored in the main bin under data.votes (legacy mode).');
    }
  } catch (error) {
    console.error('Failed to initialize JSONBin.io:', error.message);
    throw error;
  }
};

// Get the effective bin IDs (from env or runtime)
const getEffectiveMainBinId = () => {
  return global.RUNTIME_BIN_ID || JSONBIN_BIN_ID;
};
const getEffectiveVotesBinId = () => {
  return global.RUNTIME_VOTES_BIN_ID || JSONBIN_VOTES_BIN_ID || '';
};

// Generic read for a bin
const readFromBin = async (binId, forceRefresh = false, label = 'main') => {
  checkCredentials();
  const cache = label === 'votes' ? votesCache : mainCache;
  if (!forceRefresh && cache.isValid()) {
    console.log(`Using cached data (${label})`);
    return cache.data;
  }
  return retryWithBackoff(async () => {
    await rateLimiter.throttle();
    try {
      const response = await axios.get(`${JSONBIN_BASE_URL}/${binId}`, {
        headers: { 'X-Master-key': JSONBIN_API_KEY }
      });
      const record = response.data.record || (label === 'votes' ? DEFAULT_VOTES_DATA : DEFAULT_DATA);
      cache.set(record);
      return record;
    } catch (error) {
      console.error(`Error reading from JSONBin.io (${label}):`, error.message);
      throw error;
    }
  });
};

// Generic update for a bin
const updateBinFor = async (binId, data, label = 'main') => {
  checkCredentials();
  return retryWithBackoff(async () => {
    await rateLimiter.throttle();
    try {
      const response = await axios.put(`${JSONBIN_BASE_URL}/${binId}`, data, {
        headers: { 'Content-Type': 'application/json', 'X-Master-key': JSONBIN_API_KEY }
      });
      const cache = label === 'votes' ? votesCache : mainCache;
      cache.set(data);
      return response.data.record;
    } catch (error) {
      console.error(`Error updating JSONBin.io (${label}):`, error.message);
      throw error;
    }
  });
};

// Backward-compatible wrappers for main bin
const readBin = async (forceRefresh = false) => {
  const binId = getEffectiveMainBinId();
  return readFromBin(binId, forceRefresh, 'main');
};
const updateBin = async (data) => {
  const binId = getEffectiveMainBinId();
  return updateBinFor(binId, data, 'main');
};

// Helper to perform a serialized read-modify-write using fresh data for a specific bin
const serialUpdate = async (transformFn, label = 'main') => {
  const queueRef = label === 'votes' ? votesQueueRef : mainQueueRef;
  return withWriteLock(queueRef, async () => {
    const binId = label === 'votes' ? getEffectiveVotesBinId() : getEffectiveMainBinId();
    const latest = await readFromBin(binId, true, label);
    const updated = await transformFn({ ...latest });
    // Normalize shape according to label
    let dataToWrite = updated;
    if (label === 'main') {
      dataToWrite = {
        votes: Array.isArray(updated.votes) ? updated.votes : (latest.votes || []),
        candidates: Array.isArray(updated.candidates) ? updated.candidates : (latest.candidates || []),
        slotNotes: Array.isArray(updated.slotNotes) ? updated.slotNotes : (latest.slotNotes || []),
        appointments: Array.isArray(updated.appointments) ? updated.appointments : (latest.appointments || [])
      };
    } else if (label === 'votes') {
      // votes bin should be an object with users mapping
      const users = updated.users && typeof updated.users === 'object' ? updated.users : (latest.users || {});
      dataToWrite = { users };
    }
    await updateBinFor(binId, dataToWrite, label);
    return true;
  });
};

// Votes Operations
const readVotes = async () => {
  try {
    const votesBinId = getEffectiveVotesBinId();
    if (votesBinId) {
      const data = await readFromBin(votesBinId, false, 'votes');
      const users = data.users || {};
      // Flatten to array of votes with username included
      const flattened = Object.entries(users).flatMap(([username, arr]) => {
        return Array.isArray(arr) ? arr.map(v => ({ ...v, username })) : [];
      });
      return flattened;
    }
    // Legacy: read from main bin votes array
    const data = await readBin();
    return data.votes || [];
  } catch (error) {
    console.error('Error reading votes:', error.message);
    return [];
  }
};

// Safely update a single user's votes using the votes bin if configured
const updateUserVotes = async (username, newVotes) => {
  try {
    const votesBinId = getEffectiveVotesBinId();
    if (votesBinId) {
      return await serialUpdate(async (data) => {
        const users = data.users && typeof data.users === 'object' ? data.users : {};
        users[username] = Array.isArray(newVotes) ? newVotes.map(v => ({ day: v.day, start: v.start, end: v.end, status: v.status })) : [];
        return { ...data, users };
      }, 'votes');
    }
    // Legacy path: store in main bin's votes array
    return await serialUpdate(async (data) => {
      const currentVotes = Array.isArray(data.votes) ? data.votes : [];
      let merged = currentVotes.filter(v => v && v.username !== username);
      const formatted = (Array.isArray(newVotes) ? newVotes : []).map(v => ({
        username,
        day: v.day,
        start: v.start,
        end: v.end,
        status: v.status || 'present'
      }));
      merged.push(...formatted);
      return { ...data, votes: merged };
    }, 'main');
  } catch (error) {
    console.error('Error updating user votes:', error.message);
    return false;
  }
};

const writeVotes = async (votes) => {
  try {
    const votesBinId = getEffectiveVotesBinId();
    if (votesBinId) {
      // Overwrite entire users map by grouping votes by username
      const grouped = Array.isArray(votes) ? votes.reduce((acc, v) => {
        const user = v.username || (v.userId || 'unknown');
        if (!acc[user]) acc[user] = [];
        acc[user].push({ day: v.day, start: v.start, end: v.end, status: v.status });
        return acc;
      }, {}) : {};
      return await serialUpdate(async (data) => ({ users: grouped }), 'votes');
    }
    // Legacy path
    return await serialUpdate(async (data) => ({ ...data, votes: Array.isArray(votes) ? votes : [] }), 'main');
  } catch (error) {
    console.error('Error writing votes:', error.message);
    return false;
  }
};

// Candidates Operations (main bin)
const readCandidates = async () => {
  try {
    const data = await readBin();
    return data.candidates || [];
  } catch (error) {
    console.error('Error reading candidates:', error.message);
    return [];
  }
};

const writeCandidates = async (candidates) => {
  try {
    return await serialUpdate(async (data) => ({ ...data, candidates: Array.isArray(candidates) ? candidates : [] }), 'main');
  } catch (error) {
    console.error('Error writing candidates:', error.message);
    return false;
  }
};

// SlotNotes Operations (main bin)
const readSlotNotes = async () => {
  try {
    const data = await readBin();
    return data.slotNotes || [];
  } catch (error) {
    console.error('Error reading slotNotes:', error.message);
    return [];
  }
};

const writeSlotNotes = async (slotNotes) => {
  try {
    return await serialUpdate(async (data) => ({ ...data, slotNotes: Array.isArray(slotNotes) ? slotNotes : [] }), 'main');
  } catch (error) {
    console.error('Error writing slotNotes:', error.message);
    return false;
  }
};

// Appointments Operations (main bin)
const readAppointments = async () => {
  try {
    const data = await readBin();
    return data.appointments || [];
  } catch (error) {
    console.error('Error reading appointments:', error.message);
    return [];
  }
};

const writeAppointments = async (appointments) => {
  try {
    return await serialUpdate(async (data) => ({ ...data, appointments: Array.isArray(appointments) ? appointments : [] }), 'main');
  } catch (error) {
    console.error('Error writing appointments:', error.message);
    return false;
  }
};

module.exports = {
  initializeBin,
  readVotes,
  writeVotes,
  readCandidates,
  writeCandidates,
  readSlotNotes,
  writeSlotNotes,
  readAppointments,
  writeAppointments,
  updateUserVotes,
  invalidateCache: () => { mainCache.invalidate(); votesCache.invalidate(); }
};
