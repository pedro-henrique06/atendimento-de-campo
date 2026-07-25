using System.Text.Json;
using AtendimentoCampo.Api.Data;
using AtendimentoCampo.Api.Dtos;
using AtendimentoCampo.Api.Models;
using AtendimentoCampo.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AtendimentoCampo.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/atendimentos")]
public class AtendimentosController : ApiControllerBase
{
    private readonly AppDbContext _db;

    public AtendimentosController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<List<AtendimentoResumoDto>>> Listar(
        [FromQuery] string? status,
        [FromQuery] string? risco,
        [FromQuery] string? busca)
    {
        var query = _db.Atendimentos
            .Where(a => a.BaseId == BaseId)
            .Include(a => a.Etapas)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<StatusAtendimento>(status, true, out var statusEnum))
            query = query.Where(a => a.Status == statusEnum);

        if (!string.IsNullOrWhiteSpace(risco) && Enum.TryParse<RiscoClassificacao>(risco, true, out var riscoEnum))
            query = query.Where(a => a.Risco == riscoEnum);

        if (!string.IsNullOrWhiteSpace(busca))
        {
            var termo = busca.Trim().ToLower();
            query = query.Where(a =>
                a.Codigo.ToLower().Contains(termo) ||
                a.PacienteNome.ToLower().Contains(termo) ||
                (a.QueixaPrincipal != null && a.QueixaPrincipal.ToLower().Contains(termo)));
        }

        var atendimentos = await query
            .OrderByDescending(a => a.CriadoEm)
            .ToListAsync();

        var resultado = atendimentos.Select(MapResumo).ToList();
        return Ok(resultado);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AtendimentoDetalheDto>> Detalhe(Guid id)
    {
        var atendimento = await _db.Atendimentos
            .Include(a => a.Etapas).ThenInclude(e => e.UsuarioResponsavel)
            .Include(a => a.Historico).ThenInclude(h => h.Usuario)
            .FirstOrDefaultAsync(a => a.Id == id && a.BaseId == BaseId);

        if (atendimento is null) return NotFound();

        return Ok(MapDetalhe(atendimento));
    }

