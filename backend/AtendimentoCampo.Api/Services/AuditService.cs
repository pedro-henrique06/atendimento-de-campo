using System.Text.Json;
using AtendimentoCampo.Api.Models;

namespace AtendimentoCampo.Api.Services;

// Gera as entradas de "Histórico de alterações" (log de auditoria) exibidas no
// detalhe do atendimento: quem fez o quê, valor anterior -> novo, quando.
public static class AuditService
{
    public static HistoricoAlteracao Acao(Guid atendimentoId, Guid usuarioId, string acao, TipoEtapa? etapa = null)
        => new()
        {
            AtendimentoId = atendimentoId,
            UsuarioId = usuarioId,
            Acao = acao,
            Etapa = etapa,
        };

    public static IEnumerable<HistoricoAlteracao> DiffCampos(
        Guid atendimentoId,
        Guid usuarioId,
        TipoEtapa etapa,
        Dictionary<string, object?> antigo,
        Dictionary<string, object?> novo)
    {
        foreach (var (chave, valorNovo) in novo)
        {
            var valorNovoStr = ValorParaTexto(valorNovo);
            var valorAntigoStr = antigo.TryGetValue(chave, out var vAntigo) ? ValorParaTexto(vAntigo) : null;

            if (valorAntigoStr == valorNovoStr) continue;

            yield return new HistoricoAlteracao
            {
                AtendimentoId = atendimentoId,
                UsuarioId = usuarioId,
                Acao = "editou_campo",
                Etapa = etapa,
                Campo = chave,
                ValorAnterior = valorAntigoStr,
                ValorNovo = valorNovoStr,
            };
        }
    }

    private static string? ValorParaTexto(object? valor)
    {
        if (valor is null) return null;
        if (valor is JsonElement el)
        {
            return el.ValueKind switch
            {
                JsonValueKind.String => el.GetString(),
                JsonValueKind.Null => null,
                JsonValueKind.Array => string.Join(", ", el.EnumerateArray().Select(x => x.ToString())),
                _ => el.ToString(),
            };
        }
        return valor.ToString();
    }
}
