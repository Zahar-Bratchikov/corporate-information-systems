using System.ComponentModel.DataAnnotations;

namespace UpzIt.Api.DTOs;

public class TaskDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateOnly? DueDate { get; set; }
    public int TypeId { get; set; }
    public string? TypeName { get; set; }
    public int PriorityId { get; set; }
    public string? PriorityName { get; set; }
    public int StatusId { get; set; }
    public string? StatusName { get; set; }
    public int ProjectId { get; set; }
    public string? ProjectName { get; set; }
    public int? SprintId { get; set; }
    public string? SprintName { get; set; }
    public int? AssigneeId { get; set; }
    public string? AssigneeName { get; set; }
}

public class TaskCreateDto
{
    [Required(ErrorMessage = "Укажите название задачи")]
    [StringLength(500)]
    public string Title { get; set; } = string.Empty;

    public DateOnly? DueDate { get; set; }
    public int TypeId { get; set; }
    public int PriorityId { get; set; }
    public int StatusId { get; set; }
    public int ProjectId { get; set; }
    public int? SprintId { get; set; }
    public int? AssigneeId { get; set; }
}

public class TaskUpdateDto
{
    [StringLength(500)]
    public string? Title { get; set; }
    public DateOnly? DueDate { get; set; }
    public int? TypeId { get; set; }
    public int? PriorityId { get; set; }
    public int? StatusId { get; set; }
    public int? ProjectId { get; set; }
    public int? SprintId { get; set; }
    public int? AssigneeId { get; set; }
}
