using Microsoft.EntityFrameworkCore;
using UpzIt.Api.Entities;

namespace UpzIt.Api.Data;

public static class DataSeeder
{
    private const string TestPassword = "password";

    public static async System.Threading.Tasks.Task SeedAsync(AppDbContext db)
    {
        if (await db.Users.AnyAsync()) return;

        if (!await db.Roles.AnyAsync())
        {
            var roles = new[]
            {
                new Role { Id = 1, Name = "Администратор" },
                new Role { Id = 2, Name = "Руководитель проекта / Тимлид" },
                new Role { Id = 3, Name = "Разработчик / QA" },
                new Role { Id = 4, Name = "Наблюдатель" }
            };
            await db.Roles.AddRangeAsync(roles);
            await db.SaveChangesAsync();
        }

        var users = new[]
        {
            new User { Login = "admin", PasswordHash = BCrypt.Net.BCrypt.HashPassword(TestPassword), FullName = "Иванов Иван Иванович", RoleId = 1 },
            new User { Login = "pm_sidorov", PasswordHash = BCrypt.Net.BCrypt.HashPassword(TestPassword), FullName = "Сидоров Пётр Сергеевич", RoleId = 2 },
            new User { Login = "dev_kozlov", PasswordHash = BCrypt.Net.BCrypt.HashPassword(TestPassword), FullName = "Козлов Алексей Викторович", RoleId = 3 },
            new User { Login = "qa_novikova", PasswordHash = BCrypt.Net.BCrypt.HashPassword(TestPassword), FullName = "Новикова Мария Андреевна", RoleId = 3 },
            new User { Login = "dev_petrov", PasswordHash = BCrypt.Net.BCrypt.HashPassword(TestPassword), FullName = "Петров Дмитрий Николаевич", RoleId = 3 },
            new User { Login = "viewer", PasswordHash = BCrypt.Net.BCrypt.HashPassword(TestPassword), FullName = "Смирнов Олег Владимирович", RoleId = 4 }
        };
        await db.Users.AddRangeAsync(users);
        await db.SaveChangesAsync();

        if (await db.Projects.AnyAsync()) return;

        var projects = new[]
        {
            new Project { Name = "Корпоративный портал", Code = "PORTAL", ReleaseDate = new DateOnly(2025, 6, 1), ResponsibleId = 2 },
            new Project { Name = "Мобильное приложение для заказов", Code = "MOB-ORD", ReleaseDate = new DateOnly(2025, 9, 15), ResponsibleId = 2 },
            new Project { Name = "Интеграция с 1С", Code = "1C-INT", ReleaseDate = new DateOnly(2025, 4, 30), ResponsibleId = 2 },
            new Project { Name = "Личный кабинет клиента", Code = "LKK", ReleaseDate = new DateOnly(2025, 8, 1), ResponsibleId = 2 },
            new Project { Name = "API для партнёров", Code = "API-PART", ReleaseDate = new DateOnly(2025, 7, 1), ResponsibleId = 2 }
        };
        await db.Projects.AddRangeAsync(projects);
        await db.SaveChangesAsync();

        var taskTypes = new[]
        {
            new TaskType { Name = "Фича" },
            new TaskType { Name = "Баг" },
            new TaskType { Name = "Техническая задача" },
            new TaskType { Name = "Доработка" },
            new TaskType { Name = "Исследование" }
        };
        await db.TaskTypes.AddRangeAsync(taskTypes);

        var statuses = new[]
        {
            new UpzIt.Api.Entities.TaskStatus { Name = "Новая" },
            new UpzIt.Api.Entities.TaskStatus { Name = "В работе" },
            new UpzIt.Api.Entities.TaskStatus { Name = "В тестировании" },
            new UpzIt.Api.Entities.TaskStatus { Name = "Выполнена" },
            new UpzIt.Api.Entities.TaskStatus { Name = "Отложена" }
        };
        await db.TaskStatuses.AddRangeAsync(statuses);

        var priorities = new[]
        {
            new Priority { Name = "Низкий" },
            new Priority { Name = "Средний" },
            new Priority { Name = "Высокий" },
            new Priority { Name = "Критический" },
            new Priority { Name = "Блокер" }
        };
        await db.Priorities.AddRangeAsync(priorities);
        await db.SaveChangesAsync();

        var projs = await db.Projects.OrderBy(p => p.Id).ToListAsync();
        var sprints = new List<Sprint>
        {
            new() { Name = "Спринт 1 — Портал", StartDate = new DateOnly(2025, 1, 13), EndDate = new DateOnly(2025, 1, 26), ProjectId = projs[0].Id },
            new() { Name = "Спринт 2 — Портал", StartDate = new DateOnly(2025, 1, 27), EndDate = new DateOnly(2025, 2, 9), ProjectId = projs[0].Id },
            new() { Name = "Спринт 1 — Моб. приложение", StartDate = new DateOnly(2025, 2, 1), EndDate = new DateOnly(2025, 2, 14), ProjectId = projs[1].Id },
            new() { Name = "Спринт 1 — 1С", StartDate = new DateOnly(2025, 1, 6), EndDate = new DateOnly(2025, 1, 19), ProjectId = projs[2].Id },
            new() { Name = "Спринт 2 — 1С", StartDate = new DateOnly(2025, 1, 20), EndDate = new DateOnly(2025, 2, 2), ProjectId = projs[2].Id },
            new() { Name = "Спринт 1 — LKK", StartDate = new DateOnly(2025, 3, 1), EndDate = new DateOnly(2025, 3, 14), ProjectId = projs[3].Id }
        };
        await db.Sprints.AddRangeAsync(sprints);
        await db.SaveChangesAsync();

        var types = await db.TaskTypes.OrderBy(t => t.Id).ToListAsync();
        var prios = await db.Priorities.OrderBy(p => p.Id).ToListAsync();
        var sts = await db.TaskStatuses.OrderBy(s => s.Id).ToListAsync();
        var spr = await db.Sprints.OrderBy(s => s.Id).ToListAsync();

        var tasks = new List<UpzIt.Api.Entities.Task>
        {
            new() { Title = "Верстка главной страницы портала", DueDate = new DateOnly(2025, 1, 25), TypeId = types[0].Id, PriorityId = prios[2].Id, StatusId = sts[3].Id, ProjectId = projs[0].Id, SprintId = spr[0].Id, AssigneeId = 3 },
            new() { Title = "Исправить ошибку входа по SSO", DueDate = new DateOnly(2025, 1, 20), TypeId = types[1].Id, PriorityId = prios[3].Id, StatusId = sts[1].Id, ProjectId = projs[0].Id, SprintId = spr[0].Id, AssigneeId = 5 },
            new() { Title = "Настроить CI/CD для портала", DueDate = new DateOnly(2025, 2, 5), TypeId = types[2].Id, PriorityId = prios[1].Id, StatusId = sts[0].Id, ProjectId = projs[0].Id, SprintId = spr[1].Id, AssigneeId = 3 },
            new() { Title = "Доработать фильтры в каталоге", DueDate = new DateOnly(2025, 2, 10), TypeId = types[3].Id, PriorityId = prios[1].Id, StatusId = sts[0].Id, ProjectId = projs[0].Id, SprintId = spr[1].Id, AssigneeId = 5 },
            new() { Title = "Регрессия после обновления библиотек", DueDate = new DateOnly(2025, 2, 1), TypeId = types[1].Id, PriorityId = prios[2].Id, StatusId = sts[2].Id, ProjectId = projs[0].Id, SprintId = spr[1].Id, AssigneeId = 4 },
            new() { Title = "Экран авторизации в мобильном приложении", DueDate = new DateOnly(2025, 2, 14), TypeId = types[0].Id, PriorityId = prios[2].Id, StatusId = sts[1].Id, ProjectId = projs[1].Id, SprintId = spr[2].Id, AssigneeId = 5 },
            new() { Title = "Краш при повороте экрана", DueDate = new DateOnly(2025, 2, 8), TypeId = types[1].Id, PriorityId = prios[3].Id, StatusId = sts[0].Id, ProjectId = projs[1].Id, SprintId = spr[2].Id, AssigneeId = 4 },
            new() { Title = "Подключить выгрузку остатков из 1С", DueDate = new DateOnly(2025, 1, 31), TypeId = types[0].Id, PriorityId = prios[2].Id, StatusId = sts[3].Id, ProjectId = projs[2].Id, SprintId = spr[3].Id, AssigneeId = 3 },
            new() { Title = "Таймаут при большом объёме данных 1С", DueDate = new DateOnly(2025, 2, 2), TypeId = types[1].Id, PriorityId = prios[2].Id, StatusId = sts[1].Id, ProjectId = projs[2].Id, SprintId = spr[4].Id, AssigneeId = 5 },
            new() { Title = "Документация API обмена с 1С", DueDate = new DateOnly(2025, 2, 15), TypeId = types[2].Id, PriorityId = prios[1].Id, StatusId = sts[0].Id, ProjectId = projs[2].Id, SprintId = spr[4].Id, AssigneeId = 3 },
            new() { Title = "Вход в ЛК по СМС-коду", DueDate = new DateOnly(2025, 3, 10), TypeId = types[0].Id, PriorityId = prios[2].Id, StatusId = sts[0].Id, ProjectId = projs[3].Id, SprintId = spr[5].Id, AssigneeId = 5 },
            new() { Title = "Страница истории заказов в ЛК", DueDate = new DateOnly(2025, 3, 14), TypeId = types[0].Id, PriorityId = prios[1].Id, StatusId = sts[0].Id, ProjectId = projs[3].Id, SprintId = spr[5].Id, AssigneeId = 3 },
            new() { Title = "Спецификация REST API для партнёров", DueDate = new DateOnly(2025, 6, 1), TypeId = types[4].Id, PriorityId = prios[1].Id, StatusId = sts[3].Id, ProjectId = projs[4].Id, SprintId = null, AssigneeId = 3 },
            new() { Title = "Эндпоинт выгрузки каталога (API)", DueDate = new DateOnly(2025, 7, 15), TypeId = types[0].Id, PriorityId = prios[2].Id, StatusId = sts[0].Id, ProjectId = projs[4].Id, SprintId = null, AssigneeId = 5 },
            new() { Title = "Лимиты и квоты для API", DueDate = new DateOnly(2025, 7, 1), TypeId = types[2].Id, PriorityId = prios[1].Id, StatusId = sts[0].Id, ProjectId = projs[4].Id, SprintId = null, AssigneeId = 3 }
        };
        await db.Tasks.AddRangeAsync(tasks);
        await db.SaveChangesAsync();
    }
}
