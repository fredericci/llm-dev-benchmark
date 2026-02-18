// Supporting types for j01 tests
// The model writes Users.cs with the Users class implementation

using System.Text.RegularExpressions;

public class UserRecord
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Password { get; set; }
}

public class CreateUserRequest
{
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? Password { get; set; }
}

public class CreateUserResult
{
    public int StatusCode { get; set; }
    public UserRecord? User { get; set; }
    public List<string>? Errors { get; set; }
    public string? Message { get; set; }
}

// In-memory users store (pre-seeded)
public static class UsersStore
{
    public static List<UserRecord> Users = new()
    {
        new UserRecord { Id = 1, Name = "Alice Smith", Email = "alice@example.com" },
        new UserRecord { Id = 2, Name = "Bob Jones", Email = "bob@example.com" },
    };
}
