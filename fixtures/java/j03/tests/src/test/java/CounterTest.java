import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

class CounterTest {

    private static final int CONCURRENCY = 20;
    private static final int INCREMENTS_PER_WORKER = 100;
    private static final int EXPECTED_TOTAL = CONCURRENCY * INCREMENTS_PER_WORKER;

    private Counter counter;

    @BeforeEach
    void setUp() {
        counter = new Counter();
    }

    @Test
    void reachesCorrectCountUnderConcurrentAccessRun1() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(CONCURRENCY);
        List<Future<?>> futures = new ArrayList<>();

        for (int i = 0; i < CONCURRENCY; i++) {
            futures.add(executor.submit(() -> {
                try {
                    counter.incrementCounter(INCREMENTS_PER_WORKER);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }));
        }

        for (Future<?> f : futures) {
            f.get(30, TimeUnit.SECONDS);
        }
        executor.shutdown();

        assertEquals(EXPECTED_TOTAL, counter.getCounter());
    }

    @Test
    void reachesCorrectCountUnderConcurrentAccessRun2() throws Exception {
        counter.resetCounter();
        ExecutorService executor = Executors.newFixedThreadPool(CONCURRENCY);
        List<Future<?>> futures = new ArrayList<>();

        for (int i = 0; i < CONCURRENCY; i++) {
            futures.add(executor.submit(() -> {
                try {
                    counter.incrementCounter(INCREMENTS_PER_WORKER);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }));
        }

        for (Future<?> f : futures) {
            f.get(30, TimeUnit.SECONDS);
        }
        executor.shutdown();

        assertEquals(EXPECTED_TOTAL, counter.getCounter());
    }

    @Test
    void reachesCorrectCountUnderConcurrentAccessRun3() throws Exception {
        counter.resetCounter();
        ExecutorService executor = Executors.newFixedThreadPool(CONCURRENCY);
        List<Future<?>> futures = new ArrayList<>();

        for (int i = 0; i < CONCURRENCY; i++) {
            futures.add(executor.submit(() -> {
                try {
                    counter.incrementCounter(INCREMENTS_PER_WORKER);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }));
        }

        for (Future<?> f : futures) {
            f.get(30, TimeUnit.SECONDS);
        }
        executor.shutdown();

        assertEquals(EXPECTED_TOTAL, counter.getCounter());
    }

    @Test
    void singleThreadedIncrementStillWorks() throws Exception {
        counter.incrementCounter(5);
        assertEquals(5, counter.getCounter());
    }
}
