using System.Text.Json;
using System.Text.RegularExpressions;
using AtendimentoCampo.Api.Data;
using AtendimentoCampo.Api.Dtos;
using AtendimentoCampo.Api.Models;
using AtendimentoCampo.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;

namespace AtendimentoCampo.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/atendimentos")]
public class AtendimentosController : ApiControllerBase
{
    private readonly MongoContext _mongo;

    public AtendimentosController(MongoContext mongo)
    {
        _mongo = mongo;
    }

    [HttpGet]
    public async Task<ActionResult<List<AtendimentoResumoDto>>> Listar(
        [FromQuery] string? status,
        [FromQuery] string? risco,
        [FromQuery] string? busca)
    {
        var filtro = Builders<Atendimento>.Filter.Eq(a => a.BaseId, BaseId);

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<StatusAtendimento>(status, true, out var statusEnum))
            filtro &= Builders<Atendimento>.Filter.Eq(a => a.Status, statusEnum);

        if (!string.IsNullOrWhiteSpace(risco) && Enum.TryParse<RiscoClassificacao>(risco, true, out var riscoEnum))
            filtro &= Builders<Atendimento>.Filter.Eq(a => a.Risco, riscoEnum);

        if (!string.IsNullOrWhiteSpace(busca))
        {
            var regex = new BsonRegularExpression(Regex.Escape(busca.Trim()), "i");
            filtro &= Builders<Atendimento>.Filter.Or(
                Builders<Atendimento>.Filter.Regex(a => a.Codigo, regex),
                Builders<Atendimento>.Filter.Regex(a => a.PacienteNome, regex),
                Builders<Atendimento>.Filter.Regex(a => a.QueixaPrincipal, regex));
        }

        var atendimentos = await _mongo.Atendimentos.Find(filtro).SortByDescending(a => a.CriadoEm).ToListAsync();
        return Ok(atendimentos.Select(MapResumo).ToList());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AtendimentoDetalheDto>> Detalhe(string id)
    {
        var atendimento = await Buscar(id);
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
            PacienteDataNascimento = request.PacienteDataNascimento?.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            PacienteSexo = request.PacienteSexo,
            PacienteAlergias = request.PacienteAlergias,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            PrecisaoMetros = request.PrecisaoMetros,
            CriadoPorUsuarioId = UsuarioId,
            CriadoPorUsuarioNome = UsuarioNome,
        };

        atendimento.Etapas.Add(new AtendimentoEtapa
        {
            Tipo = TipoEtapa.Triagem,
            Status = StatusEtapa.Aguardando,
            Ordem = 0,
        });
        atendimento.Historico.Add(AuditService.Acao(UsuarioId, UsuarioNome, "criou_atendimento"));

        await _mongo.Atendimentos.InsertOneAsync(atendimento);

