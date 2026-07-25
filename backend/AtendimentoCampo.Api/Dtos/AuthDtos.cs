namespace AtendimentoCampo.Api.Dtos;

public record LoginRequest(string BaseId, string Nome, string Funcao, string? Registro, string Senha);

public record LoginResponse(string Token, UsuarioDto Usuario, BaseDto Base);

public record UsuarioDto(string Id, string Nome, string Funcao, string? Registro);

public record BaseDto(string Id, string Nome);
