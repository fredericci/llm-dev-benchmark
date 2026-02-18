/// <summary>
/// Calculate discount for an order.
///
/// Rules:
/// - quantity > 50 items: 15% base discount
/// - quantity > 10 items: 5% base discount
/// - VIP customer: additional +10% on top of base discount
/// - Maximum total discount: 30%
/// </summary>
public class CalculateDiscount
{
    /// <param name="quantity">Number of items ordered</param>
    /// <param name="isVip">Whether the customer is VIP</param>
    /// <returns>Discount as a decimal (e.g., 0.15 = 15%)</returns>
    /// <exception cref="ArgumentException">If quantity is not a valid number</exception>
    /// <exception cref="ArgumentOutOfRangeException">If quantity is negative</exception>
    public static double GetDiscount(int quantity, bool isVip)
    {
        if (quantity < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(quantity), "quantity cannot be negative");
        }

        double discount = 0;

        if (quantity > 50)
        {
            discount = 0.15;
        }
        else if (quantity > 10)
        {
            discount = 0.05;
        }

        if (isVip)
        {
            discount += 0.10;
        }

        return Math.Min(discount, 0.30);
    }
}
