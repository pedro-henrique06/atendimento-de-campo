using AtendimentoCampo.Api.Data;
using AtendimentoCampo.Api.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AtendimentoCampo.Api.Controllers;

[ApiController]
[Route("api/bases")]
public class BasesController : ControllerBase
{
    private readonly AppDbContext _db;

    public BasesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<BaseDto>>> Listar()
    {
        var bases = await _db.Bases
            .Where(b => b.Ativo)
            .OrderBy(b => b.Nome)
            .Select(b => new BaseDto(b.Id, b.Nome))
            .ToListAsync();

        return Ok(bases);
    }
}
