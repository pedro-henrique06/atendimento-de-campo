using System.Text;
using AtendimentoCampo.Api.Data;
using AtendimentoCampo.Api.Models;
using AtendimentoCampo.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;

var builder = WebApplication.CreateBuilder(args);

// Railway injeta a porta a usar via variável de ambiente PORT.
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

builder.Services.AddSingleton<MongoContext>();
builder.Services.AddScoped<SenhaService>();
builder.Services.AddScoped<JwtService>();

var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY") ?? builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT_KEY não configurada.");
// Garante que o JwtService (que lê via IConfiguration) enxergue a mesma chave
// quando ela vem da variável de ambiente JWT_KEY em vez do appsettings.
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
    var mongo = scope.ServiceProvider.GetRequiredService<MongoContext>();
    await mongo.CriarIndicesAsync();
    await SeedAsync(mongo, scope.ServiceProvider.GetRequiredService<SenhaService>());
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

static async Task SeedAsync(MongoContext mongo, SenhaService senhaService)
{
    var existeAlguma = await mongo.Bases.Find(FilterDefinition<Base>.Empty).AnyAsync();
    if (existeAlguma) return;

    var nomeBase = Environment.GetEnvironmentVariable("SEED_BASE_NOME") ?? "Base Principal";
    var senhaEquipe = Environment.GetEnvironmentVariable("SEED_BASE_SENHA") ?? "equipe123";

    await mongo.Bases.InsertOneAsync(new Base
    {
        Nome = nomeBase,
        SenhaEquipeHash = senhaService.Hash(senhaEquipe),
    });
}
