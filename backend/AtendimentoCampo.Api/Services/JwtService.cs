using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AtendimentoCampo.Api.Models;
using Microsoft.IdentityModel.Tokens;

namespace AtendimentoCampo.Api.Services;

public class JwtService
{
    private readonly IConfiguration _config;

    public JwtService(IConfiguration config)
    {
        _config = config;
    }

    public string GerarToken(Usuario usuario)
    {
        var chave = _config["Jwt:Key"]
            ?? throw new InvalidOperationException("Jwt:Key não configurada.");

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new(ClaimTypes.Name, usuario.Nome),
            new("baseId", usuario.BaseId.ToString()),
            new("funcao", usuario.Funcao),
        };

        var credenciais = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(chave)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(12),
            signingCredentials: credenciais);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
