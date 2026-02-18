// Shared counter with race condition — no synchronization
// Multiple concurrent threads increment without coordination

public class Counter {
    private int sharedCounter = 0;

    public void incrementCounter(int times) throws InterruptedException {
        for (int i = 0; i < times; i++) {
            // Race condition: read-modify-write is not atomic
            int current = sharedCounter;
            Thread.sleep(0, 1); // yield to other threads (like setImmediate in Node.js)
            sharedCounter = current + 1;
        }
    }

    public int getCounter() {
        return sharedCounter;
    }

    public void resetCounter() {
        sharedCounter = 0;
    }
}
