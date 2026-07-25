namespace AtendimentoCampo.Api.Models;

public class Usuario
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid BaseId { get; set; }
    public Base? Base { get; set; }

    public string Nome { get; set; } = string.Empty;
    public string Funcao { get; set; } = string.Empty;
    public string? Registro { get; set; }
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    public DateTime UltimoAcessoEm { get; set; } = DateTime.UtcNow;
}
