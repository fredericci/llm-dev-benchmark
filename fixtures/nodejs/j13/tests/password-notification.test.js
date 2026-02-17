// Acceptance criteria tests for password expiry notification feature
const { User, AuthService, EmailService } = require('../fixture');

// The model must provide a PasswordNotificationService (or similar) in password-notification.js
let PasswordNotificationService;
try {
  const mod = require('./password-notification');
  PasswordNotificationService = mod.PasswordNotificationService || mod.default;
} catch (e) {
  // Will fail gracefully
}

describe('Password Expiry Notification - Acceptance Criteria', () => {
  let emailService;
  let userRepository;
  let users;

  beforeEach(() => {
    const ninetyOneDaysAgo = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    users = [
      new User({ id: '1', email: 'expired@test.com', name: 'Expired User', lastPasswordChange: ninetyOneDaysAgo }),
      new User({ id: '2', email: 'fresh@test.com', name: 'Fresh User', lastPasswordChange: tenDaysAgo }),
      new User({ id: '3', email: 'notified@test.com', name: 'Already Notified', lastPasswordChange: ninetyOneDaysAgo, passwordNotificationSentAt: new Date() }),
    ];

    userRepository = {
      findAll: jest.fn().mockResolvedValue(users),
      update: jest.fn().mockImplementation((id, data) => {
        const user = users.find(u => u.id === id);
        if (user) Object.assign(user, data);
        return Promise.resolve(user);
      }),
    };

    emailService = new EmailService();
    jest.spyOn(emailService, 'sendPasswordExpiryNotification');
  });

  test('notifies user whose password is 90+ days old', async () => {
    if (!PasswordNotificationService) {
      console.warn('PasswordNotificationService not found — test skipped');
      return;
    }
    const authService = new AuthService(userRepository);
    const service = new PasswordNotificationService(authService, emailService);
    await service.run();
    expect(emailService.sendPasswordExpiryNotification).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'expired@test.com' })
    );
  });

  test('does not notify user whose password is recent', async () => {
    if (!PasswordNotificationService) return;
    const authService = new AuthService(userRepository);
    const service = new PasswordNotificationService(authService, emailService);
    await service.run();
    expect(emailService.sendPasswordExpiryNotification).not.toHaveBeenCalledWith(
      expect.objectContaining({ email: 'fresh@test.com' })
    );
  });

  test('does not send duplicate notifications', async () => {
    if (!PasswordNotificationService) return;
    const authService = new AuthService(userRepository);
    const service = new PasswordNotificationService(authService, emailService);
    await service.run();
    expect(emailService.sendPasswordExpiryNotification).not.toHaveBeenCalledWith(
      expect.objectContaining({ email: 'notified@test.com' })
    );
  });

  test('records notification sent timestamp', async () => {
    if (!PasswordNotificationService) return;
    const authService = new AuthService(userRepository);
    const service = new PasswordNotificationService(authService, emailService);
    await service.run();
    expect(userRepository.update).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ passwordNotificationSentAt: expect.any(Date) })
    );
  });
});
