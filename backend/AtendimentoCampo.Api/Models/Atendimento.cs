using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AtendimentoCampo.Api.Models;

public class Atendimento
{
    [BsonId]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public string Codigo { get; set; } = string.Empty;
    public string BaseId { get; set; } = string.Empty;

    // Dados pessoais
    public bool ConsentimentoRegistro { get; set; }
    public string PacienteNome { get; set; } = string.Empty;
    public string? PacienteDocumentoTipo { get; set; }
    public string? PacienteDocumentoNumero { get; set; }
    public DateTime? PacienteDataNascimento { get; set; }
    public string? PacienteSexo { get; set; }
    public string? PacienteAlergias { get; set; }

    [BsonRepresentation(BsonType.String)]
    public RiscoClassificacao Risco { get; set; } = RiscoClassificacao.SemClassificacao;

    [BsonRepresentation(BsonType.String)]
    public StatusAtendimento Status { get; set; } = StatusAtendimento.EmAndamento;

    public string? QueixaPrincipal { get; set; }

    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public double? PrecisaoMetros { get; set; }

    public string CriadoPorUsuarioId { get; set; } = string.Empty;
    public string CriadoPorUsuarioNome { get; set; } = string.Empty;
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    public DateTime? FinalizadoEm { get; set; }

    public List<AtendimentoEtapa> Etapas { get; set; } = new();
    public List<HistoricoAlteracao> Historico { get; set; } = new();
}
