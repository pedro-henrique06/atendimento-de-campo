namespace AtendimentoCampo.Api.Dtos;

public record LoginRequest(Guid BaseId, string Nome, string Funcao, string? Registro, string Senha);

public record LoginResponse(string Token, UsuarioDto Usuario, BaseDto Base);

public record UsuarioDto(Guid Id, string Nome, string Funcao, string? Registro);

public record BaseDto(Guid Id, string Nome);
