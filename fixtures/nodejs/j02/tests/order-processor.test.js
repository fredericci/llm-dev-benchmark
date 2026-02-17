// Behavior tests — the refactored code must produce identical observable results
const { OrderProcessor } = require('./order-processor');

const makeMocks = () => ({
  db: {},
  mailer: { send: jest.fn() },
  logger: { log: jest.fn() },
});

describe('OrderProcessor behavior preservation', () => {
  test('calculates correct total for standard customer with few items', () => {
    const { mailer, logger } = makeMocks();
    const processor = new OrderProcessor({}, mailer, logger);
    const order = {
      id: '1',
      customer: { type: 'standard', email: 'test@test.com' },
      items: [{ price: 100, quantity: 2 }],
      paymentMethod: 'cash',
    };
    const result = processor.processOrder(order);
    expect(result.total).toBeCloseTo(200 + 19.99, 1); // no discount, low shipping
  });

  test('applies 10% discount for standard customer with >10 items', () => {
    const { mailer, logger } = makeMocks();
    const processor = new OrderProcessor({}, mailer, logger);
    const items = Array(11).fill({ price: 10, quantity: 1 });
    const order = {
      id: '2',
      customer: { type: 'standard', email: 'test@test.com' },
      items,
      paymentMethod: 'cash',
    };
    const result = processor.processOrder(order);
    const expectedSubtotal = 110 * 0.9;
    expect(result.total).toBeCloseTo(expectedSubtotal + 19.99, 1);
  });

  test('applies 15% discount for VIP customer with few items', () => {
    const { mailer, logger } = makeMocks();
    const processor = new OrderProcessor({}, mailer, logger);
    const order = {
      id: '3',
      customer: { type: 'vip', email: 'vip@test.com' },
      items: [{ price: 200, quantity: 1 }],
      paymentMethod: 'cash',
    };
    const result = processor.processOrder(order);
    expect(result.total).toBeCloseTo(200 * 0.85 + 19.99, 1);
  });

  test('sends confirmation email when processing order', () => {
    const { mailer, logger } = makeMocks();
    const processor = new OrderProcessor({}, mailer, logger);
    const order = {
      id: '4',
      customer: { type: 'standard', email: 'notify@test.com' },
      items: [{ price: 50, quantity: 1 }],
      paymentMethod: 'cash',
    };
    processor.processOrder(order);
    expect(mailer.send).toHaveBeenCalledWith(expect.objectContaining({
      to: 'notify@test.com',
      subject: 'Order Confirmation',
    }));
  });

  test('cancels non-shipped order and sends email', () => {
    const { mailer, logger } = makeMocks();
    const processor = new OrderProcessor({}, mailer, logger);
    const order = {
      id: '5',
      customer: { type: 'standard', email: 'cancel@test.com' },
      items: [{ price: 50, quantity: 1 }],
      paymentMethod: 'cash',
    };
    processor.processOrder(order);
    const cancelled = processor.cancelOrder('5', 'Changed mind');
    expect(cancelled).toBe(true);
    expect(mailer.send).toHaveBeenCalledWith(expect.objectContaining({
      subject: 'Order Cancelled',
    }));
  });

  test('cannot cancel shipped order', () => {
    const { mailer, logger } = makeMocks();
    const processor = new OrderProcessor({}, mailer, logger);
    const order = {
      id: '6',
      status: 'shipped',
      customer: { type: 'standard', email: 'test@test.com' },
      items: [{ price: 50, quantity: 1 }],
      paymentMethod: 'cash',
      total: 69.99,
    };
    processor.orders.push(order);
    const cancelled = processor.cancelOrder('6', 'Too late');
    expect(cancelled).toBe(false);
  });

  test('returns out_of_stock for zero quantity inventory', () => {
    const { mailer, logger } = makeMocks();
    const processor = new OrderProcessor({}, mailer, logger);
    processor.inventory = [{ id: 'prod-1', quantity: 0 }];
    expect(processor.getInventoryStatus('prod-1')).toBe('out_of_stock');
  });

  test('adds credit card processing fee', () => {
    const { mailer, logger } = makeMocks();
    const processor = new OrderProcessor({}, mailer, logger);
    const order = {
      id: '7',
      customer: { type: 'standard', email: 'cc@test.com' },
      items: [{ price: 100, quantity: 1 }],
      paymentMethod: 'credit_card',
    };
    const result = processor.processOrder(order);
    const subtotal = 100 + 19.99;
    const fee = subtotal * 0.029 + 0.30;
    expect(result.total).toBeCloseTo(subtotal + fee, 1);
  });
});
