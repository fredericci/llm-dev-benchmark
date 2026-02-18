const request = require('supertest');
const { app } = require('./users');

describe('POST /users', () => {
  test('creates user with valid data and returns 201', async () => {
    const res = await request(app).post('/users').send({
      name: 'Charlie Brown',
      email: 'charlie@example.com',
      password: 'Password1',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Charlie Brown');
    expect(res.body.email).toBe('charlie@example.com');
  });

  test('does not return password in response', async () => {
    const res = await request(app).post('/users').send({
      name: 'Dave Example',
      email: 'dave@example.com',
      password: 'Secure123',
    });
    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('password');
  });

  test('returns 400 when name is missing', async () => {
    const res = await request(app).post('/users').send({
      email: 'missing@example.com',
      password: 'Password1',
    });
    expect(res.status).toBe(400);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('returns 400 when name is too short (1 char)', async () => {
    const res = await request(app).post('/users').send({
      name: 'A',
      email: 'short@example.com',
      password: 'Password1',
    });
    expect(res.status).toBe(400);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('returns 400 when email is invalid format', async () => {
    const res = await request(app).post('/users').send({
      name: 'Valid Name',
      email: 'not-an-email',
      password: 'Password1',
    });
    expect(res.status).toBe(400);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('returns 400 when password is too short', async () => {
    const res = await request(app).post('/users').send({
      name: 'Valid Name',
      email: 'valid@example.com',
      password: 'abc',
    });
    expect(res.status).toBe(400);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('returns 400 when password has no uppercase letter', async () => {
    const res = await request(app).post('/users').send({
      name: 'Valid Name',
      email: 'valid2@example.com',
      password: 'password1',
    });
    expect(res.status).toBe(400);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('returns 409 when email already exists', async () => {
    const res = await request(app).post('/users').send({
      name: 'Alice Copy',
      email: 'alice@example.com',
      password: 'Password1',
    });
    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toMatch(/already exists/i);
  });
});
