using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UpzIt.Api.Data;
using UpzIt.Api.DTOs;
using UpzIt.Api.Entities;

namespace UpzIt.Api.Controllers;

[ApiController]
[Route("api/sprints")]
[Authorize]
public class SprintsController : ControllerBase
{
    private readonly AppDbContext _db;

    public SprintsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<List<SprintDto>>> GetAll([FromQuery] int? projectId, CancellationToken ct)
    {
        var query = _db.Sprints.Include(s => s.Project).AsQueryable();
        if (projectId.HasValue) query = query.Where(s => s.ProjectId == projectId.Value);
        var list = await query.OrderBy(s => s.StartDate)
            .Select(s => new SprintDto
            {
                Id = s.Id,
                Name = s.Name,
                StartDate = s.StartDate,
                EndDate = s.EndDate,
                ProjectId = s.ProjectId,
                ProjectName = s.Project.Name
            })
            .ToListAsync(ct);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SprintDto>> GetById(int id, CancellationToken ct)
    {
        var s = await _db.Sprints.Include(x => x.Project).FirstOrDefaultAsync(x => x.Id == id, ct);
        if (s == null) return NotFound();
        return Ok(new SprintDto
        {
            Id = s.Id,
            Name = s.Name,
            StartDate = s.StartDate,
            EndDate = s.EndDate,
            ProjectId = s.ProjectId,
            ProjectName = s.Project.Name
        });
    }

    [HttpPost]
    [Authorize(Policy = "ManagerOrAdmin")]
    public async Task<ActionResult<SprintDto>> Create([FromBody] SprintCreateDto dto, CancellationToken ct)
    {
        if (dto.EndDate < dto.StartDate)
            return BadRequest(new { error = "Дата окончания должна быть не раньше даты начала", field = "end_date" });
        if (await _db.Projects.AllAsync(p => p.Id != dto.ProjectId, ct))
            return BadRequest(new { error = "Проект не найден", field = "project_id" });
        var entity = new Sprint
        {
            Name = dto.Name,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            ProjectId = dto.ProjectId
        };
        _db.Sprints.Add(entity);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, new SprintDto
        {
            Id = entity.Id,
            Name = entity.Name,
            StartDate = entity.StartDate,
            EndDate = entity.EndDate,
            ProjectId = entity.ProjectId
        });
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "ManagerOrAdmin")]
    public async Task<IActionResult> Update(int id, [FromBody] SprintUpdateDto dto, CancellationToken ct)
    {
        var entity = await _db.Sprints.FindAsync(new object[] { id }, ct);
        if (entity == null) return NotFound();
        if (dto.Name != null) entity.Name = dto.Name;
        if (dto.StartDate.HasValue) entity.StartDate = dto.StartDate.Value;
        if (dto.EndDate.HasValue)
        {
            var end = dto.EndDate.Value;
            var start = dto.StartDate ?? entity.StartDate;
            if (end < start)
                return BadRequest(new { error = "Дата окончания должна быть не раньше даты начала", field = "end_date" });
            entity.EndDate = end;
        }
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "ManagerOrAdmin")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var entity = await _db.Sprints.FindAsync(new object[] { id }, ct);
        if (entity == null) return NotFound();
        _db.Sprints.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
