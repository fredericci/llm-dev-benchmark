const { incrementCounter, getCounter, resetCounter } = require('./counter');

const CONCURRENCY = 20;
const INCREMENTS_PER_WORKER = 100;
const EXPECTED_TOTAL = CONCURRENCY * INCREMENTS_PER_WORKER;

describe('Counter - Race Condition Fix', () => {
  beforeEach(async () => {
    await resetCounter();
  });

  test('reaches correct count under concurrent access (run 1)', async () => {
    const workers = Array.from({ length: CONCURRENCY }, () =>
      incrementCounter(INCREMENTS_PER_WORKER)
    );
    await Promise.all(workers);
    const count = await getCounter();
    expect(count).toBe(EXPECTED_TOTAL);
  });

  test('reaches correct count under concurrent access (run 2)', async () => {
    await resetCounter();
    const workers = Array.from({ length: CONCURRENCY }, () =>
      incrementCounter(INCREMENTS_PER_WORKER)
    );
    await Promise.all(workers);
    const count = await getCounter();
    expect(count).toBe(EXPECTED_TOTAL);
  });

  test('reaches correct count under concurrent access (run 3)', async () => {
    await resetCounter();
    const workers = Array.from({ length: CONCURRENCY }, () =>
      incrementCounter(INCREMENTS_PER_WORKER)
    );
    await Promise.all(workers);
    const count = await getCounter();
    expect(count).toBe(EXPECTED_TOTAL);
  });

  test('single-threaded increment still works', async () => {
    await incrementCounter(5);
    const count = await getCounter();
    expect(count).toBe(5);
  });
});
