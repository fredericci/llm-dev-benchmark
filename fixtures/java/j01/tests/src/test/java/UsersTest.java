import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class UsersTest {

    @BeforeEach
    void setUp() {
        // Reset users list to initial state before each test
        Fixture.users.clear();
        Fixture.users.add(new HashMap<>(Map.of("id", 1, "name", "Alice Smith", "email", "alice@example.com")));
        Fixture.users.add(new HashMap<>(Map.of("id", 2, "name", "Bob Jones", "email", "bob@example.com")));
    }

    @Test
    void createsUserWithValidDataAndReturns201() {
        Users.Result res = Users.createUser("Charlie Brown", "charlie@example.com", "Password1");
        assertEquals(201, res.status);
        assertNotNull(res.body);
        assertNotNull(res.body.get("id"));
        assertEquals("Charlie Brown", res.body.get("name"));
        assertEquals("charlie@example.com", res.body.get("email"));
    }

    @Test
    void doesNotReturnPasswordInResponse() {
        Users.Result res = Users.createUser("Dave Example", "dave@example.com", "Secure123");
        assertEquals(201, res.status);
        assertFalse(res.body.containsKey("password"));
    }

    @Test
    void returns400WhenNameIsMissing() {
        Users.Result res = Users.createUser(null, "missing@example.com", "Password1");
        assertEquals(400, res.status);
        assertNotNull(res.errors);
        assertTrue(res.errors.size() > 0);
    }

    @Test
    void returns400WhenNameIsTooShort() {
        Users.Result res = Users.createUser("A", "short@example.com", "Password1");
        assertEquals(400, res.status);
        assertNotNull(res.errors);
        assertTrue(res.errors.size() > 0);
    }

    @Test
    void returns400WhenEmailIsInvalidFormat() {
        Users.Result res = Users.createUser("Valid Name", "not-an-email", "Password1");
        assertEquals(400, res.status);
        assertNotNull(res.errors);
        assertTrue(res.errors.size() > 0);
    }

    @Test
    void returns400WhenPasswordIsTooShort() {
        Users.Result res = Users.createUser("Valid Name", "valid@example.com", "abc");
        assertEquals(400, res.status);
        assertNotNull(res.errors);
        assertTrue(res.errors.size() > 0);
    }

    @Test
    void returns400WhenPasswordHasNoUppercaseLetter() {
        Users.Result res = Users.createUser("Valid Name", "valid2@example.com", "password1");
        assertEquals(400, res.status);
        assertNotNull(res.errors);
        assertTrue(res.errors.size() > 0);
    }

    @Test
    void returns409WhenEmailAlreadyExists() {
        Users.Result res = Users.createUser("Alice Copy", "alice@example.com", "Password1");
        assertEquals(409, res.status);
        assertNotNull(res.message);
        assertTrue(res.message.toLowerCase().contains("already exists"));
    }
}
