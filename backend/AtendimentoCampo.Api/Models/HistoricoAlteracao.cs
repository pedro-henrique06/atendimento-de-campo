using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AtendimentoCampo.Api.Models;

// Documento embutido dentro de Atendimento.Historico (log de auditoria).
public class HistoricoAlteracao
{
    public string UsuarioId { get; set; } = string.Empty;
    public string UsuarioNome { get; set; } = string.Empty;

    // Ex.: "criou_atendimento", "iniciou_etapa", "editou_campo", "concluiu_etapa", "finalizou_atendimento"
    public string Acao { get; set; } = string.Empty;

    [BsonRepresentation(BsonType.String)]
    public TipoEtapa? Etapa { get; set; }

    public string? Campo { get; set; }
    public string? ValorAnterior { get; set; }
    public string? ValorNovo { get; set; }
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}
