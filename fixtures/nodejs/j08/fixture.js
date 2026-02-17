// HTTP client using axios 0.27 patterns
// The model must migrate this to axios 1.x

const axios = require('axios');

const client = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
});

// Old-style request interceptor (axios 0.27 pattern)
client.interceptors.request.use(
  (config) => {
    config.headers['Authorization'] = `Bearer ${process.env.API_TOKEN}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Old-style response interceptor
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // axios 0.27 style: error.response may be undefined
    if (error.response) {
      console.error('Request failed:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    return Promise.reject(error);
  }
);

async function getUser(userId) {
  try {
    const response = await client.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

async function createUser(userData) {
  const response = await client.post('/users', userData);
  return response.data;
}

async function updateUser(userId, userData) {
  const response = await client.put(`/users/${userId}`, userData);
  return response.data;
}

module.exports = { getUser, createUser, updateUser };
