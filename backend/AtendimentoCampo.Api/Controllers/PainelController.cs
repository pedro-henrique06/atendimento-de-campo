using AtendimentoCampo.Api.Data;
using AtendimentoCampo.Api.Dtos;
using AtendimentoCampo.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace AtendimentoCampo.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/painel")]
public class PainelController : ApiControllerBase
{
    private readonly MongoContext _mongo;

    public PainelController(MongoContext mongo)
    {
        _mongo = mongo;
    }

    [HttpGet("resumo")]
    public async Task<ActionResult<PainelResumoDto>> Resumo()
    {
        var riscos = await _mongo.Atendimentos
            .Find(a => a.BaseId == BaseId)
            .Project(a => a.Risco)
            .ToListAsync();

        var resumo = new PainelResumoDto(
            Total: riscos.Count,
            Vermelho: riscos.Count(r => r == RiscoClassificacao.Vermelho),
            Amarelo: riscos.Count(r => r == RiscoClassificacao.Amarelo),
            Verde: riscos.Count(r => r == RiscoClassificacao.Verde),
            Preto: riscos.Count(r => r == RiscoClassificacao.Preto),
            SemClassificacao: riscos.Count(r => r == RiscoClassificacao.SemClassificacao));

        return Ok(resumo);
    }
}
