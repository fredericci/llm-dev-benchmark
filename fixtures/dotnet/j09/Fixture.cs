// Order service with bug: missing null check after async lookup
// This causes System.NullReferenceException: Object reference not set to an instance of an object.

public class Product
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public decimal Price { get; set; }
    public int Stock { get; set; }
}

public class OrderResult
{
    public string OrderId { get; set; } = "";
    public string ProductId { get; set; } = "";
    public string ProductName { get; set; } = "";
    public int Quantity { get; set; }
    public decimal Total { get; set; }
    public string Status { get; set; } = "";
}

public class OrderRequest
{
    public string ProductId { get; set; } = "";
    public int Quantity { get; set; }
}

public interface IProductRepository
{
    Task<Product?> FindProduct(string productId);
}

public class OrderService
{
    private readonly IProductRepository _productRepository;

    public OrderService(IProductRepository productRepository)
    {
        _productRepository = productRepository;
    }

    // BUG: No null check — crashes with NullReferenceException when product is not found
    public async Task<OrderResult> ProcessOrder(OrderRequest order)
    {
        var product = await _productRepository.FindProduct(order.ProductId);

        // BUG: product can be null if not found, causing NullReferenceException
        var orderTotal = product.Price * order.Quantity;

        return new OrderResult
        {
            OrderId = $"ORD-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            ProductId = product.Id,
            ProductName = product.Name,
            Quantity = order.Quantity,
            Total = orderTotal,
            Status = "confirmed"
        };
    }
}
