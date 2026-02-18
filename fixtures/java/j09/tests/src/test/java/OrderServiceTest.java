// Tests for OrderService — verifies that the null-pointer bug is fixed
// Functionally equivalent to the Node.js order-service.test.js

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class OrderServiceTest {

    @Test
    void successfullyCreatesOrderForExistingProduct() {
        Order order = new Order("prod-1", 2);
        OrderResult result = OrderService.processOrder(order);

        assertNotNull(result, "Result should not be null");
        assertNotNull(result.getOrderId(), "Order ID should be set");
        assertTrue(result.getOrderId().startsWith("ORD-"), "Order ID should start with ORD-");
        assertEquals(59.98, result.getTotal(), 0.01, "Total should be 29.99 * 2 = 59.98");
        assertEquals("confirmed", result.getStatus(), "Status should be confirmed");
    }

    @Test
    void throwsDescriptiveErrorForMissingProduct() {
        Order order = new Order("non-existent-product", 1);

        Exception exception = assertThrows(Exception.class, () -> {
            OrderService.processOrder(order);
        });

        String message = exception.getMessage().toLowerCase();
        assertTrue(
            message.contains("not found") || message.contains("does not exist") || message.contains("product"),
            "Error message should mention product not found, got: " + exception.getMessage()
        );
    }

    @Test
    void doesNotThrowNullPointerForMissingProduct() {
        Order order = new Order("does-not-exist", 1);

        Exception exception = assertThrows(Exception.class, () -> {
            OrderService.processOrder(order);
        });

        // The fix should throw a descriptive error, NOT a NullPointerException
        assertFalse(exception instanceof NullPointerException,
                "Should not throw NullPointerException — should have a proper null check");
    }

    @Test
    void processOrderReturnsCorrectTotal() {
        Order order = new Order("prod-2", 3);
        OrderResult result = OrderService.processOrder(order);

        assertEquals(149.97, result.getTotal(), 0.01, "Total should be 49.99 * 3 = 149.97");
        assertEquals("confirmed", result.getStatus(), "Status should be confirmed");
    }
}
