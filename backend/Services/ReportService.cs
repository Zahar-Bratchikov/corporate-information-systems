using Microsoft.EntityFrameworkCore;
using ClosedXML.Excel;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using UpzIt.Api.Data;
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
}

public class ReportService : IReportService
{
    private readonly AppDbContext _db;

    public ReportService(AppDbContext db) => _db = db;

    public async Task<byte[]> ProjectsSummaryAsync(string format, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
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
        var typeNames = await _db.TaskTypes.ToDictionaryAsync(t => t.Id, t => t.Name, ct);
        var rows = projects.Select(p =>
        {
            var tc = taskCounts.FirstOrDefault(x => x.ProjectId == p.Id);
            var total = tc?.Total ?? 0;
            var byType = tc?.ByType.ToDictionary(x => x.TypeId, x => x.Count) ?? new Dictionary<int, int>();
            return new
            {
                p.Name,
                p.Code,
                ReleaseDate = p.ReleaseDate?.ToString("dd.MM.yyyy") ?? "",
                ResponsibleName = p.ResponsibleName,
                TotalTasks = total,
                FeatureCount = byType.GetValueOrDefault(1, 0),
                BugCount = byType.GetValueOrDefault(2, 0),
                TechTaskCount = byType.GetValueOrDefault(3, 0)
            };
        }).ToList();

        return format.ToLowerInvariant() switch
        {
            "xlsx" => BuildProjectsSummaryExcel(rows.Cast<object>()),
            "pdf" => BuildProjectsSummaryPdf(rows.Cast<object>()),
            _ => throw new ArgumentException("Формат: xlsx, pdf")
        };
    }

    public async Task<byte[]> AssigneeTasksReportAsync(int assigneeId, string format, CancellationToken ct = default)
    {
        var tasks = await _db.Tasks
            .Where(t => t.AssigneeId == assigneeId)
            .Include(t => t.Type).Include(t => t.Priority).Include(t => t.Status).Include(t => t.Project)
            .OrderBy(t => t.DueDate)
            .Select(t => new { t.Title, t.DueDate, TypeName = t.Type.Name, t.Project.Name, StatusName = t.Status.Name, PriorityName = t.Priority.Name })
            .ToListAsync(ct);
        var total = tasks.Count;
        var inProgress = tasks.Count(t => t.StatusName == "В работе");
        var completed = tasks.Count(t => t.StatusName == "Выполнена");
        var completedPct = total > 0 ? (double)completed / total * 100 : 0;
        var assignee = await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == assigneeId, ct);
        var assigneeName = assignee?.FullName ?? "Исполнитель";
        var assigneeRole = assignee?.Role?.Name ?? "";