        return CreatedAtAction(nameof(Detalhe), new { id = atendimento.Id }, MapDetalhe(atendimento));
    }

    [HttpPost("{id}/etapas/{etapaId}/iniciar")]
    public async Task<ActionResult<EtapaDto>> IniciarEtapa(string id, string etapaId)
    {
        var atendimento = await Buscar(id);
        if (atendimento is null) return NotFound();

        var etapa = atendimento.Etapas.FirstOrDefault(e => e.Id == etapaId);
        if (etapa is null) return NotFound();
        if (etapa.Status != StatusEtapa.Aguardando) return BadRequest(new { message = "Etapa já foi iniciada." });

        etapa.Status = StatusEtapa.EmAndamento;
        etapa.UsuarioResponsavelId = UsuarioId;
        etapa.UsuarioResponsavelNome = UsuarioNome;
        etapa.IniciadoEm = DateTime.UtcNow;
        atendimento.Historico.Add(AuditService.Acao(UsuarioId, UsuarioNome, "iniciou_etapa", etapa.Tipo));

        await Salvar(atendimento);
        return Ok(MapEtapa(etapa));
    }

    [HttpPut("{id}/etapas/{etapaId}")]
    public async Task<ActionResult<EtapaDto>> AtualizarEtapa(string id, string etapaId, AtualizarEtapaRequest request)
    {
        var atendimento = await Buscar(id);
        if (atendimento is null) return NotFound();

        var etapa = atendimento.Etapas.FirstOrDefault(e => e.Id == etapaId);
        if (etapa is null) return NotFound();

        var novosDados = BsonDocument.Parse(JsonSerializer.Serialize(request.Campos));

        atendimento.Historico.AddRange(
            AuditService.DiffCampos(UsuarioId, UsuarioNome, etapa.Tipo, etapa.Dados, novosDados));

        foreach (var elemento in novosDados)
            etapa.Dados[elemento.Name] = elemento.Value;

        // A Triagem alimenta a classificação de risco e a queixa principal usadas
        // nas filas e no painel do atendimento como um todo.
        if (etapa.Tipo == TipoEtapa.Triagem)
        {
            if (etapa.Dados.TryGetValue("classificacaoRisco", out var riscoValor) &&
                riscoValor.IsString &&
                Enum.TryParse<RiscoClassificacao>(riscoValor.AsString, true, out var risco))
            {
                atendimento.Risco = risco;
            }

            if (etapa.Dados.TryGetValue("queixaPrincipal", out var queixaValor) && queixaValor.IsString)
                atendimento.QueixaPrincipal = queixaValor.AsString;
        }

        await Salvar(atendimento);
        return Ok(MapEtapa(etapa));
    }

    [HttpPost("{id}/etapas/{etapaId}/concluir")]
    public async Task<ActionResult<AtendimentoDetalheDto>> ConcluirEtapa(
        string id, string etapaId, [FromBody] ConcluirEtapaRequest? request)
    {
        var atendimento = await Buscar(id);
        if (atendimento is null) return NotFound();

        var etapa = atendimento.Etapas.FirstOrDefault(e => e.Id == etapaId);
        if (etapa is null) return NotFound();

        etapa.Status = StatusEtapa.Concluida;
        etapa.ConcluidoEm = DateTime.UtcNow;
        atendimento.Historico.Add(AuditService.Acao(UsuarioId, UsuarioNome, "concluiu_etapa", etapa.Tipo));

        if (request?.ProximaEtapa is not null)
        {
            atendimento.Etapas.Add(new AtendimentoEtapa
            {
                Tipo = request.ProximaEtapa.Value,
                Status = StatusEtapa.Aguardando,
                Ordem = etapa.Ordem + 1,
            });
        }
        else
        {
            atendimento.Status = StatusAtendimento.Finalizado;
            atendimento.FinalizadoEm = DateTime.UtcNow;
            atendimento.Historico.Add(AuditService.Acao(UsuarioId, UsuarioNome, "finalizou_atendimento"));
        }

        await Salvar(atendimento);
        return Ok(MapDetalhe(atendimento));
    }

    private async Task<Atendimento?> Buscar(string id) =>
        await _mongo.Atendimentos.Find(a => a.Id == id && a.BaseId == BaseId).FirstOrDefaultAsync();

    private Task Salvar(Atendimento atendimento) =>
        _mongo.Atendimentos.ReplaceOneAsync(a => a.Id == atendimento.Id, atendimento);

    private async Task<string> GerarCodigoUnico()
    {
        string codigo;
        do
        {
            codigo = CodigoService.GerarCodigo();
        } while (await _mongo.Atendimentos.Find(a => a.Codigo == codigo).AnyAsync());

        return codigo;
    }

    private static Dictionary<string, object?> ParaDicionario(BsonDocument documento)
    {
        if (documento.ElementCount == 0) return new();
        return JsonSerializer.Deserialize<Dictionary<string, object?>>(documento.ToJson()) ?? new();
    }

    private static EtapaDto MapEtapa(AtendimentoEtapa etapa) => new(
        etapa.Id, etapa.Tipo, etapa.Status, etapa.Ordem,
        etapa.UsuarioResponsavelNome,
        ParaDicionario(etapa.Dados),
        etapa.EntrouEm, etapa.IniciadoEm, etapa.ConcluidoEm);

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
        var etapas = a.Etapas.OrderBy(e => e.Ordem).Select(MapEtapa).ToList();

        var historico = a.Historico
            .OrderByDescending(h => h.CriadoEm)
            .Select(h => new HistoricoDto(h.Acao, h.Etapa, h.Campo, h.ValorAnterior, h.ValorNovo, h.UsuarioNome, h.CriadoEm))
            .ToList();

        var dataNascimento = a.PacienteDataNascimento is { } dn ? DateOnly.FromDateTime(dn) : (DateOnly?)null;

        return new AtendimentoDetalheDto(
            a.Id, a.Codigo, a.ConsentimentoRegistro, a.PacienteNome,
            a.PacienteDocumentoTipo, a.PacienteDocumentoNumero, dataNascimento,
            a.PacienteSexo, a.PacienteAlergias, a.Risco, a.Status, a.QueixaPrincipal,
            a.Latitude, a.Longitude, a.PrecisaoMetros, a.CriadoEm, a.FinalizadoEm,
            etapas, historico);
    }
}
