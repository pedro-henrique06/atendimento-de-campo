using AtendimentoCampo.Api.Models;

namespace AtendimentoCampo.Api.Dtos;

public record CriarAtendimentoRequest(
    bool ConsentimentoRegistro,
    string PacienteNome,
    string? PacienteDocumentoTipo,
    string? PacienteDocumentoNumero,
    DateOnly? PacienteDataNascimento,
    string? PacienteSexo,
    string? PacienteAlergias,
    double? Latitude,
    double? Longitude,
    double? PrecisaoMetros
);

public record AtendimentoResumoDto(
    Guid Id,
    string Codigo,
    string PacienteNome,
    string? QueixaPrincipal,
    RiscoClassificacao Risco,
    StatusAtendimento Status,
    string? SetorAtual,
    DateTime CriadoEm,
    DateTime? FinalizadoEm
);

public record EtapaDto(
    Guid Id,
    TipoEtapa Tipo,
    StatusEtapa Status,
    int Ordem,
    string? UsuarioResponsavelNome,
    Dictionary<string, object?> Dados,
    DateTime EntrouEm,
    DateTime? IniciadoEm,
    DateTime? ConcluidoEm
);

public record HistoricoDto(
    string Acao,
    TipoEtapa? Etapa,
    string? Campo,
    string? ValorAnterior,
    string? ValorNovo,
    string UsuarioNome,
    DateTime CriadoEm
);

public record AtendimentoDetalheDto(
    Guid Id,
    string Codigo,
    bool ConsentimentoRegistro,
    string PacienteNome,
    string? PacienteDocumentoTipo,
    string? PacienteDocumentoNumero,
    DateOnly? PacienteDataNascimento,
    string? PacienteSexo,
    string? PacienteAlergias,
    RiscoClassificacao Risco,
    StatusAtendimento Status,
    string? QueixaPrincipal,
    double? Latitude,
    double? Longitude,
    double? PrecisaoMetros,
    DateTime CriadoEm,
    DateTime? FinalizadoEm,
    List<EtapaDto> Etapas,
    List<HistoricoDto> Historico
);

public record AtualizarEtapaRequest(Dictionary<string, object?> Campos);

public record PainelResumoDto(int Total, int Vermelho, int Amarelo, int Verde, int Preto, int SemClassificacao);
