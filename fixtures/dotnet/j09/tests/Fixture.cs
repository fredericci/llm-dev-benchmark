// Supporting types for j09 tests
// The model writes OrderService.cs with the OrderService class implementation

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
