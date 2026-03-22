using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using UpzIt.Api.Data;
using UpzIt.Api.DTOs;
using UpzIt.Api.Entities;

namespace UpzIt.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;

    public UsersController(AppDbContext db) => _db = db;

    private int? CurrentUserId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
    private bool IsAdmin => User.IsInRole("Администратор");
    private bool IsManager => User.IsInRole("Руководитель проекта / Тимлид");

    [HttpGet]
    [Authorize(Policy = "ManagerOrAdmin")]
    public async Task<ActionResult<List<UserDto>>> GetAll(CancellationToken ct)
    {
        var list = await _db.Users.Include(u => u.Role)
            .OrderBy(u => u.FullName)
            .Select(u => new UserDto
            {
                Id = u.Id,
                Login = u.Login,
                FullName = u.FullName,
                RoleId = u.RoleId,
                RoleName = u.Role.Name
            })
            .ToListAsync(ct);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UserDto>> GetById(int id, CancellationToken ct)
    {
        if (!IsAdmin && !IsManager && CurrentUserId != id) return Forbid();
        var u = await _db.Users.Include(x => x.Role).FirstOrDefaultAsync(x => x.Id == id, ct);
        if (u == null) return NotFound();
        return Ok(new UserDto { Id = u.Id, Login = u.Login, FullName = u.FullName, RoleId = u.RoleId, RoleName = u.Role.Name });
    }

    [HttpPost]
    [Authorize(Policy = "Admin")]
    public async Task<ActionResult<UserDto>> Create([FromBody] UserCreateDto dto, CancellationToken ct)
    {
        if (await _db.Users.AnyAsync(x => x.Login == dto.Login, ct))
            return BadRequest(new { error = "Пользователь с таким логином уже существует", field = "login" });
        var entity = new User
        {
            Login = dto.Login,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            FullName = dto.FullName,
            RoleId = dto.RoleId
        };
        _db.Users.Add(entity);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, new UserDto
        {
            Id = entity.Id,
            Login = entity.Login,
            FullName = entity.FullName,
            RoleId = entity.RoleId
        });
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UserUpdateDto dto, CancellationToken ct)
    {
        var entity = await _db.Users.FindAsync(new object[] { id }, ct);
        if (entity == null) return NotFound();
        if (dto.FullName != null) entity.FullName = dto.FullName;
        if (dto.RoleId.HasValue) entity.RoleId = dto.RoleId.Value;
        if (!string.IsNullOrEmpty(dto.NewPassword))
            entity.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        if (CurrentUserId == id) return BadRequest(new { error = "Нельзя удалить самого себя" });
        var entity = await _db.Users.FindAsync(new object[] { id }, ct);
        if (entity == null) return NotFound();
        _db.Users.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
