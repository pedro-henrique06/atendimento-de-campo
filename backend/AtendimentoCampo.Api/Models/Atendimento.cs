namespace AtendimentoCampo.Api.Models;

public class Atendimento
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Codigo { get; set; } = string.Empty;

    public Guid BaseId { get; set; }
    public Base? Base { get; set; }

    // Dados pessoais
    public bool ConsentimentoRegistro { get; set; }
    public string PacienteNome { get; set; } = string.Empty;
    public string? PacienteDocumentoTipo { get; set; }
    public string? PacienteDocumentoNumero { get; set; }
    public DateOnly? PacienteDataNascimento { get; set; }
    public string? PacienteSexo { get; set; }
    public string? PacienteAlergias { get; set; }

    public RiscoClassificacao Risco { get; set; } = RiscoClassificacao.SemClassificacao;
    public StatusAtendimento Status { get; set; } = StatusAtendimento.EmAndamento;
    public string? QueixaPrincipal { get; set; }

    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public double? PrecisaoMetros { get; set; }

    public Guid CriadoPorUsuarioId { get; set; }
    public Usuario? CriadoPorUsuario { get; set; }
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    public DateTime? FinalizadoEm { get; set; }

    public ICollection<AtendimentoEtapa> Etapas { get; set; } = new List<AtendimentoEtapa>();
    public ICollection<HistoricoAlteracao> Historico { get; set; } = new List<HistoricoAlteracao>();
}
