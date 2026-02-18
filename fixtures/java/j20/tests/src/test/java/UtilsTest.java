// Tests that should pass once the circular dependency is fixed
// Functionally equivalent to the Node.js utils.test.js

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class UtilsTest {

    @Test
    void formatErrorReturnsMessageAndTimestamp() {
        ErrorInfo result = Utils.formatError(new RuntimeException("something broke"));
        assertEquals("something broke", result.getMessage());
        assertNotNull(result.getTimestamp(), "Timestamp should be defined");
        // Verify timestamp is parseable as an ISO instant
        assertDoesNotThrow(() -> java.time.Instant.parse(result.getTimestamp()),
                "Timestamp should be a valid ISO-8601 instant");
    }

    @Test
    void sleepResolvesAfterDelay() throws InterruptedException {
        long start = System.currentTimeMillis();
        Utils.sleep(50);
        long elapsed = System.currentTimeMillis() - start;
        assertTrue(elapsed >= 40, "Should have slept at least 40ms, but was " + elapsed + "ms");
    }

    @Test
    void retryCallsFnAndReturnsOnSuccess() throws Exception {
        int[] callCount = {0};
        String result = Utils.retry(() -> {
            callCount[0]++;
            return "ok";
        }, 3);

        assertEquals("ok", result);
        assertEquals(1, callCount[0], "Should have been called exactly once on success");
    }

    @Test
    void retryRetriesOnFailureAndEventuallyThrows() {
        int[] callCount = {0};
        Exception thrown = assertThrows(Exception.class, () -> {
            Utils.retry(() -> {
                callCount[0]++;
                throw new RuntimeException("fail");
            }, 2);
        });

        assertEquals("fail", thrown.getMessage());
        assertEquals(3, callCount[0], "Should have been called 3 times: initial + 2 retries");
    }
}
