using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using UpzIt.Api.Data;
using UpzIt.Api.DTOs;
using UpzIt.Api.Entities;
using TaskEntity = UpzIt.Api.Entities.Task;

namespace UpzIt.Api.Controllers;

[ApiController]
[Route("api/tasks")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly AppDbContext _db;

    public TasksController(AppDbContext db) => _db = db;

    private int? CurrentUserId => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
    private bool IsAdmin => User.IsInRole("Администратор");
    private bool IsManager => User.IsInRole("Руководитель проекта / Тимлид");
    private bool IsObserver => User.IsInRole("Наблюдатель");

    [HttpGet]
    public async Task<ActionResult<List<TaskDto>>> GetAll(
        [FromQuery] int? projectId,
        [FromQuery] int? assigneeId,
        [FromQuery] int? statusId,
        CancellationToken ct)
    {
        var query = _db.Tasks
            .Include(t => t.Type)
            .Include(t => t.Priority)
            .Include(t => t.Status)
            .Include(t => t.Project)
            .Include(t => t.Sprint)
            .Include(t => t.Assignee)
            .AsQueryable();

        if (IsObserver || (!IsAdmin && !IsManager))
            query = query.Where(t => t.AssigneeId == CurrentUserId);
        if (projectId.HasValue) query = query.Where(t => t.ProjectId == projectId.Value);
        if (assigneeId.HasValue) query = query.Where(t => t.AssigneeId == assigneeId.Value);
        if (statusId.HasValue) query = query.Where(t => t.StatusId == statusId.Value);

        var list = await query.OrderBy(t => t.DueDate)
            .Select(t => new TaskDto
            {
                Id = t.Id,
                Title = t.Title,
                DueDate = t.DueDate,
                TypeId = t.TypeId,
                TypeName = t.Type.Name,
                PriorityId = t.PriorityId,
                PriorityName = t.Priority.Name,
                StatusId = t.StatusId,
                StatusName = t.Status.Name,
                ProjectId = t.ProjectId,
                ProjectName = t.Project.Name,
                SprintId = t.SprintId,
                SprintName = t.Sprint != null ? t.Sprint.Name : null,
                AssigneeId = t.AssigneeId,
                AssigneeName = t.Assignee != null ? t.Assignee.FullName : null
            })
            .ToListAsync(ct);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TaskDto>> GetById(int id, CancellationToken ct)
    {
        var t = await _db.Tasks
            .Include(x => x.Type).Include(x => x.Priority).Include(x => x.Status)
            .Include(x => x.Project).Include(x => x.Sprint).Include(x => x.Assignee)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t == null) return NotFound();
        if (!IsAdmin && !IsManager && t.AssigneeId != CurrentUserId) return Forbid();
        return Ok(new TaskDto
        {
            Id = t.Id,
            Title = t.Title,
            DueDate = t.DueDate,
            TypeId = t.TypeId,
            TypeName = t.Type.Name,
            PriorityId = t.PriorityId,
            PriorityName = t.Priority.Name,
            StatusId = t.StatusId,
            StatusName = t.Status.Name,
            ProjectId = t.ProjectId,
            ProjectName = t.Project.Name,
            SprintId = t.SprintId,
            SprintName = t.Sprint?.Name,
            AssigneeId = t.AssigneeId,
            AssigneeName = t.Assignee?.FullName
        });
    }

    [HttpPost]
    [Authorize(Policy = "NotObserver")]
    public async Task<ActionResult<TaskDto>> Create([FromBody] TaskCreateDto dto, CancellationToken ct)
    {
        if (!IsAdmin && !IsManager) return Forbid();
        var entity = new TaskEntity
        {
            Title = dto.Title,
            DueDate = dto.DueDate,
            TypeId = dto.TypeId,
            PriorityId = dto.PriorityId,
            StatusId = dto.StatusId,
            ProjectId = dto.ProjectId,
            SprintId = dto.SprintId,
            AssigneeId = dto.AssigneeId
        };
        _db.Tasks.Add(entity);
        await _db.SaveChangesAsync(ct);
        var created = await _db.Tasks.Include(x => x.Type).Include(x => x.Priority).Include(x => x.Status)
            .Include(x => x.Project).Include(x => x.Sprint).Include(x => x.Assignee)
            .FirstAsync(x => x.Id == entity.Id, ct);
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, Map(created));
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "NotObserver")]
    public async Task<IActionResult> Update(int id, [FromBody] TaskUpdateDto dto, CancellationToken ct)
    {
        var entity = await _db.Tasks.FindAsync(new object[] { id }, ct);
        if (entity == null) return NotFound();
        if (IsManager || IsAdmin) { }
        else if (entity.AssigneeId != CurrentUserId)
            return Forbid();
        if (dto.Title != null) entity.Title = dto.Title;
        if (dto.DueDate.HasValue) entity.DueDate = dto.DueDate;
        if (dto.TypeId.HasValue) entity.TypeId = dto.TypeId.Value;
        if (dto.PriorityId.HasValue) entity.PriorityId = dto.PriorityId.Value;
        if (dto.StatusId.HasValue) entity.StatusId = dto.StatusId.Value;
        if (dto.ProjectId.HasValue) entity.ProjectId = dto.ProjectId.Value;
        if (dto.SprintId.HasValue) entity.SprintId = dto.SprintId;
        if (dto.AssigneeId.HasValue) entity.AssigneeId = dto.AssigneeId;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "ManagerOrAdmin")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var entity = await _db.Tasks.FindAsync(new object[] { id }, ct);
        if (entity == null) return NotFound();
        _db.Tasks.Remove(entity);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static TaskDto Map(TaskEntity t) => new()
    {
        Id = t.Id,
        Title = t.Title,
        DueDate = t.DueDate,
        TypeId = t.TypeId,
        TypeName = t.Type.Name,
        PriorityId = t.PriorityId,
        PriorityName = t.Priority.Name,
        StatusId = t.StatusId,
        StatusName = t.Status.Name,
        ProjectId = t.ProjectId,
        ProjectName = t.Project.Name,
        SprintId = t.SprintId,
        SprintName = t.Sprint?.Name,
        AssigneeId = t.AssigneeId,
        AssigneeName = t.Assignee?.FullName
    };
}
