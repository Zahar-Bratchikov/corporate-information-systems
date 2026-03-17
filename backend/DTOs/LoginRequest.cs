using System.ComponentModel.DataAnnotations;

namespace UpzIt.Api.DTOs;

public class LoginRequest
{
    [Required(ErrorMessage = "Укажите логин")]
    public string Login { get; set; } = string.Empty;

    [Required(ErrorMessage = "Укажите пароль")]
    public string Password { get; set; } = string.Empty;
}
