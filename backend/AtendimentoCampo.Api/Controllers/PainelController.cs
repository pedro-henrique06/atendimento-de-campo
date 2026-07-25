using AtendimentoCampo.Api.Data;
using AtendimentoCampo.Api.Dtos;
using AtendimentoCampo.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AtendimentoCampo.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/painel")]
public class PainelController : ApiControllerBase
{
    private readonly AppDbContext _db;

    public PainelController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("resumo")]
    public async Task<ActionResult<PainelResumoDto>> Resumo()
    {
        var atendimentos = await _db.Atendimentos
            .Where(a => a.BaseId == BaseId)
            .Select(a => a.Risco)
            .ToListAsync();

        var resumo = new PainelResumoDto(
            Total: atendimentos.Count,
            Vermelho: atendimentos.Count(r => r == RiscoClassificacao.Vermelho),
            Amarelo: atendimentos.Count(r => r == RiscoClassificacao.Amarelo),
            Verde: atendimentos.Count(r => r == RiscoClassificacao.Verde),
            Preto: atendimentos.Count(r => r == RiscoClassificacao.Preto),
            SemClassificacao: atendimentos.Count(r => r == RiscoClassificacao.SemClassificacao));

        return Ok(resumo);
    }
}
