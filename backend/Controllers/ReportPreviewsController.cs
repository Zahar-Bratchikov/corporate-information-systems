using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UpzIt.Api.DTOs;
using UpzIt.Api.Services;

namespace UpzIt.Api.Controllers;

/// <summary>JSON-превью отчётов для отображения в веб-интерфейсе (те же данные, что уходят в файлы).</summary>
[ApiController]
[Route("api/reports/previews")]
[Authorize]
public class ReportPreviewsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportPreviewsController(IReportService reportService) => _reportService = reportService;

    [HttpGet("it-projects-summary")]
    [ProducesResponseType(typeof(ItProjectsSummaryPreviewDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ItProjectsSummaryPreviewDto>> ItProjectsSummary(CancellationToken ct)
        => Ok(await _reportService.GetItProjectsSummaryPreviewAsync(ct));

    [HttpGet("tasks-by-assignee")]
    [ProducesResponseType(typeof(AssigneeTasksPreviewDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AssigneeTasksPreviewDto>> TasksByAssignee([FromQuery] int assigneeId, CancellationToken ct)
    {
        if (assigneeId <= 0)
            return BadRequest(new { error = "Укажите assigneeId" });
        return Ok(await _reportService.GetAssigneeTasksPreviewAsync(assigneeId, ct));
    }

    [HttpGet("overdue-tasks")]
    [ProducesResponseType(typeof(OverdueTasksPreviewDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<OverdueTasksPreviewDto>> OverdueTasks(CancellationToken ct)
        => Ok(await _reportService.GetOverdueTasksPreviewAsync(ct));

    [HttpGet("team-assignee-workload")]
    [ProducesResponseType(typeof(TeamWorkloadPreviewDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<TeamWorkloadPreviewDto>> TeamWorkload([FromQuery] int? sprintId, CancellationToken ct)
        => Ok(await _reportService.GetTeamWorkloadPreviewAsync(sprintId, ct));

    [HttpGet("it-projects-status-overview")]
    [ProducesResponseType(typeof(ProjectStatusesPreviewDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ProjectStatusesPreviewDto>> ProjectStatuses(CancellationToken ct)
        => Ok(await _reportService.GetProjectStatusesPreviewAsync(ct));
}
