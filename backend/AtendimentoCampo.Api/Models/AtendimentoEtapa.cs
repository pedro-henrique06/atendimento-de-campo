namespace AtendimentoCampo.Api.Models;

// Cada etapa representa a passagem do atendimento por um setor (Triagem, Clínica
// Geral, Enfermagem, Pediatria...). Os campos clínicos variam muito por setor, então
// ficam guardados como JSON (chave -> valor) em vez de uma coluna por campo.
public class AtendimentoEtapa
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AtendimentoId { get; set; }
    public Atendimento? Atendimento { get; set; }

    public TipoEtapa Tipo { get; set; }
    public StatusEtapa Status { get; set; } = StatusEtapa.Aguardando;
    public int Ordem { get; set; }

    public Guid? UsuarioResponsavelId { get; set; }
    public Usuario? UsuarioResponsavel { get; set; }

    // JSON serializado com os campos do formulário do setor (ex.: pressaoArterial,
    // sintomasAtuais, diagnosticoCid, desfechoConsulta, encaminhamento...)
    public string DadosJson { get; set; } = "{}";

    public DateTime EntrouEm { get; set; } = DateTime.UtcNow;
    public DateTime? IniciadoEm { get; set; }
    public DateTime? ConcluidoEm { get; set; }
}
