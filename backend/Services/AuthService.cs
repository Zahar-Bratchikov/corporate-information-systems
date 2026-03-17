using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using UpzIt.Api.Data;
using UpzIt.Api.DTOs;
using UpzIt.Api.Entities;

namespace UpzIt.Api.Services;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken ct = default);
}

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var user = await _db.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Login == request.Login, ct);
        if (user == null) return null;
        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash)) return null;

        var key = _config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key not set");
        var issuer = _config["Jwt:Issuer"] ?? "UpzIt.Api";
        var audience = _config["Jwt:Audience"] ?? "UpzIt.Client";
        var expMinutes = int.Parse(_config["Jwt:ExpirationMinutes"] ?? "60");
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Login),
            new Claim(ClaimTypes.GivenName, user.FullName),
            new Claim(ClaimTypes.Role, user.Role.Name),
            new Claim("RoleId", user.RoleId.ToString())
        };
        var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            expires: DateTime.UtcNow.AddMinutes(expMinutes),
            signingCredentials: credentials
        );
        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        return new LoginResponse
        {
            Token = tokenString,
            UserId = user.Id,
            Login = user.Login,
            FullName = user.FullName,
            RoleName = user.Role.Name,
            RoleId = user.RoleId
        };
    }
}
