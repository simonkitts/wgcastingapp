const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// JSONBin.io Configuration
const JSONBIN_API_KEY = "$2a$10$CGipdX9RHvglpCEtxW8VXeiFLVj1dUUnIhjF2zRoHOaL5Rxeiv0L.";
const JSONBIN_BIN_ID = "68bee889ae596e708fe6eed1";
const JSONBIN_BASE_URL = 'https://api.jsonbin.io/v3/b';

// Logging for debugging
console.log('Using JSONBin.io configuration:');
console.log('API Key present:', !!JSONBIN_API_KEY);
console.log('BIN ID:', JSONBIN_BIN_ID);

// Default data structure
const DEFAULT_DATA = {
  votes: [],
  candidates: [],
  slotNotes: [],
  appointments: []
};

// Cache implementation to prevent excessive API calls
const cache = {
  data: null,
  lastFetched: 0,
  expiryTimeMs: 10000, // Cache expires after 10 seconds
  isValid() {
    return this.data !== null && (Date.now() - this.lastFetched) < this.expiryTimeMs;
  },
  set(data) {
    this.data = data;
    this.lastFetched = Date.now();
  },
  invalidate() {
    this.data = null;
  }
};

// Rate limiting implementation
const rateLimiter = {
  lastRequestTime: 0,
  minIntervalMs: 1000, // Minimum 1 second between requests
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
    try {
      return await fn();
    } catch (error) {
      retries++;
      
      if (retries >= maxRetries || error.response?.status !== 429) {
        throw error;
      }
      
      // Exponential backoff: 2^retries * 1000ms (1s, 2s, 4s, etc.)
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
  
  if (!JSONBIN_BIN_ID) {
    console.warn('WARNING: JSONBin.io Bin ID not set. A new bin will be created automatically.');
  }
};

// Initialize the bin with default data if needed
const initializeBin = async () => {
  try {
    checkCredentials();

    // If we have a bin ID, check if it exists by trying to read it
    try {
      await readBin(true); // Force fetch from API
      console.log('JSONBin.io bin exists and is accessible');
    } catch (error) {
      console.error('Error checking bin:', error.message);
      if (error.response && error.response.status === 404) {
        console.log('JSONBin.io bin not found or not accessible, creating a new one...');
        try {
          await rateLimiter.throttle();

          const response = await axios.post('https://api.jsonbin.io/v3/b', DEFAULT_DATA, {
            headers: {
              'Content-Type': 'application/json',
              'X-Master-key': JSONBIN_API_KEY
            }
          });

          const newBinId = response.data.metadata.id;
          console.log('Created new JSONBin.io bin:', newBinId);
          console.log('IMPORTANT: Update your .env file with this Bin ID as JSONBIN_BIN_ID=', newBinId);

          // Update global BIN_ID for this session
          global.RUNTIME_BIN_ID = newBinId;

          // Update cache
          cache.set(DEFAULT_DATA);
        } catch (error) {
          console.error('Failed to create JSONBin.io bin:', error.message);
          throw error;
        }
      } else {
        console.error('Error checking JSONBin.io bin:', error.message);
        throw error;
      }
    }
  } catch (error) {
    console.error('Failed to initialize JSONBin.io:', error.message);
    throw error;
  }
};

// Get the effective bin ID (from env or runtime)
const getEffectiveBinId = () => {
  return global.RUNTIME_BIN_ID || JSONBIN_BIN_ID;
};

// Read the entire bin
const readBin = async (forceRefresh = false) => {
  checkCredentials();

  // Return cached data if valid and not forcing refresh
  if (!forceRefresh && cache.isValid()) {
    console.log('Using cached data');
    return cache.data;
  }

  const binId = getEffectiveBinId();

  return retryWithBackoff(async () => {
    await rateLimiter.throttle();

    try {
      const response = await axios.get(`${JSONBIN_BASE_URL}/${binId}`, {
        headers: {
          'X-Master-key': JSONBIN_API_KEY
        }
      });

      const data = response.data.record || DEFAULT_DATA;
      cache.set(data);
      return data;
    } catch (error) {
      console.error('Error reading from JSONBin.io:', error.message);
      throw error;
    }
  });
};

// Update the entire bin
const updateBin = async (data) => {
  checkCredentials();
  const binId = getEffectiveBinId();

  return retryWithBackoff(async () => {
    await rateLimiter.throttle();

    try {
      const response = await axios.put(`${JSONBIN_BASE_URL}/${binId}`, data, {
        headers: {
          'Content-Type': 'application/json',
          'X-Master-key': JSONBIN_API_KEY
        }
      });

      // Update cache with new data
      cache.set(data);

      return response.data.record;
    } catch (error) {
      console.error('Error updating JSONBin.io:', error.message);
      throw error;
    }
  });
};

// Votes Operations
const readVotes = async () => {
  try {
    const data = await readBin();
    return data.votes || [];
  } catch (error) {
    console.error('Error reading votes:', error.message);
    return [];
  }
};

const writeVotes = async (votes) => {
  try {
    const data = await readBin();
    data.votes = votes;
    await updateBin(data);
    return true;
  } catch (error) {
    console.error('Error writing votes:', error.message);
    return false;
  }
};

// Candidates Operations
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
    const data = await readBin();
    data.candidates = candidates;
    await updateBin(data);
    return true;
  } catch (error) {
    console.error('Error writing candidates:', error.message);
    return false;
  }
};

// SlotNotes Operations
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
    const data = await readBin();
    data.slotNotes = slotNotes;
    await updateBin(data);
    return true;
  } catch (error) {
    console.error('Error writing slotNotes:', error.message);
    return false;
  }
};

// Appointments Operations
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
    const data = await readBin();
    data.appointments = appointments;
    await updateBin(data);
    return true;
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
  invalidateCache: () => cache.invalidate() // Export cache invalidation for testing
};
