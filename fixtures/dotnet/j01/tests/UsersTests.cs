using Xunit;

public class UsersTests
{
    private Users CreateUsers()
    {
        // Reset the store before each test
        UsersStore.Users = new List<UserRecord>
        {
            new UserRecord { Id = 1, Name = "Alice Smith", Email = "alice@example.com" },
            new UserRecord { Id = 2, Name = "Bob Jones", Email = "bob@example.com" },
        };
        return new Users();
    }

    [Fact]
    public void Creates_user_with_valid_data_and_returns_201()
    {
        var users = CreateUsers();
        var result = users.CreateUser(new CreateUserRequest
        {
            Name = "Charlie Brown",
            Email = "charlie@example.com",
            Password = "Password1"
        });

        Assert.Equal(201, result.StatusCode);
        Assert.NotNull(result.User);
        Assert.True(result.User!.Id > 0);
        Assert.Equal("Charlie Brown", result.User.Name);
        Assert.Equal("charlie@example.com", result.User.Email);
    }

    [Fact]
    public void Does_not_return_password_in_response()
    {
        var users = CreateUsers();
        var result = users.CreateUser(new CreateUserRequest
        {
            Name = "Dave Example",
            Email = "dave@example.com",
            Password = "Secure123"
        });

        Assert.Equal(201, result.StatusCode);
        Assert.NotNull(result.User);
        Assert.Null(result.User!.Password);
    }

    [Fact]
    public void Returns_400_when_name_is_missing()
    {
        var users = CreateUsers();
        var result = users.CreateUser(new CreateUserRequest
        {
            Email = "missing@example.com",
            Password = "Password1"
        });

        Assert.Equal(400, result.StatusCode);
        Assert.NotNull(result.Errors);
        Assert.True(result.Errors!.Count > 0);
    }

    [Fact]
    public void Returns_400_when_name_is_too_short()
    {
        var users = CreateUsers();
        var result = users.CreateUser(new CreateUserRequest
        {
            Name = "A",
            Email = "short@example.com",
            Password = "Password1"
        });

        Assert.Equal(400, result.StatusCode);
        Assert.NotNull(result.Errors);
        Assert.True(result.Errors!.Count > 0);
    }

    [Fact]
    public void Returns_400_when_email_is_invalid_format()
    {
        var users = CreateUsers();
        var result = users.CreateUser(new CreateUserRequest
        {
            Name = "Valid Name",
            Email = "not-an-email",
            Password = "Password1"
        });

        Assert.Equal(400, result.StatusCode);
        Assert.NotNull(result.Errors);
        Assert.True(result.Errors!.Count > 0);
    }

    [Fact]
    public void Returns_400_when_password_is_too_short()
    {
        var users = CreateUsers();
        var result = users.CreateUser(new CreateUserRequest
        {
            Name = "Valid Name",
            Email = "valid@example.com",
            Password = "abc"
        });

        Assert.Equal(400, result.StatusCode);
        Assert.NotNull(result.Errors);
        Assert.True(result.Errors!.Count > 0);
    }

    [Fact]
    public void Returns_400_when_password_has_no_uppercase_letter()
    {
        var users = CreateUsers();
        var result = users.CreateUser(new CreateUserRequest
        {
            Name = "Valid Name",
            Email = "valid2@example.com",
            Password = "password1"
        });

        Assert.Equal(400, result.StatusCode);
        Assert.NotNull(result.Errors);
        Assert.True(result.Errors!.Count > 0);
    }

    [Fact]
    public void Returns_409_when_email_already_exists()
    {
        var users = CreateUsers();
        var result = users.CreateUser(new CreateUserRequest
        {
            Name = "Alice Copy",
            Email = "alice@example.com",
            Password = "Password1"
        });

        Assert.Equal(409, result.StatusCode);
        Assert.NotNull(result.Message);
        Assert.Contains("already exists", result.Message!, StringComparison.OrdinalIgnoreCase);
    }
}
