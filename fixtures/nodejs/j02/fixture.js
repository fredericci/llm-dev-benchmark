// God class with all code smells — the model must refactor this
// Smells: god class, magic numbers, duplicated logic, deep nesting, long methods

class OrderProcessor {
  constructor(db, mailer, logger) {
    this.db = db;
    this.mailer = mailer;
    this.logger = logger;
    this.orders = [];
    this.customers = [];
    this.inventory = [];
    this.discounts = [];
    this.payments = [];
    this.shipments = [];
  }

  processOrder(order) {
    let discount = 0;
    if (order.items.length > 10) {
      if (order.customer.type === 'vip') {
        discount = 0.25;
      } else {
        discount = 0.1;
      }
    } else {
      if (order.customer.type === 'vip') {
        discount = 0.15;
      } else {
        discount = 0;
      }
    }

    let total = 0;
    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      if (item.quantity > 0) {
        if (item.price > 0) {
          total += item.price * item.quantity;
        }
      }
    }
    total = total - (total * discount);

    if (total > 1000) {
      order.shipping = 0;
    } else if (total > 500) {
      order.shipping = 9.99;
    } else {
      order.shipping = 19.99;
    }
    total += order.shipping;

    if (order.paymentMethod === 'credit_card') {
      const fee = total * 0.029 + 0.30;
      total += fee;
    } else if (order.paymentMethod === 'paypal') {
      const fee = total * 0.034 + 0.30;
      total += fee;
    }

    order.total = total;
    order.status = 'processed';
    this.orders.push(order);

    // Send confirmation email (duplicated logic below in sendOrderUpdate)
    if (order.customer.email) {
      this.mailer.send({
        to: order.customer.email,
        subject: 'Order Confirmation',
        body: `Your order total is $${total.toFixed(2)}`,
      });
    }

    this.logger.log(`Order processed: ${JSON.stringify(order)}`);
    return order;
  }

  cancelOrder(orderId, reason) {
    const order = this.orders.find((o) => o.id === orderId);
    if (order) {
      if (order.status !== 'shipped') {
        if (order.status !== 'delivered') {
          order.status = 'cancelled';
          order.cancellationReason = reason;

          // Duplicated email sending logic
          if (order.customer.email) {
            this.mailer.send({
              to: order.customer.email,
              subject: 'Order Cancelled',
              body: `Your order has been cancelled. Reason: ${reason}`,
            });
          }

          let refundAmount = order.total;
          if (order.paymentMethod === 'credit_card') {
            refundAmount -= 0.30;
          }
          order.refundAmount = refundAmount;
          this.logger.log(`Order cancelled: ${orderId}`);
          return true;
        }
      }
    }
    return false;
  }

  sendOrderUpdate(orderId, updateType) {
    const order = this.orders.find((o) => o.id === orderId);
    if (order) {
      // Duplicated email sending logic (third time)
      if (order.customer.email) {
        this.mailer.send({
          to: order.customer.email,
          subject: `Order ${updateType}`,
          body: `Your order status: ${updateType}`,
        });
      }
      return true;
    }
    return false;
  }

  getInventoryStatus(productId) {
    const item = this.inventory.find((i) => i.id === productId);
    if (item) {
      if (item.quantity > 100) {
        return 'in_stock';
      } else if (item.quantity > 10) {
        return 'low_stock';
      } else if (item.quantity > 0) {
        return 'critical_stock';
      } else {
        return 'out_of_stock';
      }
    }
    return 'unknown';
  }
}

module.exports = { OrderProcessor };
