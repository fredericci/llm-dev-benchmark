using Moq;
using Xunit;

public class OrderProcessorTests
{
    private Mock<IMailer> _mailer = null!;
    private Mock<ILogger> _logger = null!;

    private OrderProcessor CreateProcessor()
    {
        _mailer = new Mock<IMailer>();
        _logger = new Mock<ILogger>();
        return new OrderProcessor(new object(), _mailer.Object, _logger.Object);
    }

    [Fact]
    public void Calculates_correct_total_for_standard_customer_with_few_items()
    {
        var processor = CreateProcessor();
        var order = new Order
        {
            Id = "1",
            Customer = new Customer { Type = "standard", Email = "test@test.com" },
            Items = new List<OrderItem> { new() { Price = 100, Quantity = 2 } },
            PaymentMethod = "cash"
        };

        var result = processor.ProcessOrder(order);

        // no discount, low shipping: 200 + 19.99 = 219.99
        Assert.Equal(200 + 19.99, result.Total, 1);
    }

    [Fact]
    public void Applies_10_percent_discount_for_standard_customer_with_more_than_10_items()
    {
        var processor = CreateProcessor();
        var items = Enumerable.Range(0, 11)
            .Select(_ => new OrderItem { Price = 10, Quantity = 1 })
            .ToList();
        var order = new Order
        {
            Id = "2",
            Customer = new Customer { Type = "standard", Email = "test@test.com" },
            Items = items,
            PaymentMethod = "cash"
        };

        var result = processor.ProcessOrder(order);

        var expectedSubtotal = 110 * 0.9;
        Assert.Equal(expectedSubtotal + 19.99, result.Total, 1);
    }

    [Fact]
    public void Applies_15_percent_discount_for_VIP_customer_with_few_items()
    {
        var processor = CreateProcessor();
        var order = new Order
        {
            Id = "3",
            Customer = new Customer { Type = "vip", Email = "vip@test.com" },
            Items = new List<OrderItem> { new() { Price = 200, Quantity = 1 } },
            PaymentMethod = "cash"
        };

        var result = processor.ProcessOrder(order);

        Assert.Equal(200 * 0.85 + 19.99, result.Total, 1);
    }

    [Fact]
    public void Sends_confirmation_email_when_processing_order()
    {
        var processor = CreateProcessor();
        var order = new Order
        {
            Id = "4",
            Customer = new Customer { Type = "standard", Email = "notify@test.com" },
            Items = new List<OrderItem> { new() { Price = 50, Quantity = 1 } },
            PaymentMethod = "cash"
        };

        processor.ProcessOrder(order);

        _mailer.Verify(m => m.Send(It.Is<EmailMessage>(e =>
            e.To == "notify@test.com" && e.Subject == "Order Confirmation"
        )), Times.Once);
    }

    [Fact]
    public void Cancels_non_shipped_order_and_sends_email()
    {
        var processor = CreateProcessor();
        var order = new Order
        {
            Id = "5",
            Customer = new Customer { Type = "standard", Email = "cancel@test.com" },
            Items = new List<OrderItem> { new() { Price = 50, Quantity = 1 } },
            PaymentMethod = "cash"
        };
        processor.ProcessOrder(order);

        var cancelled = processor.CancelOrder("5", "Changed mind");

        Assert.True(cancelled);
        _mailer.Verify(m => m.Send(It.Is<EmailMessage>(e =>
            e.Subject == "Order Cancelled"
        )), Times.Once);
    }

    [Fact]
    public void Cannot_cancel_shipped_order()
    {
        var processor = CreateProcessor();
        var order = new Order
        {
            Id = "6",
            Status = "shipped",
            Customer = new Customer { Type = "standard", Email = "test@test.com" },
            Items = new List<OrderItem> { new() { Price = 50, Quantity = 1 } },
            PaymentMethod = "cash",
            Total = 69.99
        };
        processor.Orders.Add(order);

        var cancelled = processor.CancelOrder("6", "Too late");

        Assert.False(cancelled);
    }

    [Fact]
    public void Returns_out_of_stock_for_zero_quantity_inventory()
    {
        var processor = CreateProcessor();
        processor.Inventory = new List<InventoryItem>
        {
            new() { Id = "prod-1", Quantity = 0 }
        };

        Assert.Equal("out_of_stock", processor.GetInventoryStatus("prod-1"));
    }

    [Fact]
    public void Adds_credit_card_processing_fee()
    {
        var processor = CreateProcessor();
        var order = new Order
        {
            Id = "7",
            Customer = new Customer { Type = "standard", Email = "cc@test.com" },
            Items = new List<OrderItem> { new() { Price = 100, Quantity = 1 } },
            PaymentMethod = "credit_card"
        };

        var result = processor.ProcessOrder(order);

        var subtotal = 100 + 19.99;
        var fee = subtotal * 0.029 + 0.30;
        Assert.Equal(subtotal + fee, result.Total, 1);
    }
}
