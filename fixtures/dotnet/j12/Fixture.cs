// Synthetic e-commerce codebase for explanation task
// Condensed representation of ~40 files

// === Program.cs (Main Entry Point) ===
// var builder = WebApplication.CreateBuilder(args);
// builder.Services.AddControllers();
// builder.Services.AddDbContext<AppDbContext>();
// builder.Services.AddStackExchangeRedisCache(...);
// var app = builder.Build();
// app.MapControllers();
// Routes registered via [ApiController] attributes:
//   /api/auth -> AuthController
//   /api/products -> ProductController
//   /api/cart -> CartController (requires CartMiddleware)
//   /api/checkout -> CheckoutController (requires AuthMiddleware + CartMiddleware)

// === Middleware/AuthMiddleware.cs ===
// Verifies JWT token from Authorization header
// Sets HttpContext.Items["User"] = { Id, Email, Role } if valid
// Returns 401 if token missing or expired
// public class AuthMiddleware {
//     public async Task InvokeAsync(HttpContext context, IConfiguration config) {
//         var token = context.Request.Headers["Authorization"].ToString();
//         if (string.IsNullOrEmpty(token) || !token.StartsWith("Bearer ")) {
//             context.Response.StatusCode = 401; return;
//         }
//         try {
//             var handler = new JwtSecurityTokenHandler();
//             var principal = handler.ValidateToken(token.Substring(7), validationParams, out _);
//             context.Items["User"] = principal.Claims;
//             await _next(context);
//         } catch { context.Response.StatusCode = 401; }
//     }
// }

// === Controllers/AuthController.cs ===
// POST /api/auth/register -- creates user, returns JWT
// POST /api/auth/login -- validates credentials, returns JWT
// POST /api/auth/refresh -- accepts refresh token, returns new access token
// Passwords hashed with BCrypt.Net (workFactor=12)
// JWT expiry: 1h access, 7d refresh

// === Controllers/ProductController.cs ===
// GET /api/products -- list with pagination (?page=1&pageSize=20)
// GET /api/products/{id} -- single product
// POST /api/products -- admin only ([Authorize(Roles = "Admin")])
// PUT /api/products/{id} -- admin only
// DELETE /api/products/{id} -- admin only (soft delete, sets DeletedAt)
// No caching implemented -- direct DB queries on every request (TECH DEBT)

// === Controllers/CartController.cs ===
// Cart stored in Redis with key cart:{userId}
// GET /api/cart -- returns current cart items
// POST /api/cart/items -- add item (checks inventory via ProductRepository)
// DELETE /api/cart/items/{productId} -- remove item
// Inventory not reserved during cart session -- race condition possible (TECH DEBT)

// === Controllers/CheckoutController.cs ===
// POST /api/checkout -- processes cart into order
// Validates inventory at checkout time
// Creates Order + OrderItems in a database transaction (using IDbContextTransaction)
// Calls external payment processor (Stripe via PaymentService)
// Sends confirmation email (no retry on failure -- TECH DEBT)

// === Models/User.cs ===
// public class User { ... }
// Id (int), Email (unique), PasswordHash, Role (User|Admin), CreatedAt, LastLogin
// EF Core entity, PostgreSQL backend (Npgsql)

// === Models/Product.cs ===
// public class Product { ... }
// Id (int), Name, Description, Price (decimal), Stock (int), CategoryId, DeletedAt (soft delete)
// No database indexes on CategoryId or Price (TECH DEBT)

// === Models/Order.cs ===
// public class Order { ... }
// Id (int), UserId, Status (Pending|Paid|Shipped|Delivered|Cancelled), Total (decimal), CreatedAt
// ICollection<OrderItem> Items navigation property

// === Models/OrderItem.cs ===
// public class OrderItem { ... }
// Id (int), OrderId, ProductId, Quantity, UnitPrice (decimal, snapshot at purchase time)

// === Services/PaymentService.cs ===
// Wraps Stripe.net SDK
// CreateCharge(amount, currency, source) -- returns ChargeResult { ChargeId, Status }
// No idempotency keys implemented (TECH DEBT -- duplicate charges possible)

// === Data/AppDbContext.cs ===
// PostgreSQL via Npgsql (EF Core provider)
// Connection pool: MinPoolSize=2, MaxPoolSize=10 (hardcoded in connection string, not configurable via appsettings)

// === Configuration/RedisConfig.cs ===
// Redis client for cart storage via StackExchange.Redis
// No connection error handling -- app crashes if Redis unavailable

class Fixture
{
    // placeholder for the condensed codebase representation
}
