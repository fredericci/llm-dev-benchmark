// Existing codebase for feature-from-issue task
// User, AuthService, and EmailService stubs

public class User
{
    public string Id { get; set; } = "";
    public string Email { get; set; } = "";
    public string Name { get; set; } = "";
    public DateTime LastPasswordChange { get; set; } = DateTime.UtcNow;
    public DateTime? PasswordNotificationSentAt { get; set; } = null;

    public int DaysSincePasswordChange()
    {
        var diff = DateTime.UtcNow - LastPasswordChange;
        return (int)Math.Floor(diff.TotalDays);
    }
}

public interface IUserRepository
{
    Task<List<User>> FindAll();
    Task<User?> Update(string userId, UserUpdateData data);
}

public class UserUpdateData
{
    public DateTime? PasswordNotificationSentAt { get; set; }
}

public class AuthService
{
    private readonly IUserRepository _userRepository;

    public AuthService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<List<User>> GetAllUsers()
    {
        return await _userRepository.FindAll();
    }

    public async Task<User?> UpdateUser(string userId, UserUpdateData data)
    {
        return await _userRepository.Update(userId, data);
    }
}

public class EmailService
{
    public virtual async Task<EmailResult> SendPasswordExpiryNotification(User user)
    {
        // Stub: in production this would send via SMTP/SES
        Console.WriteLine($"[Email] Sending password expiry notification to {user.Email}");
        await Task.CompletedTask;
        return new EmailResult { Sent = true, To = user.Email };
    }
}

public class EmailResult
{
    public bool Sent { get; set; }
    public string To { get; set; } = "";
}
