using MongoDB.Bson.Serialization.Attributes;

namespace AtendimentoCampo.Api.Models;

public class Base
{
    [BsonId]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public string Nome { get; set; } = string.Empty;
    public string SenhaEquipeHash { get; set; } = string.Empty;
    public bool Ativo { get; set; } = true;
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}
