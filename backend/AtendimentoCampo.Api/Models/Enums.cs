namespace AtendimentoCampo.Api.Models;

public enum RiscoClassificacao
{
    SemClassificacao = 0,
    Verde = 1,
    Amarelo = 2,
    Vermelho = 3,
    Preto = 4
}

public enum StatusAtendimento
{
    EmAndamento = 0,
    Finalizado = 1
}

public enum StatusEtapa
{
    Aguardando = 0,
    EmAndamento = 1,
    Concluida = 2
}

public enum TipoEtapa
{
    Triagem = 0,
    ClinicaGeral = 1,
    Enfermagem = 2,
    Pediatria = 3
}
