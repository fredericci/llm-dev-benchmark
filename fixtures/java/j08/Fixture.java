// Spring Boot 2.7 Security configuration using deprecated patterns
// The model must migrate this to Spring Boot 3.x (jakarta.*, SecurityFilterChain, requestMatchers)

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Email;

import org.springframework.security.config.annotation.web.configuration.WebSecurityConfigurerAdapter;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.*;

// --- Entity using javax.persistence ---

@Entity
class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull
    private String name;

    @Email
    private String email;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}

// --- Security config using WebSecurityConfigurerAdapter (deprecated in Spring Boot 3.x) ---

@Configuration
class SecurityConfig extends WebSecurityConfigurerAdapter {

    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http
            .csrf().disable()
            .authorizeRequests()
                .antMatchers("/api/public/**").permitAll()
                .antMatchers("/api/admin/**").hasRole("ADMIN")
                .antMatchers("/api/users/**").authenticated()
                .anyRequest().authenticated()
            .and()
            .httpBasic();
    }
}

// --- REST controller using javax.servlet ---

@RestController
@RequestMapping("/api/users")
class UserController {

    public String handleRequest(HttpServletRequest request, HttpServletResponse response) {
        String method = request.getMethod();
        response.setContentType("application/json");
        return "{\"method\": \"" + method + "\"}";
    }

    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        User user = new User();
        user.setId(id);
        user.setName("Test User");
        user.setEmail("test@example.com");
        return user;
    }

    @PostMapping
    public User createUser(@RequestBody User user) {
        return user;
    }

    @PutMapping("/{id}")
    public User updateUser(@PathVariable Long id, @RequestBody User user) {
        user.setId(id);
        return user;
    }
}
