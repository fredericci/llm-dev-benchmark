// CI failure scenario: Utils.java with a circular dependency
// Utils imports Config which imports Utils — causes initialization error

class Utils {

    // Circular dependency: Utils references Config at class-load time,
    // and Config references Utils at class-load time
    private static final int DEFAULT_TIMEOUT = Config.getDefaultTimeout();

    public static ErrorInfo formatError(Exception err) {
        return new ErrorInfo(err.getMessage(), java.time.Instant.now().toString());
    }

    public static void sleep(long ms) throws InterruptedException {
        Thread.sleep(ms);
    }

    public static <T> T retry(java.util.concurrent.Callable<T> fn, int times) throws Exception {
        try {
            return fn.call();
        } catch (Exception err) {
            if (times <= 0) throw err;
            return retry(fn, times - 1);
        }
    }

    public static <T> T retry(java.util.concurrent.Callable<T> fn) throws Exception {
        return retry(fn, DEFAULT_TIMEOUT);
    }
}

class Config {
    // Circular: Config references Utils at class-load time
    private static final String FORMATTED = Utils.formatError(new RuntimeException("init")).message;

    public static int getDefaultTimeout() {
        return 3;
    }

    public static String getFormattedInit() {
        return FORMATTED;
    }
}

class ErrorInfo {
    String message;
    String timestamp;

    public ErrorInfo(String message, String timestamp) {
        this.message = message;
        this.timestamp = timestamp;
    }

    public String getMessage() { return message; }
    public String getTimestamp() { return timestamp; }
}
