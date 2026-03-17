using Microsoft.EntityFrameworkCore;
using UpzIt.Api.Entities;
using TaskEntity = UpzIt.Api.Entities.Task;
using TaskStatusEntity = UpzIt.Api.Entities.TaskStatus;

namespace UpzIt.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<TaskType> TaskTypes => Set<TaskType>();
    public DbSet<TaskStatusEntity> TaskStatuses => Set<TaskStatusEntity>();
    public DbSet<Priority> Priorities => Set<Priority>();
    public DbSet<Sprint> Sprints => Set<Sprint>();
    public DbSet<TaskEntity> Tasks => Set<TaskEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var prop in entity.GetProperties())
                prop.SetColumnName(ToSnakeCase(prop.Name));
        }

        modelBuilder.Entity<Role>(e =>
        {
            e.ToTable("roles");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.Name).HasMaxLength(100);
        });

        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasKey(x => x.Id);
            e.Property(x => x.Login).HasMaxLength(50);
            e.Property(x => x.PasswordHash).HasMaxLength(255);
            e.Property(x => x.FullName).HasMaxLength(200);
            e.HasOne(x => x.Role).WithMany(r => r.Users).HasForeignKey(x => x.RoleId);
        });

        modelBuilder.Entity<Project>(e =>
        {
            e.ToTable("projects");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(300);
            e.Property(x => x.Code).HasMaxLength(50);
            e.HasOne(x => x.Responsible).WithMany(u => u.ResponsibleProjects).HasForeignKey(x => x.ResponsibleId);
        });

        modelBuilder.Entity<TaskType>(e =>
        {
            e.ToTable("task_types");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(100);
        });

        modelBuilder.Entity<TaskStatusEntity>(e =>
        {
            e.ToTable("task_statuses");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(100);
        });

        modelBuilder.Entity<Priority>(e =>
        {
            e.ToTable("priorities");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(100);
        });

        modelBuilder.Entity<Sprint>(e =>
        {
            e.ToTable("sprints", t => t.HasCheckConstraint("sprints_dates", "end_date >= start_date"));
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200);
            e.HasOne(x => x.Project).WithMany(p => p.Sprints).HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TaskEntity>(e =>
        {
            e.ToTable("tasks");
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).HasMaxLength(500);
            e.HasOne(x => x.Type).WithMany(tt => tt.Tasks).HasForeignKey(x => x.TypeId);
            e.HasOne(x => x.Priority).WithMany(p => p.Tasks).HasForeignKey(x => x.PriorityId);
            e.HasOne(x => x.Status).WithMany(s => s.Tasks).HasForeignKey(x => x.StatusId);
            e.HasOne(x => x.Project).WithMany(p => p.Tasks).HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Sprint).WithMany(s => s.Tasks).HasForeignKey(x => x.SprintId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Assignee).WithMany(u => u.AssignedTasks).HasForeignKey(x => x.AssigneeId).OnDelete(DeleteBehavior.SetNull);
        });
    }

    private static string ToSnakeCase(string name)
    {
        if (string.IsNullOrEmpty(name)) return name;
        var result = new System.Text.StringBuilder();
        for (int i = 0; i < name.Length; i++)
        {
            var c = name[i];
            if (char.IsUpper(c))
            {
                if (i > 0) result.Append('_');
                result.Append(char.ToLowerInvariant(c));
            }
            else
                result.Append(c);
        }
        return result.ToString();
    }
}
