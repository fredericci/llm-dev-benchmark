// CI failure scenario: utils.js with a circular dependency
// utils.js imports from config.js which imports from utils.js

// This is the BUGGY utils.js that causes circular import
const { getDefaultTimeout } = require('./config'); // circular!

function formatError(err) {
  return { message: err.message, timestamp: new Date().toISOString() };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retry(fn, times = getDefaultTimeout()) {
  return fn().catch((err) => {
    if (times <= 0) throw err;
    return retry(fn, times - 1);
  });
}

module.exports = { formatError, sleep, retry };
