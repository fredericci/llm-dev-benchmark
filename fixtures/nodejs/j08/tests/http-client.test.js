// Tests for the migrated axios 1.x client
// We mock axios to avoid real HTTP calls

jest.mock('axios', () => {
  const mockAxios = {
    create: jest.fn(() => mockAxios),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    defaults: { headers: { common: {} } },
  };
  return { default: mockAxios, ...mockAxios };
});

const axios = require('axios');

describe('HTTP Client - axios 1.x migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('module exports required functions', () => {
    const client = require('./http-client');
    expect(typeof client.getUser).toBe('function');
    expect(typeof client.createUser).toBe('function');
    expect(typeof client.updateUser).toBe('function');
  });

  test('getUser calls correct endpoint', async () => {
    axios.get.mockResolvedValue({ data: { id: 1, name: 'Alice' } });
    const { getUser } = require('./http-client');
    const user = await getUser(1);
    expect(axios.get).toHaveBeenCalledWith('/users/1');
    expect(user).toEqual({ id: 1, name: 'Alice' });
  });

  test('createUser calls correct endpoint with data', async () => {
    const userData = { name: 'Bob', email: 'bob@test.com' };
    axios.post.mockResolvedValue({ data: { id: 2, ...userData } });
    const { createUser } = require('./http-client');
    const result = await createUser(userData);
    expect(axios.post).toHaveBeenCalledWith('/users', userData);
    expect(result.id).toBe(2);
  });

  test('getUser returns null for 404', async () => {
    const error = { response: { status: 404 } };
    axios.get.mockRejectedValue(error);
    const { getUser } = require('./http-client');
    const result = await getUser(999);
    expect(result).toBeNull();
  });

  test('interceptors are registered', () => {
    require('./http-client');
    expect(axios.interceptors.request.use).toHaveBeenCalled();
    expect(axios.interceptors.response.use).toHaveBeenCalled();
  });
});
