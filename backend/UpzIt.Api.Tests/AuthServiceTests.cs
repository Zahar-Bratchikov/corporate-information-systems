using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using UpzIt.Api.Data;
using UpzIt.Api.DTOs;
using UpzIt.Api.Entities;
using UpzIt.Api.Services;
using Xunit;
using Task = System.Threading.Tasks.Task;

namespace UpzIt.Api.Tests;

public class AuthServiceTests
{
    private static IConfiguration TestConfiguration { get; } = new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "UpzIt-Unit-Test-Jwt-Secret-Key-32+Chars!",
            ["Jwt:Issuer"] = "UpzIt.Tests",
            ["Jwt:Audience"] = "UpzIt.Tests.Client",
            ["Jwt:ExpirationMinutes"] = "120"
        })
        .Build();

    private static AppDbContext CreateInMemoryDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static async Task SeedUserAsync(AppDbContext db, string login, string plainPassword, string roleName = "Администратор")
    {
        db.Roles.Add(new Role { Id = 1, Name = roleName });
        await db.SaveChangesAsync();
        db.Users.Add(new User
        {
            Login = login,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(plainPassword),
            FullName = "Тестовый Пользователь",
            RoleId = 1
        });
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task LoginAsync_ReturnsResponse_WhenCredentialsValid()
    {
        await using var db = CreateInMemoryDb();
        await SeedUserAsync(db, "tester", "secret123");

        var sut = new AuthService(db, TestConfiguration);
        var result = await sut.LoginAsync(new LoginRequest { Login = "tester", Password = "secret123" });

        Assert.NotNull(result);
        Assert.False(string.IsNullOrWhiteSpace(result.Token));
        Assert.Equal("tester", result.Login);
        Assert.Equal("Тестовый Пользователь", result.FullName);
        Assert.Equal("Администратор", result.RoleName);
        Assert.Equal(1, result.UserId);
        Assert.Equal(1, result.RoleId);
    }

    [Fact]
    public async Task LoginAsync_ReturnsNull_WhenUserNotFound()
    {
        await using var db = CreateInMemoryDb();
        await SeedUserAsync(db, "exists", "pw");

        var sut = new AuthService(db, TestConfiguration);
        var result = await sut.LoginAsync(new LoginRequest { Login = "nobody", Password = "pw" });

        Assert.Null(result);
    }

    [Fact]
    public async Task LoginAsync_ReturnsNull_WhenPasswordWrong()
    {
        await using var db = CreateInMemoryDb();
        await SeedUserAsync(db, "exists", "correct");

        var sut = new AuthService(db, TestConfiguration);
        var result = await sut.LoginAsync(new LoginRequest { Login = "exists", Password = "wrong" });

        Assert.Null(result);
    }
}
