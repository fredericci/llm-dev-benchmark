// N+1 query example using Sequelize-like ORM pattern
// This causes 1 + N (items) + N (customer) queries for N orders

const express = require('express');
const app = express();

// Simulated ORM with query counter
let queryCount = 0;

const db = {
  resetQueryCount() { queryCount = 0; },
  getQueryCount() { return queryCount; },

  async findAllOrders() {
    queryCount++;
    return [
      { id: 1, customerId: 1, status: 'shipped' },
      { id: 2, customerId: 2, status: 'pending' },
      { id: 3, customerId: 1, status: 'delivered' },
    ];
  },

  async findItemsByOrderId(orderId) {
    queryCount++; // N+1: one query per order
    const itemsMap = {
      1: [{ id: 1, name: 'Widget', qty: 2, price: 10 }],
      2: [{ id: 2, name: 'Gadget', qty: 1, price: 25 }, { id: 3, name: 'Doohickey', qty: 3, price: 5 }],
      3: [{ id: 4, name: 'Widget', qty: 1, price: 10 }],
    };
    return itemsMap[orderId] || [];
  },

  async findCustomerById(customerId) {
    queryCount++; // N+1: one query per order for customer
    const customers = {
      1: { id: 1, name: 'Alice', email: 'alice@example.com' },
      2: { id: 2, name: 'Bob', email: 'bob@example.com' },
    };
    return customers[customerId];
  },

  async findAllOrdersWithItemsAndCustomers() {
    queryCount++; // Optimized: single join query
    return [
      {
        id: 1, customerId: 1, status: 'shipped',
        customer: { id: 1, name: 'Alice', email: 'alice@example.com' },
        items: [{ id: 1, name: 'Widget', qty: 2, price: 10 }],
      },
      {
        id: 2, customerId: 2, status: 'pending',
        customer: { id: 2, name: 'Bob', email: 'bob@example.com' },
        items: [
          { id: 2, name: 'Gadget', qty: 1, price: 25 },
          { id: 3, name: 'Doohickey', qty: 3, price: 5 },
        ],
      },
      {
        id: 3, customerId: 1, status: 'delivered',
        customer: { id: 1, name: 'Alice', email: 'alice@example.com' },
        items: [{ id: 4, name: 'Widget', qty: 1, price: 10 }],
      },
    ];
  },
};

// N+1 problem: fetches orders, then for each order fetches items and customer separately
app.get('/orders', async (req, res) => {
  const orders = await db.findAllOrders();

  const enrichedOrders = await Promise.all(
    orders.map(async (order) => {
      const items = await db.findItemsByOrderId(order.id);       // N queries
      const customer = await db.findCustomerById(order.customerId); // N queries
      return { ...order, items, customer };
    })
  );

  res.json(enrichedOrders);
});

module.exports = { app, db };
