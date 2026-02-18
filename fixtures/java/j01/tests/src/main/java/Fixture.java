import java.util.*;

public class Fixture {
    public static final List<Map<String, Object>> users = new ArrayList<>(Arrays.asList(
        new HashMap<>(Map.of("id", 1, "name", "Alice Smith", "email", "alice@example.com")),
        new HashMap<>(Map.of("id", 2, "name", "Bob Jones", "email", "bob@example.com"))
    ));
}
