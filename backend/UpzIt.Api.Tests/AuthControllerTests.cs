using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using UpzIt.Api.Controllers;
using UpzIt.Api.DTOs;
using UpzIt.Api.Services;
using Xunit;

namespace UpzIt.Api.Tests;

public class AuthControllerTests
{
    private readonly Mock<IAuthService> _auth = new();
    private AuthController CreateController() =>
        new(_auth.Object, NullLogger<AuthController>.Instance);

    [Fact]
    public async Task Login_ReturnsBadRequest_WhenBodyNull()
    {
        var c = CreateController();
        var result = await c.Login(null, CancellationToken.None);
        var bad = Assert.IsType<BadRequestObjectResult>(result);
        Assert.NotNull(bad.Value);
    }

    [Theory]
    [InlineData("", "x")]
    [InlineData("user", "")]
    [InlineData("   ", "pass")]
    public async Task Login_ReturnsBadRequest_WhenLoginOrPasswordMissing(string login, string password)
    {
        var c = CreateController();
        var result = await c.Login(new LoginRequest { Login = login, Password = password }, CancellationToken.None);
        Assert.IsType<BadRequestObjectResult>(result);
        _auth.Verify(s => s.LoginAsync(It.IsAny<LoginRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Login_ReturnsUnauthorized_WhenServiceReturnsNull()
    {
        _auth.Setup(s => s.LoginAsync(It.IsAny<LoginRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((LoginResponse?)null);

        var c = CreateController();
        var result = await c.Login(new LoginRequest { Login = "u", Password = "p" }, CancellationToken.None);

        var unauthorized = Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.NotNull(unauthorized.Value);
        _auth.Verify(s => s.LoginAsync(
            It.Is<LoginRequest>(r => r.Login == "u" && r.Password == "p"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Login_ReturnsOk_WithPayload_WhenServiceSucceeds()
    {
        var payload = new LoginResponse
        {
            Token = "jwt-token",
            UserId = 42,
            Login = "admin",
            FullName = "Админ",
            RoleName = "Администратор",
            RoleId = 1
        };
        _auth.Setup(s => s.LoginAsync(It.IsAny<LoginRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(payload);

        var c = CreateController();
        var result = await c.Login(new LoginRequest { Login = "admin", Password = "password" }, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var body = Assert.IsType<LoginResponse>(ok.Value);
        Assert.Equal("jwt-token", body.Token);
        Assert.Equal(42, body.UserId);
        Assert.Equal("admin", body.Login);
    }
}
