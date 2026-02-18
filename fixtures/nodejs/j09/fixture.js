// Order service with bug: missing null check after async lookup
// This causes TypeError: Cannot read properties of undefined (reading 'id')

const express = require('express');
const app = express();
app.use(express.json());

// Simulated async database
const productDb = {
  'prod-1': { id: 'prod-1', name: 'Widget', price: 29.99, stock: 100 },
  'prod-2': { id: 'prod-2', name: 'Gadget', price: 49.99, stock: 5 },
};

async function findProduct(productId) {
  // Returns undefined if product not found
  return productDb[productId];
}

async function processOrder(order) {
  const product = await findProduct(order.productId);

  // BUG: No null check — crashes with TypeError when product is not found
  const orderTotal = product.price * order.quantity;

  return {
    orderId: `ORD-${Date.now()}`,
    productId: product.id,
    productName: product.name,
    quantity: order.quantity,
    total: orderTotal,
    status: 'confirmed',
  };
}

app.post('/orders', async (req, res) => {
  try {
    const result = await processOrder(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { app, processOrder, findProduct };
