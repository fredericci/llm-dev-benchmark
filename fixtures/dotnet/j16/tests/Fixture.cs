// Supporting types for j16 tests
// The model writes DataPipeline.cs with the AsyncDataPipeline class implementation
// Note: The async interfaces (IAsyncDatabase, IAsyncEnricher, IAsyncCache, IAsyncNotifier)
// are defined in the test file itself (DataPipelineTests.cs)

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
