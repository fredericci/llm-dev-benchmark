// Synthetic e-commerce codebase for explanation task
// Condensed representation of ~40 files

// === Application.java (Main Entry Point) ===
// @SpringBootApplication
// public class Application {
//     public static void main(String[] args) { SpringApplication.run(Application.class, args); }
// }
// Routes registered via @RestController annotations:
//   /api/auth -> AuthController
//   /api/products -> ProductController
//   /api/cart -> CartController (requires cartFilter)
//   /api/checkout -> CheckoutController (requires authFilter + cartFilter)

// === filter/AuthFilter.java ===
// Verifies JWT token from Authorization header
// Sets request attribute "user" = { id, email, role } if valid
// Returns 401 if token missing or expired
// @Component
// public class AuthFilter extends OncePerRequestFilter {
//     @Override
//     protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) {
//         String token = request.getHeader("Authorization");
//         if (token == null || !token.startsWith("Bearer ")) {
//             response.sendError(401, "No token"); return;
//         }
//         try {
//             Claims claims = Jwts.parserBuilder().setSigningKey(secretKey).build()
//                 .parseClaimsJws(token.substring(7)).getBody();
//             request.setAttribute("user", claims);
//             chain.doFilter(request, response);
//         } catch (Exception e) { response.sendError(401, "Invalid token"); }
//     }
// }

// === controller/AuthController.java ===
// POST /api/auth/register -- creates user, returns JWT
// POST /api/auth/login -- validates credentials, returns JWT
// POST /api/auth/refresh -- accepts refresh token, returns new access token
// Passwords hashed with BCrypt (strength=12)
// JWT expiry: 1h access, 7d refresh

// === controller/ProductController.java ===
// GET /api/products -- list with pagination (?page=0&size=20)
// GET /api/products/{id} -- single product
// POST /api/products -- admin only (@PreAuthorize("hasRole('ADMIN')"))
// PUT /api/products/{id} -- admin only
// DELETE /api/products/{id} -- admin only (soft delete, sets deletedAt)
// No caching implemented -- direct DB queries on every request (TECH DEBT)

// === controller/CartController.java ===
// Cart stored in Redis with key cart:{userId}
// GET /api/cart -- returns current cart items
// POST /api/cart/items -- add item (checks inventory via ProductRepository)
// DELETE /api/cart/items/{productId} -- remove item
// Inventory not reserved during cart session -- race condition possible (TECH DEBT)

// === controller/CheckoutController.java ===
// POST /api/checkout -- processes cart into order
// Validates inventory at checkout time
// Creates Order + OrderItems in a @Transactional method
// Calls external payment processor (Stripe via PaymentService)
// Sends confirmation email (no retry on failure -- TECH DEBT)

// === model/User.java ===
// @Entity
// id (Long), email (unique), passwordHash, role (USER|ADMIN), createdAt, lastLogin
// JPA entity, PostgreSQL backend

// === model/Product.java ===
// @Entity
// id (Long), name, description, price (BigDecimal), stock (int), categoryId, deletedAt (soft delete)
// No database indexes on categoryId or price (TECH DEBT)

// === model/Order.java ===
// @Entity
// id (Long), userId, status (PENDING|PAID|SHIPPED|DELIVERED|CANCELLED), total (BigDecimal), createdAt
// @OneToMany List<OrderItem> items

// === model/OrderItem.java ===
// @Entity
// id (Long), orderId, productId, quantity, unitPrice (BigDecimal, snapshot at purchase time)

// === service/PaymentService.java ===
// Wraps Stripe Java SDK
// createCharge(amount, currency, source) -- returns ChargeResult { chargeId, status }
// No idempotency keys implemented (TECH DEBT -- duplicate charges possible)

// === config/DatabaseConfig.java ===
// PostgreSQL via HikariCP connection pool (Spring Boot default)
// Pool: minimumIdle=2, maximumPoolSize=10 (hardcoded, not configurable via properties)

// === config/RedisConfig.java ===
// Redis client for cart storage via Lettuce
// No connection error handling -- app crashes if Redis unavailable

class Fixture {
    // placeholder for the condensed codebase representation
}
