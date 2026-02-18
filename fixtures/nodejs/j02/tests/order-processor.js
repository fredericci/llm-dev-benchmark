const MIN_ITEMS_FOR_HIGH_DISCOUNT = 10;
const VIP_HIGH_DISCOUNT_RATE = 0.25;
const STANDARD_HIGH_DISCOUNT_RATE = 0.1;
const VIP_LOW_DISCOUNT_RATE = 0.15;
const STANDARD_LOW_DISCOUNT_RATE = 0;

const SHIPPING_FREE_THRESHOLD = 1000;
const SHIPPING_STANDARD_THRESHOLD = 500;
const SHIPPING_STANDARD_PRICE = 9.99;
const SHIPPING_DEFAULT_PRICE = 19.99;

const CREDIT_CARD_FEE_PERCENTAGE = 0.029;
const CREDIT_CARD_FEE_FIXED = 0.30;
const PAYPAL_FEE_PERCENTAGE = 0.034;
const PAYPAL_FEE_FIXED = 0.30;

const INVENTORY_IN_STOCK_THRESHOLD = 100;
const INVENTORY_LOW_STOCK_THRESHOLD = 10;

class DiscountCalculator {
  calculateDiscount(order) {
    if (order.items.length > MIN_ITEMS_FOR_HIGH_DISCOUNT) {
      return order.customer.type === 'vip' ? VIP_HIGH_DISCOUNT_RATE : STANDARD_HIGH_DISCOUNT_RATE;
    } else {
      return order.customer.type === 'vip' ? VIP_LOW_DISCOUNT_RATE : STANDARD_LOW_DISCOUNT_RATE;
    }
  }
}

class PriceCalculator {
  calculateSubtotal(items) {
    let subtotal = 0;
    for (const item of items) {
      if (item.quantity > 0 && item.price > 0) {
        subtotal += item.price * item.quantity;
      }
    }
    return subtotal;
  }

  calculateShipping(total) {
    if (total > SHIPPING_FREE_THRESHOLD) {
      return 0;
    } else if (total > SHIPPING_STANDARD_THRESHOLD) {
      return SHIPPING_STANDARD_PRICE;
    } else {
      return SHIPPING_DEFAULT_PRICE;
    }
  }

  calculatePaymentFee(total, paymentMethod) {
    if (paymentMethod === 'credit_card') {
      return total * CREDIT_CARD_FEE_PERCENTAGE + CREDIT_CARD_FEE_FIXED;
    } else if (paymentMethod === 'paypal') {
      return total * PAYPAL_FEE_PERCENTAGE + PAYPAL_FEE_FIXED;
    }
    return 0;
  }
}

class EmailService {
  constructor(mailer) {
    this.mailer = mailer;
  }

  sendConfirmationEmail(customerEmail, total) {
    if (customerEmail) {
      this.mailer.send({
        to: customerEmail,
        subject: 'Order Confirmation',
        body: `Your order total is $${total.toFixed(2)}`,
      });
    }
  }

  sendCancellationEmail(customerEmail, reason) {
    if (customerEmail) {
      this.mailer.send({
        to: customerEmail,
        subject: 'Order Cancelled',
        body: `Your order has been cancelled. Reason: ${reason}`,
      });
    }
  }

  sendOrderUpdateEmail(customerEmail, updateType) {
    if (customerEmail) {
      this.mailer.send({
        to: customerEmail,
        subject: `Order ${updateType}`,
        body: `Your order status: ${updateType}`,
      });
    }
  }
}

class InventoryService {
  constructor(inventory) {
    this.inventory = inventory;
  }

  getInventoryStatus(productId) {
    const item = this.inventory.find((i) => i.id === productId);
    if (!item) {
      return 'unknown';
    }

    if (item.quantity > INVENTORY_IN_STOCK_THRESHOLD) {
      return 'in_stock';
    } else if (item.quantity > INVENTORY_LOW_STOCK_THRESHOLD) {
      return 'low_stock';
    } else if (item.quantity > 0) {
      return 'critical_stock';
    } else {
      return 'out_of_stock';
    }
  }
}

class OrderProcessor {
  constructor(db, mailer, logger) {
    this.db = db;
    this.logger = logger;
    this.emailService = new EmailService(mailer);
    this.discountCalculator = new DiscountCalculator();
    this.priceCalculator = new PriceCalculator();
    this.inventoryService = new InventoryService([]); // Assuming inventory is managed elsewhere or initialized empty
    this.orders = [];
    this.customers = [];
    this.inventory = [];
    this.discounts = [];
    this.payments = [];
    this.shipments = [];
  }

  processOrder(order) {
    const discountRate = this.discountCalculator.calculateDiscount(order);
    const subtotal = this.priceCalculator.calculateSubtotal(order.items);
    const discountedSubtotal = subtotal - (subtotal * discountRate);
    const shippingCost = this.priceCalculator.calculateShipping(discountedSubtotal);
    const totalBeforeFees = discountedSubtotal + shippingCost;
    const paymentFee = this.priceCalculator.calculatePaymentFee(totalBeforeFees, order.paymentMethod);
    const finalTotal = totalBeforeFees + paymentFee;

    order.shipping = shippingCost;
    order.total = finalTotal;
    order.status = 'processed';
    this.orders.push(order);

    this.emailService.sendConfirmationEmail(order.customer.email, finalTotal);
    this.logger.log(`Order processed: ${JSON.stringify(order)}`);
    return order;
  }

  cancelOrder(orderId, reason) {
    const order = this.findOrder(orderId);
    if (!order) {
      return false;
    }

    if (!this.isCancellable(order.status)) {
      return false;
    }

    order.status = 'cancelled';
    order.cancellationReason = reason;

    this.emailService.sendCancellationEmail(order.customer.email, reason);

    const refundAmount = this.calculateRefundAmount(order);
    order.refundAmount = refundAmount;
    this.logger.log(`Order cancelled: ${orderId}`);
    return true;
  }

  sendOrderUpdate(orderId, updateType) {
    const order = this.findOrder(orderId);
    if (!order) {
      return false;
    }

    this.emailService.sendOrderUpdateEmail(order.customer.email, updateType);
    return true;
  }

  getInventoryStatus(productId) {
    return this.inventoryService.getInventoryStatus(productId);
  }

  findOrder(orderId) {
    return this.orders.find((o) => o.id === orderId);
  }

  isCancellable(status) {
    return status !== 'shipped' && status !== 'delivered';
  }

  calculateRefundAmount(order) {
    let refundAmount = order.total;
    if (order.paymentMethod === 'credit_card') {
      refundAmount -= CREDIT_CARD_FEE_FIXED;
    }
    return refundAmount;
  }
}

module.exports = { OrderProcessor };