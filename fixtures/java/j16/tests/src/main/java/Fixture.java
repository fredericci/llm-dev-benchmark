// Supporting classes for j16 DataPipeline tests
// These interfaces and classes are used by both the model-generated DataPipeline and the test suite

import java.util.function.BiConsumer;

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
