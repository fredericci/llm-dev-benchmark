// Data pipeline with synchronous nested calls
// The model must convert this to async Task-based patterns

public class UserData
{
    public string Id { get; set; } = "";
    public string Email { get; set; } = "";
    public string Name { get; set; } = "";
    public bool Enriched { get; set; }
}

public class PipelineResult
{
    public string UserId { get; set; } = "";
    public string Status { get; set; } = "";
    public bool Cached { get; set; }
    public bool Notified { get; set; }
}

public interface IDatabase
{
    UserData? FindUser(string userId);
}

public interface IEnricher
{
    UserData Enrich(UserData user);
}

public interface ICache
{
    void Set(string key, UserData value);
}

public interface INotifier
{
    void Notify(string email, string message);
}

public class DataPipeline
{
    private readonly IDatabase _db;
    private readonly IEnricher _enricher;
    private readonly ICache _cache;
    private readonly INotifier _notifier;

    public DataPipeline(IDatabase db, IEnricher enricher, ICache cache, INotifier notifier)
    {
        _db = db;
        _enricher = enricher;
        _cache = cache;
        _notifier = notifier;
    }

    // Synchronous nested pipeline — must be converted to async
    public PipelineResult ProcessPipeline(string userId)
    {
        // Level 1: Fetch user from DB
        var user = _db.FindUser(userId);
        if (user == null)
            throw new InvalidOperationException("User not found");

        // Level 2: Enrich user data from external service
        var enrichedUser = _enricher.Enrich(user);

        // Level 3: Cache the enriched data
        _cache.Set($"user:{userId}", enrichedUser);

        // Level 4: Send notification
        _notifier.Notify(enrichedUser.Email, "Profile updated");

        return new PipelineResult
        {
            UserId = enrichedUser.Id,
            Status = "complete",
            Cached = true,
            Notified = true
        };
    }
}