        return format.ToLowerInvariant() switch
        {
            "xlsx" => BuildAssigneeTasksExcel(tasks.Cast<object>(), assigneeName, assigneeRole, total, inProgress, completed, completedPct),
            "docx" => BuildAssigneeTasksWord(tasks.Cast<object>(), assigneeName, assigneeRole, total, inProgress, completed, completedPct),
            "pdf" => BuildAssigneeTasksPdf(tasks.Cast<object>(), assigneeName, assigneeRole, total, inProgress, completed, completedPct),
            _ => throw new ArgumentException("Формат: xlsx, docx, pdf")
        };
    }

    public async Task<byte[]> OverdueTasksReportAsync(string format, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var tasks = await _db.Tasks
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
        var byProject = tasks.GroupBy(t => t.ProjectName).Select(g => new { Project = g.Key, Count = g.Count() }).ToList();

        return format.ToLowerInvariant() switch
        {
            "xlsx" => BuildOverdueExcel(tasks.Cast<object>(), byProject.Cast<object>()),
            "pdf" => BuildOverduePdf(tasks.Cast<object>(), byProject.Cast<object>()),
            _ => throw new ArgumentException("Формат: xlsx, pdf")
        };
    }

    public async Task<byte[]> TeamWorkloadReportAsync(string format, int? sprintId, CancellationToken ct = default)
    {
        var query = _db.Users.Where(u => u.RoleId == 3).AsQueryable(); // developers/QA
        var assigneeIds = await query.Select(u => u.Id).ToListAsync(ct);
        var tasksQuery = _db.Tasks.Where(t => t.AssigneeId != null && assigneeIds.Contains(t.AssigneeId.Value));
        if (sprintId.HasValue) tasksQuery = tasksQuery.Where(t => t.SprintId == sprintId.Value);
        var tasks = await tasksQuery
            .Include(t => t.Status).Include(t => t.Assignee!).ThenInclude(a => a!.Role)
            .ToListAsync(ct);
        var byUser = tasks.GroupBy(t => t.AssigneeId!.Value).Select(g =>
        {
            var u = g.First().Assignee!;
            var list = g.ToList();
            var total = list.Count;
            var byStatus = list.GroupBy(x => x.Status.Name).ToDictionary(x => x.Key, x => x.Count());
            var completed = byStatus.GetValueOrDefault("Выполнена", 0);
            var pct = total > 0 ? (double)completed / total * 100 : 0;
            return new
            {
                FullName = u.FullName,
                RoleName = u.Role?.Name ?? "",
                New = byStatus.GetValueOrDefault("Новая", 0),
                InProgress = byStatus.GetValueOrDefault("В работе", 0),
                InTest = byStatus.GetValueOrDefault("В тестировании", 0),
                Done = completed,
                Postponed = byStatus.GetValueOrDefault("Отложена", 0),
                Total = total,
                CompletedPct = pct
            };
        }).OrderBy(x => x.FullName).ToList();

        return format.ToLowerInvariant() switch
        {
            "xlsx" => BuildTeamWorkloadExcel(byUser.Cast<object>()),
            "docx" => BuildTeamWorkloadWord(byUser.Cast<object>()),
            _ => throw new ArgumentException("Формат: xlsx, docx")
        };
    }

    public async Task<byte[]> ProjectStatusesReportAsync(string format, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var projects = await _db.Projects.Include(p => p.Responsible).ToListAsync(ct);
        var taskLists = await _db.Tasks.Include(t => t.Status).GroupBy(t => t.ProjectId).ToListAsync(ct);
        var rows = projects.Select(p =>
        {
            var projTasks = taskLists.Where(g => g.Key == p.Id).SelectMany(g => g).ToList();
            var total = projTasks.Count;
            var done = projTasks.Count(t => t.Status.Name == "Выполнена");
            var inWork = projTasks.Count(t => t.Status.Name == "В работе");
            var overdue = projTasks.Count(t => t.DueDate.HasValue && t.DueDate.Value < today && t.Status.Name != "Выполнена");
            var pct = total > 0 ? (double)done / total * 100 : 0;
            return new
            {
                p.Name,
                p.Code,
                ResponsibleName = p.Responsible?.FullName ?? "",
                Total = total,
                Done = done,
                InWork = inWork,
                Overdue = overdue,
                DonePct = pct
            };
        }).ToList();

        return format.ToLowerInvariant() switch
        {
            "docx" => BuildProjectStatusesWord(rows.Cast<object>()),
            "pdf" => BuildProjectStatusesPdf(rows.Cast<object>()),
            _ => throw new ArgumentException("Формат: docx, pdf")
        };
    }

    private static byte[] BuildProjectsSummaryExcel(IEnumerable<object> rows)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Сводка по проектам");
        ws.Cell(1, 1).Value = "Наименование"; ws.Cell(1, 2).Value = "Код"; ws.Cell(1, 3).Value = "Дата релиза";
        ws.Cell(1, 4).Value = "Ответственный"; ws.Cell(1, 5).Value = "Всего задач"; ws.Cell(1, 6).Value = "Фича"; ws.Cell(1, 7).Value = "Баг"; ws.Cell(1, 8).Value = "Техн. задача";
        int r = 2;
        foreach (dynamic row in rows)
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

    private static byte[] BuildProjectsSummaryPdf(IEnumerable<object> rows)
    {
        QuestPDF.Settings.License = LicenseType.Community;
        var list = rows.ToList();
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
                    foreach (dynamic row in list)
                    {
                        t.Cell().Padding(4).Text((string)row.Name);
                        t.Cell().Padding(4).Text((string)row.Code);
                        t.Cell().Padding(4).Text((string)row.ReleaseDate);
                        t.Cell().Padding(4).Text((string)row.ResponsibleName);
                        t.Cell().Padding(4).Text(((int)row.TotalTasks).ToString());
                        t.Cell().Padding(4).Text(((int)row.FeatureCount).ToString());
                        t.Cell().Padding(4).Text(((int)row.BugCount).ToString());
                        t.Cell().Padding(4).Text(((int)row.TechTaskCount).ToString());
                    }
                });
            });
        });
        return doc.GeneratePdf();
    }

    private static byte[] BuildAssigneeTasksExcel(
        IEnumerable<object> tasks, string assigneeName, string roleName,
        int total, int inProgress, int completed, double completedPct)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Задачи исполнителя");
        ws.Cell(1, 1).Value = "Название"; ws.Cell(1, 2).Value = "Тип"; ws.Cell(1, 3).Value = "Проект"; ws.Cell(1, 4).Value = "Срок"; ws.Cell(1, 5).Value = "Статус"; ws.Cell(1, 6).Value = "Приоритет";
        int r = 2;
        foreach (dynamic t in tasks)
        {
            ws.Cell(r, 1).Value = t.Title; ws.Cell(r, 2).Value = t.TypeName; ws.Cell(r, 3).Value = t.Name;
            ws.Cell(r, 4).Value = t.DueDate?.ToString("dd.MM.yyyy") ?? ""; ws.Cell(r, 5).Value = t.StatusName; ws.Cell(r, 6).Value = t.PriorityName;
            r++;
        }
        r++; ws.Cell(r, 1).Value = "Итого:"; ws.Cell(r, 2).Value = $"Всего: {total}, В работе: {inProgress}, Выполнено: {completed}, Доля выполненных: {completedPct:F1}%";
        using var ms = new MemoryStream();
        wb.SaveAs(ms, false);
        return ms.ToArray();
    }

    private static byte[] BuildAssigneeTasksWord(
        IEnumerable<object> tasks, string assigneeName, string roleName,
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
        foreach (dynamic t in tasks)
        {
            table.AppendChild(new TableRow(
                new TableCell(new Paragraph(new Run(new Text((string)t.Title)))),
                new TableCell(new Paragraph(new Run(new Text((string)t.TypeName)))),
                new TableCell(new Paragraph(new Run(new Text((string)t.Name)))),
                new TableCell(new Paragraph(new Run(new Text(t.DueDate?.ToString("dd.MM.yyyy") ?? "")))),
                new TableCell(new Paragraph(new Run(new Text((string)t.StatusName)))),
                new TableCell(new Paragraph(new Run(new Text((string)t.PriorityName))))));
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
        IEnumerable<object> tasks, string assigneeName, string roleName,
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
                    foreach (dynamic row in tasks)
                    {
                        t.Cell().Padding(4).Text((string)row.Title);
                        t.Cell().Padding(4).Text((string)row.TypeName);
                        t.Cell().Padding(4).Text((string)row.Name);
                        t.Cell().Padding(4).Text(((DateOnly?)row.DueDate)?.ToString("dd.MM.yyyy") ?? "");
                        t.Cell().Padding(4).Text((string)row.StatusName);
                        t.Cell().Padding(4).Text((string)row.PriorityName);
                    }
                });
                p.Footer().AlignCenter().Text($"Всего: {total}, в работе: {inProgress}, выполнено: {completed}, доля выполненных: {completedPct:F1}%");
            });
        });
        return doc.GeneratePdf();
    }

    private static byte[] BuildOverdueExcel(IEnumerable<object> tasks, IEnumerable<object> byProject)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Просроченные");
        ws.Cell(1, 1).Value = "Название"; ws.Cell(1, 2).Value = "Тип"; ws.Cell(1, 3).Value = "Проект"; ws.Cell(1, 4).Value = "Исполнитель"; ws.Cell(1, 5).Value = "Дедлайн"; ws.Cell(1, 6).Value = "Статус"; ws.Cell(1, 7).Value = "Дней просрочки";
        int r = 2;
        foreach (dynamic t in tasks)
        {
            ws.Cell(r, 1).Value = t.Title; ws.Cell(r, 2).Value = t.TypeName; ws.Cell(r, 3).Value = t.ProjectName;
            ws.Cell(r, 4).Value = t.AssigneeName; ws.Cell(r, 5).Value = t.DueDate?.ToString("dd.MM.yyyy"); ws.Cell(r, 6).Value = t.StatusName; ws.Cell(r, 7).Value = t.DaysOverdue;
            r++;
        }
        var ws2 = wb.Worksheets.Add("По проектам");
        ws2.Cell(1, 1).Value = "Проект"; ws2.Cell(1, 2).Value = "Кол-во просроченных";
        var byProjectList = byProject.ToList();
        for (int i = 0; i < byProjectList.Count; i++) { var row = (dynamic)byProjectList[i]; ws2.Cell(i + 2, 1).Value = row.Project; ws2.Cell(i + 2, 2).Value = row.Count; }
        using var ms = new MemoryStream();
        wb.SaveAs(ms, false);
        return ms.ToArray();
    }

    private static byte[] BuildOverduePdf(IEnumerable<object> tasks, IEnumerable<object> byProject)
    {
        QuestPDF.Settings.License = LicenseType.Community;
        var doc = QuestPdfDocument.Create(c =>
        {
            c.Page(p =>
            {
                p.Header().Text("Отчёт по просроченным задачам").Bold().FontSize(14);
                p.Content().Table(t =>
                {
                    t.ColumnsDefinition(cd => { cd.RelativeColumn(2); cd.RelativeColumn(); cd.RelativeColumn(); cd.RelativeColumn(); cd.ConstantColumn(60); cd.RelativeColumn(); cd.ConstantColumn(50); });
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
                    foreach (dynamic row in tasks)
                    {
                        t.Cell().Padding(4).Text((string)row.Title);
                        t.Cell().Padding(4).Text((string)row.TypeName);
                        t.Cell().Padding(4).Text((string)row.ProjectName);
                        t.Cell().Padding(4).Text((string)row.AssigneeName);
                        t.Cell().Padding(4).Text(((DateOnly?)row.DueDate)?.ToString("dd.MM.yyyy") ?? "");
                        t.Cell().Padding(4).Text((string)row.StatusName);
                        t.Cell().Padding(4).Text(((int)row.DaysOverdue).ToString());
                    }
                });
                p.Content().PaddingVertical(10).Text("Сводка по проектам:").Bold();
                p.Content().Table(t2 =>
                {
                    t2.ColumnsDefinition(cd => { cd.RelativeColumn(); cd.ConstantColumn(80); });
                    foreach (dynamic row in byProject)
                    {
                        t2.Cell().Padding(4).Text((string)row.Project);
                        t2.Cell().Padding(4).Text(((int)row.Count).ToString());
                    }
                });
            });
        });
        return doc.GeneratePdf();
    }

    private static byte[] BuildTeamWorkloadExcel(IEnumerable<object> byUser)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Загрузка команды");
        ws.Cell(1, 1).Value = "ФИО"; ws.Cell(1, 2).Value = "Роль"; ws.Cell(1, 3).Value = "Новая"; ws.Cell(1, 4).Value = "В работе"; ws.Cell(1, 5).Value = "В тестировании"; ws.Cell(1, 6).Value = "Выполнена"; ws.Cell(1, 7).Value = "Отложена"; ws.Cell(1, 8).Value = "Всего"; ws.Cell(1, 9).Value = "Доля завершённых %";
        int r = 2;
        foreach (dynamic row in byUser)
        {
            ws.Cell(r, 1).Value = row.FullName; ws.Cell(r, 2).Value = row.RoleName;
            ws.Cell(r, 3).Value = row.New; ws.Cell(r, 4).Value = row.InProgress; ws.Cell(r, 5).Value = row.InTest; ws.Cell(r, 6).Value = row.Done; ws.Cell(r, 7).Value = row.Postponed;
            ws.Cell(r, 8).Value = row.Total; ws.Cell(r, 9).Value = $"{row.CompletedPct:F1}";
            r++;
        }
        using var ms = new MemoryStream();
        wb.SaveAs(ms, false);
        return ms.ToArray();
    }

    private static byte[] BuildTeamWorkloadWord(IEnumerable<object> byUser)
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
        foreach (dynamic row in byUser)
        {
            table.AppendChild(new TableRow(
                new TableCell(new Paragraph(new Run(new Text((string)row.FullName)))),
                new TableCell(new Paragraph(new Run(new Text((string)row.RoleName)))),
                new TableCell(new Paragraph(new Run(new Text(((int)row.New).ToString())))),
                new TableCell(new Paragraph(new Run(new Text(((int)row.InProgress).ToString())))),
                new TableCell(new Paragraph(new Run(new Text(((int)row.InTest).ToString())))),
                new TableCell(new Paragraph(new Run(new Text(((int)row.Done).ToString())))),
                new TableCell(new Paragraph(new Run(new Text(((int)row.Postponed).ToString())))),
                new TableCell(new Paragraph(new Run(new Text(((int)row.Total).ToString())))),
                new TableCell(new Paragraph(new Run(new Text(((double)row.CompletedPct).ToString("F1") + "%"))))));
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

    private static byte[] BuildProjectStatusesWord(IEnumerable<object> rows)
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
        foreach (dynamic row in rows)
        {
            table.AppendChild(new TableRow(
                new TableCell(new Paragraph(new Run(new Text((string)row.Name)))),
                new TableCell(new Paragraph(new Run(new Text((string)row.Code)))),
                new TableCell(new Paragraph(new Run(new Text((string)row.ResponsibleName)))),
                new TableCell(new Paragraph(new Run(new Text(((int)row.Total).ToString())))),
                new TableCell(new Paragraph(new Run(new Text(((int)row.Done).ToString())))),
                new TableCell(new Paragraph(new Run(new Text(((int)row.InWork).ToString())))),
                new TableCell(new Paragraph(new Run(new Text(((int)row.Overdue).ToString())))),
                new TableCell(new Paragraph(new Run(new Text(((double)row.DonePct).ToString("F1") + "%"))))));
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

    private static byte[] BuildProjectStatusesPdf(IEnumerable<object> rows)
    {
        QuestPDF.Settings.License = LicenseType.Community;
        var list = rows.ToList();
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
                    foreach (dynamic row in list)
                    {
                        t.Cell().Padding(4).Text((string)row.Name);
                        t.Cell().Padding(4).Text((string)row.Code);
                        t.Cell().Padding(4).Text((string)row.ResponsibleName);
                        t.Cell().Padding(4).Text(((int)row.Total).ToString());
                        t.Cell().Padding(4).Text(((int)row.Done).ToString());
                        t.Cell().Padding(4).Text(((int)row.InWork).ToString());
                        t.Cell().Padding(4).Text(((int)row.Overdue).ToString());
                        t.Cell().Padding(4).Text(((double)row.DonePct).ToString("F1") + "%");
                    }
                });
            });
        });
        return doc.GeneratePdf();
    }
}
