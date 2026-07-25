using Microsoft.AspNetCore.Identity;

namespace AtendimentoCampo.Api.Services;

// Wrapper fino sobre o PasswordHasher do ASP.NET Core (PBKDF2), sem precisar
// puxar o pacote inteiro de Identity/EF para o projeto.
public class SenhaService
{
    private readonly PasswordHasher<object> _hasher = new();
    private static readonly object Contexto = new();

    public string Hash(string senha) => _hasher.HashPassword(Contexto, senha);

    public bool Verificar(string hash, string senha)
    {
        if (string.IsNullOrEmpty(hash)) return false;
        var resultado = _hasher.VerifyHashedPassword(Contexto, hash, senha);
        return resultado is PasswordVerificationResult.Success or PasswordVerificationResult.SuccessRehashNeeded;
    }
}
