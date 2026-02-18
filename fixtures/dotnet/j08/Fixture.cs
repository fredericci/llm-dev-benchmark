// Entity Framework Core 6 patterns — the model must migrate to EF Core 8
// Breaking changes to address:
// 1. Bulk operations: ExecuteUpdateAsync/ExecuteDeleteAsync replace SaveChanges loops
// 2. Conventions: ConfigureConventions replaces manual type configuration
// 3. JSON columns: now natively supported via OwnsMany with ToJson()
// 4. DateOnly/TimeOnly now supported as column types

using Microsoft.EntityFrameworkCore;

public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public bool IsActive { get; set; }
    public DateTime LastLogin { get; set; }
    public List<Address> Addresses { get; set; } = new();
}

public class Address
{
    public int Id { get; set; }
    public string Street { get; set; } = "";
    public string City { get; set; } = "";
    public string ZipCode { get; set; } = "";
}

public class AppDbContext : DbContext
{
    public DbSet<User> Users { get; set; } = null!;

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    // EF Core 6 pattern: manual type configuration in OnModelCreating
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Manual string length configuration (EF6 pattern)
        modelBuilder.Entity<User>().Property(u => u.Name).HasMaxLength(200);
        modelBuilder.Entity<User>().Property(u => u.Email).HasMaxLength(200);
        modelBuilder.Entity<Address>().Property(a => a.Street).HasMaxLength(200);
        modelBuilder.Entity<Address>().Property(a => a.City).HasMaxLength(100);
        modelBuilder.Entity<Address>().Property(a => a.ZipCode).HasMaxLength(20);

        // EF6 pattern: Addresses stored as separate table with FK
        modelBuilder.Entity<User>()
            .HasMany(u => u.Addresses)
            .WithOne()
            .HasForeignKey("UserId");
    }
}

public class UserService
{
    private readonly AppDbContext _db;

    public UserService(AppDbContext db)
    {
        _db = db;
    }

    // EF6 pattern: SaveChanges loop to deactivate users (should use ExecuteUpdateAsync)
    public async Task DeactivateInactiveUsers(DateTime cutoffDate)
    {
        var inactiveUsers = await _db.Users
            .Where(u => u.IsActive && u.LastLogin < cutoffDate)
            .ToListAsync();

        foreach (var user in inactiveUsers)
        {
            user.IsActive = false;
        }

        await _db.SaveChangesAsync();
    }

    // EF6 pattern: SaveChanges loop to delete old users (should use ExecuteDeleteAsync)
    public async Task DeleteOldUsers(DateTime cutoffDate)
    {
        var oldUsers = await _db.Users
            .Where(u => !u.IsActive && u.LastLogin < cutoffDate)
            .ToListAsync();

        _db.Users.RemoveRange(oldUsers);
        await _db.SaveChangesAsync();
    }

    public async Task<User?> GetUser(int id)
    {
        return await _db.Users
            .Include(u => u.Addresses)
            .FirstOrDefaultAsync(u => u.Id == id);
    }

    public async Task<User> CreateUser(User user)
    {
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return user;
    }

    public async Task UpdateUser(User user)
    {
        _db.Users.Update(user);
        await _db.SaveChangesAsync();
    }
}
