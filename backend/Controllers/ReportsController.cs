using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UpzIt.Api.Services;

namespace UpzIt.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;
    private readonly ILogger<ReportsController> _logger;

    public ReportsController(IReportService reportService, ILogger<ReportsController> logger)
    {
        _reportService = reportService;
        _logger = logger;
    }

    /// <summary>1. Сводный отчёт по IT-проектам. Форматы: xlsx, pdf.</summary>
    [HttpGet("projects-summary")]
    public async Task<IActionResult> ProjectsSummary([FromQuery] string format = "xlsx", CancellationToken ct = default)
    {
        return await GetReportAsync("projects-summary", format, () => _reportService.ProjectsSummaryAsync(format, ct), "Сводка_по_проектам", ct);
    }

    /// <summary>2. Отчёт по задачам исполнителя. Форматы: xlsx, docx, pdf. Параметр assigneeId обязателен.</summary>
    [HttpGet("assignee-tasks")]
    public async Task<IActionResult> AssigneeTasks([FromQuery] int assigneeId, [FromQuery] string format = "xlsx", CancellationToken ct = default)
    {
        if (assigneeId <= 0)
            return BadRequest(new { error = "Укажите assigneeId" });
        return await GetReportAsync("assignee-tasks", format, () => _reportService.AssigneeTasksReportAsync(assigneeId, format, ct), "Задачи_исполнителя", ct);
    }

    /// <summary>3. Отчёт по просроченным задачам. Форматы: xlsx, pdf.</summary>
    [HttpGet("overdue-tasks")]
    public async Task<IActionResult> OverdueTasks([FromQuery] string format = "xlsx", CancellationToken ct = default)
    {
        return await GetReportAsync("overdue-tasks", format, () => _reportService.OverdueTasksReportAsync(format, ct), "Просроченные_задачи", ct);
    }

    /// <summary>4. Сводка по загрузке команды. Форматы: xlsx, docx. Опционально: sprintId.</summary>
    [HttpGet("team-workload")]
    public async Task<IActionResult> TeamWorkload([FromQuery] string format = "xlsx", [FromQuery] int? sprintId = null, CancellationToken ct = default)
    {
        return await GetReportAsync("team-workload", format, () => _reportService.TeamWorkloadReportAsync(format, sprintId, ct), "Загрузка_команды", ct);
    }

    /// <summary>5. Отчёт по статусам IT-проектов. Форматы: docx, pdf.</summary>
    [HttpGet("project-statuses")]
    public async Task<IActionResult> ProjectStatuses([FromQuery] string format = "pdf", CancellationToken ct = default)
    {
        return await GetReportAsync("project-statuses", format, () => _reportService.ProjectStatusesReportAsync(format, ct), "Статусы_проектов", ct);
    }

    private async Task<IActionResult> GetReportAsync(string reportName, string format, Func<Task<byte[]>> generate, string fileNamePrefix, CancellationToken ct)
    {
        try
        {
            var bytes = await generate();
            var (contentType, ext) = format.ToLowerInvariant() switch
            {
                "xlsx" => ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"),
                "docx" => ("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"),
                "pdf" => ("application/pdf", "pdf"),
                _ => throw new ArgumentException("Неподдерживаемый формат. Выберите xlsx, docx или pdf.")
            };
            var fileName = $"{fileNamePrefix}_{DateTime.Now:yyyyMMdd_HHmm}.{ext}";
            return File(bytes, contentType, fileName);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Ошибка формирования отчёта {Report}", reportName);
            return StatusCode(500, new { error = "Ошибка формирования отчёта. Рекомендуется повторить запрос.", details = ex.Message });
        }
    }
}
