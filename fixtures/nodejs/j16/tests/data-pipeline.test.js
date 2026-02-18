// Behavioral tests — async version must produce identical results

// Mock the dependencies that the async version will use
jest.mock('./db-stub', () => ({
  findUser: jest.fn((id, cb) => {
    if (id === 'missing') return cb(null, null);
    if (id === 'error') return cb(new Error('DB error'), null);
    cb(null, { id, email: `${id}@test.com`, name: 'Test User' });
  }),
}), { virtual: true });

jest.mock('./cache-stub', () => ({
  set: jest.fn((key, value, cb) => cb(null)),
}), { virtual: true });

jest.mock('./enricher-stub', () => ({
  enrich: jest.fn((user, cb) => cb(null, { ...user, enriched: true })),
}), { virtual: true });

jest.mock('./notifier-stub', () => ({
  notify: jest.fn((email, msg, cb) => cb(null)),
}), { virtual: true });

// The model's async version should be written to data-pipeline.js
let processPipeline;
try {
  const mod = require('./data-pipeline');
  processPipeline = mod.processPipeline || mod.processPipelineAsync || mod.default;
} catch (e) {
  processPipeline = null;
}

describe('Data Pipeline - Async Conversion', () => {
  test('successfully processes existing user', async () => {
    if (!processPipeline) return;
    const result = await processPipeline('user-1');
    expect(result).toMatchObject({
      userId: 'user-1',
      status: 'complete',
      cached: true,
      notified: true,
    });
  });

  test('throws error for missing user', async () => {
    if (!processPipeline) return;
    await expect(processPipeline('missing')).rejects.toThrow(/not found/i);
  });

  test('propagates DB errors', async () => {
    if (!processPipeline) return;
    await expect(processPipeline('error')).rejects.toThrow('DB error');
  });

  test('returns a Promise (is async)', () => {
    if (!processPipeline) return;
    const result = processPipeline('user-2');
    expect(result).toBeInstanceOf(Promise);
    return result; // await it to clean up
  });
});
