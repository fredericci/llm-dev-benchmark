// Slow query log and application code for performance diagnosis

class Fixture
{
    const string SLOW_QUERY_LOG = @"
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
";

    // Application code with connection pool not configured + N+1 in loop
    const string APP_CODE = @"
using Npgsql;
using System;
using System.Collections.Generic;

public class OrderService
{
    private readonly NpgsqlDataSource _dataSource;

    public OrderService()
    {
        // Bug: connection pool created without size config -- defaults to MaxPoolSize=100
        // but MinPoolSize=0 means connections are constantly created/destroyed under load
        var connectionString = $""Host={Environment.GetEnvironmentVariable(""DB_HOST"")};""
            + $""Database={Environment.GetEnvironmentVariable(""DB_NAME"")};""
            + $""Username={Environment.GetEnvironmentVariable(""DB_USER"")};""
            + $""Password={Environment.GetEnvironmentVariable(""DB_PASS"")}"";
        // Missing: MaxPoolSize, MinPoolSize, ConnectionIdleLifetime, Timeout
        _dataSource = NpgsqlDataSource.Create(connectionString);
    }

    public List<Dictionary<string, object>> GetOrdersWithItems()
    {
        var result = new List<Dictionary<string, object>>();

        using var conn = _dataSource.OpenConnection();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = ""SELECT * FROM orders WHERE status = @status"";
        cmd.Parameters.AddWithValue(""@status"", ""pending"");
        using var reader = cmd.ExecuteReader();

        var orderIds = new List<int>();
        var orders = new List<Dictionary<string, object>>();
        while (reader.Read())
        {
            var order = new Dictionary<string, object>
            {
                [""id""] = reader.GetInt32(reader.GetOrdinal(""id"")),
                [""status""] = reader.GetString(reader.GetOrdinal(""status""))
            };
            orderIds.Add((int)order[""id""]);
            orders.Add(order);
        }
        reader.Close();

        // N+1: fetches items for each order in a loop
        foreach (var order in orders)
        {
            using var itemCmd = conn.CreateCommand();
            itemCmd.CommandText = ""SELECT * FROM order_items WHERE order_id = @orderId"";
            itemCmd.Parameters.AddWithValue(""@orderId"", order[""id""]);
            using var itemReader = itemCmd.ExecuteReader();

            var items = new List<Dictionary<string, object>>();
            while (itemReader.Read())
            {
                var item = new Dictionary<string, object>
                {
                    [""id""] = itemReader.GetInt32(itemReader.GetOrdinal(""id"")),
                    [""name""] = itemReader.GetString(itemReader.GetOrdinal(""name""))
                };
                items.Add(item);
            }
            order[""items""] = items;
            result.Add(order);
        }

        return result;
    }
}
";
}
