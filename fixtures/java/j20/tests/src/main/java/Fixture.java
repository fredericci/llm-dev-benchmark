// Supporting classes for j20 Utils tests
// ErrorInfo is used by both the model-generated Utils and the test suite

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
