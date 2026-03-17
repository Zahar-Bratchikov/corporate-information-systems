using System.ComponentModel.DataAnnotations;

namespace UpzIt.Api.DTOs;

public class ProjectDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public DateOnly? ReleaseDate { get; set; }
    public int? ResponsibleId { get; set; }
    public string? ResponsibleName { get; set; }
}

public class ProjectCreateDto
{
    [Required(ErrorMessage = "Укажите наименование")]
    [StringLength(300)]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Укажите код")]
    [StringLength(50)]
    public string Code { get; set; } = string.Empty;

    public DateOnly? ReleaseDate { get; set; }
    public int? ResponsibleId { get; set; }
}

public class ProjectUpdateDto
{
    [StringLength(300)]
    public string? Name { get; set; }
    [StringLength(50)]
    public string? Code { get; set; }
    public DateOnly? ReleaseDate { get; set; }
    public int? ResponsibleId { get; set; }
}
