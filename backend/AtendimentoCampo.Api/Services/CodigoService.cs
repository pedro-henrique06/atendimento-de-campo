using System.Security.Cryptography;

namespace AtendimentoCampo.Api.Services;

public static class CodigoService
{
    // Sem caracteres ambíguos (0/O, 1/I) para facilitar leitura em campo.
    private const string Alfabeto = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

    public static string GerarCodigo()
    {
        Span<char> chars = stackalloc char[9];
        for (var i = 0; i < 4; i++) chars[i] = Alfabeto[RandomNumberGenerator.GetInt32(Alfabeto.Length)];
        chars[4] = '-';
        for (var i = 5; i < 9; i++) chars[i] = Alfabeto[RandomNumberGenerator.GetInt32(Alfabeto.Length)];
        return new string(chars);
    }
}
