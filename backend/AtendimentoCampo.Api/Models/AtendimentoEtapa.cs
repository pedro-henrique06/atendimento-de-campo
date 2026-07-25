using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AtendimentoCampo.Api.Models;

// Documento embutido dentro de Atendimento.Etapas — cada item representa a
// passagem por um setor (Triagem, Clínica Geral, Enfermagem, Pediatria...).
// Os campos clínicos variam muito por setor, então ficam num BsonDocument
// dinâmico em vez de uma coleção/tabela por especialidade — assim dá pra
// adicionar setores novos sem mudar o schema.
public class AtendimentoEtapa
{
    [BsonElement("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [BsonRepresentation(BsonType.String)]
    public TipoEtapa Tipo { get; set; }

    [BsonRepresentation(BsonType.String)]
    public StatusEtapa Status { get; set; } = StatusEtapa.Aguardando;

    public int Ordem { get; set; }

    public string? UsuarioResponsavelId { get; set; }
    public string? UsuarioResponsavelNome { get; set; }

    public BsonDocument Dados { get; set; } = new();

    public DateTime EntrouEm { get; set; } = DateTime.UtcNow;
    public DateTime? IniciadoEm { get; set; }
    public DateTime? ConcluidoEm { get; set; }
}
