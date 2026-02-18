// Tests for the migrated Spring Boot 3.x code
// Verifies that javax.* imports are replaced with jakarta.*,
// WebSecurityConfigurerAdapter is replaced with SecurityFilterChain,
// and antMatchers is replaced with requestMatchers.

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import static org.junit.jupiter.api.Assertions.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

class HttpClientTest {

    private String sourceCode;

    @BeforeEach
    void setUp() throws IOException {
        // Read the model's generated file
        Path implPath = Path.of("src/main/java/HttpClient.java");
        sourceCode = Files.readString(implPath);
    }

    @Test
    void usesJakartaInsteadOfJavax() {
        // Must not contain javax.servlet, javax.persistence, or javax.validation
        assertFalse(sourceCode.contains("javax.servlet"),
                "Code should not use javax.servlet — must use jakarta.servlet");
        assertFalse(sourceCode.contains("javax.persistence"),
                "Code should not use javax.persistence — must use jakarta.persistence");
        assertFalse(sourceCode.contains("javax.validation"),
                "Code should not use javax.validation — must use jakarta.validation");
    }

    @Test
    void usesJakartaImports() {
        // Must contain at least one jakarta import
        boolean hasJakartaServlet = sourceCode.contains("jakarta.servlet");
        boolean hasJakartaPersistence = sourceCode.contains("jakarta.persistence");
        boolean hasJakartaValidation = sourceCode.contains("jakarta.validation");
        assertTrue(hasJakartaServlet || hasJakartaPersistence || hasJakartaValidation,
                "Code should use jakarta.* imports (servlet, persistence, or validation)");
    }

    @Test
    void doesNotUseWebSecurityConfigurerAdapter() {
        assertFalse(sourceCode.contains("WebSecurityConfigurerAdapter"),
                "Code should not extend WebSecurityConfigurerAdapter — use SecurityFilterChain bean instead");
    }

    @Test
    void usesSecurityFilterChain() {
        assertTrue(sourceCode.contains("SecurityFilterChain"),
                "Code should define a SecurityFilterChain bean");
    }

    @Test
    void usesRequestMatchersInsteadOfAntMatchers() {
        assertFalse(sourceCode.contains("antMatchers"),
                "Code should not use antMatchers — must use requestMatchers");
        assertTrue(sourceCode.contains("requestMatchers"),
                "Code should use requestMatchers instead of antMatchers");
    }

    @Test
    void preservesSecurityRules() {
        // The migrated code should still contain the endpoint patterns
        assertTrue(sourceCode.contains("/api/public/"),
                "Code should preserve /api/public/ endpoint pattern");
        assertTrue(sourceCode.contains("/api/admin/"),
                "Code should preserve /api/admin/ endpoint pattern");
        assertTrue(sourceCode.contains("/api/users/"),
                "Code should preserve /api/users/ endpoint pattern");
    }

    @Test
    void preservesEntityAnnotations() {
        assertTrue(sourceCode.contains("@Entity"),
                "Code should preserve @Entity annotation");
        assertTrue(sourceCode.contains("@Id"),
                "Code should preserve @Id annotation");
    }

    @Test
    void preservesRestControllerStructure() {
        assertTrue(sourceCode.contains("@RestController"),
                "Code should preserve @RestController annotation");
        assertTrue(sourceCode.contains("@GetMapping"),
                "Code should preserve @GetMapping annotation");
        assertTrue(sourceCode.contains("@PostMapping"),
                "Code should preserve @PostMapping annotation");
    }
}
