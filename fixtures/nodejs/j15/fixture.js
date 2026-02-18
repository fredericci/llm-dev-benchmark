// PR diff with 4 planted problems for the model to find
// Problem 1: Missing error handling in async
// Problem 2: Query without index (full table scan)
// Problem 3: Secret logged
// Problem 4: Missing null check

const DIFF = `
diff --git a/src/services/payment.js b/src/services/payment.js
index a1b2c3d..e4f5g6h 100644
--- a/src/services/payment.js
+++ b/src/services/payment.js
@@ -1,8 +1,42 @@
+const stripe = require('stripe')(process.env.STRIPE_KEY);
+const db = require('../db');
+const logger = require('../logger');
+
+// PROBLEM 3: Secret logged — STRIPE_KEY value written to logs
+logger.info('Payment service initialized with key: ' + process.env.STRIPE_KEY);
+
 async function processPayment(userId, amount, currency = 'usd') {
-  // old implementation
+  // PROBLEM 1: No try/catch — unhandled promise rejection if Stripe fails
+  const charge = await stripe.charges.create({
+    amount: Math.round(amount * 100),
+    currency,
+    customer: userId,
+  });
+
+  await db.query(
+    'INSERT INTO payments (user_id, charge_id, amount, status) VALUES (?, ?, ?, ?)',
+    [userId, charge.id, amount, charge.status]
+  );
+
+  return charge;
 }

+async function getPaymentHistory(userId) {
+  // PROBLEM 2: No index on user_id column — full table scan on large payments table
+  const payments = await db.query(
+    'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC',
+    [userId]
+  );
+  return payments;
+}

+async function refundPayment(chargeId) {
+  const payment = await db.query('SELECT * FROM payments WHERE charge_id = ?', [chargeId]);
+
+  // PROBLEM 4: Missing null check — payment[0] could be undefined if not found
+  const originalAmount = payment[0].amount;
+
+  const refund = await stripe.refunds.create({
+    charge: chargeId,
+    amount: Math.round(originalAmount * 100),
+  });
+
+  return refund;
+}

+module.exports = { processPayment, getPaymentHistory, refundPayment };
diff --git a/src/routes/payment.js b/src/routes/payment.js
index 1234567..abcdefg 100644
--- a/src/routes/payment.js
+++ b/src/routes/payment.js
@@ -0,0 +1,20 @@
+const express = require('express');
+const router = express.Router();
+const { processPayment, getPaymentHistory, refundPayment } = require('../services/payment');
+const { authMiddleware } = require('../middleware/auth');
+
+router.post('/charge', authMiddleware, async (req, res) => {
+  const result = await processPayment(req.user.id, req.body.amount, req.body.currency);
+  res.json(result);
+});
+
+router.get('/history', authMiddleware, async (req, res) => {
+  const history = await getPaymentHistory(req.user.id);
+  res.json(history);
+});
+
+router.post('/refund/:chargeId', authMiddleware, async (req, res) => {
+  const refund = await refundPayment(req.params.chargeId);
+  res.json(refund);
+});
+
+module.exports = router;
`;

module.exports = DIFF;
