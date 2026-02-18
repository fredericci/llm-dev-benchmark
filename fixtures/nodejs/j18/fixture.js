// Slow query log and application code for performance diagnosis

const SLOW_QUERY_LOG = `
# Time: 2026-02-17T09:12:31Z  Query_time: 2.847  Rows_examined: 892341
SELECT * FROM orders WHERE customer_email LIKE '%@gmail.com' ORDER BY created_at DESC;
-- No index on customer_email; full table scan on 892k rows

# Time: 2026-02-17T09:14:22Z  Query_time: 1.923  Rows_examined: 892341
SELECT o.*, u.name, u.email FROM orders o JOIN users u ON o.user_id = u.id
WHERE o.status = 'pending' ORDER BY o.created_at;
-- No index on (status, created_at); filesort on 892k rows

# Time: 2026-02-17T09:15:01Z  Query_time: 0.734  Rows_examined: 45000
SELECT * FROM order_items WHERE order_id = ?;
-- Called in a loop (N+1 pattern) — this query runs 45k times per minute

# Time: 2026-02-17T09:17:45Z  Query_time: 0.621  Rows_examined: 112000
SELECT * FROM products WHERE category_id = ? AND deleted_at IS NULL;
-- Missing composite index on (category_id, deleted_at)
`;

// Application code with connection pool not configured + N+1 in loop
const appCode = `
const { Pool } = require('pg');

// Bug: pool created without size config — defaults to max=10 connections
// Under load, 98/100 pool connections are exhausted
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  // Missing: max, idleTimeoutMillis, connectionTimeoutMillis
});

async function getOrdersWithItems() {
  const { rows: orders } = await pool.query('SELECT * FROM orders WHERE status = $1', ['pending']);

  // N+1: fetches items for each order in a loop
  const result = [];
  for (const order of orders) {
    const { rows: items } = await pool.query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [order.id]
    );
    result.push({ ...order, items });
  }
  return result;
}
`;

module.exports = SLOW_QUERY_LOG + '\n\n// APPLICATION CODE:\n' + appCode;
