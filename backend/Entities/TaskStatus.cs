namespace UpzIt.Api.Entities;

public class TaskStatus
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public ICollection<Task> Tasks { get; set; } = new List<Task>();
}
