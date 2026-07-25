using System.Text;
using AtendimentoCampo.Api.Data;
using AtendimentoCampo.Api.Models;
using AtendimentoCampo.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Railway injeta a porta a usar via variável de ambiente PORT.
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Connection string não configurada (DATABASE_URL).");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(ParseConnectionString(connectionString)));

builder.Services.AddScoped<SenhaService>();
builder.Services.AddScoped<JwtService>();

var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY") ?? builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT_KEY não configurada.");
builder.Configuration["Jwt:Key"] = jwtKey;

builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2),
        };
    });

builder.Services.AddAuthorization();

var frontendOrigins = (Environment.GetEnvironmentVariable("FRONTEND_ORIGIN") ?? "http://localhost:5173")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
        policy.WithOrigins(frontendOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod());
});

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    // MVP: sem SDK do .NET disponível neste ambiente para gerar migrations
    // (`dotnet ef migrations add`). EnsureCreated cria o schema a partir do
    // modelo atual. Antes de fazer a próxima alteração de schema em produção,
    // trocar para EF Core Migrations de verdade (veja README do backend).
    db.Database.EnsureCreated();
    await SeedAsync(db, scope.ServiceProvider.GetRequiredService<SenhaService>());
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.Run();

static string ParseConnectionString(string raw)
{
    // Railway fornece DATABASE_URL no formato postgres://user:pass@host:port/db;
    // Npgsql precisa do formato "Host=...;Username=...". Se já vier nesse
    // formato (uso local via appsettings), devolve como está.
    if (!raw.StartsWith("postgres://") && !raw.StartsWith("postgresql://"))
        return raw;

    var uri = new Uri(raw);
    var userInfo = uri.UserInfo.Split(':', 2);
    var builder = new Npgsql.NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.Port > 0 ? uri.Port : 5432,
        Username = Uri.UnescapeDataString(userInfo[0]),
        Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "",
        Database = uri.AbsolutePath.TrimStart('/'),
        SslMode = Npgsql.SslMode.Prefer,
    };
    return builder.ConnectionString;
}

static async Task SeedAsync(AppDbContext db, SenhaService senhaService)
{
    if (await db.Bases.AnyAsync()) return;

    var nomeBase = Environment.GetEnvironmentVariable("SEED_BASE_NOME") ?? "Base Principal";
    var senhaEquipe = Environment.GetEnvironmentVariable("SEED_BASE_SENHA") ?? "equipe123";

    db.Bases.Add(new Base
    {
        Nome = nomeBase,
        SenhaEquipeHash = senhaService.Hash(senhaEquipe),
    });
    await db.SaveChangesAsync();
}
