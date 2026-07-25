using MongoDB.Bson.Serialization.Attributes;

namespace AtendimentoCampo.Api.Models;

public class Usuario
{
    [BsonId]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public string BaseId { get; set; } = string.Empty;
    public string Nome { get; set; } = string.Empty;
    public string Funcao { get; set; } = string.Empty;
    public string? Registro { get; set; }
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    public DateTime UltimoAcessoEm { get; set; } = DateTime.UtcNow;
}
