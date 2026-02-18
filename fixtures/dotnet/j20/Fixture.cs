// CI failure scenario: Utils.cs with a circular static initializer dependency
// Utils references Config which references Utils, causing TypeInitializationException

// This is the BUGGY Utils.cs that causes circular static initialization
public static class Config
{
    // Config tries to use Utils at static init time — circular!
    public static readonly int MaxRetries = Utils.DefaultRetryCount;
    public static int GetDefaultTimeout() => 3;
}

public static class Utils
{
    // Utils tries to use Config at static init time — circular!
    public static readonly int DefaultRetryCount = Config.GetDefaultTimeout();

    public static object FormatError(Exception err)
    {
        return new { message = err.Message, timestamp = DateTime.UtcNow.ToString("o") };
    }

    public static async Task Sleep(int ms)
    {
        await Task.Delay(ms);
    }

    public static async Task<T> Retry<T>(Func<Task<T>> fn, int times = -1)
    {
        if (times == -1) times = Config.GetDefaultTimeout();
        try
        {
            return await fn();
        }
        catch (Exception)
        {
            if (times <= 0) throw;
            return await Retry(fn, times - 1);
        }
    }
}
