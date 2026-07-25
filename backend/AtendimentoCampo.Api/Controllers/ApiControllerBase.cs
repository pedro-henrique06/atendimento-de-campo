using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace AtendimentoCampo.Api.Controllers;

public abstract class ApiControllerBase : ControllerBase
{
    protected string UsuarioId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    protected string UsuarioNome => User.FindFirstValue(ClaimTypes.Name)!;

    protected string BaseId => User.FindFirstValue("baseId")!;
}
