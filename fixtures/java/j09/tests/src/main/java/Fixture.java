// Supporting classes for j09 OrderService tests
// These classes are used by both the model-generated OrderService and the test suite

import java.util.Map;
import java.util.HashMap;

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
