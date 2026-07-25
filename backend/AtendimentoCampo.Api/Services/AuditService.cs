using AtendimentoCampo.Api.Models;
using MongoDB.Bson;

namespace AtendimentoCampo.Api.Services;

// Gera as entradas de "Histórico de alterações" (log de auditoria) exibidas no
// detalhe do atendimento: quem fez o quê, valor anterior -> novo, quando.
public static class AuditService
{
    public static HistoricoAlteracao Acao(string usuarioId, string usuarioNome, string acao, TipoEtapa? etapa = null)
        => new()
        {
            UsuarioId = usuarioId,
            UsuarioNome = usuarioNome,
            Acao = acao,
            Etapa = etapa,
        };

    public static IEnumerable<HistoricoAlteracao> DiffCampos(
        string usuarioId,
        string usuarioNome,
        TipoEtapa etapa,
        BsonDocument antigo,
        BsonDocument novo)
    {
        foreach (var elemento in novo)
        {
            var valorNovoStr = ValorParaTexto(elemento.Value);
            var valorAntigoStr = antigo.TryGetValue(elemento.Name, out var vAntigo) ? ValorParaTexto(vAntigo) : null;

            if (valorAntigoStr == valorNovoStr) continue;

            yield return new HistoricoAlteracao
            {
                UsuarioId = usuarioId,
                UsuarioNome = usuarioNome,
                Acao = "editou_campo",
                Etapa = etapa,
                Campo = elemento.Name,
                ValorAnterior = valorAntigoStr,
                ValorNovo = valorNovoStr,
            };
        }
    }

    private static string? ValorParaTexto(BsonValue valor)
    {
        if (valor is null || valor.IsBsonNull) return null;
        if (valor.IsBsonArray) return string.Join(", ", valor.AsBsonArray.Select(v => v.ToString()));
        return valor.ToString();
    }
}
