// Behavioral tests — async version must produce identical results to synchronous version
using Moq;
using Xunit;

// Async interfaces that the model must define in DataPipeline.cs
public interface IAsyncDatabase
{
    Task<UserData?> FindUserAsync(string userId);
}

public interface IAsyncEnricher
{
    Task<UserData> EnrichAsync(UserData user);
}

public interface IAsyncCache
{
    Task SetAsync(string key, UserData value);
}

public interface IAsyncNotifier
{
    Task NotifyAsync(string email, string message);
}

public class DataPipelineTests
{
    private readonly Mock<IAsyncDatabase> _mockDb;
    private readonly Mock<IAsyncEnricher> _mockEnricher;
    private readonly Mock<IAsyncCache> _mockCache;
    private readonly Mock<IAsyncNotifier> _mockNotifier;

    public DataPipelineTests()
    {
        _mockDb = new Mock<IAsyncDatabase>();
        _mockEnricher = new Mock<IAsyncEnricher>();
        _mockCache = new Mock<IAsyncCache>();
        _mockNotifier = new Mock<IAsyncNotifier>();

        // Default setup: user-1 exists
        _mockDb.Setup(d => d.FindUserAsync("user-1"))
            .ReturnsAsync(new UserData { Id = "user-1", Email = "user-1@test.com", Name = "Test User" });

        _mockDb.Setup(d => d.FindUserAsync("user-2"))
            .ReturnsAsync(new UserData { Id = "user-2", Email = "user-2@test.com", Name = "Test User 2" });

        // missing user returns null
        _mockDb.Setup(d => d.FindUserAsync("missing"))
            .ReturnsAsync((UserData?)null);

        // error user throws
        _mockDb.Setup(d => d.FindUserAsync("error"))
            .ThrowsAsync(new InvalidOperationException("DB error"));

        // Enricher adds enriched flag
        _mockEnricher.Setup(e => e.EnrichAsync(It.IsAny<UserData>()))
            .ReturnsAsync((UserData u) => new UserData
            {
                Id = u.Id,
                Email = u.Email,
                Name = u.Name,
                Enriched = true
            });

        // Cache and notifier succeed
        _mockCache.Setup(c => c.SetAsync(It.IsAny<string>(), It.IsAny<UserData>()))
            .Returns(Task.CompletedTask);

        _mockNotifier.Setup(n => n.NotifyAsync(It.IsAny<string>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);
    }

    [Fact]
    public async Task Successfully_Processes_Existing_User()
    {
        var pipeline = new AsyncDataPipeline(
            _mockDb.Object, _mockEnricher.Object, _mockCache.Object, _mockNotifier.Object);

        var result = await pipeline.ProcessPipelineAsync("user-1");

        Assert.Equal("user-1", result.UserId);
        Assert.Equal("complete", result.Status);
        Assert.True(result.Cached);
        Assert.True(result.Notified);
    }

    [Fact]
    public async Task Throws_Error_For_Missing_User()
    {
        var pipeline = new AsyncDataPipeline(
            _mockDb.Object, _mockEnricher.Object, _mockCache.Object, _mockNotifier.Object);

        var ex = await Assert.ThrowsAnyAsync<Exception>(
            () => pipeline.ProcessPipelineAsync("missing"));
        Assert.Matches("(?i)not found", ex.Message);
    }

    [Fact]
    public async Task Propagates_DB_Errors()
    {
        var pipeline = new AsyncDataPipeline(
            _mockDb.Object, _mockEnricher.Object, _mockCache.Object, _mockNotifier.Object);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => pipeline.ProcessPipelineAsync("error"));
        Assert.Equal("DB error", ex.Message);
    }

    [Fact]
    public async Task Returns_A_Task_Is_Async()
    {
        var pipeline = new AsyncDataPipeline(
            _mockDb.Object, _mockEnricher.Object, _mockCache.Object, _mockNotifier.Object);

        // Calling ProcessPipelineAsync should return a Task
        var task = pipeline.ProcessPipelineAsync("user-2");
        Assert.IsAssignableFrom<Task>(task);
        await task; // clean up
    }

    [Fact]
    public async Task Calls_All_Pipeline_Steps_In_Order()
    {
        var callOrder = new List<string>();

        _mockDb.Setup(d => d.FindUserAsync("user-1"))
            .Callback(() => callOrder.Add("db"))
            .ReturnsAsync(new UserData { Id = "user-1", Email = "user-1@test.com", Name = "Test User" });

        _mockEnricher.Setup(e => e.EnrichAsync(It.IsAny<UserData>()))
            .Callback(() => callOrder.Add("enrich"))
            .ReturnsAsync((UserData u) => new UserData { Id = u.Id, Email = u.Email, Name = u.Name, Enriched = true });

        _mockCache.Setup(c => c.SetAsync(It.IsAny<string>(), It.IsAny<UserData>()))
            .Callback(() => callOrder.Add("cache"))
            .Returns(Task.CompletedTask);

        _mockNotifier.Setup(n => n.NotifyAsync(It.IsAny<string>(), It.IsAny<string>()))
            .Callback(() => callOrder.Add("notify"))
            .Returns(Task.CompletedTask);

        var pipeline = new AsyncDataPipeline(
            _mockDb.Object, _mockEnricher.Object, _mockCache.Object, _mockNotifier.Object);

        await pipeline.ProcessPipelineAsync("user-1");

        Assert.Equal(new[] { "db", "enrich", "cache", "notify" }, callOrder);
    }
}
