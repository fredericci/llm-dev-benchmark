// Supporting types for j02 tests
// The model writes OrderProcessor.cs with the OrderProcessor class implementation

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
