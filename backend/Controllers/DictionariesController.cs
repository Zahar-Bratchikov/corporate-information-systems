using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UpzIt.Api.Data;

namespace UpzIt.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DictionariesController : ControllerBase
{
    private readonly AppDbContext _db;

    public DictionariesController(AppDbContext db) => _db = db;

    [HttpGet("roles")]
    [AllowAnonymous]
    public async Task<ActionResult<List<object>>> GetRoles(CancellationToken ct)
    {
        var list = await _db.Roles.OrderBy(r => r.Id).Select(r => new { r.Id, r.Name }).ToListAsync(ct);
        return Ok(list);
    }

    [HttpGet("task-types")]
    public async Task<ActionResult<List<object>>> GetTaskTypes(CancellationToken ct)
    {
        var list = await _db.TaskTypes.OrderBy(t => t.Id).Select(t => new { t.Id, t.Name }).ToListAsync(ct);
        return Ok(list);
    }

    [HttpGet("task-statuses")]
    public async Task<ActionResult<List<object>>> GetTaskStatuses(CancellationToken ct)
    {
        var list = await _db.TaskStatuses.OrderBy(s => s.Id).Select(s => new { s.Id, s.Name }).ToListAsync(ct);
        return Ok(list);
    }

    [HttpGet("priorities")]
    public async Task<ActionResult<List<object>>> GetPriorities(CancellationToken ct)
    {
        var list = await _db.Priorities.OrderBy(p => p.Id).Select(p => new { p.Id, p.Name }).ToListAsync(ct);
        return Ok(list);
    }

    [HttpGet("users")]
    public async Task<ActionResult<List<object>>> GetUsersForSelect(CancellationToken ct)
    {
        var list = await _db.Users.Include(u => u.Role).OrderBy(u => u.FullName)
            .Select(u => new { u.Id, u.FullName, RoleName = u.Role != null ? u.Role.Name : "" }).ToListAsync(ct);
        return Ok(list);
    }
}
