import org.junit.jupiter.api.Test;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class OrderProcessorTest {

    private OrderProcessor.Mailer createMockMailer() {
        return mock(OrderProcessor.Mailer.class);
    }

    private OrderProcessor.Logger createMockLogger() {
        return mock(OrderProcessor.Logger.class);
    }

    private Map<String, Object> makeOrder(String id, String customerType, String customerEmail,
                                           List<Map<String, Object>> items, String paymentMethod) {
        Map<String, Object> order = new HashMap<>();
        order.put("id", id);
        Map<String, Object> customer = new HashMap<>();
        customer.put("type", customerType);
        customer.put("email", customerEmail);
        order.put("customer", customer);
        order.put("items", items);
        order.put("paymentMethod", paymentMethod);
        return order;
    }

    private List<Map<String, Object>> makeItems(double price, int quantity) {
        List<Map<String, Object>> items = new ArrayList<>();
        Map<String, Object> item = new HashMap<>();
        item.put("price", price);
        item.put("quantity", quantity);
        items.add(item);
        return items;
    }

    private List<Map<String, Object>> makeNItems(int count, double price, int quantity) {
        List<Map<String, Object>> items = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            Map<String, Object> item = new HashMap<>();
            item.put("price", price);
            item.put("quantity", quantity);
            items.add(item);
        }
        return items;
    }

    @Test
    void calculatesCorrectTotalForStandardCustomerWithFewItems() {
        OrderProcessor.Mailer mailer = createMockMailer();
        OrderProcessor.Logger logger = createMockLogger();
        OrderProcessor processor = new OrderProcessor(new Object(), mailer, logger);

        Map<String, Object> order = makeOrder("1", "standard", "test@test.com",
                makeItems(100, 2), "cash");
        Map<String, Object> result = processor.processOrder(order);

        double expected = 200 + 19.99; // no discount, low shipping
        assertEquals(expected, ((Number) result.get("total")).doubleValue(), 0.1);
    }

    @Test
    void applies10PercentDiscountForStandardCustomerWithMoreThan10Items() {
        OrderProcessor.Mailer mailer = createMockMailer();
        OrderProcessor.Logger logger = createMockLogger();
        OrderProcessor processor = new OrderProcessor(new Object(), mailer, logger);

        List<Map<String, Object>> items = makeNItems(11, 10, 1);
        Map<String, Object> order = makeOrder("2", "standard", "test@test.com", items, "cash");
        Map<String, Object> result = processor.processOrder(order);

        double expectedSubtotal = 110 * 0.9;
        assertEquals(expectedSubtotal + 19.99, ((Number) result.get("total")).doubleValue(), 0.1);
    }

    @Test
    void applies15PercentDiscountForVipCustomerWithFewItems() {
        OrderProcessor.Mailer mailer = createMockMailer();
        OrderProcessor.Logger logger = createMockLogger();
        OrderProcessor processor = new OrderProcessor(new Object(), mailer, logger);

        Map<String, Object> order = makeOrder("3", "vip", "vip@test.com",
                makeItems(200, 1), "cash");
        Map<String, Object> result = processor.processOrder(order);

        assertEquals(200 * 0.85 + 19.99, ((Number) result.get("total")).doubleValue(), 0.1);
    }

    @Test
    void sendsConfirmationEmailWhenProcessingOrder() {
        OrderProcessor.Mailer mailer = createMockMailer();
        OrderProcessor.Logger logger = createMockLogger();
        OrderProcessor processor = new OrderProcessor(new Object(), mailer, logger);

        Map<String, Object> order = makeOrder("4", "standard", "notify@test.com",
                makeItems(50, 1), "cash");
        processor.processOrder(order);

        verify(mailer).send(argThat(msg ->
                "notify@test.com".equals(msg.get("to")) &&
                "Order Confirmation".equals(msg.get("subject"))
        ));
    }

    @Test
    void cancelsNonShippedOrderAndSendsEmail() {
        OrderProcessor.Mailer mailer = createMockMailer();
        OrderProcessor.Logger logger = createMockLogger();
        OrderProcessor processor = new OrderProcessor(new Object(), mailer, logger);

        Map<String, Object> order = makeOrder("5", "standard", "cancel@test.com",
                makeItems(50, 1), "cash");
        processor.processOrder(order);
        boolean cancelled = processor.cancelOrder("5", "Changed mind");

        assertTrue(cancelled);
        verify(mailer).send(argThat(msg ->
                "Order Cancelled".equals(msg.get("subject"))
        ));
    }

    @Test
    void cannotCancelShippedOrder() {
        OrderProcessor.Mailer mailer = createMockMailer();
        OrderProcessor.Logger logger = createMockLogger();
        OrderProcessor processor = new OrderProcessor(new Object(), mailer, logger);

        Map<String, Object> order = new HashMap<>();
        order.put("id", "6");
        order.put("status", "shipped");
        Map<String, Object> customer = new HashMap<>();
        customer.put("type", "standard");
        customer.put("email", "test@test.com");
        order.put("customer", customer);
        order.put("items", makeItems(50, 1));
        order.put("paymentMethod", "cash");
        order.put("total", 69.99);
        processor.orders.add(order);

        boolean cancelled = processor.cancelOrder("6", "Too late");
        assertFalse(cancelled);
    }

    @Test
    void returnsOutOfStockForZeroQuantityInventory() {
        OrderProcessor.Mailer mailer = createMockMailer();
        OrderProcessor.Logger logger = createMockLogger();
        OrderProcessor processor = new OrderProcessor(new Object(), mailer, logger);

        Map<String, Object> inventoryItem = new HashMap<>();
        inventoryItem.put("id", "prod-1");
        inventoryItem.put("quantity", 0);
        processor.inventory = new ArrayList<>(List.of(inventoryItem));

        assertEquals("out_of_stock", processor.getInventoryStatus("prod-1"));
    }

    @Test
    void addsCreditCardProcessingFee() {
        OrderProcessor.Mailer mailer = createMockMailer();
        OrderProcessor.Logger logger = createMockLogger();
        OrderProcessor processor = new OrderProcessor(new Object(), mailer, logger);

        Map<String, Object> order = makeOrder("7", "standard", "cc@test.com",
                makeItems(100, 1), "credit_card");
        Map<String, Object> result = processor.processOrder(order);

        double subtotal = 100 + 19.99;
        double fee = subtotal * 0.029 + 0.30;
        assertEquals(subtotal + fee, ((Number) result.get("total")).doubleValue(), 0.1);
    }
}
