// Acceptance criteria tests for password expiry notification feature
// The model must provide a PasswordNotificationService class in PasswordNotification.cs
using Moq;
using Xunit;

public class PasswordNotificationTests
{
    private Mock<IUserRepository> _mockRepo = null!;
    private Mock<EmailService> _mockEmailService = null!;
    private List<User> _users = null!;

    private void SetUp()
    {
        var ninetyOneDaysAgo = DateTime.UtcNow.AddDays(-91);
        var tenDaysAgo = DateTime.UtcNow.AddDays(-10);

        _users = new List<User>
        {
            new User
            {
                Id = "1",
                Email = "expired@test.com",
                Name = "Expired User",
                LastPasswordChange = ninetyOneDaysAgo,
                PasswordNotificationSentAt = null
            },
            new User
            {
                Id = "2",
                Email = "fresh@test.com",
                Name = "Fresh User",
                LastPasswordChange = tenDaysAgo,
                PasswordNotificationSentAt = null
            },
            new User
            {
                Id = "3",
                Email = "notified@test.com",
                Name = "Already Notified",
                LastPasswordChange = ninetyOneDaysAgo,
                PasswordNotificationSentAt = DateTime.UtcNow
            }
        };

        _mockRepo = new Mock<IUserRepository>();
        _mockRepo.Setup(r => r.FindAll()).ReturnsAsync(_users);
        _mockRepo.Setup(r => r.Update(It.IsAny<string>(), It.IsAny<UserUpdateData>()))
            .ReturnsAsync((string id, UserUpdateData data) =>
            {
                var user = _users.Find(u => u.Id == id);
                if (user != null && data.PasswordNotificationSentAt.HasValue)
                {
                    user.PasswordNotificationSentAt = data.PasswordNotificationSentAt;
                }
                return user;
            });

        _mockEmailService = new Mock<EmailService>();
        _mockEmailService
            .Setup(e => e.SendPasswordExpiryNotification(It.IsAny<User>()))
            .ReturnsAsync((User u) => new EmailResult { Sent = true, To = u.Email });
    }

    [Fact]
    public async Task Notifies_User_Whose_Password_Is_90_Plus_Days_Old()
    {
        SetUp();
        var authService = new AuthService(_mockRepo.Object);
        var service = new PasswordNotificationService(authService, _mockEmailService.Object);
        await service.Run();

        _mockEmailService.Verify(
            e => e.SendPasswordExpiryNotification(It.Is<User>(u => u.Email == "expired@test.com")),
            Times.Once);
    }

    [Fact]
    public async Task Does_Not_Notify_User_Whose_Password_Is_Recent()
    {
        SetUp();
        var authService = new AuthService(_mockRepo.Object);
        var service = new PasswordNotificationService(authService, _mockEmailService.Object);
        await service.Run();

        _mockEmailService.Verify(
            e => e.SendPasswordExpiryNotification(It.Is<User>(u => u.Email == "fresh@test.com")),
            Times.Never);
    }

    [Fact]
    public async Task Does_Not_Send_Duplicate_Notifications()
    {
        SetUp();
        var authService = new AuthService(_mockRepo.Object);
        var service = new PasswordNotificationService(authService, _mockEmailService.Object);
        await service.Run();

        _mockEmailService.Verify(
            e => e.SendPasswordExpiryNotification(It.Is<User>(u => u.Email == "notified@test.com")),
            Times.Never);
    }

    [Fact]
    public async Task Records_Notification_Sent_Timestamp()
    {
        SetUp();
        var authService = new AuthService(_mockRepo.Object);
        var service = new PasswordNotificationService(authService, _mockEmailService.Object);
        await service.Run();

        _mockRepo.Verify(
            r => r.Update("1", It.Is<UserUpdateData>(d => d.PasswordNotificationSentAt.HasValue)),
            Times.Once);
    }
}
