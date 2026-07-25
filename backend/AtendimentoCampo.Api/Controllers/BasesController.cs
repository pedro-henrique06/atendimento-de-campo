using AtendimentoCampo.Api.Data;
using AtendimentoCampo.Api.Dtos;
using AtendimentoCampo.Api.Models;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace AtendimentoCampo.Api.Controllers;

[ApiController]
[Route("api/bases")]
public class BasesController : ControllerBase
{
    private readonly MongoContext _mongo;

    public BasesController(MongoContext mongo)
    {
        _mongo = mongo;
    }

    [HttpGet]
    public async Task<ActionResult<List<BaseDto>>> Listar()
    {
        var bases = await _mongo.Bases
            .Find(b => b.Ativo)
            .SortBy(b => b.Nome)
            .ToListAsync();

        return Ok(bases.Select(b => new BaseDto(b.Id, b.Nome)).ToList());
    }
}
