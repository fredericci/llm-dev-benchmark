// Acceptance criteria tests for password expiry notification feature
// Functionally equivalent to the Node.js password-notification.test.js

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;

class PasswordNotificationTest {

    private EmailService emailService;
    private UserRepository userRepository;
    private List<User> users;

    @BeforeEach
    void setUp() {
        Instant ninetyOneDaysAgo = Instant.now().minus(91, ChronoUnit.DAYS);
        Instant tenDaysAgo = Instant.now().minus(10, ChronoUnit.DAYS);

        users = Arrays.asList(
            new User("1", "expired@test.com", "Expired User", ninetyOneDaysAgo, null),
            new User("2", "fresh@test.com", "Fresh User", tenDaysAgo, null),
            new User("3", "notified@test.com", "Already Notified", ninetyOneDaysAgo, Instant.now())
        );

        userRepository = mock(UserRepository.class);
        when(userRepository.findAll()).thenReturn(users);
        when(userRepository.update(anyString(), any(User.class))).thenAnswer(invocation -> {
            String userId = invocation.getArgument(0);
            User data = invocation.getArgument(1);
            User user = users.stream().filter(u -> u.getId().equals(userId)).findFirst().orElse(null);
            if (user != null && data.getPasswordNotificationSentAt() != null) {
                user.setPasswordNotificationSentAt(data.getPasswordNotificationSentAt());
            }
            return user;
        });

        emailService = spy(new EmailService());
    }

    @Test
    void notifiesUserWhosePasswordIs90PlusDaysOld() {
        AuthService authService = new AuthService(userRepository);
        PasswordNotificationService service = new PasswordNotificationService(authService, emailService);
        service.run();

        verify(emailService).sendPasswordExpiryNotification(
            argThat(user -> "expired@test.com".equals(user.getEmail()))
        );
    }

    @Test
    void doesNotNotifyUserWhosePasswordIsRecent() {
        AuthService authService = new AuthService(userRepository);
        PasswordNotificationService service = new PasswordNotificationService(authService, emailService);
        service.run();

        verify(emailService, never()).sendPasswordExpiryNotification(
            argThat(user -> "fresh@test.com".equals(user.getEmail()))
        );
    }

    @Test
    void doesNotSendDuplicateNotifications() {
        AuthService authService = new AuthService(userRepository);
        PasswordNotificationService service = new PasswordNotificationService(authService, emailService);
        service.run();

        verify(emailService, never()).sendPasswordExpiryNotification(
            argThat(user -> "notified@test.com".equals(user.getEmail()))
        );
    }

    @Test
    void recordsNotificationSentTimestamp() {
        AuthService authService = new AuthService(userRepository);
        PasswordNotificationService service = new PasswordNotificationService(authService, emailService);
        service.run();

        verify(userRepository).update(
            eq("1"),
            argThat(user -> user.getPasswordNotificationSentAt() != null)
        );
    }
}
