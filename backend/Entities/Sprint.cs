namespace UpzIt.Api.Entities;

public class Sprint
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public int ProjectId { get; set; }

    public Project Project { get; set; } = null!;
    public ICollection<Task> Tasks { get; set; } = new List<Task>();
}
