// Shared counter with race condition -- no lock/Interlocked
// Multiple concurrent async operations increment without coordination

public class Counter
{
    private int _sharedCounter = 0;

    public async Task IncrementCounter(int times)
    {
        for (int i = 0; i < times; i++)
        {
            // Race condition: read-modify-write is not atomic
            int current = _sharedCounter;
            await Task.Delay(0); // yield to allow other tasks to interleave
            _sharedCounter = current + 1;
        }
    }

    public Task<int> GetCounter()
    {
        return Task.FromResult(_sharedCounter);
    }

    public Task ResetCounter()
    {
        _sharedCounter = 0;
        return Task.CompletedTask;
    }
}
