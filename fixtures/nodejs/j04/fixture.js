/**
 * Calculate discount for an order.
 *
 * Rules:
 * - quantity > 50 items: 15% base discount
 * - quantity > 10 items: 5% base discount
 * - VIP customer: additional +10% on top of base discount
 * - Maximum total discount: 30%
 *
 * @param {number} quantity - Number of items ordered
 * @param {boolean} isVip - Whether the customer is VIP
 * @returns {number} Discount as a decimal (e.g., 0.15 = 15%)
 */
function calculateDiscount(quantity, isVip) {
  if (typeof quantity !== 'number' || isNaN(quantity)) {
    throw new TypeError('quantity must be a number');
  }
  if (quantity < 0) {
    throw new RangeError('quantity cannot be negative');
  }

  let discount = 0;

  if (quantity > 50) {
    discount = 0.15;
  } else if (quantity > 10) {
    discount = 0.05;
  }

  if (isVip) {
    discount += 0.10;
  }

  return Math.min(discount, 0.30);
}

module.exports = { calculateDiscount };
