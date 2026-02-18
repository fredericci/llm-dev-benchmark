using Xunit;

public class CounterTests
{
    private const int Concurrency = 20;
    private const int IncrementsPerWorker = 100;
    private const int ExpectedTotal = Concurrency * IncrementsPerWorker;

    [Fact]
    public async Task Reaches_correct_count_under_concurrent_access_run_1()
    {
        var counter = new Counter();
        await counter.ResetCounter();

        var workers = Enumerable.Range(0, Concurrency)
            .Select(_ => counter.IncrementCounter(IncrementsPerWorker))
            .ToArray();
        await Task.WhenAll(workers);

        var count = await counter.GetCounter();
        Assert.Equal(ExpectedTotal, count);
    }

    [Fact]
    public async Task Reaches_correct_count_under_concurrent_access_run_2()
    {
        var counter = new Counter();
        await counter.ResetCounter();

        var workers = Enumerable.Range(0, Concurrency)
            .Select(_ => counter.IncrementCounter(IncrementsPerWorker))
            .ToArray();
        await Task.WhenAll(workers);

        var count = await counter.GetCounter();
        Assert.Equal(ExpectedTotal, count);
    }

    [Fact]
    public async Task Reaches_correct_count_under_concurrent_access_run_3()
    {
        var counter = new Counter();
        await counter.ResetCounter();

        var workers = Enumerable.Range(0, Concurrency)
            .Select(_ => counter.IncrementCounter(IncrementsPerWorker))
            .ToArray();
        await Task.WhenAll(workers);

        var count = await counter.GetCounter();
        Assert.Equal(ExpectedTotal, count);
    }

    [Fact]
    public async Task Single_threaded_increment_still_works()
    {
        var counter = new Counter();
        await counter.ResetCounter();

        await counter.IncrementCounter(5);

        var count = await counter.GetCounter();
        Assert.Equal(5, count);
    }
}
