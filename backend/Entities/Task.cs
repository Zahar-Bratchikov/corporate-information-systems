namespace UpzIt.Api.Entities;

public class Task
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateOnly? DueDate { get; set; }
    public int TypeId { get; set; }
    public int PriorityId { get; set; }
    public int StatusId { get; set; }
    public int ProjectId { get; set; }
    public int? SprintId { get; set; }
    public int? AssigneeId { get; set; }

    public TaskType Type { get; set; } = null!;
    public Priority Priority { get; set; } = null!;
    public TaskStatus Status { get; set; } = null!;
    public Project Project { get; set; } = null!;
    public Sprint? Sprint { get; set; }
    public User? Assignee { get; set; }
}
