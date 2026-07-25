using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace AtendimentoCampo.Api.Controllers;

public abstract class ApiControllerBase : ControllerBase
{
    protected Guid UsuarioId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    protected Guid BaseId =>
        Guid.Parse(User.FindFirstValue("baseId")!);
}
