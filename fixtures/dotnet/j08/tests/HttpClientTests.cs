// Tests for the migrated EF Core 8 code
// Verifies that the model uses EF Core 8 patterns:
// - ExecuteUpdateAsync/ExecuteDeleteAsync for bulk operations
// - ConfigureConventions for type configuration
// - ToJson() for JSON column mapping

using System.Reflection;
using Xunit;

public class HttpClientTests
{
    [Fact]
    public void UserService_Class_Exists()
    {
        // The migrated code must still export a UserService class
        var type = FindType("UserService");
        Assert.NotNull(type);
    }

    [Fact]
    public void AppDbContext_Class_Exists()
    {
        var type = FindType("AppDbContext");
        Assert.NotNull(type);
    }

    [Fact]
    public void DeactivateInactiveUsers_Method_Exists()
    {
        var type = FindType("UserService");
        Assert.NotNull(type);
        var method = type!.GetMethod("DeactivateInactiveUsers");
        Assert.NotNull(method);
        // Must return Task (async)
        Assert.True(typeof(Task).IsAssignableFrom(method!.ReturnType));
    }

    [Fact]
    public void DeleteOldUsers_Method_Exists()
    {
        var type = FindType("UserService");
        Assert.NotNull(type);
        var method = type!.GetMethod("DeleteOldUsers");
        Assert.NotNull(method);
        Assert.True(typeof(Task).IsAssignableFrom(method!.ReturnType));
    }

    [Fact]
    public void Code_Uses_ExecuteUpdateAsync()
    {
        // Read the source code and check for EF Core 8 bulk update pattern
        var sourceCode = ReadSourceFile("HttpClient.cs");
        Assert.Contains("ExecuteUpdateAsync", sourceCode);
    }

    [Fact]
    public void Code_Uses_ExecuteDeleteAsync()
    {
        // Read the source code and check for EF Core 8 bulk delete pattern
        var sourceCode = ReadSourceFile("HttpClient.cs");
        Assert.Contains("ExecuteDeleteAsync", sourceCode);
    }

    [Fact]
    public void Code_Uses_ConfigureConventions()
    {
        // EF Core 8 pattern: ConfigureConventions replaces manual property config
        var sourceCode = ReadSourceFile("HttpClient.cs");
        Assert.Contains("ConfigureConventions", sourceCode);
    }

    [Fact]
    public void Code_Uses_ToJson()
    {
        // EF Core 8 pattern: ToJson() for JSON column mapping
        var sourceCode = ReadSourceFile("HttpClient.cs");
        Assert.Contains("ToJson", sourceCode);
    }

    [Fact]
    public void Code_Does_Not_Use_SaveChanges_Loop_For_Bulk_Updates()
    {
        // The migrated code should NOT load entities into memory for bulk operations
        var sourceCode = ReadSourceFile("HttpClient.cs");
        var deactivateMethod = ExtractMethod(sourceCode, "DeactivateInactiveUsers");
        // Should not use ToListAsync followed by foreach + SaveChanges for bulk ops
        Assert.DoesNotContain("ToListAsync", deactivateMethod);
    }

    [Fact]
    public void Code_Does_Not_Use_RemoveRange_For_Bulk_Deletes()
    {
        var sourceCode = ReadSourceFile("HttpClient.cs");
        var deleteMethod = ExtractMethod(sourceCode, "DeleteOldUsers");
        // Should not use RemoveRange pattern for bulk deletes
        Assert.DoesNotContain("RemoveRange", deleteMethod);
    }

    private static string ReadSourceFile(string fileName)
    {
        var dir = Path.GetDirectoryName(typeof(HttpClientTests).Assembly.Location)!;
        // Walk up to find the tests directory (where the .cs file is written)
        var current = new DirectoryInfo(dir);
        while (current != null && !File.Exists(Path.Combine(current.FullName, fileName)))
        {
            current = current.Parent;
        }

        if (current == null)
        {
            // Try the test project directory directly
            var testDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location)!;
            var candidatePaths = new[]
            {
                Path.Combine(testDir, fileName),
                Path.Combine(testDir, "..", fileName),
                Path.Combine(testDir, "..", "..", fileName),
                Path.Combine(testDir, "..", "..", "..", fileName),
                Path.Combine(testDir, "..", "..", "..", "..", fileName),
            };
            foreach (var p in candidatePaths)
            {
                if (File.Exists(p)) return File.ReadAllText(p);
            }

            // Fallback: search from the csproj location
            var projectDir = FindProjectDir();
            if (projectDir != null)
            {
                var filePath = Path.Combine(projectDir, fileName);
                if (File.Exists(filePath)) return File.ReadAllText(filePath);
            }

            throw new FileNotFoundException($"Could not find source file: {fileName}");
        }

        return File.ReadAllText(Path.Combine(current.FullName, fileName));
    }

    private static string? FindProjectDir()
    {
        var dir = new DirectoryInfo(AppDomain.CurrentDomain.BaseDirectory);
        while (dir != null)
        {
            if (dir.GetFiles("Tests.csproj").Length > 0) return dir.FullName;
            dir = dir.Parent;
        }
        return null;
    }

    private static string ExtractMethod(string source, string methodName)
    {
        var startIdx = source.IndexOf(methodName);
        if (startIdx < 0) return "";
        // Find the opening brace of the method body
        var braceIdx = source.IndexOf('{', startIdx);
        if (braceIdx < 0) return "";
        // Count braces to find the end
        int depth = 0;
        int endIdx = braceIdx;
        for (int i = braceIdx; i < source.Length; i++)
        {
            if (source[i] == '{') depth++;
            else if (source[i] == '}') depth--;
            if (depth == 0) { endIdx = i + 1; break; }
        }
        return source[startIdx..endIdx];
    }

    private static Type? FindType(string name)
    {
        return AppDomain.CurrentDomain.GetAssemblies()
            .SelectMany(a =>
            {
                try { return a.GetTypes(); }
                catch { return Array.Empty<Type>(); }
            })
            .FirstOrDefault(t => t.Name == name);
    }
}
