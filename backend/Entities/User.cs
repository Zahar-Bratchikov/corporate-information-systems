namespace UpzIt.Api.Entities;

public class User
{
    public int Id { get; set; }
    public string Login { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public int RoleId { get; set; }

    public Role Role { get; set; } = null!;
    public ICollection<Project> ResponsibleProjects { get; set; } = new List<Project>();
    public ICollection<Task> AssignedTasks { get; set; } = new List<Task>();
}
