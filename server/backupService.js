const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const axios = require('axios');
const cron = require('node-cron');
const { google } = require('googleapis');
const { makeLogger } = require('./logger');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// JSONBin configuration
const JSONBIN_API_KEY = process.env.JSONBIN_API_KEY || '';
const JSONBIN_MAIN_BIN_ID = process.env.JSONBIN_BIN_ID || '';
const JSONBIN_VOTES_BIN_ID = process.env.JSONBIN_VOTES_BIN_ID || '';
const JSONBIN_BASE_URL = 'https://api.jsonbin.io/v3/b';

// Google OAuth configuration (personal account only)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost';
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || undefined; // optional

// Backup behavior
const BACKUP_DRY_RUN = process.env.BACKUP_DRY_RUN === '1';
const BACKUP_DIR = path.resolve(__dirname, 'backups');
const BACKUP_STRATEGY = (process.env.BACKUP_STRATEGY || 'both').toLowerCase(); // 'local' | 'drive' | 'both'
const USE_LOCAL = BACKUP_STRATEGY === 'local' || BACKUP_STRATEGY === 'both';
const USE_DRIVE = BACKUP_STRATEGY === 'drive' || BACKUP_STRATEGY === 'both';

// Safety and scheduling constants
const BACKUP_INTERVAL_HOURS = 6; // keep in sync with cron schedule below
const BACKUP_INTERVAL_MS = BACKUP_INTERVAL_HOURS * 60 * 60 * 1000;
const STARTUP_CATCHUP_GRACE_MS = (parseInt(process.env.BACKUP_CATCHUP_GRACE_MINUTES || '15', 10)) * 60 * 1000; // skip immediate backup if last success was within this window
const LOCK_STALE_MS = (parseInt(process.env.BACKUP_LOCK_STALE_MINUTES || '60', 10)) * 60 * 1000; // consider lock stale after this time
const STATE_FILE = path.join(BACKUP_DIR, 'backup-state.json');
const LOCK_FILE = path.join(BACKUP_DIR, 'backup.lock');

const log = makeLogger('Backup');

log.info('Config:', {
  dryRun: BACKUP_DRY_RUN,
  strategy: BACKUP_STRATEGY,
  mainBinIdSet: !!JSONBIN_MAIN_BIN_ID,
  votesBinIdSet: !!JSONBIN_VOTES_BIN_ID,
  driveCredsSet: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN),
  folderIdSet: !!DRIVE_FOLDER_ID,
  backupDir: BACKUP_DIR
});

// Lazily init OAuth2 client
let drive = null;
function getDrive() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    log.warn('Google credentials missing. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN to enable Drive uploads.');
    return null;
  }
  if (drive) return drive;
  log.info('Initializing Google Drive client');
  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  drive = google.drive({ version: 'v3', auth: oauth2Client });
  log.info('Google Drive client initialized');
  return drive;
}

async function fetchBin(binId, label) {
  if (!JSONBIN_API_KEY) throw new Error('JSONBin API key missing');
  if (!binId) throw new Error(`JSONBin ${label} bin id missing`);
  const url = `${JSONBIN_BASE_URL}/${binId}`;
  const started = Date.now();
  log.info(`Fetching ${label} bin`);
  const res = await axios.get(url, { headers: { 'X-Master-key': JSONBIN_API_KEY } });
  const ms = Date.now() - started;
  const size = Buffer.byteLength(JSON.stringify(res.data));
  log.info(`Fetched ${label} bin: status=${res.status}, bytes=${size}, in ${ms}ms`);
  return res.data; // include metadata + record
}

function timestampSafe() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function ensureBackupDir() {
  await fsp.mkdir(BACKUP_DIR, { recursive: true });
}

