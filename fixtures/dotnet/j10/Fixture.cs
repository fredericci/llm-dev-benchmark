// N+1 query example using Entity Framework Core pattern
// This causes 1 + N (items) + N (customer) queries for N orders

using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;

// Simulated ORM with query counter
static class QueryCounter
{
    private static int _queryCount = 0;

    public static void Reset() { _queryCount = 0; }
    public static int GetCount() { return _queryCount; }
    public static void Increment() { _queryCount++; }
}

class Customer
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Email { get; set; }
}

class OrderItem
{
    public int Id { get; set; }
    public string Name { get; set; }
    public int Qty { get; set; }
    public double Price { get; set; }
}

class Order
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public string Status { get; set; }

    // Navigation properties (lazy loaded by default)
    public virtual Customer Customer { get; set; }
    public virtual List<OrderItem> Items { get; set; }
}

// Simulated DbContext with N+1 problem
class AppDbContext : DbContext
{
    public DbSet<Order> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }
    public DbSet<Customer> Customers { get; set; }
}

class OrderRepository
{
    private readonly AppDbContext _db;

    public OrderRepository(AppDbContext db) { _db = db; }

    public List<Order> FindAllOrders()
    {
        QueryCounter.Increment();
        return new List<Order>
        {
            new Order { Id = 1, CustomerId = 1, Status = "shipped" },
            new Order { Id = 2, CustomerId = 2, Status = "pending" },
            new Order { Id = 3, CustomerId = 1, Status = "delivered" }
        };
    }

    public List<OrderItem> FindItemsByOrderId(int orderId)
    {
        QueryCounter.Increment(); // N+1: one query per order
        var itemsMap = new Dictionary<int, List<OrderItem>>
        {
            [1] = new List<OrderItem> { new OrderItem { Id = 1, Name = "Widget", Qty = 2, Price = 10 } },
            [2] = new List<OrderItem>
            {
                new OrderItem { Id = 2, Name = "Gadget", Qty = 1, Price = 25 },
                new OrderItem { Id = 3, Name = "Doohickey", Qty = 3, Price = 5 }
            },
            [3] = new List<OrderItem> { new OrderItem { Id = 4, Name = "Widget", Qty = 1, Price = 10 } }
        };
        return itemsMap.ContainsKey(orderId) ? itemsMap[orderId] : new List<OrderItem>();
    }

    public Customer FindCustomerById(int customerId)
    {
        QueryCounter.Increment(); // N+1: one query per order for customer
        var customers = new Dictionary<int, Customer>
        {
            [1] = new Customer { Id = 1, Name = "Alice", Email = "alice@example.com" },
            [2] = new Customer { Id = 2, Name = "Bob", Email = "bob@example.com" }
        };
        return customers.ContainsKey(customerId) ? customers[customerId] : null;
    }

    // Optimized: uses .Include() to eager load everything in a single query
    public List<Order> FindAllOrdersWithItemsAndCustomers()
    {
        QueryCounter.Increment(); // Optimized: single join query
        // In real EF Core: _db.Orders.Include(o => o.Items).Include(o => o.Customer).ToList()
        // Returns fully hydrated entities in one round-trip
        return new List<Order>();
    }
}

// N+1 problem: fetches orders, then for each order fetches items and customer separately
class OrderService
{
    private readonly OrderRepository _repo;

    public OrderService(OrderRepository repo) { _repo = repo; }

    public List<Dictionary<string, object>> GetOrdersWithDetails()
    {
        var orders = _repo.FindAllOrders();

        return orders.Select(order =>
        {
            var items = _repo.FindItemsByOrderId(order.Id);          // N queries
            var customer = _repo.FindCustomerById(order.CustomerId); // N queries
            return new Dictionary<string, object>
            {
                ["order"] = order,
                ["items"] = items,
                ["customer"] = customer
            };
        }).ToList();
    }
}
