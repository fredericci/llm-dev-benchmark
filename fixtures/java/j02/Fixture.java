// God class with all code smells — the model must refactor this
// Smells: god class, magic numbers, duplicated logic, deep nesting, long methods

import java.util.*;

public class OrderProcessor {
    private Object db;
    private Mailer mailer;
    private Logger logger;
    public List<Map<String, Object>> orders = new ArrayList<>();
    public List<Map<String, Object>> customers = new ArrayList<>();
    public List<Map<String, Object>> inventory = new ArrayList<>();
    public List<Map<String, Object>> discounts = new ArrayList<>();
    public List<Map<String, Object>> payments = new ArrayList<>();
    public List<Map<String, Object>> shipments = new ArrayList<>();

    public interface Mailer {
        void send(Map<String, String> message);
    }

    public interface Logger {
        void log(String message);
    }

    public OrderProcessor(Object db, Mailer mailer, Logger logger) {
        this.db = db;
        this.mailer = mailer;
        this.logger = logger;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> processOrder(Map<String, Object> order) {
        double discount = 0;
        List<Map<String, Object>> items = (List<Map<String, Object>>) order.get("items");
        Map<String, Object> customer = (Map<String, Object>) order.get("customer");

        if (items.size() > 10) {
            if ("vip".equals(customer.get("type"))) {
                discount = 0.25;
            } else {
                discount = 0.1;
            }
        } else {
            if ("vip".equals(customer.get("type"))) {
                discount = 0.15;
            } else {
                discount = 0;
            }
        }

        double total = 0;
        for (int i = 0; i < items.size(); i++) {
            Map<String, Object> item = items.get(i);
            double quantity = ((Number) item.get("quantity")).doubleValue();
            double price = ((Number) item.get("price")).doubleValue();
            if (quantity > 0) {
                if (price > 0) {
                    total += price * quantity;
                }
            }
        }
        total = total - (total * discount);

        if (total > 1000) {
            order.put("shipping", 0.0);
        } else if (total > 500) {
            order.put("shipping", 9.99);
        } else {
            order.put("shipping", 19.99);
        }
        total += ((Number) order.get("shipping")).doubleValue();

        String paymentMethod = (String) order.get("paymentMethod");
        if ("credit_card".equals(paymentMethod)) {
            double fee = total * 0.029 + 0.30;
            total += fee;
        } else if ("paypal".equals(paymentMethod)) {
            double fee = total * 0.034 + 0.30;
            total += fee;
        }

        order.put("total", total);
        order.put("status", "processed");
        this.orders.add(order);

        // Send confirmation email (duplicated logic below in sendOrderUpdate)
        String email = (String) customer.get("email");
        if (email != null) {
            Map<String, String> msg = new HashMap<>();
            msg.put("to", email);
            msg.put("subject", "Order Confirmation");
            msg.put("body", String.format("Your order total is $%.2f", total));
            this.mailer.send(msg);
        }

        this.logger.log("Order processed: " + order.toString());
        return order;
    }

    @SuppressWarnings("unchecked")
    public boolean cancelOrder(String orderId, String reason) {
        Map<String, Object> order = null;
        for (Map<String, Object> o : this.orders) {
            if (orderId.equals(o.get("id"))) {
                order = o;
                break;
            }
        }
        if (order != null) {
            if (!"shipped".equals(order.get("status"))) {
                if (!"delivered".equals(order.get("status"))) {
                    order.put("status", "cancelled");
                    order.put("cancellationReason", reason);

                    // Duplicated email sending logic
                    Map<String, Object> customer = (Map<String, Object>) order.get("customer");
                    String email = (String) customer.get("email");
                    if (email != null) {
                        Map<String, String> msg = new HashMap<>();
                        msg.put("to", email);
                        msg.put("subject", "Order Cancelled");
                        msg.put("body", "Your order has been cancelled. Reason: " + reason);
                        this.mailer.send(msg);
                    }

                    double refundAmount = ((Number) order.get("total")).doubleValue();
                    if ("credit_card".equals(order.get("paymentMethod"))) {
                        refundAmount -= 0.30;
                    }
                    order.put("refundAmount", refundAmount);
                    this.logger.log("Order cancelled: " + orderId);
                    return true;
                }
            }
        }
        return false;
    }

    @SuppressWarnings("unchecked")
    public boolean sendOrderUpdate(String orderId, String updateType) {
        Map<String, Object> order = null;
        for (Map<String, Object> o : this.orders) {
            if (orderId.equals(o.get("id"))) {
                order = o;
                break;
            }
        }
        if (order != null) {
            // Duplicated email sending logic (third time)
            Map<String, Object> customer = (Map<String, Object>) order.get("customer");
            String email = (String) customer.get("email");
            if (email != null) {
                Map<String, String> msg = new HashMap<>();
                msg.put("to", email);
                msg.put("subject", "Order " + updateType);
                msg.put("body", "Your order status: " + updateType);
                this.mailer.send(msg);
            }
            return true;
        }
        return false;
    }

    public String getInventoryStatus(String productId) {
        Map<String, Object> item = null;
        for (Map<String, Object> i : this.inventory) {
            if (productId.equals(i.get("id"))) {
                item = i;
                break;
            }
        }
        if (item != null) {
            int quantity = ((Number) item.get("quantity")).intValue();
            if (quantity > 100) {
                return "in_stock";
            } else if (quantity > 10) {
                return "low_stock";
            } else if (quantity > 0) {
                return "critical_stock";
            } else {
                return "out_of_stock";
            }
        }
        return "unknown";
    }
}
