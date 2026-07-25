namespace AtendimentoCampo.Api.Models;

public class HistoricoAlteracao
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AtendimentoId { get; set; }
    public Atendimento? Atendimento { get; set; }

    public Guid UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }

    // Ex.: "criou_atendimento", "iniciou_etapa", "editou_campo", "concluiu_etapa", "finalizou_atendimento"
    public string Acao { get; set; } = string.Empty;
    public TipoEtapa? Etapa { get; set; }
    public string? Campo { get; set; }
    public string? ValorAnterior { get; set; }
    public string? ValorNovo { get; set; }

    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}
