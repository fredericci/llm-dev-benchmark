// Base application with in-memory users store
// The model must generate the Users class with a createUser method that handles validation
// This is a simplified version (no HTTP framework) — validation logic only

import java.util.*;
import java.util.regex.*;

// In-memory users store (pre-populated)
// The Users class must use this shared list
public class Fixture {
    public static final List<Map<String, Object>> users = new ArrayList<>(Arrays.asList(
        new HashMap<>(Map.of("id", 1, "name", "Alice Smith", "email", "alice@example.com")),
        new HashMap<>(Map.of("id", 2, "name", "Bob Jones", "email", "bob@example.com"))
    ));
}

// The model must implement a Users class with:
//
// public class Users {
//     // Shared users list (same reference as Fixture.users)
//     public static List<Map<String, Object>> users = Fixture.users;
//
//     // Result class to represent the response
//     public static class Result {
//         public int status;              // HTTP status code (201, 400, 409)
//         public Map<String, Object> body; // user object on success (without password)
//         public List<String> errors;      // validation errors on 400
//         public String message;           // error message on 409
//     }
//
//     // POST /users equivalent: validate and create a user
//     public static Result createUser(String name, String email, String password) { ... }
// }
//
// Validation rules:
// - name: required (non-null and non-empty), min 2 chars
// - email: valid format (contains @ and .), must be unique in users list
// - password: min 8 chars, at least 1 uppercase letter, at least 1 number
//
// Return codes:
// - 201: user created; body contains id, name, email (NO password)
// - 400: validation failed; errors contains list of error message strings
// - 409: duplicate email; message contains "already exists" (case insensitive)
