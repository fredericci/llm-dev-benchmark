const request = require('supertest');
const { app, processOrder } = require('./order-service');

describe('Order Service - Null check regression', () => {
  test('successfully creates order for existing product', async () => {
    const res = await request(app).post('/orders').send({
      productId: 'prod-1',
      quantity: 2,
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('orderId');
    expect(res.body.total).toBe(59.98);
  });

  test('returns 404 or 400 for non-existent product (not 500)', async () => {
    const res = await request(app).post('/orders').send({
      productId: 'non-existent-product',
      quantity: 1,
    });
    expect(res.status).not.toBe(500);
    expect([400, 404]).toContain(res.status);
  });

  test('processOrder throws descriptive error for missing product', async () => {
    await expect(processOrder({ productId: 'does-not-exist', quantity: 1 }))
      .rejects.toThrow(/not found|does not exist|product/i);
  });

  test('processOrder returns correct total', async () => {
    const result = await processOrder({ productId: 'prod-2', quantity: 3 });
    expect(result.total).toBe(149.97);
    expect(result.status).toBe('confirmed');
  });
});
