// E-commerce API with 5 planted security vulnerabilities
// The model must find ALL of them

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.Claims;

class ECommerceApi {

    private Connection db;

    // VULNERABILITY 1: Hardcoded API secret
    private static final String API_SECRET = "super-secret-key-hardcoded-12345";

    ECommerceApi() throws Exception {
        db = DriverManager.getConnection("jdbc:sqlite::memory:");
        Statement stmt = db.createStatement();
        stmt.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, role TEXT, password TEXT)");
        stmt.execute("CREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER, amount REAL)");
    }

    // Auth filter
    Claims authenticate(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null; // 401 No token
        }
        String token = authHeader.substring(7);

        // VULNERABILITY 2: JWT decoded without verifying signature or expiration
        Claims claims = Jwts.parserBuilder().build()
                .parseClaimsJwt(token) // should use parseClaimsJws() with signing key
                .getBody();
        return claims;
    }

    // Get user orders
    ResultSet getUserOrders(HttpServletRequest request, String userId) throws Exception {
        Claims user = authenticate(request);
        if (user == null) return null;

        // VULNERABILITY 3: SQL injection via string concatenation
        Statement stmt = db.createStatement();
        ResultSet rs = stmt.executeQuery("SELECT * FROM orders WHERE user_id = '" + userId + "'");
        return rs;
    }

    // Search users
    Object searchUser(HttpServletRequest request, String email) throws Exception {
        Claims user = authenticate(request);
        if (user == null) return null;

        PreparedStatement ps = db.prepareStatement("SELECT * FROM users WHERE email = ?");
        ps.setString(1, email);
        ResultSet rs = ps.executeQuery();

        if (rs.next()) {
            String foundEmail = rs.getString("email");
            String password = rs.getString("password");
            String role = rs.getString("role");
            // VULNERABILITY 4: PII logged in plaintext
            System.out.println("User login: email=" + foundEmail + ", password=" + password + ", role=" + role);
        }
        return rs;
    }

    // VULNERABILITY 5: Admin endpoint with no authentication check
    void deleteUser(String id) throws Exception {
        PreparedStatement ps = db.prepareStatement("DELETE FROM users WHERE id = ?");
        ps.setInt(1, Integer.parseInt(id));
        ps.executeUpdate();
        // returns { deleted: id } equivalent
    }
}
