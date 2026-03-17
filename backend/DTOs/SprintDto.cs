using System.ComponentModel.DataAnnotations;

namespace UpzIt.Api.DTOs;

public class SprintDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public int ProjectId { get; set; }
    public string? ProjectName { get; set; }
}

public class SprintCreateDto
{
    [Required(ErrorMessage = "Укажите название")]
    [StringLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Укажите дату начала")]
    public DateOnly StartDate { get; set; }

    [Required(ErrorMessage = "Укажите дату окончания")]
    public DateOnly EndDate { get; set; }

    public int ProjectId { get; set; }
}

public class SprintUpdateDto
{
    [StringLength(200)]
    public string? Name { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
}
