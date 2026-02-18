// Base Users class with in-memory users store
// The model must generate the Users.cs implementation with CreateUser method

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

// TODO: The model must implement a Users class with:
//   CreateUserResult CreateUser(CreateUserRequest request)
// - name: required, min 2 chars
// - email: valid format, unique against UsersStore.Users
// - password: min 8 chars, at least 1 uppercase, at least 1 number
// - Return StatusCode 201 with User (no password) on success
// - Return StatusCode 400 with Errors (list of strings) on validation failure
// - Return StatusCode 409 with Message "Email already exists" on duplicate
