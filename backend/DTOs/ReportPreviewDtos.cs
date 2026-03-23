namespace UpzIt.Api.DTOs;

/// <summary>JSON-превью отчётов для отображения в веб-интерфейсе.</summary>
public record ItProjectsSummaryPreviewDto(IReadOnlyList<ItProjectsSummaryRowDto> Rows);

public record ItProjectsSummaryRowDto(
    string Name,
    string Code,
    string ReleaseDate,
    string ResponsibleName,
    int TotalTasks,
    int FeatureCount,
    int BugCount,
    int TechTaskCount);

public record AssigneeTasksPreviewDto(
    string AssigneeName,
    string AssigneeRole,
    IReadOnlyList<AssigneeTaskRowDto> Tasks,
    int Total,
    int InProgress,
    int Completed,
    double CompletedPct);

public record AssigneeTaskRowDto(
    string Title,
    string TypeName,
    string ProjectName,
    string DueDate,
    string StatusName,
    string PriorityName);

public record OverdueTasksPreviewDto(
    IReadOnlyList<OverdueTaskRowDto> Tasks,
    IReadOnlyList<OverdueByProjectDto> ByProject);

public record OverdueTaskRowDto(
    string Title,
    string TypeName,
    string ProjectName,
    string AssigneeName,
    string DueDate,
    string StatusName,
    int DaysOverdue);

public record OverdueByProjectDto(string Project, int Count);

public record TeamWorkloadPreviewDto(IReadOnlyList<TeamWorkloadRowDto> Rows);

public record TeamWorkloadRowDto(
    string FullName,
    string RoleName,
    int NewTasks,
    int InProgress,
    int InTest,
    int Done,
    int Postponed,
    int Total,
    double CompletedPct);

public record ProjectStatusesPreviewDto(IReadOnlyList<ProjectStatusRowDto> Rows);

public record ProjectStatusRowDto(
    string Name,
    string Code,
    string ResponsibleName,
    int Total,
    int Done,
    int InWork,
    int Overdue,
    double DonePct);
