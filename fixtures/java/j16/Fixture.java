// Data pipeline with 4-level nested synchronous callbacks
// The model must convert this to use CompletableFuture (async)

import java.util.function.BiConsumer;

// --- Stub interfaces representing external dependencies ---

interface Database {
    void findUser(String userId, BiConsumer<Exception, UserData> callback);
}

interface Enricher {
    void enrich(UserData user, BiConsumer<Exception, UserData> callback);
}

interface Cache {
    void set(String key, UserData value, BiConsumer<Exception, Void> callback);
}

interface Notifier {
    void notify(String email, String message, BiConsumer<Exception, Void> callback);
}

class UserData {
    String id;
    String email;
    String name;
    boolean enriched;

    public UserData(String id, String email, String name) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.enriched = false;
    }

    public String getId() { return id; }
    public String getEmail() { return email; }
    public String getName() { return name; }
    public boolean isEnriched() { return enriched; }
    public void setEnriched(boolean enriched) { this.enriched = enriched; }
}

class PipelineResult {
    String userId;
    String status;
    boolean cached;
    boolean notified;

    public PipelineResult(String userId, String status, boolean cached, boolean notified) {
        this.userId = userId;
        this.status = status;
        this.cached = cached;
        this.notified = notified;
    }

    public String getUserId() { return userId; }
    public String getStatus() { return status; }
    public boolean isCached() { return cached; }
    public boolean isNotified() { return notified; }
}

// --- Synchronous callback-based pipeline (to be converted to CompletableFuture) ---

class DataPipeline {

    private Database db;
    private Enricher enricher;
    private Cache cache;
    private Notifier notifier;

    public DataPipeline(Database db, Enricher enricher, Cache cache, Notifier notifier) {
        this.db = db;
        this.enricher = enricher;
        this.cache = cache;
        this.notifier = notifier;
    }

    public void processPipeline(String userId, BiConsumer<Exception, PipelineResult> callback) {
        // Level 1: Fetch user from DB
        db.findUser(userId, (err, user) -> {
            if (err != null) { callback.accept(err, null); return; }
            if (user == null) { callback.accept(new RuntimeException("User not found"), null); return; }

            // Level 2: Enrich user data from external service
            enricher.enrich(user, (err2, enrichedUser) -> {
                if (err2 != null) { callback.accept(err2, null); return; }

                // Level 3: Cache the enriched data
                cache.set("user:" + userId, enrichedUser, (err3, ignored) -> {
                    if (err3 != null) { callback.accept(err3, null); return; }

                    // Level 4: Send notification
                    notifier.notify(enrichedUser.getEmail(), "Profile updated", (err4, ignored2) -> {
                        if (err4 != null) { callback.accept(err4, null); return; }
                        callback.accept(null, new PipelineResult(
                            enrichedUser.getId(),
                            "complete",
                            true,
                            true
                        ));
                    });
                });
            });
        });
    }
}
