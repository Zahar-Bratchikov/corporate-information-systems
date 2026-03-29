using Microsoft.EntityFrameworkCore;
using ClosedXML.Excel;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using UpzIt.Api.Data;
using UpzIt.Api.DTOs;
using WordDocument = DocumentFormat.OpenXml.Wordprocessing.Document;
using QuestPdfDocument = QuestPDF.Fluent.Document;

namespace UpzIt.Api.Services;

public interface IReportService
{
    Task<byte[]> ProjectsSummaryAsync(string format, CancellationToken ct = default);
    Task<byte[]> AssigneeTasksReportAsync(int assigneeId, string format, CancellationToken ct = default);
    Task<byte[]> OverdueTasksReportAsync(string format, CancellationToken ct = default);
    Task<byte[]> TeamWorkloadReportAsync(string format, int? sprintId, CancellationToken ct = default);
    Task<byte[]> ProjectStatusesReportAsync(string format, CancellationToken ct = default);

    Task<ItProjectsSummaryPreviewDto> GetItProjectsSummaryPreviewAsync(CancellationToken ct = default);
    Task<AssigneeTasksPreviewDto> GetAssigneeTasksPreviewAsync(int assigneeId, CancellationToken ct = default);
    Task<OverdueTasksPreviewDto> GetOverdueTasksPreviewAsync(CancellationToken ct = default);
    Task<TeamWorkloadPreviewDto> GetTeamWorkloadPreviewAsync(int? sprintId, CancellationToken ct = default);
    Task<ProjectStatusesPreviewDto> GetProjectStatusesPreviewAsync(CancellationToken ct = default);
}

public class ReportService : IReportService
{
    private readonly AppDbContext _db;

    public ReportService(AppDbContext db) => _db = db;

    public async Task<ItProjectsSummaryPreviewDto> GetItProjectsSummaryPreviewAsync(CancellationToken ct = default)
    {
        var rows = await GetItProjectsSummaryRowsAsync(ct);
        return new ItProjectsSummaryPreviewDto(rows);
    }

