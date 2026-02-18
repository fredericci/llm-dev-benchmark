// Tests for the fixed OrderService — null product must be handled gracefully
using Moq;
using Xunit;

public class OrderServiceTests
{
    private readonly Mock<IProductRepository> _mockRepo;
    private readonly OrderService _service;

    public OrderServiceTests()
    {
        _mockRepo = new Mock<IProductRepository>();
        _service = new OrderService(_mockRepo.Object);
    }

    [Fact]
    public async Task ProcessOrder_ExistingProduct_ReturnsCorrectTotal()
    {
        // Arrange: product exists with price 29.99
        _mockRepo.Setup(r => r.FindProduct("prod-1"))
            .ReturnsAsync(new Product
            {
                Id = "prod-1",
                Name = "Widget",
                Price = 29.99m,
                Stock = 100
            });

        var order = new OrderRequest { ProductId = "prod-1", Quantity = 2 };

        // Act
        var result = await _service.ProcessOrder(order);

        // Assert
        Assert.Equal(59.98m, result.Total);
        Assert.Equal("confirmed", result.Status);
        Assert.Equal("prod-1", result.ProductId);
        Assert.Equal("Widget", result.ProductName);
        Assert.Equal(2, result.Quantity);
        Assert.StartsWith("ORD-", result.OrderId);
    }

    [Fact]
    public async Task ProcessOrder_NonExistentProduct_ThrowsDescriptiveError()
    {
        // Arrange: product not found (returns null)
        _mockRepo.Setup(r => r.FindProduct("does-not-exist"))
            .ReturnsAsync((Product?)null);

        var order = new OrderRequest { ProductId = "does-not-exist", Quantity = 1 };

        // Act & Assert: should throw a meaningful exception, NOT NullReferenceException
        var ex = await Assert.ThrowsAnyAsync<Exception>(() => _service.ProcessOrder(order));

        // The exception should NOT be NullReferenceException (that's the bug)
        Assert.IsNotType<NullReferenceException>(ex);

        // The error message should mention "not found" or "does not exist" or "product"
        Assert.Matches("(?i)(not found|does not exist|product)", ex.Message);
    }

    [Fact]
    public async Task ProcessOrder_AnotherExistingProduct_CorrectCalculation()
    {
        // Arrange
        _mockRepo.Setup(r => r.FindProduct("prod-2"))
            .ReturnsAsync(new Product
            {
                Id = "prod-2",
                Name = "Gadget",
                Price = 49.99m,
                Stock = 5
            });

        var order = new OrderRequest { ProductId = "prod-2", Quantity = 3 };

        // Act
        var result = await _service.ProcessOrder(order);

        // Assert
        Assert.Equal(149.97m, result.Total);
        Assert.Equal("confirmed", result.Status);
    }

    [Fact]
    public async Task ProcessOrder_RepositoryThrows_ErrorPropagates()
    {
        // Arrange: repository throws an exception
        _mockRepo.Setup(r => r.FindProduct(It.IsAny<string>()))
            .ThrowsAsync(new InvalidOperationException("DB connection failed"));

        var order = new OrderRequest { ProductId = "any", Quantity = 1 };

        // Act & Assert: the error should propagate naturally
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _service.ProcessOrder(order));
    }
}
