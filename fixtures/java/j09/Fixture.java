// Order service with bug: missing null check after product lookup
// This causes NullPointerException: Cannot invoke method getId() on null

import java.util.Map;
import java.util.HashMap;

class OrderService {

    // Simulated product database
    private static final Map<String, Product> productDb = new HashMap<>();
    static {
        productDb.put("prod-1", new Product("prod-1", "Widget", 29.99, 100));
        productDb.put("prod-2", new Product("prod-2", "Gadget", 49.99, 5));
    }

    public static Product findProduct(String productId) {
        // Returns null if product not found
        return productDb.get(productId);
    }

    public static OrderResult processOrder(Order order) {
        Product product = findProduct(order.getProductId());

        // BUG: No null check — crashes with NullPointerException when product is not found
        double orderTotal = product.getPrice() * order.getQuantity();

        return new OrderResult(
            "ORD-" + System.currentTimeMillis(),
            product.getId(),
            product.getName(),
            order.getQuantity(),
            orderTotal,
            "confirmed"
        );
    }
}

class Product {
    private String id;
    private String name;
    private double price;
    private int stock;

    public Product(String id, String name, double price, int stock) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.stock = stock;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public double getPrice() { return price; }
    public int getStock() { return stock; }
}

class Order {
    private String productId;
    private int quantity;

    public Order(String productId, int quantity) {
        this.productId = productId;
        this.quantity = quantity;
    }

    public String getProductId() { return productId; }
    public int getQuantity() { return quantity; }
}

class OrderResult {
    private String orderId;
    private String productId;
    private String productName;
    private int quantity;
    private double total;
    private String status;

    public OrderResult(String orderId, String productId, String productName,
                       int quantity, double total, String status) {
        this.orderId = orderId;
        this.productId = productId;
        this.productName = productName;
        this.quantity = quantity;
        this.total = total;
        this.status = status;
    }

    public String getOrderId() { return orderId; }
    public String getProductId() { return productId; }
    public String getProductName() { return productName; }
    public int getQuantity() { return quantity; }
    public double getTotal() { return total; }
    public String getStatus() { return status; }
}
