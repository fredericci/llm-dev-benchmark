// God class with all code smells -- the model must refactor this
// Smells: god class, magic numbers, duplicated logic, deep nesting, long methods

public class OrderItem
{
    public double Price { get; set; }
    public int Quantity { get; set; }
}

public class Customer
{
    public string Type { get; set; } = "standard";
    public string? Email { get; set; }
}

public class Order
{
    public string Id { get; set; } = "";
    public Customer Customer { get; set; } = new();
    public List<OrderItem> Items { get; set; } = new();
    public string PaymentMethod { get; set; } = "cash";
    public double Shipping { get; set; }
    public double Total { get; set; }
    public string Status { get; set; } = "pending";
    public string? CancellationReason { get; set; }
    public double RefundAmount { get; set; }
}

public class InventoryItem
{
    public string Id { get; set; } = "";
    public int Quantity { get; set; }
}

public class EmailMessage
{
    public string To { get; set; } = "";
    public string Subject { get; set; } = "";
    public string Body { get; set; } = "";
}

public interface IMailer
{
    void Send(EmailMessage message);
}

public interface ILogger
{
    void Log(string message);
}

public class OrderProcessor
{
    private readonly object _db;
    private readonly IMailer _mailer;
    private readonly ILogger _logger;
    public List<Order> Orders { get; set; } = new();
    public List<Customer> Customers { get; set; } = new();
    public List<InventoryItem> Inventory { get; set; } = new();
    public List<object> Discounts { get; set; } = new();
    public List<object> Payments { get; set; } = new();
    public List<object> Shipments { get; set; } = new();

    public OrderProcessor(object db, IMailer mailer, ILogger logger)
    {
        _db = db;
        _mailer = mailer;
        _logger = logger;
    }

    public Order ProcessOrder(Order order)
    {
        double discount = 0;
        if (order.Items.Count > 10)
        {
            if (order.Customer.Type == "vip")
            {
                discount = 0.25;
            }
            else
            {
                discount = 0.1;
            }
        }
        else
        {
            if (order.Customer.Type == "vip")
            {
                discount = 0.15;
            }
            else
            {
                discount = 0;
            }
        }

        double total = 0;
        for (int i = 0; i < order.Items.Count; i++)
        {
            var item = order.Items[i];
            if (item.Quantity > 0)
            {
                if (item.Price > 0)
                {
                    total += item.Price * item.Quantity;
                }
            }
        }
        total = total - (total * discount);

        if (total > 1000)
        {
            order.Shipping = 0;
        }
        else if (total > 500)
        {
            order.Shipping = 9.99;
        }
        else
        {
            order.Shipping = 19.99;
        }
        total += order.Shipping;

        if (order.PaymentMethod == "credit_card")
        {
            var fee = total * 0.029 + 0.30;
            total += fee;
        }
        else if (order.PaymentMethod == "paypal")
        {
            var fee = total * 0.034 + 0.30;
            total += fee;
        }

        order.Total = total;
        order.Status = "processed";
        Orders.Add(order);

        // Send confirmation email (duplicated logic below in SendOrderUpdate)
        if (order.Customer.Email != null)
        {
            _mailer.Send(new EmailMessage
            {
                To = order.Customer.Email,
                Subject = "Order Confirmation",
                Body = $"Your order total is ${total:F2}"
            });
        }

        _logger.Log($"Order processed: {order.Id}");
        return order;
    }

    public bool CancelOrder(string orderId, string reason)
    {
        var order = Orders.FirstOrDefault(o => o.Id == orderId);
        if (order != null)
        {
            if (order.Status != "shipped")
            {
                if (order.Status != "delivered")
                {
                    order.Status = "cancelled";
                    order.CancellationReason = reason;

                    // Duplicated email sending logic
                    if (order.Customer.Email != null)
                    {
                        _mailer.Send(new EmailMessage
                        {
                            To = order.Customer.Email,
                            Subject = "Order Cancelled",
                            Body = $"Your order has been cancelled. Reason: {reason}"
                        });
                    }

                    double refundAmount = order.Total;
                    if (order.PaymentMethod == "credit_card")
                    {
                        refundAmount -= 0.30;
                    }
                    order.RefundAmount = refundAmount;
                    _logger.Log($"Order cancelled: {orderId}");
                    return true;
                }
            }
        }
        return false;
    }

    public bool SendOrderUpdate(string orderId, string updateType)
    {
        var order = Orders.FirstOrDefault(o => o.Id == orderId);
        if (order != null)
        {
            // Duplicated email sending logic (third time)
            if (order.Customer.Email != null)
            {
                _mailer.Send(new EmailMessage
                {
                    To = order.Customer.Email,
                    Subject = $"Order {updateType}",
                    Body = $"Your order status: {updateType}"
                });
            }
            return true;
        }
        return false;
    }

    public string GetInventoryStatus(string productId)
    {
        var item = Inventory.FirstOrDefault(i => i.Id == productId);
        if (item != null)
        {
            if (item.Quantity > 100)
            {
                return "in_stock";
            }
            else if (item.Quantity > 10)
            {
                return "low_stock";
            }
            else if (item.Quantity > 0)
            {
                return "critical_stock";
            }
            else
            {
                return "out_of_stock";
            }
        }
        return "unknown";
    }
}
