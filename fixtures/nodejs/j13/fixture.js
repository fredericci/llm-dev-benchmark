// Existing codebase for feature-from-issue task
// User, AuthService, and EmailService stubs

class User {
  constructor({ id, email, name, lastPasswordChange, passwordNotificationSentAt }) {
    this.id = id;
    this.email = email;
    this.name = name;
    this.lastPasswordChange = lastPasswordChange ?? new Date();
    this.passwordNotificationSentAt = passwordNotificationSentAt ?? null;
  }

  daysSincePasswordChange() {
    const now = new Date();
    const diff = now - this.lastPasswordChange;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}

class AuthService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async getAllUsers() {
    return this.userRepository.findAll();
  }

  async updateUser(userId, data) {
    return this.userRepository.update(userId, data);
  }
}

class EmailService {
  async sendPasswordExpiryNotification(user) {
    // Stub: in production this would send via SMTP/SES
    console.log(`[Email] Sending password expiry notification to ${user.email}`);
    return { sent: true, to: user.email };
  }
}

module.exports = { User, AuthService, EmailService };
