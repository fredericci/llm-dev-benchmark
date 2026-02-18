// Supporting classes for j13 PasswordNotification tests
// These classes are used by both the model-generated PasswordNotificationService and the test suite

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

class User {
    private String id;
    private String email;
    private String name;
    private Instant lastPasswordChange;
    private Instant passwordNotificationSentAt;

    public User(String id, String email, String name, Instant lastPasswordChange, Instant passwordNotificationSentAt) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.lastPasswordChange = (lastPasswordChange != null) ? lastPasswordChange : Instant.now();
        this.passwordNotificationSentAt = passwordNotificationSentAt;
    }

    public String getId() { return id; }
    public String getEmail() { return email; }
    public String getName() { return name; }
    public Instant getLastPasswordChange() { return lastPasswordChange; }
    public Instant getPasswordNotificationSentAt() { return passwordNotificationSentAt; }

    public void setPasswordNotificationSentAt(Instant passwordNotificationSentAt) {
        this.passwordNotificationSentAt = passwordNotificationSentAt;
    }

    public long daysSincePasswordChange() {
        return ChronoUnit.DAYS.between(lastPasswordChange, Instant.now());
    }
}

interface UserRepository {
    List<User> findAll();
    User update(String userId, User data);
}

class AuthService {
    private UserRepository userRepository;

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User updateUser(String userId, User data) {
        return userRepository.update(userId, data);
    }

    public UserRepository getUserRepository() {
        return userRepository;
    }
}

class EmailService {
    public boolean sendPasswordExpiryNotification(User user) {
        // Stub: in production this would send via SMTP/SES
        System.out.println("[Email] Sending password expiry notification to " + user.getEmail());
        return true;
    }
}
