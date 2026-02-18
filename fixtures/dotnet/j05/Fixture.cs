// E-commerce API with 5 planted security vulnerabilities
// The model must find ALL of them

using System;
using System.Data.SQLite;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Http;

class ECommerceApi
{
    private SQLiteConnection db;

    // VULNERABILITY 1: Hardcoded API secret
    private const string ApiSecret = "super-secret-key-hardcoded-12345";

    public ECommerceApi()
    {
        db = new SQLiteConnection("Data Source=:memory:");
        db.Open();
        using var cmd = db.CreateCommand();
        cmd.CommandText = "CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, role TEXT, password TEXT)";
        cmd.ExecuteNonQuery();
        cmd.CommandText = "CREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER, amount REAL)";
        cmd.ExecuteNonQuery();
    }

    // Auth middleware
    private JwtSecurityToken Authenticate(HttpRequest request)
    {
        string authHeader = request.Headers["Authorization"];
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
        {
            return null; // 401 No token
        }
        string token = authHeader.Substring(7);

        // VULNERABILITY 2: JWT decoded without verifying signature or expiration
        var handler = new JwtSecurityTokenHandler();
        var decoded = handler.ReadJwtToken(token); // should use ValidateToken() with validation parameters
        return decoded;
    }

    // Get user orders
    public SQLiteDataReader GetUserOrders(HttpRequest request, string userId)
    {
        var user = Authenticate(request);
        if (user == null) return null;

        // VULNERABILITY 3: SQL injection via string concatenation
        using var cmd = db.CreateCommand();
        cmd.CommandText = $"SELECT * FROM orders WHERE user_id = '{userId}'";
        return cmd.ExecuteReader();
    }

    // Search users
    public void SearchUser(HttpRequest request, string email)
    {
        var user = Authenticate(request);
        if (user == null) return;

        using var cmd = db.CreateCommand();
        cmd.CommandText = "SELECT * FROM users WHERE email = @email";
        cmd.Parameters.AddWithValue("@email", email);
        using var reader = cmd.ExecuteReader();

        if (reader.Read())
        {
            string foundEmail = reader.GetString(reader.GetOrdinal("email"));
            string password = reader.GetString(reader.GetOrdinal("password"));
            string role = reader.GetString(reader.GetOrdinal("role"));
            // VULNERABILITY 4: PII logged in plaintext
            Console.WriteLine($"User login: email={foundEmail}, password={password}, role={role}");
        }
    }

    // VULNERABILITY 5: Admin endpoint with no authentication check
    public void DeleteUser(string id)
    {
        using var cmd = db.CreateCommand();
        cmd.CommandText = "DELETE FROM users WHERE id = @id";
        cmd.Parameters.AddWithValue("@id", int.Parse(id));
        cmd.ExecuteNonQuery();
        // returns { deleted: id } equivalent
    }
}
