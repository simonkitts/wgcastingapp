// Simple logger with levels and optional categories. No timestamps in messages.
const levels = ['debug', 'info', 'warn', 'error'];

function resolveLevel(name) {
  const idx = levels.indexOf(String(name || '').toLowerCase());
  return idx === -1 ? 1 /* default info */ : idx;
}

const envLevel = resolveLevel(process.env.LOG_LEVEL);

function format(cat, msg, args) {
  const prefix = cat ? `[${cat}]` : '';
  return [prefix, msg, ...args];
}

function makeLogger(category) {
  return {
    debug: (...args) => {
      if (envLevel <= 0) console.debug(...format(category, args[0], args.slice(1)));
    },
    info: (...args) => {
      if (envLevel <= 1) console.log(...format(category, args[0], args.slice(1)));
    },
    warn: (...args) => {
      if (envLevel <= 2) console.warn(...format(category, args[0], args.slice(1)));
    },
    error: (...args) => {
      if (envLevel <= 3) console.error(...format(category, args[0], args.slice(1)));
    },
  };
}

module.exports = { makeLogger };

