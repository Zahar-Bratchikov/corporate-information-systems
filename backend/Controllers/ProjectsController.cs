using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UpzIt.Api.Data;
using UpzIt.Api.DTOs;
using UpzIt.Api.Entities;

namespace UpzIt.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProjectsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ProjectsController(AppDbContext db) => _db = db;

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<List<ProjectDto>>> GetAll(CancellationToken ct)
    {
        var list = await _db.Projects
            .Include(p => p.Responsible)
            .OrderBy(p => p.Name)
            .Select(p => new ProjectDto
            {
                Id = p.Id,
                Name = p.Name,
                Code = p.Code,
                ReleaseDate = p.ReleaseDate,
                ResponsibleId = p.ResponsibleId,
                ResponsibleName = p.Responsible != null ? p.Responsible.FullName : null
            })
            .ToListAsync(ct);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<ProjectDto>> GetById(int id, CancellationToken ct)
    {
        var p = await _db.Projects.Include(x => x.Responsible).FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p == null) return NotFound();
        return Ok(new ProjectDto
        {
            Id = p.Id,
            Name = p.Name,
            Code = p.Code,
            ReleaseDate = p.ReleaseDate,
            ResponsibleId = p.ResponsibleId,
            ResponsibleName = p.Responsible?.FullName
        });
    }

    [HttpPost]
    [Authorize(Policy = "ManagerOrAdmin")]
    public async Task<ActionResult<ProjectDto>> Create([FromBody] ProjectCreateDto dto, CancellationToken ct)
    {
        if (await _db.Projects.AnyAsync(x => x.Code == dto.Code, ct))
            return BadRequest(new { error = "Проект с таким кодом уже существует", field = "code" });
        var entity = new Project
        {
            Name = dto.Name,
            Code = dto.Code,
            ReleaseDate = dto.ReleaseDate,
            ResponsibleId = dto.ResponsibleId
        };
        _db.Projects.Add(entity);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, new ProjectDto
        {
            Id = entity.Id,
            Name = entity.Name,
            Code = entity.Code,
            ReleaseDate = entity.ReleaseDate,
            ResponsibleId = entity.ResponsibleId
        });
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "ManagerOrAdmin")]
    public async Task<IActionResult> Update(int id, [FromBody] ProjectUpdateDto dto, CancellationToken ct)
    {
        var entity = await _db.Projects.FindAsync(new object[] { id }, ct);
        if (entity == null) return NotFound();
        if (dto.Name != null) entity.Name = dto.Name;
        if (dto.Code != null)
        {
            if (await _db.Projects.AnyAsync(x => x.Code == dto.Code && x.Id != id, ct))
                return BadRequest(new { error = "Проект с таким кодом уже существует", field = "code" });
            entity.Code = dto.Code;
        }
        if (dto.ReleaseDate.HasValue) entity.ReleaseDate = dto.ReleaseDate;
        if (dto.ResponsibleId.HasValue) entity.ResponsibleId = dto.ResponsibleId;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var entity = await _db.Projects.FindAsync(new object[] { id }, ct);
        if (entity == null) return NotFound();
        _db.Projects.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
