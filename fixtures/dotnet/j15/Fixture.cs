// PR diff with 4 planted problems for the model to find
// Problem 1: Missing error handling in async
// Problem 2: Query without index (full table scan)
// Problem 3: Secret logged
// Problem 4: Missing null check

class Fixture
{
    const string DIFF = @"
diff --git a/Services/PaymentService.cs b/Services/PaymentService.cs
index a1b2c3d..e4f5g6h 100644
--- a/Services/PaymentService.cs
+++ b/Services/PaymentService.cs
@@ -1,8 +1,55 @@
+using Stripe;
+using Microsoft.Extensions.Logging;
+using System.Data;
+using Dapper;
+
+public class PaymentService
+{
+    private readonly ILogger<PaymentService> _logger;
+    private readonly IDbConnection _db;
+
+    public PaymentService(IDbConnection db, ILogger<PaymentService> logger)
+    {
+        _db = db;
+        _logger = logger;
+        StripeConfiguration.ApiKey = Environment.GetEnvironmentVariable(""STRIPE_KEY"");
+        // PROBLEM 3: Secret logged -- STRIPE_KEY value written to logs
+        _logger.LogInformation(""Payment service initialized with key: "" + Environment.GetEnvironmentVariable(""STRIPE_KEY""));
+    }
+
     public async Task<Charge> ProcessPayment(string userId, decimal amount, string currency = ""usd"")
     {
-        // old implementation
+        // PROBLEM 1: No try/catch -- unhandled exception if Stripe fails
+        var options = new ChargeCreateOptions
+        {
+            Amount = (long)Math.Round(amount * 100),
+            Currency = currency,
+            Customer = userId,
+        };
+
+        var service = new ChargeService();
+        var charge = await service.CreateAsync(options);
+
+        await _db.ExecuteAsync(
+            ""INSERT INTO payments (user_id, charge_id, amount, status) VALUES (@UserId, @ChargeId, @Amount, @Status)"",
+            new { UserId = userId, ChargeId = charge.Id, Amount = amount, Status = charge.Status }
+        );
+
+        return charge;
     }

+    public async Task<IEnumerable<dynamic>> GetPaymentHistory(string userId)
+    {
+        // PROBLEM 2: No index on user_id column -- full table scan on large payments table
+        return await _db.QueryAsync(
+            ""SELECT * FROM payments WHERE user_id = @UserId ORDER BY created_at DESC"",
+            new { UserId = userId }
+        );
+    }

+    public async Task<Refund> RefundPayment(string chargeId)
+    {
+        var payments = (await _db.QueryAsync(
+            ""SELECT * FROM payments WHERE charge_id = @ChargeId"",
+            new { ChargeId = chargeId }
+        )).ToList();
+
+        // PROBLEM 4: Missing null check -- payments[0] throws ArgumentOutOfRangeException if empty
+        var originalAmount = (decimal)payments[0].amount;
+
+        var options = new RefundCreateOptions
+        {
+            Charge = chargeId,
+            Amount = (long)Math.Round(originalAmount * 100),
+        };
+
+        var service = new RefundService();
+        return await service.CreateAsync(options);
+    }
+}
diff --git a/Controllers/PaymentController.cs b/Controllers/PaymentController.cs
index 1234567..abcdefg 100644
--- a/Controllers/PaymentController.cs
+++ b/Controllers/PaymentController.cs
@@ -0,0 +1,30 @@
+using Microsoft.AspNetCore.Mvc;
+
+[ApiController]
+[Route(""payments"")]
+public class PaymentController : ControllerBase
+{
+    private readonly PaymentService _paymentService;
+
+    public PaymentController(PaymentService paymentService)
+    {
+        _paymentService = paymentService;
+    }
+
+    [HttpPost(""charge"")]
+    public async Task<IActionResult> Charge([FromBody] ChargeRequest req)
+    {
+        var user = (User)HttpContext.Items[""User""];
+        var result = await _paymentService.ProcessPayment(user.Id, req.Amount, req.Currency);
+        return Ok(result);
+    }
+
+    [HttpGet(""history"")]
+    public async Task<IActionResult> History()
+    {
+        var user = (User)HttpContext.Items[""User""];
+        var history = await _paymentService.GetPaymentHistory(user.Id);
+        return Ok(history);
+    }
+
+    [HttpPost(""refund/{chargeId}"")]
+    public async Task<IActionResult> Refund(string chargeId)
+    {
+        var refund = await _paymentService.RefundPayment(chargeId);
+        return Ok(refund);
+    }
+}
";
}
