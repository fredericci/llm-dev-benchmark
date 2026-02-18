// Slow query log and application code for performance diagnosis

class Fixture {

    static final String SLOW_QUERY_LOG = """
# Time: 2026-02-17T09:12:31Z  Query_time: 2.847  Rows_examined: 892341
SELECT * FROM orders WHERE customer_email LIKE '%@gmail.com' ORDER BY created_at DESC;
-- No index on customer_email; full table scan on 892k rows

# Time: 2026-02-17T09:14:22Z  Query_time: 1.923  Rows_examined: 892341
SELECT o.*, u.name, u.email FROM orders o JOIN users u ON o.user_id = u.id
WHERE o.status = 'pending' ORDER BY o.created_at;
-- No index on (status, created_at); filesort on 892k rows

# Time: 2026-02-17T09:15:01Z  Query_time: 0.734  Rows_examined: 45000
SELECT * FROM order_items WHERE order_id = ?;
-- Called in a loop (N+1 pattern) -- this query runs 45k times per minute

# Time: 2026-02-17T09:17:45Z  Query_time: 0.621  Rows_examined: 112000
SELECT * FROM products WHERE category_id = ? AND deleted_at IS NULL;
-- Missing composite index on (category_id, deleted_at)
""";

    // Application code with connection pool not configured + N+1 in loop
    static final String APP_CODE = """
import javax.sql.DataSource;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.*;
import java.util.*;

public class OrderService {

    private final DataSource dataSource;

    public OrderService() {
        // Bug: pool created without size config -- defaults to maximumPoolSize=10
        // Under load, 98/100 pool connections are exhausted
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:postgresql://" + System.getenv("DB_HOST") + "/" + System.getenv("DB_NAME"));
        config.setUsername(System.getenv("DB_USER"));
        config.setPassword(System.getenv("DB_PASS"));
        // Missing: setMaximumPoolSize, setMinimumIdle, setConnectionTimeout, setIdleTimeout
        this.dataSource = new HikariDataSource(config);
    }

    public List<Map<String, Object>> getOrdersWithItems() throws SQLException {
        List<Map<String, Object>> result = new ArrayList<>();

        try (Connection conn = dataSource.getConnection()) {
            PreparedStatement ps = conn.prepareStatement(
                "SELECT * FROM orders WHERE status = ?"
            );
            ps.setString(1, "pending");
            ResultSet rs = ps.executeQuery();

            // N+1: fetches items for each order in a loop
            while (rs.next()) {
                Map<String, Object> order = new HashMap<>();
                order.put("id", rs.getInt("id"));
                order.put("status", rs.getString("status"));

                PreparedStatement itemPs = conn.prepareStatement(
                    "SELECT * FROM order_items WHERE order_id = ?"
                );
                itemPs.setInt(1, rs.getInt("id"));
                ResultSet itemRs = itemPs.executeQuery();

                List<Map<String, Object>> items = new ArrayList<>();
                while (itemRs.next()) {
                    Map<String, Object> item = new HashMap<>();
                    item.put("id", itemRs.getInt("id"));
                    item.put("name", itemRs.getString("name"));
                    items.add(item);
                }
                order.put("items", items);
                result.add(order);
            }
        }
        return result;
    }
}
""";
}