// Persistent state helpers
async function readState() {
  try {
    const raw = await fsp.readFile(STATE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return { lastSuccess: null, lastAttempt: null, lastError: null, lastFile: null };
  }
}

async function writeState(partial) {
  const current = await readState();
  const next = { ...current, ...partial };
  const tmp = STATE_FILE + '.tmp';
  await fsp.writeFile(tmp, JSON.stringify(next, null, 2));
  await fsp.rename(tmp, STATE_FILE);
}

// File-based lock to avoid concurrent backups and handle stale locks
async function acquireLock() {
  const now = Date.now();
  // Try to create lock atomically
  try {
    await fsp.writeFile(LOCK_FILE, JSON.stringify({ pid: process.pid, since: new Date().toISOString() }, null, 2), { flag: 'wx' });
    return true;
  } catch (e) {
    if (e && e.code === 'EEXIST') {
      // Check staleness
      try {
        const stat = await fsp.stat(LOCK_FILE);
        const age = now - stat.mtimeMs;
        if (age > LOCK_STALE_MS) {
          log.warn(`Stale backup lock detected (age ${Math.round(age / 1000)}s) - forcing unlock`);
          await fsp.unlink(LOCK_FILE).catch(() => {});
          // Retry once
          await fsp.writeFile(LOCK_FILE, JSON.stringify({ pid: process.pid, since: new Date().toISOString(), note: 'recovered stale lock' }, null, 2), { flag: 'wx' });
          return true;
        }
      } catch (_) {
        // If we can't stat, try to recover
        try {
          await fsp.unlink(LOCK_FILE);
        } catch (_) {}
        try {
          await fsp.writeFile(LOCK_FILE, JSON.stringify({ pid: process.pid, since: new Date().toISOString(), note: 'recovered lock (stat failed)' }, null, 2), { flag: 'wx' });
          return true;
        } catch (_) {}
      }
      return false; // lock is active and not stale
    }
    throw e; // unexpected error
  }
}

async function releaseLock() {
  try {
    await fsp.unlink(LOCK_FILE);
  } catch (_) {
    // ignore
  }
}

// Build payload for backup without side-effects (allows flexible destinations)
async function buildBackupPayload() {
  if (BACKUP_DRY_RUN) {
    log.info('DRY_RUN enabled - skipping remote fetch');
    return {
      timestamp: new Date().toISOString(),
      mainBinId: JSONBIN_MAIN_BIN_ID || '(unset)',
      votesBinId: JSONBIN_VOTES_BIN_ID || null,
      main: { mock: true, note: 'DRY_RUN enabled - no network calls' },
      votes: { mock: true, note: 'DRY_RUN enabled - no network calls' }
    };
  }
  // Validate required config for live fetch
  if (!JSONBIN_API_KEY) throw new Error('Missing JSONBIN_API_KEY');
  if (!JSONBIN_MAIN_BIN_ID) throw new Error('Missing JSONBIN_BIN_ID');

  const started = Date.now();
  log.info('Fetching main and votes bins');
  const main = await fetchBin(JSONBIN_MAIN_BIN_ID, 'main');
  let votes = null;
  if (JSONBIN_VOTES_BIN_ID) {
    try {
      votes = await fetchBin(JSONBIN_VOTES_BIN_ID, 'votes');
    } catch (e) {
      log.warn('Failed to fetch votes bin:', e.message);
    }
  } else {
    log.info('Votes bin ID not set - skipping votes fetch');
  }
  const ms = Date.now() - started;
  log.info(`Fetched data in ${ms}ms`);
  return {
    timestamp: new Date().toISOString(),
    mainBinId: JSONBIN_MAIN_BIN_ID,
    votesBinId: JSONBIN_VOTES_BIN_ID || null,
    main,
    votes
  };
}

async function writeLocalBackup(payload) {
  const ts = timestampSafe();
  const filename = `backup-${ts}.json`;
  const filePath = path.join(BACKUP_DIR, filename);
  const tmpPath = filePath + '.tmp';
  const payloadStr = JSON.stringify(payload, null, 2);
  const bytes = Buffer.byteLength(payloadStr);
  // Atomic write: write to tmp then rename
  await fsp.writeFile(tmpPath, payloadStr, 'utf-8');
  await fsp.rename(tmpPath, filePath);
  log.info(`Wrote backup file: ${filePath} (${bytes} bytes)`);
  return { filePath, filename, bytes };
}

async function uploadToDrive(filePath, filename) {
  if (BACKUP_DRY_RUN) {
    log.warn('DRY_RUN enabled - skipping Google Drive upload');
    return null;
  }
  const client = getDrive();
  if (!client) {
    log.warn('Google Drive upload skipped (missing credentials).');
    return null;
  }
  const fileMetadata = { name: filename };
  if (DRIVE_FOLDER_ID) fileMetadata.parents = [DRIVE_FOLDER_ID];

  const size = (await fsp.stat(filePath)).size;
  log.info(`Uploading to Google Drive: name=${filename}, size=${size} bytes, folder=${DRIVE_FOLDER_ID || 'root'}`);

  const media = { mimeType: 'application/json', body: fs.createReadStream(filePath) };
  const started = Date.now();
  const res = await client.files.create({ resource: fileMetadata, media, fields: 'id,name,webViewLink' });
  const ms = Date.now() - started;
  log.info(`Drive upload complete: id=${res.data.id}, link=${res.data.webViewLink || 'n/a'}, in ${ms}ms`);
  return res.data;
}

async function performBackup() {
  const started = Date.now();
  log.info('Starting backup');
  try {
    if (USE_LOCAL || USE_DRIVE) {
      await ensureBackupDir();
    }

    // Acquire lock to prevent overlapping runs
    const locked = await acquireLock();
    if (!locked) {
      log.warn('Another backup is in progress (lock present). Skipping this run.');
      return false;
    }

    await writeState({ lastAttempt: new Date().toISOString(), lastError: null });

    const payload = await buildBackupPayload();

    let localResult = null;
    let uploadResult = null;

    // If we need a file for upload or to keep locally, write it
    if (USE_LOCAL || USE_DRIVE) {
      localResult = await writeLocalBackup(payload);
    }

    if (USE_DRIVE && localResult) {
      uploadResult = await uploadToDrive(localResult.filePath, localResult.filename);
      // If strategy is drive-only and upload happened, remove local file to honor strategy
      if (!USE_LOCAL && uploadResult) {
        try {
          await fsp.unlink(localResult.filePath);
          log.info(`Removed local file after Drive upload: ${localResult.filename}`);
        } catch (e) {
          log.warn('Failed to remove local temp file:', e.message);
        }
      }
    }

    if (uploadResult) {
      log.info(`Uploaded ${uploadResult.name} (${uploadResult.id})`);
    } else if (localResult && USE_LOCAL) {
      log.info(`Created local backup ${localResult.filename} (${localResult.bytes} bytes)`);
    } else {
      log.warn('No backup destination executed. Check BACKUP_STRATEGY.');
    }

    const ms = Date.now() - started;
    log.info(`Backup finished successfully in ${ms}ms`);

    await writeState({
      lastSuccess: new Date().toISOString(),
      lastFile: localResult ? localResult.filename : null,
      lastError: null
    });

    return true;
  } catch (err) {
    const ms = Date.now() - started;
    log.error('Backup failed after', ms, 'ms');
    log.error('Error:', err && (err.stack || err.message || err));
    try {
      await writeState({ lastError: err && (err.message || String(err)) });
    } catch (_) {}
    return false;
  } finally {
    await releaseLock();
  }
}

let scheduled = null;
async function maybeCatchupAtStartup() {
  try {
    await ensureBackupDir();
    // Clean up stale lock if present
    const now = Date.now();
    try {
      const stat = await fsp.stat(LOCK_FILE);
      const age = now - stat.mtimeMs;
      if (age > LOCK_STALE_MS) {
        log.warn('Removing stale backup lock at startup');
        await fsp.unlink(LOCK_FILE).catch(() => {});
      }
    } catch (_) {
      // no lock
    }

    const state = await readState();
    const lastSuccessTs = state.lastSuccess ? Date.parse(state.lastSuccess) : null;

    if (!lastSuccessTs) {
      log.info('No previous successful backup recorded - running initial backup now');
      await performBackup();
      return;
    }

    const sinceMs = Date.now() - lastSuccessTs;
    const missed = Math.floor((sinceMs - STARTUP_CATCHUP_GRACE_MS) / BACKUP_INTERVAL_MS);

    if (sinceMs >= Math.max(STARTUP_CATCHUP_GRACE_MS, BACKUP_INTERVAL_MS)) {
      log.warn(`Detected missed backup window(s): ~${Math.max(0, missed)} interval(s) since last success. Running catch-up now.`);
      await performBackup();
    } else if (sinceMs >= STARTUP_CATCHUP_GRACE_MS) {
      // Last success is a bit old but within first interval; run once to be safe
      log.info('Running startup backup due to grace window threshold');
      await performBackup();
    } else {
      log.info('Recent backup exists - skipping immediate startup run');
    }
  } catch (e) {
    log.warn('Startup catch-up check failed:', e.message);
    // Fallback to running once to ensure coverage
    await performBackup();
  }
}

function startSchedule() {
  if (scheduled) return scheduled;
  log.info('Starting cron schedule: 0 */6 * * * (every 6 hours at minute 0)');
  // At minute 0, every 6th hour
  scheduled = cron.schedule('0 */6 * * *', () => {
    log.info('Cron trigger fired');
    performBackup();
  });
  // Run once on startup with catch-up logic
  maybeCatchupAtStartup();
  log.info('Schedule started: every 6 hours');
  return scheduled;
}

module.exports = { performBackup, startSchedule };
