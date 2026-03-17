using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UpzIt.Api.DTOs;
using UpzIt.Api.Services;

namespace UpzIt.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Login) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { error = "Укажите логин и пароль" });

        var result = await _authService.LoginAsync(request, ct);
        if (result == null)
        {
            _logger.LogWarning("Неудачная попытка входа для логина {Login}", request.Login);
            return Unauthorized(new { error = "Неверный логин или пароль" });
        }
        return Ok(result);
    }
}
