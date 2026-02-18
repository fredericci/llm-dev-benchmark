// N+1 query example using JPA/Hibernate pattern
// This causes 1 + N (items) + N (customer) queries for N orders

import javax.persistence.*;
import java.util.*;
import java.util.stream.Collectors;

// Simulated ORM with query counter
class QueryCounter {
    private static int queryCount = 0;

    static void reset() { queryCount = 0; }
    static int getCount() { return queryCount; }
    static void increment() { queryCount++; }
}

@Entity
class Customer {
    @Id private int id;
    private String name;
    private String email;

    Customer() {}
    Customer(int id, String name, String email) {
        this.id = id; this.name = name; this.email = email;
    }

    int getId() { return id; }
    String getName() { return name; }
    String getEmail() { return email; }
}

@Entity
class OrderItem {
    @Id private int id;
    private String name;
    private int qty;
    private double price;

    OrderItem() {}
    OrderItem(int id, String name, int qty, double price) {
        this.id = id; this.name = name; this.qty = qty; this.price = price;
    }
}

@Entity
class Order {
    @Id private int id;
    private int customerId;
    private String status;

    @ManyToOne(fetch = FetchType.LAZY)
    private Customer customer;

    @OneToMany(fetch = FetchType.LAZY)
    private List<OrderItem> items;

    Order() {}
    Order(int id, int customerId, String status) {
        this.id = id; this.customerId = customerId; this.status = status;
    }

    int getId() { return id; }
    int getCustomerId() { return customerId; }
    String getStatus() { return status; }
    Customer getCustomer() { return customer; }
    List<OrderItem> getItems() { return items; }
}

// Simulated repository with N+1 problem
class OrderRepository {

    List<Order> findAllOrders() {
        QueryCounter.increment();
        return Arrays.asList(
            new Order(1, 1, "shipped"),
            new Order(2, 2, "pending"),
            new Order(3, 1, "delivered")
        );
    }

    List<OrderItem> findItemsByOrderId(int orderId) {
        QueryCounter.increment(); // N+1: one query per order
        Map<Integer, List<OrderItem>> itemsMap = new HashMap<>();
        itemsMap.put(1, Arrays.asList(new OrderItem(1, "Widget", 2, 10)));
        itemsMap.put(2, Arrays.asList(new OrderItem(2, "Gadget", 1, 25), new OrderItem(3, "Doohickey", 3, 5)));
        itemsMap.put(3, Arrays.asList(new OrderItem(4, "Widget", 1, 10)));
        return itemsMap.getOrDefault(orderId, Collections.emptyList());
    }

    Customer findCustomerById(int customerId) {
        QueryCounter.increment(); // N+1: one query per order for customer
        Map<Integer, Customer> customers = new HashMap<>();
        customers.put(1, new Customer(1, "Alice", "alice@example.com"));
        customers.put(2, new Customer(2, "Bob", "bob@example.com"));
        return customers.get(customerId);
    }

    // Optimized: uses JOIN FETCH to load everything in a single query
    List<Order> findAllOrdersWithItemsAndCustomers() {
        QueryCounter.increment(); // Optimized: single join query
        // In real JPA: @Query("SELECT o FROM Order o JOIN FETCH o.items JOIN FETCH o.customer")
        // Returns fully hydrated entities in one round-trip
        return Arrays.asList(
            // orders with items and customers pre-loaded
        );
    }
}

// N+1 problem: fetches orders, then for each order fetches items and customer separately
class OrderService {

    private final OrderRepository repo = new OrderRepository();

    List<Map<String, Object>> getOrdersWithDetails() {
        List<Order> orders = repo.findAllOrders();

        return orders.stream().map(order -> {
            List<OrderItem> items = repo.findItemsByOrderId(order.getId());       // N queries
            Customer customer = repo.findCustomerById(order.getCustomerId());     // N queries
            Map<String, Object> enriched = new HashMap<>();
            enriched.put("order", order);
            enriched.put("items", items);
            enriched.put("customer", customer);
            return enriched;
        }).collect(Collectors.toList());
    }
}
