// PR diff with 4 planted problems for the model to find
// Problem 1: Missing error handling in async
// Problem 2: Query without index (full table scan)
// Problem 3: Secret logged
// Problem 4: Missing null check

class Fixture {
    static final String DIFF = """
diff --git a/src/main/java/com/example/service/PaymentService.java b/src/main/java/com/example/service/PaymentService.java
index a1b2c3d..e4f5g6h 100644
--- a/src/main/java/com/example/service/PaymentService.java
+++ b/src/main/java/com/example/service/PaymentService.java
@@ -1,8 +1,52 @@
+import com.stripe.Stripe;
+import com.stripe.model.Charge;
+import com.stripe.model.Refund;
+import com.stripe.param.ChargeCreateParams;
+import com.stripe.param.RefundCreateParams;
+import org.slf4j.Logger;
+import org.slf4j.LoggerFactory;
+import org.springframework.jdbc.core.JdbcTemplate;
+
+public class PaymentService {
+
+    private static final Logger logger = LoggerFactory.getLogger(PaymentService.class);
+    private final JdbcTemplate db;
+
+    public PaymentService(JdbcTemplate db) {
+        this.db = db;
+        Stripe.apiKey = System.getenv("STRIPE_KEY");
+        // PROBLEM 3: Secret logged -- STRIPE_KEY value written to logs
+        logger.info("Payment service initialized with key: " + System.getenv("STRIPE_KEY"));
+    }
+
     public Charge processPayment(String userId, double amount, String currency) {
-        // old implementation
+        // PROBLEM 1: No try/catch -- unhandled exception if Stripe fails
+        ChargeCreateParams params = ChargeCreateParams.builder()
+            .setAmount((long) Math.round(amount * 100))
+            .setCurrency(currency != null ? currency : "usd")
+            .setCustomer(userId)
+            .build();
+
+        Charge charge = Charge.create(params);
+
+        db.update(
+            "INSERT INTO payments (user_id, charge_id, amount, status) VALUES (?, ?, ?, ?)",
+            userId, charge.getId(), amount, charge.getStatus()
+        );
+
+        return charge;
     }

+    public List<Map<String, Object>> getPaymentHistory(String userId) {
+        // PROBLEM 2: No index on user_id column -- full table scan on large payments table
+        return db.queryForList(
+            "SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC",
+            userId
+        );
+    }

+    public Refund refundPayment(String chargeId) {
+        List<Map<String, Object>> payments = db.queryForList(
+            "SELECT * FROM payments WHERE charge_id = ?", chargeId
+        );
+
+        // PROBLEM 4: Missing null check -- payments.get(0) throws IndexOutOfBoundsException if empty
+        double originalAmount = ((Number) payments.get(0).get("amount")).doubleValue();
+
+        RefundCreateParams params = RefundCreateParams.builder()
+            .setCharge(chargeId)
+            .setAmount((long) Math.round(originalAmount * 100))
+            .build();
+
+        return Refund.create(params);
+    }
+}
diff --git a/src/main/java/com/example/controller/PaymentController.java b/src/main/java/com/example/controller/PaymentController.java
index 1234567..abcdefg 100644
--- a/src/main/java/com/example/controller/PaymentController.java
+++ b/src/main/java/com/example/controller/PaymentController.java
@@ -0,0 +1,30 @@
+import org.springframework.web.bind.annotation.*;
+
+@RestController
+@RequestMapping("/payments")
+public class PaymentController {
+
+    private final PaymentService paymentService;
+
+    public PaymentController(PaymentService paymentService) {
+        this.paymentService = paymentService;
+    }
+
+    @PostMapping("/charge")
+    public Charge charge(@RequestAttribute("user") User user, @RequestBody ChargeRequest req) {
+        return paymentService.processPayment(user.getId(), req.getAmount(), req.getCurrency());
+    }
+
+    @GetMapping("/history")
+    public List<Map<String, Object>> history(@RequestAttribute("user") User user) {
+        return paymentService.getPaymentHistory(user.getId());
+    }
+
+    @PostMapping("/refund/{chargeId}")
+    public Refund refund(@PathVariable String chargeId) {
+        return paymentService.refundPayment(chargeId);
+    }
+}
""";
}