    [HttpPost]
    public async Task<ActionResult<AtendimentoDetalheDto>> Criar(CriarAtendimentoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.PacienteNome))
            return BadRequest(new { message = "Nome do paciente é obrigatório." });

        var atendimento = new Atendimento
        {
            BaseId = BaseId,
            Codigo = await GerarCodigoUnico(),
            ConsentimentoRegistro = request.ConsentimentoRegistro,
            PacienteNome = request.PacienteNome.Trim(),
            PacienteDocumentoTipo = request.PacienteDocumentoTipo,
            PacienteDocumentoNumero = request.PacienteDocumentoNumero,
            PacienteDataNascimento = request.PacienteDataNascimento,
            PacienteSexo = request.PacienteSexo,
            PacienteAlergias = request.PacienteAlergias,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            PrecisaoMetros = request.PrecisaoMetros,
            CriadoPorUsuarioId = UsuarioId,
        };

        var triagem = new AtendimentoEtapa
        {
            Tipo = TipoEtapa.Triagem,
            Status = StatusEtapa.Aguardando,
            Ordem = 0,
        };
        atendimento.Etapas.Add(triagem);
        atendimento.Historico.Add(AuditService.Acao(atendimento.Id, UsuarioId, "criou_atendimento"));

        _db.Atendimentos.Add(atendimento);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Detalhe), new { id = atendimento.Id }, MapDetalhe(atendimento));
    }

    [HttpPost("{id:guid}/etapas/{etapaId:guid}/iniciar")]
    public async Task<ActionResult<EtapaDto>> IniciarEtapa(Guid id, Guid etapaId)
    {
        var etapa = await _db.AtendimentoEtapas
            .Include(e => e.Atendimento)
            .FirstOrDefaultAsync(e => e.Id == etapaId && e.AtendimentoId == id);

        if (etapa is null || etapa.Atendimento is null || etapa.Atendimento.BaseId != BaseId) return NotFound();
        if (etapa.Status != StatusEtapa.Aguardando) return BadRequest(new { message = "Etapa já foi iniciada." });

        etapa.Status = StatusEtapa.EmAndamento;
        etapa.UsuarioResponsavelId = UsuarioId;
        etapa.IniciadoEm = DateTime.UtcNow;

        _db.HistoricoAlteracoes.Add(AuditService.Acao(id, UsuarioId, "iniciou_etapa", etapa.Tipo));
        await _db.SaveChangesAsync();

        return Ok(await MapEtapa(etapa));
    }

    [HttpPut("{id:guid}/etapas/{etapaId:guid}")]
    public async Task<ActionResult<EtapaDto>> AtualizarEtapa(Guid id, Guid etapaId, AtualizarEtapaRequest request)
    {
        var etapa = await _db.AtendimentoEtapas
            .Include(e => e.Atendimento)
            .FirstOrDefaultAsync(e => e.Id == etapaId && e.AtendimentoId == id);

        if (etapa is null || etapa.Atendimento is null || etapa.Atendimento.BaseId != BaseId) return NotFound();

        var dadosAntigos = ParseDados(etapa.DadosJson);
        var dadosNovos = new Dictionary<string, object?>(dadosAntigos);
        foreach (var (chave, valor) in request.Campos)
            dadosNovos[chave] = valor;

        foreach (var registro in AuditService.DiffCampos(id, UsuarioId, etapa.Tipo, dadosAntigos, dadosNovos))
            _db.HistoricoAlteracoes.Add(registro);

        etapa.DadosJson = JsonSerializer.Serialize(dadosNovos);

        // A Triagem alimenta a classificação de risco e a queixa principal usadas
        // nas filas e no painel do atendimento como um todo.
        if (etapa.Tipo == TipoEtapa.Triagem)
        {
            if (dadosNovos.TryGetValue("classificacaoRisco", out var riscoValor) &&
                Enum.TryParse<RiscoClassificacao>(TextoDe(riscoValor), true, out var risco))
            {
                etapa.Atendimento!.Risco = risco;
            }

            if (dadosNovos.TryGetValue("queixaPrincipal", out var queixaValor))
                etapa.Atendimento!.QueixaPrincipal = TextoDe(queixaValor);
        }

        await _db.SaveChangesAsync();
        return Ok(await MapEtapa(etapa));
    }

    [HttpPost("{id:guid}/etapas/{etapaId:guid}/concluir")]
    public async Task<ActionResult<AtendimentoDetalheDto>> ConcluirEtapa(
        Guid id, Guid etapaId, [FromBody] ConcluirEtapaRequest? request)
    {
        var atendimento = await _db.Atendimentos
            .Include(a => a.Etapas)
            .FirstOrDefaultAsync(a => a.Id == id && a.BaseId == BaseId);

        if (atendimento is null) return NotFound();
        var etapa = atendimento.Etapas.FirstOrDefault(e => e.Id == etapaId);
        if (etapa is null) return NotFound();

        etapa.Status = StatusEtapa.Concluida;
        etapa.ConcluidoEm = DateTime.UtcNow;
        _db.HistoricoAlteracoes.Add(AuditService.Acao(id, UsuarioId, "concluiu_etapa", etapa.Tipo));

        if (request?.ProximaEtapa is not null)
        {
            var proximaEtapa = new AtendimentoEtapa
            {
                AtendimentoId = id,
                Tipo = request.ProximaEtapa.Value,
                Status = StatusEtapa.Aguardando,
                Ordem = etapa.Ordem + 1,
            };
            _db.AtendimentoEtapas.Add(proximaEtapa);
        }
        else
        {
            atendimento.Status = StatusAtendimento.Finalizado;
            atendimento.FinalizadoEm = DateTime.UtcNow;
            _db.HistoricoAlteracoes.Add(AuditService.Acao(id, UsuarioId, "finalizou_atendimento"));
        }

        await _db.SaveChangesAsync();

        var atualizado = await _db.Atendimentos
            .Include(a => a.Etapas).ThenInclude(e => e.UsuarioResponsavel)
            .Include(a => a.Historico).ThenInclude(h => h.Usuario)
            .FirstAsync(a => a.Id == id);

        return Ok(MapDetalhe(atualizado));
    }

    private async Task<string> GerarCodigoUnico()
    {
        string codigo;
        do
        {
            codigo = CodigoService.GerarCodigo();
        } while (await _db.Atendimentos.AnyAsync(a => a.Codigo == codigo));

        return codigo;
    }

    private static Dictionary<string, object?> ParseDados(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new();
        return JsonSerializer.Deserialize<Dictionary<string, object?>>(json) ?? new();
    }

    private static string? TextoDe(object? valor)
    {
        if (valor is null) return null;
        if (valor is JsonElement el) return el.ValueKind == JsonValueKind.String ? el.GetString() : el.ToString();
        return valor.ToString();
    }

    private async Task<EtapaDto> MapEtapa(AtendimentoEtapa etapa)
    {
        if (etapa.UsuarioResponsavel is null && etapa.UsuarioResponsavelId is not null)
            await _db.Entry(etapa).Reference(e => e.UsuarioResponsavel).LoadAsync();

        return new EtapaDto(
            etapa.Id, etapa.Tipo, etapa.Status, etapa.Ordem,
            etapa.UsuarioResponsavel?.Nome,
            ParseDados(etapa.DadosJson),
            etapa.EntrouEm, etapa.IniciadoEm, etapa.ConcluidoEm);
    }

    private static AtendimentoResumoDto MapResumo(Atendimento a)
    {
        var etapaAtual = a.Etapas
            .OrderByDescending(e => e.Status == StatusEtapa.EmAndamento)
            .ThenBy(e => e.Ordem)
            .FirstOrDefault(e => e.Status != StatusEtapa.Concluida);

        return new AtendimentoResumoDto(
            a.Id, a.Codigo, a.PacienteNome, a.QueixaPrincipal, a.Risco, a.Status,
            etapaAtual?.Tipo.ToString(), a.CriadoEm, a.FinalizadoEm);
    }

    private static AtendimentoDetalheDto MapDetalhe(Atendimento a)
    {
        var etapas = a.Etapas
            .OrderBy(e => e.Ordem)
            .Select(e => new EtapaDto(
                e.Id, e.Tipo, e.Status, e.Ordem,
                e.UsuarioResponsavel?.Nome,
                ParseDados(e.DadosJson),
                e.EntrouEm, e.IniciadoEm, e.ConcluidoEm))
            .ToList();

        var historico = a.Historico
            .OrderByDescending(h => h.CriadoEm)
            .Select(h => new HistoricoDto(
                h.Acao, h.Etapa, h.Campo, h.ValorAnterior, h.ValorNovo,
                h.Usuario?.Nome ?? "—", h.CriadoEm))
            .ToList();

        return new AtendimentoDetalheDto(
            a.Id, a.Codigo, a.ConsentimentoRegistro, a.PacienteNome,
            a.PacienteDocumentoTipo, a.PacienteDocumentoNumero, a.PacienteDataNascimento,
            a.PacienteSexo, a.PacienteAlergias, a.Risco, a.Status, a.QueixaPrincipal,
            a.Latitude, a.Longitude, a.PrecisaoMetros, a.CriadoEm, a.FinalizadoEm,
            etapas, historico);
    }
}

public record ConcluirEtapaRequest(TipoEtapa? ProximaEtapa);
