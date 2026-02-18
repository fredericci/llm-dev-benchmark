/**
 * Calculate discount for an order.
 *
 * Rules:
 * - quantity > 50 items: 15% base discount
 * - quantity > 10 items: 5% base discount
 * - VIP customer: additional +10% on top of base discount
 * - Maximum total discount: 30%
 *
 * @param quantity Number of items ordered
 * @param isVip    Whether the customer is VIP
 * @return Discount as a decimal (e.g., 0.15 = 15%)
 * @throws IllegalArgumentException if quantity is negative
 */
public class CalculateDiscount {

    public static double calculateDiscount(int quantity, boolean isVip) {
        if (quantity < 0) {
            throw new IllegalArgumentException("quantity cannot be negative");
        }

        double discount = 0;

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
}
