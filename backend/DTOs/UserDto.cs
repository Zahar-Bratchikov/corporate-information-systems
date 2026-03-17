using System.ComponentModel.DataAnnotations;

namespace UpzIt.Api.DTOs;

public class UserDto
{
    public int Id { get; set; }
    public string Login { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public int RoleId { get; set; }
    public string? RoleName { get; set; }
}

public class UserCreateDto
{
    [Required(ErrorMessage = "Укажите логин")]
    [StringLength(50, MinimumLength = 1)]
    public string Login { get; set; } = string.Empty;

    [Required(ErrorMessage = "Укажите пароль")]
    [StringLength(100, MinimumLength = 1)]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "Укажите ФИО")]
    [StringLength(200)]
    public string FullName { get; set; } = string.Empty;

    public int RoleId { get; set; }
}

public class UserUpdateDto
{
    [StringLength(200)]
    public string? FullName { get; set; }
    public int? RoleId { get; set; }
    [StringLength(100)]
    public string? NewPassword { get; set; }
}
