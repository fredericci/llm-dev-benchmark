// E-commerce API with 5 planted security vulnerabilities
// The model must find ALL of them

const express = require('express');
const jwt = require('jsonwebtoken');
const sqlite3 = require('better-sqlite3');

const app = express();
app.use(express.json());

const db = new sqlite3(':memory:');
db.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, role TEXT, password TEXT)`);
db.exec(`CREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER, amount REAL)`);

// VULNERABILITY 1: Hardcoded API secret
const API_SECRET = 'super-secret-key-hardcoded-12345';

// Auth middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  // VULNERABILITY 2: JWT decoded without verifying expiration
  const decoded = jwt.decode(token); // should be jwt.verify()
  if (!decoded) return res.status(401).json({ error: 'Invalid token' });
  req.user = decoded;
  next();
}

// Get user orders
app.get('/users/:id/orders', authenticate, (req, res) => {
  const userId = req.params.id;

  // VULNERABILITY 3: SQL injection via string concatenation
  const orders = db.prepare(`SELECT * FROM orders WHERE user_id = '${userId}'`).all();
  res.json(orders);
});

// Search users
app.get('/users/search', authenticate, (req, res) => {
  const { email } = req.query;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (user) {
    // VULNERABILITY 4: PII logged in plaintext
    console.log(`User login: email=${user.email}, password=${user.password}, role=${user.role}`);
  }
  res.json(user || null);
});

// VULNERABILITY 5: Admin endpoint with no authentication check
app.delete('/admin/users/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ deleted: id });
});

module.exports = { app };
