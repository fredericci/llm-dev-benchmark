// Tests that should pass once the circular dependency is fixed
const { formatError, sleep, retry } = require('./utils');

describe('utils module', () => {
  test('formatError returns message and timestamp', () => {
    const err = new Error('something broke');
    const result = formatError(err);
    expect(result.message).toBe('something broke');
    expect(result.timestamp).toBeDefined();
    expect(new Date(result.timestamp).getTime()).not.toBeNaN();
  });

  test('sleep resolves after delay', async () => {
    const start = Date.now();
    await sleep(50);
    expect(Date.now() - start).toBeGreaterThanOrEqual(40);
  });

  test('retry calls fn and returns on success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await retry(fn, 3);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('retry retries on failure and eventually throws', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fail'));
    await expect(retry(fn, 2)).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});
