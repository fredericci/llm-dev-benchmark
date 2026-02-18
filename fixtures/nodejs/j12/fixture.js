// Synthetic e-commerce codebase for explanation task
// Condensed representation of ~40 files

// === server.js ===
// const express = require('express');
// const authRoutes = require('./routes/auth');
// const productRoutes = require('./routes/products');
// const cartRoutes = require('./routes/cart');
// const checkoutRoutes = require('./routes/checkout');
// app.use('/api/auth', authRoutes);
// app.use('/api/products', productRoutes);
// app.use('/api/cart', cartMiddleware, cartRoutes);
// app.use('/api/checkout', authMiddleware, cartMiddleware, checkoutRoutes);

// === middleware/auth.js ===
// Verifies JWT token from Authorization header
// Sets req.user = { id, email, role } if valid
// Returns 401 if token missing or expired
// const jwt = require('jsonwebtoken');
// function authMiddleware(req, res, next) {
//   const token = req.headers.authorization?.split(' ')[1];
//   if (!token) return res.status(401).json({ error: 'No token' });
//   try {
//     req.user = jwt.verify(token, process.env.JWT_SECRET);
//     next();
//   } catch { res.status(401).json({ error: 'Invalid token' }); }
// }

// === routes/auth.js ===
// POST /api/auth/register — creates user, returns JWT
// POST /api/auth/login — validates credentials, returns JWT
// POST /api/auth/refresh — accepts refresh token, returns new access token
// Passwords hashed with bcrypt (rounds=12)
// JWT expiry: 1h access, 7d refresh

// === routes/products.js ===
// GET /api/products — list with pagination (?page=1&limit=20)
// GET /api/products/:id — single product
// POST /api/products — admin only (role check in route)
// PATCH /api/products/:id — admin only
// DELETE /api/products/:id — admin only (soft delete, sets deleted_at)
// No caching implemented — direct DB queries on every request (TECH DEBT)

// === routes/cart.js ===
// Cart stored in Redis with key cart:{userId}
// GET /api/cart — returns current cart items
// POST /api/cart/items — add item (checks inventory)
// DELETE /api/cart/items/:productId — remove item
// Inventory not reserved during cart session — race condition possible (TECH DEBT)

// === routes/checkout.js ===
// POST /api/checkout — processes cart into order
// Validates inventory at checkout time
// Creates Order + OrderItems in a DB transaction
// Calls external payment processor (Stripe)
// Sends confirmation email (no retry on failure — TECH DEBT)

// === models/User.js ===
// id, email (unique), passwordHash, role (user|admin), createdAt, lastLogin
// Sequelize model, PostgreSQL backend

// === models/Product.js ===
// id, name, description, price, stock, categoryId, deletedAt (soft delete)
// No database indexes on categoryId or price (TECH DEBT)

// === models/Order.js ===
// id, userId, status (pending|paid|shipped|delivered|cancelled), total, createdAt
// hasMany OrderItems

// === models/OrderItem.js ===
// id, orderId, productId, quantity, unitPrice (snapshot at purchase time)

// === services/PaymentService.js ===
// Wraps Stripe API
// createCharge(amount, currency, source) — returns { chargeId, status }
// No idempotency keys implemented (TECH DEBT — duplicate charges possible)

// === config/database.js ===
// PostgreSQL via Sequelize
// Connection pool: min=2, max=10 (hardcoded, not configurable via env)

// === config/redis.js ===
// Redis client for cart storage
// No connection error handling — app crashes if Redis unavailable

module.exports = {}; // placeholder for the condensed codebase representation
