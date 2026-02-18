// Behavioral tests — async version must produce identical results to callback version
// Functionally equivalent to the Node.js data-pipeline.test.js

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.function.BiConsumer;

class DataPipelineTest {

    private Database db;
    private Enricher enricher;
    private Cache cache;
    private Notifier notifier;

    @BeforeEach
    void setUp() {
        db = mock(Database.class);
        enricher = mock(Enricher.class);
        cache = mock(Cache.class);
        notifier = mock(Notifier.class);

        // Default mock behavior: findUser returns a user for normal IDs
        doAnswer(invocation -> {
            String userId = invocation.getArgument(0);
            BiConsumer<Exception, UserData> callback = invocation.getArgument(1);
            if ("missing".equals(userId)) {
                callback.accept(null, null);
            } else if ("error".equals(userId)) {
                callback.accept(new RuntimeException("DB error"), null);
            } else {
                callback.accept(null, new UserData(userId, userId + "@test.com", "Test User"));
            }
            return null;
        }).when(db).findUser(anyString(), any());

        // Enricher adds enriched flag
        doAnswer(invocation -> {
            UserData user = invocation.getArgument(0);
            BiConsumer<Exception, UserData> callback = invocation.getArgument(1);
            user.setEnriched(true);
            callback.accept(null, user);
            return null;
        }).when(enricher).enrich(any(UserData.class), any());

        // Cache.set succeeds
        doAnswer(invocation -> {
            BiConsumer<Exception, Void> callback = invocation.getArgument(2);
            callback.accept(null, null);
            return null;
        }).when(cache).set(anyString(), any(UserData.class), any());

        // Notifier.notify succeeds
        doAnswer(invocation -> {
            BiConsumer<Exception, Void> callback = invocation.getArgument(2);
            callback.accept(null, null);
            return null;
        }).when(notifier).notify(anyString(), anyString(), any());
    }

    @Test
    void successfullyProcessesExistingUser() throws Exception {
        DataPipeline pipeline = new DataPipeline(db, enricher, cache, notifier);
        CompletableFuture<PipelineResult> future = pipeline.processPipeline("user-1");

        assertNotNull(future, "processPipeline should return a CompletableFuture");

        PipelineResult result = future.get();
        assertEquals("user-1", result.getUserId());
        assertEquals("complete", result.getStatus());
        assertTrue(result.isCached());
        assertTrue(result.isNotified());
    }

    @Test
    void throwsErrorForMissingUser() {
        DataPipeline pipeline = new DataPipeline(db, enricher, cache, notifier);
        CompletableFuture<PipelineResult> future = pipeline.processPipeline("missing");

        ExecutionException ex = assertThrows(ExecutionException.class, future::get);
        assertTrue(ex.getCause().getMessage().toLowerCase().contains("not found"),
                "Error should mention 'not found', got: " + ex.getCause().getMessage());
    }

    @Test
    void propagatesDbErrors() {
        DataPipeline pipeline = new DataPipeline(db, enricher, cache, notifier);
        CompletableFuture<PipelineResult> future = pipeline.processPipeline("error");

        ExecutionException ex = assertThrows(ExecutionException.class, future::get);
        assertEquals("DB error", ex.getCause().getMessage());
    }

    @Test
    void returnsCompletableFuture() {
        DataPipeline pipeline = new DataPipeline(db, enricher, cache, notifier);
        Object result = pipeline.processPipeline("user-2");

        assertTrue(result instanceof CompletableFuture,
                "processPipeline should return a CompletableFuture");
    }
}
