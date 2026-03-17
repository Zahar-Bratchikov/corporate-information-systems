namespace UpzIt.Api.Entities;

public class Project
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public DateOnly? ReleaseDate { get; set; }
    public int? ResponsibleId { get; set; }

    public User? Responsible { get; set; }
    public ICollection<Sprint> Sprints { get; set; } = new List<Sprint>();
    public ICollection<Task> Tasks { get; set; } = new List<Task>();
}
