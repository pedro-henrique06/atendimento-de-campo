using System.Text.RegularExpressions;
using AtendimentoCampo.Api.Data;
using AtendimentoCampo.Api.Dtos;
using AtendimentoCampo.Api.Models;
using AtendimentoCampo.Api.Services;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;

namespace AtendimentoCampo.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly MongoContext _mongo;
    private readonly SenhaService _senhaService;
    private readonly JwtService _jwtService;

    public AuthController(MongoContext mongo, SenhaService senhaService, JwtService jwtService)
    {
        _mongo = mongo;
        _senhaService = senhaService;
        _jwtService = jwtService;
    }

    // Login único para toda a equipe da base: usa a senha compartilhada da base
    // (definida pelo admin) e identifica quem está usando o app pelo nome, criando
    // o cadastro de usuário automaticamente no primeiro acesso.
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Nome) || string.IsNullOrWhiteSpace(request.Funcao))
            return BadRequest(new { message = "Nome e função são obrigatórios." });

        var baseEntidade = await _mongo.Bases
            .Find(b => b.Id == request.BaseId && b.Ativo)
            .FirstOrDefaultAsync();
        if (baseEntidade is null)
            return NotFound(new { message = "Base não encontrada." });

        if (!_senhaService.Verificar(baseEntidade.SenhaEquipeHash, request.Senha))
            return Unauthorized(new { message = "Nome ou senha inválidos." });

        var nomeNormalizado = request.Nome.Trim();
        var filtroUsuario = Builders<Usuario>.Filter.And(
            Builders<Usuario>.Filter.Eq(u => u.BaseId, baseEntidade.Id),
            Builders<Usuario>.Filter.Regex(u => u.Nome,
                new BsonRegularExpression($"^{Regex.Escape(nomeNormalizado)}$", "i")));

        var usuario = await _mongo.Usuarios.Find(filtroUsuario).FirstOrDefaultAsync();

        if (usuario is null)
        {
            usuario = new Usuario
            {
                BaseId = baseEntidade.Id,
                Nome = nomeNormalizado,
                Funcao = request.Funcao,
                Registro = request.Registro,
            };
            await _mongo.Usuarios.InsertOneAsync(usuario);
        }
        else
        {
            usuario.Funcao = request.Funcao;
            usuario.Registro = request.Registro;
            usuario.UltimoAcessoEm = DateTime.UtcNow;
            await _mongo.Usuarios.ReplaceOneAsync(u => u.Id == usuario.Id, usuario);
        }

        var token = _jwtService.GerarToken(usuario);
        return Ok(new LoginResponse(
            token,
            new UsuarioDto(usuario.Id, usuario.Nome, usuario.Funcao, usuario.Registro),
            new BaseDto(baseEntidade.Id, baseEntidade.Nome)));
    }
}
