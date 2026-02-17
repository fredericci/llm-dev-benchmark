// Shared counter with race condition — no mutex/lock
// Multiple concurrent async operations increment without coordination

let sharedCounter = 0;

async function incrementCounter(times) {
  for (let i = 0; i < times; i++) {
    // Race condition: read-modify-write is not atomic
    const current = sharedCounter;
    await new Promise((resolve) => setImmediate(resolve)); // yield to event loop
    sharedCounter = current + 1;
  }
}

async function getCounter() {
  return sharedCounter;
}

async function resetCounter() {
  sharedCounter = 0;
}

module.exports = { incrementCounter, getCounter, resetCounter };