    private async Task<List<ItProjectsSummaryRowDto>> GetItProjectsSummaryRowsAsync(CancellationToken ct)
    {
        var projects = await _db.Projects
            .Include(p => p.Responsible)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.Code,
                p.ReleaseDate,
                ResponsibleName = p.Responsible != null ? p.Responsible.FullName : ""
            })
            .ToListAsync(ct);
        var taskCounts = await _db.Tasks
            .GroupBy(t => t.ProjectId)
            .Select(g => new { ProjectId = g.Key, Total = g.Count(), ByType = g.GroupBy(x => x.TypeId).Select(x => new { TypeId = x.Key, Count = x.Count() }) })
            .ToListAsync(ct);
        return projects.Select(p =>
        {
            var tc = taskCounts.FirstOrDefault(x => x.ProjectId == p.Id);
            var total = tc?.Total ?? 0;
            var byType = tc?.ByType.ToDictionary(x => x.TypeId, x => x.Count) ?? new Dictionary<int, int>();
            return new ItProjectsSummaryRowDto(
                p.Name,
                p.Code,
                p.ReleaseDate?.ToString("dd.MM.yyyy") ?? "",
                p.ResponsibleName,
                total,
                byType.GetValueOrDefault(1, 0),
                byType.GetValueOrDefault(2, 0),
                byType.GetValueOrDefault(3, 0));
        }).ToList();
    }

    public async Task<byte[]> ProjectsSummaryAsync(string format, CancellationToken ct = default)
    {
        var rows = await GetItProjectsSummaryRowsAsync(ct);
        return format.ToLowerInvariant() switch
        {
            "xlsx" => BuildProjectsSummaryExcel(rows),
            "pdf" => BuildProjectsSummaryPdf(rows),
            _ => throw new ArgumentException("Формат: xlsx, pdf")
        };
    }

    public async Task<AssigneeTasksPreviewDto> GetAssigneeTasksPreviewAsync(int assigneeId, CancellationToken ct = default)
    {
        var data = await GetAssigneeTasksDataAsync(assigneeId, ct);
        return new AssigneeTasksPreviewDto(
            data.AssigneeName,
            data.AssigneeRole,
            data.Tasks,
            data.Total,
            data.InProgress,
            data.Completed,
            data.CompletedPct);
    }

    private async Task<(List<AssigneeTaskRowDto> Tasks, string AssigneeName, string AssigneeRole, int Total, int InProgress, int Completed, double CompletedPct)> GetAssigneeTasksDataAsync(int assigneeId, CancellationToken ct)
    {
        var taskEntities = await _db.Tasks
            .Where(t => t.AssigneeId == assigneeId)
            .Include(t => t.Type).Include(t => t.Priority).Include(t => t.Status).Include(t => t.Project)
            .OrderBy(t => t.DueDate)
            .ToListAsync(ct);
        var tasks = taskEntities.Select(t => new AssigneeTaskRowDto(
            t.Title,
            t.Type.Name,
            t.Project.Name,
            t.DueDate?.ToString("dd.MM.yyyy") ?? "",
            t.Status.Name,
            t.Priority.Name)).ToList();
        var total = tasks.Count;
        var inProgress = taskEntities.Count(t => t.Status.Name == "В работе");
        var completed = taskEntities.Count(t => t.Status.Name == "Выполнена");
        var completedPct = total > 0 ? (double)completed / total * 100 : 0;
        var assignee = await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == assigneeId, ct);
        var assigneeName = assignee?.FullName ?? "Исполнитель";
        var assigneeRole = assignee?.Role?.Name ?? "";
        return (tasks, assigneeName, assigneeRole, total, inProgress, completed, completedPct);
    }

    public async Task<byte[]> AssigneeTasksReportAsync(int assigneeId, string format, CancellationToken ct = default)
    {
        var data = await GetAssigneeTasksDataAsync(assigneeId, ct);
        return format.ToLowerInvariant() switch
        {
            "xlsx" => BuildAssigneeTasksExcel(data.Tasks, data.AssigneeName, data.AssigneeRole, data.Total, data.InProgress, data.Completed, data.CompletedPct),
            "docx" => BuildAssigneeTasksWord(data.Tasks, data.AssigneeName, data.AssigneeRole, data.Total, data.InProgress, data.Completed, data.CompletedPct),
            "pdf" => BuildAssigneeTasksPdf(data.Tasks, data.AssigneeName, data.AssigneeRole, data.Total, data.InProgress, data.Completed, data.CompletedPct),
            _ => throw new ArgumentException("Формат: xlsx, docx, pdf")
        };
    }

    public async Task<OverdueTasksPreviewDto> GetOverdueTasksPreviewAsync(CancellationToken ct = default)
    {
        var (tasks, byProject) = await GetOverdueTasksDataAsync(ct);
        return new OverdueTasksPreviewDto(tasks, byProject);
    }

    private async Task<(List<OverdueTaskRowDto> Tasks, List<OverdueByProjectDto> ByProject)> GetOverdueTasksDataAsync(CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var raw = await _db.Tasks
            .Where(t => t.DueDate.HasValue && t.DueDate.Value < today)
            .Include(t => t.Type).Include(t => t.Status).Include(t => t.Project).Include(t => t.Assignee)
            .Select(t => new
            {
                t.Title,
                t.DueDate,
                TypeName = t.Type.Name,
                ProjectName = t.Project.Name,
                AssigneeName = t.Assignee != null ? t.Assignee.FullName : "",
                StatusName = t.Status!.Name,
                DaysOverdue = (today.DayNumber - t.DueDate!.Value.DayNumber)
            })
            .ToListAsync(ct);
        var tasks = raw.Select(t => new OverdueTaskRowDto(
            t.Title,
            t.TypeName,
            t.ProjectName,
            t.AssigneeName,
            t.DueDate?.ToString("dd.MM.yyyy") ?? "",
            t.StatusName,
            t.DaysOverdue)).ToList();
        var byProject = raw.GroupBy(t => t.ProjectName).Select(g => new OverdueByProjectDto(g.Key, g.Count())).ToList();
        return (tasks, byProject);
    }

    public async Task<byte[]> OverdueTasksReportAsync(string format, CancellationToken ct = default)
    {
        var (tasks, byProject) = await GetOverdueTasksDataAsync(ct);
        return format.ToLowerInvariant() switch
        {
            "xlsx" => BuildOverdueExcel(tasks, byProject),
            "pdf" => BuildOverduePdf(tasks, byProject),
            _ => throw new ArgumentException("Формат: xlsx, pdf")
        };
    }

    public async Task<TeamWorkloadPreviewDto> GetTeamWorkloadPreviewAsync(int? sprintId, CancellationToken ct = default)
    {
        var rows = await GetTeamWorkloadRowsAsync(sprintId, ct);
        return new TeamWorkloadPreviewDto(rows);
    }

    private async Task<List<TeamWorkloadRowDto>> GetTeamWorkloadRowsAsync(int? sprintId, CancellationToken ct)
    {
        var query = _db.Users.Where(u => u.RoleId == 3).AsQueryable(); // developers/QA
        var assigneeIds = await query.Select(u => u.Id).ToListAsync(ct);
        var tasksQuery = _db.Tasks.Where(t => t.AssigneeId != null && assigneeIds.Contains(t.AssigneeId.Value));
        if (sprintId.HasValue) tasksQuery = tasksQuery.Where(t => t.SprintId == sprintId.Value);
        var tasks = await tasksQuery
            .Include(t => t.Status).Include(t => t.Assignee!).ThenInclude(a => a!.Role)
            .ToListAsync(ct);
        return tasks.GroupBy(t => t.AssigneeId!.Value).Select(g =>
        {
            var u = g.First().Assignee!;
            var list = g.ToList();
            var total = list.Count;
            var byStatus = list.GroupBy(x => x.Status.Name).ToDictionary(x => x.Key, x => x.Count());
            var completed = byStatus.GetValueOrDefault("Выполнена", 0);
            var pct = total > 0 ? (double)completed / total * 100 : 0;
            return new TeamWorkloadRowDto(
                u.FullName,
                u.Role?.Name ?? "",
                byStatus.GetValueOrDefault("Новая", 0),
                byStatus.GetValueOrDefault("В работе", 0),
                byStatus.GetValueOrDefault("В тестировании", 0),
                completed,
                byStatus.GetValueOrDefault("Отложена", 0),
                total,
                pct);
        }).OrderBy(x => x.FullName).ToList();
    }

    public async Task<byte[]> TeamWorkloadReportAsync(string format, int? sprintId, CancellationToken ct = default)
    {
        var byUser = await GetTeamWorkloadRowsAsync(sprintId, ct);
        return format.ToLowerInvariant() switch
        {
            "xlsx" => BuildTeamWorkloadExcel(byUser),
            "docx" => BuildTeamWorkloadWord(byUser),
            _ => throw new ArgumentException("Формат: xlsx, docx")
        };
    }

    public async Task<ProjectStatusesPreviewDto> GetProjectStatusesPreviewAsync(CancellationToken ct = default)
    {
        var rows = await GetProjectStatusRowsAsync(ct);
        return new ProjectStatusesPreviewDto(rows);
    }

    private async Task<List<ProjectStatusRowDto>> GetProjectStatusRowsAsync(CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var projects = await _db.Projects.Include(p => p.Responsible).ToListAsync(ct);
        var taskLists = await _db.Tasks.Include(t => t.Status).GroupBy(t => t.ProjectId).ToListAsync(ct);
        return projects.Select(p =>
        {
            var projTasks = taskLists.Where(g => g.Key == p.Id).SelectMany(g => g).ToList();
            var total = projTasks.Count;
            var done = projTasks.Count(t => t.Status.Name == "Выполнена");
            var inWork = projTasks.Count(t => t.Status.Name == "В работе");
            var overdue = projTasks.Count(t => t.DueDate.HasValue && t.DueDate.Value < today && t.Status.Name != "Выполнена");
            var pct = total > 0 ? (double)done / total * 100 : 0;
            return new ProjectStatusRowDto(
                p.Name,
                p.Code,
                p.Responsible?.FullName ?? "",
                total,
                done,
                inWork,
                overdue,
                pct);
        }).ToList();
    }

    public async Task<byte[]> ProjectStatusesReportAsync(string format, CancellationToken ct = default)
    {
        var rows = await GetProjectStatusRowsAsync(ct);
        return format.ToLowerInvariant() switch
        {
            "docx" => BuildProjectStatusesWord(rows),
            "pdf" => BuildProjectStatusesPdf(rows),
            _ => throw new ArgumentException("Формат: docx, pdf")
        };
    }

    private static byte[] BuildProjectsSummaryExcel(IReadOnlyList<ItProjectsSummaryRowDto> rows)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Сводка по проектам");
        ws.Cell(1, 1).Value = "Наименование"; ws.Cell(1, 2).Value = "Код"; ws.Cell(1, 3).Value = "Дата релиза";
        ws.Cell(1, 4).Value = "Ответственный"; ws.Cell(1, 5).Value = "Всего задач"; ws.Cell(1, 6).Value = "Фича"; ws.Cell(1, 7).Value = "Баг"; ws.Cell(1, 8).Value = "Техн. задача";
        int r = 2;
        foreach (var row in rows)
        {
            ws.Cell(r, 1).Value = row.Name; ws.Cell(r, 2).Value = row.Code; ws.Cell(r, 3).Value = row.ReleaseDate;
            ws.Cell(r, 4).Value = row.ResponsibleName; ws.Cell(r, 5).Value = row.TotalTasks;
            ws.Cell(r, 6).Value = row.FeatureCount; ws.Cell(r, 7).Value = row.BugCount; ws.Cell(r, 8).Value = row.TechTaskCount;
            r++;
        }
        using var ms = new MemoryStream();
        wb.SaveAs(ms, false);
        return ms.ToArray();
    }

    private static byte[] BuildProjectsSummaryPdf(IReadOnlyList<ItProjectsSummaryRowDto> rows)
    {
        QuestPDF.Settings.License = LicenseType.Community;
        var doc = QuestPdfDocument.Create(container =>
        {
            container.Page(p =>
            {
                p.Header().Text("Сводный отчёт по IT-проектам").Bold().FontSize(14);
                p.Content().Table(t =>
                {
                    t.ColumnsDefinition(c =>
                    {
                        c.ConstantColumn(80); c.ConstantColumn(50); c.ConstantColumn(60);
                        c.ConstantColumn(80); c.ConstantColumn(50); c.ConstantColumn(35); c.ConstantColumn(35); c.ConstantColumn(50);
                    });
                    t.Header(h =>
                    {
                        h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Наименование");
                        h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Код");
                        h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Дата релиза");
                        h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Ответственный");
                        h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Всего");
                        h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Фича");
                        h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Баг");
                        h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Техн. задача");
                    });
                    foreach (var row in rows)
                    {
                        t.Cell().Padding(4).Text(row.Name);
                        t.Cell().Padding(4).Text(row.Code);
                        t.Cell().Padding(4).Text(row.ReleaseDate);
                        t.Cell().Padding(4).Text(row.ResponsibleName);
                        t.Cell().Padding(4).Text(row.TotalTasks.ToString());
                        t.Cell().Padding(4).Text(row.FeatureCount.ToString());
                        t.Cell().Padding(4).Text(row.BugCount.ToString());
                        t.Cell().Padding(4).Text(row.TechTaskCount.ToString());
                    }
                });
            });
        });
        return doc.GeneratePdf();
    }

    private static byte[] BuildAssigneeTasksExcel(
        IReadOnlyList<AssigneeTaskRowDto> tasks, string assigneeName, string roleName,
        int total, int inProgress, int completed, double completedPct)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Задачи исполнителя");
        ws.Cell(1, 1).Value = "Название"; ws.Cell(1, 2).Value = "Тип"; ws.Cell(1, 3).Value = "Проект"; ws.Cell(1, 4).Value = "Срок"; ws.Cell(1, 5).Value = "Статус"; ws.Cell(1, 6).Value = "Приоритет";
        int r = 2;
        foreach (var t in tasks)
        {
            ws.Cell(r, 1).Value = t.Title; ws.Cell(r, 2).Value = t.TypeName; ws.Cell(r, 3).Value = t.ProjectName;
            ws.Cell(r, 4).Value = t.DueDate; ws.Cell(r, 5).Value = t.StatusName; ws.Cell(r, 6).Value = t.PriorityName;
            r++;
        }
        r++; ws.Cell(r, 1).Value = "Итого:"; ws.Cell(r, 2).Value = $"Всего: {total}, В работе: {inProgress}, Выполнено: {completed}, Доля выполненных: {completedPct:F1}%";
        using var ms = new MemoryStream();
        wb.SaveAs(ms, false);
        return ms.ToArray();
    }

    private static byte[] BuildAssigneeTasksWord(
        IReadOnlyList<AssigneeTaskRowDto> tasks, string assigneeName, string roleName,
        int total, int inProgress, int completed, double completedPct)
    {
        var table = new Table(new TableProperties(new TableBorders()));
        table.AppendChild(new TableRow(
            new TableCell(new Paragraph(new Run(new Text("Название")))),
            new TableCell(new Paragraph(new Run(new Text("Тип")))),
            new TableCell(new Paragraph(new Run(new Text("Проект")))),
            new TableCell(new Paragraph(new Run(new Text("Срок")))),
            new TableCell(new Paragraph(new Run(new Text("Статус")))),
            new TableCell(new Paragraph(new Run(new Text("Приоритет"))))));
        foreach (var t in tasks)
        {
            table.AppendChild(new TableRow(
                new TableCell(new Paragraph(new Run(new Text(t.Title)))),
                new TableCell(new Paragraph(new Run(new Text(t.TypeName)))),
                new TableCell(new Paragraph(new Run(new Text(t.ProjectName)))),
                new TableCell(new Paragraph(new Run(new Text(t.DueDate)))),
                new TableCell(new Paragraph(new Run(new Text(t.StatusName)))),
                new TableCell(new Paragraph(new Run(new Text(t.PriorityName))))));
        }
        var body = new Body(
            new Paragraph(new Run(new Text($"Отчёт по задачам исполнителя: {assigneeName} ({roleName})"))),
            new Paragraph(new Run(new Text(""))),
            table,
            new Paragraph(new Run(new Text($"Итого: всего {total}, в работе {inProgress}, выполнено {completed}, доля выполненных {completedPct:F1}%"))));
        using var ms = new MemoryStream();
        using (var doc = WordprocessingDocument.Create(ms, DocumentFormat.OpenXml.WordprocessingDocumentType.Document))
        {
            doc.AddMainDocumentPart().Document = new WordDocument(body);
        }
        return ms.ToArray();
    }

    private static byte[] BuildAssigneeTasksPdf(
        IReadOnlyList<AssigneeTaskRowDto> tasks, string assigneeName, string roleName,
        int total, int inProgress, int completed, double completedPct)
    {
        QuestPDF.Settings.License = LicenseType.Community;
        var doc = QuestPdfDocument.Create(c =>
        {
            c.Page(p =>
            {
                p.Header().Text($"Отчёт по задачам исполнителя: {assigneeName} ({roleName})").Bold().FontSize(14);
                p.Content().Table(t =>
                {
                    t.ColumnsDefinition(cd => { cd.RelativeColumn(); cd.RelativeColumn(); cd.RelativeColumn(); cd.RelativeColumn(); cd.RelativeColumn(); cd.RelativeColumn(); });
                    t.Header(h =>
                    {
                        h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Название");
                        h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Тип");
                        h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Проект");
                        h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Срок");
                        h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Статус");
                        h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Приоритет");
                    });
                    foreach (var row in tasks)
                    {
                        t.Cell().Padding(4).Text(row.Title);
                        t.Cell().Padding(4).Text(row.TypeName);
                        t.Cell().Padding(4).Text(row.ProjectName);
                        t.Cell().Padding(4).Text(row.DueDate);
                        t.Cell().Padding(4).Text(row.StatusName);
                        t.Cell().Padding(4).Text(row.PriorityName);
                    }
                });
                p.Footer().AlignCenter().Text($"Всего: {total}, в работе: {inProgress}, выполнено: {completed}, доля выполненных: {completedPct:F1}%");
            });
        });
        return doc.GeneratePdf();
    }

    private static byte[] BuildOverdueExcel(IReadOnlyList<OverdueTaskRowDto> tasks, IReadOnlyList<OverdueByProjectDto> byProject)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Просроченные");
        ws.Cell(1, 1).Value = "Название"; ws.Cell(1, 2).Value = "Тип"; ws.Cell(1, 3).Value = "Проект"; ws.Cell(1, 4).Value = "Исполнитель"; ws.Cell(1, 5).Value = "Дедлайн"; ws.Cell(1, 6).Value = "Статус"; ws.Cell(1, 7).Value = "Дней просрочки";
        int r = 2;
        foreach (var t in tasks)
        {
            ws.Cell(r, 1).Value = t.Title; ws.Cell(r, 2).Value = t.TypeName; ws.Cell(r, 3).Value = t.ProjectName;
            ws.Cell(r, 4).Value = t.AssigneeName; ws.Cell(r, 5).Value = t.DueDate; ws.Cell(r, 6).Value = t.StatusName; ws.Cell(r, 7).Value = t.DaysOverdue;
            r++;
        }
        var ws2 = wb.Worksheets.Add("По проектам");
        ws2.Cell(1, 1).Value = "Проект"; ws2.Cell(1, 2).Value = "Кол-во просроченных";
        for (int i = 0; i < byProject.Count; i++)
        {
            ws2.Cell(i + 2, 1).Value = byProject[i].Project;
            ws2.Cell(i + 2, 2).Value = byProject[i].Count;
        }
        using var ms = new MemoryStream();
        wb.SaveAs(ms, false);
        return ms.ToArray();
    }

    private static byte[] BuildOverduePdf(IReadOnlyList<OverdueTaskRowDto> tasks, IReadOnlyList<OverdueByProjectDto> byProject)
    {
        QuestPDF.Settings.License = LicenseType.Community;
        const int maxRowsPerPage = 35;
        var taskPages = new List<IReadOnlyList<OverdueTaskRowDto>>();
        if (tasks.Count == 0)
            taskPages.Add(Array.Empty<OverdueTaskRowDto>());
        else
        {
            foreach (var chunk in tasks.Chunk(maxRowsPerPage))
                taskPages.Add(chunk.ToArray());
        }

        var doc = QuestPdfDocument.Create(c =>
        {
            for (var pageIndex = 0; pageIndex < taskPages.Count; pageIndex++)
            {
                var slice = taskPages[pageIndex];
                var headerText = pageIndex == 0
                    ? "Отчёт по просроченным задачам"
                    : "Отчёт по просроченным задачам (продолжение)";
                c.Page(p =>
                {
                    p.Header().Text(headerText).Bold().FontSize(14);
                    p.Content().Table(t =>
                    {
                        t.ColumnsDefinition(cd =>
                        {
                            cd.RelativeColumn(2);
                            cd.RelativeColumn();
                            cd.RelativeColumn();
                            cd.RelativeColumn();
                            cd.ConstantColumn(60);
                            cd.RelativeColumn();
                            cd.ConstantColumn(50);
                        });
                        t.Header(h =>
                        {
                            h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Название");
                            h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Тип");
                            h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Проект");
                            h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Исполнитель");
                            h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Дедлайн");
                            h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Статус");
                            h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Дней просрочки");
                        });
                        if (slice.Count == 0)
                            t.Cell().ColumnSpan(7).Padding(4).Text("Просроченных задач нет.");
                        else
                        {
                            foreach (var row in slice)
                            {
                                t.Cell().Padding(4).Text(row.Title);
                                t.Cell().Padding(4).Text(row.TypeName);
                                t.Cell().Padding(4).Text(row.ProjectName);
                                t.Cell().Padding(4).Text(row.AssigneeName);
                                t.Cell().Padding(4).Text(row.DueDate);
                                t.Cell().Padding(4).Text(row.StatusName);
                                t.Cell().Padding(4).Text(row.DaysOverdue.ToString());
                            }
                        }
                    });
                });
            }

            c.Page(p =>
            {
                p.Header().Text("Отчёт по просроченным задачам — сводка по проектам").Bold().FontSize(14);
                p.Content().Table(t2 =>
                {
                    t2.ColumnsDefinition(cd => { cd.RelativeColumn(); cd.ConstantColumn(80); });
                    t2.Header(h =>
                    {
                        h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Проект");
                        h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Кол-во");
                    });
                    if (byProject.Count == 0)
                        t2.Cell().ColumnSpan(2).Padding(4).Text("Нет данных");
                    else
                    {
                        foreach (var row in byProject)
                        {
                            t2.Cell().Padding(4).Text(row.Project);
                            t2.Cell().Padding(4).Text(row.Count.ToString());
                        }
                    }
                });
            });
        });
        return doc.GeneratePdf();
    }

    private static byte[] BuildTeamWorkloadExcel(IReadOnlyList<TeamWorkloadRowDto> byUser)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Загрузка команды");
        ws.Cell(1, 1).Value = "ФИО"; ws.Cell(1, 2).Value = "Роль"; ws.Cell(1, 3).Value = "Новая"; ws.Cell(1, 4).Value = "В работе"; ws.Cell(1, 5).Value = "В тестировании"; ws.Cell(1, 6).Value = "Выполнена"; ws.Cell(1, 7).Value = "Отложена"; ws.Cell(1, 8).Value = "Всего"; ws.Cell(1, 9).Value = "Доля завершённых %";
        int r = 2;
        foreach (var row in byUser)
        {
            ws.Cell(r, 1).Value = row.FullName; ws.Cell(r, 2).Value = row.RoleName;
            ws.Cell(r, 3).Value = row.NewTasks; ws.Cell(r, 4).Value = row.InProgress; ws.Cell(r, 5).Value = row.InTest; ws.Cell(r, 6).Value = row.Done; ws.Cell(r, 7).Value = row.Postponed;
            ws.Cell(r, 8).Value = row.Total; ws.Cell(r, 9).Value = $"{row.CompletedPct:F1}";
            r++;
        }
        using var ms = new MemoryStream();
        wb.SaveAs(ms, false);
        return ms.ToArray();
    }

    private static byte[] BuildTeamWorkloadWord(IReadOnlyList<TeamWorkloadRowDto> byUser)
    {
        var table = new Table(new TableProperties(new TableBorders()));
        table.AppendChild(new TableRow(
            new TableCell(new Paragraph(new Run(new Text("ФИО")))),
            new TableCell(new Paragraph(new Run(new Text("Роль")))),
            new TableCell(new Paragraph(new Run(new Text("Новая")))),
            new TableCell(new Paragraph(new Run(new Text("В работе")))),
            new TableCell(new Paragraph(new Run(new Text("В тестировании")))),
            new TableCell(new Paragraph(new Run(new Text("Выполнена")))),
            new TableCell(new Paragraph(new Run(new Text("Отложена")))),
            new TableCell(new Paragraph(new Run(new Text("Всего")))),
            new TableCell(new Paragraph(new Run(new Text("Доля завершённых %"))))));
        foreach (var row in byUser)
        {
            table.AppendChild(new TableRow(
                new TableCell(new Paragraph(new Run(new Text(row.FullName)))),
                new TableCell(new Paragraph(new Run(new Text(row.RoleName)))),
                new TableCell(new Paragraph(new Run(new Text(row.NewTasks.ToString())))),
                new TableCell(new Paragraph(new Run(new Text(row.InProgress.ToString())))),
                new TableCell(new Paragraph(new Run(new Text(row.InTest.ToString())))),
                new TableCell(new Paragraph(new Run(new Text(row.Done.ToString())))),
                new TableCell(new Paragraph(new Run(new Text(row.Postponed.ToString())))),
                new TableCell(new Paragraph(new Run(new Text(row.Total.ToString())))),
                new TableCell(new Paragraph(new Run(new Text(row.CompletedPct.ToString("F1") + "%"))))));
        }
        var body = new Body(
            new Paragraph(new Run(new Text("Сводка по загрузке команды"))),
            new Paragraph(new Run(new Text(""))),
            table);
        using var ms = new MemoryStream();
        using (var doc = WordprocessingDocument.Create(ms, DocumentFormat.OpenXml.WordprocessingDocumentType.Document))
        {
            doc.AddMainDocumentPart().Document = new WordDocument(body);
        }
        return ms.ToArray();
    }

    private static byte[] BuildProjectStatusesWord(IReadOnlyList<ProjectStatusRowDto> rows)
    {
        var table = new Table(new TableProperties(new TableBorders()));
        table.AppendChild(new TableRow(
            new TableCell(new Paragraph(new Run(new Text("Наименование")))),
            new TableCell(new Paragraph(new Run(new Text("Код")))),
            new TableCell(new Paragraph(new Run(new Text("Ответственный")))),
            new TableCell(new Paragraph(new Run(new Text("Всего задач")))),
            new TableCell(new Paragraph(new Run(new Text("Выполнена")))),
            new TableCell(new Paragraph(new Run(new Text("В работе")))),
            new TableCell(new Paragraph(new Run(new Text("Просрочено")))),
            new TableCell(new Paragraph(new Run(new Text("% выполнения"))))));
        foreach (var row in rows)
        {
            table.AppendChild(new TableRow(
                new TableCell(new Paragraph(new Run(new Text(row.Name)))),
                new TableCell(new Paragraph(new Run(new Text(row.Code)))),
                new TableCell(new Paragraph(new Run(new Text(row.ResponsibleName)))),
                new TableCell(new Paragraph(new Run(new Text(row.Total.ToString())))),
                new TableCell(new Paragraph(new Run(new Text(row.Done.ToString())))),
                new TableCell(new Paragraph(new Run(new Text(row.InWork.ToString())))),
                new TableCell(new Paragraph(new Run(new Text(row.Overdue.ToString())))),
                new TableCell(new Paragraph(new Run(new Text(row.DonePct.ToString("F1") + "%"))))));
        }
        var body = new Body(
            new Paragraph(new Run(new Text("Отчёт по статусам IT-проектов"))),
            new Paragraph(new Run(new Text(""))),
            table);
        using var ms = new MemoryStream();
        using (var doc = WordprocessingDocument.Create(ms, DocumentFormat.OpenXml.WordprocessingDocumentType.Document))
        {
            doc.AddMainDocumentPart().Document = new WordDocument(body);
        }
        return ms.ToArray();
    }

    private static byte[] BuildProjectStatusesPdf(IReadOnlyList<ProjectStatusRowDto> rows)
    {
        QuestPDF.Settings.License = LicenseType.Community;
        var doc = QuestPdfDocument.Create(c =>
        {
            c.Page(p =>
            {
                p.Header().Text("Отчёт по статусам IT-проектов").Bold().FontSize(14);
                p.Content().Table(t =>
                {
                    t.ColumnsDefinition(cd => { cd.RelativeColumn(); cd.ConstantColumn(50); cd.RelativeColumn(); cd.ConstantColumn(40); cd.ConstantColumn(40); cd.ConstantColumn(40); cd.ConstantColumn(40); cd.ConstantColumn(50); });
                    t.Header(h =>
                    {
                        h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Наименование");
                        h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Код");
                        h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Ответственный");
                        h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Всего");
                        h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Выполнена");
                        h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("В работе");
                        h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("Просрочено");
                        h.Cell().Background(Colors.Grey.Lighten2).Padding(4).Text("% вып.");
                    });
                    foreach (var row in rows)
                    {
                        t.Cell().Padding(4).Text(row.Name);
                        t.Cell().Padding(4).Text(row.Code);
                        t.Cell().Padding(4).Text(row.ResponsibleName);
                        t.Cell().Padding(4).Text(row.Total.ToString());
                        t.Cell().Padding(4).Text(row.Done.ToString());
                        t.Cell().Padding(4).Text(row.InWork.ToString());
                        t.Cell().Padding(4).Text(row.Overdue.ToString());
                        t.Cell().Padding(4).Text(row.DonePct.ToString("F1") + "%");
                    }
                });
            });
        });
        return doc.GeneratePdf();
    }
}
