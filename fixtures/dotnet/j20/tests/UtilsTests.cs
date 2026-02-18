// Tests that should pass once the circular static initializer dependency is fixed
using Xunit;

public class UtilsTests
{
    [Fact]
    public void FormatError_Returns_Message_And_Timestamp()
    {
        var err = new Exception("something broke");
        var result = Utils.FormatError(err);

        // Result should have message and timestamp properties
        var type = result.GetType();
        var messageProp = type.GetProperty("message") ?? type.GetProperty("Message");
        var timestampProp = type.GetProperty("timestamp") ?? type.GetProperty("Timestamp");

        Assert.NotNull(messageProp);
        Assert.NotNull(timestampProp);

        var message = messageProp!.GetValue(result)?.ToString();
        var timestamp = timestampProp!.GetValue(result)?.ToString();

        Assert.Equal("something broke", message);
        Assert.NotNull(timestamp);
        Assert.True(DateTime.TryParse(timestamp, out _), "timestamp should be a valid date string");
    }

    [Fact]
    public async Task Sleep_Resolves_After_Delay()
    {
        var start = DateTimeOffset.UtcNow;
        await Utils.Sleep(50);
        var elapsed = (DateTimeOffset.UtcNow - start).TotalMilliseconds;
        Assert.True(elapsed >= 40, $"Expected at least 40ms elapsed, got {elapsed}ms");
    }

    [Fact]
    public async Task Retry_Calls_Fn_And_Returns_On_Success()
    {
        var callCount = 0;
        var result = await Utils.Retry(async () =>
        {
            callCount++;
            await Task.CompletedTask;
            return "ok";
        }, 3);

        Assert.Equal("ok", result);
        Assert.Equal(1, callCount);
    }

    [Fact]
    public async Task Retry_Retries_On_Failure_And_Eventually_Throws()
    {
        var callCount = 0;
        var ex = await Assert.ThrowsAsync<Exception>(async () =>
        {
            await Utils.Retry<string>(async () =>
            {
                callCount++;
                await Task.CompletedTask;
                throw new Exception("fail");
            }, 2);
        });

        Assert.Equal("fail", ex.Message);
        Assert.Equal(3, callCount); // initial + 2 retries
    }
}
